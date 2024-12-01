import type { KvKey } from "../../db/core/kv.ts";
import { kv } from "../../db/core/kv.ts";

const bc = new BroadcastChannel('cyber-updates');

export type WatchCallback<T> = (value: T | null) => void | Promise<void>;

export async function broadcastSet(key: KvKey, value: unknown): Promise<void> {
  await kv.set(key, value);
  bc.postMessage({ type: 'kv:set', key, value });
}

export async function broadcastDelete(key: KvKey): Promise<void> {
  await kv.delete(key);
  bc.postMessage({ type: 'kv:delete', key });
}

export function watch<T>(key: KvKey, callback: WatchCallback<T>): () => void {
  const handler = async (event: MessageEvent) => {
    const { type, key: updatedKey, value } = event.data;
    if (!type.startsWith('kv:')) return;
    
    if (key.toString() === updatedKey.toString()) {
      if (type === 'kv:delete') {
        await callback(null);
      } else if (type === 'kv:set') {
        await callback(value as T);
      }
    }
  };

  bc.addEventListener('message', handler);
  return () => bc.removeEventListener('message', handler);
}

export async function watchImmediate<T>(key: KvKey, callback: WatchCallback<T>): Promise<() => void> {
  // Get initial value
  const initial = await kv.get<T>(key);
  await callback(initial?.value);

  // Set up watch
  return watch(key, callback);
}

// Clean up function for closing connections
export function close(): void {
  bc.close();
} 