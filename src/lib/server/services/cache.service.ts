/**
 * Fast-path application cache.
 *
 * Only validated results are stored. Lookups happen on the normalized cache key
 * so wording, casing and punctuation differences collapse to one entry.
 *
 * Eviction is LRU: on every hit the entry is moved to the end of the Map;
 * when capacity is reached the first (oldest-accessed) entry is evicted.
 * The store is swappable (in-memory today, Redis/DB later) behind this module.
 */
import { cacheKey } from "../utils/normalize";
import type { TroubleshootResult } from "../types";

type Entry = { value: TroubleshootResult; storedAt: number; hits: number };

const TTL_MS = 1000 * 60 * 60 * 24; // 24h
const MAX_ENTRIES = 5000;
const PURGE_INTERVAL = 100; // sweep stale entries every N misses

const store = new Map<string, Entry>();

const stats = { hits: 0, misses: 0 };
let missCounter = 0;

/** Remove all expired entries. O(n) but called infrequently. */
function purgeStale(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.storedAt > TTL_MS) store.delete(key);
  }
}

export function cacheLookup(complaint: string): TroubleshootResult | null {
  const key = cacheKey(complaint);
  const entry = store.get(key);
  if (!entry) {
    stats.misses += 1;
    missCounter += 1;
    // Lazy stale purge on every Nth miss
    if (missCounter >= PURGE_INTERVAL) {
      missCounter = 0;
      purgeStale();
    }
    return null;
  }
  if (Date.now() - entry.storedAt > TTL_MS) {
    store.delete(key);
    stats.misses += 1;
    return null;
  }
  entry.hits += 1;
  stats.hits += 1;

  // LRU: move to end by re-inserting
  store.delete(key);
  store.set(key, entry);

  return entry.value;
}

export function cacheSave(complaint: string, value: TroubleshootResult): void {
  // Evict LRU entry (first in Map) when at capacity
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(cacheKey(complaint), { value, storedAt: Date.now(), hits: 0 });
}

export function cacheStats() {
  const total = stats.hits + stats.misses;
  return {
    entries: store.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total === 0 ? 0 : Number((stats.hits / total).toFixed(3)),
  };
}

export function cacheClear(): void {
  store.clear();
}
