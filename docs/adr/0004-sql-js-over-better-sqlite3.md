# 4. Use sql.js Instead of better-sqlite3

Date: 2026-02-16

## Status

Accepted

## Context

The app uses SQLite for persistence. Initially we chose `better-sqlite3` for its performance and synchronous API.

However, `better-sqlite3` is a native Node module that must be compiled against a specific Node ABI version. Electron bundles its own Node version with a different ABI than system Node.

This caused a conflict:
- Tests run on system Node (ABI 141)
- Electron runs on its bundled Node (ABI 143)
- Native modules can only be compiled for one ABI at a time

Running `npm test` required rebuilding for system Node. Running `npm run dev` required rebuilding for Electron. This made development painful and CI unreliable.

## Decision

Switch from `better-sqlite3` to `sql.js`.

`sql.js` is SQLite compiled to WebAssembly. It runs identically in any JavaScript environment without native compilation.

## Consequences

Positive:
- No native module conflicts between test and runtime environments
- Works in Electron, Node, and browsers without rebuilding
- Simpler CI/CD - no `electron-rebuild` step needed
- Easier onboarding - `npm install` just works

Negative:
- Slightly slower than native SQLite (acceptable for a todo app)
- Database must be explicitly saved to disk (not automatic)
- Async initialization required

## Notes

The API change was minimal:
- `db.prepare().all()` → custom `queryAll()` helper
- `db.exec()` → `db.run()` for statements
- Added `saveDb()` calls after mutations
