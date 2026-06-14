import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { setCachedUrl } from '../services/cache.js';
import { logger } from '../lib/logger.js';
import { validateTargetUrl } from '../lib/validateUrl.js';

const shortenSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

export async function shorten(req: Request, res: Response): Promise<void> {
  const parsed = shortenSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request';
    res.status(400).json({ error: message });
    return;
  }

  const validation = validateTargetUrl(parsed.data.url);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const shortCode = generateShortCode();

  const newUrl = await prisma.url.create({
    data: {
      original: parsed.data.url,
      shortCode,
    },
  });

  await setCachedUrl(shortCode, newUrl);

  logger.info({ shortCode, original: parsed.data.url }, 'Short URL created');

  res.json({
    success: true,
    shortUrl: `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}/${newUrl.shortCode}`,
    shortCode: newUrl.shortCode,
    originalUrl: newUrl.original,
    clicks: newUrl.clicks,
  });
}
