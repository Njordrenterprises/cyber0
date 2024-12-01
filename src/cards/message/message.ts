import { BaseCardRouter } from '../cardRouter.ts';
import { kv } from '../../../db/core/kv.ts';
import type { 
  CardAuthor, 
  Message,
  MessageState,
  MessageType,
  MessageMetadata,
  MessageAttachment,
  KvKey 
} from '../../../db/client/types.ts';

export class MessageCardRouter extends BaseCardRouter {
  constructor(userId: string, author: CardAuthor) {
    super('message', userId, author);
  }

  protected override async handleGet(cardId: string): Promise<Response> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<MessageState>(key);

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
      console.error('Error getting message card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleCreate(req: Request): Promise<Response> {
    try {
      const _data = await req.json();
      const cardId = crypto.randomUUID();
      const timestamp = Date.now();

      const initialState: MessageState = {
        messages: [],
        threads: [],
        metadata: {
          version: '1.0.0',
          schema: 'message-card-v1',
          messageCount: 0,
          threadCount: 0,
          lastMessageTime: timestamp,
          permissions: {
            canSend: ['*'],
            canEdit: ['*'],
            canDelete: ['*'],
            canReact: ['*']
          }
        }
      };

      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      await kv.set(key, initialState);

      return new Response(JSON.stringify({ id: cardId, ...initialState }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating message card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleCardDelete(cardId: string): Promise<Response> {
    try {
      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<MessageState>(key);

      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await kv.delete(key);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting message card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async sendMessage(cardId: string, content: string, options: {
    type?: MessageType;
    parentId?: string;
    metadata?: MessageMetadata;
    attachments?: MessageAttachment[];
  } = {}): Promise<Message> {
    const key: KvKey = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<MessageState>(key);

    if (!entry?.value) {
      throw new Error('Card not found');
    }

    const message: Message = {
      id: crypto.randomUUID(),
      content,
      author: this.user,
      timestamp: Date.now(),
      type: options.type || 'text',
      parentId: options.parentId,
      metadata: options.metadata,
      attachments: options.attachments
    };

    const state = entry.value;
    state.messages.push(message);
    state.metadata.messageCount++;
    state.metadata.lastMessageTime = message.timestamp;

    if (options.parentId) {
      const thread = state.threads.find(t => t.id === options.parentId);
      if (thread) {
        thread.messages.push(message);
        thread.lastActivity = message.timestamp;
      }
    }

    await kv.set(key, state);
    return message;
  }

  protected override async handleMessageAdd(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { cardId, content, ...options } = data;

      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!content) {
        return new Response(JSON.stringify({ error: 'Message content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const message = await this.sendMessage(cardId, content, options);
        return new Response(JSON.stringify(message), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Card not found') {
          return new Response(JSON.stringify({ error: 'Card not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error adding message:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleMessagesList(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const cardId = url.searchParams.get('cardId');
      const threadId = url.searchParams.get('threadId');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const before = parseInt(url.searchParams.get('before') || '0');
      const after = parseInt(url.searchParams.get('after') || '0');

      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<MessageState>(key);

      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let messages = threadId 
        ? entry.value.threads.find(t => t.id === threadId)?.messages || []
        : entry.value.messages;

      // Apply filters
      if (before) {
        messages = messages.filter(m => m.timestamp < before);
      }
      if (after) {
        messages = messages.filter(m => m.timestamp > after);
      }

      // Sort by timestamp and limit
      messages = messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, limit);

      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error listing messages:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleMessageDelete(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const cardId = url.searchParams.get('cardId');
      const messageId = url.searchParams.get('messageId');

      if (!cardId || !messageId) {
        return new Response(JSON.stringify({ error: 'Card ID and Message ID are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<MessageState>(key);

      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const state = entry.value;
      const messageIndex = state.messages.findIndex(m => m.id === messageId);

      if (messageIndex === -1) {
        return new Response(JSON.stringify({ error: 'Message not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user has permission to delete
      const message = state.messages[messageIndex];
      if (message.author.id !== this.user.id && 
          !state.metadata.permissions.canDelete.includes(this.user.id) &&
          !state.metadata.permissions.canDelete.includes('*')) {
        return new Response(JSON.stringify({ error: 'Permission denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Remove message
      state.messages.splice(messageIndex, 1);
      state.metadata.messageCount--;

      // Also remove from thread if it exists
      if (message.parentId) {
        const thread = state.threads.find(t => t.id === message.parentId);
        if (thread) {
          const threadMessageIndex = thread.messages.findIndex(m => m.id === messageId);
          if (threadMessageIndex !== -1) {
            thread.messages.splice(threadMessageIndex, 1);
            thread.lastActivity = thread.messages.length > 0 
              ? Math.max(...thread.messages.map(m => m.timestamp))
              : thread.lastActivity;
          }
        }
      }

      await kv.set(key, state);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected async handleMessageEdit(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { cardId, messageId, content } = data;

      if (!cardId || !messageId || !content) {
        return new Response(JSON.stringify({ error: 'Card ID, Message ID, and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const key: KvKey = ['cards', this.cardType, 'data', cardId];
      const entry = await kv.get<MessageState>(key);

      if (!entry?.value) {
        return new Response(JSON.stringify({ error: 'Card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const state = entry.value;
      const message = state.messages.find(m => m.id === messageId);

      if (!message) {
        return new Response(JSON.stringify({ error: 'Message not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user has permission to edit
      if (message.author.id !== this.user.id && 
          !state.metadata.permissions.canEdit.includes(this.user.id) &&
          !state.metadata.permissions.canEdit.includes('*')) {
        return new Response(JSON.stringify({ error: 'Permission denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update message
      message.content = content;
      message.metadata = {
        ...message.metadata,
        edited: true,
        editedAt: Date.now()
      };

      // Also update in thread if it exists
      if (message.parentId) {
        const thread = state.threads.find(t => t.id === message.parentId);
        if (thread) {
          const threadMessage = thread.messages.find(m => m.id === messageId);
          if (threadMessage) {
            threadMessage.content = content;
            threadMessage.metadata = message.metadata;
          }
        }
      }

      await kv.set(key, state);
      return new Response(JSON.stringify(message), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error editing message:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected override async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(`/cards/${this.cardType}/`, '');

    // Handle message edit endpoint
    if (path === 'api/messages/edit' && req.method === 'PUT') {
      return this.handleMessageEdit(req);
    }

    return super.handleRequest(req);
  }
}
