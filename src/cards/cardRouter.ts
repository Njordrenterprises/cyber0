import { kv } from '../../db/core/kv.ts';
import type {
  BaseCard,
  CardMessage,
  CardAuthor,
  KvCardData,
  KvCardMeta,
  CardOperations,
  KvKey,
  User
} from '../../db/client/types.ts';
import * as kvBroadcast from '../ws/kvBroadcast.ts';

export abstract class BaseCardRouter implements CardOperations {
  protected cardType: string;
  protected user: User;

  constructor(cardType: string, userId: string, author: CardAuthor) {
    this.cardType = cardType;
    this.user = {
      id: userId,
      name: author.username,
      username: author.username,
      email: '',
      type: author.type,
      color: author.color,
      sprite: author.sprite,
      created: Date.now(),
      lastSeen: Date.now(),
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true
      },
      capabilities: {
        canCreateCards: true,
        canDeleteCards: true,
        canSendMessages: true,
        canModifyUsers: false,
        allowedCardTypes: ['info', 'test']
      }
    };
  }

  protected setUser(user: User) {
    this.user = user;
  }

  async createCard(name: string): Promise<BaseCard> {
    const cardId = crypto.randomUUID();
    const now = Date.now();

    const meta: KvCardMeta = {
      id: cardId,
      type: this.cardType,
      name,
      created: now,
      lastUpdated: now,
      createdBy: this.user
    };

    const data: KvCardData = {
      messages: [],
      timestamp: now,
      lastUpdated: now,
      meta: {
        name,
        type: this.cardType,
        createdBy: this.user
      }
    };

    await Promise.all([
      kvBroadcast.broadcastSet(['cards', this.cardType, 'meta', cardId], meta),
      kvBroadcast.broadcastSet(['cards', this.cardType, 'data', cardId], data)
    ]);

    return {
      id: cardId,
      name,
      type: this.cardType,
      created: now,
      lastUpdated: now,
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
    };
  }

  async deleteCard(cardId: string): Promise<void> {
    const meta = await kv.get<KvCardMeta>(['cards', this.cardType, 'meta', cardId]);
    if (!meta?.value) throw new Error('not found');

    await Promise.all([
      kvBroadcast.broadcastDelete(['cards', this.cardType, 'meta', cardId]),
      kvBroadcast.broadcastDelete(['cards', this.cardType, 'data', cardId])
    ]);
  }

  async getCard(cardId: string): Promise<BaseCard> {
    const meta = await kv.get<KvCardMeta>(['cards', this.cardType, 'meta', cardId]);
    if (!meta?.value) throw new Error('not found');
    
    return {
      id: meta.value.id,
      name: meta.value.name,
      type: meta.value.type,
      created: meta.value.created,
      lastUpdated: meta.value.lastUpdated,
      createdBy: meta.value.createdBy,
      content: {},
      metadata: {
        version: '1.0.0',
        permissions: {
          canView: ['human', 'ai'],
          canEdit: [meta.value.createdBy.id],
          canDelete: [meta.value.createdBy.id]
        }
      }
    };
  }

  async getCards(): Promise<BaseCard[]> {
    const cards: BaseCard[] = [];
    const iterator = kv.list<KvCardMeta>({ prefix: ['cards', this.cardType, 'meta'] });
    
    for await (const entry of iterator) {
      if (entry.value) {
        cards.push({
          id: entry.value.id,
          name: entry.value.name,
          type: entry.value.type,
          created: entry.value.created,
          lastUpdated: entry.value.lastUpdated,
          createdBy: entry.value.createdBy,
          content: {},
          metadata: {
            version: '1.0.0',
            permissions: {
              canView: ['human', 'ai'],
              canEdit: [entry.value.createdBy.id],
              canDelete: [entry.value.createdBy.id]
            }
          }
        });
      }
    }
    
    return cards;
  }

  protected async addMessage(cardId: string, text: string): Promise<CardMessage> {
    const key: KvKey = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<KvCardData>(key);
    if (!entry?.value) throw new Error('not found');

    const message: CardMessage = {
      id: crypto.randomUUID(),
      cardId,
      content: text,
      timestamp: Date.now(),
      author: this.user,
      type: 'text'
    };

    const messages = [...entry.value.messages, message];
    const now = Date.now();

    await kvBroadcast.broadcastSet(key, {
      ...entry.value,
      messages,
      lastUpdated: now
    });

    return message;
  }

  protected async deleteMessage(cardId: string, messageId: string): Promise<void> {
    const key: KvKey = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<KvCardData>(key);
    if (!entry?.value) throw new Error('not found');

    const messages = entry.value.messages.filter((m: CardMessage) => m.id !== messageId);
    const now = Date.now();

    await kvBroadcast.broadcastSet(key, {
      ...entry.value,
      messages,
      lastUpdated: now
    });
  }

  // Request Handling
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

  protected async handleList(): Promise<Response> {
    const cards = await this.getCards();
    return new Response(JSON.stringify(cards), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
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
      console.error('Error creating card:', error);
      if (error instanceof Error && error.message.includes('invalid json')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to create card' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      try {
        await this.deleteCard(data.cardId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'not found') {
          return new Response(JSON.stringify({ error: 'Card not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      if (error instanceof Error && error.message.includes('invalid json')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to delete card' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleApiGet(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const cardId = url.searchParams.get('cardId');
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      try {
        const card = await this.getCard(cardId);
        return new Response(JSON.stringify(card), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'not found') {
          return new Response(JSON.stringify({ error: 'Card not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error getting card:', error);
      return new Response(JSON.stringify({ error: 'Failed to get card' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleMessagesList(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const cardId = url.searchParams.get('cardId');
    if (!cardId) {
      return new Response(JSON.stringify({ error: 'Card ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<KvCardData>(key);
      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(entry.value.messages || []), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      console.error('Error listing messages:', error);
      return new Response(JSON.stringify({ error: 'Failed to list messages' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleMessageAdd(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId || !data.text) {
        return new Response(JSON.stringify({ error: 'Card ID and text are required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      try {
        const message = await this.addMessage(data.cardId, data.text);
        return new Response(JSON.stringify(message), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'not found') {
          return new Response(JSON.stringify({ error: 'Card not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error adding message:', error);
      return new Response(JSON.stringify({ error: 'Failed to add message' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  protected async handleMessageDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.cardId || !data.messageId) {
        return new Response(JSON.stringify({ error: 'Card ID and message ID are required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }

      try {
        await this.deleteMessage(data.cardId, data.messageId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'not found') {
          return new Response(JSON.stringify({ error: 'Card or message not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete message' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }
} 