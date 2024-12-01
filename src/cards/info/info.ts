import { BaseCardRouter } from '../cardRouter.ts';
import { kv } from '../../../db/core/kv.ts';
import type { KvKey, BaseCard, CardAuthor } from '../../../db/client/types.ts';

interface InfoCardState extends BaseCard {
  content: {
    description?: string;
    tags?: string[];
    links?: string[];
    [key: string]: unknown;
  };
}

export class InfoCardRouter extends BaseCardRouter {
  constructor(userId: string, author: CardAuthor) {
    super('info', userId, author);
  }

  protected override async handleGet(cardId: string): Promise<Response> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<InfoCardState>(key);

      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(entry.value), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error getting info card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleCreate(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      if (!data.name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const timestamp = Date.now();
      const card = await this.createCard(data.name);

      const state: InfoCardState = {
        ...card,
        content: {
          description: data.description || '',
          tags: data.tags || [],
          links: data.links || []
        }
      };

      const key: KvKey = ['cards', this.cardType, 'data', card.id];
      await kv.set(key, state);

      return new Response(JSON.stringify(state), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating info card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleUpdate(cardId: string, req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<InfoCardState>(key);

      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updatedState: InfoCardState = {
        ...entry.value,
        lastUpdated: Date.now(),
        content: {
          ...entry.value.content,
          ...data.content
        }
      };

      await kv.set(key, updatedState);

      return new Response(JSON.stringify(updatedState), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error updating info card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleCardDelete(cardId: string): Promise<Response> {
    try {
      await this.deleteCard(cardId);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'not found') {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error deleting info card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
} 