# IPC Contracts

IPC 通道定義，使用 `ipcMain.handle` / `ipcRenderer.invoke` 模式。

---

## Channels Overview

| Channel | Direction | Description |
|---------|-----------|-------------|
| `connection:*` | Renderer → Main | 連線管理 |
| `tag:*` | Renderer → Main | Tag 管理 |
| `modbus:*` | Renderer → Main | Modbus 操作 |
| `mqtt:*` | Renderer → Main | MQTT 操作 |
| `opcua:*` | Renderer → Main | OPC UA 操作 |
| `virtual-server:*` | Renderer → Main | 虛擬伺服器管理 |
| `dvr:*` | Renderer → Main | Data DVR 控制 |
| `state:*` | Bidirectional | 狀態同步 |

---

## Connection Channels

### `connection:create`
建立新連線配置。

**Request:**
```ts
interface ConnectionCreateRequest {
  name: string
  protocol: 'modbus-tcp' | 'mqtt' | 'opcua'
  config: ModbusConfig | MqttConfig | OpcuaConfig
  reconnectPolicy?: ReconnectPolicy
}
```

**Response:**
```ts
interface ConnectionCreateResponse {
  success: boolean
  connection?: Connection
  error?: string
}
```

---

### `connection:connect`
建立協定連線。

**Request:**
```ts
interface ConnectionConnectRequest {
  connectionId: string
}
```

**Response:**
```ts
interface ConnectionConnectResponse {
  success: boolean
  error?: string
}
```

---

### `connection:disconnect`
斷開協定連線。

**Request:**
```ts
interface ConnectionDisconnectRequest {
  connectionId: string
}
```

**Response:**
```ts
interface ConnectionDisconnectResponse {
  success: boolean
}
```

---

### `connection:list`
列出所有連線。

**Request:** `void`

**Response:**
```ts
type ConnectionListResponse = Connection[]
```

---

### `connection:delete`
刪除連線配置。

**Request:**
```ts
interface ConnectionDeleteRequest {
  connectionId: string
}
```

**Response:**
```ts
interface ConnectionDeleteResponse {
  success: boolean
  error?: string
}
```

---

## Tag Channels

### `tag:create`
建立新 Tag。

**Request:**
```ts
interface TagCreateRequest {
  connectionId: string
  name: string
  address: string
  dataType: DataType
  displayFormat?: DisplayFormat
  byteOrder?: ByteOrder
  pollingInterval?: number
  alertConfig?: AlertConfig
}
```

**Response:**
```ts
interface TagCreateResponse {
  success: boolean
  tag?: Tag
  error?: string
}
```

---

### `tag:update`
更新 Tag 設定。

**Request:**
```ts
interface TagUpdateRequest {
  tagId: string
  updates: Partial<Omit<Tag, 'id' | 'connectionId'>>
}
```

**Response:**
```ts
interface TagUpdateResponse {
  success: boolean
  tag?: Tag
  error?: string
}
```

---

### `tag:delete`
刪除 Tag。

**Request:**
```ts
interface TagDeleteRequest {
  tagId: string
}
```

**Response:**
```ts
interface TagDeleteResponse {
  success: boolean
}
```

---

### `tag:list`
列出連線的所有 Tag。

**Request:**
```ts
interface TagListRequest {
  connectionId: string
}
```

**Response:**
```ts
type TagListResponse = Tag[]
```

---

## Modbus Channels

### `modbus:read`
讀取 Modbus 寄存器。

**Request:**
```ts
interface ModbusReadRequest {
  connectionId: string
  functionCode: 'hr' | 'ir' | 'co' | 'di'
  startAddress: number
  quantity: number
}
```

**Response:**
```ts
interface ModbusReadResponse {
  success: boolean
  data?: number[] | boolean[]
  error?: string
}
```

---

### `modbus:write`
寫入 Modbus 寄存器。

**Request:**
```ts
interface ModbusWriteRequest {
  connectionId: string
  functionCode: 'hr' | 'co'  // FC06/FC16 or FC05/FC15
  startAddress: number
  values: number[] | boolean[]
}
```

**Response:**
```ts
interface ModbusWriteResponse {
  success: boolean
  error?: string
}
```

---

### `modbus:start-polling`
啟動輪詢。

**Request:**
```ts
interface ModbusStartPollingRequest {
  connectionId: string
  tagIds: string[]
  intervalMs: number
}
```

**Response:**
```ts
interface ModbusStartPollingResponse {
  success: boolean
  error?: string
}
```

---

### `modbus:stop-polling`
停止輪詢。

**Request:**
```ts
interface ModbusStopPollingRequest {
  connectionId: string
}
```

**Response:**
```ts
interface ModbusStopPollingResponse {
  success: boolean
}
```

---

## MQTT Channels

### `mqtt:subscribe`
訂閱 Topic。

**Request:**
```ts
interface MqttSubscribeRequest {
  connectionId: string
  topic: string  // supports wildcards: +, #
  qos?: 0 | 1 | 2
}
```

**Response:**
```ts
interface MqttSubscribeResponse {
  success: boolean
  error?: string
}
```

---

### `mqtt:unsubscribe`
取消訂閱 Topic。

**Request:**
```ts
interface MqttUnsubscribeRequest {
  connectionId: string
  topic: string
}
```

**Response:**
```ts
interface MqttUnsubscribeResponse {
  success: boolean
}
```

---

### `mqtt:publish`
發布訊息。

**Request:**
```ts
interface MqttPublishRequest {
  connectionId: string
  topic: string
  payload: string | Buffer
  qos?: 0 | 1 | 2
  retain?: boolean
}
```

**Response:**
```ts
interface MqttPublishResponse {
  success: boolean
  error?: string
}
```

---

## OPC UA Channels

### `opcua:browse`
瀏覽節點。

**Request:**
```ts
interface OpcuaBrowseRequest {
  connectionId: string
  nodeId: string  // e.g., 'ns=0;i=85' for Objects folder
}
```

**Response:**
```ts
interface OpcuaBrowseResponse {
  success: boolean
  nodes?: OpcuaNode[]
  error?: string
}

interface OpcuaNode {
  nodeId: string
  browseName: string
  displayName: string
  nodeClass: 'Object' | 'Variable' | 'Method' | 'ObjectType' | 'VariableType'
  hasChildren: boolean
}
```

---

### `opcua:read`
讀取節點值。

**Request:**
```ts
interface OpcuaReadRequest {
  connectionId: string
  nodeIds: string[]
}
```

**Response:**
```ts
interface OpcuaReadResponse {
  success: boolean
  values?: OpcuaValue[]
  error?: string
}

interface OpcuaValue {
  nodeId: string
  value: any
  dataType: string
  statusCode: number
  sourceTimestamp: number
  serverTimestamp: number
}
```

---

### `opcua:subscribe`
訂閱節點。

**Request:**
```ts
interface OpcuaSubscribeRequest {
  connectionId: string
  nodeIds: string[]
  samplingInterval?: number  // default: 500ms
}
```

**Response:**
```ts
interface OpcuaSubscribeResponse {
  success: boolean
  subscriptionId?: number
  error?: string
}
```

---

### `opcua:unsubscribe`
取消訂閱。

**Request:**
```ts
interface OpcuaUnsubscribeRequest {
  connectionId: string
  subscriptionId: number
}
```

**Response:**
```ts
interface OpcuaUnsubscribeResponse {
  success: boolean
}
```

---

## Virtual Server Channels

### `virtual-server:create`
建立虛擬伺服器。

**Request:**
```ts
interface VirtualServerCreateRequest {
  name: string
  type: 'modbus-tcp'
  config: VirtualModbusConfig
}
```

**Response:**
```ts
interface VirtualServerCreateResponse {
  success: boolean
  server?: VirtualServer
  error?: string
}
```

---

### `virtual-server:start`
啟動虛擬伺服器。

**Request:**
```ts
interface VirtualServerStartRequest {
  serverId: string
}
```

**Response:**
```ts
interface VirtualServerStartResponse {
  success: boolean
  error?: string
}
```

---

### `virtual-server:stop`
停止虛擬伺服器。

**Request:**
```ts
interface VirtualServerStopRequest {
  serverId: string
}
```

**Response:**
```ts
interface VirtualServerStopResponse {
  success: boolean
}
```

---

### `virtual-server:set-waveform`
設定波形產生器。

**Request:**
```ts
interface VirtualServerSetWaveformRequest {
  serverId: string
  waveform: Omit<Waveform, 'id' | 'serverId'>
}
```

**Response:**
```ts
interface VirtualServerSetWaveformResponse {
  success: boolean
  waveform?: Waveform
  error?: string
}
```

---

## DVR Channels

### `dvr:pause`
暫停即時更新。

**Request:** `void`

**Response:**
```ts
interface DvrPauseResponse {
  success: boolean
  pausedAt: number  // timestamp
}
```

---

### `dvr:resume`
恢復即時更新。

**Request:** `void`

**Response:**
```ts
interface DvrResumeResponse {
  success: boolean
}
```

---

### `dvr:seek`
跳轉到指定時間。

**Request:**
```ts
interface DvrSeekRequest {
  timestamp: number  // epoch ms
}
```

**Response:**
```ts
interface DvrSeekResponse {
  success: boolean
  snapshot: TagSnapshot[]
  error?: string
}

interface TagSnapshot {
  tagId: string
  value: any
  timestamp: number
}
```

---

### `dvr:get-range`
取得時間範圍內的數據。

**Request:**
```ts
interface DvrGetRangeRequest {
  tagId: string
  startTime: number
  endTime: number
}
```

**Response:**
```ts
interface DvrGetRangeResponse {
  success: boolean
  dataPoints?: DataPoint[]
  error?: string
}
```

---

## State Channels

### `state:get`
取得完整狀態。

**Request:** `void`

**Response:**
```ts
interface AppState {
  connections: Connection[]
  tags: Map<string, Tag>
  tagValues: Map<string, TagValue>
  virtualServers: VirtualServer[]
  dvr: DvrState
}

interface DvrState {
  isPaused: boolean
  currentTime: number | null
  bufferStartTime: number
  bufferEndTime: number
}
```

---

### `state:update` (Main → Renderer)
狀態更新推送。

**Event Payload:**
```ts
interface StateUpdateEvent {
  type: 'full' | 'partial'
  state?: AppState           // for full update
  changes?: StateChanges     // for partial update
}

interface StateChanges {
  tagValues?: Map<string, TagValue>
  connectionStatus?: Map<string, ConnectionStatus>
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `E_CONNECTION_FAILED` | 無法建立連線 |
| `E_CONNECTION_TIMEOUT` | 連線逾時 |
| `E_CONNECTION_NOT_FOUND` | 連線不存在 |
| `E_TAG_NOT_FOUND` | Tag 不存在 |
| `E_PROTOCOL_ERROR` | 協定錯誤（含 Modbus Exception） |
| `E_INVALID_ADDRESS` | 無效的地址格式 |
| `E_PERMISSION_DENIED` | 權限不足（OPC UA） |
| `E_CERTIFICATE_REJECTED` | 憑證被拒絕（OPC UA） |
| `E_PORT_IN_USE` | 埠號已被使用（Virtual Server） |
