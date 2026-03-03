#!/bin/bash
set -e
cd "$(dirname "$0")/.."
npm run build
npm run pack
rm -rf /Applications/Sankalpa.app
cp -r release/mac-arm64/Sankalpa.app /Applications/
echo "Installed to /Applications/Sankalpa.app"
