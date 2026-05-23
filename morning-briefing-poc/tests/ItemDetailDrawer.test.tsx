import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ItemDetailDrawer } from '../src/components/ItemDetailDrawer';
import type { MailItem } from '../src/types/briefing';

const item: MailItem = {
  id: 'msg_42',
  from: { name: 'Priya Shah', email: 'priya@bigco.com' },
  subject: 'Q3 deck — needs your review by EOD',
  snippet: 'snippet here',
  body: 'Hey Hersh,\n\nAttaching v4.',
  receivedAt: '2026-05-23T06:14:00-04:00',
  isUseful: true,
  isNoise: false,
};

const noop = () => {};

describe('ItemDetailDrawer', () => {
  it('does not render when closed', () => {
    render(
      <ItemDetailDrawer
        item={item}
        open={false}
        onClose={noop}
        onMarkUseful={noop}
        onMarkNoise={noop}
        onSnooze={noop}
        timezone="America/New_York"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders body, subject, and sender when open', () => {
    render(
      <ItemDetailDrawer
        item={item}
        open
        onClose={noop}
        onMarkUseful={noop}
        onMarkNoise={noop}
        onSnooze={noop}
        timezone="America/New_York"
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(item.subject)).toBeInTheDocument();
    expect(screen.getByText(/Attaching v4/)).toBeInTheDocument();
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();
  });

  it('fires onMarkUseful then closes', async () => {
    const onMarkUseful = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ItemDetailDrawer
        item={item}
        open
        onClose={onClose}
        onMarkUseful={onMarkUseful}
        onMarkNoise={noop}
        onSnooze={noop}
        timezone="America/New_York"
      />,
    );
    await user.click(screen.getByRole('button', { name: /Useful/ }));
    expect(onMarkUseful).toHaveBeenCalledWith('msg_42');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ItemDetailDrawer
        item={item}
        open
        onClose={onClose}
        onMarkUseful={noop}
        onMarkNoise={noop}
        onSnooze={noop}
        timezone="America/New_York"
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
