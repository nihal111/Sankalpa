import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_MIME = 'application/x-sankalpa-task';

export interface DragState {
  dragOverIndex: number | null;
  dropPosition: 'before' | 'after' | null;
  sidebarDropTarget: string | null;
  dragOverListId: string | null;
}

export interface TaskInfo {
  id: string;
  sort_key: number;
  list_id: string | null;
}

interface UseDragDropParams {
  hardcoreMode: boolean;
  getTaskAtIndex: (index: number) => TaskInfo | undefined;
  getAdjacentSibling: (index: number, direction: 'before' | 'after') => TaskInfo | undefined;
  selectedTaskIndices: Set<number>;
  sidebarItems: { type: string; list?: { id: string } }[];
  reloadTasks: () => Promise<void>;
  reloadData: () => Promise<void>;
  setSelectedSidebarIndex: (i: number) => void;
  setFocusedPane: (pane: 'lists' | 'tasks') => void;
  setSelectedTaskIndex: (i: number) => void;
  flatTasks: { task: { id: string } }[];
  flash: (id: string) => void;
  moveFlash: (id: string) => void;
  undoPush: (entry: { undo: () => Promise<void>; redo: () => Promise<void> }) => void;
  multiSelectClear: () => void;
}

interface DragHandlers {
  state: DragState;
  taskDragProps: (index: number) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  sidebarDropProps: (listId: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  headerDropProps: (listId: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export function useDragDrop(params: UseDragDropParams): DragHandlers {
  const {
    hardcoreMode, getTaskAtIndex, getAdjacentSibling, selectedTaskIndices, sidebarItems,
    reloadTasks, reloadData, setSelectedSidebarIndex, setFocusedPane, setSelectedTaskIndex, flatTasks,
    flash, moveFlash, undoPush, multiSelectClear,
  } = params;

  const [dragState, setDragState] = useState<DragState>({ dragOverIndex: null, dropPosition: null, sidebarDropTarget: null, dragOverListId: null });
  const dragSourceIndex = useRef<number | null>(null);
  const pendingSelectId = useRef<string | null>(null);

  // Effect to select task after flatTasks updates
  useEffect(() => {
    if (pendingSelectId.current) {
      const idx = flatTasks.findIndex(ft => ft.task.id === pendingSelectId.current);
      if (idx >= 0) {
        setSelectedTaskIndex(idx);
        pendingSelectId.current = null;
      }
    }
  }, [flatTasks, setSelectedTaskIndex]);

  const reset = useCallback(() => {
    dragSourceIndex.current = null;
    setDragState({ dragOverIndex: null, dropPosition: null, sidebarDropTarget: null, dragOverListId: null });
  }, []);

  const getDraggedIndices = useCallback((): number[] => {
    if (selectedTaskIndices.size > 0 && selectedTaskIndices.has(dragSourceIndex.current ?? -1)) {
      return [...selectedTaskIndices].sort((a, b) => a - b);
    }
    return dragSourceIndex.current !== null ? [dragSourceIndex.current] : [];
  }, [selectedTaskIndices]);

  const taskDragProps = useCallback((index: number) => ({
    draggable: !hardcoreMode && !!getTaskAtIndex(index),
    onDragStart: (e: React.DragEvent) => {
      if (!getTaskAtIndex(index)) return;
      dragSourceIndex.current = index;
      e.dataTransfer.setData(DRAG_MIME, String(index));
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragSourceIndex.current === null) return;
      if (!getTaskAtIndex(index)) return;
      const indices = getDraggedIndices();
      if (indices.includes(index)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setDragState((s) => s.dragOverIndex === index && s.dropPosition === pos ? s : { dragOverIndex: index, dropPosition: pos as 'before' | 'after', sidebarDropTarget: null, dragOverListId: null });
    },
    onDragLeave: () => {
      setDragState((s) => s.dragOverIndex === index ? { dragOverIndex: null, dropPosition: null, sidebarDropTarget: null, dragOverListId: null } : s);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      const indices = getDraggedIndices();
      if (indices.length === 0 || indices.includes(index)) { 
        reset(); 
        return; 
      }

      const pos = dragState.dropPosition ?? (e.clientY < (e.currentTarget as HTMLElement).getBoundingClientRect().top + (e.currentTarget as HTMLElement).getBoundingClientRect().height / 2 ? 'before' : 'after');
      const targetTask = getTaskAtIndex(index);
      if (!targetTask) { reset(); return; }

      // Get adjacent siblings for sort key calculation (scoped to same parent)
      const beforeTask = getAdjacentSibling(index, 'before');
      const afterTask = getAdjacentSibling(index, 'after');
      const beforeKey = pos === 'before' ? (beforeTask?.sort_key ?? null) : targetTask.sort_key;
      const afterKey = pos === 'before' ? targetTask.sort_key : (afterTask?.sort_key ?? null);

      const draggedTasks = indices.map((i) => {
        const t = getTaskAtIndex(i)!;
        return { id: t.id, origSortKey: t.sort_key, origListId: t.list_id };
      });

      const needsMove = draggedTasks.some((dt) => dt.origListId !== targetTask.list_id);

      // Assign sort keys between before and after
      let newKeys: number[] = [];
      for (let j = 0; j < draggedTasks.length; j++) {
        const bk = j === 0 ? beforeKey : newKeys[j - 1];
        const ak = afterKey;
        let key = await window.api.calcSortKey(bk, ak);
        if (key === null) {
          // Precision exhausted - normalize and retry once
          await window.api.normalizeTaskSortKeys(targetTask.list_id);
          // After normalization, we need fresh sort keys - reload and recalculate
          await reloadTasks();
          // Get fresh target task sort_key after normalization
          const freshTarget = getTaskAtIndex(index);
          const freshBefore = getAdjacentSibling(index, 'before');
          const freshAfter = getAdjacentSibling(index, 'after');
          const freshBeforeKey = pos === 'before' ? (freshBefore?.sort_key ?? null) : freshTarget!.sort_key;
          const freshAfterKey = pos === 'before' ? freshTarget!.sort_key : (freshAfter?.sort_key ?? null);
          // Recalculate all keys from scratch with fresh values
          newKeys = [];
          for (let k = 0; k <= j; k++) {
            const fbk = k === 0 ? freshBeforeKey : newKeys[k - 1];
            key = await window.api.calcSortKey(fbk, freshAfterKey);
            if (key === null) { reset(); return; } // Still failing - give up
            newKeys.push(key);
          }
        } else {
          newKeys.push(key);
        }
      }

      for (let j = 0; j < draggedTasks.length; j++) {
        if (needsMove && draggedTasks[j].origListId !== targetTask.list_id) {
          if (targetTask.list_id !== null) {
            await window.api.tasksMove(draggedTasks[j].id, targetTask.list_id);
          } else {
            await window.api.tasksSetListId(draggedTasks[j].id, null);
          }
        }
        await window.api.tasksReorder(draggedTasks[j].id, newKeys[j]);
      }

      undoPush({
        undo: async () => {
          for (const dt of draggedTasks) {
            if (dt.origListId !== null) await window.api.tasksMove(dt.id, dt.origListId);
            else await window.api.tasksSetListId(dt.id, null);
            await window.api.tasksReorder(dt.id, dt.origSortKey);
          }
        },
        redo: async () => {
          for (let j = 0; j < draggedTasks.length; j++) {
            if (needsMove && draggedTasks[j].origListId !== targetTask.list_id) {
              if (targetTask.list_id !== null) await window.api.tasksMove(draggedTasks[j].id, targetTask.list_id);
              else await window.api.tasksSetListId(draggedTasks[j].id, null);
            }
            await window.api.tasksReorder(draggedTasks[j].id, newKeys[j]);
          }
        },
      });

      await reloadTasks();
      await reloadData();
      multiSelectClear();
      const firstDragged = draggedTasks[0];
      pendingSelectId.current = firstDragged.id;
      if (needsMove) moveFlash(firstDragged.id);
      else flash(firstDragged.id);
      reset();
    },
    onDragEnd: reset,
  }), [hardcoreMode, getTaskAtIndex, getAdjacentSibling, getDraggedIndices, dragState.dropPosition, reloadTasks, reloadData, flash, moveFlash, undoPush, multiSelectClear, reset]);

  const sidebarDropProps = useCallback((listId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragSourceIndex.current === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragState((s) => s.sidebarDropTarget === listId ? s : { dragOverIndex: null, dropPosition: null, sidebarDropTarget: listId, dragOverListId: null });
    },
    onDragLeave: () => {
      setDragState((s) => s.sidebarDropTarget === listId ? { dragOverIndex: null, dropPosition: null, sidebarDropTarget: null, dragOverListId: null } : s);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      const indices = getDraggedIndices();
      if (indices.length === 0) { reset(); return; }

      const draggedTasks = indices.map((i) => {
        const t = getTaskAtIndex(i)!;
        return { id: t.id, origListId: t.list_id, origSortKey: t.sort_key };
      });

      for (const dt of draggedTasks) {
        await window.api.tasksMove(dt.id, listId);
      }

      undoPush({
        undo: async () => {
          for (const dt of draggedTasks) {
            if (dt.origListId !== null) await window.api.tasksMove(dt.id, dt.origListId);
            else await window.api.tasksSetListId(dt.id, null);
            await window.api.tasksReorder(dt.id, dt.origSortKey);
          }
        },
        redo: async () => { for (const dt of draggedTasks) await window.api.tasksMove(dt.id, listId); },
      });

      multiSelectClear();
      const newIndex = sidebarItems.findIndex((item) => item.type === 'list' && item.list?.id === listId);
      if (newIndex >= 0) setSelectedSidebarIndex(newIndex);
      setFocusedPane('tasks');
      await reloadData();
      requestAnimationFrame(() => draggedTasks.forEach((dt) => moveFlash(dt.id)));
      reset();
    },
  }), [getTaskAtIndex, getDraggedIndices, sidebarItems, reloadData, setSelectedSidebarIndex, setFocusedPane, moveFlash, undoPush, multiSelectClear, reset]);

  const headerDropProps = useCallback((listId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragSourceIndex.current === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragState((s) => s.dragOverListId === listId ? s : { dragOverIndex: null, dropPosition: null, sidebarDropTarget: null, dragOverListId: listId });
    },
    onDragLeave: () => {
      setDragState((s) => s.dragOverListId === listId ? { dragOverIndex: null, dropPosition: null, sidebarDropTarget: null, dragOverListId: null } : s);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      const indices = getDraggedIndices();
      if (indices.length === 0) { reset(); return; }

      const draggedTasks = indices.map((i) => {
        const t = getTaskAtIndex(i)!;
        return { id: t.id, origListId: t.list_id, origSortKey: t.sort_key };
      });

      // Move tasks to the target list (at the end)
      const newKeys: number[] = [];
      for (let j = 0; j < draggedTasks.length; j++) {
        const bk = j === 0 ? null : newKeys[j - 1];
        const sortKey = await window.api.calcSortKey(bk, null);
        newKeys.push(sortKey ?? 1);
        if (draggedTasks[j].origListId !== listId) {
          await window.api.tasksMove(draggedTasks[j].id, listId);
        }
        await window.api.tasksReorder(draggedTasks[j].id, newKeys[j]);
      }

      undoPush({
        undo: async () => {
          for (const dt of draggedTasks) {
            if (dt.origListId !== null) await window.api.tasksMove(dt.id, dt.origListId);
            else await window.api.tasksSetListId(dt.id, null);
            await window.api.tasksReorder(dt.id, dt.origSortKey);
          }
        },
        redo: async () => {
          for (let j = 0; j < draggedTasks.length; j++) {
            if (draggedTasks[j].origListId !== listId) await window.api.tasksMove(draggedTasks[j].id, listId);
            await window.api.tasksReorder(draggedTasks[j].id, newKeys[j]);
          }
        },
      });

      multiSelectClear();
      await reloadTasks();
      await reloadData();
      requestAnimationFrame(() => draggedTasks.forEach((dt) => moveFlash(dt.id)));
      reset();
    },
  }), [getTaskAtIndex, getDraggedIndices, reloadTasks, reloadData, moveFlash, undoPush, multiSelectClear, reset]);

  return { state: dragState, taskDragProps, sidebarDropProps, headerDropProps };
}
