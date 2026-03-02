# Due Dates

Set deadlines on tasks with natural language input.

![Set due date](../gifs/gif-due-date.gif)

## Keybinding

| Key | Action |
|-----|--------|
| `D` | Open due date picker |

## Input

The picker accepts natural language:

- `today`, `tomorrow`, `tom`
- `monday`, `tue`, `wednesday`
- `next week`, `next month`
- `jan 15`, `2024-03-01`
- `3pm`, `tomorrow 2pm`

## Display

Tasks show due dates with relative formatting:

| Condition | Display |
|-----------|---------|
| Today | "Today" |
| Tomorrow | "Tomorrow" |
| Within 7 days | Weekday name (e.g., "Wednesday") |
| Beyond 7 days | Date (e.g., "Jan 15") |
| Overdue | Red text with date |

Time is shown when set (e.g., "Today 3:00 PM").

## Clearing

Leave the input empty and confirm to remove the due date.
