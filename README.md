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
| `Cmd+,` | Open settings |

### Multi-select (tasks pane)

| Key | Action |
|-----|--------|
| `Shift+↑/↓` | Extend/contract selection |
| `Cmd+↑/↓` | Move cursor without selecting |
| `Cmd+Enter` | Toggle selection at cursor |
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
