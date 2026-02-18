# 9. Key-Value Settings Storage

Date: 2026-02-18

## Status

Accepted

## Context

The app needs to persist user settings (theme, hardcore mode, future preferences). Two approaches were considered:

**Option A: Key-value table**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Option B: Single row with typed columns**
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL DEFAULT 'system',
  hardcore_mode INTEGER NOT NULL DEFAULT 1
);
```

## Decision

Use the key-value approach (Option A).

This mirrors the pattern used by browsers like Firefox (`about:config`) and Chrome's preferences system, which have proven to scale well over decades of feature growth.

## Consequences

Positive:
- No schema migrations when adding new settings
- Flexible - any setting can be added at runtime
- Simple queries: `SELECT value FROM settings WHERE key = ?`
- Battle-tested pattern (Firefox, Chrome, VS Code, etc.)

Negative:
- Values stored as strings - type conversion needed in application code
- No database-level type enforcement
- Must handle missing keys with defaults in code

## Implementation

```sql
-- Schema
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- Usage
INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'dark');
INSERT OR REPLACE INTO settings (key, value) VALUES ('hardcore_mode', '1');
SELECT value FROM settings WHERE key = 'theme';
```

Application code handles type conversion and defaults:
- `'1'`/`'0'` for booleans
- String values stored directly
- Numbers converted via `parseInt`/`parseFloat`
