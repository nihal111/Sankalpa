# 11. Scoped Sort Keys for Nested Tasks

Date: 2026-02-28

## Status

Superseded by [ADR-0012](0012-simplified-task-ordering.md)

## Context

[ADR-0003](0003-fractional-sort-key-ordering.md) established fractional `sort_key` ordering for tasks and lists. That design assumed a **flat list** model where all tasks in a list share a single sort_key namespace.

When subtask nesting was added (via `parent_id`), a fundamental mismatch emerged:

1. **Database layer**: Tasks sorted globally by `sort_key` within a list
2. **UI layer**: Tasks displayed as a tree, traversed depth-first from `parent_id` relationships

This creates two different orderings:

```
Database (ORDER BY sort_key):    UI (tree traversal):
1. Parent (1.0)                  1. Parent
2. B (1.5)                          └─ Child1
3. A (1.75)                            └─ Grandchild
4. Child1 (2.0)                  2. B
5. C (2.0)                       3. A
6. Grandchild (2.125)            4. C
7. D (2.5)                       5. D
```

This mismatch caused bugs where drag-drop operations used database indices but UI displayed tree indices, resulting in wrong tasks being reordered.

## Decision

**Scope sort keys to siblings** (tasks sharing the same `parent_id`).

Each task's `sort_key` represents its position among its siblings, not its global position in the list. The tree builder sorts children by `sort_key` when constructing the visual order.

### Before (global sort_key)

| Task | parent_id | sort_key |
|------|-----------|----------|
| Parent | null | 1.0 |
| Child1 | Parent | 2.0 |
| Grandchild | Child1 | 2.125 |
| B | null | 1.5 |

### After (sibling-scoped sort_key)

| Task | parent_id | sort_key |
|------|-----------|----------|
| Parent | null | 1 |
| Child1 | Parent | 1 |
| Grandchild | Child1 | 1 |
| B | null | 2 |

### Implementation

1. Tree builder sorts children by `sort_key` when traversing
2. Reorder operations find adjacent **siblings** (same `parent_id`)
3. Sort key calculation uses sibling boundaries, not visual boundaries
4. Migration normalizes existing data to sibling-scoped keys

## Consequences

### Positive

- Single source of truth: tree order IS the canonical order
- Simpler drag-drop: operate on siblings only
- No more `tasks[]` vs `flatTasks[]` index confusion
- Cleaner mental model matching user expectations

### Negative

- Requires one-time data migration
- Queries can no longer rely on global `ORDER BY sort_key` for visual order

### Migration

Run normalization on app startup (idempotent):
- Group tasks by `(list_id, parent_id)`
- Reassign sort_keys as 1, 2, 3... within each group

## References

- [ADR-0003: Fractional Sort Key Ordering](0003-fractional-sort-key-ordering.md)
- [Subtask Nesting Feature](../features/subtask-nesting.md)
