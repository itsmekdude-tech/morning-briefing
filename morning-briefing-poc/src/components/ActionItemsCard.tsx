import { CheckSquare } from '@phosphor-icons/react';
import { useState } from 'react';
import { Card } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import { Pill } from './ui/Pill';
import type { ActionItem } from '../types/briefing';

interface ActionItemsCardProps {
  items: ActionItem[];
  onToggle: (id: string) => void;
}

function dueLabel(iso?: string): { text: string; today: boolean } {
  if (!iso) return { text: 'No deadline', today: false };
  const today = new Date().toISOString().slice(0, 10);
  if (iso === today) return { text: 'Due today', today: true };
  const d = new Date(iso);
  return {
    text: `Due ${d.toLocaleDateString('en-US', { weekday: 'short' })}`,
    today: false,
  };
}

export function ActionItemsCard({ items, onToggle }: ActionItemsCardProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const open = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] tracking-tracked uppercase font-semibold text-ink-900 flex items-center gap-2">
          <CheckSquare size={16} weight="regular" />
          Action items
        </h2>
        {open.length > 0 && <Pill>{open.length} open</Pill>}
      </div>

      {open.length === 0 && completed.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-2xl mb-2">✿</div>
          <p className="text-ink-700 text-sm">Nothing on your plate.</p>
          <p className="text-ink-500 text-xs mt-1 max-w-xs mx-auto">
            We didn't find anything in your inbox that looked like a task.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-ink-300/50">
            {open.map((item) => {
              const due = dueLabel(item.due);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 py-3 row-hover -mx-3 px-3 rounded-md"
                >
                  <Checkbox
                    checked={false}
                    onChange={() => onToggle(item.id)}
                    ariaLabel={`Complete "${item.ask}"`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-ink-900 text-sm">{item.ask}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      <span
                        className={
                          due.today
                            ? 'text-ink-900 font-semibold uppercase tracking-tracked text-[11px]'
                            : 'text-ink-500'
                        }
                      >
                        {due.text}
                      </span>
                      {item.from && (
                        <span className="text-ink-500 truncate">· from {item.from}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {completed.length > 0 && (
            <>
              <button
                className="mt-4 text-xs text-ink-500 hover:text-ink-900 underline-offset-2 hover:underline"
                onClick={() => setShowCompleted((v) => !v)}
              >
                ↳ {showCompleted ? 'Hide' : 'Show'} {completed.length} completed
              </button>
              {showCompleted && (
                <ul className="mt-3 divide-y divide-ink-300/50">
                  {completed.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3 -mx-3 px-3">
                      <Checkbox
                        checked={true}
                        onChange={() => onToggle(item.id)}
                        ariaLabel={`Uncomplete "${item.ask}"`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-ink-500 text-sm line-through">{item.ask}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}
