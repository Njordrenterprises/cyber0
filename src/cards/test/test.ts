import { BaseCardRouter } from '../cardRouter.ts';
import type { TestCardMethods } from '../../../db/client/types.ts';

export class TestCardRouter extends BaseCardRouter {
  constructor(userId: string) {
    super('test', userId);
  }
}

export function getTestCardScript(): string {
  return `
    // Initialize cardData
    globalThis.cardData = globalThis.cardData || {};
    globalThis.cardData.test = globalThis.cardData.test || {
      async getCards() {
        const response = await fetch('/cards/test/list');
        if (!response.ok) {
          throw new Error(\`Failed to get cards: \${response.status}\`);
        }
        return await response.json();
      },
      
      async createCard(name) {
        const response = await fetch('/cards/test/create', {
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
        const response = await fetch('/cards/test/delete', {
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