import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFlash } from './useFlash';

describe('useFlash', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('adds and removes flash id after timeout', () => {
    const { result } = renderHook(() => useFlash());
    act(() => { result.current.flash('item-1'); });
    expect(result.current.flashIds.has('item-1')).toBe(true);
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.flashIds.has('item-1')).toBe(false);
  });
});
