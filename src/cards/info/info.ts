import { BaseCardRouter } from '../cardRouter.ts';
import type { CardMessage } from '../../../db/client/types.ts';
import { kv } from '../../../db/core/kv.ts';
import * as kvBroadcast from '../../ws/kvBroadcast.ts';

export interface InfoCardState {
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

export class InfoCardRouter extends BaseCardRouter {
  constructor(userId: string) {
    super('info', userId);
  }

  async getCards(): Promise<InfoCardState[]> {
    try {
      const cards: InfoCardState[] = [];
      const iterator = kv.list<CardData>({ prefix: ['cards', 'info', 'data'] });
      
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
    const cards = await this.getCards();
    return new Response(JSON.stringify(cards), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleCreate(req: Request): Promise<Response> {
    const { name } = await req.json();
    const cardId = crypto.randomUUID();
    const key = ['cards', 'info', 'data', cardId];
    const now = Date.now();

    const card: CardData = {
      messages: [],
      timestamp: now,
      lastUpdated: now
    };

    await kvBroadcast.broadcastSet(key, card);
    
    return new Response(JSON.stringify({ 
      id: cardId,
      name,
      messages: [],
      created: now,
      lastUpdated: now
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleDelete(req: Request): Promise<Response> {
    const { cardId } = await req.json();
    const key = ['cards', 'info', 'data', cardId];
    await kvBroadcast.broadcastDelete(key);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleApiGet(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const cardId = url.searchParams.get('cardId');
    
    if (cardId) {
      const key = ['cards', 'info', 'data', cardId];
      const entry = await kv.get<CardData>(key);
      return new Response(JSON.stringify(entry || { messages: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return this.handleList();
  }

  private async handleMessageAdd(req: Request): Promise<Response> {
    const { cardId, text } = await req.json();
    const message: CardMessage = {
      id: crypto.randomUUID(),
      text,
      timestamp: Date.now()
    };

    const key = ['cards', 'info', 'data', cardId];
    const entry = await kv.get<CardData>(key);
    const messages = entry?.messages || [];
    messages.push(message);

    await kvBroadcast.broadcastSet(key, { 
      messages, 
      timestamp: Date.now(),
      lastUpdated: Date.now()
    });

    return new Response(JSON.stringify(message), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleMessageDelete(req: Request): Promise<Response> {
    const { cardId, messageId } = await req.json();
    const key = ['cards', 'info', 'data', cardId];
    const entry = await kv.get<CardData>(key);
    if (!entry) {
      return new Response('Card not found', { status: 404 });
    }

    const messages = entry.messages.filter((m: CardMessage) => m.id !== messageId);
    await kvBroadcast.broadcastSet(key, { 
      messages, 
      timestamp: Date.now(),
      lastUpdated: Date.now()
    });
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
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