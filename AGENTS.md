# Agent Instructions

Guidelines for AI agents working on this codebase.

## Environment

- **Package Manager**: Use `npm` for all operations
- **Dev Server**: `npm run dev`
- **Tests**: `npm test` or `npm run test:coverage`

## TypeScript Standards

- **Type Hints**: ALL functions must have complete type annotations (parameters and return types)
- **Strict Mode**: Enabled in tsconfig.json - build will fail on type errors
- **No `any`**: Avoid `any` type unless absolutely necessary

## Code Organization

- Public methods/exports first
- Private/helper functions arranged in order they are first called
- Keep files focused and small

## Error Handling Policy

**Default to throwing exceptions for unspecified error cases.**

- Let exceptions propagate naturally for any error not explicitly specified
- Do NOT use try/catch blocks with fallback values or silent recovery unless specified
- Do NOT catch and log exceptions without re-throwing unless specified

**Rationale:** Fail loudly during development so engineers can identify missing error handling. Silent failures hide problems.

```typescript
// ✅ CORRECT - specification doesn't mention error handling
const data = JSON.parse(rawData); // Let SyntaxError propagate

// ❌ WRONG - inventing unspecified behavior
try {
  const data = JSON.parse(rawData);
} catch {
  const data = {}; // Don't invent fallbacks
}
```

## Commits

- Follow the template in `.gitmessage`
- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Tests run on every commit (pre-commit hook)

## Before Starting

Read these files:
- `README.md` - Project overview and keybindings
- `DEVELOPING.md` - Setup instructions
- `docs/POC_plan.md` - Implementation plan and data model
- `docs/adr/` - Architecture Decision Records (must be followed)
