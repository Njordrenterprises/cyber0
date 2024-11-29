import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import infoCard from "./src/cards/info/info.ts";
import * as db from "./db/kv.ts";
import { createCard, deleteCard, getCards, addMessage, deleteMessage } from "./src/cards/cards.ts";
import { broadcast, initBroadcast } from "./src/ws/broadcast.ts";
import { validateContentType, validateCardInput, validateMessageInput, validateKvKey, validateCardExists } from "./src/middleware/validation.ts";
import type { KvSetRequest, CreateCardRequest, MessageRequest, DeleteCardRequest as _DeleteCardRequest, DeleteMessageRequest as _DeleteMessageRequest, ErrorResponse } from "./src/types.ts";

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

async function parseJsonSafely<T>(req: Request): Promise<{ data: T | null; error: Response | null }> {
  try {
    const data = await req.json();
    return { data: data as T, error: null };
  } catch (_error) {
    return {
      data: null,
      error: new Response(JSON.stringify({ error: 'Invalid JSON format' } satisfies ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Validate content type for POST requests
  if (req.method === 'POST') {
    const contentTypeError = validateContentType(req);
    if (contentTypeError) return contentTypeError;
  }

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
    const { data, error } = await parseJsonSafely<KvSetRequest>(req);
    if (error) return error;
    if (!data) return new Response(JSON.stringify({ error: 'Missing request data' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

    const keyError = validateKvKey(data.key);
    if (keyError) return keyError;
    
    try {
      const response = await db.handleKvSet(new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }));
      await broadcast({ type: 'update', key: data.key, value: data.value });
      return response;
    } catch (error) {
      console.error('Error handling KV set:', error);
      return new Response(JSON.stringify({ error: 'Error handling KV set' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
    const { data, error } = await parseJsonSafely<CreateCardRequest>(req);
    if (error) return error;
    if (!data) return new Response(JSON.stringify({ error: 'Missing request data' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

    const inputError = validateCardInput(data);
    if (inputError) return inputError;

    try {
      const card = await createCard('test-user', data.name, 'info');
      const cards = await getCards('test-user', 'info');
      await broadcast({
        type: 'update',
        key: 'cards,info,test-user,list',
        value: cards
      });
      return new Response(JSON.stringify(card), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating card:', error);
      return new Response(JSON.stringify({ error: 'Error creating card' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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
    const { data, error } = await parseJsonSafely<MessageRequest>(req);
    if (error) return error;
    if (!data) return new Response(JSON.stringify({ error: 'Missing request data' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

    const inputError = validateMessageInput(data);
    if (inputError) return inputError;

    // Validate card exists
    const cardError = await validateCardExists('test-user', data.cardId, 'info');
    if (cardError) return cardError;

    try {
      const message = await addMessage('test-user', 'info', data.cardId, data.text);
      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error adding message:', error);
      return new Response(JSON.stringify({ error: 'Error adding message' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
