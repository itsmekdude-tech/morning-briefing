import type { Briefing } from '../types/briefing';

const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000').replace(/\/$/, '');

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function url(path: string, personaId?: string): string {
  const query = personaId ? `?personaId=${encodeURIComponent(personaId)}` : '';
  return `${API_BASE}${path}${query}`;
}

export const realApi = {
  async getAuthStatus(): Promise<{ connected: boolean; email?: string }> {
    return fetchJson(url('/api/auth/status'));
  },

  async connectGoogle(): Promise<{ status: 'connected'; email: string }> {
    return fetchJson(url('/api/auth/connect'), { method: 'POST' });
  },

  async disconnect(): Promise<void> {
    await fetchJson(url('/api/auth/disconnect'), { method: 'POST' });
  },

  async getBriefing(opts?: { personaId?: string }): Promise<Briefing> {
    return fetchJson<Briefing>(url('/api/briefing', opts?.personaId));
  },

  async refreshBriefing(personaId: string): Promise<Briefing> {
    return fetchJson<Briefing>(url('/api/briefing/refresh', personaId), { method: 'POST' });
  },

  async markItemNoise(personaId: string, itemId: string): Promise<Briefing> {
    return fetchJson<Briefing>(url(`/api/items/${itemId}/noise`, personaId), { method: 'POST' });
  },

  async markItemUseful(personaId: string, itemId: string): Promise<Briefing> {
    return fetchJson<Briefing>(url(`/api/items/${itemId}/useful`, personaId), { method: 'POST' });
  },

  async completeActionItem(personaId: string, itemId: string): Promise<Briefing> {
    return fetchJson<Briefing>(url(`/api/actions/${itemId}/complete`, personaId), {
      method: 'POST',
    });
  },

  async snoozeItem(personaId: string, itemId: string, until: string): Promise<Briefing> {
    return fetchJson<Briefing>(url(`/api/items/${itemId}/snooze`, personaId), {
      method: 'POST',
      body: JSON.stringify({ until }),
    });
  },
};

export type RealApi = typeof realApi;
