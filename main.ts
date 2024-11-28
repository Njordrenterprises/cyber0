/// <reference lib="deno.unstable" />

// Initialize KV store
const kv = await Deno.openKv();

// Initialize global card data
declare global {
  interface Window {
    cardData: Record<string, any>;
  }
}

globalThis.cardData = {};

// Dynamic imports for cards and views
async function loadCard(cardId: string) {
  try {
    console.log(`Loading card: ${cardId}`);
    const module = await import(`./src/cards/${cardId}/${cardId}.ts`);
    const card = module.default;
    
    // Initialize card data in global scope
    console.log(`Initializing card data for: ${cardId}`);
    globalThis.cardData = globalThis.cardData || {};
    globalThis.cardData[cardId] = {
      handleKvUpdate: card.handleKvUpdate.bind(card),
      loadCardMessage: card.loadCardMessage.bind(card)
    };
    console.log(`Card data initialized: ${cardId}`, globalThis.cardData[cardId]);
    
    return card;
  } catch (error) {
    console.error(`Failed to load card: ${cardId}`, error);
    return null;
  }
}

async function renderCard(card: any) {
  try {
    // Load card data first
    const cardModule = await loadCard(card.id);
    if (!cardModule) {
      throw new Error(`Failed to load card module: ${card.id}`);
    }
    
    // Then render template
    const template = await Deno.readTextFile(`./src/cards/${card.id}/${card.id}.html`);
    
    // Create a script to initialize card data in the browser
    const wrappedTemplate = `
      <script>
        // Initialize card data
        globalThis.cardData = globalThis.cardData || {};
        globalThis.cardData['${card.id}'] = {
          handleKvUpdate: async (index, message) => {
            const key = ['cards', '${card.id}', 'user', index];
            const entry = { message, index, timestamp: Date.now() };
            await fetch('/kv/set', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value: entry })
            });
          },
          loadCardMessage: async (index) => {
            const key = ['cards', '${card.id}', 'user', index];
            const response = await fetch('/kv/get', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key })
            });
            const data = await response.json();
            return data?.message || '';
          }
        };
        console.log('Card data initialized in browser:', '${card.id}', globalThis.cardData['${card.id}']);
      </script>
      ${template}
    `;
    
    return wrappedTemplate;
  } catch (error) {
    console.error(`Failed to render card: ${card.id}`, error);
    return null;
  }
}

async function loadView(viewId: string) {
  try {
    console.log(`Loading view: ${viewId}`);
    const template = await Deno.readTextFile(`./src/views/${viewId}/${viewId}.html`);
    const module = await import(`./src/views/${viewId}/${viewId}.ts`);
    console.log(`View loaded: ${viewId}`);
    return { template, module };
  } catch (error) {
    console.error(`Failed to load view: ${viewId}`, error);
    return null;
  }
}

// Add KV API endpoints
async function handleKvGet(req: Request): Promise<Response> {
  const { key } = await req.json();
  const entry = await kv.get(key);
  return new Response(JSON.stringify(entry.value), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleKvSet(req: Request): Promise<Response> {
  const { key, value } = await req.json();
  await kv.set(key, value);
  return new Response('OK');
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`Request: ${url.pathname}`);

  // Handle KV operations
  if (url.pathname === '/kv/get' && req.method === 'POST') {
    return handleKvGet(req);
  }
  if (url.pathname === '/kv/set' && req.method === 'POST') {
    return handleKvSet(req);
  }

  // Serve JS files
  if (url.pathname.startsWith("/src/js/")) {
    console.log(`Serving JS: ${url.pathname}`);
    return serveFile("." + url.pathname, "application/javascript");
  }

  // Serve CSS files
  if (url.pathname === "/assets/main.css") {
    console.log("Serving main.css");
    return serveFile("./main.css", "text/css");
  }

  // Serve base cards CSS
  if (url.pathname === "/assets/cards/cards.css") {
    console.log("Serving cards.css");
    return serveFile("./src/cards/cards.css", "text/css");
  }

  // Serve card styles
  const cardStyleMatch = url.pathname.match(/^\/assets\/cards\/([^/]+)\/[^/]+\.css$/);
  if (cardStyleMatch) {
    const cardId = cardStyleMatch[1];
    console.log(`Serving card CSS: ${url.pathname}`);
    return serveFile(`./src/cards/${cardId}/${cardId}.css`, "text/css");
  }

  // Serve view styles
  if (url.pathname === "/assets/views.css") {
    console.log("Serving views.css");
    return serveFile("./src/views/views.css", "text/css");
  }

  // Handle views
  const viewMatch = url.pathname.match(/^\/views\/([^/]+)$/);
  if (viewMatch) {
    const viewId = viewMatch[1];
    console.log(`Loading view: ${viewId}`);
    const view = await loadView(viewId);
    if (!view) {
      console.error(`View not found: ${viewId}`);
      return new Response("View not found", { status: 404 });
    }

    console.log(`Serving view: ${viewId}`);
    return new Response(view.template, {
      headers: { "content-type": "text/html" },
    });
  }

  // Handle card template requests
  const cardMatch = url.pathname.match(/^\/cards\/([^/]+)\/template$/);
  if (cardMatch) {
    const cardId = cardMatch[1];
    console.log(`Loading card: ${cardId}`);
    const card = await loadCard(cardId);
    if (!card) {
      console.error(`Card not found: ${cardId}`);
      return new Response("Card not found", { status: 404 });
    }

    const userId = "test-user"; // In a real app, get this from auth
    await card.init(kv, userId);
    console.log(`Serving card: ${cardId}`);
    return new Response(await renderCard(card), {
      headers: { "content-type": "text/html" },
    });
  }

  // Serve main page
  if (url.pathname === "/") {
    console.log("Serving index.html");
    return serveFile("./index.html", "text/html");
  }

  console.log(`Not found: ${url.pathname}`);
  return new Response("Not found", { status: 404 });
}

async function serveFile(path: string, contentType: string): Promise<Response> {
  try {
    console.log(`Reading file: ${path}`);
    const file = await Deno.readFile(path);
    return new Response(file, {
      headers: { "content-type": contentType },
    });
  } catch {
    console.error(`File not found: ${path}`);
    return new Response(`File not found: ${path}`, { status: 404 });
  }
}

// Start the server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
Deno.serve({ port }, handler);
