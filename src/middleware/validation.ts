// Validation middleware for API endpoints

import type { CreateCardRequest, MessageRequest, ErrorResponse } from "../types.ts";

// Validate content type is application/json for POST requests
export function validateContentType(req: Request): Response | null {
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type')?.toLowerCase() || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Invalid Content-Type. Expected application/json' } satisfies ErrorResponse), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  return null;
}

// Validate card creation input
export function validateCardInput(data: unknown): Response | null {
  if (!data || typeof data !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid input: Expected object' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cardData = data as CreateCardRequest;
  if (!cardData.name || typeof cardData.name !== 'string' || cardData.name.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid input: name is required and must be a non-empty string' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check for unexpected properties
  const allowedProps = ['name'];
  const extraProps = Object.keys(data as object).filter(key => !allowedProps.includes(key));
  if (extraProps.length > 0) {
    return new Response(JSON.stringify({ error: `Invalid input: Unexpected properties: ${extraProps.join(', ')}` } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
}

// Validate message input
export function validateMessageInput(data: unknown): Response | null {
  if (!data || typeof data !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid input: Expected object' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const messageData = data as MessageRequest;
  if (!messageData.cardId || typeof messageData.cardId !== 'string' || messageData.cardId.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid input: cardId is required and must be a non-empty string' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!messageData.text || typeof messageData.text !== 'string' || messageData.text.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid input: text is required and must be a non-empty string' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check for unexpected properties
  const allowedProps = ['cardId', 'text'];
  const extraProps = Object.keys(data as object).filter(key => !allowedProps.includes(key));
  if (extraProps.length > 0) {
    return new Response(JSON.stringify({ error: `Invalid input: Unexpected properties: ${extraProps.join(', ')}` } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
}

// Validate KV key to prevent path traversal
export function validateKvKey(key: string): Response | null {
  // Check for path traversal attempts
  if (key.includes('..') || key.includes('/') || key.includes('\\')) {
    return new Response(JSON.stringify({ error: 'Invalid key: Path traversal not allowed' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Only allow alphanumeric characters, commas, and hyphens
  if (!/^[a-zA-Z0-9,\-]+$/.test(key)) {
    return new Response(JSON.stringify({ error: 'Invalid key: Only alphanumeric characters, commas, and hyphens allowed' } satisfies ErrorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
}

// Validate card exists
export async function validateCardExists(userId: string, cardId: string, type: string): Promise<Response | null> {
  try {
    const key = ['cards', type, userId, 'list'];
    const kv = await Deno.openKv();
    const result = await kv.get(key);
    const cards = result.value as Array<{ id: string }> || [];
    
    if (!cards.some(card => card.id === cardId)) {
      return new Response(JSON.stringify({ error: 'Card not found' } satisfies ErrorResponse), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return null;
  } catch (error) {
    console.error('Error validating card exists:', error);
    return new Response(JSON.stringify({ error: 'Error validating card' } satisfies ErrorResponse), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 