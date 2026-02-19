import { useRef, useCallback } from 'react';

export interface UndoEntry {
  execute: () => Promise<void>;
}

export interface UndoStack {
  push: (entry: UndoEntry) => void;
  undo: () => Promise<boolean>;
}

export function useUndoStack(afterUndo: () => Promise<void>): UndoStack {
  const stackRef = useRef<UndoEntry[]>([]);

  const push = useCallback((entry: UndoEntry) => {
    stackRef.current.push(entry);
  }, []);

  const undo = useCallback(async (): Promise<boolean> => {
    const entry = stackRef.current.pop();
    if (!entry) return false;
    await entry.execute();
    await afterUndo();
    return true;
  }, [afterUndo]);

  return { push, undo };
}
