// Handle view requests
export async function handleView(viewId: string): Promise<Response> {
  try {
    const template = await Deno.readTextFile(`./src/views/${viewId}/${viewId}.html`);
    return new Response(template, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error(`Error loading view ${viewId}:`, error);
    return new Response('View not found', { status: 404 });
  }
}

// Handle static file serving for views
export async function serveViewAsset(filePath: string): Promise<Response> {
  try {
    const content = await Deno.readFile(`./src/views/${filePath}`);
    const contentType = getContentType(filePath);
    return new Response(content, {
      headers: { 'Content-Type': contentType }
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
    'ts': 'application/typescript',
    'js': 'text/javascript'
  };
  return types[ext] || 'application/octet-stream';
}
