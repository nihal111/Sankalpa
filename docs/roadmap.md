# Roadmap

Feature tracker for Sankalpa — what's next after the POC.

## High

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Subtask-aware reorder | Change reorder hotkey from Cmd+Shift+↑/↓ to Opt+↑/↓. Moving among siblings retains depth; moving past parent pops out to parent's depth; moving past last sibling adopts depth of the task below. If expanded, move only the single task; if collapsed, move the entire subtree. | Subtasks | High | |
| Subtask-aware duplicate | Cmd+D preserves parent_id so duplicate stays at same nesting level, inserted right after original. If expanded, duplicate only the single task; if collapsed, deep-duplicate the entire subtree. | Subtasks | Medium | |
| Labels | Tag tasks with labels (hotkey Cmd+L) | Task Properties | High | |
| Priorities | Assign priority levels to tasks; exact scheme TBD | Task Properties | Medium | |
| Web app + mobile | Web version for phone access; includes mobile quick capture | Platform | Very High | |



## Medium

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Trash retention | Auto-purge trash after configurable period; setting in preferences | Task Lifecycle | Medium | |
| Someday/Maybe list | Smart list as a parking lot for non-actionable ideas | Task Organization | Low | |
| App logo | Design and add an app logo | UI Polish | Low | |
| Headings / sections | Lightweight grouping of tasks within a list | Task Organization | Medium | |
| Contextual hotkey bar | Show available keybindings in bottom bar on all main screens | UI Polish | Medium | |


## Stretch

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Productivity stats | Track tasks completed per day, sum of durations, trends over time | Platform | High | |
| Snooze | Snooze a task to reappear later (hotkey S) | Task Properties | High | |
| Recurring tasks | Set tasks to repeat on a schedule (hotkey R) | Task Properties | High | |
| Attachments | Attach files to tasks (hotkey A) | Task Properties | High | |
| Cloud sync | Cloud-based persistence for cross-device data sync | Platform | Very High | |

## Discussion Items

- **Areas vs Folders** — Rethink whether folders should become "areas" (ongoing responsibilities) vs projects (finite, completable). Needs design discussion before becoming a feature.
