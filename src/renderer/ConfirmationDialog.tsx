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
