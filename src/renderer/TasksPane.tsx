import type { ReactNode, RefObject } from 'react';
import type { Task } from '../shared/types';
import type { EditMode, Pane } from './types';

interface TasksPaneProps {
  tasks: Task[];
  selectedTaskIndex: number;
  focusedPane: Pane;
  editMode: EditMode;
  editValue: string;
  setEditValue: (v: string) => void;
  setEditMode: (m: EditMode) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement>;
  headerName: string;
  selectedTaskIndices: Set<number>;
  shiftHeld: boolean;
  cmdHeld: boolean;
  boundaryCursor: number | null;
  onTaskClick: (index: number) => void;
  flashIds: Set<string>;
}

export function TasksPane({
  tasks,
  selectedTaskIndex,
  focusedPane,
  editMode,
  editValue,
  setEditValue,
  setEditMode,
  handleInputKeyDown,
  inputRef,
  headerName,
  selectedTaskIndices,
  shiftHeld,
  cmdHeld,
  boundaryCursor,
  onTaskClick,
  flashIds,
}: TasksPaneProps): ReactNode {
  return (
    <div className={`pane tasks-pane ${focusedPane === 'tasks' ? 'focused' : ''}`}>
      <h2>{headerName}</h2>
      <ul className="item-list">
        {tasks.map((task, i) => (
          <li
            key={task.id}
            className={`item ${i === selectedTaskIndex && !cmdHeld ? 'selected' : ''} ${selectedTaskIndices.has(i) ? 'multi-selected' : ''} ${shiftHeld && i === selectedTaskIndex ? 'cursor' : ''} ${cmdHeld && i === boundaryCursor ? 'cursor' : ''} ${flashIds.has(task.id) ? 'flash' : ''}`}
            onClick={() => onTaskClick(i)}
          >
            {editMode?.type === 'task' && editMode.index === i ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={() => setEditMode(null)}
                className="edit-input"
              />
            ) : (
              task.title
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
