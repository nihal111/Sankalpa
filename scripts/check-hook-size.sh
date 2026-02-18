#!/bin/sh
# Check that hook files don't exceed 200 lines (ADR-0006)

MAX_LINES=200
EXIT_CODE=0

# Find all use*.ts files in renderer (hooks)
for file in $(find src/renderer -name 'use*.ts' -not -name '*.test.ts'); do
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
