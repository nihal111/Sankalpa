# Roadmap

Feature tracker for Sankalpa — what's next after the POC.

## High

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Task completion animation | Change animation to be left to right fill of the task div (like a progress bar) | UI Polish | Medium | ✅ |
| Task move animation | Show/focus the list that the task was moved to | UI Polish | Low | ✅ |
| Delete lists | Deleting non-empty lists should ask for confirmation (reuse modal) | Task Lifecycle | Low | ✅ |
| Subtasks UX overhaul | Chevron in existing left padding (no extra indent on parent); tree lines fully connected to checkbox and continuous | UI Polish | High | |
| Priorities | Assign priority levels to tasks; exact scheme TBD | Task Properties | Medium | |
| Web app + mobile | Web version for phone access; includes mobile quick capture | Platform | Very High | |

## Medium

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| App logo | Design and add an app logo | UI Polish | Low | |
| Someday/Maybe list | Smart list as a parking lot for non-actionable ideas | Task Organization | Low | |
| Trash retention | Auto-purge trash after configurable period; setting in preferences | Task Lifecycle | Medium | |
| Headings / sections | Lightweight grouping of tasks within a list | Task Organization | Medium | |
| Contextual hotkey bar | Show available keybindings in bottom bar on all main screens | UI Polish | Medium | |
| Productivity stats | Track tasks completed per day, sum of durations, trends over time | Platform | High | |

## Stretch

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Snooze | Snooze a task to reappear later (hotkey S) | Task Properties | High | |
| Recurring tasks | Set tasks to repeat on a schedule (hotkey R) | Task Properties | High | |
| Task duration | Set estimated duration on tasks (hotkey Opt+D) | Task Properties | High | |
| Labels | Tag tasks with labels (hotkey Cmd+L) | Task Properties | High | |
| Attachments | Attach files to tasks (hotkey A) | Task Properties | High | |
| Cloud sync | Cloud-based persistence for cross-device data sync | Platform | Very High | |

## Discussion Items

- **Areas vs Folders** — Rethink whether folders should become "areas" (ongoing responsibilities) vs projects (finite, completable). Needs design discussion before becoming a feature.
