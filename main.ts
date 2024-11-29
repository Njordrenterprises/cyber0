import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import infoCard from "./src/cards/info/info.ts";
import * as db from "./db/kv.ts";
import { createCard, deleteCard, getCards, addMessage, deleteMessage } from "./src/cards/cards.ts";
import { broadcast, initBroadcast } from "./src/ws/broadcast.ts";

// Initialize KV database
await db.initKv();

// Initialize broadcast channel
await initBroadcast();

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

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Create SSE endpoint for real-time updates
  if (url.pathname === '/events') {
    const channel = new BroadcastChannel("cyber-updates");
    const stream = new ReadableStream({
      start(controller) {
        channel.onmessage = (event) => {
          const encoder = new TextEncoder();
          const data = encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`);
          controller.enqueue(data);
        };
      },
      cancel() {
        channel.close();
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

  // Handle KV operations
  if (url.pathname === '/kv/get') {
    return db.handleKvGet(req);
  }
  if (url.pathname === '/kv/set' && req.method === 'POST') {
    try {
      const body = await req.json();
      const response = await db.handleKvSet(new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }));
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

  // Handle message operations
  if (url.pathname === '/cards/info/message/add' && req.method === 'POST') {
    try {
      const { cardId, text } = await req.json();
      const message = await addMessage('test-user', 'info', cardId, text);
      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error adding message:', error);
      return new Response('Error adding message', { status: 500 });
    }
  }

  if (url.pathname === '/cards/info/message/delete' && req.method === 'POST') {
    try {
      const { cardId, messageId } = await req.json();
      await deleteMessage('test-user', 'info', cardId, messageId);
      return new Response('OK');
    } catch (error) {
      console.error('Error deleting message:', error);
      return new Response('Error deleting message', { status: 500 });
    }
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
