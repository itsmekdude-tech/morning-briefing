import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionItemsCard } from '../src/components/ActionItemsCard';
import type { ActionItem } from '../src/types/briefing';

const items: ActionItem[] = [
  { id: 'a1', ask: 'Reply to Priya', due: '2026-05-23', from: 'priya@bigco.com', confidence: 0.9, completed: false },
  { id: 'a2', ask: 'Send invoice', due: '2026-05-26', from: 'accounts@bigco.com', confidence: 0.85, completed: false },
  { id: 'a3', ask: 'Old finished task', confidence: 0.7, completed: true },
];

describe('ActionItemsCard', () => {
  it('renders only open items by default', () => {
    render(<ActionItemsCard items={items} onToggle={() => {}} />);
    expect(screen.getByText('Reply to Priya')).toBeInTheDocument();
    expect(screen.getByText('Send invoice')).toBeInTheDocument();
    expect(screen.queryByText('Old finished task')).not.toBeInTheDocument();
  });

  it('reveals completed items when "Show N completed" is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionItemsCard items={items} onToggle={() => {}} />);
    await user.click(screen.getByText(/Show 1 completed/));
    expect(screen.getByText('Old finished task')).toBeInTheDocument();
  });

  it('calls onToggle with the action id when checkbox is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ActionItemsCard items={items} onToggle={onToggle} />);
    await user.click(screen.getByRole('checkbox', { name: /Complete "Reply to Priya"/ }));
    expect(onToggle).toHaveBeenCalledWith('a1');
  });

  it('shows empty state when there are no items at all', () => {
    render(<ActionItemsCard items={[]} onToggle={() => {}} />);
    expect(screen.getByText(/Nothing on your plate/i)).toBeInTheDocument();
  });
});
