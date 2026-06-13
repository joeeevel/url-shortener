import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', () => {});

const URL_TTL = 3600;
const STATS_TTL = 30;

export function urlKey(shortCode: string): string {
  return `url:${shortCode}`;
}

export async function getCachedUrl(shortCode: string): Promise<{
  original: string;
  clicks: number;
  createdAt: string;
  updatedAt: string;
} | null> {
  try {
    const data = await redis.get(urlKey(shortCode));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCachedUrl(
  shortCode: string,
  data: { original: string; clicks: number; createdAt: Date; updatedAt: Date },
): Promise<void> {
  try {
    await redis.setex(
      urlKey(shortCode),
      URL_TTL,
      JSON.stringify({
        original: data.original,
        clicks: data.clicks,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      }),
    );
  } catch {
    // cache miss is acceptable
  }
}

export async function invalidateUrl(shortCode: string): Promise<void> {
  try {
    await redis.del(urlKey(shortCode));
  } catch {
    // ignore
  }
}
