import { BaseCardRouter } from '../cardRouter.ts';
import { kv } from '../../../db/core/kv.ts';
import type { KvKey, BaseCard, CardAuthor, CardRelationship } from '../../../db/client/types.ts';

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

      const card = await this.createCard(data.name);

      const state: InfoCardState = {
        ...card,
        content: {
          description: data.description || '',
          tags: data.tags || [],
          links: data.links || []
        },
        metadata: {
          ...card.metadata,
          nestedCards: []
        }
      };

      const key = this.getCardKey(card.id);
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

  protected override async handleAttachCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { parentId, childId, relationship } = data;

      if (!parentId || !childId || !relationship) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.attachCard(parentId, childId, relationship as CardRelationship);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Parent or child card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error attaching card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleDetachCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { parentId, childId } = data;

      if (!parentId || !childId) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.detachCard(parentId, childId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Parent or child card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error detaching card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleMoveCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { cardId, fromParentId, toParentId } = data;

      if (!cardId || !fromParentId || !toParentId) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.moveCard(cardId, fromParentId, toParentId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error moving card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleReorderCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { parentId, cardId, newPosition } = data;

      if (!parentId || !cardId || typeof newPosition !== 'number') {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.reorderCard(parentId, cardId, newPosition);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error reordering card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleGetNestedCards(cardId: string): Promise<Response> {
    try {
      const card = await this.getCard(cardId);
      const nestedCards = card.metadata.nestedCards || [];

      return new Response(JSON.stringify(nestedCards), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error getting nested cards:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
} 