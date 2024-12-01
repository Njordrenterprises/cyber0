import { BaseCardRouter } from '../cardRouter.ts';
import type { CardMessage, CardAuthor, BaseCard } from '../../../db/client/types.ts';
import { kv } from '../../../db/core/kv.ts';

export interface CardData {
  messages: CardMessage[];
  timestamp: number;
  lastUpdated: number;
}

export class TestCardRouter extends BaseCardRouter {
  constructor(userId: string, author: CardAuthor) {
    super('test', userId, author);
  }

  override async getCards(): Promise<BaseCard[]> {
    try {
      const cards: BaseCard[] = [];
      const iterator = kv.list<CardData>({ prefix: ['cards', 'test', 'data'] });
      
      for await (const entry of iterator) {
        const [, , , id] = entry.key;
        if (typeof id === 'string') {
          cards.push({
            id,
            type: this.cardType,
            name: id,
            created: entry.value.timestamp,
            lastUpdated: entry.value.lastUpdated,
            createdBy: this.user,
            content: {},
            metadata: {
              version: '1.0.0',
              permissions: {
                canView: ['human', 'ai'],
                canEdit: [this.user.id],
                canDelete: [this.user.id]
              }
            }
          });
        }
      }
      
      return cards;
    } catch (error) {
      console.error('Error getting cards:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get cards: ${error.message}`);
      }
      throw new Error('Failed to get cards: Unknown error');
    }
  }

  override handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(`/cards/${this.cardType}/`, '');

    // Handle base routes
    switch (path) {
      case 'list':
        return this.handleList();
      case 'create':
        return this.handleCreate(req);
      case 'delete':
        return this.handleDelete(req);
    }

    // Handle API endpoints
    if (path === 'api') {
      switch (req.method) {
        case 'GET':
          return this.handleApiGet(req);
        case 'POST':
          return this.handleMessageAdd(req);
        case 'DELETE':
          return this.handleMessageDelete(req);
        default:
          return Promise.resolve(new Response('Method not allowed', { status: 405 }));
      }
    }

    return Promise.resolve(new Response('Not Found', { status: 404 }));
  }

  protected override async handleList(): Promise<Response> {
    try {
      const cards = await this.getCards();
      return new Response(JSON.stringify(cards), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      console.error('Error listing cards:', error);
      return new Response(JSON.stringify({ error: 'Failed to list cards' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected override async handleCreate(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      const card = await this.createCard(data.name);
      return new Response(JSON.stringify(card), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating card:', error);
      return new Response(JSON.stringify({ error: 'Failed to create card' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected override async handleDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      await this.deleteCard(data.cardId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete card' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected override async handleApiGet(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const cardId = url.searchParams.get('cardId');
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      const card = await this.getCard(cardId);
      return new Response(JSON.stringify(card), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
      console.error('Error getting card:', error);
      return new Response(JSON.stringify({ error: 'Failed to get card' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected override async handleMessageAdd(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId || !data.text) {
        return new Response(JSON.stringify({ error: 'Card ID and text are required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      const message = await this.addMessage(data.cardId, data.text);
      return new Response(JSON.stringify(message), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
      console.error('Error adding message:', error);
      return new Response(JSON.stringify({ error: 'Failed to add message' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected override async handleMessageDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId || !data.messageId) {
        return new Response(JSON.stringify({ error: 'Card ID and message ID are required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      await this.deleteMessage(data.cardId, data.messageId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: 'Card or message not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
      console.error('Error deleting message:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete message' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
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