import { ChatsCircle, Newspaper, Ticket, Tray } from '@phosphor-icons/react';
import { useState } from 'react';
import { Card } from './ui/Card';
import { Pill } from './ui/Pill';
import type { InboxSection, MailItem, SectionKind } from '../types/briefing';

const meta: Record<SectionKind, { title: string; Icon: typeof Tray }> = {
  primary: { title: 'Primary', Icon: Tray },
  updates: { title: 'Updates', Icon: Newspaper },
  forums: { title: 'Forums', Icon: ChatsCircle },
  promotions: { title: 'Promotions', Icon: Ticket },
};

interface InboxDigestCardProps {
  kind: SectionKind;
  section: InboxSection;
  timezone: string;
  onOpenItem: (id: string) => void;
  onMarkUseful?: (id: string) => void;
}

function fmtReceived(iso: string, timezone: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.toLocaleDateString('en-US', { timeZone: timezone }) ===
    today.toLocaleDateString('en-US', { timeZone: timezone });

  if (sameDay) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });
  }
  return `yesterday ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    timeZone: timezone,
  })}`;
}

function PrimaryRow({
  item,
  timezone,
  onClick,
}: {
  item: MailItem;
  timezone: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left flex items-start gap-3 py-3 px-3 -mx-3 rounded-md row-hover focus:outline-none focus-visible:bg-surface-1"
      >
        <span
          className={`mt-2 inline-block h-2 w-2 rounded-full shrink-0 ${
            item.read ? 'bg-ink-300 border border-ink-300' : 'bg-ink-900'
          }`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-900 text-sm font-semibold truncate">{item.from.name}</span>
            <span className="text-ink-500 text-xs shrink-0 tabular-nums">
              {fmtReceived(item.receivedAt, timezone)}
            </span>
          </div>
          <div className="text-ink-700 text-sm mt-0.5 truncate">{item.subject}</div>
          <div className="text-ink-500 text-xs mt-0.5 truncate">{item.snippet}</div>
        </div>
      </button>
    </li>
  );
}

function CompactRow({
  item,
  timezone,
  onClick,
}: {
  item: MailItem;
  timezone: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-md row-hover focus:outline-none focus-visible:bg-surface-1"
      >
        <span
          className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
            item.isUseful ? 'bg-ink-900' : 'bg-ink-300 border border-ink-300'
          }`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="text-ink-900 text-sm truncate">{item.subject}</div>
          <div className="text-ink-500 text-xs mt-0.5 truncate font-mono">
            {item.from.name} · {fmtReceived(item.receivedAt, timezone)}
          </div>
        </div>
      </button>
    </li>
  );
}

export function InboxDigestCard({
  kind,
  section,
  timezone,
  onOpenItem,
  onMarkUseful,
}: InboxDigestCardProps) {
  const { title, Icon } = meta[kind];
  const [showNoise, setShowNoise] = useState(false);
  const kept = section.items.length;
  const filtered = section.filteredAsNoise ?? 0;
  const isPrimary = kind === 'primary';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] tracking-tracked uppercase font-semibold text-ink-900 flex items-center gap-2">
          <Icon size={16} weight="regular" />
          {title}
        </h2>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Pill emphasis={kept > 0 && isPrimary ? 'accent' : 'default'}>
            {kept} {isPrimary ? 'new' : 'kept'}
          </Pill>
          {filtered > 0 && <span>· {filtered} filtered</span>}
        </div>
      </div>

      {kept === 0 ? (
        <div className="py-10 text-center">
          <div className="text-2xl mb-2">✦</div>
          <p className="text-ink-700 text-sm">
            {isPrimary ? 'Inbox zero.' : 'Nothing kept here.'}
          </p>
          {isPrimary && (
            <p className="text-ink-500 text-xs mt-1">
              No new mail from people overnight.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-ink-300/50">
          {section.items.map((item) =>
            isPrimary ? (
              <PrimaryRow
                key={item.id}
                item={item}
                timezone={timezone}
                onClick={() => onOpenItem(item.id)}
              />
            ) : (
              <CompactRow
                key={item.id}
                item={item}
                timezone={timezone}
                onClick={() => onOpenItem(item.id)}
              />
            ),
          )}
        </ul>
      )}

      {filtered > 0 && section.filteredItems && section.filteredItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-ink-300/50">
          <button
            onClick={() => setShowNoise((v) => !v)}
            className="text-xs text-ink-500 hover:text-ink-900 underline-offset-2 hover:underline"
          >
            ↳ {showNoise ? 'Hide' : 'Show'} {filtered} filtered as noise
          </button>
          {showNoise && (
            <ul className="mt-3 space-y-2">
              {section.filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-xs gap-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-ink-700 font-mono">{item.from.name}</span>
                    <span className="text-ink-500"> — {item.subject}</span>
                  </div>
                  {onMarkUseful && (
                    <button
                      onClick={() => onMarkUseful(item.id)}
                      className="text-ink-500 hover:text-ink-900 underline-offset-2 hover:underline"
                    >
                      + Mark useful
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
