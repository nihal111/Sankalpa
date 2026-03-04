# Create Release

Create a new release for Sankalpa with the specified version.

## Input
- `VERSION`: The version number (e.g., `1.0.2`)

## Steps

1. Find the latest release tag:
   ```bash
   git tag -l --sort=-v:refname | head -1
   ```

2. Get all commits since that tag:
   ```bash
   git log <previous_tag>..HEAD --oneline
   ```

3. Update `package.json` version:
   ```bash
   npm version <VERSION> --no-git-tag-version
   ```

4. Commit the version bump:
   ```bash
   git add package.json package-lock.json
   git commit -m "chore: bump version to <VERSION>"
   ```

5. Create annotated tag with release notes derived from commit messages:
   - Group commits into "What's New" (feat:) and "Fixes" (fix:)
   - Write concise, user-facing descriptions
   - Do NOT reference internal tools or external apps
   ```bash
   git tag -a v<VERSION> -m "v<VERSION>

   ## What's New
   - <feature descriptions>

   ## Fixes
   - <fix descriptions>"
   ```

6. Push the tag:
   ```bash
   git push origin v<VERSION>
   ```

7. Build the DMG:
   ```bash
   npm run dist
   ```

8. Create GitHub release:
   ```bash
   gh release create v<VERSION> --title "v<VERSION>" --notes "<release notes>"
   ```

9. Upload DMG asset:
   ```bash
   gh release upload v<VERSION> release/Sankalpa-<VERSION>-arm64.dmg
   ```

## Release Notes Format

- Keep descriptions concise and user-facing
- Use bold for feature names
- Include keyboard shortcuts where relevant
- Do not reference internal implementation details
