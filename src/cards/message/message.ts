import { BaseCardRouter } from '../cardRouter.ts';
import { 
  BaseCard, 
  CardAuthor, 
  CardMessage, 
  MessageCard,
  MessageOperations 
} from '../../../db/client/types.ts';
import { kv } from '../../../db/core/kv.ts';

export class MessageRouter extends BaseCardRouter implements MessageOperations {
  constructor(user: CardAuthor) {
    super('message', user);
  }

  async createCard(data: { name: string; content?: unknown }): Promise<BaseCard> {
    const card = await super.createCard({
      name: data.name,
      content: {
        messages: [],
        lastMessageAt: undefined
      }
    });

    return card;
  }

  async addMessage(cardId: string, text: string): Promise<Response> {
    const key = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<MessageCard>(key);

    if (!entry?.value) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!entry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const message: CardMessage = {
      id: crypto.randomUUID(),
      cardId,
      content: text,
      timestamp: Date.now(),
      author: this.user,
      type: 'text'
    };

    const updatedCard = {
      ...entry.value,
      lastUpdated: Date.now(),
      content: {
        messages: [...entry.value.content.messages, message],
        lastMessageAt: message.timestamp
      }
    };

    await kv.atomic()
      .check(entry)
      .set(key, updatedCard)
      .commit();

    return new Response(JSON.stringify(message), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async deleteMessage(cardId: string, messageId: string): Promise<Response> {
    const key = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<MessageCard>(key);

    if (!entry?.value) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!entry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const message = entry.value.content.messages.find(m => m.id === messageId);
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only message author or card owner can delete messages
    if (message.author.id !== this.user.id && 
        entry.value.createdBy.id !== this.user.id) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedCard = {
      ...entry.value,
      lastUpdated: Date.now(),
      content: {
        messages: entry.value.content.messages.filter(m => m.id !== messageId),
        lastMessageAt: entry.value.content.lastMessageAt
      }
    };

    await kv.atomic()
      .check(entry)
      .set(key, updatedCard)
      .commit();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getMessages(cardId: string): Promise<Response> {
    const key = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<MessageCard>(key);

    if (!entry?.value) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!entry.value.metadata.permissions.canView.includes(this.user.type)) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(entry.value.content.messages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async editMessage(cardId: string, messageId: string, text: string): Promise<Response> {
    const key = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<MessageCard>(key);

    if (!entry?.value) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const message = entry.value.content.messages.find(m => m.id === messageId);
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only message author can edit messages
    if (message.author.id !== this.user.id) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedMessage = {
      ...message,
      content: text,
      metadata: {
        ...message.metadata,
        edited: true,
        editedAt: Date.now()
      }
    };

    const updatedCard = {
      ...entry.value,
      lastUpdated: Date.now(),
      content: {
        messages: entry.value.content.messages.map(m => 
          m.id === messageId ? updatedMessage : m
        ),
        lastMessageAt: entry.value.content.lastMessageAt
      }
    };

    await kv.atomic()
      .check(entry)
      .set(key, updatedCard)
      .commit();

    return new Response(JSON.stringify(updatedMessage), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  override async handleRequest(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(`/cards/${this.cardType}/`, '');

      // Handle message-specific operations
      if (path.startsWith('messages/')) {
        const operation = path.replace('messages/', '');
        const data = await req.json();

        switch (operation) {
          case 'add':
            return this.addMessage(data.cardId, data.text);
          case 'delete':
            return this.deleteMessage(data.cardId, data.messageId);
          case 'edit':
            return this.editMessage(data.cardId, data.messageId, data.text);
          case 'list':
            return this.getMessages(data.cardId);
          default:
            return new Response(JSON.stringify({ error: 'Invalid operation' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
        }
      }

      // Handle nested card operations and core card operations
      return super.handleRequest(req);
    } catch (error) {
      console.error('Error handling message request:', error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
