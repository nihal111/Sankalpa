import { useState, useCallback, useEffect, useRef } from 'react';

const FLASH_DURATION_MS = 200;

interface FlashState {
  flashIds: Set<string>;
  flash: (id: string) => void;
}

export function useFlash(): FlashState {
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const flash = useCallback((id: string) => {
    setFlashIds((prev) => new Set(prev).add(id));
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, FLASH_DURATION_MS);
    timersRef.current.set(id, timer);
  }, []);

  return { flashIds, flash };
}
