import type { Briefing, MailItem } from '../types/briefing';

function fmtTime(iso: string, timezone?: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

function fmtDate(iso: string, timezone?: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
}

function mailLine(m: MailItem): string {
  return `- **${m.from.name}** — ${m.subject}`;
}

export function exportTemplate(briefing: Briefing): string {
  const tz = briefing.user.timezone;
  const lines: string[] = [];

  lines.push(`# Morning Briefing — ${briefing.user.displayName}`);
  lines.push('');
  lines.push(`_${fmtDate(briefing.generatedAt, tz)} · generated ${fmtTime(briefing.generatedAt, tz)}_`);
  lines.push('');

  lines.push('## Today');
  if (briefing.calendar.length === 0) {
    lines.push('_No events._');
  } else {
    for (const e of briefing.calendar) {
      const loc = e.location ? ` · ${e.location}` : '';
      lines.push(`- ${fmtTime(e.start, tz)} — **${e.title}**${loc}`);
    }
  }
  lines.push('');

  lines.push('## Action items');
  const open = briefing.actionItems.filter((a) => !a.completed);
  const done = briefing.actionItems.filter((a) => a.completed);
  if (open.length === 0 && done.length === 0) {
    lines.push('_Nothing on your plate._');
  } else {
    for (const a of open) {
      const due = a.due ? ` _(due ${a.due})_` : '';
      lines.push(`- [ ] ${a.ask}${due}`);
    }
    for (const a of done) {
      lines.push(`- [x] ${a.ask}`);
    }
  }
  lines.push('');

  const sectionTitles: Record<string, string> = {
    primary: 'Primary',
    updates: 'Updates',
    forums: 'Forums',
    promotions: 'Promotions',
  };

  for (const kind of ['primary', 'updates', 'forums', 'promotions'] as const) {
    const section = briefing.sections[kind];
    const filtered = section.filteredAsNoise ?? 0;
    lines.push(
      `## ${sectionTitles[kind]} — ${section.items.length} kept${
        filtered ? ` · ${filtered} filtered` : ''
      }`,
    );
    if (section.items.length === 0) {
      lines.push('_Nothing here._');
    } else {
      for (const m of section.items) lines.push(mailLine(m));
    }
    lines.push('');
  }

  lines.push('---');
  lines.push("_That's everything for today._");

  return lines.join('\n');
}

export function downloadMarkdown(briefing: Briefing): void {
  const md = exportTemplate(briefing);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `morning-briefing-${briefing.user.displayName.toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
