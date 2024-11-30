import type { ErrorResponse } from "./types.ts";

export async function parseJsonSafely<T>(req: Request): Promise<{ data: T | null; error: Response | null }> {
  try {
    const data = await req.json();
    return { data: data as T, error: null };
  } catch (_error) {
    return {
      data: null,
      error: new Response(JSON.stringify({ error: 'Invalid JSON format' } satisfies ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
} 