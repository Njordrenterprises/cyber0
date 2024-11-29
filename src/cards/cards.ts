export interface CardState {
  id: string;
  userId: string;
  cardIndex: number;
  messages: string[];
}

export interface CardKvEntry {
  timestamp: number;
  message?: string;
  index?: number;
}

export interface CardIdentity {
  cardId: string;
  createdAt: number;
  type: string;
}

type CardKvKey = ['cards', string, string, ...string[]];

// Add type declaration for globalThis
declare global {
  interface GlobalThis {
    cardData: Record<string, {
      kv: {
        get: (key: string[]) => Promise<any>;
        set: (key: string[], value: unknown) => Promise<void>;
      };
      userId: string;
    }>;
  }
}

export class Card<State extends CardState, KvEntry extends CardKvEntry> {
  id: string;
  userId: string = '';
  cardIndex: number = 0;
  messages: string[] = [];
  newMessage: string = '';
  kv: Deno.Kv | null = null;
  #watchController: AbortController | null = null;

  constructor(id: string) {
    this.id = id;
  }

  async init(kv: Deno.Kv, userId: string): Promise<this> {
    this.kv = kv;
    this.userId = userId;
    this.#watchController = new AbortController();
    await this.setupIdentity();
    await this.loadMessages();
    this.setupKvWatch();
    await this.loadInitialState();
    return this;
  }

  protected async setupIdentity() {
    const identityKey = ['cards', this.id, this.userId, this.cardIndex, 'identity'];
    const identityEntry = await this.kv?.get<CardIdentity>(identityKey as Deno.KvKey);
    
    if (!identityEntry?.value) {
      const identity: CardIdentity = {
        cardId: `${this.id}-${this.cardIndex}`,
        createdAt: Date.now(),
        type: this.id
      };
      await this.kv?.set(identityKey as Deno.KvKey, identity);
    }
  }

  protected async loadMessages() {
    this.messages = [];
    // Load last 5 messages for this card
    for (let i = 0; i < 5; i++) {
      const key = ['cards', this.id, this.userId, this.cardIndex, 'messages', i];
      const entry = await this.kv?.get<KvEntry>(key as Deno.KvKey);
      if (entry?.value?.message) {
        this.messages.push(entry.value.message);
      }
    }
  }

  async updateMessage(newMessage: string) {
    if (!newMessage.trim() || !this.kv) return;
    
    // Shift messages up
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const nextKey = ['cards', this.id, this.userId, this.cardIndex, 'messages', i + 1];
      const currentMessage = this.messages[i];
      await this.kv.set(nextKey as Deno.KvKey, {
        message: currentMessage,
        index: i + 1,
        timestamp: Date.now()
      } as KvEntry);
    }

    // Set new message
    const key = ['cards', this.id, this.userId, this.cardIndex, 'messages', 0];
    await this.kv.set(key as Deno.KvKey, {
      message: newMessage,
      index: 0,
      timestamp: Date.now()
    } as KvEntry);

    // Update local state
    this.messages.unshift(newMessage);
    if (this.messages.length > 5) {
      this.messages.pop();
    }
  }

  protected setupKvWatch() {
    const kv = this.kv;
    if (!kv) return;

    const watchKey = ['cards', this.id, this.userId, this.cardIndex];
    
    (async () => {
      try {
        const watcher = kv.watch([watchKey]);
        
        try {
          for await (const entries of watcher) {
            for (const entry of entries) {
              if (entry.value) {
                await this.loadMessages();
                break;
              }
            }
          }
        } catch (watchError) {
          if (!(watchError instanceof Error && watchError.name === 'AbortError')) {
            console.error('KV Watch iteration error:', watchError);
          }
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name !== 'AbortError') {
          console.error('KV Watch setup error:', err);
        }
      }
    })();
  }

  protected async loadInitialState(): Promise<void> {
    // Override in child class for additional state
  }

  getState(): State {
    return {
      id: this.id,
      userId: this.userId,
      cardIndex: this.cardIndex,
      messages: this.messages
    } as State;
  }

  destroy() {
    if (this.#watchController) {
      this.#watchController.abort();
      this.#watchController = null;
    }
  }

  protected getKvKey(): CardKvKey {
    return ['cards', this.id, this.userId];
  }
}

// Initialize KV store
const kv = await Deno.openKv();

// Card router
export function handleCardRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle KV operations
  if (path === '/cards/kv/get' && req.method === 'POST') {
    return handleKvGet(req);
  }
  if (path === '/cards/kv/set' && req.method === 'POST') {
    return handleKvSet(req);
  }
  if (path === '/cards/kv/watch') {
    return Promise.resolve(handleKvWatch(req));
  }

  // Handle card template requests
  const cardMatch = path.match(/^\/cards\/([^\/]+)\/template$/);
  if (cardMatch) {
    return handleCardTemplate(cardMatch[1]);
  }

  return Promise.resolve(new Response('Not Found', { status: 404 }));
}

// Update KV operation handlers to use the shared kv instance
async function handleKvGet(req: Request): Promise<Response> {
  try {
    const { key } = await req.json();
    console.log('KV GET request with key:', key);
    
    const keyArray = Array.isArray(key) ? key : [key];
    const entry = await kv.get(keyArray);
    
    console.log('KV GET result:', {
      key: keyArray,
      value: entry.value,
      versionstamp: entry.versionstamp
    });
    
    return new Response(JSON.stringify(entry.value), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('KV GET error:', error);
    return new Response(JSON.stringify(null), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

async function handleKvSet(req: Request): Promise<Response> {
  try {
    const { key, value } = await req.json();
    console.log('KV SET request:', { key, value });
    
    const keyArray = Array.isArray(key) ? key : [key];
    const result = await kv.set(keyArray, value);
    
    console.log('KV SET result:', {
      key: keyArray,
      versionstamp: result.versionstamp
    });
    
    return new Response(JSON.stringify({ success: true, versionstamp: result.versionstamp }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('KV SET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

function handleKvWatch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const keyStr = url.searchParams.get('key');
  if (!keyStr) {
    return Promise.resolve(new Response('Missing key parameter', { status: 400 }));
  }

  const key = keyStr.split(',');
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const watcher = kv.watch([key]);
        for await (const entries of watcher) {
          for (const entry of entries) {
            const data = JSON.stringify({
              key: entry.key,
              value: entry.value,
              versionstamp: entry.versionstamp
            });
            controller.enqueue(`data: ${data}\n\n`);
          }
        }
      } catch (error) {
        console.error('KV Watch error:', error);
        controller.close();
      }
    }
  });

  return Promise.resolve(new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  }));
}

// Handle card template requests
export async function handleCardTemplate(cardId: string): Promise<Response> {
  try {
    const template = await Deno.readTextFile(`./src/cards/${cardId}/${cardId}.html`);
    return new Response(template, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error(`Error loading card template ${cardId}:`, error);
    return new Response('Card template not found', { status: 404 });
  }
}
