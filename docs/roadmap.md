# Roadmap

Feature tracker for Sankalpa — what's next after the POC.

## Critical

Bugs and improvements that need immediate attention.

| Item | Type | Description | Status |
|------|------|-------------|--------|
| Hardcore mode default | Fix | Should be OFF by default | |
| Due date relative display | Fix | Show Today/Tomorrow/weekday within 7 days | |
| Due date autocomplete | Fix | "tom", "tm", "tomo" → "tomorrow" | |
| Notes editor UX | Fix | Large modal with edit/preview toggle | |
| Multi-select complete | Fix | Cmd+Enter should mark all selected tasks | |
| Overdue list nav bug | Fix | Down arrow from Inbox skips hidden Overdue | |
| Today badge | Fix | Show two badges: red (overdue) + black (today) | |
| Smart list task origin | Fix | Today/Overdue/Upcoming show source list name | |
| Command palette scroll | Fix | Auto-scroll to follow cursor | |
| Cut/Paste tasks | Feature | Cmd+X / Cmd+V with markdown format | |
| Create from clipboard | Feature | Cmd+Shift+V parses markdown list into tasks | |
| Local search | Feature | Cmd+F searches within current list only | |

## High

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
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
