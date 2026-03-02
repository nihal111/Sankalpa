# Duplicate

Create copies of tasks and subtrees.

<!-- GIF: duplicate.gif -->

## Keybinding

| Key | Action |
|-----|--------|
| `Ctrl+D` | Duplicate selected task |

## Behavior

### Single Task

Duplicates the task immediately below the original.

### Collapsed Subtree

When duplicating a collapsed parent task:

- Deep copies the entire subtree
- All descendants are duplicated
- Hierarchy is preserved
- New subtree appears below original

### Expanded Parent

When duplicating an expanded parent:

- Only the parent task is duplicated
- Children remain with original parent

## Properties Copied

- Title
- Due date
- Duration
- Notes
- Nesting depth (relative to parent)

## Properties Reset

- Status (always PENDING)
- Timestamps (new created_at)
- ID (new unique ID)
