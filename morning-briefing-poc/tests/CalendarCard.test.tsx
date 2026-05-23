import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarCard } from '../src/components/CalendarCard';
import type { CalendarEvent } from '../src/types/briefing';

const tz = 'America/New_York';

const events: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Standup',
    start: '2026-05-23T09:00:00-04:00',
    end: '2026-05-23T09:15:00-04:00',
    location: 'Zoom',
  },
  {
    id: 'e2',
    title: 'Design review',
    start: '2026-05-23T10:30:00-04:00',
    end: '2026-05-23T11:30:00-04:00',
    location: 'Room 4',
  },
];

describe('CalendarCard', () => {
  it('renders all events with title and location', () => {
    render(<CalendarCard events={events} timezone={tz} />);
    expect(screen.getByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('Design review')).toBeInTheDocument();
    expect(screen.getByText(/Zoom/)).toBeInTheDocument();
  });

  it('shows event count summary in footer', () => {
    render(<CalendarCard events={events} timezone={tz} />);
    const matches = screen.getAllByText(/2 events/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByText(/1h 15m booked/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no events', () => {
    render(<CalendarCard events={[]} timezone={tz} />);
    expect(screen.getByText(/Nothing on the calendar/i)).toBeInTheDocument();
  });

  it('renders duration in compact form (h/m)', () => {
    render(<CalendarCard events={events} timezone={tz} />);
    expect(screen.getByText('15m')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
  });
});
