import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PersonaSwitcher } from '../src/components/PersonaSwitcher';
import { useUiStore } from '../src/store/uiStore';

beforeEach(() => {
  useUiStore.setState({
    personaId: 'hersh',
    selectedItemId: null,
    drawerOpen: false,
    expandedNoise: {},
  });
});

describe('PersonaSwitcher', () => {
  it('opens a list of three personas on click and selects one', async () => {
    const user = userEvent.setup();
    render(<PersonaSwitcher />);
    await user.click(screen.getByRole('button', { name: /persona/i }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    await user.click(screen.getByRole('option', { name: /Founder firehose/ }));
    expect(useUiStore.getState().personaId).toBe('founder');
  });

  it('shows the current persona label in the trigger', () => {
    useUiStore.setState({ personaId: 'student' });
    render(<PersonaSwitcher />);
    expect(screen.getByText(/Student \/ light/)).toBeInTheDocument();
  });
});
