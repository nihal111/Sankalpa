import type { Folder, List } from '../../shared/types';
import type { SidebarItem } from '../types';
import { SMART_LISTS } from '../types';

export function buildSidebarItems(folders: Folder[], lists: List[]): SidebarItem[] {
  const items: SidebarItem[] = [];
  SMART_LISTS.forEach((sl) => items.push({ type: 'smart', smartList: sl }));
  folders.forEach((folder) => {
    items.push({ type: 'folder', folder });
    if (folder.is_expanded) {
      lists.filter((l) => l.folder_id === folder.id).forEach((list) => {
        items.push({ type: 'list', list });
      });
    }
  });
  lists.filter((l) => l.folder_id === null).forEach((list) => {
    items.push({ type: 'list', list });
  });
  return items;
}
