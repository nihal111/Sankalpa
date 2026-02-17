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

### Phase 4: Keyboard Actions

- [ ] Reorder: `Cmd+Shift+Up/Down` (swap sort_keys)
- [ ] Move task: `M` → select list → `Enter`
- [ ] Inline edit: `Enter` to edit, `Esc` to cancel
- [ ] `Esc` priority: cancel edit → close modal → hide window

### Phase 5: Global Hotkeys

- [ ] `Cmd+Option+Ctrl+Space` → toggle window
- [ ] `Cmd+Option+Shift+Space` → quick-add modal
- [ ] Register hotkeys system-wide (electron globalShortcut)

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
