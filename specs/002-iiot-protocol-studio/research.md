# Research: IIoT Protocol Studio

**Date**: 2025-01-23
**Purpose**: Validate technology choices and resolve implementation questions

## Technology Decisions

### 1. Electron 40 + React 19 + Vite 6

**Decision**: Use Electron 40 with React 19 and Vite 6 for build tooling.

**Rationale**:
- Electron 40 includes Chromium 134+ and Node.js 22, providing latest ES2024 features
- React 19 compiler optimizations reduce re-renders, critical for 10 FPS UI updates
- Vite 6 offers sub-second HMR, essential for rapid UI iteration
- electron-vite provides seamless integration between Vite and Electron

**Alternatives Considered**:
- Tauri: Smaller bundle but lacks Node.js runtime; protocol libraries require native modules
- NW.js: Less active ecosystem, fewer security updates
- Electron + Webpack: Slower builds compared to Vite

### 2. Protocol Libraries

**Decision**: modbus-serial 8.0.23, mqtt.js 5.14.1, node-opcua 2.160.0

**Rationale**:
- **modbus-serial**: Most mature Modbus TCP library for Node.js, supports all function codes
- **mqtt.js**: Official Eclipse Paho-compatible client, WebSocket and TCP, QoS 0/1/2
- **node-opcua**: Comprehensive OPC UA implementation, actively maintained by Sterfive

**Alternatives Considered**:
- jsmodbus: Less feature-complete than modbus-serial
- MQTT.js alternatives (Paho): mqtt.js has better TypeScript support
- node-opc-ua (different package): Abandoned, no recent updates

**Integration Notes**:
- All protocol operations MUST run in Main process (native module compatibility)
- Use IPC to send results to Renderer
- Each protocol adapter implements `ProtocolAdapter` interface

### 3. State Management: Zustand

**Decision**: Zustand with persist middleware for state management.

**Rationale**:
- Minimal API surface: create() + useStore() covers 90% of cases
- Built-in persist middleware for electron-store integration
- No boilerplate reducers/actions like Redux
- Devtools support via zustand/devtools

**Cross-Process Sync Pattern**:
```typescript
// Main process pushes updates via IPC
mainWindow.webContents.send('state:connection-update', connection);

// Renderer store listens and merges
ipcRenderer.on('state:connection-update', (_, data) => {
  useConnectionStore.setState({ connections: merge(state.connections, data) });
});
```

**Alternatives Considered**:
- Redux Toolkit: More boilerplate than needed for this scale
- Jotai: Atomic model less suited for complex nested state
- MobX: Magic reactivity harder to debug

### 4. Data Visualization: uPlot + ECharts

**Decision**: uPlot for real-time sparklines, ECharts for reports.

**Rationale**:
- **uPlot**: 10x faster than Chart.js for streaming data; 45KB gzipped; GPU-accelerated
- Handles 100+ sparklines at 10 FPS without frame drops
- **ECharts**: Rich chart types for HTML reports (not real-time critical)

**Implementation Pattern**:
```typescript
// Sparkline component
const opts = {
  width: 200,
  height: 40,
  series: [{ stroke: '#3b82f6', width: 1 }],
  scales: { x: { time: false }, y: { auto: true } },
};
const chart = new uPlot(opts, [timestamps, values], container);
// Update: chart.setData([newTimestamps, newValues]);
```

**Alternatives Considered**:
- Chart.js: Struggles with rapid updates (< 5 FPS at 100 charts)
- Recharts: React wrapper adds overhead
- D3.js: Too low-level for this use case

### 5. SQLite Ring Buffer (DVR)

**Decision**: better-sqlite3 with fixed-size table and ROWID-based eviction.

**Rationale**:
- Synchronous API avoids callback complexity in Main process
- Native module, 100x faster than sql.js (WASM)
- Ring buffer via: `DELETE FROM datapoints WHERE rowid <= (SELECT MAX(rowid) - :maxRows FROM datapoints)`

**Schema**:
```sql
CREATE TABLE datapoints (
  id INTEGER PRIMARY KEY,
  tag_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,  -- Unix ms
  value REAL,
  quality TEXT DEFAULT 'good',
  INDEX idx_tag_time (tag_id, timestamp)
);

CREATE TABLE buffer_config (
  max_rows INTEGER DEFAULT 60000  -- 100 tags × 500ms × 5min
);
```

**Performance Target**: Insert + evict 200 rows/sec (100 tags @ 500ms).

**Alternatives Considered**:
- In-memory array: Loses data on crash; memory pressure with large buffers
- LevelDB: Overkill for structured time-series
- SQLite WAL mode: Enabled for concurrent read during export

### 6. Secure Credential Storage: keytar

**Decision**: keytar for OS-native secure storage.

**Rationale**:
- Cross-platform: macOS Keychain, Windows Credential Manager, Linux Secret Service
- Simple API: `keytar.setPassword(service, account, password)`
- No encryption key management needed

**Integration Pattern**:
```typescript
// ProfileService.ts
async saveProfile(profile: Profile) {
  const safeProfile = { ...profile, connections: [] };
  for (const conn of profile.connections) {
    if (conn.credentials) {
      await keytar.setPassword('connex-studio', conn.id, JSON.stringify(conn.credentials));
      safeProfile.connections.push({ ...conn, credentials: undefined });
    }
  }
  await fs.writeFile(path, JSON.stringify(safeProfile));
}
```

**Alternatives Considered**:
- electron-store with encryption: Requires managing encryption key
- OS keyring direct access: Platform-specific code
- Environment variables: Not user-friendly

### 7. Logging: electron-log

**Decision**: electron-log with file rotation.

**Rationale**:
- Built-in file rotation (size-based and count-based)
- Automatic console + file output
- IPC transport for Renderer logs

**Configuration**:
```typescript
import log from 'electron-log';

log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.maxFiles = 5;
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
```

**Alternatives Considered**:
- winston: More complex setup for Electron
- pino: Excellent performance but less Electron integration
- Custom logger: Unnecessary given electron-log maturity

### 8. Testing Strategy

**Decision**: Vitest (Renderer) + Jest (Main) + Playwright (E2E).

**Rationale**:
- **Vitest**: Native ESM, Vite integration, fast watch mode for React components
- **Jest**: Better Node.js native module support for Main process
- **Playwright**: Official Electron support via `_electron.launch()`

**Test Organization**:
```
tests/
├── unit/
│   ├── main/           # Jest: ConnectionManager, PollingEngine, adapters
│   └── renderer/       # Vitest: stores, hooks, components
├── integration/
│   └── ipc/            # Jest: round-trip IPC tests
└── e2e/
    ├── connection.spec.ts   # Playwright: connect to Virtual Server
    ├── polling.spec.ts      # Playwright: start/stop polling
    └── dvr.spec.ts          # Playwright: time-travel scrubbing
```

## Resolved Questions

| Question | Resolution |
|----------|-----------|
| How to sync state between Main and Renderer? | IPC push from Main, Zustand merge in Renderer |
| How to handle native modules in Electron 40? | Use electron-rebuild, include in `extraResources` |
| How to achieve 10 FPS with 100 sparklines? | uPlot with batched updates via requestAnimationFrame |
| How to implement ring buffer efficiently? | SQLite with ROWID-based eviction, WAL mode |
| How to store credentials securely? | keytar (OS credential store) |
| How to rotate log files? | electron-log with maxSize + maxFiles config |

## Performance Benchmarks (Target)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Cold start | < 3s | Electron launch to first paint |
| Tag grid render (100 tags) | < 100ms | React Profiler |
| Sparkline update (100 charts) | > 10 FPS | requestAnimationFrame counter |
| DVR seek (60k rows) | < 100ms | SQLite query + UI update |
| CSV export (10k rows) | < 5s | fs.writeFile completion |

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| modbus-serial native module build fails | Pin exact version, include prebuilt binaries |
| uPlot performance degrades at scale | Batch updates, virtualize off-screen sparklines |
| SQLite write contention during export | WAL mode, separate read connection |
| node-opcua bundle size (50MB+) | Lazy load, only include if OPC UA connection created |
| Cross-platform keytar compatibility | Fallback to encrypted file storage if keytar unavailable |
