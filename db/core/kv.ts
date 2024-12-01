// Types
export type KvKeyPart = string | number | bigint | boolean | Uint8Array;
export type KvKey = KvKeyPart[];

// Single KV instance
export const kv = await Deno.openKv();

// Key utilities
export function parseKey(keyStr: string): KvKey {
  return keyStr.split(',').map(part => {
    const num = Number(part);
    return isNaN(num) ? part : num;
  });
}

// Generic KV operations
export async function getValue<T>(key: KvKey): Promise<T | null> {
  const result = await kv.get(key);
  return result.value as T | null;
}

export async function setValue(key: KvKey, value: unknown): Promise<void> {
  await kv.set(key, value);
}

export async function deleteValue(key: KvKey): Promise<void> {
  await kv.delete(key);
}

export function atomic(): Deno.AtomicOperation {
  return kv.atomic();
}

export function list<T>(
  selector: Deno.KvListSelector,
  options?: Deno.KvListOptions
): Deno.KvListIterator<T> {
  return kv.list<T>(selector, options);
} 