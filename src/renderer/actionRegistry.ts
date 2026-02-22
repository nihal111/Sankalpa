export interface ActionContext {
  focusedPane: 'lists' | 'tasks' | 'detail';
  editMode: boolean;
  moveMode: boolean;
  settingsOpen: boolean;
  isSearchOpen: boolean;
  isPaletteOpen: boolean;
  isTrashView: boolean;
  hasSelectedTask: boolean;
  hasSelection: boolean;
  canEdit: boolean;
}

export interface Action {
  id: string;
  name: string;
  hotkey: string;
  hotkeyDisplay: string;
  isAvailable: (ctx: ActionContext) => boolean;
}

export const actions: Action[] = [
  { id: 'openSettings', name: 'Open Settings', hotkey: 'meta+,', hotkeyDisplay: '⌘,', isAvailable: () => true },
  { id: 'openSearch', name: 'Search Tasks', hotkey: 'meta+shift+f', hotkeyDisplay: '⌘⇧F', isAvailable: () => true },
  { id: 'undo', name: 'Undo', hotkey: 'meta+z', hotkeyDisplay: '⌘Z', isAvailable: () => true },
  { id: 'redo', name: 'Redo', hotkey: 'meta+shift+z', hotkeyDisplay: '⌘⇧Z', isAvailable: () => true },
  { id: 'newTask', name: 'New Task', hotkey: 'meta+n', hotkeyDisplay: '⌘N', isAvailable: () => true },
  { id: 'newList', name: 'New List', hotkey: 'meta+shift+n', hotkeyDisplay: '⌘⇧N', isAvailable: () => true },
  { id: 'delete', name: 'Delete', hotkey: 'Backspace', hotkeyDisplay: '⌫', isAvailable: (ctx) => !ctx.editMode },
  { id: 'toggleCompleted', name: 'Toggle Completed', hotkey: 'meta+Enter', hotkeyDisplay: '⌘↵', isAvailable: (ctx) => ctx.focusedPane === 'tasks' },
  { id: 'edit', name: 'Edit', hotkey: 'e', hotkeyDisplay: 'E', isAvailable: (ctx) => (ctx.focusedPane === 'tasks' && !ctx.hasSelection) || (ctx.focusedPane === 'lists' && ctx.canEdit) },
  { id: 'moveToList', name: 'Move to List', hotkey: 'm', hotkeyDisplay: 'M', isAvailable: (ctx) => ctx.focusedPane === 'tasks' },
  { id: 'setDueDate', name: 'Set Due Date', hotkey: 'd', hotkeyDisplay: 'D', isAvailable: (ctx) => ctx.focusedPane === 'tasks' && ctx.hasSelectedTask && !ctx.hasSelection },
  { id: 'editNotes', name: 'Edit Notes', hotkey: 'n', hotkeyDisplay: 'N', isAvailable: (ctx) => ctx.focusedPane === 'tasks' && ctx.hasSelectedTask },
  { id: 'indent', name: 'Indent', hotkey: 'Tab', hotkeyDisplay: 'Tab', isAvailable: (ctx) => ctx.focusedPane === 'tasks' },
  { id: 'outdent', name: 'Outdent', hotkey: 'shift+Tab', hotkeyDisplay: '⇧Tab', isAvailable: (ctx) => ctx.focusedPane === 'tasks' },
  { id: 'toggleCollapse', name: 'Collapse/Expand', hotkey: 'c', hotkeyDisplay: 'C', isAvailable: (ctx) => ctx.focusedPane === 'tasks' },
  { id: 'restoreFromTrash', name: 'Restore from Trash', hotkey: 'r', hotkeyDisplay: 'R', isAvailable: (ctx) => ctx.isTrashView && ctx.focusedPane === 'tasks' },
  { id: 'clearSelection', name: 'Clear Selection', hotkey: ' ', hotkeyDisplay: 'Space', isAvailable: (ctx) => ctx.focusedPane === 'tasks' && ctx.hasSelection },
];

export function matchesHotkey(e: KeyboardEvent, action: Action): boolean {
  const parts = action.hotkey.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const needsMeta = parts.includes('meta');
  const needsShift = parts.includes('shift');

  if (needsMeta !== e.metaKey) return false;
  if (needsShift !== e.shiftKey) return false;
  
  const eventKey = e.key.toLowerCase();
  if (key === 'backspace' && (eventKey === 'backspace' || eventKey === 'delete')) return true;
  return eventKey === key;
}
