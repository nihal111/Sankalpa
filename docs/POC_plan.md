# Sankalpa - Implementation Plan

A keyboard-first todo app for macOS.

## Stack

- Electron + TypeScript + Vite + React
- SQLite (better-sqlite3)
- No unnecessary dependencies

## Phases

### Phase 1: Project Scaffold ✓

- [x] Initialize Electron + Vite + React + TypeScript
- [x] Configure better-sqlite3 with Electron
- [x] Basic main/renderer process structure
- [x] Verify `npm run dev` works

### Phase 2: Database Layer ✓

- [x] SQLite schema (lists, tasks with fractional sort_key)
- [x] Seed data (Inbox, First Project, sample tasks)
- [x] DB helper functions (CRUD, reorder, move)

### Phase 3: Core UI ✓

- [x] Two-pane layout (Lists | Tasks)
- [x] Focus model (Tab to switch panes)
- [x] Selection with Up/Down arrows
- [x] Visual focus indicators

### Phase 4: Keyboard Actions ✓

- [x] Reorder: `Cmd+Shift+Up/Down` (swap sort_keys)
- [x] Move task: `M` → select list → `Enter`
- [x] Inline edit: `Enter` to edit, `Esc` to cancel
- [x] `Esc` priority: cancel edit → close modal → hide window

### Phase 4.1: Create Items ✓

- [x] `Cmd+N` → new task (in current list, enters edit mode)
- [x] `Cmd+Shift+N` → new list (enters edit mode)

### Phase 4.2: Multi-Select Move ✓

- [x] Shift selection (continuous): hold Shift + Up/Down extends/contracts selection
- [x] Cmd selection (non-contiguous): Cmd changes highlight, arrow moves boundary cursor, Cmd+Space toggles selection
- [x] Visual: selected items highlight differently from focused item
- [x] Releasing Shift keeps multi-selection (unless single item)
- [x] Releasing Cmd keeps selection; Space without Cmd clears selection and moves cursor
- [x] `M` moves all selected tasks together

### Phase 4.3: Settings & Themes ✓

- [x] `Cmd+,` opens settings modal
- [x] Two-pane settings layout (categories | options)
- [x] Theme selector with visual previews (mini app mockups)
- [x] Three themes: Light, Dark, System (follows OS preference)
- [x] CSS variables for all colors (easy palette swaps)
- [x] Light palette: White, Vanilla Custard, Golden Bronze, Alabaster Grey, Onyx
- [x] Dark palette: Charcoal, Dark Charcoal, Golden Brown, Cream, Bright Gold
- [x] Keyboard navigation: ←→ select theme, Enter apply, Esc close

### Phase 4.4: Sidebar Enhancements ✓

- [x] Smart lists: Inbox, Overdue, Today, Upcoming, Completed (icons, non-editable)
- [x] Folders: collapsible containers for lists (▶/▼ icons)
- [x] Folder CRUD: create, rename, expand/collapse, nest lists inside
- [x] Horizontal divider separating smart lists from user lists/folders
- [x] Task count badges on lists
- [x] Arrow navigation: →/← expand/collapse folders, move to children/parent
- [x] Wider sidebar (240px), reduced indentation for nested items
- [x] Renamed seed list from "Inbox" to "Tutorial" (smart Inbox already exists)
- [x] Refactored App.tsx (~720 lines) into 7 focused modules (<400 lines each)
- [x] Refactored App.test.tsx (~1640 lines) into 8 test files (<320 lines each)
- [x] Replaced emoji icons with inline SVG icons (icons.ts)
  - Inbox: tray with curved notch
  - Overdue: bell notification
  - Today: calendar with dot
  - Upcoming: clock
  - Completed: checkmark in circle
  - Folders: open/closed folder icons
  - Lists: bullet list icon
- [x] Fixed icon vertical alignment with flexbox centering

### Phase 4.5: Task Deletion ✓

- [x] Delete/Backspace key deletes selected task
- [x] Task count badges refresh after deletion

### Phase 5: Global Hotkeys ✓

- [x] `Cmd+Option+Ctrl+Space` → toggle window
- [x] `Cmd+Option+Shift+Space` → quick-add to Inbox
- [x] Register hotkeys system-wide (electron globalShortcut)
- [x] Added real "Inbox" list (id: inbox-list) for quick-add target

### Phase 6: Hardcore Mode

- [ ] `HARDCORE_MODE` constant
- [ ] Disable mouse handlers when true
- [ ] Hide cursor via CSS

### Phase 7: Polish

- [ ] Flash animation on reorder/move/add (~200ms)
- [ ] Optimistic UI updates
- [ ] Window centering on first open

### Phase 8: Tests & Docs

- [ ] Vitest unit tests (reorder, move, list reorder logic)
- [ ] README with keybindings, architecture, ordering explanation

## Data Model

```sql
-- Fractional ordering with REAL sort_key

CREATE TABLE lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_key REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_key REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (list_id) REFERENCES lists(id)
);

CREATE INDEX idx_tasks_list_sort ON tasks(list_id, sort_key);
CREATE INDEX idx_lists_sort ON lists(sort_key);
```

## Key Bindings

| Key | Action |
|-----|--------|
| `Tab` | Switch pane focus |
| `↑/↓` | Move selection |
| `Enter` | Edit selected item |
| `Esc` | Cancel / close / hide |
| `Cmd+Shift+↑/↓` | Reorder item |
| `M` | Move task to another list |
| `Cmd+Option+Ctrl+Space` | Toggle window (global) |
| `Cmd+Option+Shift+Space` | Quick add (global) |

## Out of Scope

- Search
- Due dates
- Tags
- Settings UI
- Multi-select
- Undo/redo
