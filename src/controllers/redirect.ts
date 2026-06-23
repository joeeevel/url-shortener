import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { getCachedUrl, setCachedUrl } from '../services/cache.js';
import { fireWebhook } from '../services/webhook.js';

function isExpired(expiresAt: string | Date | null | undefined): boolean {
  if (!expiresAt) return false;
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}

export async function redirect(req: Request, res: Response, next: NextFunction): Promise<void> {
  const shortCode = req.params.shortCode;
  if (!shortCode) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  const cached = await getCachedUrl(shortCode);
  if (cached) {
    if (isExpired(cached.expiresAt)) {
      res.status(410).json({ error: 'This link has expired' });
      return;
    }

    prisma.url
      .update({
        where: { shortCode },
        data: { clicks: { increment: 1 } },
      })
      .then((updated) => setCachedUrl(shortCode, updated))
      .catch(() => {});

    prisma.click.create({
      data: {
        url: { connect: { shortCode } },
        referrer: req.get('referer') || null,
        userAgent: req.get('user-agent') || null,
        ip: req.ip || null,
      },
    }).then(() => {
      if (cached.webhook) {
        fireWebhook(cached.webhook, {
          event: 'click', shortCode, originalUrl: cached.original,
          timestamp: new Date().toISOString(),
          referrer: req.get('referer') || null,
          userAgent: req.get('user-agent') || null,
          ip: req.ip || null,
        });
      }
    }).catch(() => {});

    res.redirect(cached.original);
    return;
  }

  try {
    const url = await prisma.url.findUnique({ where: { shortCode } });

    if (!url || !url.active) {
      if (req.accepts('html')) {
        next();
        return;
      }
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    if (isExpired(url.expiresAt)) {
      res.status(410).json({ error: 'This link has expired' });
      return;
    }

    const updated = await prisma.url.update({
      where: { id: url.id },
      data: { clicks: { increment: 1 } },
    });

    await setCachedUrl(shortCode, updated);

    prisma.click.create({
      data: {
        urlId: url.id,
        referrer: req.get('referer') || null,
        userAgent: req.get('user-agent') || null,
        ip: req.ip || null,
      },
    }).then(() => {
      if (url.webhook) {
        fireWebhook(url.webhook, {
          event: 'click', shortCode, originalUrl: url.original,
          timestamp: new Date().toISOString(),
          referrer: req.get('referer') || null,
          userAgent: req.get('user-agent') || null,
          ip: req.ip || null,
        });
      }
    }).catch(() => {});

    res.redirect(url.original);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2025') {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    throw error;
  }
}
