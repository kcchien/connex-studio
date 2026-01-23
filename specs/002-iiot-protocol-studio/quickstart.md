# Quickstart: IIoT Protocol Studio Development

**Date**: 2025-01-23
**Purpose**: Get the development environment running in < 10 minutes

## Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 22 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Git | 2.40+ | `git --version` |
| Python | 3.11+ | `python3 --version` (for native modules) |

**Platform-specific**:
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio Build Tools 2022 (C++ workload)
- **Linux**: `build-essential`, `libsecret-1-dev` (for keytar)

## Quick Setup

```bash
# Clone and enter directory
cd connex-studio

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start development server
npm run dev
```

**Expected Output**:
```
  VITE v6.x.x  ready in XXX ms

  ➜  Main:     [Electron Main process logs]
  ➜  Renderer: http://localhost:5173/
```

The Electron window should open automatically with hot reload enabled.

## Project Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite + Electron in development mode |
| `npm run build` | Build for production (output in `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run rebuild` | Rebuild native modules for current Electron version |
| `npm run lint` | Run ESLint on all TypeScript files |
| `npm run typecheck` | Run TypeScript compiler in check mode |
| `npm run test` | Run all tests (Vitest + Jest) |
| `npm run test:unit` | Run unit tests only |
| `npm run test:e2e` | Run Playwright E2E tests |

## Development Workflow

### 1. Start Development

```bash
npm run dev
```

This starts:
- Vite dev server for Renderer (HMR enabled)
- Electron Main process with auto-restart on changes
- TypeScript watch mode

### 2. Make Changes

| Process | Files | Hot Reload |
|---------|-------|------------|
| Renderer | `src/renderer/**` | ✅ Instant (HMR) |
| Main | `src/main/**` | ✅ Auto-restart |
| Preload | `src/preload/**` | ⚠️ Requires window reload |
| Shared Types | `src/shared/**` | ✅ Both processes |

### 3. Run Tests

```bash
# Run unit tests in watch mode
npm run test:unit -- --watch

# Run specific test file
npm run test:unit -- src/main/services/ConnectionManager.test.ts

# Run E2E tests (requires app built)
npm run build && npm run test:e2e
```

### 4. Type Check

```bash
# Full type check
npm run typecheck

# Watch mode (in separate terminal)
npx tsc --noEmit --watch
```

## Directory Quick Reference

```
src/
├── main/           # Electron Main process (Node.js)
│   ├── ipc/        # IPC handlers
│   ├── services/   # Business logic
│   └── protocols/  # Protocol adapters
├── renderer/       # React UI (browser context)
│   ├── components/ # React components
│   ├── stores/     # Zustand stores
│   └── hooks/      # Custom hooks
├── preload/        # Context bridge
└── shared/         # Shared types (import as @shared/*)
```

## Common Tasks

### Add a New IPC Channel

1. Add types to `src/shared/types/*.ts`
2. Add channel name to `src/shared/constants/ipc-channels.ts`
3. Implement handler in `src/main/ipc/*.ts`
4. Register handler in `src/main/index.ts`
5. Add typed invoke wrapper in `src/renderer/lib/ipc.ts`

### Add a New React Component

```bash
# Create component directory
mkdir -p src/renderer/components/feature

# Create component files
touch src/renderer/components/feature/FeatureComponent.tsx
touch src/renderer/components/feature/index.ts
```

### Add a New Protocol Adapter

1. Create `src/main/protocols/NewProtocolAdapter.ts`
2. Implement `ProtocolAdapter` interface
3. Register in `src/main/services/ConnectionManager.ts`
4. Add protocol config type to `src/shared/types/connection.ts`

## Environment Variables

Create `.env.local` for local overrides (git-ignored):

```env
# Development settings
VITE_DEV_TOOLS=true          # Enable React DevTools
VITE_LOG_LEVEL=debug         # Renderer log level

# Main process (via electron-builder)
ELECTRON_LOG_LEVEL=debug     # Main process log level
```

## Troubleshooting

### Native Module Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run rebuild
```

### Electron Doesn't Start

```bash
# Check for port conflicts
lsof -i :5173  # Vite dev server port

# Reset Electron cache
rm -rf ~/Library/Application\ Support/connex-studio  # macOS
rm -rf ~/.config/connex-studio                        # Linux
```

### TypeScript Errors After Pulling

```bash
# Regenerate TypeScript definitions
npm run typecheck
```

### Tests Fail with Module Not Found

```bash
# Ensure native modules are rebuilt
npm run rebuild

# For E2E tests, ensure app is built
npm run build
```

## IDE Setup

### VS Code

Recommended extensions (in `.vscode/extensions.json`):
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `bradlc.vscode-tailwindcss`
- `ms-playwright.playwright`

### Settings

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Next Steps

1. Read `specs/002-iiot-protocol-studio/spec.md` for full requirements
2. Review `plan.md` for architecture overview
3. Check `data-model.md` for entity schemas
4. See `contracts/ipc-channels.md` for API reference
5. Run `npm run dev` and explore the codebase!
