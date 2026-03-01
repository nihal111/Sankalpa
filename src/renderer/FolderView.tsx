import type { ReactNode } from 'react';
import type { FolderViewRow } from './hooks/useFolderView';

interface FolderViewProps {
  folderName: string;
  rows: FolderViewRow[];
  focusedPane: string;
  selectedIndex: number;
  onToggleSection: (listId: string) => void;
}

export function FolderView({ folderName, rows, focusedPane, selectedIndex, onToggleSection }: FolderViewProps): ReactNode {
  return (
    <div className={`pane tasks-pane ${focusedPane === 'tasks' ? 'focused' : ''}`}>
      <h2><svg className="header-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>{folderName}</h2>
      {rows.length === 0 ? (
        <ul className="item-list">
          <li className="empty-list-hint">
            Hit <span className="hotkey-badge">⌘</span> <span className="hotkey-badge">shift</span> <span className="hotkey-badge">N</span> to create a new list
          </li>
        </ul>
      ) : (
        <div className="folder-sections">
          {rows.map((row, i) => {
            const isSelected = focusedPane === 'tasks' && i === selectedIndex;
            if (row.type === 'header') {
              return (
                <div key={`h-${row.listId}`} className={`folder-section-header ${isSelected ? 'selected' : ''}`} onClick={() => onToggleSection(row.listId)}>
                  <svg className={`folder-section-chevron ${row.expanded ? 'expanded' : ''}`} width="10" height="10" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 0 L6 4 L2 8" />
                  </svg>
                  <span className="folder-section-name">{row.name}</span>
                </div>
              );
            }
            return (
              <div key={row.task.id} className={`item folder-section-task ${isSelected ? 'selected' : ''}`} style={{ paddingLeft: `${24 + row.depth * 16}px` }}>
                <input
                  type="checkbox"
                  checked={row.task.status === 'COMPLETED'}
                  readOnly
                  aria-label={`${row.task.title || 'untitled task'}`}
                />
                <span className={`folder-task-title ${row.task.status === 'COMPLETED' ? 'completed' : ''}`}>{row.task.title || '\u00A0'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
