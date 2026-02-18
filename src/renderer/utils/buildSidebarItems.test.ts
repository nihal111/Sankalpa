import { describe, it, expect } from 'vitest';
import { buildSidebarItems } from './buildSidebarItems';
import type { Folder, List } from '../../shared/types';

describe('buildSidebarItems', () => {
  it('returns smart lists first', () => {
    const result = buildSidebarItems([], []);
    expect(result[0].type).toBe('smart');
    expect(result[0].type === 'smart' && result[0].smartList.id).toBe('inbox');
  });

  it('includes folders and their lists when expanded', () => {
    const folders: Folder[] = [{ id: 'f1', name: 'Work', is_expanded: true, sort_key: 'a' }];
    const lists: List[] = [{ id: 'l1', name: 'Tasks', folder_id: 'f1', sort_key: 'a' }];
    const result = buildSidebarItems(folders, lists);
    expect(result).toContainEqual({ type: 'folder', folder: folders[0] });
    expect(result).toContainEqual({ type: 'list', list: lists[0] });
  });

  it('hides lists under collapsed folders', () => {
    const folders: Folder[] = [{ id: 'f1', name: 'Work', is_expanded: false, sort_key: 'a' }];
    const lists: List[] = [{ id: 'l1', name: 'Tasks', folder_id: 'f1', sort_key: 'a' }];
    const result = buildSidebarItems(folders, lists);
    expect(result).toContainEqual({ type: 'folder', folder: folders[0] });
    expect(result).not.toContainEqual({ type: 'list', list: lists[0] });
  });

  it('includes root-level lists', () => {
    const lists: List[] = [{ id: 'l1', name: 'Personal', folder_id: null, sort_key: 'a' }];
    const result = buildSidebarItems([], lists);
    expect(result).toContainEqual({ type: 'list', list: lists[0] });
  });
});
