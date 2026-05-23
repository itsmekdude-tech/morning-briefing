import { ArrowsClockwise, GearSix } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { realApi } from '../services/realApi';
import { PersonaSwitcher } from './PersonaSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface BriefingHeaderProps {
  displayName: string;
  generatedAt: string;
  timezone: string;
  onRefresh: () => void;
  refreshing?: boolean;
}

function greetingFor(date: Date, timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).format(date),
  );
  if (hour >= 4 && hour < 11) return 'Good morning';
  if (hour >= 11 && hour < 17) return 'Good afternoon';
  return 'Evening briefing';
}

function fmtDate(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

function fmtTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

export function BriefingHeader({
  displayName,
  generatedAt,
  timezone,
  onRefresh,
  refreshing,
}: BriefingHeaderProps) {
  const greeting = greetingFor(new Date(), timezone);
  const [mode, setMode] = useState<'mock' | 'gmail' | null>(null);

  useEffect(() => {
    realApi.getMode().then((m) => setMode(m.inbox_source)).catch(() => setMode('mock'));
  }, []);

  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl text-ink-900 leading-tight tracking-tight">
          {greeting}, {displayName.split(' ')[0]}.
        </h1>
        <p className="mt-2 font-display italic text-ink-500 text-lg">
          {fmtDate(generatedAt, timezone)} · generated {fmtTime(generatedAt, timezone)}
          {mode === 'gmail' && <span className="not-italic text-ink-900 text-xs ml-3 px-2 py-0.5 border border-ink-300 rounded">LIVE GMAIL</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {mode !== 'gmail' && <PersonaSwitcher />}
        <ThemeToggle />
        <button
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh briefing"
          title="Refresh"
          className="h-9 w-9 rounded-lg border border-ink-300 text-ink-700 hover:text-ink-900 hover:bg-surface-1 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <ArrowsClockwise size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className="h-9 w-9 rounded-lg border border-ink-300 text-ink-700 hover:text-ink-900 hover:bg-surface-1 flex items-center justify-center transition-colors"
        >
          <GearSix size={16} />
        </Link>
      </div>
    </header>
  );
}
