# 12. Simplified Task Ordering

Date: 2026-03-01

## Status

Accepted

Supersedes: [ADR-0011](0011-scoped-sort-keys-for-nested-tasks.md) (which is now marked Superseded)

## Context

[ADR-0011](0011-scoped-sort-keys-for-nested-tasks.md) introduced scoped sort keys for nested tasks, which was the right direction. However, the implementation left residual complexity:

1. **Effective parent calculation duplicated** - `flattenWithDepth()` computes effective parent (treating orphaned tasks as root-level), but `getAdjacentSibling()` recomputes it using depth heuristics
2. **TaskWithDepth missing effective parent** - The tree builder knows the effective parent but doesn't expose it, forcing consumers to infer it from depth
3. **Sibling lookup searches through array** - `getAdjacentSibling()` iterates through `flatTasks` looking for siblings instead of using the tree structure

## Decision

**Store effective parent in `TaskWithDepth`** and simplify sibling lookup.

### Changes

1. Add `effectiveParentId` to `TaskWithDepth` interface
2. `flattenWithDepth()` populates `effectiveParentId` during tree traversal
3. `getAdjacentSibling()` uses `effectiveParentId` directly instead of depth-based inference
4. Remove "effective parent" comments and depth-based parent detection

### Before

```typescript
interface TaskWithDepth {
  task: Task;
  depth: number;
  isLastChild: boolean;
  ancestorIsLast: boolean[];
}

// In getAdjacentSibling - recomputing effective parent from depth
const effectiveParentId = current.depth === 0 ? null : current.task.parent_id;
```

### After

```typescript
interface TaskWithDepth {
  task: Task;
  depth: number;
  isLastChild: boolean;
  ancestorIsLast: boolean[];
  effectiveParentId: string | null;  // Added
}

// In getAdjacentSibling - direct lookup
const effectiveParentId = current.effectiveParentId;
```

## Consequences

### Positive

- Single source of truth for effective parent (computed once in `flattenWithDepth`)
- Simpler `getAdjacentSibling` - no depth-based inference
- Clearer mental model - `TaskWithDepth` contains all derived info

### Negative

- Slightly larger `TaskWithDepth` objects (one extra field)
- Requires updating all `TaskWithDepth` construction sites

## References

- [ADR-0003: Fractional Sort Key Ordering](0003-fractional-sort-key-ordering.md)
- [ADR-0011: Scoped Sort Keys for Nested Tasks](0011-scoped-sort-keys-for-nested-tasks.md) (superseded)
