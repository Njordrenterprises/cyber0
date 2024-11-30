import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import { InfoCardRouter } from "./src/cards/info/infoRouter.ts";
import * as db from "./db/kv.ts";
import { initBroadcast, closeBroadcast } from "./src/ws/broadcast.ts";
import { validateKvKey } from "./src/middleware/validation.ts";
import { getOrCreateUser, updateUserLastSeen } from "./src/services/user-service.ts";
import type { KvSetRequest, ErrorResponse } from "./src/types.ts";

// Initialize KV database
await db.initKv();

// Initialize broadcast channel
await initBroadcast();

// Keep track of active SSE connections
const clients = new Set<ReadableStreamDefaultController>();

// Create an AbortController for graceful shutdown
const ac = new AbortController();
let isShuttingDown = false;

// Cleanup function to ensure all resources are properly closed
async function cleanup(signal?: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nShutdown initiated${signal ? ` by ${signal}` : ''}...`);

  // Set a timeout for forced exit
  const forceExitTimeout = setTimeout(() => {
    console.error('Force exiting after timeout...');
    Deno.exit(1);
  }, 5000);

  try {
    // 1. Close all SSE clients
    console.log('Closing SSE clients...');
    for (const client of clients) {
      try {
        client.close();
      } catch (error) {
        console.error('Error closing SSE client:', error);
      }
    }
    clients.clear();

    // 2. Close broadcast channel
    console.log('Closing broadcast channel...');
    await closeBroadcast();

    // 3. Abort the server
    console.log('Stopping server...');
    ac.abort();

    // Clear the force exit timeout
    clearTimeout(forceExitTimeout);
    console.log('Cleanup completed successfully');
    Deno.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    Deno.exit(1);
  }
}

// Register shutdown handlers for different signals
const signals: Deno.Signal[] = ["SIGINT", "SIGTERM", "SIGQUIT"];
for (const signal of signals) {
  Deno.addSignalListener(signal, () => cleanup(signal));
}

// Prevent unhandled rejections from crashing the app
addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
  event.preventDefault();
});

// Handle uncaught errors
addEventListener("error", (event) => {
  console.error("Uncaught error:", event.error);
  event.preventDefault();
});

// File loading functions
async function loadView(name: string, user: { id: string; username: string }): Promise<string> {
  try {
    const viewModule = await import(`./src/views/${name}/${name}.ts`);
    return await viewModule.layout(user);
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

function mergeHeaders(target: Headers, source?: Headers): void {
  if (!source) return;
  source.forEach((value, key) => {
    // For Set-Cookie headers, we want to append rather than replace
    if (key.toLowerCase() === 'set-cookie') {
      const existingCookies = target.get('Set-Cookie');
      if (existingCookies) {
        target.set('Set-Cookie', `${existingCookies}, ${value}`);
      } else {
        target.set('Set-Cookie', value);
      }
    } else {
      target.set(key, value);
    }
  });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Get or create user
  const { user, response: cookieResponse } = await getOrCreateUser(req);
  console.log('User:', user);

  // Initialize card router with user ID
  const infoCardRouter = new InfoCardRouter(user.id);

  // Add CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    const response = new Response(null, { headers: corsHeaders });
    mergeHeaders(response.headers, cookieResponse?.headers);
    return response;
  }

  // Create SSE endpoint for real-time updates
  if (url.pathname === '/events') {
    const channel = new BroadcastChannel("cyber-updates");
    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream({
      start(c) {
        controller = c;
        clients.add(controller);
        
        // Send initial connection message with user info
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "connected",
          user: { id: user.id, username: user.username }
        })}\n\n`));

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

    const response = new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

    mergeHeaders(response.headers, cookieResponse?.headers);
    return response;
  }

  // Handle card routes
  if (url.pathname.startsWith('/cards/info/')) {
    const response = await infoCardRouter.handleRequest(req);
    mergeHeaders(response.headers, cookieResponse?.headers);
    return response;
  }

  // Handle view loading
  if (url.pathname.startsWith('/views/')) {
    const viewName = url.pathname.split('/')[2];
    try {
      const content = await loadView(viewName, { id: user.id, username: user.username });
      const response = new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    } catch (_error) {
      const response = new Response("View Not Found", { status: 404 });
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    }
  }

  // Handle KV operations
  if (url.pathname === '/kv/get') {
    const key = url.searchParams.get('key');
    if (!key) {
      const response = new Response(JSON.stringify({ error: 'Missing key parameter' } satisfies ErrorResponse), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    }
    const keyError = validateKvKey(key);
    if (keyError) {
      mergeHeaders(keyError.headers, cookieResponse?.headers);
      return keyError;
    }
    const response = await db.handleKvGet(req);
    mergeHeaders(response.headers, cookieResponse?.headers);
    return response;
  }

  if (url.pathname === '/kv/set' && req.method === 'POST') {
    const data = await req.json() as KvSetRequest;
    const keyError = validateKvKey(data.key);
    if (keyError) {
      mergeHeaders(keyError.headers, cookieResponse?.headers);
      return keyError;
    }
    
    try {
      const response = await db.handleKvSet(new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }));
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    } catch (error) {
      console.error('Error handling KV set:', error);
      const response = new Response(JSON.stringify({ error: 'Error handling KV set' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    }
  }

  // Dynamic card template loading
  const cardMatch = url.pathname.match(/^\/cards\/([^\/]+)\/template$/);
  if (cardMatch) {
    try {
      const cardName = cardMatch[1];
      console.log(`Loading card template: ${cardName}`);
      const content = await loadCardTemplate(cardName);
      const response = new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    } catch (_error) {
      const response = new Response("Card Template Not Found", { status: 404 });
      mergeHeaders(response.headers, cookieResponse?.headers);
      return response;
    }
  }

  // Update user's last seen time periodically
  if (url.pathname !== '/events' && url.pathname !== '/kv/get') {
    await updateUserLastSeen(user.id);
  }

  // Serve static files
  const response = await serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
    quiet: true,
  });

  // Add cookie headers to static file responses too
  mergeHeaders(response.headers, cookieResponse?.headers);
  return response;
}

// Start the server
console.log("Starting server on http://0.0.0.0:8000");
try {
  await Deno.serve({
    port: 8000,
    hostname: "0.0.0.0",
    signal: ac.signal,
    onListen({ hostname, port }) {
      console.log(`Server ready at http://${hostname}:${port}`);
    },
    onError(error) {
      console.error("Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    },
  }, handler);
} catch (error) {
  if (error instanceof TypeError && error.message.includes("aborted")) {
    console.log("Server shutdown completed");
  } else {
    console.error("Fatal server error:", error);
    await cleanup();
  }
}

