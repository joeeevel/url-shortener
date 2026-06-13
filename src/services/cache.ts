import { Redis } from 'ioredis';

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

export let redis: Redis | null = null;

if (REDIS_URL) {
  try {
    const url = new URL(REDIS_URL);
    redis = new Redis({
      host: url.hostname,
      port: Number(url.port) || 6379,
      username: url.username || undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      maxRetriesPerRequest: 1,
      retryStrategy() {
        return null;
      },
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      ...(url.protocol === 'rediss:' ? { tls: { rejectUnauthorized: false } } : {}),
    });
    redis.on('error', () => {});
  } catch {
    // REDIS_URL is invalid, skip Redis
  }
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
  const serialized = {
    original: data.original,
    clicks: data.clicks,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };

  if (redis) {
    try {
      await redis.setex(key, 3600, JSON.stringify(serialized));
      return;
    } catch {
      // fall through to memory
    }
  }

  memoryStore.set(key, {
    data: serialized,
    expiresAt: Date.now() + URL_TTL_MS,
  });
  if (memoryStore.size % 50 === 0) cleanupMemory();
}

export async function invalidateUrl(shortCode: string): Promise<void> {
  const key = urlKey(shortCode);

  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }

  memoryStore.delete(key);
}
