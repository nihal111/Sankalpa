<p align="center">
  <img src="assets/sankalpa_text_logo.png" alt="Sankalpa" width="400">
</p>

<p align="center"><em>Sankalpa</em> (Sanskrit): intention — a conscious decision to act.</p>

<p align="center">A keyboard-first task manager for macOS. Fast, local, focused.</p>

---

## Why

Speed protects flow. When a thought appears, you capture it instantly — no context switch, no mouse reach, no UI negotiation.

The Inbox holds intentions as they arise, so your mind doesn't have to. Clear your headspace for the task at hand, not for remembering what comes next.

## Features

| Feature | Description | Docs | Demo |
|---------|-------------|:----:|:----:|
| **Keyboard-first** | 100% keyboard driven — your hands never leave the keys | [Keybindings](#keybindings) | <details><summary>▶️</summary><br>![](docs/gifs/gif-pane-navigation.gif)</details> |
| **Three-pane layout** | Lists, tasks, and detail pane for notes and metadata | | |
| **Smart Lists** | Inbox, Today, Overdue, Upcoming, Completed, Trash — auto-filtered views | [Docs](docs/features/smart-lists.md) | |
| **Create task** | Instantly add tasks with `⌘N`, inline editing | [Docs](docs/features/create-task.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-create-task.gif)</details> |
| **Edit task** | Rename tasks in place with `E` | [Docs](docs/features/edit-task.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-edit-task.gif)</details> |
| **Complete task** | Mark done with `⌘↵`, with satisfying animation | [Docs](docs/features/complete-task.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-complete-task.gif)</details> |
| **Create list** | Organize tasks into projects with `⌘⇧N` | [Docs](docs/features/create-list.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-create-list.gif)</details> |
| **Edit list** | Rename lists with `E` | [Docs](docs/features/edit-list.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-edit-list.gif)</details> |
| **Subtask nesting** | Unlimited hierarchy with `Tab` / `⇧Tab` | [Docs](docs/features/subtask-nesting.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-nesting.gif)</details> |
| **Collapse/Expand** | Focus on what matters — toggle subtrees with `C` | [Docs](docs/features/collapse.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-collapse.gif)</details> |
| **Multi-select** | Batch operations on multiple tasks with `⇧↑↓` and `⌃↵` | [Docs](docs/features/multi-select.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-multiselect.gif)</details> |
| **Move task** | Reorganize tasks between lists with `M` | [Docs](docs/features/move-task.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-move.gif)</details> |
| **Reorder** | Drag-free reordering with `⌥↑↓` | [Docs](docs/features/reorder.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-reorder.gif)</details> |
| **Due dates** | Natural language input — "tomorrow", "next friday", "dec 25" | [Docs](docs/features/due-dates.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-due-date.gif)</details> |
| **Duration** | Time estimates with quick presets (15m, 30m, 1h, 2h) | [Docs](docs/features/duration.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-duration.gif)</details> |
| **Task notes** | Rich markdown notes with live preview | [Docs](docs/features/notes.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-notes.gif)</details> |
| **Command palette** | Fuzzy search all commands with `⌘K` | [Docs](docs/features/command-palette.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-command-palette.gif)</details> |
| **Global search** | Find any task instantly with `⌘⇧F` | [Docs](docs/features/search.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-search.gif)</details> |
| **Undo/Redo** | Full operation history with `⌘Z` / `⌘⇧Z` | [Docs](docs/features/undo-redo.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-undo.gif)</details> |
| **Clipboard** | Copy tasks as markdown, paste to create | [Docs](docs/features/clipboard.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-copy.gif)</details> |
| **Duplicate** | Deep copy tasks and entire subtrees with `⌃D` | [Docs](docs/features/duplicate.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-duplicate.gif)</details> |
| **Global hotkeys** | System-wide shortcuts — capture thoughts from any app | | |
| **Hardcore mode** | Disable mouse completely for pure keyboard flow | [Docs](docs/features/settings.md) | <details><summary>▶️</summary><br>![](docs/gifs/gif-settings.gif)</details> |
| **Local-first** | SQLite database — your data stays on your machine | | |

## Stack

Electron · React · TypeScript · Vite · sql.js (SQLite via WASM)

## Keybindings

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate items |
| `←` `→` | Switch panes / collapse-expand |
| `E` | Edit selected item |
| `Tab` | Indent task |
| `⇧Tab` | Outdent task |
| `⌥↑` `⌥↓` | Reorder item |
| `Delete` | Delete selected |
| `Esc` | Cancel / close |

| Key | Action |
|-----|--------|
| `⌘N` | New task |
| `⌘⇧N` | New list |
| `⌘↵` | Complete task |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `⌘K` | Command palette |
| `⌘⇧F` | Global search |
| `⌘,` | Settings |

| Key | Action |
|-----|--------|
| `M` | Move task to list |
| `D` | Set due date |
| `⌥D` | Set duration |
| `N` | Open notes |
| `C` | Collapse/expand |
| `F` | Cycle filters |

### Multi-select

| Key | Action |
|-----|--------|
| `⇧↑` `⇧↓` | Extend selection |
| `⌃↑` `⌃↓` | Move cursor |
| `⌃↵` | Toggle at cursor |
| `Space` | Clear selection |

### Global Hotkeys

| Key | Action |
|-----|--------|
| `⌘⌥⌃Space` | Toggle window |
| `⌘⌥⇧Space` | Quick add to Inbox |

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
npm run test:e2e:headless   # E2E tests (headless)
```

## Architecture

See [`docs/`](docs/) for details:

- [Architecture overview](docs/architecture.md)
- [Architecture Decision Records](docs/adr/)
- [Electron IPC](docs/electron-ipc.md)
