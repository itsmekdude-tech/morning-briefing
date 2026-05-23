import { create } from 'zustand';

interface UiState {
  personaId: string;
  selectedItemId: string | null;
  drawerOpen: boolean;
  expandedNoise: Record<string, boolean>;
  setPersona: (id: string) => void;
  openItem: (id: string) => void;
  closeDrawer: () => void;
  toggleNoise: (kind: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  personaId: 'hersh',
  selectedItemId: null,
  drawerOpen: false,
  expandedNoise: {},
  setPersona: (id) => set({ personaId: id, selectedItemId: null, drawerOpen: false }),
  openItem: (id) => set({ selectedItemId: id, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, selectedItemId: null }),
  toggleNoise: (kind) =>
    set((s) => ({ expandedNoise: { ...s.expandedNoise, [kind]: !s.expandedNoise[kind] } })),
}));
