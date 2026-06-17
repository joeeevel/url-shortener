import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function exportAnalyticsCsv(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string } | undefined;
  const shortCode = req.params.shortCode;

  if (!shortCode) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  const url = user
    ? await prisma.url.findFirst({ where: { shortCode, userId: user.id } })
    : await prisma.url.findUnique({ where: { shortCode } });

  if (!url) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  const clicks = await prisma.click.findMany({
    where: { urlId: url.id },
    orderBy: { timestamp: 'desc' },
  });

  const header = 'timestamp,referrer,userAgent,ip,country\n';
  const rows = clicks
    .map((c) =>
      [
        c.timestamp.toISOString(),
        `"${c.referrer || ''}"`,
        `"${(c.userAgent || '').replace(/"/g, '""')}"`,
        `"${c.ip || ''}"`,
        `"${c.country || ''}"`,
      ].join(','),
    )
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${shortCode}-analytics.csv"`);
  res.send(header + (rows || ''));
}
