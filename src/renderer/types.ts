import type { Folder, List } from '../shared/types';
import { Icons } from './icons';

export type Pane = 'lists' | 'tasks';
export type EditMode = { type: 'list'; id: string } | { type: 'task'; index: number } | { type: 'folder'; id: string } | null;
export type Theme = 'system' | 'light' | 'dark';

export type SmartListId = 'inbox' | 'overdue' | 'today' | 'upcoming' | 'completed' | 'trash';
export interface SmartList {
  id: SmartListId;
  name: string;
  icon: string;
}

export const SMART_LISTS: SmartList[] = [
  { id: 'inbox', name: 'Inbox', icon: Icons.inbox },
  { id: 'overdue', name: 'Overdue', icon: Icons.overdue },
  { id: 'today', name: 'Today', icon: Icons.today },
  { id: 'upcoming', name: 'Upcoming', icon: Icons.upcoming },
  { id: 'completed', name: 'Completed', icon: Icons.completed },
];

export const TRASH_SMART_LIST: SmartList = { id: 'trash', name: 'Trash', icon: Icons.trash };

export type SidebarItem =
  | { type: 'smart'; smartList: SmartList }
  | { type: 'folder'; folder: Folder }
  | { type: 'list'; list: List };

export const THEME_COLORS = {
  dark: {
    bgPrimary: '#2a2a28',
    bgSecondary: '#232321',
    bgSelected: '#98801f',
    textPrimary: '#e8e6df',
    border: '#3a3a38',
  },
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#e0e0e0',
    bgSelected: '#f5eaa3',
    textPrimary: '#0d0d0d',
    border: '#d0d0d0',
  },
};
