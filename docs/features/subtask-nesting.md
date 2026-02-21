# Subtask Nesting

Hierarchical task organization with Tab/Shift+Tab indentation.

## Behavior

### Nesting

- **Tab**: Indent task as child of task above
- **Shift+Tab**: Outdent task one level  
- **`c` key**: Toggle collapse/expand on parent tasks
- **Max depth**: 3 levels (root → child → grandchild)

### Depth Limits

When indent/outdent is blocked, show "throb" animation (horizontal bounce):
- Tab on first task (no parent available)
- Tab at max depth (level 3)
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

### Reordering (Cmd+Shift+Up/Down)

Text-editor semantics: tasks keep indentation, parent relationships update by position.

**Rules:**
1. Task depth ≤ `task_above.depth + 1` (clamped if violated)
2. Task at top → auto-outdent to level 0
3. Orphaned children re-parent to nearest valid ancestor above
4. Collapsed parent moves with entire subtree

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
