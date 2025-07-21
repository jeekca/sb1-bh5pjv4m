// File: /api/proxy.ts

// This line MUST be at the very top to load your .env file.
import 'dotenv/config';

// --- START: TYPESCRIPT IMPORTS (THE FIX) ---
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fal } from "@fal-ai/client";
// --- END: TYPESCRIPT IMPORTS ---

const sendEvent = (res: VercelResponse, eventName: string, data: any) => {
  if (!res.writableEnded) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

// --- START: ADDED TYPES TO HANDLER (THE FIX) ---
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
// --- END: ADDED TYPES TO HANDLER ---
  console.log('--- [PROXY] Received a new request ---');

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const apiKey = process.env.FAL_KEY;
    console.log(`[PROXY] Checking for FAL_KEY... Is it loaded? ${!!apiKey}`);

    if (!apiKey) {
      throw new Error('FAL_KEY environment variable not found on server.');
    }
    
    fal.config({ credentials: apiKey });
    console.log('[PROXY] Fal client configured successfully.');

    // VercelRequest['query'] has correct types, no need to cast
    const { prompt, ...restOfInput } = req.query;
    if (!prompt) {
      throw new Error("A 'prompt' is required in the query parameters.");
    }
    console.log(`[PROXY] Received prompt: "${prompt}"`);

    const input: { [key: string]: any } = { prompt, ...restOfInput };
    if (input.seed) input.seed = parseInt(input.seed as string, 10);
    if (input.num_images) input.num_images = parseInt(input.num_images as string, 10);
    
    console.log('[PROXY] Calling fal.subscribe with input:', input);
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/text-to-image", {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
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
    console.error('--- [PROXY] CRITICAL ERROR ---', error);
    sendEvent(res, 'error', { 
      message: 'A critical error occurred on the server.',
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (!res.writableEnded) {
      console.log('[PROXY] Closing connection.');
      res.end();
    }
  }
}