import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function listUrls(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string } | undefined;
  if (!user) {
    res.json({ urls: [], total: 0, page: 1, pages: 0 });
    return;
  }
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const search = (req.query.search as string) || '';
  const limit = 50;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: user.id };
  if (search) {
    where.original = { contains: search, mode: 'insensitive' };
  }

  const [urls, total] = await Promise.all([
    prisma.url.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { _count: { select: { clicksLog: true } } },
    }),
    prisma.url.count({ where }),
  ]);

  res.json({
    urls: urls.map((u) => ({
      id: u.id,
      shortCode: u.shortCode,
      originalUrl: u.original,
      clicks: u.clicks,
      totalClicks: u._count.clicksLog,
      active: u.active,
      createdAt: u.createdAt,
      lastAccessed: u.updatedAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function updateUrl(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string } | undefined;
  const { shortCode } = req.params;
  const { original, active } = req.body;

  if (!shortCode) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  const whereUrl: Record<string, unknown> = { shortCode };
  if (user) whereUrl.userId = user.id;

  const url = await prisma.url.findFirst({ where: whereUrl });
  if (!url) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  const data: Record<string, unknown> = {};
  if (original && typeof original === 'string') {
    try { new URL(original); } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }
    data.original = original;
  }
  if (active !== undefined) data.active = !!active;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  const updated = await prisma.url.update({ where: { id: url.id }, data });
  res.json({
    success: true,
    shortCode: updated.shortCode,
    originalUrl: updated.original,
    active: updated.active,
  });
}

export async function deleteUrl(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string } | undefined;
  const { shortCode } = req.params;

  if (!shortCode) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  const whereDel: Record<string, unknown> = { shortCode };
  if (user) whereDel.userId = user.id;

  const url = await prisma.url.findFirst({ where: whereDel });
  if (!url) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  await prisma.url.delete({ where: { id: url.id } });
  res.json({ success: true });
}
