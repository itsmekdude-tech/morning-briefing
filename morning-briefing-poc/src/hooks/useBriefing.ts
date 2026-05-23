import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockApi } from '../services/mockApi';
import { useUiStore } from '../store/uiStore';
import { useToastStore } from '../store/toastStore';
import type { Briefing } from '../types/briefing';

export function briefingKey(personaId: string) {
  return ['briefing', personaId] as const;
}

export function useBriefing() {
  const personaId = useUiStore((s) => s.personaId);
  return useQuery({
    queryKey: briefingKey(personaId),
    queryFn: () => mockApi.getBriefing({ personaId }),
    staleTime: 30_000,
  });
}

export function useRefreshBriefing() {
  const qc = useQueryClient();
  const personaId = useUiStore((s) => s.personaId);
  return () => {
    qc.invalidateQueries({ queryKey: briefingKey(personaId) });
  };
}

export function useMarkNoise() {
  const qc = useQueryClient();
  const personaId = useUiStore((s) => s.personaId);
  const pushToast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (itemId: string) => mockApi.markItemNoise(personaId, itemId),
    onSuccess: (updated: Briefing) => {
      qc.setQueryData(briefingKey(personaId), updated);
      pushToast({ message: 'Marked as noise.' });
    },
  });
}

export function useMarkUseful() {
  const qc = useQueryClient();
  const personaId = useUiStore((s) => s.personaId);
  const pushToast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (itemId: string) => mockApi.markItemUseful(personaId, itemId),
    onSuccess: (updated: Briefing) => {
      qc.setQueryData(briefingKey(personaId), updated);
      pushToast({ message: 'Marked as useful.' });
    },
  });
}

export function useCompleteAction() {
  const qc = useQueryClient();
  const personaId = useUiStore((s) => s.personaId);
  return useMutation({
    mutationFn: (id: string) => mockApi.completeActionItem(personaId, id),
    onSuccess: (updated: Briefing) => qc.setQueryData(briefingKey(personaId), updated),
  });
}

export function useSnoozeItem() {
  const qc = useQueryClient();
  const personaId = useUiStore((s) => s.personaId);
  const pushToast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) =>
      mockApi.snoozeItem(personaId, id, until),
    onSuccess: (updated: Briefing) => {
      qc.setQueryData(briefingKey(personaId), updated);
      pushToast({ message: 'Snoozed until tomorrow 7 AM.' });
    },
  });
}
