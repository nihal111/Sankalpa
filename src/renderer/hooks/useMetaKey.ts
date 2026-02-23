import { useEffect, useRef, useState } from 'react';

export function useMetaKey(): boolean {
  const [held, setHeld] = useState(false);
  const ref = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent): void => { if (e.key === 'Meta' && !ref.current) { ref.current = true; setHeld(true); } };
    const up = (e: KeyboardEvent): void => { if (e.key === 'Meta') { ref.current = false; setHeld(false); } };
    const blur = (): void => { ref.current = false; setHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  return held;
}
