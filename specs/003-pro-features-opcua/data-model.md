# Data Model: Phase 2 Professional Features with Full OPC UA

**Branch**: `003-pro-features-opcua` | **Date**: 2026-01-24
**Purpose**: Define entity schemas, relationships, and state transitions for implementation.

---

## Part A: Professional Features

### Environment

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| name | string | Display name (e.g., "Development", "Production") |
| variables | Record<string, string> | Key-value pairs for substitution |
| isDefault | boolean | Active environment flag |
| createdAt | number | Unix timestamp |
| updatedAt | number | Unix timestamp |

**Validation Rules**:
- `name`: 1-50 characters, unique across environments
- `variables`: Keys must match `^[A-Z_][A-Z0-9_]*$` pattern

**State**: Stored in YAML file `~/.connex-studio/environments.yaml`

---

### Collection

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| name | string | Display name |
| description | string | Optional description |
| requests | CollectionRequest[] | Ordered list of requests |
| executionMode | 'sequential' | Execution mode (parallel deferred) |
| createdAt | number | Unix timestamp |
| updatedAt | number | Unix timestamp |

---

### CollectionRequest

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| connectionId | string | Target connection reference |
| operation | 'read' \| 'write' | Operation type |
| parameters | object | Protocol-specific parameters |
| assertions | Assertion[] | Post-request validations |
| timeout | number | Request timeout (ms) |

---

### Assertion

| Field | Type | Description |
|-------|------|-------------|
| type | 'equals' \| 'contains' \| 'range' \| 'regex' | Assertion type |
| target | 'value' \| 'status' \| 'latency' | What to check |
| expected | any | Expected value/pattern |
| message | string | Failure message |

---

### Bridge

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| name | string | Display name |
| sourceConnectionId | string | Source connection (Modbus) |
| sourceTags | string[] | Tag IDs to forward |
| targetConnectionId | string | Target connection (MQTT) |
| targetConfig | BridgeTargetConfig | Target-specific settings |
| options | BridgeOptions | Forwarding options |
| status | BridgeStatus | Current status |
| createdAt | number | Unix timestamp |

---

### BridgeTargetConfig (MQTT)

| Field | Type | Description |
|-------|------|-------------|
| topicTemplate | string | Topic with variables (e.g., `/factory/${env:FACTORY_ID}/data`) |
| payloadTemplate | string | JSON template for payload |
| qos | 0 \| 1 \| 2 | MQTT QoS level |
| retain | boolean | Retain flag |

---

### BridgeOptions

| Field | Type | Description |
|-------|------|-------------|
| interval | number | Forwarding interval (100-60000 ms) |
| changeOnly | boolean | Only forward on value change |
| changeThreshold | number | Minimum change to trigger (for changeOnly) |
| bufferSize | number | Local buffer size when target unavailable |

---

### BridgeStatus

| Value | Description |
|-------|-------------|
| `idle` | Not started |
| `active` | Actively forwarding |
| `paused` | Temporarily paused |
| `error` | Error state (source or target disconnected) |

---

### Dashboard

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| name | string | Display name |
| isDefault | boolean | Auto-open on startup |
| layout | WidgetLayout[] | Grid layout positions |
| widgets | DashboardWidget[] | Widget configurations |
| createdAt | number | Unix timestamp |
| updatedAt | number | Unix timestamp |

---

### WidgetLayout

| Field | Type | Description |
|-------|------|-------------|
| i | string | Widget ID (matches widget.id) |
| x | number | Grid column (0-11) |
| y | number | Grid row |
| w | number | Width in grid units |
| h | number | Height in grid units |
| minW | number | Minimum width |
| minH | number | Minimum height |

---

### DashboardWidget

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| type | WidgetType | Widget type |
| tagRefs | string[] | Bound tag IDs |
| config | WidgetConfig | Type-specific configuration |

---

### WidgetType

| Value | Description |
|-------|-------------|
| `gauge` | Circular/semi-circular gauge |
| `led` | LED indicator |
| `numberCard` | Single value display |
| `chart` | Time-series chart (DVR integration) |

---

### GaugeConfig

| Field | Type | Description |
|-------|------|-------------|
| style | 'circular' \| 'semi' | Gauge style |
| min | number | Minimum value |
| max | number | Maximum value |
| unit | string | Display unit |
| thresholds | Threshold[] | Color zones |
| showValue | boolean | Display numeric value |

---

### LEDConfig

| Field | Type | Description |
|-------|------|-------------|
| shape | 'circle' \| 'square' | LED shape |
| onValue | number \| boolean | Value for "on" state |
| onColor | string | Color when on (hex) |
| offColor | string | Color when off (hex) |
| label | string | Display label |

---

### NumberCardConfig

| Field | Type | Description |
|-------|------|-------------|
| title | string | Card title |
| unit | string | Value unit |
| decimals | number | Decimal places |
| fontSize | 'sm' \| 'md' \| 'lg' \| 'xl' | Font size |
| thresholds | Threshold[] | Color thresholds |

---

### ChartConfig

| Field | Type | Description |
|-------|------|-------------|
| timeRange | number | Display time range (seconds) |
| showGrid | boolean | Show grid lines |
| showLegend | boolean | Show legend |

---

### Threshold

| Field | Type | Description |
|-------|------|-------------|
| value | number | Threshold value |
| color | string | Color (hex) |
| label | string | Optional label |

---

### AlertRule

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| name | string | Display name |
| tagRef | string | Tag ID to monitor |
| condition | AlertCondition | Trigger condition |
| severity | 'info' \| 'warning' \| 'critical' | Alert severity |
| actions | AlertAction[] | Actions on trigger |
| enabled | boolean | Rule active flag |
| cooldown | number | Minimum seconds between alerts |
| createdAt | number | Unix timestamp |

---

### AlertCondition

| Field | Type | Description |
|-------|------|-------------|
| operator | '>' \| '<' \| '=' \| '!=' \| 'range' \| 'roc' | Comparison operator |
| value | number | Threshold value |
| value2 | number | Second value (for range) |
| duration | number | Seconds condition must hold |

---

### AlertAction

| Value | Description |
|-------|-------------|
| `notification` | Desktop notification |
| `sound` | Play alert sound |
| `log` | Write to alert history |

---

### AlertEvent (SQLite)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| rule_id | TEXT | AlertRule ID |
| timestamp | INTEGER | Event Unix timestamp |
| tag_ref | TEXT | Tag ID |
| trigger_value | REAL | Value that triggered |
| severity | TEXT | Alert severity |
| message | TEXT | Alert message |
| acknowledged | INTEGER | 0 or 1 |
| acknowledged_at | INTEGER | Ack timestamp |
| acknowledged_by | TEXT | User who acked |

---

### Workspace (Export Schema)

```yaml
meta:
  name: "My Workspace"
  author: "user@example.com"
  version: "1.0.0"
  exportedAt: "2026-01-24T10:00:00Z"
  connexVersion: "0.8.0"
  schemaVersion: 2

environments:
  - id: "env-1"
    name: "Production"
    variables:
      FACTORY_IP: "192.168.1.100"
      MQTT_BROKER: "mqtt.factory.local"

connections:
  - id: "conn-1"
    type: "modbus-tcp"
    name: "PLC Line 1"
    config:
      host: "${FACTORY_IP}"
      port: 502
      unitId: 1
    # Note: password/credentials NOT exported

tags:
  - id: "tag-1"
    connectionId: "conn-1"
    name: "Temperature"
    address:
      type: "holding-register"
      register: 40001
      dataType: "float32"

bridges:
  - id: "bridge-1"
    # ... bridge config

dashboards:
  - id: "dash-1"
    # ... dashboard config

alertRules:
  - id: "alert-1"
    # ... alert config
```

---

## Part B: OPC UA Entities

### OpcUaConnection (extends Connection)

| Field | Type | Description |
|-------|------|-------------|
| endpointUrl | string | opc.tcp://host:port/path |
| securityPolicy | SecurityPolicy | None, Basic256Sha256, etc. |
| securityMode | MessageSecurityMode | None, Sign, SignAndEncrypt |
| authentication | OpcUaAuth | Authentication config |
| sessionTimeout | number | Session timeout (ms) |
| applicationName | string | Client application name |
| certificateId | string | Reference to OpcUaCertificate |

---

### OpcUaAuth

| Field | Type | Description |
|-------|------|-------------|
| type | 'anonymous' \| 'username' \| 'certificate' | Auth type |
| username | string | For username auth |
| password | string | For username auth (stored encrypted) |
| certificateId | string | For certificate auth |

---

### SecurityPolicy

| Value | Description |
|-------|-------------|
| `None` | No security |
| `Basic256Sha256` | SHA-256 signing and encryption |
| `Aes128_Sha256_RsaOaep` | AES-128 encryption |
| `Aes256_Sha256_RsaPss` | AES-256 encryption |

---

### MessageSecurityMode

| Value | Description |
|-------|-------------|
| `None` | No security |
| `Sign` | Messages signed |
| `SignAndEncrypt` | Messages signed and encrypted |

---

### OpcUaNode

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | OPC UA NodeId (ns=2;s=MyVar) |
| displayName | string | Node display name |
| browseName | string | Node browse name |
| nodeClass | NodeClass | Object, Variable, Method, etc. |
| dataType | string | Data type NodeId |
| accessLevel | number | Read/Write access bits |
| historizing | boolean | Historical data enabled |
| description | string | Node description |

---

### NodeClass

| Value | Description |
|-------|-------------|
| `Object` | Object node |
| `Variable` | Variable node (has value) |
| `Method` | Method node (callable) |
| `ObjectType` | Object type definition |
| `VariableType` | Variable type definition |
| `ReferenceType` | Reference type |
| `DataType` | Data type definition |
| `View` | View node |

---

### OpcUaSubscription

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Local ID |
| subscriptionId | number | Server-assigned ID |
| connectionId | string | Parent connection |
| publishingInterval | number | Publishing interval (ms) |
| lifetimeCount | number | Lifetime keep-alive count |
| maxKeepAliveCount | number | Max keep-alive count |
| maxNotificationsPerPublish | number | Max notifications |
| priority | number | Subscription priority |
| monitoredItems | MonitoredItem[] | Items in subscription |

---

### MonitoredItem

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Local ID |
| monitoredItemId | number | Server-assigned ID |
| nodeId | string | Monitored node |
| attributeId | number | Attribute to monitor (13=Value) |
| samplingInterval | number | Sampling interval (ms) |
| queueSize | number | Notification queue size |
| discardOldest | boolean | Discard oldest on overflow |
| deadbandType | DeadbandType | Filtering type |
| deadbandValue | number | Deadband value |

---

### DeadbandType

| Value | Description |
|-------|-------------|
| `None` | No filtering |
| `Absolute` | Absolute value change |
| `Percent` | Percentage of range |

---

### OpcUaCertificate

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| subject | string | Certificate subject DN |
| issuer | string | Certificate issuer DN |
| serialNumber | string | Certificate serial |
| validFrom | number | Validity start timestamp |
| validTo | number | Validity end timestamp |
| thumbprint | string | SHA-1 thumbprint (hex) |
| path | string | File path to certificate |
| privateKeyPath | string | File path to private key |
| trusted | boolean | In trusted store |
| isApplicationCert | boolean | Is this the app cert |

---

### OpcUaEvent

| Field | Type | Description |
|-------|------|-------------|
| eventId | string | Event ID (binary as hex) |
| eventType | string | Event type NodeId |
| sourceNodeId | string | Source node |
| sourceName | string | Source display name |
| time | number | Event timestamp |
| receiveTime | number | Receive timestamp |
| message | string | Event message text |
| severity | number | OPC UA severity (0-1000) |
| conditionId | string | For alarm conditions |
| acknowledged | boolean | Ack state |
| confirmed | boolean | Confirm state |

---

## State Transitions

### BridgeStatus State Machine

```
     ┌─────────┐
     │  idle   │
     └────┬────┘
          │ start()
          ▼
     ┌─────────┐  source/target disconnect  ┌─────────┐
     │ active  │◄───────────────────────────►│  error  │
     └────┬────┘                             └────┬────┘
          │ pause()                               │ reconnect
          ▼                                       │
     ┌─────────┐                                  │
     │ paused  │◄─────────────────────────────────┘
     └─────────┘       resume()
```

### AlertRule Evaluation Flow

```
1. PollingEngine emits data
2. AlertEngine receives all TagDisplayState updates
3. For each enabled AlertRule:
   a. Check if tagRef matches updated tag
   b. Evaluate condition against current value
   c. If condition met:
      - Check duration requirement (debounce)
      - Check cooldown period
      - If passes: trigger alert
   d. Execute actions (notification, sound, log)
```

### OPC UA Session Lifecycle

```
     ┌───────────────┐
     │ disconnected  │
     └───────┬───────┘
             │ connect()
             ▼
     ┌───────────────┐
     │  connecting   │
     └───────┬───────┘
             │ success
             ▼
     ┌───────────────┐  timeout/error  ┌───────────────┐
     │   connected   │────────────────►│     error     │
     └───────┬───────┘                 └───────┬───────┘
             │                                 │
             │ session timeout approaching     │ auto-reconnect
             ▼                                 │
     ┌───────────────┐                         │
     │   renewing    │◄────────────────────────┘
     └───────────────┘
```

---

## Storage Strategy

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Environments | YAML file | Human-readable, Git-friendly |
| Collections | JSON file | Complex nested structure |
| Bridges | JSON file | Part of profile |
| Dashboards | JSON file | Part of profile |
| Alert Rules | JSON file | Part of profile |
| Alert History | SQLite | Fast query, large volume |
| OPC UA Certificates | File system + JSON index | PKI standard format |

---

## Indexes (SQLite)

```sql
-- Alert history indexes
CREATE INDEX idx_alert_timestamp ON alert_events(timestamp DESC);
CREATE INDEX idx_alert_rule ON alert_events(rule_id);
CREATE INDEX idx_alert_severity ON alert_events(severity);
CREATE INDEX idx_alert_acknowledged ON alert_events(acknowledged);

-- Compound index for common query
CREATE INDEX idx_alert_filter ON alert_events(severity, timestamp DESC);
```
