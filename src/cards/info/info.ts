import { BaseCardRouter } from '../cardRouter.ts';
import type { CardMessage, CardAuthor, KvKey, BaseCard } from '../../../db/client/types.ts';
import { kv } from '../../../db/core/kv.ts';
import * as _kvBroadcast from '../../ws/kvBroadcast.ts';

export interface InfoCardState extends BaseCard {
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
  constructor(userId: string, author: CardAuthor) {
    super('info', userId, author);
  }

  override async getCards(): Promise<InfoCardState[]> {
    try {
      const cards: InfoCardState[] = [];
      const iterator = kv.list<CardData>({ prefix: ['cards', 'info', 'data'] });
      
      for await (const entry of iterator) {
        const [, , , id] = entry.key;
        if (typeof id === 'string') {
          cards.push({
            id,
            type: this.cardType,
            name: id,
            messages: entry.value.messages || [],
            created: entry.value.timestamp,
            lastUpdated: entry.value.lastUpdated,
            createdBy: this.author,
            content: entry.value.messages?.[0]?.text || '',
            metadata: {
              messageCount: entry.value.messages?.length || 0,
              lastMessageTime: entry.value.lastUpdated
            }
          });
        }
      }
      
      return cards;
    } catch (error) {
      console.error('Error getting cards:', error);
      throw new Error(`Failed to get cards: ${error instanceof Error ? error.message : String(error)}`);
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
    }

    // Handle direct card operations
    const cardId = path;
    if (cardId && !cardId.includes('/')) {
      switch (req.method) {
        case 'GET':
          return this.handleGet(cardId);
        case 'PUT':
          return this.handleUpdate(cardId, req);
        case 'DELETE':
          return this.handleCardDelete(cardId);
      }
    }

    // Handle API endpoints
    if (path.startsWith('api')) {
      const subPath = path.replace('api/', '');
      
      if (subPath === 'messages' && req.method === 'GET') {
        return this.handleMessagesList(req);
      }

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

  protected async handleGet(cardId: string): Promise<Response> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }

      const card = {
        id: cardId,
        type: this.cardType,
        name: cardId,
        messages: entry.value.messages || [],
        created: entry.value.timestamp,
        lastUpdated: entry.value.lastUpdated,
        createdBy: this.author,
        content: entry.value.messages?.[0]?.text || '',
        metadata: {
          messageCount: entry.value.messages?.length || 0,
          lastMessageTime: entry.value.lastUpdated
        }
      };

      return new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      console.error('Error getting card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleUpdate(cardId: string, req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }

      const updatedData: CardData = {
        ...entry.value,
        messages: entry.value.messages || [],
        lastUpdated: Date.now()
      };

      if (data.content) {
        const message: CardMessage = {
          id: crypto.randomUUID(),
          text: data.content,
          author: this.author,
          timestamp: Date.now()
        };
        updatedData.messages = [...updatedData.messages, message];
      }

      await kv.set(key, updatedData);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('invalid json')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }
      console.error('Error updating card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleCardDelete(cardId: string): Promise<Response> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }

      await kv.delete(key);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleCreate(req: Request): Promise<Response> {
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
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('invalid json')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }
      console.error('Error creating card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  override async createCard(name: string): Promise<InfoCardState> {
    try {
      const cardId = name;
      const timestamp = Date.now();
      const cardData: CardData = {
        messages: [],
        timestamp,
        lastUpdated: timestamp
      };

      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      await kv.set(key, cardData);

      return {
        id: cardId,
        type: this.cardType,
        name: cardId,
        messages: [],
        created: timestamp,
        lastUpdated: timestamp,
        createdBy: this.author,
        content: '',
        metadata: {
          messageCount: 0,
          lastMessageTime: timestamp
        }
      };
    } catch (error) {
      console.error('Error creating card:', error);
      throw new Error(`Failed to create card: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  override async deleteCard(cardId: string): Promise<void> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      await kv.delete(key);
    } catch (error) {
      console.error('Error deleting card:', error);
      throw new Error(`Failed to delete card: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  override async getCard(cardId: string): Promise<InfoCardState> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        throw new Error('not found');
      }

      return {
        id: cardId,
        type: this.cardType,
        name: cardId,
        messages: entry.value.messages || [],
        created: entry.value.timestamp,
        lastUpdated: entry.value.lastUpdated,
        createdBy: this.author,
        content: entry.value.messages?.[0]?.text || '',
        metadata: {
          messageCount: entry.value.messages?.length || 0,
          lastMessageTime: entry.value.lastUpdated
        }
      };
    } catch (error) {
      console.error('Error getting card:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  override async addMessage(cardId: string, text: string): Promise<void> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        throw new Error('not found');
      }

      const message: CardMessage = {
        id: crypto.randomUUID(),
        text,
        author: this.author,
        timestamp: Date.now()
      };

      const updatedData: CardData = {
        ...entry.value,
        messages: [...entry.value.messages, message],
        lastUpdated: message.timestamp
      };

      await kv.set(key, updatedData);
    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error(`Failed to add message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  override async deleteMessage(cardId: string, messageId: string): Promise<void> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        throw new Error('not found');
      }

      const updatedData: CardData = {
        ...entry.value,
        messages: entry.value.messages.filter(m => m.id !== messageId),
        lastUpdated: Date.now()
      };

      await kv.set(key, updatedData);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleMessagesList(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const cardId = url.searchParams.get('cardId');
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<CardData>(key);
      if (!entry?.value) {
        throw new Error('not found');
      }

      return new Response(JSON.stringify(entry.value.messages), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message === 'not found' ? 404 : 500;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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
        return await response.json();
      },

      async addMessage(cardId, text) {
        const response = await fetch('/cards/info/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, text })
        });
        if (!response.ok) {
          throw new Error(\`Failed to add message: \${response.status}\`);
        }
        return await response.json();
      },

      async deleteMessage(cardId, messageId) {
        const response = await fetch('/cards/info/api', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, messageId })
        });
        if (!response.ok) {
          throw new Error(\`Failed to delete message: \${response.status}\`);
        }
        return await response.json();
      }
    };
  `;
} 