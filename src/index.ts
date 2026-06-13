import { PrismaClient } from '@prisma/client';
import express from 'express';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Generate random short code (6 characters)
function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'url-shortener'
  });
});

// Create short URL
app.post('/shorten', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const shortCode = generateShortCode();
    
    const newUrl = await prisma.url.create({
      data: {
        original: url,
        shortCode: shortCode,
      },
    });
    
    res.json({
      success: true,
      shortUrl: `http://localhost:3000/${newUrl.shortCode}`,
      shortCode: newUrl.shortCode,
      originalUrl: newUrl.original,
      clicks: newUrl.clicks
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect to original URL
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const url = await prisma.url.update({
      where: { shortCode },
      data: { clicks: { increment: 1 } },
    });
    
    res.redirect(url.original);
  } catch (error) {
    res.status(404).json({ error: 'Short URL not found' });
  }
});

// Get stats for a short URL
app.get('/stats/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const url = await prisma.url.findUnique({
      where: { shortCode },
    });
    
    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    res.json({
      shortCode: url.shortCode,
      originalUrl: url.original,
      clicks: url.clicks,
      createdAt: url.createdAt,
      lastAccessed: url.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Create short URLs: POST http://localhost:${PORT}/shorten`);
});