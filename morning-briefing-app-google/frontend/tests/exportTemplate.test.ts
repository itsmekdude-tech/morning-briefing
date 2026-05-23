import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadMarkdown, exportTemplate } from '../src/mocks/exportTemplate';
import { mockApi } from '../src/services/mockApi';

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { search: '?fast=1' },
    writable: true,
  });
  mockApi.__resetForTests();
});

describe('exportTemplate', () => {
  it('contains all section headers and a date', async () => {
    const briefing = await mockApi.getBriefing({ personaId: 'hersh' });
    const md = exportTemplate(briefing);
    expect(md).toMatch(/# Morning Briefing — Hersh/);
    expect(md).toMatch(/## Today/);
    expect(md).toMatch(/## Action items/);
    expect(md).toMatch(/## Primary/);
    expect(md).toMatch(/## Updates/);
    expect(md).toMatch(/## Forums/);
    expect(md).toMatch(/## Promotions/);
    expect(md).toMatch(/That's everything for today/);
  });

  it('includes action items and calendar events', async () => {
    const briefing = await mockApi.getBriefing({ personaId: 'hersh' });
    const md = exportTemplate(briefing);
    for (const action of briefing.actionItems) {
      expect(md).toContain(action.ask);
    }
    for (const event of briefing.calendar) {
      expect(md).toContain(event.title);
    }
  });

  it('handles the student persona with empty action items', async () => {
    const briefing = await mockApi.getBriefing({ personaId: 'student' });
    const md = exportTemplate(briefing);
    expect(md).toMatch(/## Action items[\s\S]*Nothing on your plate/);
  });

  it('shows filtered count in section headers when present', async () => {
    const briefing = await mockApi.getBriefing({ personaId: 'hersh' });
    const md = exportTemplate(briefing);
    expect(md).toMatch(/Promotions — 2 kept · 47 filtered/);
  });
});

describe('downloadMarkdown', () => {
  it('triggers an anchor click with a markdown blob URL', async () => {
    const briefing = await mockApi.getBriefing({ personaId: 'hersh' });
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadMarkdown(briefing);

    expect(createSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');

    createSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
