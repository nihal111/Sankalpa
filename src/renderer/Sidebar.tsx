import type { RefObject } from 'react';
import type { List } from '../shared/types';
import type { SidebarItem, SmartList, EditMode, Pane } from './types';
import { SMART_LISTS } from './types';
import { Icons } from './icons';

interface SidebarProps {
  sidebarItems: SidebarItem[];
  selectedSidebarIndex: number;
  focusedPane: Pane;
  moveMode: boolean;
  moveTargetIndex: number;
  editMode: EditMode;
  editValue: string;
  setEditValue: (v: string) => void;
  setEditMode: (m: EditMode) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement>;
  taskCounts: Record<string, number>;
}

export function Sidebar({
  sidebarItems,
  selectedSidebarIndex,
  focusedPane,
  moveMode,
  moveTargetIndex,
  editMode,
  editValue,
  setEditValue,
  setEditMode,
  handleInputKeyDown,
  inputRef,
  taskCounts,
}: SidebarProps): JSX.Element {
  return (
    <div className={`pane lists-pane ${focusedPane === 'lists' ? 'focused' : ''}`}>
      <ul className="item-list">
        {sidebarItems.slice(0, SMART_LISTS.length).map((item, i) => {
          const smartItem = item as { type: 'smart'; smartList: SmartList };
          const isSelected = i === selectedSidebarIndex;
          return (
            <li key={smartItem.smartList.id} className={`item smart-list ${isSelected ? 'selected' : ''}`}>
              <span className="item-icon" dangerouslySetInnerHTML={{ __html: smartItem.smartList.icon }} />
              <span className="item-name">{smartItem.smartList.name}</span>
            </li>
          );
        })}
      </ul>
      <div className="sidebar-divider" />
      <ul className="item-list">
        {sidebarItems.slice(SMART_LISTS.length).map((item, idx) => {
          const i = idx + SMART_LISTS.length;
          const isSelected = i === selectedSidebarIndex;
          const isMoveTarget = moveMode && i === moveTargetIndex;

          if (item.type === 'folder') {
            const isEditing = editMode?.type === 'folder' && editMode.id === item.folder.id;
            const folderIcon = item.folder.is_expanded ? Icons.folderOpen : Icons.folderClosed;
            return (
              <li key={item.folder.id} className={`item folder ${isSelected ? 'selected' : ''}`}>
                <span className="item-icon" dangerouslySetInnerHTML={{ __html: folderIcon }} />
                {isEditing ? (
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
                  <span className="item-name">{item.folder.name}</span>
                )}
              </li>
            );
          }

          const listItem = item as { type: 'list'; list: List };
          const isEditing = editMode?.type === 'list' && editMode.id === listItem.list.id;
          const isNested = listItem.list.folder_id !== null;
          const count = taskCounts[listItem.list.id] ?? 0;
          return (
            <li key={listItem.list.id} className={`item list ${isSelected ? 'selected' : ''} ${isMoveTarget ? 'move-target' : ''} ${isNested ? 'nested' : ''}`}>
              <span className="item-icon" dangerouslySetInnerHTML={{ __html: Icons.list }} />
              {isEditing ? (
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
                <>
                  <span className="item-name">{listItem.list.name}</span>
                  {count > 0 && <span className="item-badge">{count}</span>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
