import { useState, useCallback, useRef } from 'react';

interface ToastState {
  message: string | null;
  show: (msg: string) => void;
}

export function useToast(): ToastState {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    timeoutRef.current = setTimeout(() => setMessage(null), 2000);
  }, []);

  return { message, show };
}
