import { mockApi } from './mockApi';
import { realApi } from './realApi';
import type { Briefing } from '../types/briefing';

const USE_REAL = (import.meta.env.VITE_USE_REAL_API ?? 'true') !== 'false';

export interface BriefingApi {
  getAuthStatus(): Promise<{ connected: boolean; email?: string }>;
  connectGoogle(): Promise<{ status: 'connected'; email: string }>;
  disconnect(): Promise<void>;
  getBriefing(opts?: { personaId?: string }): Promise<Briefing>;
  refreshBriefing(personaId: string): Promise<Briefing>;
  markItemNoise(personaId: string, itemId: string): Promise<Briefing>;
  markItemUseful(personaId: string, itemId: string): Promise<Briefing>;
  completeActionItem(personaId: string, itemId: string): Promise<Briefing>;
  snoozeItem(personaId: string, itemId: string, until: string): Promise<Briefing>;
}

export const api: BriefingApi = USE_REAL ? realApi : mockApi;

export { mockApi, realApi };
