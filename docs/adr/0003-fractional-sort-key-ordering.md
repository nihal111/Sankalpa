# 3. Ordering Strategy: Fractional `sort_key` (REAL)

Date: 2026-02-16

## Status

Accepted

## Context

Sankalpa requires:

- Reordering tasks within a list
- Reordering lists
- Moving tasks between lists
- Keyboard-first interactions with instant visual feedback
- SQLite as the persistence layer

The ordering mechanism must:

- Be simple to implement
- Support O(1) reorder operations
- Avoid frequent full-list renumbering
- Scale to larger lists without complexity
- Preserve deterministic behavior for optimistic UI updates

We need a stable ordering system that works well with:

- `ORDER BY` queries in SQLite
- Optimistic in-memory updates
- Minimal write operations during reordering

## Options Considered

### 1. Dense Integer Positioning (1, 2, 3...)

Each item stores an INTEGER position.

Reorder:
- Swap integer values between neighbors.

Insert between:
- Requires renumbering many rows.

Pros:
- Very simple
- Easy to reason about

Cons:
- Frequent renumbering when inserting in middle
- Poor long-term flexibility
- Larger write operations as list grows

Rejected due to renumbering overhead and limited flexibility.

---

### 2. Linked List (prev_id / next_id)

Each item stores references to adjacent items.

Reorder:
- Pointer updates.

Pros:
- No numeric ordering issues
- Local updates only

Cons:
- More complex logic
- Harder queries (no natural ORDER BY)
- Harder to debug
- Higher risk of pointer corruption

Rejected due to unnecessary complexity.

---

### 3. Fractional Ordering Using REAL `sort_key` (Chosen)

Each item stores a REAL value representing its order.

Initial spacing:
- 1, 2, 3...

Reorder:
- Swap sort_key with neighbor (2 updates).

Insert between:
- New sort_key = (prev + next) / 2.

Move to end:
- max(sort_key) + 1.

Pros:
- O(1) reorder and insert
- No full-list renumbering required
- Works naturally with `ORDER BY sort_key`
- Compatible with optimistic UI updates
- Minimal writes
- Future-proof for drag-and-drop or arbitrary inserts

Cons:
- Floating-point precision may degrade after many repeated midpoint inserts.
- Rare need for "rebalance" operation.

Mitigation:
- If spacing becomes too small (difference < threshold),
  rebalance list by renumbering to spaced integers.
- Rebalance can run lazily and rarely.

## Decision

Adopt REAL `sort_key` with fractional ordering.

Rules:

- Always query using `ORDER BY sort_key`.
- Reorder up/down swaps sort_key values.
- Insert operations use midpoint calculation.
- Moving to another list appends using max(sort_key) + 1.
- Optimistically update in-memory state before DB write.

## Consequences

Positive:
- Efficient reordering
- Clean SQL queries
- Minimal write amplification
- Easy future extension

Negative:
- Slight conceptual overhead vs simple integers
- Requires occasional rebalance safeguard

## Notes

This approach prioritizes:

- Keyboard-first responsiveness
- Minimal DB churn
- Long-term extensibility

This ordering strategy applies to both:
- `lists.sort_key`
- `tasks.sort_key`
