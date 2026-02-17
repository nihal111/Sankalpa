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
  sort_key: number;
  created_at: number;
  updated_at: number;
}

export interface Task {
  id: string;
  list_id: string;
  title: string;
  sort_key: number;
  created_at: number;
  updated_at: number;
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
  listsDelete: (id: string) => Promise<void>;
  listsReorder: (id: string, sortKey: number) => Promise<void>;
  listsMove: (id: string, folderId: string | null) => Promise<void>;
  listsGetTaskCount: (listId: string) => Promise<number>;

  tasksGetByList: (listId: string) => Promise<Task[]>;
  tasksCreate: (id: string, listId: string, title: string) => Promise<Task>;
  tasksUpdate: (id: string, title: string) => Promise<void>;
  tasksDelete: (id: string) => Promise<void>;
  tasksReorder: (id: string, sortKey: number) => Promise<void>;
  tasksMove: (id: string, newListId: string) => Promise<void>;

  calcSortKey: (before: number | null, after: number | null) => Promise<number>;
}

declare global {
  interface Window {
    api: Api;
  }
}

export {};
