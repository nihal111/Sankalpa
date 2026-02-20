import { useRef, useCallback } from 'react';

export interface UndoEntry {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export interface UndoStack {
  push: (entry: UndoEntry) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
}

export function useUndoStack(afterUndo: () => Promise<void>): UndoStack {
  const undoRef = useRef<UndoEntry[]>([]);
  const redoRef = useRef<UndoEntry[]>([]);

  const push = useCallback((entry: UndoEntry) => {
    undoRef.current.push(entry);
    redoRef.current = [];
  }, []);

  const undo = useCallback(async (): Promise<boolean> => {
    const entry = undoRef.current.pop();
    if (!entry) return false;
    await entry.undo();
    redoRef.current.push(entry);
    await afterUndo();
    return true;
  }, [afterUndo]);

  const redo = useCallback(async (): Promise<boolean> => {
    const entry = redoRef.current.pop();
    if (!entry) return false;
    await entry.redo();
    undoRef.current.push(entry);
    await afterUndo();
    return true;
  }, [afterUndo]);

  return { push, undo, redo };
}
