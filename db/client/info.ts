import type { InfoCardMethods, BaseCard } from './types.ts';

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
    userId: globalThis.userContext?.id || 'test-user',
    handleKvUpdate: async (cardId: string, newMessage: string) => {
      try {
        const response = await fetch('/cards/info/message/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, text: newMessage })
        });
        if (!response.ok) throw new Error('Failed to add message');
      } catch (error) {
        console.error('Error in handleKvUpdate:', error);
        throw error;
      }
    },
    handleKvDelete: async (cardId: string, messageId: string) => {
      console.log('Deleting message client-side:', { cardId, messageId });
      try {
        const response = await fetch('/cards/info/message/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, messageId })
        });
        console.log('Delete response:', response.status);
        if (!response.ok) throw new Error('Failed to delete message');
        console.log('Delete successful');
      } catch (error) {
        console.error('Error in handleKvDelete:', error);
        throw error;
      }
    },
    loadCardMessages: async (cardId: string) => {
      try {
        const response = await fetch(`/kv/get?key=cards,info,data,${cardId}`);
        if (!response.ok) {
          throw new Error(`Failed to load messages: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded messages:', data);
        return data?.messages || [];
      } catch (error) {
        console.error('Error loading messages:', error);
        return [];
      }
    },
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
    // Initialize cardData
    globalThis.cardData = globalThis.cardData || {};
    globalThis.cardData.info = globalThis.cardData.info || {
      async getCards() {
        const response = await fetch('/cards/info/list');
        if (!response.ok) {
          throw new Error(\`Failed to get cards: \${response.status}\`);
        }
        return await response.json();
      },
      
      async createCard(name) {
        const response = await fetch('/cards/info/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (!response.ok) {
          throw new Error(\`Failed to create card: \${response.status}\`);
        }
        return await response.json();
      },
      
      async deleteCard(cardId) {
        const response = await fetch('/cards/info/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId })
        });
        if (!response.ok) {
          throw new Error(\`Failed to delete card: \${response.status}\`);
        }
      },
      
      async loadCardMessages(cardId) {
        try {
          const response = await fetch(\`/kv/get?key=cards,info,data,\${cardId}\`);
          if (!response.ok) {
            throw new Error(\`Failed to load messages: \${response.status}\`);
          }
          const data = await response.json();
          return data?.messages || [];
        } catch (error) {
          console.error('Error loading messages:', error);
          return [];
        }
      },
      
      async handleKvUpdate(cardId, text) {
        const response = await fetch('/cards/info/message/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, text })
        });
        if (!response.ok) {
          throw new Error(\`Failed to add message: \${response.status}\`);
        }
        return response.json();
      },
      
      async handleKvDelete(cardId, messageId) {
        const response = await fetch('/cards/info/message/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, messageId })
        });
        if (!response.ok) {
          throw new Error(\`Failed to delete message: \${response.status}\`);
        }
      }
    };
  `;
} 