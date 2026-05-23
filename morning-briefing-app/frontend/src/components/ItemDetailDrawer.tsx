import { CheckCircle, Clock, XCircle } from '@phosphor-icons/react';
import { Button } from './ui/Button';
import { Drawer } from './ui/Drawer';
import type { MailItem } from '../types/briefing';

interface ItemDetailDrawerProps {
  item: MailItem | null;
  open: boolean;
  onClose: () => void;
  onMarkUseful: (id: string) => void;
  onMarkNoise: (id: string) => void;
  onSnooze: (id: string) => void;
  timezone: string;
}

function fmtReceived(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

export function ItemDetailDrawer({
  item,
  open,
  onClose,
  onMarkUseful,
  onMarkNoise,
  onSnooze,
  timezone,
}: ItemDetailDrawerProps) {
  return (
    <Drawer open={open && !!item} onClose={onClose} title="Message">
      {item && (
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-ink-900 text-sm font-semibold">{item.from.name}</div>
            <div className="text-ink-500 text-xs mt-0.5 font-mono">
              {item.from.email} · {fmtReceived(item.receivedAt, timezone)}
            </div>
          </div>

          <h2 className="font-display text-2xl text-ink-900 leading-snug">{item.subject}</h2>

          <div className="text-ink-700 text-sm leading-relaxed whitespace-pre-line">
            {item.body ?? item.snippet}
          </div>

          <div className="pt-4 border-t border-ink-300/60">
            <div className="text-[11px] tracking-tracked uppercase font-semibold text-ink-500 mb-3">
              Actions
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onMarkUseful(item.id);
                  onClose();
                }}
              >
                <CheckCircle size={14} /> Useful
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onMarkNoise(item.id);
                  onClose();
                }}
              >
                <XCircle size={14} /> Mark noise
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSnooze(item.id);
                  onClose();
                }}
              >
                <Clock size={14} /> Snooze
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
