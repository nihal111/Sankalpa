import { type ReactNode, type RefObject, useCallback, useRef } from 'react';
import type { List } from '../shared/types';
import type { SidebarItem, SmartList, EditMode, Pane } from './types';
import { SMART_LISTS, TRASH_SMART_LIST } from './types';
import { Icons } from './icons';

interface EditableItemNameProps {
  isEditing: boolean;
  name: string;
  editValue: string;
  setEditValue: (v: string) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditMode: (m: EditMode) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  badge?: number;
}

function EditableItemName({
  isEditing,
  name,
  editValue,
  setEditValue,
  handleInputKeyDown,
  setEditMode,
  inputRef,
  badge,
}: EditableItemNameProps): ReactNode {
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleInputKeyDown}
        onBlur={() => setEditMode(null)}
        className="edit-input"
      />
    );
  }
  return (
    <>
      <span className="item-name">{name}</span>
      {badge !== undefined && badge > 0 && <span className="item-badge">{badge}</span>}
    </>
  );
}

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
  inputRef: RefObject<HTMLInputElement | null>;
  taskCounts: Record<string, number>;
  onItemClick: (index: number) => void;
  onItemContextMenu: (index: number, x: number, y: number) => void;
  onFolderToggle: (folderId: string) => void;
  flashIds: Set<string>;
  trashIndex: number;
  sidebarDropTarget?: string | null;
  sidebarDropProps?: (listId: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  metaHeld: boolean;
  moveListMode: boolean;
  moveListTargetFolderId: string | null;
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
  onItemClick,
  onItemContextMenu,
  onFolderToggle,
  flashIds,
  trashIndex,
  sidebarDropTarget,
  sidebarDropProps,
  metaHeld,
  moveListMode,
  moveListTargetFolderId,
}: SidebarProps): ReactNode {
  const paneRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pane = paneRef.current;
    if (!pane) return;
    const startX = e.clientX;
    const startWidth = pane.offsetWidth;
    const onMouseMove = (ev: MouseEvent): void => {
      const newWidth = Math.max(160, Math.min(480, startWidth + ev.clientX - startX));
      pane.style.width = `${newWidth}px`;
    };
    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div ref={paneRef} className={`pane lists-pane ${focusedPane === 'lists' ? 'focused' : ''}`} data-meta-held={metaHeld || undefined}>
      <ul className="item-list">
        {sidebarItems.slice(0, SMART_LISTS.length).map((item, i) => {
          const smartItem = item as { type: 'smart'; smartList: SmartList };
          const isSelected = i === selectedSidebarIndex;
          const smartId = smartItem.smartList.id;
          const count = taskCounts[smartId] ?? 0;
          const overdueCount = smartId === 'today' ? (taskCounts['today_overdue'] ?? 0) : 0;
          const isOverdueList = smartId === 'overdue';
          const hasItems = count > 0 || overdueCount > 0;
          const showOverdueBadge = overdueCount > 0 || isOverdueList;
          const badgeCount = smartId === 'today' && overdueCount > 0 ? count : (count > 0 ? count : 0);
          return (
            <li key={smartId} className={`item smart-list ${hasItems ? 'has-items' : ''} ${isSelected ? 'selected' : ''}`} style={isOverdueList && !hasItems ? { display: 'none' } : undefined} onClick={() => onItemClick(i)}>
              <span className="item-icon" dangerouslySetInnerHTML={{ __html: smartItem.smartList.icon }} />
              <span className="item-name">{smartItem.smartList.name}</span>
              {badgeCount > 0 && <span className={`item-badge${showOverdueBadge ? ' overdue' : ''}`}>{badgeCount}</span>}
            </li>
          );
        })}
      </ul>
      <div className="sidebar-divider" />
      <ul className="item-list">
        {(() => { let listNum = 0; return sidebarItems.slice(SMART_LISTS.length, trashIndex).map((item, idx) => {
          const i = idx + SMART_LISTS.length;
          const isSelected = i === selectedSidebarIndex;
          const isMoveTarget = moveMode && i === moveTargetIndex;

          if (item.type === 'folder') {
            const isEditing = editMode?.type === 'folder' && editMode.id === item.folder.id;
            const folderIcon = item.folder.is_expanded ? Icons.folderOpen : Icons.folderClosed;
            return (
              <li key={item.folder.id} className={`item folder ${isSelected ? 'selected' : ''}`} data-move-list-target={moveListMode && moveListTargetFolderId === item.folder.id || undefined} onClick={() => onItemClick(i)}>
                <span className="item-icon" onClick={(e) => { e.stopPropagation(); onFolderToggle(item.folder.id); }} dangerouslySetInnerHTML={{ __html: folderIcon }} />
                <EditableItemName
                  isEditing={isEditing}
                  name={item.folder.name}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  handleInputKeyDown={handleInputKeyDown}
                  setEditMode={setEditMode}
                  inputRef={inputRef}
                />
                <span className="folder-chevron" onClick={(e) => { e.stopPropagation(); onFolderToggle(item.folder.id); }}>
                  <svg width="10" height="10" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {item.folder.is_expanded
                      ? <path d="M0 2 L4 6 L8 2" />
                      : <path d="M2 0 L6 4 L2 8" />
                    }
                  </svg>
                </span>
              </li>
            );
          }

          const listItem = item as { type: 'list'; list: List };
          listNum++;
          const isEditing = editMode?.type === 'list' && editMode.id === listItem.list.id;
          const isNested = listItem.list.folder_id !== null;
          const count = taskCounts[listItem.list.id] ?? 0;
          const drop = sidebarDropProps?.(listItem.list.id);
          const isDragTarget = sidebarDropTarget === listItem.list.id;
          return (
            <li key={listItem.list.id} className={`item list ${isSelected ? 'selected' : ''} ${isMoveTarget ? 'move-target' : ''} ${isNested ? 'nested' : ''} ${flashIds.has(listItem.list.id) ? 'flash' : ''} ${isDragTarget ? 'drag-drop-target' : ''}`} onClick={() => onItemClick(i)} onContextMenu={(e) => { e.preventDefault(); onItemContextMenu(i, e.clientX, e.clientY); }} {...drop}>
              <span className="item-icon" data-keycap={listNum} dangerouslySetInnerHTML={{ __html: Icons.list }} />
              <EditableItemName
                isEditing={isEditing}
                name={listItem.list.name}
                editValue={editValue}
                setEditValue={setEditValue}
                handleInputKeyDown={handleInputKeyDown}
                setEditMode={setEditMode}
                inputRef={inputRef}
                badge={count}
              />
            </li>
          );
        }); })()}
        {moveListMode && <li className="item folder" data-move-list-target={moveListTargetFolderId === null || undefined}><span className="item-icon" dangerouslySetInnerHTML={{ __html: Icons.folderClosed }} /><span className="item-name">No folder</span></li>}
      </ul>
      <div className="sidebar-spacer" />
      <ul className="item-list trash-list">
        <li
          key="trash"
          className={`item smart-list ${trashIndex === selectedSidebarIndex ? 'selected' : ''}`}
          onClick={() => onItemClick(trashIndex)}
        >
          <span className="item-icon" dangerouslySetInnerHTML={{ __html: TRASH_SMART_LIST.icon }} />
          <span className="item-name">{TRASH_SMART_LIST.name}</span>
        </li>
      </ul>
      <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} role="separator" aria-orientation="vertical" />
    </div>
  );
}
