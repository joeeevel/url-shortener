import { PrismaClient } from '@prisma/client';
import express from 'express';
import { getCachedUrl, setCachedUrl } from './services/cache.js';
import { healthLimiter, shortenLimiter, redirectLimiter, statsLimiter } from './services/rateLimit.js';

const prisma = new PrismaClient();
const app = express();

app.set('trust proxy', true);
app.use(express.json());

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

app.get('/health', healthLimiter, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'url-shortener',
  });
});

app.post('/shorten', shortenLimiter, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const shortCode = generateShortCode();

    const newUrl = await prisma.url.create({
      data: {
        original: url,
        shortCode,
      },
    });

    await setCachedUrl(shortCode, newUrl);

    res.json({
      success: true,
      shortUrl: `${req.protocol}://${req.get('host')}/${newUrl.shortCode}`,
      shortCode: newUrl.shortCode,
      originalUrl: newUrl.original,
      clicks: newUrl.clicks,
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:shortCode', redirectLimiter, async (req, res) => {
  try {
    const shortCode = req.params.shortCode;

    if (!shortCode) return res.status(404).json({ error: 'Short URL not found' });

    const cached = await getCachedUrl(shortCode);
    if (cached) {
      prisma.url
        .update({
          where: { shortCode },
          data: { clicks: { increment: 1 } },
        })
        .then((updated) => setCachedUrl(shortCode, updated))
        .catch(() => {});

      return res.redirect(cached.original);
    }

    const url = await prisma.url.update({
      where: { shortCode },
      data: { clicks: { increment: 1 } },
    });

    await setCachedUrl(shortCode, url);

    res.redirect(url.original);
  } catch (error) {
    res.status(404).json({ error: 'Short URL not found' });
  }
});

app.get('/stats/:shortCode', statsLimiter, async (req, res) => {
  try {
    const shortCode = req.params.shortCode;

    if (!shortCode) return res.status(404).json({ error: 'Short URL not found' });

    const cached = await getCachedUrl(shortCode);
    if (cached) {
      return res.json({
        shortCode,
        originalUrl: cached.original,
        clicks: cached.clicks,
        createdAt: cached.createdAt,
        lastAccessed: cached.updatedAt,
      });
    }

    const url = await prisma.url.findUnique({
      where: { shortCode },
    });

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    await setCachedUrl(shortCode, url);

    res.json({
      shortCode: url.shortCode,
      originalUrl: url.original,
      clicks: url.clicks,
      createdAt: url.createdAt,
      lastAccessed: url.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { app };

if (!process.env.VITEST) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Create short URLs: POST http://localhost:${PORT}/shorten`);
  });
}
