import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import infoCard from "./src/cards/info/info.ts";
import * as db from "./db/kv.ts";
import { createCard, deleteCard, getCards } from "./src/cards/cards.ts";
import { addClient, broadcast } from "./src/ws/broadcast.ts";

// Initialize KV database
await db.initKv();

// Initialize cards
console.log('Initializing cards...');
await infoCard.init('test-user');

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

// Load card template
async function loadCardTemplate(name: string): Promise<string> {
  try {
    const content = await Deno.readTextFile(`./src/cards/${name}/${name}.html`);
    return content;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

// Request handler
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Handle WebSocket upgrade
  if (url.pathname === '/ws') {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response(null, { status: 501 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Add client to broadcast system
    addClient(socket);
    
    socket.onmessage = (e) => {
      console.log('WebSocket message received:', e.data);
      // Echo message to all clients
      broadcast(JSON.parse(e.data));
    };
    
    return response;
  }

  // Handle KV operations
  if (url.pathname === '/kv/get') {
    return db.handleKvGet(req);
  }
  if (url.pathname === '/kv/set' && req.method === 'POST') {
    try {
      // Read the body once
      const body = await req.json();
      // Handle the KV set
      const response = await db.handleKvSet(new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }));
      // Broadcast the update
      await broadcast({ type: 'update', key: body.key, value: body.value });
      return response;
    } catch (error) {
      console.error('Error handling KV set:', error);
      return new Response('Error handling KV set', { status: 500 });
    }
  }

  // Handle CSS files
  if (url.pathname.endsWith('.css')) {
    try {
      const content = await Deno.readTextFile(`.${url.pathname}`);
      return new Response(content, {
        headers: { 'Content-Type': 'text/css' }
      });
    } catch (error) {
      console.error(`Error loading CSS file: ${url.pathname}`, error);
      return new Response('Not Found', { status: 404 });
    }
  }

  // Handle info card operations
  if (url.pathname === '/cards/info/list' && req.method === 'GET') {
    const cards = await getCards('test-user', 'info');
    return new Response(JSON.stringify(cards), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname === '/cards/info/create' && req.method === 'POST') {
    const { name } = await req.json();
    const card = await createCard('test-user', name, 'info');
    const cards = await getCards('test-user', 'info');
    // Broadcast updated card list
    await broadcast({
      type: 'update',
      key: 'cards,info,test-user,list',
      value: cards
    });
    return new Response(JSON.stringify(card), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname === '/cards/info/delete' && req.method === 'POST') {
    const { cardId } = await req.json();
    await deleteCard('test-user', cardId, 'info');
    const cards = await getCards('test-user', 'info');
    // Broadcast updated card list
    await broadcast({
      type: 'update',
      key: 'cards,info,test-user,list',
      value: cards
    });
    return new Response('OK');
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

console.log("Starting server on http://localhost:8000");
Deno.serve({ port: 8000 }, handler);
