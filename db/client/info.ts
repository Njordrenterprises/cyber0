import { generateUUID } from './utils.ts';
import type { InfoCardMethods, CardMessage, CardEntry } from './types.ts';
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
      const cardData = getCardData();
      let entry = await cardData.info.kv.get<CardEntry>(key);
      if (!entry) {
        entry = { messages: [], cardId, timestamp: Date.now() };
      }
      const message: CardMessage = {
        id: generateUUID(),
        text: newMessage,
        timestamp: Date.now()
      };
      entry.messages.push(message);
      await cardData.info.kv.set(key, entry);
    },
    handleKvDelete: async (cardId: string, messageId: string) => {
      const key = ['cards', 'info', 'test-user', cardId];
      const cardData = getCardData();
      const entry = await cardData.info.kv.get<CardEntry>(key);
      if (!entry || !entry.messages) return;
      entry.messages = entry.messages.filter(m => m.id !== messageId);
      await cardData.info.kv.set(key, entry);
    },
    loadCardMessages: async (cardId: string) => {
      const key = ['cards', 'info', 'test-user', cardId];
      const cardData = getCardData();
      const entry = await cardData.info.kv.get<CardEntry>(key);
      return entry?.messages || [];
    }
  };
}

export function getInfoCardScript(): string {
  return `
    globalThis.cardData = globalThis.cardData || {};
    globalThis.cardData.info = globalThis.cardData.info || ${JSON.stringify(getInfoCardMethods())};
  `;
} 