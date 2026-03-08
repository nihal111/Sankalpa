# Electron IPC Architecture

This document explains how the renderer (React) communicates with the main process (Node.js/SQLite).

## Overview

Electron has two processes for security:
- **Renderer** - untrusted (runs web content, no direct Node.js/filesystem access)
- **Main** - trusted (full Node.js access, controls the app)

The **preload script** bridges them safely.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RENDERER PROCESS                                │
│                           (React app in browser)                             │
│                                                                              │
│   App.tsx calls:  window.api.listsCreate('id1', 'My List')                  │
│                              │                                               │
│                              ▼                                               │
│   preload.ts:    ipcRenderer.invoke('lists:create', 'id1', 'My List')       │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │  IPC message over channel 'lists:create'
                               ▼
┌──────────────────────────────┼───────────────────────────────────────────────┐
│                              │           MAIN PROCESS                        │
│                              ▼           (Node.js)                           │
│                                                                              │
│   index.ts:     ipcMain.handle('lists:create', (_, id, name) => {           │
│                   const r = createList(db, id, name);                        │
│                   saveDb();                                                  │
│                   return r;  ◄─── returned value                             │
│                 });                                                          │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │  Promise resolves with result
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              RENDERER PROCESS                                │
│                                                                              │
│   const newList = await window.api.listsCreate('id1', 'My List')            │
│   // newList = { id: 'id1', name: 'My List', sort_key: 1, ... }             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## The Three Pieces

### 1. preload.ts - Exposes API to renderer

```typescript
contextBridge.exposeInMainWorld('api', {
  listsCreate: (id, name) => ipcRenderer.invoke('lists:create', id, name),
  // ...
});
```

This makes `window.api` available in the renderer.

### 2. index.ts - Handles IPC in main process

```typescript
ipcMain.handle('lists:create', (_, id, name) => {
  const r = createList(db, id, name);
  saveDb();
  return r;
});
```

Receives the call, executes DB operations, returns result.

### 3. shared/types.ts - Type definitions

```typescript
export interface Api {
  listsCreate: (id: string, name: string) => Promise<List>;
  // ...
}

declare global {
  interface Window { api: Api; }
}
```

Provides TypeScript types for `window.api`.

## IPC Patterns

| Pattern | Use Case |
|---------|----------|
| `invoke` / `handle` | Request-response (returns Promise) |
| `send` / `on` | Fire-and-forget (no response) |

We use `invoke`/`handle` for all DB operations since we need the results. The `send`/`on` pattern is used for main→renderer notifications like `db:reloaded`.

## Cloud Sync & DB Reload Channels

Added for cloud sync and database hot-reload:

| Channel | Pattern | Direction | Description |
|---------|---------|-----------|-------------|
| `db:reloaded` | `send`/`on` | Main → Renderer | Notifies renderer to refresh after db file changes |
| `cloud:testConnection` | `invoke`/`handle` | Renderer → Main | Test Supabase connection with URL and key |
| `cloud:sync` | `invoke`/`handle` | Renderer → Main | Push local database to cloud (with GFS snapshot) |
| `cloud:restore` | `invoke`/`handle` | Renderer → Main | Replace local db with current cloud data |
| `cloud:listSnapshots` | `invoke`/`handle` | Renderer → Main | List available GFS backup snapshots |
| `cloud:restoreSnapshot` | `invoke`/`handle` | Renderer → Main | Restore local db from a specific snapshot |

## File Locations

```
src/
├── main/
│   ├── index.ts      # ipcMain.handle() registrations
│   └── preload.ts    # contextBridge.exposeInMainWorld()
├── renderer/
│   └── App.tsx       # calls window.api.*
└── shared/
    └── types.ts      # Api interface & window.api types
```
