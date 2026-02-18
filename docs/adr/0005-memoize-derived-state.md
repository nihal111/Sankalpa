# 5. Memoize Derived State

Date: 2026-02-17

## Status

Accepted

## Context

React components and hooks re-render frequently. Any value computed directly in a component body runs on every render, even when inputs haven't changed. This causes:

1. **Wasted CPU cycles** - Rebuilding arrays/objects that haven't changed
2. **Unstable references** - New object references trigger downstream re-renders and effect re-runs
3. **Subtle bugs** - Effects with object dependencies fire unexpectedly, clobbering state

We discovered this when `sidebarItems` was rebuilt every render, causing `selectedSidebarItem` to be a new object reference each time. This made callbacks stale and effects fire at wrong times.

## Decision

All derived/computed state in React components and hooks MUST use `useMemo`.

### Rules

1. **Arrays and objects derived from state** → `useMemo`
   ```typescript
   // ❌ WRONG - rebuilds every render
   const items = buildItems(data);
   
   // ✅ CORRECT - only rebuilds when data changes
   const items = useMemo(() => buildItems(data), [data]);
   ```

2. **Chained derivations** → Each level memoized
   ```typescript
   const items = useMemo(() => buildItems(data), [data]);
   const selectedItem = useMemo(() => items[index], [items, index]);
   const selectedId = useMemo(() => selectedItem?.id ?? null, [selectedItem]);
   ```

3. **Dependencies must be stable** - Use primitives (strings, numbers) or memoized values, never raw objects from parent scope

4. **Extract complex logic to pure functions** - Easier to test, clearer dependencies
   ```typescript
   // utils/buildSidebarItems.ts
   export function buildSidebarItems(folders: Folder[], lists: List[]): SidebarItem[] { ... }
   
   // hook
   const sidebarItems = useMemo(() => buildSidebarItems(folders, lists), [folders, lists]);
   ```

### Exceptions

- Primitives (strings, numbers, booleans) don't need memoization
- Values only used in render output (not in deps) may skip memoization if computation is trivial

## Consequences

- Slightly more verbose code
- Must think about dependency arrays
- Prevents entire class of "stale reference" bugs
- Enables React's rendering optimizations to work correctly
