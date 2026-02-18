import { useState, useCallback } from 'react';

const FLASH_DURATION_MS = 200;

interface FlashState {
  flashIds: Set<string>;
  flash: (id: string) => void;
}

export function useFlash(): FlashState {
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const flash = useCallback((id: string) => {
    setFlashIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, FLASH_DURATION_MS);
  }, []);

  return { flashIds, flash };
}
