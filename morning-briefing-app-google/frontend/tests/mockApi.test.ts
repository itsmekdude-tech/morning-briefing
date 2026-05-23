import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi, PERSONAS } from '../src/services/mockApi';

const setFast = () => {
  Object.defineProperty(window, 'location', {
    value: { search: '?fast=1' },
    writable: true,
  });
};

beforeEach(() => {
  setFast();
  mockApi.__resetForTests();
});

describe('mockApi', () => {
  it('exposes three personas', () => {
    expect(PERSONAS).toHaveLength(3);
    expect(PERSONAS.map((p) => p.id)).toEqual(['hersh', 'founder', 'student']);
  });

  it('getBriefing returns a Briefing with the expected shape', async () => {
    const b = await mockApi.getBriefing();
    expect(b.user.displayName).toBe('Hersh');
    expect(b.sections.primary.items.length).toBeGreaterThan(0);
    expect(b.sections.updates).toBeDefined();
    expect(b.actionItems.length).toBeGreaterThan(0);
  });

  it('switches persona based on opts.personaId', async () => {
    const founder = await mockApi.getBriefing({ personaId: 'founder' });
    expect(founder.user.displayName).toBe('Alex');
    const student = await mockApi.getBriefing({ personaId: 'student' });
    expect(student.user.displayName).toBe('Maya');
    expect(student.actionItems).toHaveLength(0);
  });

  it('markItemNoise removes the item from primary and adds to filteredItems', async () => {
    const initial = await mockApi.getBriefing({ personaId: 'hersh' });
    const targetId = initial.sections.primary.items[0].id;
    const beforeNoise = initial.sections.primary.filteredAsNoise ?? 0;
    const beforeKept = initial.sections.primary.items.length;

    const updated = await mockApi.markItemNoise('hersh', targetId);

    expect(updated.sections.primary.items.find((i) => i.id === targetId)).toBeUndefined();
    expect(updated.sections.primary.filteredItems?.find((i) => i.id === targetId)).toBeDefined();
    expect(updated.sections.primary.filteredAsNoise).toBe(beforeNoise + 1);
    expect(updated.sections.primary.items.length).toBe(beforeKept - 1);
  });

  it('markItemUseful pins to top of items', async () => {
    const initial = await mockApi.getBriefing({ personaId: 'hersh' });
    const targetId = initial.sections.primary.items[2].id;

    const updated = await mockApi.markItemUseful('hersh', targetId);

    expect(updated.sections.primary.items[0].id).toBe(targetId);
    expect(updated.sections.primary.items[0].isUseful).toBe(true);
  });

  it('markItemUseful on a filtered item moves it back into items', async () => {
    const initial = await mockApi.getBriefing({ personaId: 'hersh' });
    const filteredId = initial.sections.updates.filteredItems![0].id;

    const updated = await mockApi.markItemUseful('hersh', filteredId);

    expect(updated.sections.updates.items[0].id).toBe(filteredId);
    expect(updated.sections.updates.filteredItems?.find((i) => i.id === filteredId)).toBeUndefined();
  });

  it('completeActionItem toggles completion', async () => {
    const initial = await mockApi.getBriefing({ personaId: 'hersh' });
    const openAction = initial.actionItems.find((a) => !a.completed)!;

    const updated = await mockApi.completeActionItem('hersh', openAction.id);
    expect(updated.actionItems.find((a) => a.id === openAction.id)?.completed).toBe(true);
  });

  it('snoozeItem removes the item from its section', async () => {
    const initial = await mockApi.getBriefing({ personaId: 'hersh' });
    const targetId = initial.sections.primary.items[1].id;

    const updated = await mockApi.snoozeItem('hersh', targetId, '2026-05-24T07:00:00-04:00');
    expect(updated.sections.primary.items.find((i) => i.id === targetId)).toBeUndefined();
  });

  it('connectGoogle + getAuthStatus + disconnect round trip', async () => {
    expect((await mockApi.getAuthStatus()).connected).toBe(false);
    const res = await mockApi.connectGoogle();
    expect(res.status).toBe('connected');
    expect((await mockApi.getAuthStatus()).connected).toBe(true);
    await mockApi.disconnect();
    expect((await mockApi.getAuthStatus()).connected).toBe(false);
  });

  it('?fast=1 bypasses fake latency', async () => {
    const t0 = performance.now();
    await mockApi.getBriefing({ personaId: 'student' });
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(50);
  });
});
