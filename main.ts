import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";

const kv = await Deno.openKv();

// Initialize card data for client
globalThis.cardData = {
  info: {
    kv: {
      get: async (key: unknown[]) => {
        const data = await kv.get(key);
        return data.value;
      },
      set: async (key: unknown[], value: unknown) => {
        await kv.set(key, value);
      }
    },
    userId: 'test-user'
  }
};

// File loading functions
async function loadView(name: string): Promise<string> {
  try {
    const viewModule = await import(`./src/views/${name}/${name}.ts`);
    return viewModule.layout("");
  } catch (error) {
    console.error(`Error loading view ${name}:`, error);
    throw error;
  }
}

async function loadCardTemplate(name: string): Promise<string> {
  try {
    const html = await Deno.readTextFile(`src/cards/${name}/${name}.html`);
    return html;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

// KV operation handlers
async function handleKvGet(key: string[]): Promise<Response> {
  console.log('KV GET:', key);
  const data = await kv.get(key);
  console.log('KV GET result:', data.value);
  return new Response(JSON.stringify(data.value), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleKvSet(key: string[], value: unknown): Promise<Response> {
  console.log('KV SET:', key, value);
  
  try {
    // Set the value
    const ok = await kv.atomic()
      .set(key, value)
      .commit();
      
    if (!ok) {
      console.error('KV SET failed atomic commit');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to set value' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the set worked
    const verify = await kv.get(key);
    console.log('KV SET verify:', verify);
    
    return new Response(JSON.stringify({ 
      success: true, 
      value: verify.value 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error('KV SET error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function handleKvWatch(key: string[]): Response {
  console.log('KV WATCH:', key);
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const watcher = kv.watch([key]);
        console.log('Starting watcher for key:', key);
        
        for await (const [entries] of watcher) {
          console.log('KV WATCH raw entries:', entries);
          // Encode the data as a string before sending
          const data = encoder.encode(`data: ${JSON.stringify(entries)}\n\n`);
          controller.enqueue(data);
        }
      } catch (error: unknown) {
        console.error('KV WATCH error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const data = encoder.encode(`error: ${errorMessage}\n\n`);
        controller.enqueue(data);
      }
    },
    cancel() {
      console.log('KV WATCH cancelled for key:', key);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // KV operations
  if (url.pathname === "/kv/get") {
    const keyStr = url.searchParams.get("key");
    if (!keyStr) {
      return new Response('Missing key parameter', { status: 400 });
    }
    const key = keyStr.split(",");
    return handleKvGet(key);
  }

  if (url.pathname === "/kv/set") {
    const body = await req.json();
    if (!body.key || !body.value) {
      return new Response('Missing key or value in body', { status: 400 });
    }
    const key = body.key.split(",");
    return handleKvSet(key, body.value);
  }

  if (url.pathname === "/kv/watch") {
    const keyStr = url.searchParams.get("key");
    if (!keyStr) {
      return new Response('Missing key parameter', { status: 400 });
    }
    const key = keyStr.split(",");
    return handleKvWatch(key);
  }

  // Dynamic view loading
  const viewMatch = url.pathname.match(/^\/views\/([^\/]+)\/?$/);
  if (viewMatch) {
    try {
      const viewName = viewMatch[1];
      console.log(`Loading view: ${viewName}`);
      const content = await loadView(viewName);
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (_error) {
      console.error(`Error loading view: ${viewMatch[1]}`);
      return new Response("View Not Found", { status: 404 });
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
      console.error(`Error loading card template: ${cardMatch[1]}`);
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

console.log("Starting server on http://localhost:8000");
Deno.serve({ port: 8000 }, handler);
