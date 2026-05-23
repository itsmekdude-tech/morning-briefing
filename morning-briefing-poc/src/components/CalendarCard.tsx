import { CalendarBlank } from '@phosphor-icons/react';
import { Card } from './ui/Card';
import type { CalendarEvent } from '../types/briefing';

interface CalendarCardProps {
  events: CalendarEvent[];
  timezone: string;
}

function durationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
}

export function CalendarCard({ events, timezone }: CalendarCardProps) {
  const totalMinutes = events.reduce((acc, e) => acc + durationMinutes(e.start, e.end), 0);
  const now = Date.now();
  const nextIdx = events.findIndex((e) => new Date(e.start).getTime() >= now);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] tracking-tracked uppercase font-semibold text-ink-900 flex items-center gap-2">
          <CalendarBlank size={16} weight="regular" />
          Today
        </h2>
        <span className="text-xs text-ink-500">{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-2xl mb-2">✿</div>
          <p className="text-ink-700 text-sm">Nothing on the calendar.</p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-300/50">
          {events.map((e, i) => {
            const mins = durationMinutes(e.start, e.end);
            const isNext = i === nextIdx;
            return (
              <li key={e.id} className="flex items-start gap-3 py-3 row-hover -mx-3 px-3 rounded-md">
                <span
                  className={`mt-1.5 inline-block h-2 w-2 rounded-full ${
                    isNext ? 'bg-ink-900' : 'bg-ink-300 border border-ink-300'
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-ink-900 text-sm font-medium truncate">{e.title}</div>
                  <div className="text-ink-500 text-xs mt-0.5">
                    {fmtTime(e.start, timezone)}
                    {e.location ? ` · ${e.location}` : ''}
                  </div>
                </div>
                <span className="text-ink-500 text-xs tabular-nums shrink-0">
                  {fmtDuration(mins)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > 0 && (
        <p className="text-xs text-ink-500 mt-4 pt-4 border-t border-ink-300/50">
          {events.length} events · {fmtDuration(totalMinutes)} booked
        </p>
      )}
    </Card>
  );
}
