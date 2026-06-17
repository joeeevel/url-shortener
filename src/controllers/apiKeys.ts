import type { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string };
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, lastUsed: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ keys });
}

export async function createApiKey(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string };
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.length < 2) {
    res.status(400).json({ error: 'Name must be at least 2 characters' });
    return;
  }

  const rawKey = `foxy_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await prisma.apiKey.create({
    data: { key: keyHash, name, userId: user.id },
  });

  res.json({
    success: true,
    key: rawKey,
    name,
    warning: 'Store this key securely. It will not be shown again.',
  });
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string };
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: 'ID is required' });
    return;
  }

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: user.id },
  });

  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  await prisma.apiKey.delete({ where: { id } });
  res.json({ success: true });
}
