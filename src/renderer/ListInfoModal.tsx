import type { ReactNode } from 'react';
import type { SidebarItem } from './types';

interface ListInfoModalProps {
  isOpen: boolean;
  selectedSidebarItem: SidebarItem | undefined;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ListInfoModal({ isOpen, selectedSidebarItem, onClose }: ListInfoModalProps): ReactNode {
  const list = selectedSidebarItem?.type === 'list' ? selectedSidebarItem.list : null;
  if (!isOpen || !list) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal list-info-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{list.name || 'Untitled'}</h2>
        <div className="list-info-row">
          <span className="list-info-label">Created</span>
          <span>{formatDate(list.created_at)}</span>
        </div>
        <div className="list-info-row">
          <span className="list-info-label">Updated</span>
          <span>{formatDate(list.updated_at)}</span>
        </div>
        <div className="confirmation-buttons">
          <button onClick={onClose}>Close <span className="hotkey-badge">Esc</span></button>
        </div>
      </div>
    </div>
  );
}
