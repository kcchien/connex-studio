# Research: Phase 2 Professional Features with Full OPC UA

**Branch**: `003-pro-features-opcua` | **Date**: 2026-01-24
**Purpose**: Resolve technical unknowns and document technology decisions for implementation.

---

## 1. Dashboard Grid Layout Library

### Decision: react-grid-layout

### Rationale
- Most widely used React grid layout library (3.6k+ GitHub stars)
- Built-in drag-and-drop, resize, responsive breakpoints
- Persistent layout serialization (JSON compatible)
- Works well with React 18/19
- MIT licensed

### Alternatives Considered
| Library | Pros | Cons |
|---------|------|------|
| react-grid-layout | Mature, well-documented, active | Slightly large bundle |
| react-beautiful-dnd | Smooth animations | No grid/resize, just drag |
| dnd-kit | Modern, accessible | No grid layout built-in |
| Custom implementation | Full control | High dev time, bugs |

### Integration Pattern
```typescript
import GridLayout from 'react-grid-layout';

interface WidgetLayout {
  i: string;      // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

const DashboardCanvas = ({ widgets, onLayoutChange }) => (
  <GridLayout
    cols={12}
    rowHeight={30}
    onLayoutChange={onLayoutChange}
    draggableHandle=".widget-header"
  >
    {widgets.map(w => (
      <div key={w.id} data-grid={w.layout}>
        <WidgetRenderer widget={w} />
      </div>
    ))}
  </GridLayout>
);
```

---

## 2. Gauge Widget Library

### Decision: echarts-gl or SVG-based custom gauge

### Rationale
- ECharts already in dependency (002-iiot-protocol-studio)
- ECharts gauge series supports:
  - Circular and semi-circular styles
  - Multiple threshold color zones
  - Animated transitions
  - Customizable min/max/unit labels
- No additional bundle size

### Alternatives Considered
| Library | Pros | Cons |
|---------|------|------|
| ECharts gauge | Already bundled, feature-rich | Overkill for simple gauges |
| react-gauge-chart | Lightweight, simple | Less customizable |
| Custom SVG | Full control, tiny | Dev time |
| canvas-gauges | Feature-rich | Another dependency |

### Integration Pattern
```typescript
const GaugeWidget = ({ value, min, max, thresholds }) => {
  const option = {
    series: [{
      type: 'gauge',
      min,
      max,
      data: [{ value }],
      axisLine: {
        lineStyle: {
          color: thresholds.map(t => [t.position, t.color])
        }
      }
    }]
  };
  return <ReactECharts option={option} />;
};
```

---

## 3. Alert Sound Playback

### Decision: Native Web Audio API (no additional library)

### Rationale
- Electron supports Web Audio API natively
- Simple beep/alert sounds don't need complex library
- Smaller bundle size
- Pre-loaded audio files in app resources

### Alternatives Considered
| Library | Pros | Cons |
|---------|------|------|
| Native Audio API | No dependency, simple | Limited audio processing |
| howler.js | Cross-browser, sprites | 12KB gzipped, overkill |
| tone.js | Synthesizer | Way overkill for alerts |

### Integration Pattern
```typescript
class AlertSoundPlayer {
  private audioCache = new Map<string, HTMLAudioElement>();

  async play(type: 'warning' | 'critical' | 'info') {
    const path = `assets/sounds/${type}.wav`;
    if (!this.audioCache.has(path)) {
      this.audioCache.set(path, new Audio(path));
    }
    const audio = this.audioCache.get(path)!;
    audio.currentTime = 0;
    await audio.play();
  }
}
```

---

## 4. YAML Export/Import Library

### Decision: js-yaml

### Rationale
- Most popular YAML parser for Node.js (6k+ GitHub stars)
- Supports YAML 1.1 and 1.2
- Safe load/dump modes (no arbitrary code execution)
- Customizable schema for custom types
- Deterministic output with sortKeys option

### Alternatives Considered
| Library | Pros | Cons |
|---------|------|------|
| js-yaml | Mature, well-documented | Slightly larger |
| yaml | Modern, typed | Less community |
| JSON only | Built-in, no deps | Hard to read/diff |

### Integration Pattern
```typescript
import yaml from 'js-yaml';

const exportWorkspace = (workspace: Workspace): string => {
  return yaml.dump(workspace, {
    sortKeys: true,      // Git-friendly deterministic output
    noRefs: true,        // No YAML anchors/aliases
    lineWidth: 120,
    quotingType: '"'
  });
};

const importWorkspace = (content: string): Workspace => {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as Workspace;
};
```

---

## 5. OPC UA Library Deep Dive (node-opcua)

### Decision: node-opcua (already installed v2.160.0)

### Rationale
- Only mature OPC UA client library for Node.js
- Supports all required features:
  - Session management with auto-renewal
  - All security policies (Basic256Sha256, Aes128/256)
  - Certificate management
  - Browsing, Read/Write, Subscriptions
  - Events and method calls
  - Historical access
  - Discovery (FindServers, GetEndpoints)
- Active maintenance (monthly releases)
- Used in production at multiple industrial sites

### Key APIs
```typescript
import {
  OPCUAClient,
  ClientSession,
  ClientSubscription,
  AttributeIds,
  SecurityPolicy,
  MessageSecurityMode,
  BrowseDirection,
  NodeClassMask,
  DataValue,
  HistoryReadRequest
} from 'node-opcua';

// Connection
const client = OPCUAClient.create({
  endpointMustExist: false,
  securityPolicy: SecurityPolicy.Basic256Sha256,
  securityMode: MessageSecurityMode.SignAndEncrypt
});

// Browse
const browseResult = await session.browse({
  nodeId: 'ns=0;i=84', // Objects folder
  browseDirection: BrowseDirection.Forward,
  referenceTypeId: 'HierarchicalReferences'
});

// Subscription
const subscription = ClientSubscription.create(session, {
  publishingInterval: 500,
  maxNotificationsPerPublish: 100
});
subscription.on('data_change', (monitoredItem, dataValue) => {
  // Handle data change
});

// Method call
const result = await session.call({
  objectId: 'ns=2;s=MyObject',
  methodId: 'ns=2;s=MyMethod',
  inputArguments: [/* arguments */]
});
```

### Certificate Management
```typescript
import {
  makeApplicationUrn,
  OPCUACertificateManager
} from 'node-opcua';

const certManager = new OPCUACertificateManager({
  rootFolder: path.join(app.getPath('userData'), 'pki')
});

// Generate self-signed certificate
await certManager.createSelfSignedCertificate({
  subject: '/CN=Connex Studio/O=MyOrg',
  applicationUri: makeApplicationUrn(os.hostname(), 'ConnexStudio'),
  dns: [os.hostname()],
  validity: 365 * 2 // 2 years
});
```

---

## 6. Variable Substitution Engine

### Decision: Custom regex-based parser (no library)

### Rationale
- Simple pattern: `${VAR_NAME}` and `${VAR_NAME:default}`
- No complex template logic needed
- Avoids security risks of template engines
- Fast (single regex pass)

### Implementation Pattern
```typescript
class VariableSubstitution {
  private static PATTERN = /\$\{([^}:]+)(?::([^}]*))?\}/g;

  static substitute(text: string, variables: Record<string, string>): string {
    return text.replace(this.PATTERN, (match, name, defaultValue) => {
      if (name in variables) {
        return variables[name];
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return match; // Keep original if no match and no default
    });
  }
}

// Usage
const result = VariableSubstitution.substitute(
  'opc.tcp://${SERVER_IP:localhost}:${PORT}',
  { SERVER_IP: '192.168.1.100', PORT: '4840' }
);
// => 'opc.tcp://192.168.1.100:4840'
```

---

## 7. Protocol Calculator Algorithms

### Decision: Pure TypeScript implementations (no library)

### Rationale
- Algorithms are well-documented standards
- Small code footprint
- No dependency risks
- Full control over edge cases

### CRC-16 Modbus Implementation
```typescript
export function crc16Modbus(buffer: Uint8Array): number {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
}
```

### IEEE 754 Float Decoder
```typescript
export function decodeFloat32(hex: string, byteOrder: 'BE' | 'LE'): number {
  const bytes = hexToBytes(hex);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  bytes.forEach((b, i) => view.setUint8(i, b));
  return view.getFloat32(0, byteOrder === 'LE');
}
```

---

## 8. Alert History Storage

### Decision: SQLite with existing better-sqlite3

### Rationale
- Already in dependencies (002-iiot-protocol-studio DVR buffer)
- Efficient for 10k+ rows with indexes
- Survives app restart
- Simple query API

### Schema Design
```sql
CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tag_ref TEXT NOT NULL,
  trigger_value REAL,
  severity TEXT CHECK(severity IN ('info', 'warning', 'critical')),
  message TEXT,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at INTEGER,
  acknowledged_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_alert_timestamp ON alert_events(timestamp DESC);
CREATE INDEX idx_alert_rule ON alert_events(rule_id);
CREATE INDEX idx_alert_severity ON alert_events(severity);
```

---

## 9. Payload Template Engine

### Decision: Custom template parser with limited syntax

### Rationale
- Restricted syntax reduces security risks
- Only supports predefined variables (no arbitrary expressions)
- Fast string interpolation
- Clear error messages

### Supported Variables
| Variable | Description |
|----------|-------------|
| `${tags.<name>.value}` | Tag current value |
| `${tags.<name>.timestamp}` | Tag last update ISO timestamp |
| `${tags.<name>.quality}` | Tag quality (Good/Bad) |
| `${$timestamp}` | Unix timestamp (ms) |
| `${$isoTimestamp}` | ISO 8601 timestamp |
| `${env:<VAR>}` | Environment variable |

### Implementation Pattern
```typescript
class PayloadTemplateEngine {
  private static compile(template: string): CompiledTemplate {
    const parts: TemplatePart[] = [];
    let lastIndex = 0;
    const regex = /\$\{(tags\.(\w+)\.(value|timestamp|quality)|\$timestamp|\$isoTimestamp|env:(\w+))\}/g;

    let match;
    while ((match = regex.exec(template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'literal', value: template.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'variable', path: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < template.length) {
      parts.push({ type: 'literal', value: template.slice(lastIndex) });
    }

    return { parts };
  }

  static render(template: CompiledTemplate, context: TemplateContext): string {
    return template.parts.map(part => {
      if (part.type === 'literal') return part.value;
      return this.resolveVariable(part.path, context);
    }).join('');
  }
}
```

---

## 10. Testing Strategy

### Unit Tests
- **Main Process (Jest)**: BridgeManager, EnvironmentManager, AlertEngine, OpcUaAdapter
- **Renderer (Vitest)**: Dashboard widgets, Calculator components, stores

### Integration Tests
- IPC round-trip tests for all new channels
- OPC UA connection tests with mock server

### E2E Tests (Playwright)
- Bridge: Create mapping, start forwarding, verify MQTT message
- Dashboard: Create dashboard, add widget, verify update
- Alert: Create rule, trigger condition, verify notification
- OPC UA: Connect, browse, subscribe, verify data change

### Mock OPC UA Server
Use `node-opcua` server module for testing:
```typescript
import { OPCUAServer } from 'node-opcua';

const testServer = new OPCUAServer({
  port: 4840,
  nodeset_filename: ['./test-fixtures/test-nodeset.xml']
});
await testServer.start();
```

---

## Summary

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Dashboard Grid | react-grid-layout | Mature, drag-and-drop, persist |
| Gauge Widget | ECharts gauge | Already bundled, feature-rich |
| Alert Sound | Web Audio API | No dependency, simple |
| YAML Export | js-yaml | Deterministic, safe |
| OPC UA Client | node-opcua | Only mature option, full-featured |
| Variable Engine | Custom regex | Simple, secure, fast |
| Calculator | Pure TS | Standards-based, no deps |
| Alert Storage | better-sqlite3 | Already bundled, performant |
| Template Engine | Custom limited | Secure, predictable |

All technologies are either already installed or have minimal footprint, following Constitution principle I.4 (Minimum Viable Complexity).
