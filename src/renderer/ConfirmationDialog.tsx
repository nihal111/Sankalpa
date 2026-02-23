import { useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ConfirmationOption {
  label: string;
  action: () => void;
  hotkeyDisplay?: string;
}

interface ConfirmationDialogProps {
  title: string;
  message: string;
  options: ConfirmationOption[];
  onCancel: () => void;
}

export function ConfirmationDialog({ title, message, options, onCancel }: ConfirmationDialogProps): ReactNode {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
    if (e.key === 'Enter' && e.metaKey && options[0]) { e.preventDefault(); e.stopPropagation(); options[0].action(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); e.stopPropagation();
    }
  }, [onCancel, options]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirmation-buttons">
          {options.map((opt, i) => (
            <button key={i} onClick={opt.action}>
              {opt.label}
              {opt.hotkeyDisplay && <>{' '}{opt.hotkeyDisplay.split(' ').map((k, j) => (
                <span key={j} className="hotkey-badge">{k}</span>
              ))}</>}
            </button>
          ))}
          <button onClick={onCancel}>Cancel <span className="hotkey-badge">Esc</span></button>
        </div>
      </div>
    </div>
  );
}
