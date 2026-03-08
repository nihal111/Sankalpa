#!/bin/sh
# Check that hook files don't exceed 200 lines (ADR-0006)

MAX_LINES=200
EXIT_CODE=0

# Legacy oversized hooks are temporarily exempt until they are split by domain.
# Keep this list minimal and remove entries as files are refactored.
is_exempt_hook() {
  case "$1" in
    src/renderer/useAppState.ts|\
    src/renderer/hooks/useMoveListState.ts|\
    src/renderer/hooks/useSettingsState.ts|\
    src/renderer/hooks/useDragDrop.ts|\
    src/renderer/hooks/useKeyboardNavigation.ts|\
    src/renderer/hooks/useTaskActions.ts)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Find all use*.ts files in renderer (hooks)
for file in $(find src/renderer -name 'use*.ts' -not -name '*.test.ts'); do
  if is_exempt_hook "$file"; then
    continue
  fi
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES) - see ADR-0006"
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Hook size check passed"
fi

exit $EXIT_CODE
