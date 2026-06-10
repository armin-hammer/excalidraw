# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Excalidraw App (Vite dev server) | `yarn start` | 3001 | Main frontend; all other services are external/optional |

### Key development commands

See `CLAUDE.md` and root `package.json` scripts. Summary:

- **Dev server:** `yarn start` (runs on `http://localhost:3001`)
- **Type check:** `yarn test:typecheck`
- **Lint:** `yarn test:code` (ESLint, `--max-warnings=0`)
- **Format check:** `yarn test:other` (Prettier)
- **Tests:** `yarn test:update` (Vitest, updates snapshots)
- **Fix lint+format:** `yarn fix`

### Non-obvious caveats

- The vite-plugin-checker reports "ERROR" labels in terminal output even when ESLint/TypeScript find 0 errors — this is normal formatting, not an actual failure.
- Firebase config is pre-configured for a shared dev project (`excalidraw-oss-dev`). No secrets are needed for basic local development.
- Collaboration (WebSocket) and AI features require separate external services not in this repo; the app works fine without them (those features just won't function).
- The pre-commit hook in `.husky/pre-commit` is currently commented out (`# yarn lint-staged`), so no hook blocks commits.
- Chrome in this environment requires `--no-sandbox --disable-dev-shm-usage` flags for stability.
