# Data Model: MVP Protocol Clients

**Date**: 2026-01-22  
**Phase**: 1 (Design & Contracts)  
**Status**: Complete

---

## Entity Overview

```
┌─────────────────┐       ┌─────────────────┐
│   Connection    │ 1───* │      Tag        │
└─────────────────┘       └─────────────────┘
        │                         │
        │                         │ 1
        │                         ▼
        │                 ┌─────────────────┐
        │                 │   DataPoint     │
        │                 │ (Ring Buffer)   │
        │                 └─────────────────┘
        │
        ▼
┌─────────────────┐
│  VirtualServer  │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│    Waveform     │
└─────────────────┘
```

---

## Entities

### Connection

代表一個協定連線實例。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (uuid) | ✅ | 唯一識別碼 |
| name | string | ✅ | 用戶可讀名稱 |
| protocol | `'modbus-tcp' \| 'mqtt' \| 'opcua'` | ✅ | 協定類型 |
| status | `ConnectionStatus` | ✅ | 連線狀態 |
| config | `ModbusConfig \| MqttConfig \| OpcuaConfig` | ✅ | 協定特定配置 |
| reconnectPolicy | `ReconnectPolicy` | ❌ | 重連策略 |
| createdAt | number (epoch ms) | ✅ | 建立時間 |
| lastConnectedAt | number \| null | ❌ | 最後連線時間 |

```ts
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface ReconnectPolicy {
  enabled: boolean
  maxRetries: number       // default: 5
  intervalMs: number       // default: 3000
  backoffMultiplier: number // default: 1.5
}
```

### Protocol Configs

**ModbusConfig:**
```ts
interface ModbusConfig {
  host: string
  port: number             // default: 502
  unitId: number           // default: 1
  timeout: number          // default: 3000ms
  defaultByteOrder: ByteOrder // default: 'big-endian'
}

type ByteOrder = 'big-endian' | 'little-endian' | 'mid-big' | 'mid-little'
```

**MqttConfig:**
```ts
interface MqttConfig {
  brokerUrl: string        // e.g., 'mqtt://broker.example.com:1883'
  clientId?: string        // auto-generated if not provided
  username?: string
  password?: string
  useTls: boolean          // default: false
  cleanSession: boolean    // default: true
}
```

**OpcuaConfig:**
```ts
interface OpcuaConfig {
  endpointUrl: string      // e.g., 'opc.tcp://server:4840'
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt'
  securityPolicy: 'None' | 'Basic256Sha256' | 'Aes128Sha256RsaOaep'
  applicationName: string  // default: 'Connex Studio'
}
```

---

### Tag

統一抽象的數據點，跨協定通用。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (uuid) | ✅ | 唯一識別碼 |
| connectionId | string | ✅ | 所屬連線 ID |
| name | string | ✅ | 用戶可讀名稱 |
| address | string | ✅ | 協定特定地址 |
| dataType | `DataType` | ✅ | 資料型別 |
| displayFormat | `DisplayFormat` | ✅ | 顯示格式 |
| byteOrder | `ByteOrder` \| null | ❌ | 覆寫連線層級設定 |
| pollingInterval | number \| null | ❌ | 覆寫連線層級輪詢間隔 |
| alertConfig | `AlertConfig` \| null | ❌ | 告警設定 |
| currentValue | `TagValue` \| null | ❌ | 目前值（runtime） |

```ts
type DataType = 
  | 'bool'
  | 'int16' | 'uint16'
  | 'int32' | 'uint32'
  | 'int64' | 'uint64'
  | 'float32' | 'float64'
  | 'string'
  | 'json'

type DisplayFormat = 'decimal' | 'hex' | 'binary' | 'ascii' | 'json'

interface AlertConfig {
  enabled: boolean
  lowWarning?: number
  lowCritical?: number
  highWarning?: number
  highCritical?: number
}
```

### Tag Address Formats

| Protocol | Address Format | Example |
|----------|----------------|---------|
| Modbus TCP | `{functionCode}:{address}` | `hr:40001` (Holding Register) |
| MQTT | Topic string | `factory/line1/temperature` |
| OPC UA | NodeId string | `ns=2;i=1234` or `ns=2;s=Temperature` |

**Modbus Function Code Prefixes:**
- `hr:` = Holding Registers (FC03)
- `ir:` = Input Registers (FC04)
- `co:` = Coils (FC01)
- `di:` = Discrete Inputs (FC02)

---

### TagValue

Tag 的運行時數值。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| value | any | ✅ | 實際值 |
| quality | `Quality` | ✅ | 品質狀態 |
| timestamp | number (epoch ms) | ✅ | 取得時間 |
| sourceTimestamp | number \| null | ❌ | 來源時間戳（OPC UA） |

```ts
type Quality = 'good' | 'bad' | 'uncertain' | 'stale'
```

---

### DataPoint

環形緩衝區中的單一數據快照。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tagId | string | ✅ | 對應 Tag ID |
| value | number \| string \| boolean | ✅ | 數值 |
| timestamp | number (epoch ms) | ✅ | 時間戳 |

**Storage Strategy:**
- In-memory TypedArray for numeric values (Float64Array)
- 每個 Tag 獨立環形緩衝區
- 容量計算：5 min × (1000ms / pollingInterval) 個點
  - 500ms polling → 600 points/tag
  - 100ms polling → 3000 points/tag

---

### VirtualServer

模擬伺服器實例。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (uuid) | ✅ | 唯一識別碼 |
| name | string | ✅ | 用戶可讀名稱 |
| type | `'modbus-tcp'` | ✅ | 伺服器類型（MVP 僅 Modbus） |
| status | `'stopped' \| 'running' \| 'error'` | ✅ | 運行狀態 |
| config | `VirtualModbusConfig` | ✅ | 伺服器配置 |
| waveforms | `Waveform[]` | ❌ | 波形產生器 |

```ts
interface VirtualModbusConfig {
  port: number              // default: 502
  unitId: number            // default: 1
  holdingRegisters: number  // default: 100
  inputRegisters: number    // default: 100
  coils: number             // default: 100
  discreteInputs: number    // default: 100
}
```

---

### Waveform

波形產生器設定。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (uuid) | ✅ | 唯一識別碼 |
| serverId | string | ✅ | 所屬 VirtualServer ID |
| type | `WaveformType` | ✅ | 波形類型 |
| targetAddress | string | ✅ | 目標寄存器地址 |
| config | `WaveformConfig` | ✅ | 波形參數 |

```ts
type WaveformType = 'sine' | 'random' | 'sawtooth' | 'step'

interface WaveformConfig {
  amplitude: number    // 振幅
  offset: number       // 偏移
  period: number       // 週期（ms）
  min?: number         // 隨機值最小
  max?: number         // 隨機值最大
  stepSize?: number    // 階梯步進
}
```

---

## State Transitions

### Connection Lifecycle

```
                    ┌──────────────────┐
                    │   disconnected   │ ◀──────────────┐
                    └────────┬─────────┘                │
                             │ connect()                │
                             ▼                          │
                    ┌──────────────────┐                │
                    │    connecting    │                │
                    └────────┬─────────┘                │
                    success/ │ \failure                 │
                           / │  \                       │
                          ▼  ▼   ▼                      │
          ┌───────────────────────────────────┐         │
          │              connected             │         │
          └────────────────┬──────────────────┘         │
                           │ connection lost            │
                           ▼                            │
                    ┌──────────────────┐                │
             ┌──────│   reconnecting   │───────┐        │
             │      └──────────────────┘       │        │
             │ success                 max retries      │
             ▼                                 ▼        │
          connected                    ┌─────────────┐  │
                                       │    error    │──┘
                                       └─────────────┘
```

### VirtualServer Lifecycle

```
    ┌─────────┐  start()   ┌─────────┐
    │ stopped │ ──────────▶│ running │
    └─────────┘            └────┬────┘
         ▲                      │
         │ stop()               │ error
         │                      ▼
         └───────────────  ┌─────────┐
                           │  error  │
                           └─────────┘
```

---

## Validation Rules

### Connection
- `name`: 1-64 characters, non-empty
- `config.host` (Modbus): valid IPv4/IPv6 or hostname
- `config.port`: 1-65535
- `config.unitId` (Modbus): 1-247
- `config.brokerUrl` (MQTT): valid URL with mqtt:// or mqtts:// scheme
- `config.endpointUrl` (OPC UA): valid URL with opc.tcp:// scheme

### Tag
- `name`: 1-64 characters, non-empty
- `address`: protocol-specific format validation
- `pollingInterval`: 100-60000 ms (if set)

### VirtualServer
- `config.port`: 1-65535
- `config.unitId`: 1-247
- `config.*Registers`: 1-10000

### Waveform
- `config.amplitude`: > 0
- `config.period`: 100-60000 ms
- `config.min` < `config.max` (for random type)

---

## Indexing Strategy

| Entity | Primary Key | Indexes |
|--------|-------------|---------|
| Connection | id | protocol, status |
| Tag | id | connectionId, name |
| DataPoint | (tagId, timestamp) | timestamp (for range queries) |
| VirtualServer | id | status |
| Waveform | id | serverId |
