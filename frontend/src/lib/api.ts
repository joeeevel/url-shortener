export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiKey {
  id: string;
  name: string;
  lastUsed: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthStatus {
  authenticated: boolean;
  providers: { google: boolean; github: boolean };
  user?: User;
}

export interface ShortUrl {
  success: boolean;
  shortUrl: string;
  shortCode: string;
  originalUrl: string;
  clicks: number;
  expiresAt: string | null;
}

export interface UrlItem {
  id: string;
  shortCode: string;
  originalUrl: string;
  clicks: number;
  totalClicks: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastAccessed: string;
}

export interface UrlList {
  urls: UrlItem[];
  total: number;
  page: number;
  pages: number;
}

export interface ClickEvent {
  timestamp: string;
  referrer: string | null;
  userAgent: string | null;
  country: string | null;
}

export interface Analytics {
  shortCode: string;
  totalClicks: number;
  page: number;
  pages: number;
  clicks: ClickEvent[];
  topReferrers: { referrer: string; count: number }[];
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  apiKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('foxy_api_key');
}

export function setApiKey(key: string): void {
  localStorage.setItem('foxy_api_key', key);
}

export function clearApiKey(): void {
  localStorage.removeItem('foxy_api_key');
}

export const api = {
  auth: {
    me: () => request<AuthStatus>('/auth/me'),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },

  urls: {
    list: (params?: { page?: number; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.search) qs.set('search', params.search);
      const q = qs.toString();
      return request<UrlList>(`/api/urls${q ? `?${q}` : ''}`);
    },
    create: (data: {
      url: string;
      slug?: string;
      webhook?: string;
      ttl?: string;
    }) => request<ShortUrl>('/shorten', { method: 'POST', body: JSON.stringify(data) }),
    update: (shortCode: string, data: { original?: string; active?: boolean }) =>
      request<{ success: boolean }>(`/api/urls/${shortCode}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (shortCode: string) =>
      request<{ success: boolean }>(`/api/urls/${shortCode}`, { method: 'DELETE' }),
    bulk: (data: { urls: { url: string; slug?: string }[]; webhook?: string; ttl?: string }) =>
      request<{ results: { url: string; shortCode: string | null; error?: string }[]; succeeded: number; failed: number }>(
        '/api/bulk',
        { method: 'POST', body: JSON.stringify(data) },
      ),
  },

  stats: {
    get: (shortCode: string) =>
      request<{
        shortCode: string;
        originalUrl: string;
        clicks: number;
        createdAt: string;
        lastAccessed: string;
      }>(`/stats/${shortCode}`),
    analytics: (shortCode: string, page?: number) => {
      const qs = page ? `?page=${page}` : '';
      return request<Analytics>(`/api/analytics/${shortCode}${qs}`);
    },
  },

  keys: {
    list: (apiKey?: string) =>
      request<{ keys: ApiKey[] }>('/api/keys', undefined, apiKey),
    create: (name: string, apiKey?: string) =>
      request<{ success: boolean; key: string; name: string; warning: string }>(
        '/api/keys',
        { method: 'POST', body: JSON.stringify({ name }) },
        apiKey,
      ),
    delete: (id: string, apiKey?: string) =>
      request<{ success: boolean }>(`/api/keys/${id}`, { method: 'DELETE' }, apiKey),
  },
};
