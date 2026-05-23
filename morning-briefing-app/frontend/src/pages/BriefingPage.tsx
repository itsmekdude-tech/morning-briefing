import { useEffect, useMemo } from 'react';
import { ActionItemsCard } from '../components/ActionItemsCard';
import { BriefingHeader } from '../components/BriefingHeader';
import { CalendarCard } from '../components/CalendarCard';
import { EndMark } from '../components/EndMark';
import { ExportButton } from '../components/ExportButton';
import { InboxDigestCard } from '../components/InboxDigestCard';
import { ItemDetailDrawer } from '../components/ItemDetailDrawer';
import { Skeleton } from '../components/ui/Skeleton';
import {
  useBriefing,
  useCompleteAction,
  useMarkNoise,
  useMarkUseful,
  useRefreshBriefing,
  useSnoozeItem,
} from '../hooks/useBriefing';
import { useUiStore } from '../store/uiStore';
import type { MailItem, SectionKind } from '../types/briefing';

function LoadingState() {
  return (
    <div className="max-w-page mx-auto px-6 sm:px-8 py-10 space-y-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-80" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export function BriefingPage() {
  const { data: briefing, isLoading, isFetching } = useBriefing();
  const refresh = useRefreshBriefing();
  const { mutate: markNoise } = useMarkNoise();
  const { mutate: markUseful } = useMarkUseful();
  const { mutate: completeAction } = useCompleteAction();
  const { mutate: snooze } = useSnoozeItem();

  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const openItem = useUiStore((s) => s.openItem);
  const closeDrawer = useUiStore((s) => s.closeDrawer);

  const selectedItem: MailItem | null = useMemo(() => {
    if (!briefing || !selectedItemId) return null;
    for (const kind of ['primary', 'updates', 'forums', 'promotions'] as const) {
      const found = briefing.sections[kind].items.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return null;
  }, [briefing, selectedItemId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'r') refresh();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [refresh]);

  if (isLoading || !briefing) return <LoadingState />;

  const orderedKinds: SectionKind[] = ['updates', 'forums'];

  return (
    <div className="min-h-screen bg-surface-1 text-ink-700">
      <a
        href="#briefing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-ink-900 focus:text-surface-0 focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to briefing
      </a>
      <main id="briefing-main" className="max-w-page mx-auto px-6 sm:px-8 py-10">
        <BriefingHeader
          displayName={briefing.user.displayName}
          generatedAt={briefing.generatedAt}
          timezone={briefing.user.timezone}
          onRefresh={refresh}
          refreshing={isFetching && !isLoading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CalendarCard events={briefing.calendar} timezone={briefing.user.timezone} />
          <ActionItemsCard items={briefing.actionItems} onToggle={completeAction} />
        </div>

        <div className="mt-4">
          <InboxDigestCard
            kind="primary"
            section={briefing.sections.primary}
            timezone={briefing.user.timezone}
            onOpenItem={openItem}
            onMarkUseful={markUseful}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {orderedKinds.map((kind) => (
            <InboxDigestCard
              key={kind}
              kind={kind}
              section={briefing.sections[kind]}
              timezone={briefing.user.timezone}
              onOpenItem={openItem}
              onMarkUseful={markUseful}
            />
          ))}
        </div>

        <div className="mt-4">
          <InboxDigestCard
            kind="promotions"
            section={briefing.sections.promotions}
            timezone={briefing.user.timezone}
            onOpenItem={openItem}
            onMarkUseful={markUseful}
          />
        </div>

        <div className="mt-8 flex justify-center">
          <ExportButton briefing={briefing} />
        </div>

        <EndMark />
      </main>

      <ItemDetailDrawer
        item={selectedItem}
        open={drawerOpen}
        onClose={closeDrawer}
        onMarkUseful={markUseful}
        onMarkNoise={markNoise}
        onSnooze={(id) =>
          snooze({ id, until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
        }
        timezone={briefing.user.timezone}
      />
    </div>
  );
}
