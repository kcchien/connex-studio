# IPC Channels: Phase 2 Professional Features with Full OPC UA

**Branch**: `003-pro-features-opcua` | **Date**: 2026-01-24
**Purpose**: Define all IPC channels for inter-process communication.

---

## Channel Naming Convention

```
{domain}:{action}
```

- **domain**: Feature area (bridge, environment, dashboard, alert, opcua, etc.)
- **action**: Operation verb (create, read, update, delete, start, stop, etc.)

---

## Part A: Professional Features Channels

### Environment Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `environment:list` | R→M | `void` | `Environment[]` | List all environments |
| `environment:get` | R→M | `{ id: string }` | `Environment \| null` | Get environment by ID |
| `environment:create` | R→M | `CreateEnvironmentRequest` | `Environment` | Create new environment |
| `environment:update` | R→M | `UpdateEnvironmentRequest` | `Environment` | Update environment |
| `environment:delete` | R→M | `{ id: string }` | `{ success: boolean }` | Delete environment |
| `environment:set-default` | R→M | `{ id: string }` | `Environment` | Set as active environment |
| `environment:get-default` | R→M | `void` | `Environment \| null` | Get active environment |
| `environment:resolve` | R→M | `{ template: string }` | `{ resolved: string }` | Resolve variable substitution |

---

### Collection Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `collection:list` | R→M | `void` | `Collection[]` | List all collections |
| `collection:get` | R→M | `{ id: string }` | `Collection \| null` | Get collection by ID |
| `collection:create` | R→M | `CreateCollectionRequest` | `Collection` | Create new collection |
| `collection:update` | R→M | `UpdateCollectionRequest` | `Collection` | Update collection |
| `collection:delete` | R→M | `{ id: string }` | `{ success: boolean }` | Delete collection |
| `collection:run` | R→M | `{ id: string }` | `CollectionRunResult` | Execute collection |
| `collection:stop` | R→M | `{ runId: string }` | `{ success: boolean }` | Stop running collection |

**Events (M→R)**:
| Event | Payload | Description |
|-------|---------|-------------|
| `collection:progress` | `CollectionProgress` | Execution progress update |
| `collection:result` | `CollectionRunResult` | Final execution result |

---

### Bridge Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `bridge:list` | R→M | `void` | `Bridge[]` | List all bridges |
| `bridge:get` | R→M | `{ id: string }` | `Bridge \| null` | Get bridge by ID |
| `bridge:create` | R→M | `CreateBridgeRequest` | `Bridge` | Create new bridge |
| `bridge:update` | R→M | `UpdateBridgeRequest` | `Bridge` | Update bridge |
| `bridge:delete` | R→M | `{ id: string }` | `{ success: boolean }` | Delete bridge |
| `bridge:start` | R→M | `{ id: string }` | `{ success: boolean }` | Start forwarding |
| `bridge:stop` | R→M | `{ id: string }` | `{ success: boolean }` | Stop forwarding |
| `bridge:pause` | R→M | `{ id: string }` | `{ success: boolean }` | Pause forwarding |
| `bridge:resume` | R→M | `{ id: string }` | `{ success: boolean }` | Resume forwarding |
| `bridge:get-stats` | R→M | `{ id: string }` | `BridgeStats` | Get forwarding statistics |

**Events (M→R)**:
| Event | Payload | Description |
|-------|---------|-------------|
| `bridge:status-changed` | `{ id: string, status: BridgeStatus }` | Status transition |
| `bridge:error` | `{ id: string, error: string }` | Forwarding error |
| `bridge:stats` | `BridgeStats` | Periodic statistics |

---

### Dashboard Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `dashboard:list` | R→M | `void` | `Dashboard[]` | List all dashboards |
| `dashboard:get` | R→M | `{ id: string }` | `Dashboard \| null` | Get dashboard by ID |
| `dashboard:create` | R→M | `CreateDashboardRequest` | `Dashboard` | Create new dashboard |
| `dashboard:update` | R→M | `UpdateDashboardRequest` | `Dashboard` | Update dashboard |
| `dashboard:delete` | R→M | `{ id: string }` | `{ success: boolean }` | Delete dashboard |
| `dashboard:set-default` | R→M | `{ id: string }` | `Dashboard` | Set as auto-open dashboard |
| `dashboard:add-widget` | R→M | `AddWidgetRequest` | `DashboardWidget` | Add widget to dashboard |
| `dashboard:update-widget` | R→M | `UpdateWidgetRequest` | `DashboardWidget` | Update widget config |
| `dashboard:remove-widget` | R→M | `{ dashboardId: string, widgetId: string }` | `{ success: boolean }` | Remove widget |
| `dashboard:update-layout` | R→M | `UpdateLayoutRequest` | `{ success: boolean }` | Update grid layout |

---

### Alert Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `alert:list-rules` | R→M | `void` | `AlertRule[]` | List all alert rules |
| `alert:get-rule` | R→M | `{ id: string }` | `AlertRule \| null` | Get alert rule by ID |
| `alert:create-rule` | R→M | `CreateAlertRuleRequest` | `AlertRule` | Create new alert rule |
| `alert:update-rule` | R→M | `UpdateAlertRuleRequest` | `AlertRule` | Update alert rule |
| `alert:delete-rule` | R→M | `{ id: string }` | `{ success: boolean }` | Delete alert rule |
| `alert:enable-rule` | R→M | `{ id: string }` | `AlertRule` | Enable alert rule |
| `alert:disable-rule` | R→M | `{ id: string }` | `AlertRule` | Disable alert rule |
| `alert:list-events` | R→M | `AlertEventQuery` | `AlertEventPage` | Query alert history |
| `alert:acknowledge` | R→M | `{ eventId: number }` | `{ success: boolean }` | Acknowledge alert |
| `alert:acknowledge-all` | R→M | `{ severity?: string }` | `{ count: number }` | Acknowledge multiple |
| `alert:clear-history` | R→M | `{ before?: number }` | `{ count: number }` | Clear old events |

**Events (M→R)**:
| Event | Payload | Description |
|-------|---------|-------------|
| `alert:triggered` | `AlertEvent` | New alert triggered |
| `alert:acknowledged` | `{ eventId: number }` | Alert acknowledged |

---

### Calculator Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `calculator:crc16-modbus` | R→M | `{ data: string }` | `{ crc: number, hex: string }` | Calculate CRC-16 Modbus |
| `calculator:lrc` | R→M | `{ data: string }` | `{ lrc: number, hex: string }` | Calculate LRC |
| `calculator:decode-float32` | R→M | `DecodeFloat32Request` | `{ value: number }` | Decode IEEE 754 float |
| `calculator:encode-float32` | R→M | `EncodeFloat32Request` | `{ hex: string }` | Encode IEEE 754 float |
| `calculator:swap-bytes` | R→M | `SwapBytesRequest` | `{ result: string }` | Swap byte order |

---

### Workspace Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `workspace:export` | R→M | `ExportWorkspaceRequest` | `{ yaml: string }` | Export workspace to YAML |
| `workspace:import` | R→M | `{ yaml: string }` | `ImportWorkspaceResult` | Import workspace from YAML |
| `workspace:validate` | R→M | `{ yaml: string }` | `ValidationResult` | Validate YAML without import |
| `workspace:save-file` | R→M | `{ yaml: string, path: string }` | `{ success: boolean }` | Save to file |
| `workspace:load-file` | R→M | `{ path: string }` | `{ yaml: string }` | Load from file |

---

## Part B: OPC UA Channels

### Connection Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:connect` | R→M | `OpcUaConnectRequest` | `OpcUaConnectResult` | Connect to OPC UA server |
| `opcua:disconnect` | R→M | `{ connectionId: string }` | `{ success: boolean }` | Disconnect from server |
| `opcua:get-endpoints` | R→M | `{ endpointUrl: string }` | `OpcUaEndpoint[]` | Get server endpoints |
| `opcua:test-connection` | R→M | `OpcUaConnectRequest` | `{ success: boolean, error?: string }` | Test connection |

**Events (M→R)**:
| Event | Payload | Description |
|-------|---------|-------------|
| `opcua:session-status` | `{ connectionId: string, status: string }` | Session status change |
| `opcua:session-error` | `{ connectionId: string, error: string }` | Session error |

---

### Browse Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:browse` | R→M | `OpcUaBrowseRequest` | `OpcUaNode[]` | Browse node children |
| `opcua:browse-path` | R→M | `OpcUaBrowsePathRequest` | `OpcUaNode \| null` | Translate browse path |
| `opcua:get-node` | R→M | `{ connectionId: string, nodeId: string }` | `OpcUaNode` | Get node attributes |

---

### Read/Write Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:read` | R→M | `OpcUaReadRequest` | `OpcUaReadResult` | Read node value(s) |
| `opcua:write` | R→M | `OpcUaWriteRequest` | `OpcUaWriteResult` | Write node value(s) |
| `opcua:read-attributes` | R→M | `OpcUaReadAttributesRequest` | `OpcUaAttributeResult[]` | Read multiple attributes |

---

### Subscription Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:create-subscription` | R→M | `CreateSubscriptionRequest` | `OpcUaSubscription` | Create subscription |
| `opcua:delete-subscription` | R→M | `{ subscriptionId: string }` | `{ success: boolean }` | Delete subscription |
| `opcua:add-monitored-item` | R→M | `AddMonitoredItemRequest` | `MonitoredItem` | Add monitored item |
| `opcua:remove-monitored-item` | R→M | `{ subscriptionId: string, itemId: string }` | `{ success: boolean }` | Remove monitored item |
| `opcua:modify-monitored-item` | R→M | `ModifyMonitoredItemRequest` | `MonitoredItem` | Modify sampling/deadband |

**Events (M→R)**:
| Event | Payload | Description |
|-------|---------|-------------|
| `opcua:data-change` | `OpcUaDataChange` | Subscription data change |
| `opcua:subscription-status` | `{ subscriptionId: string, status: string }` | Subscription status |

---

### Event Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:subscribe-events` | R→M | `SubscribeEventsRequest` | `{ subscriptionId: string }` | Subscribe to events |
| `opcua:unsubscribe-events` | R→M | `{ subscriptionId: string }` | `{ success: boolean }` | Unsubscribe events |
| `opcua:acknowledge-condition` | R→M | `AcknowledgeConditionRequest` | `{ success: boolean }` | Acknowledge alarm |
| `opcua:confirm-condition` | R→M | `ConfirmConditionRequest` | `{ success: boolean }` | Confirm alarm |

**Events (M→R)**:
| Event | Payload | Description |
|-------|---------|-------------|
| `opcua:event` | `OpcUaEvent` | OPC UA event received |

---

### Method Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:call-method` | R→M | `OpcUaCallMethodRequest` | `OpcUaCallMethodResult` | Call OPC UA method |
| `opcua:get-method-args` | R→M | `{ connectionId: string, methodId: string }` | `OpcUaMethodArguments` | Get method argument definitions |

---

### History Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:read-history` | R→M | `OpcUaHistoryReadRequest` | `OpcUaHistoryReadResult` | Read historical values |
| `opcua:read-history-events` | R→M | `OpcUaHistoryEventsRequest` | `OpcUaHistoryEventsResult` | Read historical events |

---

### Certificate Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:list-certificates` | R→M | `void` | `OpcUaCertificate[]` | List all certificates |
| `opcua:import-certificate` | R→M | `ImportCertificateRequest` | `OpcUaCertificate` | Import certificate |
| `opcua:export-certificate` | R→M | `{ id: string, path: string }` | `{ success: boolean }` | Export certificate |
| `opcua:delete-certificate` | R→M | `{ id: string }` | `{ success: boolean }` | Delete certificate |
| `opcua:generate-certificate` | R→M | `GenerateCertificateRequest` | `OpcUaCertificate` | Generate self-signed |
| `opcua:trust-certificate` | R→M | `{ id: string }` | `OpcUaCertificate` | Add to trusted store |
| `opcua:reject-certificate` | R→M | `{ id: string }` | `{ success: boolean }` | Remove from trusted |
| `opcua:get-server-certificate` | R→M | `{ endpointUrl: string }` | `OpcUaCertificate` | Get server's certificate |

---

### Discovery Channels

| Channel | Direction | Request | Response | Description |
|---------|-----------|---------|----------|-------------|
| `opcua:discover-servers` | R→M | `DiscoverServersRequest` | `OpcUaServer[]` | Discover servers on network |
| `opcua:find-servers` | R→M | `{ discoveryUrl: string }` | `OpcUaServer[]` | Find servers at discovery endpoint |

---

## Request/Response Types Reference

See `contracts/types.ts` for complete TypeScript type definitions.

## Error Handling

All channels return errors in a consistent format:

```typescript
interface IpcError {
  code: string;           // Error code (e.g., 'CONNECTION_FAILED')
  message: string;        // Human-readable message
  details?: unknown;      // Additional error details
}

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: IpcError;
}
```

## Event Registration

Renderer subscribes to events via preload API:

```typescript
// Subscribe
window.api.on('opcua:data-change', (data) => {
  // Handle data change
});

// Unsubscribe
window.api.off('opcua:data-change', handler);
```
