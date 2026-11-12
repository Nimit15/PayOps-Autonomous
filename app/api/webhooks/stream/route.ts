import { NextRequest, NextResponse } from 'next/server';

// Get sseConnections from globalThis for shared state across routes
const sseConnections = (globalThis as any).__sseConnections || new Set<ReadableStreamDefaultController<Uint8Array>>();
(globalThis as any).__sseConnections = sseConnections;

// SSE endpoint for real-time webhook event streaming
// Connects to the same broadcast list as apps/api/src/app/api/events/stream/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lastEventId = searchParams.get('lastEventId');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      const initData = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initData));

      // If client provides lastEventId, acknowledge replay
      if (lastEventId) {
        const replayData = `data: ${JSON.stringify({ type: 'replay_ack', lastEventId })}\n\n`;
        controller.enqueue(encoder.encode(replayData));
      }

      // Add this connection to the broadcast list
      sseConnections.add(controller);

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeatData));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        sseConnections.delete(controller);
      });
    },
    cancel() {
      // Connection closed
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}