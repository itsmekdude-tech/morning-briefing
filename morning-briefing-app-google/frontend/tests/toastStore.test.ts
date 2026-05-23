import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '../src/store/toastStore';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  vi.useFakeTimers();
});

describe('toastStore', () => {
  it('push adds a toast', () => {
    useToastStore.getState().push({ message: 'Hello' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Hello');
  });

  it('automatically dismisses after 3.5s', () => {
    useToastStore.getState().push({ message: 'Bye' });
    vi.advanceTimersByTime(3600);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('caps at 3 toasts', () => {
    const push = useToastStore.getState().push;
    push({ message: 'a' });
    push({ message: 'b' });
    push({ message: 'c' });
    push({ message: 'd' });
    expect(useToastStore.getState().toasts).toHaveLength(3);
    expect(useToastStore.getState().toasts[2].message).toBe('d');
  });
});
