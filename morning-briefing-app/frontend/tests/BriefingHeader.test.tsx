import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BriefingHeader } from '../src/components/BriefingHeader';
import { renderWithProviders } from './testUtils';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BriefingHeader', () => {
  it('shows "Good morning" before 11:00', () => {
    vi.setSystemTime(new Date('2026-05-23T07:00:00-04:00'));
    renderWithProviders(
      <BriefingHeader
        displayName="Hersh"
        generatedAt="2026-05-23T07:02:00-04:00"
        timezone="America/New_York"
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Good morning');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Hersh');
  });

  it('shows "Good afternoon" between 11:00 and 17:00', () => {
    vi.setSystemTime(new Date('2026-05-23T13:00:00-04:00'));
    renderWithProviders(
      <BriefingHeader
        displayName="Hersh"
        generatedAt="2026-05-23T07:02:00-04:00"
        timezone="America/New_York"
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Good afternoon');
  });

  it('renders persona switcher, theme toggle, refresh, and settings link', () => {
    vi.setSystemTime(new Date('2026-05-23T07:00:00-04:00'));
    renderWithProviders(
      <BriefingHeader
        displayName="Hersh"
        generatedAt="2026-05-23T07:02:00-04:00"
        timezone="America/New_York"
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /persona/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Refresh briefing/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Settings/)).toBeInTheDocument();
  });
});
