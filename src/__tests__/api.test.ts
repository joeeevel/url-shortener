import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockClick = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({}),
  findMany: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
  groupBy: vi.fn().mockResolvedValue([]),
}));

const mockUrl = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
}));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

const mockApiKey = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  url: mockUrl,
  user: mockUser,
  click: mockClick,
  apiKey: mockApiKey,
  $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  $disconnect: vi.fn(),
}));

const mockGetCachedUrl = vi.hoisted(() => vi.fn());
const mockSetCachedUrl = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => {
  function PrismaClient() {
    return mockPrisma;
  }
  return { PrismaClient };
});

vi.mock('../services/cache.js', () => ({
  getCachedUrl: mockGetCachedUrl,
  setCachedUrl: mockSetCachedUrl,
  invalidateUrl: vi.fn(),
  redis: null,
}));

const { app } = await import('../app.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('foxy');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('includes rate limit headers', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
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
    expect(res.body.error).toBe('Required');
  });

  it('returns 400 when URL format is invalid', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid URL format');
  });

  it('returns 400 for non-string URL', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 123 });

    expect(res.status).toBe(400);
  });

  it('returns rate limit headers', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' });

    expect(res.headers['ratelimit-limit']).toBe('10');
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});

describe('Auth endpoints', () => {
  it('returns unauthenticated without session', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.providers).toBeDefined();
  });

  it('returns 501 when OAuth not configured', async () => {
    const res = await request(app).get('/auth/google');

    expect(res.status).toBe(501);
    expect(res.body.error).toContain('not configured');
  });
});

describe('Request validation', () => {
  it('rejects oversized request body', async () => {
    const largePayload = { url: 'https://example.com/' + 'x'.repeat(20000) };

    const res = await request(app)
      .post('/shorten')
      .send(largePayload);

    expect(res.status).toBe(413);
  });
});

describe('GET /:shortCode', () => {
  it('redirects when found in cache', async () => {
    const cached = { original: 'https://example.com', clicks: 0, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', webhook: null, expiresAt: null };
    mockGetCachedUrl.mockResolvedValue(cached);
    mockUrl.update.mockResolvedValue(cached);

    const res = await request(app).get('/abc123');

    expect(mockGetCachedUrl).toHaveBeenCalledWith('abc123');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('redirects when found in database (cache miss)', async () => {
    mockGetCachedUrl.mockResolvedValue(null);
    const dbUrl = { id: 'url1', original: 'https://example.com', shortCode: 'abc123', clicks: 1, active: true, webhook: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() };
    mockUrl.findUnique.mockResolvedValue(dbUrl);
    mockUrl.update.mockResolvedValue(dbUrl);

    const res = await request(app).get('/abc123');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('returns 404 when not found', async () => {
    mockGetCachedUrl.mockResolvedValue(null);
    mockUrl.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Short URL not found');
  });
});

describe('GET /stats/:shortCode', () => {
  it('returns stats from cache', async () => {
    const cached = { original: 'https://example.com', clicks: 3, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', webhook: null, expiresAt: null };
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
