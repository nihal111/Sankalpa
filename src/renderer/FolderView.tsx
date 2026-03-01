import type { ReactNode, RefObject } from 'react';
import type { FolderViewRow } from './hooks/useFolderView';
import type { EditMode } from './types';
import { formatDurationShort } from './DurationModal';

function formatDueDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface FolderViewProps {
  folderName: string;
  rows: FolderViewRow[];
  focusedPane: string;
  selectedIndex: number;
  onToggleSection: (listId: string) => void;
  selectedTaskIndices: Set<number>;
  shiftHeld: boolean;
  cmdHeld: boolean;
  boundaryCursor: number | null;
  onTaskClick: (index: number) => void;
  onTaskContextMenu: (index: number, x: number, y: number) => void;
  onTaskToggle: (taskId: string) => void;
  flashIds: Set<string>;
  throbIds: Set<string>;
  completeIds: Set<string>;
  uncompleteIds: Set<string>;
  moveIds: Set<string>;
  evaporateIds: Set<string>;
  dragOverIndex?: number | null;
  dropPosition?: 'before' | 'after' | null;
  dragOverListId?: string | null;
  taskDragProps?: (index: number) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  headerDropProps?: (listId: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  editMode: EditMode;
  editValue: string;
  setEditValue: (v: string) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleEditBlur: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function FolderView({
  folderName, rows, focusedPane, selectedIndex, onToggleSection,
  selectedTaskIndices, shiftHeld, cmdHeld, boundaryCursor,
  onTaskClick, onTaskContextMenu, onTaskToggle,
  flashIds, throbIds, completeIds, uncompleteIds, moveIds, evaporateIds,
  dragOverIndex, dropPosition, dragOverListId, taskDragProps, headerDropProps,
  editMode, editValue, setEditValue, handleInputKeyDown, handleEditBlur, inputRef,
}: FolderViewProps): ReactNode {
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
            const isSelected = focusedPane === 'tasks' && i === selectedIndex && !cmdHeld;
            if (row.type === 'header') {
              const headerDrop = headerDropProps?.(row.listId);
              return (
                <div
                  key={`h-${row.listId}`}
                  className={`folder-section-header ${isSelected ? 'selected' : ''} ${dragOverListId === row.listId ? 'drag-over' : ''}`}
                  onClick={() => onToggleSection(row.listId)}
                  {...headerDrop}
                >
                  <svg className={`folder-section-chevron ${row.expanded ? 'expanded' : ''}`} width="10" height="10" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 0 L6 4 L2 8" />
                  </svg>
                  <span className="folder-section-name">{row.name}</span>
                </div>
              );
            }
            const task = row.task;
            const drag = taskDragProps?.(i);
            const isOverdue = task.due_date !== null && task.due_date < Date.now() && task.status === 'PENDING';
            return (
              <div
                key={task.id}
                className={`item folder-section-task ${task.status === 'COMPLETED' ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${isSelected ? 'selected' : ''} ${selectedTaskIndices.has(i) ? 'multi-selected' : ''} ${shiftHeld && i === selectedIndex ? 'cursor' : ''} ${cmdHeld && i === boundaryCursor ? 'cursor' : ''} ${flashIds.has(task.id) ? 'flash' : ''} ${throbIds.has(task.id) ? 'throb' : ''} ${completeIds.has(task.id) ? 'completing' : ''} ${uncompleteIds.has(task.id) ? 'uncompleting' : ''} ${moveIds.has(task.id) ? 'moved' : ''} ${evaporateIds.has(task.id) ? 'evaporating' : ''} ${dragOverIndex === i && dropPosition === 'before' ? 'drag-over-before' : ''} ${dragOverIndex === i && dropPosition === 'after' ? 'drag-over-after' : ''}`}
                style={{ paddingLeft: `${24 + row.depth * 16}px` }}
                onClick={() => onTaskClick(i)}
                onContextMenu={(e) => { e.preventDefault(); onTaskContextMenu(i, e.clientX, e.clientY); }}
                {...drag}
              >
                <input
                  type="checkbox"
                  checked={task.status === 'COMPLETED'}
                  onChange={() => onTaskToggle(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`mark ${task.title || 'untitled task'} as complete`}
                />
                <span className={`task-content ${task.status === 'COMPLETED' ? 'completed' : ''}`}>
                  {editMode?.type === 'task' && editMode.index === i ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onBlur={handleEditBlur}
                      className="edit-input"
                    />
                  ) : (
                    task.title || '\u00A0'
                  )}
                </span>
                {task.duration ? (
                  <span className="task-duration"><svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="15" height="7" rx="1" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="0.5" x2="4" y2="4" stroke="currentColor" strokeWidth="1"/><line x1="8" y1="0.5" x2="8" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="12" y1="0.5" x2="12" y2="4" stroke="currentColor" strokeWidth="1"/></svg>{formatDurationShort(task.duration)}</span>
                ) : null}
                {task.due_date ? (
                  <span className={`task-due-date${task.due_date < Date.now() && task.status === 'PENDING' ? ' overdue' : ''}`}>{formatDueDate(task.due_date)}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
