import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockUrl = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
}));

const mockGetCachedUrl = vi.hoisted(() => vi.fn());
const mockSetCachedUrl = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => {
  function PrismaClient() {
    return { url: mockUrl };
  }
  return { PrismaClient };
});

vi.mock('../services/cache.js', () => ({
  getCachedUrl: mockGetCachedUrl,
  setCachedUrl: mockSetCachedUrl,
  invalidateUrl: vi.fn(),
}));

const { app } = await import('../index.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('url-shortener');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('POST /shorten', () => {
  it('creates a short URL', async () => {
    const createdUrl = {
      id: 'clx1',
      original: 'https://example.com',
      shortCode: 'abc123',
      clicks: 0,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };
    mockUrl.create.mockResolvedValue(createdUrl);

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.originalUrl).toBe('https://example.com');
    expect(res.body).toHaveProperty('shortCode');
    expect(mockSetCachedUrl).toHaveBeenCalled();
  });

  it('returns 400 when URL is missing', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('URL is required');
  });

  it('returns 400 when URL format is invalid', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid URL format');
  });
});

describe('GET /:shortCode', () => {
  it('redirects when found in cache', async () => {
    const cached = { original: 'https://example.com', clicks: 0, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' };
    mockGetCachedUrl.mockResolvedValue(cached);
    mockUrl.update.mockResolvedValue(cached);

    const res = await request(app).get('/abc123');

    expect(mockGetCachedUrl).toHaveBeenCalledWith('abc123');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('redirects when found in database (cache miss)', async () => {
    mockGetCachedUrl.mockResolvedValue(null);
    const dbUrl = { original: 'https://example.com', shortCode: 'abc123', clicks: 1 };
    mockUrl.update.mockResolvedValue(dbUrl);

    const res = await request(app).get('/abc123');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
    expect(mockSetCachedUrl).toHaveBeenCalledWith('abc123', dbUrl);
  });

  it('returns 404 when not found', async () => {
    mockGetCachedUrl.mockResolvedValue(null);
    mockUrl.update.mockRejectedValue(new Error('not found'));

    const res = await request(app).get('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Short URL not found');
  });
});

describe('GET /stats/:shortCode', () => {
  it('returns stats from cache', async () => {
    const cached = { original: 'https://example.com', clicks: 3, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' };
    mockGetCachedUrl.mockResolvedValue(cached);

    const res = await request(app).get('/stats/abc123');

    expect(res.status).toBe(200);
    expect(res.body.shortCode).toBe('abc123');
    expect(res.body.originalUrl).toBe('https://example.com');
    expect(res.body.clicks).toBe(3);
  });

  it('returns stats from database (cache miss)', async () => {
    mockGetCachedUrl.mockResolvedValue(null);
    const dbUrl = { shortCode: 'abc123', original: 'https://example.com', clicks: 3, createdAt: new Date('2024-01-01T00:00:00.000Z'), updatedAt: new Date('2024-01-01T00:00:00.000Z') };
    mockUrl.findUnique.mockResolvedValue(dbUrl);

    const res = await request(app).get('/stats/abc123');

    expect(res.status).toBe(200);
    expect(res.body.shortCode).toBe('abc123');
    expect(mockSetCachedUrl).toHaveBeenCalledWith('abc123', dbUrl);
  });

  it('returns 404 when not found', async () => {
    mockGetCachedUrl.mockResolvedValue(null);
    mockUrl.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/stats/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Short URL not found');
  });
});
