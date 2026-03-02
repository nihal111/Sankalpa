<p align="center">
  <img src="assets/sankalpa_text_logo.png" alt="Sankalpa" width="400">
</p>

<p align="center"><em>Sankalpa</em> (Sanskrit): intention — a conscious decision to act.</p>

A keyboard-first todo app for macOS. Fast, local, focused.

## Why

Speed protects flow. When a thought appears, you capture it instantly — no context switch, no mouse reach, no UI negotiation.

The Inbox holds intentions as they arise, so your mind doesn't have to. Clear your headspace for the task at hand, not for remembering what comes next.

## Features

![Pane navigation](docs/gifs/gif-pane-navigation.gif)

| Feature | Description | Docs |
|---------|-------------|------|
| Keyboard-first | 100% keyboard driven — your hands never leave the keys | [Keybindings](#keybindings) |
| Two-pane layout | Lists on the left, tasks on the right | |
| Smart Lists | Inbox, Today, Overdue, Upcoming, Completed, Trash | [Smart Lists](docs/features/smart-lists.md) |
| Create task | Add tasks with Cmd+N | [Create Task](docs/features/create-task.md) |
| Edit task | Modify task titles with E | [Edit Task](docs/features/edit-task.md) |
| Complete task | Mark done with Cmd+Enter | [Complete Task](docs/features/complete-task.md) |
| Create list | Add lists with Cmd+Shift+N | [Create List](docs/features/create-list.md) |
| Edit list | Rename lists with E | [Edit List](docs/features/edit-list.md) |
| Subtask nesting | Hierarchical tasks with Tab/Shift+Tab | [Subtask Nesting](docs/features/subtask-nesting.md) |
| Collapse/Expand | Toggle subtask visibility with C | [Collapse](docs/features/collapse.md) |
| Multi-select | Contiguous and discontiguous task selection | [Multi-select](docs/features/multi-select.md) |
| Move task | Move tasks between lists with M | [Move Task](docs/features/move-task.md) |
| Reorder | Change task order with Alt+arrows | [Reorder](docs/features/reorder.md) |
| Due dates | Natural language input with relative display | [Due Dates](docs/features/due-dates.md) |
| Duration | Time estimates with presets | [Duration](docs/features/duration.md) |
| Task notes | Markdown notes per task | [Notes](docs/features/notes.md) |
| Command palette | Quick access to all commands (Cmd+K) | [Command Palette](docs/features/command-palette.md) |
| Global search | Search across all tasks (Cmd+Shift+F) | [Search](docs/features/search.md) |
| Undo/Redo | Full undo history (Cmd+Z / Cmd+Shift+Z) | [Undo/Redo](docs/features/undo-redo.md) |
| Copy tasks | Copy as markdown (Cmd+C) | [Clipboard](docs/features/clipboard.md) |
| Duplicate | Deep copy tasks and subtrees (Ctrl+D) | [Duplicate](docs/features/duplicate.md) |
| Global hotkeys | System-wide shortcuts even when unfocused | |
| Hardcore mode | Disable mouse for pure keyboard flow | [Settings](docs/features/settings.md) |
| SQLite persistence | Local-first, fast, reliable | |

## Stack

Electron · React · TypeScript · Vite · sql.js (SQLite via WASM)

## Keybindings

| Key | Action |
|-----|--------|
| `Tab` | Indent task |
| `Shift+Tab` | Outdent task |
| `↑/↓` | Move selection |
| `←/→` | Navigate panes / expand/collapse folder |
| `E` | Edit selected item |
| `Esc` | Cancel / close / hide |
| `Delete/Backspace` | Delete selected task |
| `Cmd+N` | New task in current list |
| `Cmd+Shift+N` | New list |
| `Opt+↑/↓` | Reorder item |
| `M` | Move task to another list |
| `D` | Set due date on task |
| `⌥D` | Set duration on task |
| `F` | Cycle through filters (Completed view) |
| `Cmd+Enter` | Mark selected task complete |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+,` | Open settings |

### Multi-select (tasks pane)

| Key | Action |
|-----|--------|
| `Shift+↑/↓` | Extend/contract selection |
| `Ctrl+↑/↓` | Move cursor without selecting |
| `Ctrl+Enter` | Toggle selection at cursor |
| `Space` | Clear selection |

### Global (system-wide)

| Key | Action |
|-----|--------|
| `Cmd+Option+Ctrl+Space` | Toggle window |
| `Cmd+Option+Shift+Space` | Quick add to Inbox |

## Quick Start

```bash
npm install
npm run dev
```

See [DEVELOPING.md](DEVELOPING.md) for full setup instructions.

## Testing

```bash
npm test                    # Unit tests
npm run test:e2e            # E2E tests (visible window)
npm run test:e2e:headless   # E2E tests (no window)
```

## Architecture

See [`docs/`](docs/) for architecture details, including:

- [Architecture overview](docs/architecture.md)
- [Architecture Decision Records](docs/adr/)
- [Electron IPC](docs/electron-ipc.md)
