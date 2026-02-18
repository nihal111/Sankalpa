# Architecture

Sankalpa is an Electron app with two processes communicating over IPC.

## Process Model

```
┌─────────────────────────────────────────────────┐
│  Main Process (Node.js)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Electron │  │   IPC    │  │  sql.js  │       │
│  │  shell   │  │ handlers │  │ (SQLite) │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│          ↕ contextBridge (preload.ts)           │
├─────────────────────────────────────────────────┤
│  Renderer Process (Chromium)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ React UI │  │  Hooks   │  │ Keyboard │       │
│  │          │  │ (state)  │  │ handler  │       │
│  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────┘
```

- **Main** owns the database, global shortcuts, and window management.
- **Renderer** owns all UI state and keyboard handling.
- **Preload** exposes a typed `window.api` bridge — the renderer never accesses Node.js directly.

See [Electron IPC](electron-ipc.md) for the full IPC contract.

## Source Layout

```
src/
├── main/               # Main process
│   ├── index.ts        # App lifecycle, IPC registration, global shortcuts
│   ├── preload.ts      # contextBridge — defines window.api
│   └── db/
│       ├── connection.ts   # sql.js init, load/save to disk
│       ├── schema.ts       # CREATE TABLE, seed data
│       └── queries.ts      # All SQL queries (CRUD, reorder, move)
├── renderer/           # Renderer process (React)
│   ├── App.tsx         # Root component — composes panes + modals
│   ├── useAppState.ts  # Top-level state orchestrator
│   ├── Sidebar.tsx     # Lists pane (smart lists, folders, user lists)
│   ├── TasksPane.tsx   # Tasks pane
│   ├── SettingsModal.tsx
│   ├── hooks/          # Domain-specific state hooks
│   │   ├── useKeyboardNavigation.ts  # Key → action dispatch
│   │   ├── useDataState.ts           # DB data loading
│   │   ├── useTaskActions.ts         # Create, delete, reorder
│   │   ├── useEditState.ts           # Inline editing
│   │   ├── useMoveState.ts           # Move-to-list mode
│   │   └── ...
│   ├── utils/          # Pure functions
│   └── types.ts        # Renderer-specific types
├── shared/
│   ├── types.ts        # Types shared across processes (Task, List, Api)
│   └── sortKey.ts      # Fractional sort key calculation
e2e/                    # Playwright E2E tests (Electron)
```

## Key Design Decisions

- **Fractional sort keys** — Items are ordered by a REAL `sort_key` column. Reorder swaps values in O(1). Insert uses midpoint. See [ADR-0003](adr/0003-fractional-sort-key-ordering.md).
- **sql.js over better-sqlite3** — Avoids native module ABI conflicts between Electron and Node.js test environments. See [ADR-0004](adr/0004-sql-js-over-better-sqlite3.md).
- **Command-pattern keyboard handling** — Key handler dispatches to memoized action callbacks, keeping dependency arrays small. See [ADR-0007](adr/0007-keyboard-handling-pattern.md).
- **Hook size limit** — Max 200 lines per hook file, split by domain. See [ADR-0006](adr/0006-hook-size-limit.md).

## Data Model

```sql
lists    (id, folder_id?, name, sort_key, created_at, updated_at)
tasks    (id, list_id?,   title, sort_key, created_at, updated_at)
folders  (id, name, sort_key, is_expanded, created_at, updated_at)
settings (key, value)  -- key-value store for app preferences
```

Tasks with `list_id = NULL` belong to the Inbox (a virtual smart list).

## State Management

All renderer state flows through `useAppState`, which orchestrates domain-specific hooks:

```
                                 ┌─────────────────┐
                                 │  useAppState    │
                                 │ (orchestrator)  │
                                 └────────┬────────┘
                                          │
      ┌──────────┬──────────┬─────────────┼─────────────┬──────────┬──────────┐
      │          │          │             │             │          │          │
      ▼          ▼          ▼             ▼             ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│ useData  ││ useMulti ││ useEdit  ││ useMove  ││ useTask  ││useSidebar││ useArrow │
│ State    ││ Select   ││ State    ││ State    ││ Actions  ││Navigation││Navigation│
└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
     │           │           │           │           │           │           │
     └───────────┴───────────┴───────────┼───────────┴───────────┴───────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │useKeyboardNavigation│
                              │   (nerve center)    │
                              └─────────────────────┘
```

| Hook | Responsibility |
|------|----------------|
| `useDataState` | Loads folders, lists, tasks from DB; derives sidebar items |
| `useMultiSelect` | Multi-selection state (Shift/Cmd modifiers, anchor, cursor) |
| `useEditState` | Inline editing mode for tasks, lists, folders |
| `useMoveState` | "Move task to list" modal state and navigation |
| `useTaskActions` | Create, delete, reorder operations for tasks |
| `useSidebarNavigation` | ←/→ arrows for folder expand/collapse, pane switching |
| `useArrowNavigation` | ↑/↓ arrows with modifiers for selection and reorder |
| `useSettingsState` | Settings modal and theme selection |

`useAppState` assembles actions from all hooks into a `KeyboardActions` object, which `useKeyboardNavigation` uses to dispatch keystrokes. This keeps the keyboard handler decoupled from individual state domains.
