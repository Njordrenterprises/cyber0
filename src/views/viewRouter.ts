import { User, Plus, MessageSquare, Trash2 } from 'npm:lucide';
import { layout } from './home/home.ts';

export class ViewRouter {
  private user: UserIdentity;
  private defaultHeaders = {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-cache'
  };

  constructor({ user }: { user: UserIdentity }) {
    this.user = user;
  }

  async handleRequest(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname;
      console.log('View router handling:', path);

      // Pre-render icons for use in templates
      const icons = {
        user: User.toSvg(),
        plus: Plus.toSvg(),
        messageSquare: MessageSquare.toSvg(),
        trash: Trash2.toSvg()
      };

      // Handle view routes
      if (path.startsWith('/views/')) {
        const viewName = path.replace('/views/', '');
        console.log('Loading view:', viewName);
        
        // Handle home view
        if (viewName === 'home') {
          const content = await layout(this.user);
          return new Response(JSON.stringify({
            html: content
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
        }

        // Handle other views
        const template = await this.loadTemplate(viewName);
        const renderedTemplate = template.replace(
          /{icon:([\w]+)}/g, 
          (_, name) => icons[name as keyof typeof icons] || ''
        );

        return new Response(JSON.stringify({
          html: renderedTemplate
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      }

      // Handle widget routes
      if (path.startsWith('/widgets/')) {
        const widgetName = path.replace('/widgets/', '');
        console.log('Loading widget:', widgetName);
        const template = await this.loadTemplate(widgetName, 'widgets');
        
        // Replace icon placeholders with pre-rendered SVGs
        const renderedTemplate = template.replace(
          /{icon:([\w]+)}/g, 
          (_, name) => icons[name as keyof typeof icons] || ''
        );

        return new Response(JSON.stringify({
          html: renderedTemplate
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      }

      return new Response(JSON.stringify({
        error: 'Not Found',
        path
      }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (error) {
      console.error('View router error:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error'
      }), {
        status: error instanceof Error && error.message.includes('not found') ? 404 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
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