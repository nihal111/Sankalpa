import type { ReactNode } from 'react';

interface MoveListOverlayProps {
  targets: { label: string; folderId: string | null }[];
  targetIndex: number;
}

export function MoveListOverlay({ targets, targetIndex }: MoveListOverlayProps): ReactNode {
  return (
    <div className="move-overlay">
      <div className="move-hint">Move list to folder:</div>
      <ul className="move-list-targets">
        {targets.map((t, i) => (
          <li key={t.folderId ?? '__none__'} className={`move-list-target ${i === targetIndex ? 'move-target' : ''}`}>{t.label}</li>
        ))}
      </ul>
      <div className="move-hint">↑↓ select · Enter confirm · Esc cancel</div>
    </div>
  );
}
