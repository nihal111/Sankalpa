export interface Folder {
  id: string;
  name: string;
  sort_key: number;
  is_expanded: number; // SQLite boolean (0 or 1)
  created_at: number;
  updated_at: number;
}

export interface List {
  id: string;
  folder_id: string | null;
  name: string;
  notes: string | null;
  sort_key: number;
  created_at: number;
  updated_at: number;
}

export interface Task {
  id: string;
  list_id: string | null;
  title: string;
  status: 'PENDING' | 'COMPLETED';
  created_timestamp: number;
  completed_timestamp: number | null;
  due_date: number | null;
  duration: number | null; // duration in minutes
  notes: string | null;
  sort_key: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  parent_id: string | null;
  is_expanded: number; // SQLite boolean (0 or 1)
}

export interface Api {
  onQuickAdd: (callback: () => void) => () => void;

  foldersGetAll: () => Promise<Folder[]>;
  foldersCreate: (id: string, name: string) => Promise<Folder>;
  foldersUpdate: (id: string, name: string) => Promise<void>;
  foldersDelete: (id: string) => Promise<void>;
  foldersToggleExpanded: (id: string) => Promise<void>;

  listsGetAll: () => Promise<List[]>;
  listsCreate: (id: string, name: string, folderId?: string) => Promise<List>;
  listsUpdate: (id: string, name: string) => Promise<void>;
  listsUpdateNotes: (id: string, notes: string | null) => Promise<void>;
  listsDelete: (id: string) => Promise<void>;
  listsReorder: (id: string, sortKey: number) => Promise<void>;
  listsMove: (id: string, folderId: string | null) => Promise<void>;
  listsGetTaskCount: (listId: string) => Promise<number>;

  tasksGetInbox: () => Promise<Task[]>;
  tasksGetCompleted: () => Promise<Task[]>;
  tasksGetInboxCount: () => Promise<number>;
  tasksGetByList: (listId: string) => Promise<Task[]>;
  tasksGetTrashed: () => Promise<Task[]>;
  tasksGetAll: () => Promise<Task[]>;
  tasksCreate: (id: string, listId: string | null, title: string) => Promise<Task>;
  tasksUpdate: (id: string, title: string) => Promise<void>;
  tasksToggleCompleted: (id: string) => Promise<void>;
  tasksDelete: (id: string) => Promise<void>;
  tasksSoftDelete: (id: string) => Promise<void>;
  tasksRestoreFromTrash: (id: string) => Promise<void>;
  tasksReorder: (id: string, sortKey: number) => Promise<void>;
  tasksMove: (id: string, newListId: string) => Promise<void>;
  tasksRestore: (id: string, listId: string | null, title: string, status: string, createdTimestamp: number, completedTimestamp: number | null, sortKey: number, createdAt: number, updatedAt: number, deletedAt?: number | null) => Promise<void>;
  tasksSetListId: (id: string, listId: string | null) => Promise<void>;
  tasksSetDueDate: (id: string, dueDate: number | null) => Promise<void>;
  tasksSetDuration: (id: string, duration: number | null) => Promise<void>;
  tasksUpdateNotes: (id: string, notes: string | null) => Promise<void>;
  tasksGetDueBetween: (start: number, end: number) => Promise<Task[]>;
  tasksGetOverdue: (before: number) => Promise<Task[]>;
  tasksGetUpcoming: (from: number) => Promise<Task[]>;
  tasksSetParentId: (id: string, parentId: string | null) => Promise<void>;
  tasksToggleExpanded: (id: string) => Promise<void>;
  tasksGetDescendants: (id: string) => Promise<Task[]>;

  listsRestore: (id: string, folderId: string | null, name: string, sortKey: number, createdAt: number, updatedAt: number) => Promise<void>;

  calcSortKey: (before: number | null, after: number | null) => Promise<number>;

  settingsGetAll: () => Promise<Record<string, string>>;
  settingsSet: (key: string, value: string) => Promise<void>;

  trashPurge: (retentionDays: number | null) => Promise<void>;
}

declare global {
  interface Window {
    api: Api;
  }
}

export {};
