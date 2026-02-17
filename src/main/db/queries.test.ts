import initSqlJs, { Database } from 'sql.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initSchema } from './schema';
import {
  getAllLists, createList, updateList, deleteList, reorderList,
  getTasksByList, createTask, updateTask, deleteTask, reorderTask, moveTask,
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

  it('assigns incrementing sort_keys', () => {
    createList(db, 'l1', 'A');
    createList(db, 'l2', 'B');

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
});
