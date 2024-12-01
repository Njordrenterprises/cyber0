import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import { CardManager } from "./src/cards/cardManager.ts";
import { ViewRouter } from "./src/views/viewRouter.ts";
import { DbRouter } from "./db/router.ts";
import { MiddlewareHandler } from "./src/middleware/handler.ts";
import { initBroadcast, closeBroadcast } from "./src/ws/broadcast.ts";
import { getOrCreateUser, updateUserLastSeen } from "./src/services/user-service.ts";

// Initialize broadcast channel
await initBroadcast();

// Keep track of active SSE connections
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

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

// Handle SSE connection
function handleSSE(req: Request): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream<Uint8Array>({
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      clients.add(controller);

      // Send initial connection message
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      // Remove client when connection closes
      req.signal.addEventListener('abort', () => {
        clients.delete(controller);
      });
    },
    cancel(reason: string) {
      console.log('Stream cancelled:', reason);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// Broadcast message to all SSE clients
export function broadcast(data: unknown): void {
  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  
  for (const client of clients) {
    try {
      client.enqueue(message);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      clients.delete(client);
    }
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Handle SSE connections
  if (url.pathname === '/events') {
    return handleSSE(req);
  }

  // Get or create user
  const { user, response: cookieResponse } = await getOrCreateUser(req);
  console.log('User:', user);

  // Initialize routers and middleware
  const middleware = new MiddlewareHandler({ user, cookieResponse: cookieResponse || null });
  const cardManager = new CardManager(user);
  const viewRouter = new ViewRouter({ user });
  const dbRouter = new DbRouter({ user });

  return middleware.handleRequest(req, async (req) => {
    // Handle card routes
    if (url.pathname.startsWith('/cards/')) {
      return cardManager.handleRequest(req);
    }

    // Handle view and widget routes
    if (url.pathname.startsWith('/views/') || url.pathname.startsWith('/widgets/')) {
      return viewRouter.handleRequest(req);
    }

    // Handle database operations
    if (url.pathname.startsWith('/db/')) {
      return dbRouter.handleRequest(req);
    }

    // Update user's last seen time periodically
    if (url.pathname !== '/events' && url.pathname !== '/db/get') {
      await updateUserLastSeen(user.id);
    }

    // Serve static files
    return serveDir(req, {
      fsRoot: ".",
      urlRoot: "",
      quiet: true,
    });
  });
}

async function startServer(initialPort: number = 8000): Promise<void> {
  let port = initialPort;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Attempting to start server on port ${port}...`);
      await Deno.serve({
        port,
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
      return;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("aborted")) {
        console.log("Server shutdown completed");
        return;
      }
      if (error instanceof Deno.errors.AddrInUse) {
        console.log(`Port ${port} is in use, trying next port...`);
        port++;
        continue;
      }
      console.error("Fatal server error:", error instanceof Error ? error.message : String(error));
      await cleanup();
      return;
    }
  }
  
  console.error(`Failed to find an available port after ${maxAttempts} attempts`);
  await cleanup();
}

// Initialize and start server
console.log("Initializing server...");
try {
  await startServer();
} catch (error) {
  console.error("Failed to start server:", error instanceof Error ? error.message : String(error));
  await cleanup();
}

