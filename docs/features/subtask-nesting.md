# Subtask Nesting

Hierarchical task organization with Tab/Shift+Tab indentation.

## Behavior

### Nesting

- **Tab**: Indent task as child of task above
- **Shift+Tab**: Outdent task one level  
- **`c` key**: Toggle collapse/expand on parent tasks
- **No depth limit**: Tasks can be nested arbitrarily deep

### Depth Limits

When indent/outdent is blocked, show "throb" animation (horizontal bounce):
- Tab on first task (no parent available)
- Shift+Tab at root level (level 0)

### Visual Style

Tree connectors with indentation:

```
☐ Parent task
├─ ☐ Child 1
│  ├─ ☐ Grandchild 1
│  └─ ☐ Grandchild 2
└─ ☐ Child 2
```

### Collapse/Expand

- Collapsed indicator: `▶` / Expanded: `▼`
- Collapsed parents show child count: `▶ Parent task (3)`
- Hidden descendants excluded from keyboard navigation

### Cascade Operations

**Completing a parent:**
- Confirmation: "Completing this task will also complete N subtasks. Continue?"
- On confirm: complete parent + all descendants

**Deleting a parent:**
- Confirmation: "Deleting this task will also delete N subtasks. Continue?"
- On confirm: soft-delete parent + all descendants

### Reordering (Opt+Up/Down)

Tree-aware reordering with automatic depth adjustment.

**Rules:**
1. Moving among siblings: retain depth
2. Moving up past parent: pop out to parent's depth
3. Moving down past last sibling: adopt depth of task below
4. Expanded task: move only the single task (orphan children to task's parent)
5. Collapsed task: move entire subtree

**Example - depth clamping:**
```
BEFORE:                      AFTER moving Grandchild down:
☐ Task A                     ☐ Task A
├─ ☐ Child                   ├─ ☐ Child
│  └─ ☐ Grandchild ⬇        ☐ Task B
☐ Task B                     └─ ☐ Grandchild  (clamped from level 2 → level 1)
```

**Example - orphan re-parenting:**
```
BEFORE:                      AFTER moving Child 1 down:
☐ Task A                     ☐ Task A
├─ ☐ Child 1  ⬇             │  └─ ☐ Grandchild  (re-parented to Task A)
│  └─ ☐ Grandchild          ├─ ☐ Child 1
└─ ☐ Child 2                 └─ ☐ Child 2
```
