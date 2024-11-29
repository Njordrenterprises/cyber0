/// <reference lib="deno.unstable" />

import { handleView, serveViewAsset } from './src/views/views.ts';
import { handleCardRequest } from './src/cards/cards.ts';

// Serve static files from public directory
async function serveStatic(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const filePath = decodeURIComponent(url.pathname);
  
  try {
    if (filePath === '/') {
      const content = await Deno.readFile('./index.html');
      return new Response(content, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Serve TypeScript modules
    if (filePath.endsWith('.ts')) {
      const content = await Deno.readFile('.' + filePath);
      return new Response(content, {
        headers: { 'Content-Type': 'application/typescript' },
      });
    }

    const content = await Deno.readFile('.' + filePath);
    const contentType = getContentType(filePath);
    return new Response(content, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml'
  };
  return types[ext] || 'application/octet-stream';
}

// Main request handler
function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  console.log('Request:', path);

  // Handle card requests (including KV operations)
  if (path.startsWith('/cards/')) {
    return handleCardRequest(req);
  }

  // Handle view requests
  const viewMatch = path.match(/^\/views\/([^\/]+)$/);
  if (viewMatch) {
    return handleView(viewMatch[1]);
  }

  // Handle view assets
  const viewAssetMatch = path.match(/^\/views\/(.+)$/);
  if (viewAssetMatch) {
    return serveViewAsset(viewAssetMatch[1]);
  }

  // Serve static files
  return serveStatic(req);
}

// Start the server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
Deno.serve({ port }, handler);
