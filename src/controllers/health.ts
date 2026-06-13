import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../services/cache.js';

export async function health(req: Request, res: Response): Promise<void> {
  const checks: Record<string, string> = {};

  checks.server = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  if (redis) {
    try {
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      checks.redis = 'ok';
    } catch {
      checks.redis = 'unavailable';
    }
  } else {
    checks.redis = 'unavailable';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'url-shortener',
    checks,
  });
}
