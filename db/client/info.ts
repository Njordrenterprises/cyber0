import { generateUUID } from './utils.ts';
import type { InfoCardMethods, CardMessage, CardEntry, BaseCard } from './types.ts';
import { getCardData } from './types.ts';

export function getInfoCardMethods(): InfoCardMethods {
  return {
    kv: {
      get: async <T>(key: unknown[]) => {
        const response = await fetch(`/kv/get?key=${key.join(',')}`);
        const data = await response.json();
        return data as T | null;
      },
      set: async (key: unknown[], value: unknown) => {
        await fetch('/kv/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key.join(','), value })
        });
      }
    },
    userId: 'test-user',
    handleKvUpdate: async (cardId: string, newMessage: string) => {
      const key = ['cards', 'info', 'test-user', cardId];
      let entry = await getCardData().info.kv.get<CardEntry>(key);
      if (!entry) {
        entry = { messages: [], cardId, timestamp: Date.now() };
      }
      const message: CardMessage = {
        id: generateUUID(),
        text: newMessage,
        timestamp: Date.now()
      };
      entry.messages.push(message);
      await getCardData().info.kv.set(key, entry);
    },
    handleKvDelete: async (cardId: string, messageId: string) => {
      const key = ['cards', 'info', 'test-user', cardId];
      const entry = await getCardData().info.kv.get<CardEntry>(key);
      if (!entry || !entry.messages) return;
      entry.messages = entry.messages.filter(m => m.id !== messageId);
      await getCardData().info.kv.set(key, entry);
    },
    loadCardMessages: async (cardId: string) => {
      const key = ['cards', 'info', 'test-user', cardId];
      const entry = await getCardData().info.kv.get<CardEntry>(key);
      return entry?.messages || [];
    },
    // Card management using shared endpoints
    createCard: async (name: string) => {
      const response = await fetch('/cards/info/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      return await response.json() as BaseCard;
    },
    deleteCard: async (cardId: string) => {
      await fetch('/cards/info/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      });
    },
    getCards: async () => {
      const response = await fetch('/cards/info/list');
      return await response.json() as BaseCard[];
    }
  };
}

export function getInfoCardScript(): string {
  return `
    // First define the UUID function
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // Define KV methods
    const kv = {
      get: async (key) => {
        const response = await fetch(\`/kv/get?key=\${key.join(',')}\`);
        return await response.json();
      },
      set: async (key, value) => {
        await fetch('/kv/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key.join(','), value })
        });
      }
    };

    // Define card methods
    const methods = {
      kv,
      userId: 'test-user',
      handleKvUpdate: async (cardId, newMessage) => {
        const key = ['cards', 'info', 'test-user', cardId];
        let entry = await kv.get(key);
        if (!entry) {
          entry = { messages: [], cardId, timestamp: Date.now() };
        }
        const message = {
          id: generateUUID(),
          text: newMessage,
          timestamp: Date.now()
        };
        entry.messages.push(message);
        await kv.set(key, entry);
      },
      handleKvDelete: async (cardId, messageId) => {
        const key = ['cards', 'info', 'test-user', cardId];
        const entry = await kv.get(key);
        if (!entry || !entry.messages) return;
        entry.messages = entry.messages.filter(m => m.id !== messageId);
        await kv.set(key, entry);
      },
      loadCardMessages: async (cardId) => {
        const key = ['cards', 'info', 'test-user', cardId];
        const entry = await kv.get(key);
        return entry?.messages || [];
      },
      createCard: async (name) => {
        const response = await fetch('/cards/info/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        return await response.json();
      },
      deleteCard: async (cardId) => {
        await fetch('/cards/info/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId })
        });
      },
      getCards: async () => {
        const response = await fetch('/cards/info/list');
        return await response.json();
      }
    };

    // Initialize cardData
    globalThis.cardData = globalThis.cardData || {};
    globalThis.cardData.info = globalThis.cardData.info || methods;
  `;
} 