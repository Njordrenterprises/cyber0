import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";

async function loadView(name: string): Promise<string> {
  try {
    const html = await Deno.readTextFile(`src/views/${name}/${name}.html`);
    const css = await Deno.readTextFile(`src/views/${name}/${name}.css`);
    const js = await Deno.readTextFile(`src/views/${name}/${name}.js`);
    
    return `
      <style>${css}</style>
      ${html}
      <script type="module">${js}</script>
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
    const js = await Deno.readTextFile(`src/cards/${name}/${name}.js`);
    
    return `
      <style>${css}</style>
      ${html}
      <script type="module">${js}</script>
    `;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Serve index.html at root
  if (url.pathname === "/") {
    try {
      const content = await Deno.readFile("index.html");
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Error serving index.html:", error);
      return new Response("Not Found", { status: 404 });
    }
  }

  // Dynamic view loading
  const viewMatch = url.pathname.match(/^\/views\/([^\/]+)$/);
  if (viewMatch) {
    try {
      const viewName = viewMatch[1];
      const content = await loadView(viewName);
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
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
    } catch (error) {
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
