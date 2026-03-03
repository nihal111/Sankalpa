import initSqlJs, { Database } from 'sql.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initSchema } from './schema';
import {
  getAllFolders, createFolder, updateFolder, deleteFolder, toggleFolderExpanded, reorderFolder,
  getAllLists, createList, updateList, deleteList, reorderList, moveList, getTaskCount, updateListNotes, normalizeListSortKeys,
  getInboxTasks, getInboxTaskCount, getCompletedTasks, getTasksByList, createTask, updateTask, toggleTaskCompleted, deleteTask, reorderTask, moveTask,
  restoreList, setTaskDueDate, setTaskDuration, getTasksDueBetween, getOverdueTasks, getUpcomingTasks,
  getSetting, setSetting, getAllSettings,
  restoreTask, setTaskListId, softDeleteTask, restoreFromTrash, getTrashedTasks, updateTaskNotes,
  setTaskParentId, toggleTaskExpanded, getTaskDescendants, getAllTasks, purgeExpiredTrash,
  normalizeAllTaskSortKeys,
} from './queries';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

beforeAll(async () => {
  SQL = await initSqlJs();
});

function createTestDb(): Database {
  const db = new SQL.Database();
  initSchema(db);
  return db;
}

describe('folders', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates and retrieves folders', () => {
    createFolder(db, 'f1', 'Folder 1');
    createFolder(db, 'f2', 'Folder 2');

    const folders = getAllFolders(db);
    expect(folders).toHaveLength(2);
    expect(folders[0].name).toBe('Folder 1');
    expect(folders[0].is_expanded).toBe(1);
  });

  it('updates folder name', () => {
    createFolder(db, 'f1', 'Old');
    updateFolder(db, 'f1', 'New');

    const folders = getAllFolders(db);
    expect(folders[0].name).toBe('New');
  });

  it('toggles folder expanded state', () => {
    createFolder(db, 'f1', 'Folder');
    toggleFolderExpanded(db, 'f1');

    let folders = getAllFolders(db);
    expect(folders[0].is_expanded).toBe(0);

    toggleFolderExpanded(db, 'f1');
    folders = getAllFolders(db);
    expect(folders[0].is_expanded).toBe(1);
  });

  it('reorders folder', () => {
    createFolder(db, 'f1', 'Folder');
    reorderFolder(db, 'f1', 99);

    const folders = getAllFolders(db);
    expect(folders[0].sort_key).toBe(99);
  });

  it('deletes folder and moves lists to top level', () => {
    createFolder(db, 'f1', 'Folder');
    createList(db, 'l1', 'List', 'f1');
    deleteFolder(db, 'f1');

    expect(getAllFolders(db)).toHaveLength(0);
    const lists = getAllLists(db);
    expect(lists[0].folder_id).toBeNull();
  });
});

describe('lists', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates and retrieves lists', () => {
    createList(db, 'l1', 'List 1');
    createList(db, 'l2', 'List 2');

    const lists = getAllLists(db);
    expect(lists).toHaveLength(2);
    expect(lists[0].name).toBe('List 1');
    expect(lists[1].name).toBe('List 2');
  });

  it('creates list in folder', () => {
    createFolder(db, 'f1', 'Folder');
    createList(db, 'l1', 'List', 'f1');

    const lists = getAllLists(db);
    expect(lists[0].folder_id).toBe('f1');
  });

  it('assigns incrementing sort_keys', () => {
    createList(db, 'l1', 'A');
    createList(db, 'l2', 'B');

    const lists = getAllLists(db);
    expect(lists[0].sort_key).toBe(1);
    expect(lists[1].sort_key).toBe(2);
  });

  it('normalizes list sort keys', () => {
    createList(db, 'l1', 'A');
    createList(db, 'l2', 'B');
    reorderList(db, 'l1', 100);
    normalizeListSortKeys(db);

    const lists = getAllLists(db);
    expect(lists[0].sort_key).toBe(1);
    expect(lists[1].sort_key).toBe(2);
  });

  it('updates list name', () => {
    createList(db, 'l1', 'Old');
    updateList(db, 'l1', 'New');

    const lists = getAllLists(db);
    expect(lists[0].name).toBe('New');
  });

  it('deletes list and its tasks', () => {
    createList(db, 'l1', 'List');
    createTask(db, 't1', 'l1', 'Task');
    deleteList(db, 'l1');

    expect(getAllLists(db)).toHaveLength(0);
    expect(getTasksByList(db, 'l1')).toHaveLength(0);
  });

  it('reorders list', () => {
    createList(db, 'l1', 'A');
    createList(db, 'l2', 'B');
    reorderList(db, 'l2', 0.5);

    const lists = getAllLists(db);
    expect(lists[0].id).toBe('l2');
    expect(lists[1].id).toBe('l1');
  });

  it('moves list to folder', () => {
    createFolder(db, 'f1', 'Folder');
    createList(db, 'l1', 'List');
    moveList(db, 'l1', 'f1');

    const lists = getAllLists(db);
    expect(lists[0].folder_id).toBe('f1');
  });

  it('gets task count', () => {
    createList(db, 'l1', 'List');
    createTask(db, 't1', 'l1', 'Task 1');
    createTask(db, 't2', 'l1', 'Task 2');

    expect(getTaskCount(db, 'l1')).toBe(2);
  });

  it('returns 0 for non-existent list', () => {
    expect(getTaskCount(db, 'nonexistent')).toBe(0);
  });
});

describe('tasks', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    createList(db, 'inbox', 'Inbox');
    createList(db, 'work', 'Work');
  });

  it('creates and retrieves tasks by list', () => {
    createTask(db, 't1', 'inbox', 'Task 1');
    createTask(db, 't2', 'inbox', 'Task 2');
    createTask(db, 't3', 'work', 'Task 3');

    expect(getTasksByList(db, 'inbox')).toHaveLength(2);
    expect(getTasksByList(db, 'work')).toHaveLength(1);
  });

  it('assigns incrementing sort_keys per list', () => {
    createTask(db, 't1', 'inbox', 'A');
    createTask(db, 't2', 'inbox', 'B');
    createTask(db, 't3', 'work', 'C');

    const inboxTasks = getTasksByList(db, 'inbox');
    expect(inboxTasks[0].sort_key).toBe(1);
    expect(inboxTasks[1].sort_key).toBe(2);

    const workTasks = getTasksByList(db, 'work');
    expect(workTasks[0].sort_key).toBe(1);
  });

  it('updates task title', () => {
    createTask(db, 't1', 'inbox', 'Old');
    updateTask(db, 't1', 'New');

    const tasks = getTasksByList(db, 'inbox');
    expect(tasks[0].title).toBe('New');
  });

  it('deletes task', () => {
    createTask(db, 't1', 'inbox', 'Task');
    deleteTask(db, 't1');

    expect(getTasksByList(db, 'inbox')).toHaveLength(0);
  });

  it('reorders task', () => {
    createTask(db, 't1', 'inbox', 'A');
    createTask(db, 't2', 'inbox', 'B');
    reorderTask(db, 't2', 0.5);

    const tasks = getTasksByList(db, 'inbox');
    expect(tasks[0].id).toBe('t2');
    expect(tasks[1].id).toBe('t1');
  });

  it('moves task to another list', () => {
    createTask(db, 't1', 'inbox', 'Task');
    moveTask(db, 't1', 'work');

    expect(getTasksByList(db, 'inbox')).toHaveLength(0);
    expect(getTasksByList(db, 'work')).toHaveLength(1);
    expect(getTasksByList(db, 'work')[0].list_id).toBe('work');
  });

  it('moved task gets sort_key at end of new list', () => {
    createTask(db, 't1', 'work', 'Existing');
    createTask(db, 't2', 'inbox', 'Moving');
    moveTask(db, 't2', 'work');

    const tasks = getTasksByList(db, 'work');
    expect(tasks[1].id).toBe('t2');
    expect(tasks[1].sort_key).toBe(2);
  });

  it('moves task with descendants to another list', () => {
    createTask(db, 'parent', 'inbox', 'Parent');
    createTask(db, 'child', 'inbox', 'Child');
    setTaskParentId(db, 'child', 'parent');
    createTask(db, 'grandchild', 'inbox', 'Grandchild');
    setTaskParentId(db, 'grandchild', 'child');

    moveTask(db, 'parent', 'work');

    expect(getTasksByList(db, 'inbox')).toHaveLength(0);
    const workTasks = getTasksByList(db, 'work');
    expect(workTasks).toHaveLength(3);
    expect(workTasks.map(t => t.id).sort()).toEqual(['child', 'grandchild', 'parent']);
  });

  it('creates inbox task with null list_id', () => {
    createTask(db, 't1', null, 'Inbox Task');
    const tasks = getInboxTasks(db);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].list_id).toBeNull();
    expect(tasks[0].title).toBe('Inbox Task');
  });

  it('getInboxTaskCount returns count of inbox tasks', () => {
    createTask(db, 't1', null, 'Inbox 1');
    createTask(db, 't2', null, 'Inbox 2');
    createTask(db, 't3', 'inbox', 'List Task');
    expect(getInboxTaskCount(db)).toBe(2);
  });

  it('toggleTaskCompleted marks task as completed and back', () => {
    createTask(db, 't1', 'inbox', 'Task');
    toggleTaskCompleted(db, 't1');
    const completed = getTasksByList(db, 'inbox');
    expect(completed[0].status).toBe('COMPLETED');
    expect(completed[0].completed_timestamp).not.toBeNull();

    toggleTaskCompleted(db, 't1');
    const pending = getTasksByList(db, 'inbox');
    expect(pending[0].status).toBe('PENDING');
    expect(pending[0].completed_timestamp).toBeNull();
  });

  it('getCompletedTasks returns only completed tasks', () => {
    createTask(db, 't1', 'inbox', 'Done');
    createTask(db, 't2', 'inbox', 'Not Done');
    toggleTaskCompleted(db, 't1');
    const completed = getCompletedTasks(db);
    expect(completed).toHaveLength(1);
    expect(completed[0].title).toBe('Done');
  });

  it('setTaskDueDate sets and clears due date', () => {
    createTask(db, 't1', 'inbox', 'Task');
    setTaskDueDate(db, 't1', 1000);
    expect(getTasksByList(db, 'inbox')[0].due_date).toBe(1000);
    setTaskDueDate(db, 't1', null);
    expect(getTasksByList(db, 'inbox')[0].due_date).toBeNull();
  });

  it('setTaskDuration sets and clears duration', () => {
    createTask(db, 't1', 'inbox', 'Task');
    setTaskDuration(db, 't1', 60);
    expect(getTasksByList(db, 'inbox')[0].duration).toBe(60);
    setTaskDuration(db, 't1', null);
    expect(getTasksByList(db, 'inbox')[0].duration).toBeNull();
  });

  it('getOverdueTasks returns tasks due before given time', () => {
    createTask(db, 't1', 'inbox', 'Overdue');
    createTask(db, 't2', 'inbox', 'Future');
    setTaskDueDate(db, 't1', 100);
    setTaskDueDate(db, 't2', 500);
    const overdue = getOverdueTasks(db, 300);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('t1');
  });

  it('getTasksDueBetween returns tasks in range', () => {
    createTask(db, 't1', 'inbox', 'A');
    createTask(db, 't2', 'inbox', 'B');
    createTask(db, 't3', 'inbox', 'C');
    setTaskDueDate(db, 't1', 100);
    setTaskDueDate(db, 't2', 200);
    setTaskDueDate(db, 't3', 300);
    const between = getTasksDueBetween(db, 150, 250);
    expect(between).toHaveLength(1);
    expect(between[0].id).toBe('t2');
  });

  it('getUpcomingTasks returns tasks due from given time', () => {
    createTask(db, 't1', 'inbox', 'Past');
    createTask(db, 't2', 'inbox', 'Future');
    setTaskDueDate(db, 't1', 100);
    setTaskDueDate(db, 't2', 500);
    const upcoming = getUpcomingTasks(db, 300);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe('t2');
  });

  it('getUpcomingTasks includes subtasks of upcoming parents', () => {
    createTask(db, 'parent', 'inbox', 'Parent');
    createTask(db, 'child', 'inbox', 'Child');
    setTaskDueDate(db, 'parent', 500);
    setTaskParentId(db, 'child', 'parent');
    const upcoming = getUpcomingTasks(db, 300);
    expect(upcoming.map(t => t.id)).toContain('parent');
    expect(upcoming.map(t => t.id)).toContain('child');
  });

  it('getUpcomingTasks includes subtask with its own upcoming due date', () => {
    createTask(db, 'parent', 'inbox', 'Parent');
    createTask(db, 'child', 'inbox', 'Child');
    setTaskDueDate(db, 'child', 500);
    setTaskParentId(db, 'child', 'parent');
    const upcoming = getUpcomingTasks(db, 300);
    expect(upcoming.map(t => t.id)).toContain('child');
    expect(upcoming.map(t => t.id)).not.toContain('parent');
  });

  it('getUpcomingTasks excludes deleted subtasks', () => {
    createTask(db, 'parent', 'inbox', 'Parent');
    createTask(db, 'child', 'inbox', 'Child');
    setTaskDueDate(db, 'parent', 500);
    setTaskParentId(db, 'child', 'parent');
    softDeleteTask(db, 'child');
    const upcoming = getUpcomingTasks(db, 300);
    expect(upcoming.map(t => t.id)).toContain('parent');
    expect(upcoming.map(t => t.id)).not.toContain('child');
  });
});


describe('settings', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('sets and gets a setting', () => {
    setSetting(db, 'theme', 'dark');
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('returns undefined for missing setting', () => {
    expect(getSetting(db, 'nonexistent')).toBeUndefined();
  });

  it('overwrites existing setting', () => {
    setSetting(db, 'theme', 'light');
    setSetting(db, 'theme', 'dark');
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('getAllSettings returns all settings as object', () => {
    setSetting(db, 'theme', 'dark');
    setSetting(db, 'hardcore_mode', '1');
    const settings = getAllSettings(db);
    expect(settings.theme).toBe('dark');
    expect(settings.hardcore_mode).toBe('1');
  });

  it('restoreList re-inserts a deleted list', () => {
    const list = createList(db, 'rl1', 'Restored', undefined);
    deleteList(db, 'rl1');
    expect(getAllLists(db).find((l) => l.id === 'rl1')).toBeUndefined();
    restoreList(db, list.id, list.folder_id, list.name, list.sort_key, list.created_at, list.updated_at);
    const restored = getAllLists(db).find((l) => l.id === 'rl1');
    expect(restored).toBeDefined();
    expect(restored!.name).toBe('Restored');
  });

  it('restoreTask re-inserts a deleted task', () => {
    const task = createTask(db, 'rt1', null, 'Restore me');
    deleteTask(db, 'rt1');
    expect(getInboxTasks(db).find((t) => t.id === 'rt1')).toBeUndefined();
    restoreTask(db, task.id, task.list_id, task.title, task.status, task.created_timestamp, task.completed_timestamp, task.sort_key, task.created_at, task.updated_at, task.deleted_at);
    const restored = getInboxTasks(db).find((t) => t.id === 'rt1');
    expect(restored).toBeDefined();
    expect(restored!.title).toBe('Restore me');
  });

  it('setTaskListId moves task to a different list', () => {
    const list = createList(db, 'sl1', 'Target');
    createTask(db, 'st1', null, 'Move me');
    expect(getInboxTasks(db).find((t) => t.id === 'st1')).toBeDefined();
    setTaskListId(db, 'st1', 'sl1');
    expect(getInboxTasks(db).find((t) => t.id === 'st1')).toBeUndefined();
    expect(getTasksByList(db, list.id).find((t) => t.id === 'st1')).toBeDefined();
  });

  it('softDeleteTask and restoreFromTrash round-trip', () => {
    createTask(db, 'sd1', null, 'Soft delete me');
    softDeleteTask(db, 'sd1');
    expect(getInboxTasks(db).find((t) => t.id === 'sd1')).toBeUndefined();
    expect(getTrashedTasks(db).find((t) => t.id === 'sd1')).toBeDefined();
    restoreFromTrash(db, 'sd1');
    expect(getInboxTasks(db).find((t) => t.id === 'sd1')).toBeDefined();
    expect(getTrashedTasks(db).find((t) => t.id === 'sd1')).toBeUndefined();
  });

  it('updateTaskNotes sets and clears notes', () => {
    createTask(db, 'n1', null, 'Notes task');
    updateTaskNotes(db, 'n1', '**bold**');
    expect(getInboxTasks(db).find((t) => t.id === 'n1')!.notes).toBe('**bold**');
    updateTaskNotes(db, 'n1', null);
    expect(getInboxTasks(db).find((t) => t.id === 'n1')!.notes).toBeNull();
  });

  it('setTaskParentId assigns parent', () => {
    createTask(db, 'parent1', null, 'Parent');
    createTask(db, 'child1', null, 'Child');
    setTaskParentId(db, 'child1', 'parent1');
    const child = getInboxTasks(db).find((t) => t.id === 'child1')!;
    expect(child.parent_id).toBe('parent1');
    setTaskParentId(db, 'child1', null);
    expect(getInboxTasks(db).find((t) => t.id === 'child1')!.parent_id).toBeNull();
  });

  it('toggleTaskExpanded flips expanded state', () => {
    createTask(db, 'exp1', null, 'Expandable');
    const before = getInboxTasks(db).find((t) => t.id === 'exp1')!;
    const initialExpanded = before.is_expanded;
    toggleTaskExpanded(db, 'exp1');
    const after = getInboxTasks(db).find((t) => t.id === 'exp1')!;
    expect(after.is_expanded).toBe(initialExpanded ? 0 : 1);
  });

  it('getTaskDescendants returns nested children', () => {
    createTask(db, 'anc1', null, 'Ancestor');
    createTask(db, 'desc1', null, 'Child');
    createTask(db, 'desc2', null, 'Grandchild');
    setTaskParentId(db, 'desc1', 'anc1');
    setTaskParentId(db, 'desc2', 'desc1');
    const descendants = getTaskDescendants(db, 'anc1');
    const ids = descendants.map((t) => t.id).sort();
    expect(ids).toEqual(['desc1', 'desc2']);
  });

  it('getAllTasks returns all non-deleted tasks', () => {
    createTask(db, 'all1', null, 'Inbox');
    createTask(db, 'all2', 'inbox', 'List');
    createTask(db, 'all3', null, 'Deleted');
    softDeleteTask(db, 'all3');
    const all = getAllTasks(db);
    const ids = all.map(t => t.id);
    expect(ids).toContain('all1');
    expect(ids).toContain('all2');
    expect(ids).not.toContain('all3');
  });

  it('purgeExpiredTrash deletes old trashed tasks', () => {
    createTask(db, 'purge1', null, 'Old trash');
    softDeleteTask(db, 'purge1');
    // Manually set deleted_at to 10 days ago
    const tenDaysAgo = Date.now() - 10 * 86400000;
    db.run('UPDATE tasks SET deleted_at = ? WHERE id = ?', [tenDaysAgo, 'purge1']);
    
    expect(getTrashedTasks(db).find(t => t.id === 'purge1')).toBeDefined();
    purgeExpiredTrash(db, 7); // 7 day retention
    expect(getTrashedTasks(db).find(t => t.id === 'purge1')).toBeUndefined();
  });

  it('purgeExpiredTrash does nothing when retentionDays is null', () => {
    createTask(db, 'purge2', null, 'Keep forever');
    softDeleteTask(db, 'purge2');
    const tenDaysAgo = Date.now() - 10 * 86400000;
    db.run('UPDATE tasks SET deleted_at = ? WHERE id = ?', [tenDaysAgo, 'purge2']);
    
    purgeExpiredTrash(db, null);
    expect(getTrashedTasks(db).find(t => t.id === 'purge2')).toBeDefined();
  });

  it('updateListNotes sets and clears notes on a list', () => {
    createList(db, 'ln1', 'List with notes');
    updateListNotes(db, 'ln1', 'Some notes');
    expect(getAllLists(db).find(l => l.id === 'ln1')!.notes).toBe('Some notes');
    updateListNotes(db, 'ln1', null);
    expect(getAllLists(db).find(l => l.id === 'ln1')!.notes).toBeNull();
  });

  it('normalizeAllTaskSortKeys normalizes all lists', () => {
    createTask(db, 'norm1', null, 'Inbox 1');
    createTask(db, 'norm2', null, 'Inbox 2');
    createTask(db, 'norm3', 'inbox', 'List 1');
    // Set non-sequential sort keys
    db.run('UPDATE tasks SET sort_key = 10 WHERE id = ?', ['norm1']);
    db.run('UPDATE tasks SET sort_key = 20 WHERE id = ?', ['norm2']);
    db.run('UPDATE tasks SET sort_key = 30 WHERE id = ?', ['norm3']);
    
    normalizeAllTaskSortKeys(db);
    
    const inbox = getInboxTasks(db);
    expect(inbox[0].sort_key).toBe(1);
    expect(inbox[1].sort_key).toBe(2);
    const list = getTasksByList(db, 'inbox');
    expect(list[0].sort_key).toBe(1);
  });
});
