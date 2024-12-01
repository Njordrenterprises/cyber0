import { layout } from './home/home.ts';
import type { User } from '../services/user-service.ts';

export class ViewRouter {
  private user: User;
  private defaultHeaders = {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-cache'
  };

  constructor({ user }: { user: User }) {
    this.user = user;
  }

  async handleRequest(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname;
      console.log('View router handling:', path);

      // Check if this is an AI API request
      const isAiRequest = req.headers.has('X-User-Data');
      
      if (isAiRequest) {
        return this.handleAiRequest(req);
      }

      // Handle HTMX view routes
      if (path.startsWith('/views/')) {
        const viewName = path.replace('/views/', '');
        console.log('Loading view:', viewName);
        
        // Handle home view
        if (viewName === 'home') {
          const content = await layout(this.user);
          return new Response(content, {
            headers: this.defaultHeaders
          });
        }

        // Handle other views
        const template = await this.loadTemplate(viewName);
        return new Response(template, {
          headers: this.defaultHeaders
        });
      }

      // Handle HTMX widget routes
      if (path.startsWith('/widgets/')) {
        const widgetName = path.replace('/widgets/', '');
        console.log('Loading widget:', widgetName);
        const template = await this.loadTemplate(widgetName, 'widgets');
        return new Response(template, {
          headers: this.defaultHeaders
        });
      }

      return new Response('Not Found', { 
        status: 404,
        headers: this.defaultHeaders
      });
    } catch (error) {
      console.error('View router error:', error);
      return new Response(
        error instanceof Error ? error.message : 'Internal Server Error',
        {
          status: error instanceof Error && error.message.includes('not found') ? 404 : 500,
          headers: this.defaultHeaders
        }
      );
    }
  }

  private async handleAiRequest(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname;

      // Validate user data
      const userData = req.headers.get('X-User-Data');
      if (!userData) {
        return new Response(JSON.stringify({ error: 'Missing user data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const user = JSON.parse(userData) as User;
      if (!user.id || !user.username || !user.sessionId) {
        return new Response(JSON.stringify({ error: 'Invalid user data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Handle view routes
      if (path.startsWith('/views/')) {
        const viewName = path.replace('/views/', '');
        try {
          const template = await this.loadTemplate(viewName);
          return new Response(template, {
            headers: { 
              'Content-Type': 'text/html',
              'Set-Cookie': user.cookie || ''
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'View not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle widget routes
      if (path.startsWith('/widgets/')) {
        const widgetName = path.replace('/widgets/', '');
        try {
          const template = await this.loadTemplate(widgetName, 'widgets');
          return new Response(template, {
            headers: { 
              'Content-Type': 'text/html',
              'Set-Cookie': user.cookie || ''
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Widget not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('AI request error:', error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal Server Error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async loadTemplate(name: string, type: 'views' | 'widgets' = 'views'): Promise<string> {
    try {
      const path = `src/${type}/${name}/${name}.html`;
      console.log('Loading template:', path);
      const template = await Deno.readTextFile(path);
      return template;
    } catch (error) {
      console.error(`Error loading template ${name}:`, error);
      throw new Error(`Template ${name} not found`);
    }
  }
} 