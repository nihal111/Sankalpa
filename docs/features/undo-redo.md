# Undo/Redo

Full undo history for all operations.

<!-- GIF: undo-redo.gif -->

## Keybindings

| Key | Action |
|-----|--------|
| `Cmd+Z` | Undo last action |
| `Cmd+Shift+Z` | Redo undone action |

## Supported Operations

All task and list operations are undoable:

- Create/delete tasks and lists
- Edit task titles and list names
- Complete/uncomplete tasks
- Move tasks between lists
- Reorder tasks
- Indent/outdent (nesting changes)
- Due date and duration changes
- Note edits

## Behavior

- Undo stack persists during session
- Stack clears on app restart
- Redo stack clears when new action is performed
