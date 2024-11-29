// KV Database singleton
let kvInstance: Deno.Kv | null = null;

export async function initKv(): Promise<void> {
  if (!kvInstance) {
    kvInstance = await Deno.openKv();
  }
}

export function getKv(): Deno.Kv {
  if (!kvInstance) {
    throw new Error('KV not initialized. Call initKv() first.');
  }
  return kvInstance;
}

// Key utilities
export function parseKey(keyStr: string): Deno.KvKey {
  return keyStr.split(',').map(part => {
    const num = Number(part);
    return isNaN(num) ? part : num;
  }) as Deno.KvKey;
}

// Generic KV operations
export async function getValue<T>(key: Deno.KvKey): Promise<T | null> {
  const kv = getKv();
  const result = await kv.get(key);
  return result.value as T | null;
}

export async function setValue(key: Deno.KvKey, value: unknown): Promise<void> {
  const kv = getKv();
  await kv.set(key, value);
}

// Card-specific types
export interface CardMessage {
  id: string;
  text: string;
  timestamp: number;
}

export interface CardEntry {
  messages: CardMessage[];
  cardId: string;
  timestamp: number;
}

// Card message operations
export async function getCardMessages(userId: string, cardId: string): Promise<CardMessage[]> {
  const key = ['cards', 'info', userId, cardId];
  const entry = await getValue<CardEntry>(key);
  return entry?.messages || [];
}

export async function addCardMessage(userId: string, cardId: string, text: string): Promise<void> {
  const key = ['cards', 'info', userId, cardId];
  const entry = await getValue<CardEntry>(key);
  const messages = entry?.messages || [];

  const message: CardMessage = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now()
  };

  messages.push(message);
  await setValue(key, {
    messages,
    cardId,
    timestamp: Date.now()
  });
}

export async function deleteCardMessage(userId: string, cardId: string, messageId: string): Promise<void> {
  const key = ['cards', 'info', userId, cardId];
  const entry = await getValue<CardEntry>(key);
  if (!entry || !entry.messages) return;

  const messages = entry.messages.filter(m => m.id !== messageId);
  await setValue(key, {
    ...entry,
    messages,
    timestamp: Date.now()
  });
}

// HTTP handlers
export async function handleKvGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const keyStr = url.searchParams.get('key');
  if (!keyStr) {
    return new Response('Missing key parameter', { status: 400 });
  }
  
  const key = parseKey(keyStr);
  const value = await getValue<unknown>(key);
  
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleKvSet(req: Request): Promise<Response> {
  const { key, value } = await req.json();
  if (!key || !value) {
    return new Response('Missing key or value', { status: 400 });
  }
  
  const keyArr = parseKey(key);
  await setValue(keyArr, value);
  
  return new Response('OK');
}
