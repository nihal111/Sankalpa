# 7. Keyboard Handling Pattern

Date: 2026-02-17

## Status

Accepted

## Context

Keyboard-first apps have complex key handling logic. In `useAppState.ts`, `handleKeyDown` grew to 80+ lines with a massive dependency array that caused the handler to be recreated on nearly every state change. The handler owned no state but depended on everything.

## Decision

Keyboard handlers receive action callbacks and don't own state. Use a command pattern for testability.

### Rules

1. **Handlers receive actions, don't own state**
   ```typescript
   // ❌ WRONG - handler knows about state internals
   const handleKeyDown = useCallback((e: KeyboardEvent) => {
     if (e.key === 'n' && e.metaKey) {
       const id = crypto.randomUUID();
       await window.api.tasksCreate(id, selectedListId, '');
       // ... 10 more lines of state manipulation
     }
   }, [selectedListId, /* 15 more deps */]);
   
   // ✅ CORRECT - handler dispatches to action
   const handleKeyDown = useCallback((e: KeyboardEvent) => {
     if (e.key === 'n' && e.metaKey) {
       actions.createTask();
     }
   }, [actions]);
   ```

2. **Command pattern for key mappings**
   ```typescript
   type Command = () => void | Promise<void>;
   
   interface KeyboardDeps {
     createTask: Command;
     deleteTask: Command;
     startEdit: Command;
     // ...
   }
   
   function useKeyboardNavigation(deps: KeyboardDeps) {
     useEffect(() => {
       const handler = (e: KeyboardEvent) => {
         if (e.metaKey && e.key === 'n') { e.preventDefault(); deps.createTask(); return; }
         if (e.key === 'Delete') { e.preventDefault(); deps.deleteTask(); return; }
         // ...
       };
       window.addEventListener('keydown', handler);
       return () => window.removeEventListener('keydown', handler);
     }, [deps]);
   }
   ```

3. **Stable action references** - Actions passed to keyboard handler must be memoized with `useCallback` and have minimal dependencies

4. **Separate navigation from actions** - Arrow key navigation is different from action keys (Enter, Delete, etc.)

### Benefits

- Keyboard handler has small, stable dependency array
- Actions are testable without simulating key events
- Key mappings are visible in one place
- Easy to add/change keybindings

## Consequences

- More indirection (key → command → action)
- Must ensure action callbacks are stable
- Cleaner separation of "what key was pressed" from "what should happen"
- Keyboard tests can mock actions instead of full app state
