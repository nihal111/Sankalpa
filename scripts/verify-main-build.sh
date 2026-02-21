#!/bin/sh
# Verify main process can be loaded by Electron

# Reject "type": "module" — Electron main process requires CommonJS
if grep -q '"type": "module"' package.json; then
  echo "ERROR: package.json contains \"type\": \"module\" which breaks Electron main process (CommonJS)."
  echo "Remove it: see commit 84fdb08 for context."
  exit 1
fi

npm run build:main || exit 1

# Just check syntax and that require resolves - don't actually run
OUTPUT=$(node -e "require.resolve('./dist/main/main/index.js')" 2>&1)
if [ $? -ne 0 ]; then
  echo "Main process build error:"
  echo "$OUTPUT"
  exit 1
fi

echo "Main process build verified"
