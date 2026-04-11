import "server-only";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export async function memoCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function cacheHas(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return false;
  }
  return true;
}

export function cacheClear(): void {
  store.clear();
}
