# Roadmap

Feature tracker for Sankalpa — what's next after the POC.

## Critical

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Completed list source tracking | Track which list each completed task came from | Task Lifecycle | Medium | |
| Due dates | Assign due dates to tasks; powers Today/Upcoming/Overdue smart lists | Task Properties | Medium | |

## High

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Trash | Deleted tasks go to Trash smart list; shows source list; restore support | Task Lifecycle | Medium | |
| Completed filtering | Filter Completed list by source project and by date range | Task Lifecycle | Medium | |
| Task detail panel | Third pane on the right showing selected task details | Navigation | High | |
| Search | Cmd+F to search across all tasks | Navigation | Medium | |
| Command palette | Cmd+K dropdown with all actions and their hotkeys | Navigation | Medium | |
| Subtasks / nesting | Tab to indent a task as a subtask; full nesting support | Task Organization | High | |
| Priorities | Assign priority levels to tasks; exact scheme TBD | Task Properties | Medium | |
| Drag-to-reorder | Drag tasks to reorder within a list | Task Organization | Medium | |
| Drag-to-move | Drag tasks onto a sidebar list to move them | Task Organization | Medium | |
| Notes | Add notes/description to tasks with markdown rendering | Task Properties | Medium | |
| Natural language dates | Type "tomorrow", "next friday" etc. to set due dates | Task Properties | High | |
| Web app + mobile | Web version for phone access; includes mobile quick capture | Platform | Very High | |

## Medium

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Due date in detail panel | Show and edit due date in the right-side detail panel (hotkey D) | Task Properties | Medium | |
| App logo | Design and add an app logo | UI Polish | Low | |
| Someday/Maybe list | Smart list as a parking lot for non-actionable ideas | Task Organization | Low | |
| Trash retention | Auto-purge trash after configurable period; setting in preferences | Task Lifecycle | Medium | |
| Headings / sections | Lightweight grouping of tasks within a list | Task Organization | Medium | |
| Contextual hotkey bar | Show available keybindings in bottom bar on all main screens | UI Polish | Medium | |
| E2E GIF recording | Run Playwright with a flag to produce GIF; attach to PRs as proof | Platform | Medium | |
| Productivity stats | Track tasks completed per day, sum of durations, trends over time | Platform | High | |

## Stretch

| Feature | Description | Theme | Complexity | Status |
|---------|-------------|-------|------------|--------|
| Delete confirmation | Optional setting to confirm before deleting a task | Task Lifecycle | Low | |
| Snooze | Snooze a task to reappear later (hotkey S) | Task Properties | High | |
| Recurring tasks | Set tasks to repeat on a schedule (hotkey R) | Task Properties | High | |
| Task duration | Set estimated duration on tasks (hotkey Opt+D) | Task Properties | High | |
| Labels | Tag tasks with labels (hotkey Cmd+L) | Task Properties | High | |
| Attachments | Attach files to tasks (hotkey A) | Task Properties | High | |
| Cloud sync | Cloud-based persistence for cross-device data sync | Platform | Very High | |

## Discussion Items

- **Areas vs Folders** — Rethink whether folders should become "areas" (ongoing responsibilities) vs projects (finite, completable). Needs design discussion before becoming a feature.
