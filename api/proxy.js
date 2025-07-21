// File: /api/proxy.js
import { fal } from "@fal-ai/client";

// This is a helper function to format and send SSE messages
const sendEvent = (res, eventName, data) => {
  // Add a check to ensure the response is still writable before sending
  if (!res.writableEnded) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

export default async function handler(req, res) {
  // --- START: CORS & SSE HEADERS (THE FIX) ---
  // Allow requests from any origin. For production, you might want to restrict this
  // to your specific domain, e.g., 'https://your-app-name.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // These are the essential headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush the headers to establish the connection
  // --- END: CORS & SSE HEADERS ---

  // 1. Get the secret key from server-side environment variables
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    // We can't use res.status(500).json() here as headers are already sent.
    // Instead, we send an error event and close the connection.
    sendEvent(res, 'error', { message: 'API key not configured on the server.' });
    res.end();
    return;
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
    sendEvent(res, 'error', { message: "A 'prompt' is required." });
    res.end();
    return;
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
    // 7. Ensure the connection is closed when everything is done
    if (!res.writableEnded) {
      res.end();
    }
  }
}