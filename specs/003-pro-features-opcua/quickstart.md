# Quickstart: Phase 2 Professional Features with Full OPC UA

**Branch**: `003-pro-features-opcua` | **Date**: 2026-01-24
**Purpose**: Development environment setup and testing scenarios.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 22 LTS | Runtime |
| pnpm | 9.x | Package manager |
| Git | 2.x | Version control |

### Optional (for Testing)

| Software | Purpose |
|----------|---------|
| ModRSsim2 | Modbus TCP simulator (Windows) |
| diagslave | Modbus TCP simulator (cross-platform) |
| MQTT Explorer | MQTT client for Bridge testing |
| Mosquitto | MQTT broker for local testing |
| Prosys OPC UA Simulation Server | OPC UA server simulator |
| UaExpert | OPC UA client for verification |

---

## Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd connex-studio
git checkout 003-pro-features-opcua
pnpm install
pnpm rebuild  # Rebuild native modules
```

### 2. Start Development

```bash
pnpm dev          # Start with HMR
pnpm dev --inspect  # With Node.js inspector
```

### 3. Run Tests

```bash
pnpm test           # All tests
pnpm test:unit      # Renderer unit tests (Vitest)
pnpm test:main      # Main process unit tests (Jest)
pnpm test:e2e       # E2E tests (Playwright)
```

### 4. Type Check and Lint

```bash
pnpm typecheck
pnpm lint --fix
```

---

## Test Scenarios

### Scenario 1: Environment Variable Substitution

**Setup**:
1. Create environment "Development" with variables:
   - `MODBUS_HOST` = `127.0.0.1`
   - `MQTT_BROKER` = `localhost`

**Test Steps**:
1. Create Modbus connection with host `${MODBUS_HOST}`
2. Verify connection resolves to `127.0.0.1`
3. Switch to different environment
4. Verify connection uses new value

**Expected Result**:
- Variables substitute correctly in connection config
- Switching environment updates active connections

---

### Scenario 2: Collection Execution

**Setup**:
1. Create Modbus connection to simulator
2. Create 3 tags (holding registers)

**Test Steps**:
1. Create collection "Read Sequence"
2. Add 3 read requests for each tag
3. Add assertions:
   - Tag 1: value > 0
   - Tag 2: latency < 100ms
   - Tag 3: value equals 42
4. Run collection

**Expected Result**:
- Sequential execution with progress updates
- Pass/fail for each assertion
- Summary report with timing

---

### Scenario 3: Bridge (Modbus → MQTT)

**Setup**:
1. Modbus connection to simulator with 5 tags polling at 500ms
2. MQTT connection to local Mosquitto broker

**Test Steps**:
1. Create bridge "Line1-Telemetry"
2. Select 3 source tags
3. Configure target:
   - Topic: `factory/line1/${tagName}`
   - Payload: `{"value": ${value}, "ts": ${timestamp}}`
   - QoS: 1
4. Set interval: 1000ms, changeOnly: true
5. Start bridge
6. Change tag values in simulator

**Expected Result**:
- MQTT messages published on value change
- No duplicate messages if value unchanged
- Bridge status shows "active"

---

### Scenario 4: Dashboard with Widgets

**Setup**:
1. Modbus connection with 4 tags polling

**Test Steps**:
1. Create dashboard "Process Overview"
2. Add widgets:
   - Gauge: Temperature (min: 0, max: 100, thresholds: 60=yellow, 80=red)
   - LED: Motor Running (onValue: 1, onColor: green)
   - NumberCard: Pressure (unit: PSI, decimals: 1)
   - Chart: Flow Rate (timeRange: 60s)
3. Bind tags to widgets
4. Resize and reposition widgets
5. Save layout

**Expected Result**:
- Widgets update in real-time
- Gauge shows threshold colors
- Chart shows sparkline with DVR data
- Layout persists after restart

---

### Scenario 5: Alert Rule with Notification

**Setup**:
1. Modbus connection with Temperature tag

**Test Steps**:
1. Create alert rule "High Temperature"
   - Tag: Temperature
   - Condition: > 80
   - Duration: 5 seconds
   - Severity: warning
   - Actions: notification, sound, log
2. Set simulator value to 85
3. Wait 5+ seconds

**Expected Result**:
- Desktop notification appears
- Alert sound plays
- Event logged to history
- Alert panel shows new event

---

### Scenario 6: OPC UA Connection with Security

**Setup**:
1. Start Prosys OPC UA Simulation Server
2. Enable Basic256Sha256 security

**Test Steps**:
1. Get endpoints from `opc.tcp://localhost:53530/OPCUA/SimulationServer`
2. Select Basic256Sha256 + SignAndEncrypt endpoint
3. Generate application certificate
4. Trust server certificate
5. Connect with username/password auth
6. Verify session established

**Expected Result**:
- Endpoint discovery shows security options
- Certificate generated in PKI folder
- Secure session established
- Session renews before timeout

---

### Scenario 7: OPC UA Browse and Subscribe

**Setup**:
1. Connected OPC UA session

**Test Steps**:
1. Browse from Root → Objects → Simulation
2. Expand tree to find Counter, Random, Sinusoid nodes
3. Read values manually
4. Create subscription (500ms publishing interval)
5. Add monitored items with deadband
6. Observe data changes

**Expected Result**:
- Tree shows node hierarchy
- Read returns current values
- Subscription delivers changes
- Deadband filters small changes

---

### Scenario 8: OPC UA Method Call

**Setup**:
1. Connected OPC UA session to Prosys simulator

**Test Steps**:
1. Browse to find "Reset" method under Simulation object
2. Get method argument definitions
3. Call method with no arguments
4. Verify counter reset

**Expected Result**:
- Method arguments displayed
- Call completes successfully
- Server state changes

---

### Scenario 9: OPC UA Events

**Setup**:
1. Connected OPC UA session
2. Server configured to generate alarms

**Test Steps**:
1. Subscribe to events on Server object
2. Trigger alarm condition on simulator
3. View event in event panel
4. Acknowledge alarm
5. Confirm alarm

**Expected Result**:
- Events received in real-time
- Event details displayed
- Acknowledge updates server state
- Event history queryable

---

### Scenario 10: Workspace Export/Import

**Setup**:
1. Configured environment, connections, tags, dashboard, alerts

**Test Steps**:
1. Export workspace to YAML file
2. Verify file content (no passwords)
3. Delete local profile
4. Import workspace
5. Verify all entities restored

**Expected Result**:
- YAML is human-readable
- Passwords excluded
- Import restores everything
- Variable references preserved

---

## Mock Servers

### Modbus TCP Mock

For automated testing, use the built-in virtual server:

```typescript
// In test setup
const server = await virtualServer.start({
  port: 5502,
  unitId: 1,
  registers: {
    holding: new Array(100).fill(0),
    input: new Array(100).fill(0)
  }
});

// Cleanup
await server.stop();
```

### OPC UA Mock

Use node-opcua server module:

```typescript
import { OPCUAServer, Variant, DataType } from 'node-opcua';

const server = new OPCUAServer({
  port: 4840,
  resourcePath: '/UA/TestServer'
});

await server.initialize();

const addressSpace = server.engine.addressSpace!;
const namespace = addressSpace.getOwnNamespace();

// Add test variable
namespace.addVariable({
  organizedBy: addressSpace.rootFolder.objects,
  browseName: 'TestCounter',
  dataType: 'Int32',
  value: { get: () => new Variant({ dataType: DataType.Int32, value: 42 }) }
});

await server.start();
```

### MQTT Mock

Use Mosquitto or MQTT.js test broker:

```bash
# Docker
docker run -d -p 1883:1883 eclipse-mosquitto

# Or local install
mosquitto -v
```

---

## Debugging Tips

### Main Process Debugging

```bash
pnpm dev --inspect
# Chrome: chrome://inspect
# VS Code: Attach to Node.js
```

### IPC Debugging

Enable IPC logging in dev mode:

```typescript
// src/main/ipc/debug.ts
if (process.env.NODE_ENV === 'development') {
  ipcMain.on('*', (event, channel, ...args) => {
    console.log(`[IPC] ${channel}`, args);
  });
}
```

### OPC UA Debugging

Enable node-opcua debug logs:

```bash
DEBUG=opcua* pnpm dev
```

---

## Common Issues

### Native Module Rebuild

If `modbus-serial` or `better-sqlite3` fails:

```bash
pnpm rebuild
# Or specific module
npx electron-rebuild -f -w better-sqlite3
```

### OPC UA Certificate Issues

1. Check certificate paths in `~/.connex-studio/pki/`
2. Verify certificate not expired
3. Check server certificate is trusted
4. Regenerate if corrupted

### MQTT Connection Refused

1. Verify broker is running
2. Check firewall for port 1883
3. Verify credentials if auth enabled

---

## Performance Benchmarks

Run performance tests:

```bash
pnpm test:perf
```

**Targets**:
| Metric | Target |
|--------|--------|
| Super Grid 100 tags | ≤50ms UI response |
| Dashboard 10 widgets | ≤100ms render |
| Bridge throughput | 1000 msg/s |
| OPC UA browse 1000 nodes | ≤2s |
| Alert evaluation | ≤10ms per rule |
