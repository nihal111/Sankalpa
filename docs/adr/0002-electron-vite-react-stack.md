# 2. Tech Stack: Electron + Vite + React + TypeScript

Date: 2026-02-16

## Status

Accepted

## Context

We are building Sankalpa, a macOS-first, keyboard-driven todo application.

Primary priorities (in order):

1. Maximize development velocity via AI/CLI agents
2. Fast iterative build-test loop
3. Clean, modern UI
4. Responsive keyboard interactions
5. Footprint is a lower priority for POC

Core functional requirements:
- System-wide global hotkeys
- Spotlight-style summon behavior (toggle window)
- Hardcore keyboard mode (mouse disabled)
- SQLite persistence
- Snappy list + reorder interactions

We expect to potentially rewrite or optimize the stack later once the product behavior stabilizes.

## Options Considered

### 1. Electron + Web Stack (Chosen)
Pros:
- Mature global shortcut API
- Massive ecosystem and example surface
- Excellent support in AI/agent code generation
- Fast iteration cycle (no Rust compile step)
- Strong SQLite integration via better-sqlite3
- Cross-platform optionality

Cons:
- Larger binary size
- Higher memory baseline due to Chromium
- Less "native" feel compared to macOS AppKit/SwiftUI

### 2. Tauri (Rust + WebView)
Pros:
- Smaller bundle size
- Lower memory overhead
- Rust backend for performance-critical paths

Cons:
- Slower compile times when Rust changes
- Smaller ecosystem surface for AI agents
- Higher cognitive overhead for early iteration

Rejected for POC due to reduced agent velocity and slower iteration loops.

### 3. Native macOS (SwiftUI/AppKit)
Pros:
- Best possible macOS integration
- Native performance and feel

Cons:
- Significantly smaller ecosystem for agent-driven development
- Slower iteration
- macOS lock-in from day one

Rejected for POC due to development speed constraints.

## Decision

Adopt:

- **Electron** for desktop shell and global hotkeys
- **Vite** for fast HMR and minimal build configuration
- **React** for UI composition and ecosystem leverage
- **TypeScript (strict mode)** for safety and maintainability
- **better-sqlite3** for synchronous, simple local persistence

Design principle:
Optimize for rapid iteration and behavior validation first.
Footprint and native optimizations can be revisited once UX is locked.

## Consequences

Positive:
- Extremely fast agent-assisted development
- Large public example surface area
- Easy refactoring and experimentation
- Cross-platform optionality retained

Negative:
- Larger bundle size (~100–150MB typical Electron range)
- Higher idle memory footprint
- Some macOS-native polish trade-offs

Mitigation:
- Architecture will isolate core logic from Electron-specific APIs.
- Future migration to Tauri or native shell remains feasible.
- Performance-critical logic (if needed) can later move to Rust or native modules.

## Notes

This decision prioritizes iteration speed and agent leverage over runtime footprint.
The stack may be reevaluated after core keyboard UX is validated.
