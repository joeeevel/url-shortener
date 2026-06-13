import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

interface CacheEntry {
  data: {
    original: string;
    clicks: number;
    createdAt: string;
    updatedAt: string;
  };
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();
const URL_TTL_MS = 3600 * 1000;

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

function cleanupMemory(): void {
  for (const [key, entry] of memoryStore) {
    if (isExpired(entry)) memoryStore.delete(key);
  }
}

export let redis: ReturnType<typeof createClient> | null = null;

if (REDIS_URL) {
  try {
    redis = createClient({ url: REDIS_URL });
    redis.on('error', () => {});
  } catch {
    // invalid URL, skip Redis
  }
}

let connecting: Promise<unknown> | null = null;

function ensureConnected(): Promise<unknown> {
  if (!redis) return Promise.resolve();
  if (redis.isReady) return Promise.resolve();
  if (!connecting) connecting = redis.connect().finally(() => { connecting = null; });
  return connecting;
}

export function urlKey(shortCode: string): string {
  return `url:${shortCode}`;
}

export async function getCachedUrl(shortCode: string): Promise<{
  original: string;
  clicks: number;
  createdAt: string;
  updatedAt: string;
} | null> {
  const key = urlKey(shortCode);

  if (redis) {
    try {
      await ensureConnected();
      const data = await redis.get(key);
      if (data) return JSON.parse(data);
    } catch {
      // fall through to memory
    }
  }

  const entry = memoryStore.get(key);
  if (entry && !isExpired(entry)) return entry.data;
  memoryStore.delete(key);
  return null;
}

export async function setCachedUrl(
  shortCode: string,
  data: { original: string; clicks: number; createdAt: Date; updatedAt: Date },
): Promise<void> {
  const key = urlKey(shortCode);
  const serialized = JSON.stringify({
    original: data.original,
    clicks: data.clicks,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  });

  if (redis) {
    try {
      await ensureConnected();
      await redis.setEx(key, 3600, serialized);
      return;
    } catch {
      // fall through to memory
    }
  }

  memoryStore.set(key, {
    data: JSON.parse(serialized),
    expiresAt: Date.now() + URL_TTL_MS,
  });
  if (memoryStore.size % 50 === 0) cleanupMemory();
}

export async function invalidateUrl(shortCode: string): Promise<void> {
  const key = urlKey(shortCode);

  if (redis) {
    try {
      await ensureConnected();
      await redis.del(key);
    } catch {
      // ignore
    }
  }

  memoryStore.delete(key);
}
