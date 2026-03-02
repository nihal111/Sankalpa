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

| Feature | Description | Docs |
|---------|-------------|:----:|
| **Keyboard-first** | 100% keyboard driven — your hands never leave the keys | [Keybindings](#keybindings) |
| **Three-pane layout** | Lists, tasks, and detail pane for notes and metadata <details><summary>▶️</summary><br>![](docs/gifs/gif-pane-navigation.gif)</details> | |
| **Smart Lists** | Inbox, Today, Overdue, Upcoming, Completed, Trash — auto-filtered views | [Docs](docs/features/smart-lists.md) |
| **Create task** | Instantly add tasks with `⌘N`, inline editing <details><summary>▶️</summary><br>![](docs/gifs/gif-create-task.gif)</details> | [Docs](docs/features/create-task.md) |
| **Edit task** | Rename tasks in place with `E` <details><summary>▶️</summary><br>![](docs/gifs/gif-edit-task.gif)</details> | [Docs](docs/features/edit-task.md) |
| **Complete task** | Mark done with `⌘↵`, with satisfying animation <details><summary>▶️</summary><br>![](docs/gifs/gif-complete-task.gif)</details> | [Docs](docs/features/complete-task.md) |
| **Create list** | Organize tasks into projects with `⌘⇧N` <details><summary>▶️</summary><br>![](docs/gifs/gif-create-list.gif)</details> | [Docs](docs/features/create-list.md) |
| **Edit list** | Rename lists with `E` <details><summary>▶️</summary><br>![](docs/gifs/gif-edit-list.gif)</details> | [Docs](docs/features/edit-list.md) |
| **Subtask nesting** | Unlimited hierarchy with `Tab` / `⇧Tab` <details><summary>▶️</summary><br>![](docs/gifs/gif-nesting.gif)</details> | [Docs](docs/features/subtask-nesting.md) |
| **Collapse/Expand** | Focus on what matters — toggle subtrees with `C` <details><summary>▶️</summary><br>![](docs/gifs/gif-collapse.gif)</details> | [Docs](docs/features/collapse.md) |
| **Multi-select** | Batch operations on multiple tasks with `⇧↑↓` and `⌃↵` <details><summary>▶️</summary><br>![](docs/gifs/gif-multiselect.gif)</details> | [Docs](docs/features/multi-select.md) |
| **Move task** | Reorganize tasks between lists with `M` <details><summary>▶️</summary><br>![](docs/gifs/gif-move.gif)</details> | [Docs](docs/features/move-task.md) |
| **Reorder** | Drag-free reordering with `⌥↑↓` <details><summary>▶️</summary><br>![](docs/gifs/gif-reorder.gif)</details> | [Docs](docs/features/reorder.md) |
| **Due dates** | Natural language input — "tomorrow", "next friday", "dec 25" <details><summary>▶️</summary><br>![](docs/gifs/gif-due-date.gif)</details> | [Docs](docs/features/due-dates.md) |
| **Duration** | Time estimates with quick presets (15m, 30m, 1h, 2h) <details><summary>▶️</summary><br>![](docs/gifs/gif-duration.gif)</details> | [Docs](docs/features/duration.md) |
| **Task notes** | Rich markdown notes with live preview <details><summary>▶️</summary><br>![](docs/gifs/gif-notes.gif)</details> | [Docs](docs/features/notes.md) |
| **Command palette** | Fuzzy search all commands with `⌘K` <details><summary>▶️</summary><br>![](docs/gifs/gif-command-palette.gif)</details> | [Docs](docs/features/command-palette.md) |
| **Global search** | Find any task instantly with `⌘⇧F` <details><summary>▶️</summary><br>![](docs/gifs/gif-search.gif)</details> | [Docs](docs/features/search.md) |
| **Undo/Redo** | Full operation history with `⌘Z` / `⌘⇧Z` <details><summary>▶️</summary><br>![](docs/gifs/gif-undo.gif)</details> | [Docs](docs/features/undo-redo.md) |
| **Clipboard** | Copy tasks as markdown, paste to create <details><summary>▶️</summary><br>![](docs/gifs/gif-copy.gif)</details> | [Docs](docs/features/clipboard.md) |
| **Duplicate** | Deep copy tasks and entire subtrees with `⌃D` <details><summary>▶️</summary><br>![](docs/gifs/gif-duplicate.gif)</details> | [Docs](docs/features/duplicate.md) |
| **Global hotkeys** | System-wide shortcuts — capture thoughts from any app | |
| **Hardcore mode** | Disable mouse completely for pure keyboard flow <details><summary>▶️</summary><br>![](docs/gifs/gif-settings.gif)</details> | [Docs](docs/features/settings.md) |
| **Local-first** | SQLite database — your data stays on your machine | |

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
