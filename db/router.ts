import { validateKvKey } from "../src/middleware/validation.ts";
import type { KvSetRequest, ErrorResponse } from "../src/types.ts";
import * as kv from "./core/kv.ts";

export interface DbContext {
  user: {
    id: string;
    username: string;
  };
}

export class DbRouter {
  constructor(private context: DbContext) {}

  private async handleGet(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' } satisfies ErrorResponse), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const keyError = validateKvKey(key);
    if (keyError) return keyError;

    try {
      const value = await kv.get(key.split(','));
      return new Response(JSON.stringify(value), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling KV get:', error);
      return new Response(JSON.stringify({ error: 'Error handling KV get' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleSet(req: Request): Promise<Response> {
    try {
      const data = await req.json() as KvSetRequest;
      const keyError = validateKvKey(data.key);
      if (keyError) return keyError;

      await kv.set(data.key.split(','), data.value);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling KV set:', error);
      return new Response(JSON.stringify({ error: 'Error handling KV set' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleDelete(req: Request): Promise<Response> {
    try {
      const data = await req.json() as KvSetRequest;
      const keyError = validateKvKey(data.key);
      if (keyError) return keyError;

      await kv.del(data.key.split(','));
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling KV delete:', error);
      return new Response(JSON.stringify({ error: 'Error handling KV delete' } satisfies ErrorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace('/db/', '');
    
    switch (path) {
      case 'get':
        return this.handleGet(req);
      case 'set':
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        return this.handleSet(req);
      case 'delete':
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        return this.handleDelete(req);
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
} 