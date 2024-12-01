import type { BaseCard } from './types.ts';

export interface InfoCardMethods {
  getCards(): Promise<BaseCard[]>;
  createCard(name: string, description?: string): Promise<BaseCard>;
  updateCard(cardId: string, content: Record<string, unknown>): Promise<BaseCard>;
  deleteCard(cardId: string): Promise<void>;
}

export function getInfoCardMethods(): InfoCardMethods {
  return {
    async getCards() {
      const response = await fetch('/cards/info/list');
      if (!response.ok) throw new Error(`Failed to get cards: ${response.status}`);
      return response.json();
    },

    async createCard(name: string, description?: string) {
      const response = await fetch('/cards/info/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if (!response.ok) throw new Error(`Failed to create card: ${response.status}`);
      return response.json();
    },

    async updateCard(cardId: string, content: Record<string, unknown>) {
      const response = await fetch(`/cards/info/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error(`Failed to update card: ${response.status}`);
      return response.json();
    },

    async deleteCard(cardId: string) {
      const response = await fetch(`/cards/info/${cardId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete card: ${response.status}`);
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
      }
    };
  `;
} 