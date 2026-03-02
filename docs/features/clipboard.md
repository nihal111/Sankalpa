# Clipboard

Copy, cut, and paste tasks.

![Copy and paste tasks](../gifs/gif-copy.gif)

## Keybindings

| Key | Action | Status |
|-----|--------|--------|
| `Cmd+C` | Copy selected task(s) as markdown | ✓ |
| `Cmd+X` | Cut selected task(s) | *planned* |
| `Cmd+V` | Paste cut tasks | *planned* |
| `Cmd+Shift+V` | Create tasks from clipboard | *planned* |

## Copy (Cmd+C)

Copies selected tasks to clipboard as a markdown bulleted list.

**Single task:**
```markdown
- Buy groceries
```

**Multiple tasks with nesting:**
```markdown
- Parent task
  - Child task 1
  - Child task 2
```

- Preserves indentation hierarchy
- Shows toast notification: "Task copied to clipboard" or "X tasks copied to clipboard"

## Create from Clipboard (Cmd+Shift+V) — *planned*

Parses markdown bulleted list from clipboard and creates tasks:

```markdown
- Task one
- Task two
  - Subtask
```

Creates three tasks with proper nesting.
