# Sankalpa

A keyboard-first todo app for macOS. Fast, minimal, no mouse required.

## Features

- 100% keyboard driven
- Global hotkeys (works even when app is not focused)
- Two-pane layout (Lists | Tasks)
- SQLite persistence
- Hardcore mode (mouse disabled)

## Keybindings

| Key | Action |
|-----|--------|
| `Tab` | Switch pane focus |
| `↑/↓` | Move selection |
| `Enter` | Edit selected item |
| `Esc` | Cancel / close / hide |
| `Delete/Backspace` | Delete selected task |
| `Cmd+Shift+↑/↓` | Reorder item |
| `M` | Move task to another list |

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
