import type { Briefing, PersonaMeta } from '../types/briefing';
import hersh from '../mocks/personas/hersh.json';
import founder from '../mocks/personas/founder.json';
import student from '../mocks/personas/student.json';

const SOURCES: Record<string, Briefing> = {
  hersh: hersh as Briefing,
  founder: founder as Briefing,
  student: student as Briefing,
};

export const PERSONAS: PersonaMeta[] = [
  { id: 'hersh', label: 'Hersh (default)', description: 'Manageable founder inbox' },
  { id: 'founder', label: 'Founder firehose', description: '23 primary · 49 promos' },
  { id: 'student', label: 'Student / light', description: '2 primary · 0 tasks' },
];

const working: Record<string, Briefing> = {};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function getWorking(personaId: string): Briefing {
  if (!working[personaId]) {
    const source = SOURCES[personaId] ?? SOURCES.hersh;
    working[personaId] = clone(source);
  }
  return working[personaId];
}

function isFast(): boolean {
  if (typeof window === 'undefined') return true;
  return new URLSearchParams(window.location.search).has('fast');
}

async function delay(): Promise<void> {
  if (isFast()) return;
  const ms = 300 + Math.random() * 400;
  await new Promise((r) => setTimeout(r, ms));
}

function findItem(briefing: Briefing, itemId: string) {
  for (const kind of ['primary', 'updates', 'forums', 'promotions'] as const) {
    const section = briefing.sections[kind];
    const inMain = section.items.find((i) => i.id === itemId);
    if (inMain) return { section, item: inMain, list: 'items' as const, kind };
    if (section.filteredItems) {
      const inFiltered = section.filteredItems.find((i) => i.id === itemId);
      if (inFiltered) return { section, item: inFiltered, list: 'filteredItems' as const, kind };
    }
  }
  return null;
}

let authStatus: { connected: boolean; email?: string } = { connected: false };

export const mockApi = {
  async connectGoogle() {
    await delay();
    authStatus = { connected: true, email: 'hersh@appemble.com' };
    return { status: 'connected' as const, email: authStatus.email! };
  },

  async disconnect() {
    await delay();
    authStatus = { connected: false };
  },

  async getAuthStatus() {
    await delay();
    return { ...authStatus };
  },

  async getBriefing(opts?: { personaId?: string }): Promise<Briefing> {
    await delay();
    const personaId = opts?.personaId ?? 'hersh';
    return clone(getWorking(personaId));
  },

  async refreshBriefing(personaId: string): Promise<Briefing> {
    await delay();
    return clone(getWorking(personaId));
  },

  async markItemNoise(personaId: string, itemId: string): Promise<Briefing> {
    await delay();
    const briefing = getWorking(personaId);
    const found = findItem(briefing, itemId);
    if (!found) return clone(briefing);
    const { section, item } = found;
    item.isNoise = true;
    item.isUseful = false;
    if (found.list === 'items') {
      section.items = section.items.filter((i) => i.id !== itemId);
      section.filteredItems = [item, ...(section.filteredItems ?? [])];
      section.filteredAsNoise = (section.filteredAsNoise ?? 0) + 1;
      section.newCount = Math.max(0, (section.newCount ?? 1) - 1);
    }
    return clone(briefing);
  },

  async markItemUseful(personaId: string, itemId: string): Promise<Briefing> {
    await delay();
    const briefing = getWorking(personaId);
    const found = findItem(briefing, itemId);
    if (!found) return clone(briefing);
    const { section, item } = found;
    item.isUseful = true;
    item.isNoise = false;
    if (found.list === 'filteredItems' && section.filteredItems) {
      section.filteredItems = section.filteredItems.filter((i) => i.id !== itemId);
      section.items = [item, ...section.items];
      section.filteredAsNoise = Math.max(0, (section.filteredAsNoise ?? 1) - 1);
    } else {
      section.items = [item, ...section.items.filter((i) => i.id !== itemId)];
    }
    return clone(briefing);
  },

  async completeActionItem(personaId: string, itemId: string): Promise<Briefing> {
    await delay();
    const briefing = getWorking(personaId);
    const action = briefing.actionItems.find((a) => a.id === itemId);
    if (action) action.completed = !action.completed;
    return clone(briefing);
  },

  async snoozeItem(personaId: string, itemId: string, _until: string): Promise<Briefing> {
    await delay();
    const briefing = getWorking(personaId);
    for (const kind of ['primary', 'updates', 'forums', 'promotions'] as const) {
      briefing.sections[kind].items = briefing.sections[kind].items.filter(
        (i) => i.id !== itemId,
      );
    }
    return clone(briefing);
  },

  __resetForTests() {
    for (const key of Object.keys(working)) delete working[key];
    authStatus = { connected: false };
  },
};

export type MockApi = typeof mockApi;
