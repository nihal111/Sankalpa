# Roadmap

Feature tracker for Sankalpa — what's next after the POC.

## High

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Delete lists | Deleting non-empty lists should ask for confirmation (reuse modal) | Task Lifecycle | Low | |
| Subtasks UX overhaul | Chevron in existing left padding (no extra indent on parent); tree lines fully connected to checkbox and continuous | UI Polish | High | |
| Priorities | Assign priority levels to tasks; exact scheme TBD | Task Properties | Medium | |
| Web app + mobile | Web version for phone access; includes mobile quick capture | Platform | Very High | |
| Always-visible detail panel | Third pane always shown; empty states: "No task selected" (list with no cursor), "No tasks in section" (empty virtual list), "N tasks selected" (multi-select) | UI Polish | Medium | |
| Duration | `⌥D` opens natural-language picker (defaults: 15m, 30m, 1h; supports arbitrary like 3d, 1w); task row shows duration overlay (e.g. "60 min" with 📏 icon) to the left of the due-date overlay | Task Properties | High | |
| Wire up Upcoming list | Filter tasks with due dates beyond today, sorted by due date ascending; list becomes non-grayed when it has tasks | Task Organization | Medium | |
| Task context menu | Right-click menu on tasks with: Edit notes (`N`), Set due date (`D`), Pick labels (`⌘L`), Toggle complete (`⌘↵`), Duplicate (`⌘D`), Delete (`⌫`), Move to list (`M`) | UI Polish | Medium | |
| List context menu | Right-click menu on user lists with: Rename (`⌘⇧E`), Duplicate, Delete, Move to folder (`M`), Show info (`⌘I`) | UI Polish | Medium | |
| Overdue list with red badge | Overdue tasks appear in a dedicated Overdue virtual list; sidebar shows red count badge; task title and due date rendered in red | UI Polish | Medium | |
| Overdue tasks in Today list | Overdue tasks also appear in the Today list; Today shows a red badge (overdue count) alongside a normal badge (non-overdue count) | UI Polish | Medium | |

## Medium

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Trash retention | Auto-purge trash after configurable period; setting in preferences | Task Lifecycle | Medium | |
| Someday/Maybe list | Smart list as a parking lot for non-actionable ideas | Task Organization | Low | |
| App logo | Design and add an app logo | UI Polish | Low | |
| Headings / sections | Lightweight grouping of tasks within a list | Task Organization | Medium | |
| Contextual hotkey bar | Show available keybindings in bottom bar on all main screens | UI Polish | Medium | |
| Productivity stats | Track tasks completed per day, sum of durations, trends over time | Platform | High | |
| Larger default window | Investigate whether monitor-size detection is needed; increase default window to ~2x width, ~1.5x height (or scale proportionally keeping current aspect ratio); clamp to screen bounds | UI Polish | Low | |
| Sticky cursor per list | Remember cursor position per list; restoring it when navigating back opens that task in the detail panel | Task Organization | Medium | |
| Indent/outdent lists | Tab/Shift+Tab to nest a list under a folder or remove it; outdenting moves the list below the folder's last child | Task Organization | Medium | |
| Delete list confirmation | Modal: heading "Confirm list deletion", body "This will also delete the N tasks in this list", Cancel (`Esc` keycap), Delete List (`⌘↵` keycap) | UI Polish | Low | |
| Move list to folder | Hotkey `M` on a list to move it into/out of a folder (analogous to move task between lists) | Task Organization | Medium | |
| List info modal | `⌘I` shows modal with list title, markdown-editable notes, and creation timestamp | Task Properties | Medium | |
| Duplicate list | Creates a copy of the list with all its tasks; new list named "{original} (copy)" | Task Lifecycle | Medium | |
| Duplicate task | `⌘D` creates a copy of the task in the same list with all properties preserved | Task Lifecycle | Low | |
| Cycle lists with Ctrl+Tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` moves down/up through lists in the sidebar while keeping cursor focus in the tasks pane | UI Polish | Medium | |
| Quick-switch lists by number | Holding `⌘` shows numeric keycap badges (1, 2, 3…) on each visible list in the sidebar (skipping collapsed folder children); pressing the number switches to that list | UI Polish | High | |
| Task count badges on virtual lists | Show numeric count badges on Today and Upcoming sidebar items indicating number of tasks in each | UI Polish | Low | |
| Virtual list label refresh | Fix bug: Today/Upcoming sidebar labels stay grayed out after a task qualifies for them; should update reactively when tasks change | UI Polish | Low | |
| New folder via command palette | Add "New Folder" action to `⌘K` palette | Task Organization | Low | |

## Stretch

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Snooze | Snooze a task to reappear later (hotkey S) | Task Properties | High | |
| Recurring tasks | Set tasks to repeat on a schedule (hotkey R) | Task Properties | High | |
| Task duration | Set estimated duration on tasks (hotkey Opt+D) | Task Properties | High | |
| Labels | Tag tasks with labels (hotkey Cmd+L) | Task Properties | High | |
| Attachments | Attach files to tasks (hotkey A) | Task Properties | High | |
| Cloud sync | Cloud-based persistence for cross-device data sync | Platform | Very High | |

## Low

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Empty list placeholder | New/empty lists show a hint using existing keycap badge component (e.g. `⌘` + `N`) prompting user to create a task | UI Polish | Low | |
| Due date empty state | Detail panel shows "Set due date" instead of "None" when no due date is set | UI Polish | Low | |
| Snooze in detail panel | Add snooze field to detail panel (🕐 icon, hotkey `S`); display only, grayed out, not wired up | UI Polish | Low | |
| Repeat in detail panel | Add repeat/recurring field to detail panel (🔁 icon, hotkey `R`); display only, grayed out, not wired up | UI Polish | Low | |
| Labels in detail panel | Add labels field to detail panel (hotkey `⌘L`); below separator after duration; display only, grayed out, not wired up | UI Polish | Low | |
| Keycap badges in command palette | Replace plain-text hotkeys in `⌘K` results with keycap badge styling | UI Polish | Low | |
| Trash list origin alignment | Show source list name on the right side of trash items (matching completed list style) instead of as a byline under the task name | UI Polish | Low | |
| List created timestamp | Store and expose creation timestamp for user lists (if not already tracked in schema) | Task Properties | Low | |

## Discussion Items

- **Areas vs Folders** — Rethink whether folders should become "areas" (ongoing responsibilities) vs projects (finite, completable). Needs design discussion before becoming a feature.
