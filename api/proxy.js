// File: /api/proxy.js

// --- START: RELIABLE .ENV LOADING (THE FIX) ---
// This line MUST be at the very top.
// It loads the variables from your .env file into process.env.
import 'dotenv/config';
// --- END: RELIABLE .ENV LOADING ---

import { fal } from "@fal-ai/client";

const sendEvent = (res, eventName, data) => {
  if (!res.writableEnded) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

export default async function handler(req, res) {
  // --- START: ROBUST DEBUGGING AND ERROR HANDLING ---
  console.log('--- [PROXY] Received a new request ---');

  try {
    // This top-level try/catch will capture ANY error during setup.
    
    // Explicitly set CORS and SSE headers first.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 1. CRITICAL: Check if the environment variable was loaded.
    const apiKey = process.env.FAL_KEY;
    console.log(`[PROXY] Checking for FAL_KEY... Is it loaded? ${!!apiKey}`);

    if (!apiKey) {
      // Throw an error that our catch block will handle.
      throw new Error('FAL_KEY environment variable not found on server.');
    }

    // Configure the fal client securely on the server.
    fal.config({ credentials: apiKey });
    console.log('[PROXY] Fal client configured successfully.');

    const { prompt, ...restOfInput } = req.query;
    if (!prompt) {
      throw new Error("A 'prompt' is required in the query parameters.");
    }
    console.log(`[PROXY] Received prompt: "${prompt}"`);

    const input = { prompt, ...restOfInput };
    if (input.seed) input.seed = parseInt(input.seed, 10);
    if (input.num_images) input.num_images = parseInt(input.num_images, 10);

    console.log('[PROXY] Calling fal.subscribe with input:', input);
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/text-to-image", {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        // This log is very helpful to see if you're getting updates
        console.log(`[PROXY] Fal update received: ${update.status}`);
        sendEvent(res, 'status', { status: update.status });
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.forEach((log) => sendEvent(res, 'log', { message: log.message }));
        }
      },
    });

    console.log('[PROXY] Fal process complete. Sending result.');
    sendEvent(res, 'result', result);

  } catch (error) {
    // This will catch ANY error, including the setup errors.
    console.error('--- [PROXY] CRITICAL ERROR ---');
    console.error(error);
    console.error('--------------------------');
    
    // Send an error event to the client before closing.
    sendEvent(res, 'error', { 
      message: 'A critical error occurred on the server.',
      details: error.message 
    });

  } finally {
    // Ensure the connection is always closed.
    if (!res.writableEnded) {
      console.log('[PROXY] Closing connection.');
      res.end();
    }
  }
}