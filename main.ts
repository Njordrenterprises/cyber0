import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";

const kv = await Deno.openKv();

// File loading functions
async function loadView(name: string): Promise<string> {
  try {
    // Import the view's TypeScript module
    const viewModule = await import(`./src/views/${name}/${name}.ts`);
    // Load the view's CSS
    const css = await Deno.readTextFile(`src/views/${name}/${name}.css`);
    
    // Get the HTML from the module's layout function
    const html = await viewModule.layout("");
    
    // Bundle them together
    return `
      <style>${css}</style>
      ${html}
    `;
  } catch (error) {
    console.error(`Error loading view ${name}:`, error);
    throw error;
  }
}

async function loadCardTemplate(name: string): Promise<string> {
  try {
    const html = await Deno.readTextFile(`src/cards/${name}/${name}.html`);
    const css = await Deno.readTextFile(`src/cards/${name}/${name}.css`);
    const baseJs = await Deno.readTextFile('src/cards/cards.js');
    const cardJs = await Deno.readTextFile(`src/cards/${name}/${name}.js`);
    
    return `
      <style>${css}</style>
      ${html}
      <script>${baseJs}</script>
      <script>${cardJs}</script>
    `;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

// KV operation handlers
async function handleKvGet(key: string[]): Promise<Response> {
  const data = await kv.get(key);
  return new Response(JSON.stringify(data.value), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleKvSet(key: string[], value: unknown): Promise<Response> {
  await kv.set(key, value);
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleKvWatch(key: string[]): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const watcher = kv.watch([key]);
      for await (const entry of watcher) {
        controller.enqueue(`data: ${JSON.stringify(entry)}\n\n`);
      }
    },
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
    const key = url.searchParams.get("key")?.split(",") || [];
    return handleKvGet(key);
  }

  if (url.pathname === "/kv/set") {
    const { key, value } = await req.json();
    return handleKvSet(key.split(","), value);
  }

  if (url.pathname === "/kv/watch") {
    const key = url.searchParams.get("key")?.split(",") || [];
    return handleKvWatch(key);
  }

  // Serve index.html at root
  if (url.pathname === "/") {
    try {
      const content = await Deno.readFile("index.html");
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (_error) {
      console.error("Error serving index.html");
      return new Response("Not Found", { status: 404 });
    }
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
      const content = await loadCardTemplate(cardName);
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (_error) {
      return new Response("Card Template Not Found", { status: 404 });
    }
  }

  // Static file serving (for root files like main.css and libraries)
  return serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
  });
}

console.log("Starting server on http://localhost:8000");
Deno.serve({ port: 8000 }, handler);
