/** Bounded per-instance optimization. Quota checks must run outside it. */
export function createAsyncCache<T>(ttlMs: number, maxEntries: number, keep: (value: T) => boolean = () => true, expiresAt?: (value: T) => number) {
  const entries = new Map<string, { expires: number; promise: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    const prior = entries.get(key);
    if (prior && prior.expires > now) return prior.promise;
    for (const [id, entry] of entries) if (entry.expires <= now) entries.delete(id);
    if (entries.size >= maxEntries) entries.delete(entries.keys().next().value!);
    const discard = () => { if (entries.get(key)?.promise === promise) entries.delete(key); };
    const promise = load().then(value => {
      if (!keep(value)) discard();
      const entry = entries.get(key);
      if (entry?.promise === promise && expiresAt) entry.expires = Math.min(entry.expires, expiresAt(value));
      return value;
    }).catch(error => { discard(); throw error; });
    entries.set(key, { expires: now + ttlMs, promise });
    return promise;
  };
}
