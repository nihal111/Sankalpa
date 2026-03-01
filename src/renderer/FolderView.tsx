import type { ReactNode } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { List, Task } from '../shared/types';
import { flattenWithDepth } from './utils/taskTree';

interface FolderViewProps {
  folderName: string;
  folderId: string;
  lists: List[];
  focusedPane: string;
}

interface ListSection {
  list: List;
  tasks: Task[];
  expanded: boolean;
}

export function FolderView({ folderName, folderId, lists, focusedPane }: FolderViewProps): ReactNode {
  const [sections, setSections] = useState<ListSection[]>([]);

  const folderLists = useMemo(() => lists.filter((l) => l.folder_id === folderId), [lists, folderId]);

  useEffect(() => {
    let stale = false;
    Promise.all(folderLists.map(async (list) => {
      const tasks = await window.api.tasksGetByList(list.id);
      return { list, tasks, expanded: true };
    })).then((result) => {
      if (!stale) setSections(result);
    });
    return () => { stale = true; };
  }, [folderLists]);

  return (
    <div className={`pane tasks-pane ${focusedPane === 'tasks' ? 'focused' : ''}`}>
      <h2><svg className="header-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>{folderName}</h2>
      {sections.length === 0 ? (
        <ul className="item-list">
          <li className="empty-list-hint">
            Hit <span className="hotkey-badge">⌘</span> <span className="hotkey-badge">shift</span> <span className="hotkey-badge">N</span> to create a new list
          </li>
        </ul>
      ) : (
        <div className="folder-sections">
          {sections.map((section) => {
            const flat = section.expanded ? flattenWithDepth(section.tasks) : [];
            return (
              <div key={section.list.id} className="folder-section">
                <div className="folder-section-header" onClick={() => setSections((prev) => prev.map((s) => s.list.id === section.list.id ? { ...s, expanded: !s.expanded } : s))}>
                  <svg className={`folder-section-chevron ${section.expanded ? 'expanded' : ''}`} width="10" height="10" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 0 L6 4 L2 8" />
                  </svg>
                  <span className="folder-section-name">{section.list.name}</span>
                </div>
                {section.expanded && flat.map((flatTask) => {
                  const task = flatTask.task;
                  return (
                    <div key={task.id} className="folder-section-task" style={{ paddingLeft: `${24 + flatTask.depth * 16}px` }}>
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        readOnly
                        aria-label={`${task.title || 'untitled task'}`}
                      />
                      <span className={`folder-task-title ${task.status === 'COMPLETED' ? 'completed' : ''}`}>{task.title || '\u00A0'}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
