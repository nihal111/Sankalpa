# 10. E2E Test Recording

Date: 2026-02-18

## Status

Accepted

## Context

### The problem: asynchronous agentic development

We want AI agents to work on Sankalpa autonomously — picking up a task, implementing it, and producing a pull request without a human watching in real time. The challenge is verification: how does a reviewer (human or automated) confirm that the feature actually works?

Unit tests prove logic correctness, but they don't show what the user sees. A passing test suite tells you the assertions held, not that the UI rendered correctly, animations played, or the interaction felt right. For a keyboard-driven app where the entire UX is visual feedback to keypresses, this gap matters.

The goal: when an agent completes a task, it runs the e2e test suite and attaches animated GIF recordings to the PR as visual proof. A reviewer can scrub through the GIFs and see exactly what happened — tasks being created, selections moving, items reordering — without checking out the branch or launching the app.

### Why not Playwright's `recordVideo`?

Playwright officially supports `recordVideo` on `electron.launch()` since v1.12. We investigated this thoroughly and found it is broken with Electron 40 + Playwright 1.58. When `recordVideo` is passed:

1. `firstWindow()` returns a page with an empty URL
2. The renderer process never loads (blank white screen)
3. The app's `loadFile` call never executes

This is a Playwright bug where the screencast setup hijacks the browser context before the Electron app creates its window. Confirmed through:

- Debug scripts showing `page.url()` returns empty string with `recordVideo`, works fine without
- Only one window exists (not a second-window issue)
- `waitForURL` times out — the page never navigates
- `page.screenshot()` works perfectly without `recordVideo`
- The issue is distinct from the older zero-length webm bug (fixed in PR #10810 for Playwright ~1.17)

## Decision

Capture screenshots at regular intervals during test execution and encode them into animated GIFs using pure JavaScript libraries.

### Implementation

**Capture phase** — In `launchApp()`, when `RECORD=1` env var is set, start an interval timer that calls `page.screenshot()` every 100ms, collecting PNG buffers in an array.

**Encode phase** — In `closeApp()`, stop the timer, decode PNG buffers to raw RGBA pixels using `pngjs`, quantize colors and encode frames into an animated GIF using `gifenc`.

**Output** — One GIF per spec file, saved to `test-recordings/<spec-name>.gif`.

```typescript
// e2e/helpers.ts (simplified)
export type Recorder = { timer: ReturnType<typeof setInterval>; frames: Buffer[] } | null;

// In launchApp(), when RECORD=1:
const frames: Buffer[] = [];
const timer = setInterval(async () => {
  try { frames.push(await page.screenshot()); } catch {}
}, 100);

// In closeApp():
for (const buf of pngBuffers) {
  const { data, width, height } = PNG.sync.read(buf);
  const palette = quantize(data, 256);
  const index = applyPalette(data, palette);
  gif.writeFrame(index, width, height, { palette, delay: 100 });
}
```

### Dependencies

- `gifenc` — Pure JavaScript GIF encoder. No native modules, no canvas, no ffmpeg. 5KB before gzip.
- `pngjs` — Pure JavaScript PNG decoder. Needed to convert Playwright's PNG screenshot buffers to raw RGBA pixels for gifenc.

Both are dev dependencies only.

### Scripts

- `npm run test:e2e` — Normal test run, 2s timeout
- `npm run test:e2e:record` — Build, run tests with screenshot capture, encode GIFs. 10s timeout to allow for GIF encoding overhead in `afterAll` hooks.

### Timeout strategy

The test timeout is 2s normally (tests complete in under 900ms). When `RECORD=1`, the timeout increases to 10s because GIF encoding in the `afterAll` hook can take a few seconds for spec files with many frames.

```typescript
// playwright.config.ts
timeout: process.env.RECORD === '1' ? 10000 : 2000,
```

## Consequences

- Agents can attach GIF recordings to PRs as visual proof of working features
- Enables fully asynchronous development — no human needs to watch the tests run
- Zero native dependencies — works on any OS without ffmpeg or system libraries
- Recording adds ~3s overhead to the full test suite (19s vs 16s)
- GIF output is compact: 200KB–650KB per spec file
- ~9 frames per second at 100ms intervals — sufficient to show UI interactions clearly
- GIF color quantization (256 colors) is adequate for our flat UI but would degrade for photographic content
- The `page.screenshot()` approach is a workaround for the broken `recordVideo`; if Playwright fixes the Electron 40 incompatibility, we could switch to native WebM recording for better quality and smaller files
