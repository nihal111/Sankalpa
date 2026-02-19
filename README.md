# Sankalpa

*Sankalpa* (Sanskrit): intention — a conscious decision to act.

A keyboard-first todo app for macOS. Fast, local, focused.

## Why

Speed protects flow. When a thought appears, you capture it instantly — no context switch, no mouse reach, no UI negotiation.

The Inbox holds intentions as they arise, so your mind doesn't have to. Clear your headspace for the task at hand, not for remembering what comes next.

## Features

- 100% keyboard driven — your hands never leave the keys
- Global hotkeys (works even when app is not focused)
- Two-pane layout (Lists | Tasks)
- SQLite persistence
- Hardcore mode (mouse disabled)

## Stack

Electron · React · TypeScript · Vite · sql.js (SQLite via WASM)

## Keybindings

| Key | Action |
|-----|--------|
| `Tab` | Switch pane focus |
| `↑/↓` | Move selection |
| `←/→` | Expand/collapse folder |
| `Enter` | Edit selected item |
| `Esc` | Cancel / close / hide |
| `Delete/Backspace` | Delete selected task |
| `Cmd+N` | New task in current list |
| `Cmd+Shift+N` | New list |
| `Cmd+Shift+↑/↓` | Reorder item |
| `M` | Move task to another list |
| `Cmd+Enter` | Mark selected task complete |
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
