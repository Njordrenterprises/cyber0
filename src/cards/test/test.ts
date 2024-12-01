import { BaseCardRouter } from '../cardRouter.ts';
import type { CardMessage, CardAuthor } from '../../../db/client/types.ts';
import { kv } from '../../../db/core/kv.ts';
import * as kvBroadcast from '../../ws/kvBroadcast.ts';

export interface TestCardState {
  id: string;
  name: string;
  messages: CardMessage[];
  created: number;
  lastUpdated: number;
}

export interface CardData {
  messages: CardMessage[];
  timestamp: number;
  lastUpdated: number;
}

export class TestCardRouter extends BaseCardRouter {
  constructor(userId: string, author: CardAuthor) {
    super('test', userId, author);
  }

  async getCards(): Promise<TestCardState[]> {
    try {
      const cards: TestCardState[] = [];
      const iterator = kv.list<CardData>({ prefix: ['cards', 'test', 'data'] });
      
      for await (const entry of iterator) {
        const [, , , id] = entry.key;
        if (typeof id === 'string') {
          cards.push({
            id,
            name: id,
            messages: entry.value.messages || [],
            created: entry.value.timestamp,
            lastUpdated: entry.value.lastUpdated
          });
        }
      }
      
      return cards;
    } catch (error) {
      console.error('Error getting cards:', error);
      throw new Error(`Failed to get cards: ${error.message}`);
    }
  }

  handleRequest(req: Request): Promise<Response> {
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

  private async handleList(): Promise<Response> {
    try {
      const cards = await this.getCards();
      return new Response(JSON.stringify(cards), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleCreate(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const card = await this.createCard(data.name);
      return new Response(JSON.stringify(card), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.deleteCard(data.cardId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleApiGet(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const cardId = url.searchParams.get('cardId');
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const card = await this.getCard(cardId);
      return new Response(JSON.stringify(card), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleMessageAdd(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId || !data.text) {
        return new Response(JSON.stringify({ error: 'Card ID and text are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const message = await this.addMessage(data.cardId, data.text);
      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleMessageDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId || !data.messageId) {
        return new Response(JSON.stringify({ error: 'Card ID and message ID are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const key: KvKey = ['cards', this.cardType, 'data', data.cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const messages = entry.value.messages.filter(m => m.id !== data.messageId);
      await kvBroadcast.broadcastSet(key, {
        ...entry.value,
        messages,
        lastUpdated: Date.now()
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
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