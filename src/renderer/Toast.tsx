import type { ReactNode } from 'react';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps): ReactNode {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
