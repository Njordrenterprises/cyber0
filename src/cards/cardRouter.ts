export abstract class BaseCardRouter {
  constructor(
    protected readonly cardType: string,
    protected readonly userId: string = 'test-user'
  ) {}

  abstract handleRequest(req: Request): Promise<Response>;
  abstract getCards(): Promise<unknown[]>;
}

export class CardRouter {
  private routers: Map<string, BaseCardRouter> = new Map();
  private templates: Map<string, string> = new Map();
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
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
      const module = await import(`./${cardType}/${cardType}.ts`);
      // Look for RouterClass export (e.g., InfoCardRouter, TestCardRouter)
      const RouterClass = Object.values(module).find(
        (exp): exp is new (userId: string) => BaseCardRouter => 
          typeof exp === 'function' && 
          exp.prototype instanceof BaseCardRouter
      );

      if (RouterClass) {
        const router = new RouterClass(this.userId);
        this.routers.set(cardType, router);
        return router;
      }
    } catch (_error) {
      console.error(`Failed to load card router for type ${cardType}`);
    }
    return undefined;
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/cards\/([^\/]+)/);
    if (!match) {
      return new Response('Not Found', { status: 404 });
    }

    const cardType = match[1];
    let router = this.routers.get(cardType);
    
    // Load router if not already loaded
    if (!router) {
      router = await this.loadCardRouter(cardType);
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