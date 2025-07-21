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

  // 2. Get the prompt from the client's request (query parameter)
  const { prompt } = req.query;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  // 3. Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush the headers to establish the connection

  try {
    // 4. Call fal.subscribe and stream updates to the client
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/text-to-image", {
      input: {
        // Use the prompt from the client
        prompt: prompt,
      },
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

    // 5. Send the final result to the client
    sendEvent(res, 'result', result);

  } catch (error) {
    console.error("Error during fal.subscribe:", error);
    // Send an error event to the client
    sendEvent(res, 'error', { message: error.message || 'An unknown error occurred.' });
  } finally {
    // 6. Close the connection
    res.end();
  }
}