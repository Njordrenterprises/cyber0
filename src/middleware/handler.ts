export interface MiddlewareContext {
  user: {
    id: string;
    username: string;
  };
  cookieResponse?: Response;
}

export class MiddlewareHandler {
  private user: UserIdentity;
  private cookieResponse: Response | null;

  constructor({ user, cookieResponse }: { user: UserIdentity; cookieResponse: Response | null }) {
    this.user = user;
    this.cookieResponse = cookieResponse;
  }

  async handleRequest(req: Request, next: (req: Request) => Promise<Response>): Promise<Response> {
    try {
      // Check for user headers
      const userId = req.headers.get('X-User-Id');
      const userData = req.headers.get('X-User-Data');

      if (userId && userData) {
        this.user = JSON.parse(userData);
      }

      // Call the next handler
      const response = await next(req);

      // Add cookie response headers if needed
      if (this.cookieResponse) {
        const cookieHeader = this.cookieResponse.headers.get('Set-Cookie');
        if (cookieHeader) {
          response.headers.set('Set-Cookie', cookieHeader);
        }
      }

      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
  }
} 