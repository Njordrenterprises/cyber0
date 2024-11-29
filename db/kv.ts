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

// Card-specific operations
export interface CardInfo {
  id: string;
  name: string;
  type: string;
  created: number;
}

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

export interface CardList {
  cards: CardInfo[];
  timestamp: number;
}

// Card list operations
export async function getCardList(userId: string): Promise<CardInfo[]> {
  const key = ['cards', 'list', userId];
  const result = await getValue<CardList>(key);
  return result?.cards || [];
}

export async function addCard(userId: string, name: string, type: string): Promise<void> {
  const key = ['cards', 'list', userId];
  const result = await getValue<CardList>(key);
  const cards = result?.cards || [];
  
  const card: CardInfo = {
    id: crypto.randomUUID(),
    name,
    type,
    created: Date.now()
  };

  cards.push(card);
  await setValue(key, { cards, timestamp: Date.now() });
}

export async function deleteCard(userId: string, cardId: string): Promise<void> {
  const key = ['cards', 'list', userId];
  const result = await getValue<CardList>(key);
  if (!result) return;

  const cards = result.cards.filter(c => c.id !== cardId);
  await setValue(key, { cards, timestamp: Date.now() });

  // Also delete the card's data
  await getKv().delete(['cards', cardId, userId]);
}

export async function renameCard(userId: string, cardId: string, newName: string): Promise<void> {
  const key = ['cards', 'list', userId];
  const result = await getValue<CardList>(key);
  if (!result) return;

  const cards = result.cards.map(card => 
    card.id === cardId ? { ...card, name: newName } : card
  );

  await setValue(key, { cards, timestamp: Date.now() });
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

// Client-side initialization script
export function getClientScript(): string {
  return `
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    window.cardData = window.cardData || {};
    
    window.cardData.info = window.cardData.info || {
      kv: {
        get: async (key) => {
          const response = await fetch(\`/kv/get?key=\${key.join(',')}\`);
          return response.json();
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
      handleKvUpdate: async (cardId, newMessage) => {
        const key = ['cards', 'info', 'test-user', cardId];
        let entry = await window.cardData.info.kv.get(key);
        if (!entry) {
          entry = { messages: [], cardId, timestamp: Date.now() };
        }
        const message = {
          id: generateUUID(),
          text: newMessage,
          timestamp: Date.now()
        };
        entry.messages.push(message);
        await window.cardData.info.kv.set(key, entry);
      },
      handleKvDelete: async (cardId, messageId) => {
        const key = ['cards', 'info', 'test-user', cardId];
        const entry = await window.cardData.info.kv.get(key);
        if (!entry || !entry.messages) return;
        entry.messages = entry.messages.filter(m => m.id !== messageId);
        await window.cardData.info.kv.set(key, entry);
      },
      loadCardMessages: async (cardId) => {
        const key = ['cards', 'info', 'test-user', cardId];
        const entry = await window.cardData.info.kv.get(key);
        return entry?.messages || [];
      }
    };

    window.cardData.cards = window.cardData.cards || {
      addCard: async (name, type) => {
        const response = await fetch('/cards/manage/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type })
        });
        if (!response.ok) throw new Error('Failed to add card');
      },
      deleteCard: async (id) => {
        const response = await fetch('/cards/manage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to delete card');
      },
      renameCard: async (id, newName) => {
        const response = await fetch('/cards/manage/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name: newName })
        });
        if (!response.ok) throw new Error('Failed to rename card');
      },
      getCards: async () => {
        const response = await fetch('/cards/list');
        if (!response.ok) throw new Error('Failed to get cards');
        return response.json();
      }
    };
  `;
}
