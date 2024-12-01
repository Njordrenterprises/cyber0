import type { User, CardAuthor } from '../../db/client/types.ts';
import { BaseCardRouter } from './cardRouter.ts';

export class CardManager {
  private routers: Map<string, BaseCardRouter> = new Map();
  private templates: Map<string, string> = new Map();
  private readonly user: User;
  private readonly userAsAuthor: CardAuthor;

  constructor(user: User) {
    this.user = user;
    this.userAsAuthor = {
      id: user.id,
      username: user.username,
      color: user.color,
      sprite: user.sprite,
      type: user.type
    };
  }

  private async loadCardTemplate(cardType: string): Promise<string> {
    // Check cache first
    const cached = this.templates.get(cardType);
    if (cached) return cached;

    try {
      const content = await Deno.readTextFile(new URL(`./${cardType}/${cardType}.html`, import.meta.url));
      this.templates.set(cardType, content);
      return content;
    } catch (_error) {
      throw new Error(`Failed to load template for card type: ${cardType}`);
    }
  }

  private async loadCardRouter(cardType: string): Promise<BaseCardRouter | undefined> {
    try {
      console.log(`Loading router for card type: ${cardType}`);
      const module = await import(`./${cardType}/${cardType}.ts`);
      console.log('Module loaded:', Object.keys(module));
      
      // Look for RouterClass export (e.g., InfoCardRouter, TestCardRouter)
      const RouterClass = Object.values(module).find(
        (exp): exp is new (userId: string, author: CardAuthor) => BaseCardRouter => 
          typeof exp === 'function' && 
          exp.prototype instanceof BaseCardRouter
      );

      if (RouterClass) {
        console.log('Found router class:', RouterClass.name);
        const router = new RouterClass(this.user.id, this.userAsAuthor);
        this.routers.set(cardType, router);
        return router;
      } else {
        console.log('No router class found in module');
      }
    } catch (error) {
      console.error(`Failed to load card router for type ${cardType}:`, error);
    }
    return undefined;
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/cards\/([^\/]+)/);
    console.log('Request URL:', url.pathname);
    console.log('Card type match:', match);
    
    if (!match) {
      return new Response('Not Found', { status: 404 });
    }

    const cardType = match[1];
    console.log('Looking for card type:', cardType);
    let router = this.routers.get(cardType);
    console.log('Existing router:', router ? 'found' : 'not found');
    
    // Load router if not already loaded
    if (!router) {
      console.log('Attempting to load router for:', cardType);
      router = await this.loadCardRouter(cardType);
      console.log('Load result:', router ? 'success' : 'failed');
      if (!router) {
        return new Response('Card type not found', { status: 404 });
      }
    }

    // Handle template requests
    if (url.pathname.endsWith('/template')) {
      try {
        const template = await this.loadCardTemplate(cardType);
        return new Response(template, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (_error) {
        return new Response('Template not found', { status: 404 });
      }
    }

    return router.handleRequest(req);
  }
} 