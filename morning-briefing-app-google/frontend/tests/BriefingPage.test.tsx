import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BriefingPage } from '../src/pages/BriefingPage';
import { mockApi } from '../src/services/mockApi';
import { useUiStore } from '../src/store/uiStore';
import { renderWithProviders } from './testUtils';

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { search: '?fast=1' },
    writable: true,
  });
  mockApi.__resetForTests();
  useUiStore.setState({
    personaId: 'hersh',
    selectedItemId: null,
    drawerOpen: false,
    expandedNoise: {},
  });
});

describe('BriefingPage', () => {
  it('renders briefing content after loading resolves', async () => {
    renderWithProviders(<BriefingPage />, { route: '/briefing' });

    expect(await screen.findByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('Reply to Priya re Q3 deck')).toBeInTheDocument();
    expect(screen.getByText('Q3 deck — needs your review by EOD')).toBeInTheDocument();
    expect(screen.getAllByText(/Today/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/That's everything for today/)).toBeInTheDocument();
  });

  it('switches persona via store and re-renders new data', async () => {
    const { queryClient } = renderWithProviders(<BriefingPage />, { route: '/briefing' });
    await screen.findByText('Standup');

    useUiStore.setState({ personaId: 'student' });
    await queryClient.invalidateQueries();

    await waitFor(() => {
      expect(screen.getByText('CS 374 lecture')).toBeInTheDocument();
    });
  });
});
