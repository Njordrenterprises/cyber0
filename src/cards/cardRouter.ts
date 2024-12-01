import { kv } from '../../db/core/kv.ts';
import type {
  BaseCard,
  CardMessage,
  CardAuthor,
  KvCardData,
  KvCardMeta,
  CardOperations,
  KvKey
} from '../../db/client/types.ts';
import * as kvBroadcast from '../ws/kvBroadcast.ts';

export abstract class BaseCardRouter implements CardOperations {
  protected constructor(
    protected readonly cardType: string,
    protected readonly userId: string,
    protected readonly user: CardAuthor
  ) {}

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
    await Promise.all([
      kvBroadcast.broadcastDelete(['cards', this.cardType, 'meta', cardId]),
      kvBroadcast.broadcastDelete(['cards', this.cardType, 'data', cardId])
    ]);
  }

  async getCard(cardId: string): Promise<BaseCard> {
    const meta = await kv.get<KvCardMeta>(['cards', this.cardType, 'meta', cardId]);
    if (!meta?.value) throw new Error('Card not found');
    
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
    try {
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
    } catch (error) {
      console.error('Error getting cards:', error);
      throw new Error(`Failed to get cards: ${error.message}`);
    }
  }

  protected async addMessage(cardId: string, text: string): Promise<CardMessage> {
    const message: CardMessage = {
      id: crypto.randomUUID(),
      cardId,
      content: text,
      timestamp: Date.now(),
      author: this.user,
      type: 'text'
    };

    const key: KvKey = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<KvCardData>(key);
    if (!entry?.value) throw new Error('Card not found');

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
    if (!entry?.value) throw new Error('Card not found');

    const messages = entry.value.messages.filter((m: CardMessage) => m.id !== messageId);
    const now = Date.now();

    await kvBroadcast.broadcastSet(key, {
      ...entry.value,
      messages,
      lastUpdated: now
    });
  }

  // Request Handling
  abstract handleRequest(req: Request): Promise<Response>;
} 