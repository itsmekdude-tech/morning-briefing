import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../src/store/uiStore';

beforeEach(() => {
  useUiStore.setState({
    personaId: 'hersh',
    selectedItemId: null,
    drawerOpen: false,
    expandedNoise: {},
  });
});

describe('uiStore', () => {
  it('openItem sets selectedItemId and opens drawer', () => {
    useUiStore.getState().openItem('msg_42');
    expect(useUiStore.getState().selectedItemId).toBe('msg_42');
    expect(useUiStore.getState().drawerOpen).toBe(true);
  });

  it('closeDrawer clears selection and closes drawer', () => {
    useUiStore.getState().openItem('msg_42');
    useUiStore.getState().closeDrawer();
    expect(useUiStore.getState().drawerOpen).toBe(false);
    expect(useUiStore.getState().selectedItemId).toBeNull();
  });

  it('setPersona swaps and resets transient state', () => {
    useUiStore.getState().openItem('msg_42');
    useUiStore.getState().setPersona('founder');
    expect(useUiStore.getState().personaId).toBe('founder');
    expect(useUiStore.getState().drawerOpen).toBe(false);
    expect(useUiStore.getState().selectedItemId).toBeNull();
  });

  it('toggleNoise flips boolean per kind', () => {
    useUiStore.getState().toggleNoise('updates');
    expect(useUiStore.getState().expandedNoise.updates).toBe(true);
    useUiStore.getState().toggleNoise('updates');
    expect(useUiStore.getState().expandedNoise.updates).toBe(false);
  });
});
