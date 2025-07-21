// File: /api/proxy.js
import { fal } from "@fal-ai/client";

// This is a helper function to format and send SSE messages
const sendEvent = (res, eventName, data) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export default async function handler(req, res) {
  // 1. Get the secret key from server-side environment variables
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured." });
  }

  // Configure the fal client with your credentials
  // This happens securely on the server
  fal.config({
    credentials: apiKey,
  });

  // 2. Get ALL parameters from the client's request query string
  //    The 'prompt' is required, the rest are optional.
  const { prompt, ...restOfInput } = req.query;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  // 3. Convert query parameters to appropriate data types
  //    Since all query parameters arrive as strings, we need to convert them
  const processedInput = {
    prompt: prompt,
    ...restOfInput
  };

  // Convert numeric parameters from strings to numbers
  if (processedInput.seed) {
    processedInput.seed = parseInt(processedInput.seed, 10);
  }
  if (processedInput.num_images) {
    processedInput.num_images = parseInt(processedInput.num_images, 10);
  }

  console.log("Processed input parameters:", processedInput);

  // 4. Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush the headers to establish the connection

  try {
    // 5. Call fal.subscribe and stream updates to the client
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/text-to-image", {
      input: processedInput,
      logs: true,
      onQueueUpdate: (update) => {
        // Send status updates to the client
        sendEvent(res, 'status', { status: update.status });

        // Send logs to the client
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.forEach((log) => {
            sendEvent(res, 'log', { message: log.message });
          });
        }
      },
    });

    // 6. Send the final result to the client
    sendEvent(res, 'result', result);

  } catch (error) {
    console.error("Error during fal.subscribe:", error);
    // Send an error event to the client
    sendEvent(res, 'error', { message: error.message || 'An unknown error occurred.' });
  } finally {
    // 7. Close the connection
    res.end();
  }
}