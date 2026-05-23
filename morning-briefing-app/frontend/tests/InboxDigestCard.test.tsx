import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InboxDigestCard } from '../src/components/InboxDigestCard';
import type { InboxSection, MailItem } from '../src/types/briefing';

const tz = 'America/New_York';

function makeItem(over: Partial<MailItem> = {}): MailItem {
  return {
    id: 'm_' + Math.random().toString(36).slice(2, 7),
    from: { name: 'Priya Shah', email: 'priya@bigco.com' },
    subject: 'Q3 deck review',
    snippet: 'Hey Hersh, attaching v4 of the deck…',
    receivedAt: '2026-05-23T06:14:00-04:00',
    isUseful: true,
    isNoise: false,
    read: false,
    ...over,
  };
}

describe('InboxDigestCard', () => {
  it('primary variant shows sender, subject, and snippet, and opens item on click', async () => {
    const onOpen = vi.fn();
    const section: InboxSection = { newCount: 1, items: [makeItem({ id: 'msg_1' })] };
    const user = userEvent.setup();

    render(
      <InboxDigestCard
        kind="primary"
        section={section}
        timezone={tz}
        onOpenItem={onOpen}
      />,
    );
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();
    expect(screen.getByText('Q3 deck review')).toBeInTheDocument();
    expect(screen.getByText(/attaching v4/)).toBeInTheDocument();
    expect(screen.getByText('1 new')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Priya Shah/ }));
    expect(onOpen).toHaveBeenCalledWith('msg_1');
  });

  it('non-primary variant uses "N kept" label', () => {
    const section: InboxSection = {
      newCount: 3,
      filteredAsNoise: 12,
      items: [makeItem(), makeItem(), makeItem()],
      filteredItems: [],
    };
    render(
      <InboxDigestCard
        kind="updates"
        section={section}
        timezone={tz}
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByText('3 kept')).toBeInTheDocument();
    expect(screen.getByText(/12 filtered/)).toBeInTheDocument();
  });

  it('expands and collapses the "Show N filtered as noise" panel', async () => {
    const section: InboxSection = {
      newCount: 1,
      filteredAsNoise: 1,
      items: [makeItem()],
      filteredItems: [makeItem({ id: 'n_1', from: { name: 'LinkedIn', email: 'no-reply@li.com' }, subject: 'You appeared in 4 searches' })],
    };
    const user = userEvent.setup();
    render(
      <InboxDigestCard
        kind="updates"
        section={section}
        timezone={tz}
        onOpenItem={() => {}}
        onMarkUseful={() => {}}
      />,
    );
    expect(screen.queryByText('You appeared in 4 searches')).not.toBeInTheDocument();
    await user.click(screen.getByText(/Show 1 filtered as noise/));
    expect(screen.getByText(/You appeared in 4 searches/)).toBeInTheDocument();
    await user.click(screen.getByText(/Hide 1 filtered as noise/));
    expect(screen.queryByText('You appeared in 4 searches')).not.toBeInTheDocument();
  });

  it('shows inbox-zero empty state for primary when no items', () => {
    const section: InboxSection = { newCount: 0, items: [] };
    render(
      <InboxDigestCard
        kind="primary"
        section={section}
        timezone={tz}
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByText(/Inbox zero/i)).toBeInTheDocument();
  });
});
