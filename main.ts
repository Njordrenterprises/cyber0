import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import infoCard from "./src/cards/info/info.ts";

const kv = await Deno.openKv();

// Initialize card data for client
if (!globalThis.cardData) {
  globalThis.cardData = {};
}

// Initialize info card
console.log('Initializing info card...');
await infoCard.init(kv, 'test-user');

// Get Alpine.js methods
const alpineMethods = infoCard.getAlpineMethods();
console.log('Alpine methods:', alpineMethods);

// Initialize info card methods
globalThis.cardData.info = {
  kv: {
    get: async (key: unknown[]) => {
      console.log('Getting KV:', key);
      const data = await kv.get(key);
      console.log('Got KV result:', data.value);
      return data.value;
    },
    set: async (key: unknown[], value: unknown) => {
      console.log('Setting KV:', key, value);
      await kv.set(key, value);
    }
  },
  userId: 'test-user',
  handleKvUpdate: async (index: number, newMessage: string) => {
    const key = ['cards', 'info', 'test-user', index];
    let entry = await globalThis.cardData.info.kv.get(key);
    
    // Initialize entry if it doesn't exist
    if (!entry) {
      entry = {
        messages: [],
        index: index,
        timestamp: Date.now()
      };
    }
    
    // Initialize messages array if it doesn't exist
    if (!entry.messages) {
      entry.messages = [];
    }

    const message = {
      id: crypto.randomUUID(),
      text: newMessage,
      timestamp: Date.now()
    };
    
    entry.messages.push(message);
    await globalThis.cardData.info.kv.set(key, entry);
  },
  handleKvDelete: async (index: number, messageId: string) => {
    const key = ['cards', 'info', 'test-user', index];
    const entry = await globalThis.cardData.info.kv.get(key);
    if (!entry || !entry.messages) return;
    entry.messages = entry.messages.filter(m => m.id !== messageId);
    await globalThis.cardData.info.kv.set(key, entry);
  },
  loadCardMessages: async (index: number) => {
    const key = ['cards', 'info', 'test-user', index];
    const entry = await globalThis.cardData.info.kv.get(key);
    return entry?.messages || [];
  }
};

console.log('Card data initialized:', globalThis.cardData.info);

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
    
    // Add initialization script for client
    const initScript = `
      <script>
        window.cardData = {
          info: {
            kv: {
              get: async (key) => {
                const response = await fetch(\`/kv/get?key=\${key.join(',')}\`);
                const data = await response.json();
                return data;
              },
              set: async (key, value) => {
                await fetch('/kv/set', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: key.join(','), value })
                });
              }
            },
            userId: 'test-user',
            handleKvUpdate: async (index, newMessage) => {
              const key = ['cards', 'info', 'test-user', index];
              let entry = await window.cardData.info.kv.get(key);
              
              // Initialize entry if it doesn't exist
              if (!entry) {
                entry = {
                  messages: [],
                  index: index,
                  timestamp: Date.now()
                };
              }
              
              // Initialize messages array if it doesn't exist
              if (!entry.messages) {
                entry.messages = [];
              }

              const message = {
                id: crypto.randomUUID(),
                text: newMessage,
                timestamp: Date.now()
              };
              
              entry.messages.push(message);
              await window.cardData.info.kv.set(key, entry);
            },
            handleKvDelete: async (index, messageId) => {
              const key = ['cards', 'info', 'test-user', index];
              const entry = await window.cardData.info.kv.get(key);
              if (!entry || !entry.messages) return;
              entry.messages = entry.messages.filter(m => m.id !== messageId);
              await window.cardData.info.kv.set(key, entry);
            },
            loadCardMessages: async (index) => {
              const key = ['cards', 'info', 'test-user', index];
              const entry = await window.cardData.info.kv.get(key);
              return entry?.messages || [];
            }
          }
        };
      </script>
    `;
    
    return initScript + html;
  } catch (error) {
    console.error(`Error loading card template ${name}:`, error);
    throw error;
  }
}

// KV operation handlers
async function handleKvGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const keyStr = url.searchParams.get('key');
  if (!keyStr) {
    return new Response('Missing key parameter', { status: 400 });
  }
  const key = keyStr.split(',').map(part => {
    const num = Number(part);
    return isNaN(num) ? part : num;
  });
  const data = await kv.get(key as Deno.KvKey);
  return new Response(JSON.stringify(data.value), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleKvSet(req: Request): Promise<Response> {
  const { key, value } = await req.json() as { key: string; value: InfoKvEntry };
  if (!key || !value) {
    return new Response('Missing key or value', { status: 400 });
  }
  const keyArr = key.split(',').map(part => {
    const num = Number(part);
    return isNaN(num) ? part : num;
  });
  await kv.set(keyArr as Deno.KvKey, value);
  return new Response('OK');
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  // Handle KV operations
  if (url.pathname === '/kv/get') {
    return handleKvGet(req);
  }
  if (url.pathname === '/kv/set' && req.method === 'POST') {
    return handleKvSet(req);
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

      // Re-initialize card data for each template request
      if (cardName === 'info') {
        await infoCard.init(kv, 'test-user');
        
        // Update methods in case they were lost
        globalThis.cardData.info = {
          kv: {
            get: async (key: unknown[]) => {
              const data = await kv.get(key);
              return data.value;
            },
            set: async (key: unknown[], value: unknown) => {
              await kv.set(key, value);
            }
          },
          userId: 'test-user',
          ...infoCard.getAlpineMethods()
        };
      }

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
