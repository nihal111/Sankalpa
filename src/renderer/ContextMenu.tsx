import { useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  action: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): ReactNode {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }, [onClose]);

  useEffect(() => {
    const handleClick = (): void => onClose();
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleKeyDown]);

  return (
    <div className="context-menu" style={{ left: x, top: y }}>
      {items.map((item) => (
        <div key={item.label} className="context-menu-item" onClick={(e) => { e.stopPropagation(); item.action(); onClose(); }}>
          {item.label}
        </div>
      ))}
    </div>
  );
}
