import { broadcast } from "../ws/broadcast.ts";
import { validateContentType, validateCardInput, validateMessageInput, validateCardExists } from "../middleware/validation.ts";
import type { CreateCardRequest, MessageRequest, ErrorResponse } from "../types.ts";
import { parseJsonSafely } from "../utils.ts";
import { createCard, deleteCard, getCards, addMessage, deleteMessage } from "./cards.ts";
import { getUserById } from "../services/user-service.ts";

export interface CardRouter {
  handleRequest(req: Request): Promise<Response>;
}

export class BaseCardRouter implements CardRouter {
  constructor(
    protected readonly cardType: string,
    protected readonly userId: string = 'test-user'
  ) {}

  handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(`/cards/${this.cardType}/`, '');

    // Validate content type for POST requests
    if (req.method === 'POST') {
      const contentTypeError = validateContentType(req);
      if (contentTypeError) return Promise.resolve(contentTypeError);
    }

    switch (path) {
      case 'list':
        return this.handleList(req);
      case 'create':
        return this.handleCreate(req);
      case 'delete':
        return this.handleDelete(req);
      case 'message/add':
        return this.handleMessageAdd(req);
      case 'message/delete':
        return this.handleMessageDelete(req);
      default:
        return Promise.resolve(new Response('Not Found', { status: 404 }));
    }
  }

  protected async handleList(_req: Request): Promise<Response> {
    const cards = await getCards(this.userId, this.cardType);
    return new Response(JSON.stringify(cards), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  protected async handleCreate(req: Request): Promise<Response> {
    const { data, error } = await parseJsonSafely<CreateCardRequest>(req);
    if (error) return error;
    if (!data) return new Response(JSON.stringify({ error: 'Missing request data' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

    const inputError = validateCardInput(data);
    if (inputError) return inputError;

    // Get user info
    const user = await getUserById(this.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' } satisfies ErrorResponse), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const card = await createCard(this.userId, user.username, data.name, this.cardType);
      return new Response(JSON.stringify(card), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating card:', error);
      return new Response(JSON.stringify({ error: 'Error creating card' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected async handleDelete(req: Request): Promise<Response> {
    try {
      const { cardId } = await req.json();
      await deleteCard(this.userId, cardId, this.cardType);
      const cards = await getCards(this.userId, this.cardType);
      broadcast({
        type: 'update',
        key: `cards,${this.cardType},global,list`,
        value: cards
      });
      return new Response('OK');
    } catch (error) {
      console.error('Error deleting card:', error);
      return new Response('Error deleting card', { status: 500 });
    }
  }

  protected async handleMessageAdd(req: Request): Promise<Response> {
    const { data, error } = await parseJsonSafely<MessageRequest>(req);
    if (error) return error;
    if (!data) return new Response(JSON.stringify({ error: 'Missing request data' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

    const inputError = validateMessageInput(data);
    if (inputError) return inputError;

    const cardError = await validateCardExists(this.userId, data.cardId, this.cardType);
    if (cardError) return cardError;

    // Get user info
    const user = await getUserById(this.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' } satisfies ErrorResponse), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const message = await addMessage(this.userId, user.username, this.cardType, data.cardId, data.text);
      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error adding message:', error);
      return new Response(JSON.stringify({ error: 'Error adding message' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  protected async handleMessageDelete(req: Request): Promise<Response> {
    try {
      const { cardId, messageId } = await req.json();
      await deleteMessage(this.userId, this.cardType, cardId, messageId);
      return new Response('OK');
    } catch (error) {
      console.error('Error deleting message:', error);
      return new Response('Error deleting message', { status: 500 });
    }
  }
} 