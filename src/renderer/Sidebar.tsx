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
  cmdHeld: boolean;
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
  cmdHeld,
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
    <div ref={paneRef} className={`pane lists-pane ${focusedPane === 'lists' ? 'focused' : ''}`}>
      <ul className="item-list">
        {sidebarItems.slice(0, SMART_LISTS.length).map((item, i) => {
          const smartItem = item as { type: 'smart'; smartList: SmartList };
          const isSelected = i === selectedSidebarIndex;
          const count = taskCounts[smartItem.smartList.id] ?? 0;
          const hasItems = count > 0;
          const showBadge = count > 0;
          return (
            <li key={smartItem.smartList.id} className={`item smart-list ${hasItems ? 'has-items' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => onItemClick(i)}>
              <span className="item-icon" dangerouslySetInnerHTML={{ __html: smartItem.smartList.icon }} />
              <span className="item-name">{smartItem.smartList.name}</span>
              {showBadge && <span className="item-badge">{count}</span>}
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
              <li key={item.folder.id} className={`item folder ${isSelected ? 'selected' : ''}`} onClick={() => onItemClick(i)}>
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
              </li>
            );
          }

          const listItem = item as { type: 'list'; list: List };
          listNum++;
          const keycap = cmdHeld && listNum <= 9 ? listNum : null;
          const isEditing = editMode?.type === 'list' && editMode.id === listItem.list.id;
          const isNested = listItem.list.folder_id !== null;
          const count = taskCounts[listItem.list.id] ?? 0;
          const drop = sidebarDropProps?.(listItem.list.id);
          const isDragTarget = sidebarDropTarget === listItem.list.id;
          return (
            <li key={listItem.list.id} className={`item list ${isSelected ? 'selected' : ''} ${isMoveTarget ? 'move-target' : ''} ${isNested ? 'nested' : ''} ${flashIds.has(listItem.list.id) ? 'flash' : ''} ${isDragTarget ? 'drag-drop-target' : ''}`} onClick={() => onItemClick(i)} onContextMenu={(e) => { e.preventDefault(); onItemContextMenu(i, e.clientX, e.clientY); }} {...drop}>
              <span className="item-icon" dangerouslySetInnerHTML={{ __html: Icons.list }} />
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
              {keycap && <span className="keycap-badge">{keycap}</span>}
            </li>
          );
        }); })()}
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
