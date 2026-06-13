import { describe, it, expect, vi, beforeEach } from 'vitest';

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('ioredis', () => {
  function Redis() {
    return redisMock;
  }
  return { Redis };
});

const { urlKey, getCachedUrl, setCachedUrl, invalidateUrl } = await import('../services/cache.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('urlKey', () => {
  it('returns the correct key format', () => {
    expect(urlKey('abc123')).toBe('url:abc123');
  });
});

describe('getCachedUrl', () => {
  it('returns parsed data when key exists', async () => {
    const data = { original: 'https://example.com', clicks: 5, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' };
    redisMock.get.mockResolvedValue(JSON.stringify(data));

    const result = await getCachedUrl('abc123');
    expect(result).toEqual(data);
    expect(redisMock.get).toHaveBeenCalledWith('url:abc123');
  });

  it('returns null when key does not exist', async () => {
    redisMock.get.mockResolvedValue(null);

    const result = await getCachedUrl('abc123');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    redisMock.get.mockRejectedValue(new Error('connection failed'));

    const result = await getCachedUrl('abc123');
    expect(result).toBeNull();
  });
});

describe('setCachedUrl', () => {
  it('stores data with TTL', async () => {
    const urlData = {
      original: 'https://example.com',
      clicks: 0,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    await setCachedUrl('abc123', urlData);

    expect(redisMock.setex).toHaveBeenCalledWith(
      'url:abc123',
      3600,
      JSON.stringify({
        original: 'https://example.com',
        clicks: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }),
    );
  });

  it('does not throw on error', async () => {
    redisMock.setex.mockRejectedValue(new Error('write failed'));

    await expect(setCachedUrl('abc123', {
      original: 'https://example.com',
      clicks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })).resolves.toBeUndefined();
  });
});

describe('invalidateUrl', () => {
  it('deletes the key', async () => {
    await invalidateUrl('abc123');
    expect(redisMock.del).toHaveBeenCalledWith('url:abc123');
  });

  it('does not throw on error', async () => {
    redisMock.del.mockRejectedValue(new Error('delete failed'));

    await expect(invalidateUrl('abc123')).resolves.toBeUndefined();
  });
});
