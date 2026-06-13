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
    checks.redis = redis.status === 'ready' ? 'ok' : 'connecting';
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
