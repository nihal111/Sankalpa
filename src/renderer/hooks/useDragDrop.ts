import { useCallback, useRef, useState } from 'react';

const DRAG_MIME = 'application/x-sankalpa-task';

export interface DragState {
  dragOverIndex: number | null;
  dropPosition: 'before' | 'after' | null;
  sidebarDropTarget: string | null;
}

interface UseDragDropParams {
  hardcoreMode: boolean;
  tasks: { id: string; sort_key: number; list_id: string | null }[];
  flatTasksLength: number;
  selectedTaskIndex: number;
  selectedTaskIndices: Set<number>;
  sidebarItems: { type: string; list?: { id: string } }[];
  reloadTasks: () => Promise<void>;
  reloadData: () => Promise<void>;
  setSelectedTaskIndex: (i: number | ((prev: number) => number)) => void;
  setSelectedSidebarIndex: (i: number) => void;
  setFocusedPane: (pane: 'lists' | 'tasks') => void;
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
}

export function useDragDrop(params: UseDragDropParams): DragHandlers {
  const {
    hardcoreMode, tasks, selectedTaskIndices, sidebarItems,
    reloadTasks, reloadData, setSelectedSidebarIndex, setFocusedPane,
    flash, moveFlash, undoPush, multiSelectClear,
  } = params;

  const [dragState, setDragState] = useState<DragState>({ dragOverIndex: null, dropPosition: null, sidebarDropTarget: null });
  const dragSourceIndex = useRef<number | null>(null);

  const reset = useCallback(() => {
    dragSourceIndex.current = null;
    setDragState({ dragOverIndex: null, dropPosition: null, sidebarDropTarget: null });
  }, []);

  const getDraggedIndices = useCallback((): number[] => {
    if (selectedTaskIndices.size > 0 && selectedTaskIndices.has(dragSourceIndex.current ?? -1)) {
      return [...selectedTaskIndices].sort((a, b) => a - b);
    }
    return dragSourceIndex.current !== null ? [dragSourceIndex.current] : [];
  }, [selectedTaskIndices]);

  const taskDragProps = useCallback((index: number) => ({
    draggable: !hardcoreMode,
    onDragStart: (e: React.DragEvent) => {
      dragSourceIndex.current = index;
      e.dataTransfer.setData(DRAG_MIME, String(index));
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragSourceIndex.current === null) return;
      const indices = getDraggedIndices();
      if (indices.includes(index)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setDragState((s) => s.dragOverIndex === index && s.dropPosition === pos ? s : { dragOverIndex: index, dropPosition: pos as 'before' | 'after', sidebarDropTarget: null });
    },
    onDragLeave: () => {
      setDragState((s) => s.dragOverIndex === index ? { dragOverIndex: null, dropPosition: null, sidebarDropTarget: null } : s);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      const indices = getDraggedIndices();
      if (indices.length === 0 || indices.includes(index)) { reset(); return; }

      const pos = dragState.dropPosition ?? (e.clientY < (e.currentTarget as HTMLElement).getBoundingClientRect().top + (e.currentTarget as HTMLElement).getBoundingClientRect().height / 2 ? 'before' : 'after');
      const targetIdx = pos === 'after' ? index : index;
      const targetTask = tasks[targetIdx];
      if (!targetTask) { reset(); return; }

      // Compute new sort key
      const beforeIdx = pos === 'before' ? targetIdx - 1 : targetIdx;
      const afterIdx = pos === 'before' ? targetIdx : targetIdx + 1;
      const beforeKey = beforeIdx >= 0 ? tasks[beforeIdx].sort_key : null;
      const afterKey = afterIdx < tasks.length ? tasks[afterIdx].sort_key : null;

      const draggedTasks = indices.map((i) => ({ id: tasks[i].id, origSortKey: tasks[i].sort_key }));

      // Assign sort keys between before and after, spacing evenly
      const newKeys: number[] = [];
      for (let j = 0; j < draggedTasks.length; j++) {
        const bk = j === 0 ? beforeKey : newKeys[j - 1];
        const ak = afterKey;
        newKeys.push(await window.api.calcSortKey(bk, ak));
      }

      for (let j = 0; j < draggedTasks.length; j++) {
        await window.api.tasksReorder(draggedTasks[j].id, newKeys[j]);
      }

      undoPush({
        undo: async () => { for (const dt of draggedTasks) await window.api.tasksReorder(dt.id, dt.origSortKey); },
        redo: async () => { for (let j = 0; j < draggedTasks.length; j++) await window.api.tasksReorder(draggedTasks[j].id, newKeys[j]); },
      });

      await reloadTasks();
      multiSelectClear();
      const firstDragged = draggedTasks[0];
      flash(firstDragged.id);
      reset();
    },
    onDragEnd: reset,
  }), [hardcoreMode, tasks, getDraggedIndices, dragState.dropPosition, reloadTasks, flash, undoPush, multiSelectClear, reset]);

  const sidebarDropProps = useCallback((listId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragSourceIndex.current === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragState((s) => s.sidebarDropTarget === listId ? s : { dragOverIndex: null, dropPosition: null, sidebarDropTarget: listId });
    },
    onDragLeave: () => {
      setDragState((s) => s.sidebarDropTarget === listId ? { dragOverIndex: null, dropPosition: null, sidebarDropTarget: null } : s);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      const indices = getDraggedIndices();
      if (indices.length === 0) { reset(); return; }

      const draggedTasks = indices.map((i) => ({
        id: tasks[i].id,
        origListId: tasks[i].list_id,
        origSortKey: tasks[i].sort_key,
      }));

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
  }), [tasks, getDraggedIndices, sidebarItems, reloadData, setSelectedSidebarIndex, setFocusedPane, moveFlash, undoPush, multiSelectClear, reset]);

  return { state: dragState, taskDragProps, sidebarDropProps };
}
