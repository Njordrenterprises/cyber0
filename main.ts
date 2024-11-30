import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import { InfoCardRouter } from "./src/cards/info/infoRouter.ts";
import * as db from "./db/kv.ts";
import { initBroadcast, closeBroadcast } from "./src/ws/broadcast.ts";
import { validateKvKey } from "./src/middleware/validation.ts";
import type { KvSetRequest, ErrorResponse } from "./src/types.ts";

// Initialize KV database
await db.initKv();

// Initialize broadcast channel
await initBroadcast();

// Initialize card routers
const infoCardRouter = new InfoCardRouter('test-user');

// Keep track of active SSE connections
const clients = new Set<ReadableStreamDefaultController>();

// File loading functions
async function loadView(name: string): Promise<string> {
  try {
    const viewModule = await import(`./src/views/${name}/${name}.ts`);
    return await viewModule.layout("");
  } catch (error) {
    console.error(`Error loading view ${name}:`, error);
    throw error;
  }
}

async function loadCardTemplate(name: string): Promise<string> {
  try {
    const content = await Deno.readTextFile(`./src/cards/${name}/${name}.html`);
    return content;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Add CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create SSE endpoint for real-time updates
  if (url.pathname === '/events') {
    const channel = new BroadcastChannel("cyber-updates");
    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream({
      start(c) {
        controller = c;
        clients.add(controller);
        
        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

        channel.onmessage = (event) => {
          try {
            const encoder = new TextEncoder();
            const data = encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`);
            controller.enqueue(data);
          } catch (error) {
            console.error('Error sending SSE message:', error);
          }
        };
      },
      cancel() {
        clients.delete(controller);
        channel.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  // Handle card routes
  if (url.pathname.startsWith('/cards/info/')) {
    return infoCardRouter.handleRequest(req);
  }

  // Handle view loading
  if (url.pathname.startsWith('/views/')) {
    const viewName = url.pathname.split('/')[2];
    try {
      const content = await loadView(viewName);
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (_error) {
      return new Response("View Not Found", { status: 404 });
    }
  }

  // Handle KV operations
  if (url.pathname === '/kv/get') {
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' } satisfies ErrorResponse), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const keyError = validateKvKey(key);
    if (keyError) return keyError;
    return db.handleKvGet(req);
  }

  if (url.pathname === '/kv/set' && req.method === 'POST') {
    const data = await req.json() as KvSetRequest;
    const keyError = validateKvKey(data.key);
    if (keyError) return keyError;
    
    try {
      const response = await db.handleKvSet(new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }));
      return response;
    } catch (error) {
      console.error('Error handling KV set:', error);
      return new Response(JSON.stringify({ error: 'Error handling KV set' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Dynamic card template loading
  const cardMatch = url.pathname.match(/^\/cards\/([^\/]+)\/template$/);
  if (cardMatch) {
    try {
      const cardName = cardMatch[1];
      console.log(`Loading card template: ${cardName}`);
      const content = await loadCardTemplate(cardName);
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (_error) {
      return new Response("Card Template Not Found", { status: 404 });
    }
  }

  // Serve static files
  return serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
    quiet: true,
  });
}

console.log("Starting server on http://0.0.0.0:8000");
const server = Deno.serve({ port: 8000, hostname: "0.0.0.0" }, handler);

// Handle server shutdown
Deno.addSignalListener("SIGINT", () => {
  console.log("Shutting down server...");
  closeBroadcast();
  server.shutdown();
});

