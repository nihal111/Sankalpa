import { useCallback, useState } from 'react';
import type { Task } from '../../shared/types';

interface UseNotesStateParams {
  selectedTask: Task | null;
  reloadTasks: () => Promise<void>;
}

export function useNotesState({ selectedTask, reloadTasks }: UseNotesStateParams): {
  notesEditing: boolean;
  handleStartNotesEdit: () => void;
  handleNotesCommit: (value: string) => Promise<void>;
  handleNotesCancelEdit: () => void;
} {
  const [notesEditing, setNotesEditing] = useState(false);

  const handleStartNotesEdit = useCallback(() => { if (selectedTask) setNotesEditing(true); }, [selectedTask]);

  const handleNotesCommit = useCallback(async (value: string) => {
    if (!selectedTask) return;
    await window.api.tasksUpdateNotes(selectedTask.id, value.trim() || null);
    await reloadTasks();
    setNotesEditing(false);
  }, [selectedTask, reloadTasks]);

  const handleNotesCancelEdit = useCallback(() => { setNotesEditing(false); }, []);

  return { notesEditing, handleStartNotesEdit, handleNotesCommit, handleNotesCancelEdit };
}
