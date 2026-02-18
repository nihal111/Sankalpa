# 6. Hook Size Limit

Date: 2026-02-17

## Status

Accepted

## Context

`useAppState.ts` grew to 429 lines, becoming a "God Hook" that manages all application state, derived values, data operations, UI operations, and keyboard handling. This causes:

1. **Cognitive overload** - Hard to understand what the hook does
2. **Testing difficulty** - Can't test pieces in isolation
3. **Merge conflicts** - Every feature touches the same file
4. **Hidden coupling** - Unrelated concerns share scope and accidentally depend on each other

## Decision

No custom hook may exceed 200 lines.

### Rules

1. **Hard limit: 200 lines** - If a hook approaches this, split it

2. **Split by domain, not by type** - Group state with its operations
   ```typescript
   // ❌ WRONG - splitting by type
   useAllState()      // all useState calls
   useAllEffects()    // all useEffect calls
   useAllCallbacks()  // all useCallback calls
   
   // ✅ CORRECT - splitting by domain
   useSidebarState()  // sidebar data + selection + operations
   useTasksState()    // tasks data + selection + operations
   useEditState()     // edit mode for both panes
   ```

3. **Compose in orchestrator** - One thin hook combines domain hooks
   ```typescript
   export function useAppState() {
     const sidebar = useSidebarState();
     const tasks = useTasksState(sidebar.selectedItem);
     const edit = useEditState();
     return { ...sidebar, ...tasks, ...edit };
   }
   ```

4. **Extract pure functions** - Logic that doesn't need hooks goes in `utils/`

### Measuring

Count all lines including blank lines and comments. Use `wc -l` as the measure.

## Consequences

- More files to navigate
- Must design clear interfaces between hooks
- Each hook becomes testable in isolation
- Easier to understand individual pieces
- Reduces accidental coupling
