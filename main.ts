import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import infoCard from "./src/cards/info/info.ts";
import cardManager from "./src/cards/card-manager/card-manager.ts";
import * as db from "./db/kv.ts";
import { getClientScript } from "./db/client/index.ts";

// Initialize KV database
await db.initKv();

// Initialize cards
console.log('Initializing cards...');
await infoCard.init('test-user');
await cardManager.init('test-user');

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
    return `<script>${getClientScript()}</script>${html}`;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

// Request handler
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Handle KV operations
  if (url.pathname === '/kv/get') {
    return db.handleKvGet(req);
  }
  if (url.pathname === '/kv/set' && req.method === 'POST') {
    return db.handleKvSet(req);
  }

  // Handle card management operations
  if (url.pathname === '/cards/list' && req.method === 'GET') {
    const cards = await db.getCardList('test-user');
    return new Response(JSON.stringify(cards), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname === '/cards/manage/add' && req.method === 'POST') {
    const { name, type } = await req.json();
    await db.addCard('test-user', name, type);
    return new Response('OK');
  }

  if (url.pathname === '/cards/manage/delete' && req.method === 'POST') {
    const { id } = await req.json();
    await db.deleteCard('test-user', id);
    return new Response('OK');
  }

  if (url.pathname === '/cards/manage/rename' && req.method === 'POST') {
    const { id, name } = await req.json();
    await db.renameCard('test-user', id, name);
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
