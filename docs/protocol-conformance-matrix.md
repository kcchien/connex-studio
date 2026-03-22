# Protocol Conformance Test Matrix

This document tracks protocol conformance coverage for Connex Studio's three supported industrial communication protocols: Modbus TCP, MQTT, and OPC UA.

**Last Updated**: 2026-03-22

**Status Legend**:
- **Implemented**: Feature exists in adapter code and has conformance tests
- **Partial**: Feature exists but has limitations or incomplete coverage
- **Not Tested**: Feature exists in code but lacks conformance tests
- **N/A**: Feature is not applicable or intentionally out of scope

---

## 1. Modbus TCP

Reference: Modbus Application Protocol Specification V1.1b3 (Modbus.org), Modbus Messaging on TCP/IP Implementation Guide V1.0b

### 1.1 Function Codes (Read Operations)

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MOD-001 | FC 01 Read Coils | Modbus Spec, Section 6.1 | Read boolean values from coil registers | Implemented | Via `readRegistersRange('coil', ...)` using `readCoils()` |
| MOD-002 | FC 02 Read Discrete Inputs | Modbus Spec, Section 6.2 | Read boolean values from discrete input registers | Implemented | Via `readRegistersRange('discrete', ...)` using `readDiscreteInputs()` |
| MOD-003 | FC 03 Read Holding Registers | Modbus Spec, Section 6.3 | Read 16-bit values from holding registers | Implemented | Via `readRegistersRange('holding', ...)` using `readHoldingRegisters()` |
| MOD-004 | FC 04 Read Input Registers | Modbus Spec, Section 6.4 | Read 16-bit values from input registers | Implemented | Via `readRegistersRange('input', ...)` using `readInputRegisters()` |
| MOD-005 | FC 05 Write Single Coil | Modbus Spec, Section 6.5 | Write a single coil value | Implemented | Via `writeCoilValue()` using `writeCoil()` |
| MOD-006 | FC 06 Write Single Register | Modbus Spec, Section 6.6 | Write a single holding register value | Implemented | Via `writeRegisterValue()` using `writeRegister()` |
| MOD-007 | FC 15 Write Multiple Coils | Modbus Spec, Section 6.11 | Write multiple coil values in one request | Implemented | Via `writeCoilValue()` using `writeCoils()` for array input |
| MOD-008 | FC 16 Write Multiple Registers | Modbus Spec, Section 6.12 | Write multiple holding register values in one request | Implemented | Via `writeRegisterValue()` using `writeRegisters()` for multi-register types |

### 1.2 Exception / Error Handling

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MOD-010 | Connection error detection | Modbus TCP/IP Guide, Section 4.2 | Detect ECONNRESET, ECONNREFUSED, ETIMEDOUT, etc. | Implemented | `isConnectionError()` checks 6 error codes |
| MOD-011 | Error propagation to read results | Modbus Spec, Section 7 | Failed batch reads mark tags as quality='bad' | Implemented | Batch read errors set quality='bad' for all batch tags |
| MOD-012 | Connection status tracking | Modbus TCP/IP Guide, Section 4.1 | Track connecting/connected/error/disconnected states | Implemented | Via ProtocolAdapter base class |
| MOD-013 | Disposed adapter rejection | - | Prevent operations on disposed adapters | Implemented | `connect()` throws if `isDisposed` is true |

### 1.3 Byte Order Variants

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MOD-020 | ABCD (Big-Endian) | IEC 61131, common convention | Registers in natural high-low order (Siemens, ABB) | Implemented | `reorderRegisters()` returns `[reg0, reg1]` |
| MOD-021 | DCBA (Little-Endian) | Vendor-specific | Words and bytes swapped (some Allen-Bradley, Omron) | Implemented | `reorderRegisters()` returns `[reg1, reg0]` |
| MOD-022 | BADC (Mid-Big / Word Swap) | Vendor-specific | Bytes swapped within each word (Schneider Modicon) | Implemented | `reorderRegisters()` returns `[swapBytes(reg0), swapBytes(reg1)]` |
| MOD-023 | CDAB (Mid-Little / Byte Swap) | Vendor-specific | Bytes and words both swapped (GE Fanuc) | Implemented | `reorderRegisters()` returns `[swapBytes(reg1), swapBytes(reg0)]` |
| MOD-024 | Invalid byte order fallback | - | Unknown byte order falls back to ABCD with warning | Implemented | Default case in `reorderRegisters()` |
| MOD-025 | Tag-level byte order override | - | Individual tags can override connection default | Implemented | `getEffectiveByteOrder()` prefers tag over connection |

### 1.4 Data Type Conversions

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MOD-030 | uint16 | Modbus Spec, Section 4.2 | Unsigned 16-bit integer (single register) | Implemented | Direct register value |
| MOD-031 | int16 | Modbus Spec, Section 4.2 | Signed 16-bit integer (two's complement) | Implemented | `toInt16()`: values >= 0x8000 converted to negative |
| MOD-032 | uint32 | - | Unsigned 32-bit integer (2 registers, byte-order aware) | Implemented | `convertUint32()` with `reorderRegisters()` |
| MOD-033 | int32 | - | Signed 32-bit integer (2 registers, byte-order aware) | Implemented | `convertInt32()` with signed conversion |
| MOD-034 | float32 | IEEE 754 | 32-bit floating point (2 registers, byte-order aware) | Implemented | `convertFloat32()` via DataView |
| MOD-035 | float64 | IEEE 754 | 64-bit floating point (4 registers) | N/A | DataType defined but not implemented in `convertValue()` |
| MOD-036 | boolean (from register) | - | Single bit extraction from register (bit 0) | Implemented | `(registers[0] & 0x01) === 1` |
| MOD-037 | boolean (from coil/discrete) | Modbus Spec, Section 6.1/6.2 | Direct boolean from coil/discrete registers | Implemented | Returns `(rawData as boolean[])[0]` |
| MOD-038 | string (ASCII) | - | ASCII string from consecutive registers (2 chars/register) | Implemented | `registersToString()`: high byte then low byte, null-trimmed |

### 1.5 Address Parsing

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MOD-040 | Modicon format (40001-49999) | Modicon convention | Holding registers via 5-digit Modicon address | Implemented | 40001 maps to holding register 0 |
| MOD-041 | Modicon format (30001-39999) | Modicon convention | Input registers via 5-digit Modicon address | Implemented | 30001 maps to input register 0 |
| MOD-042 | Modicon format (00001-09999) | Modicon convention | Coils via 5-digit Modicon address | Implemented | 00001 maps to coil 0 |
| MOD-043 | Modicon format (10001-19999) | Modicon convention | Discrete inputs via 5-digit Modicon address | Implemented | 10001 maps to discrete input 0 |
| MOD-044 | IEC format (HR, IR, C, DI) | IEC 61131-3 | IEC-style address prefix notation | Implemented | HR100, IR100, C100, DI100 |
| MOD-045 | Plain number with explicit type | - | Plain address with registerType parameter | Implemented | Requires `registerType` parameter |
| MOD-046 | Invalid address format | - | Reject unrecognized address formats | Implemented | Throws `Error('Invalid Modbus address format')` |
| MOD-047 | Address range (0-65535) | Modbus Spec, Section 4.4 | Validate register addresses within valid range | Partial | Parsing allows any integer; no explicit upper bound check |

### 1.6 Batch Read Optimization

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MOD-050 | Batch merging by adjacency | - | Merge adjacent tags into single read request | Implemented | Gap <= `maxGap` (default 10) |
| MOD-051 | Max register limit (125) | Modbus Spec, Section 6.3 | Split batches exceeding 125 registers | Implemented | `maxRegisters` default 125 |
| MOD-052 | Group by register type | - | Separate batches for holding/input/coil/discrete | Implemented | `groupTags()` by registerType |
| MOD-053 | Group by unit ID | - | Separate batches for different unit IDs | Implemented | `groupTags()` by unitId |
| MOD-054 | Disabled batch mode | - | Each tag becomes individual request when disabled | Implemented | `config.enabled === false` path |
| MOD-055 | Tag value extraction | - | Extract individual tag values from batch result | Implemented | `extractTagValues()` with offset/length slicing |

---

## 2. MQTT

Reference: MQTT Version 3.1.1 (OASIS Standard), MQTT Version 5.0 (OASIS Standard)

### 2.1 Quality of Service

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MQT-001 | QoS 0 (At most once) | MQTT 3.1.1, Section 4.3.1 | Fire-and-forget delivery | Implemented | Per-tag QoS via `MqttAddress.qos` field; defaults to 1 if omitted |
| MQT-002 | QoS 1 (At least once) | MQTT 3.1.1, Section 4.3.2 | Acknowledged delivery | Implemented | Default QoS for all subscriptions |
| MQT-003 | QoS 2 (Exactly once) | MQTT 3.1.1, Section 4.3.3 | Four-step handshake delivery | Implemented | Per-tag QoS via `MqttAddress.qos` field; merged by highest QoS per topic |

### 2.2 Message Features

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MQT-010 | Retained messages | MQTT 3.1.1, Section 3.3.1.3 | Receive retained message on subscribe | N/A | No explicit retained message handling; relies on broker behavior |
| MQT-011 | Will messages | MQTT 3.1.1, Section 3.1.2.5 | Last will and testament on disconnect | N/A | Not configured in connection options |
| MQT-012 | Clean session | MQTT 3.1.1, Section 3.1.2.4 | Start with clean session state | Partial | Hardcoded `clean: true`; not configurable |

### 2.3 Topic Handling

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MQT-020 | Exact topic match | MQTT 3.1.1, Section 4.7 | Match topic string exactly | Implemented | Direct string comparison in `topicMatches()` |
| MQT-021 | Single-level wildcard (+) | MQTT 3.1.1, Section 4.7.1.2 | Match single topic level | Implemented | `+` matches one level in `topicMatches()` |
| MQT-022 | Multi-level wildcard (#) | MQTT 3.1.1, Section 4.7.1.3 | Match remaining topic levels | Implemented | `#` matches all remaining levels |
| MQT-023 | Topic validation (empty) | MQTT 3.1.1, Section 4.7 | Reject empty topic string | Implemented | `parseMqttAddress()` throws on empty topic |
| MQT-024 | JSON path extraction | - | Extract value from JSON payload via dot notation | Implemented | `extractJsonPath()` with array index support |
| MQT-025 | Address format (topic::jsonPath) | - | Parse MQTT address with optional JSON path | Implemented | `parseMqttAddress()` splits on `::` |

### 2.4 Connection & Security

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MQT-030 | TLS/SSL connection | MQTT 3.1.1 + TLS | Secure connection with TLS | Implemented | `useTls` flag, `caCert` option, `rejectUnauthorized` |
| MQT-031 | Username/password auth | MQTT 3.1.1, Section 3.1.3.4-5 | CONNECT with credentials | Implemented | Optional `username` and `password` in options |
| MQT-032 | Client ID | MQTT 3.1.1, Section 3.1.3.1 | Custom client identifier | Implemented | `config.clientId` passed to options |
| MQT-033 | Connect timeout | - | Connection timeout handling | Implemented | `connectTimeout: 10000` (10 seconds) |
| MQT-034 | Auto-reconnection | MQTT 3.1.1 (client behavior) | Automatic reconnect on disconnect | Implemented | `reconnectPeriod: 5000` (5 seconds); resubscribe on reconnect |

### 2.5 Payload Parsing

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| MQT-040 | Simple numeric value | - | Parse plain numeric string payload | Implemented | `parseFloat(text)` in `parseSimpleValue()` |
| MQT-041 | Boolean text values | - | Parse 'true'/'false'/'on'/'off'/'0'/'1' | Implemented | Case-insensitive match in `parseSimpleValue()` |
| MQT-042 | JSON payload | - | Parse JSON object and extract value | Implemented | `JSON.parse()` with `extractJsonPath()` |
| MQT-043 | Nested JSON path | - | Extract from nested objects with dot notation | Implemented | Path split by `.`, `[`, `]` |
| MQT-044 | Type coercion | - | Convert extracted value to target data type | Implemented | `convertExtractedValue()` with dataType parameter |
| MQT-045 | Null/undefined handling | - | Return default values for missing data | Implemented | Returns `false`, `''`, or `0` based on data type |

---

## 3. OPC UA

Reference: OPC UA Specification (IEC 62541), Parts 1-14

### 3.1 Security

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-001 | Security Mode: None | OPC UA Part 2, Section 7 | No message security | Implemented | `mapSecurityModeToEnum('None')` -> `MessageSecurityMode.None` |
| OPC-002 | Security Mode: Sign | OPC UA Part 2, Section 7 | Message signing only | Implemented | `mapSecurityModeToEnum('Sign')` -> `MessageSecurityMode.Sign` |
| OPC-003 | Security Mode: SignAndEncrypt | OPC UA Part 2, Section 7 | Message signing and encryption | Implemented | `mapSecurityModeToEnum('SignAndEncrypt')` |
| OPC-004 | Policy: None | OPC UA Part 7, Section 6.7 | No security policy | Implemented | `mapSecurityPolicyToUri('None')` |
| OPC-005 | Policy: Basic256Sha256 | OPC UA Part 7, Section 6.7.4 | SHA-256 based security | Implemented | Maps to `SecurityPolicy.Basic256Sha256` |
| OPC-006 | Policy: Aes128_Sha256_RsaOaep | OPC UA Part 7, Section 6.7.5 | AES-128 with RSA-OAEP | Implemented | Maps to `SecurityPolicy.Aes128_Sha256_RsaOaep` |
| OPC-007 | Policy: Aes256_Sha256_RsaPss | OPC UA Part 7, Section 6.7.6 | AES-256 with RSA-PSS | Implemented | Maps to `SecurityPolicy.Aes256_Sha256_RsaPss` |
| OPC-008 | Certificate management | OPC UA Part 2, Section 8 | Client certificate handling | Partial | Certificate auth code present but commented out in `getUserIdentity()` |

### 3.2 Authentication

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-010 | Anonymous auth | OPC UA Part 4, Section 7.36.3 | Connect without credentials | Implemented | Default in `getUserIdentity()` returns type 0 |
| OPC-011 | Username/password auth | OPC UA Part 4, Section 7.36.4 | Credential-based authentication | Implemented | Returns type 1 with userName/password |
| OPC-012 | Certificate auth | OPC UA Part 4, Section 7.36.5 | X.509 certificate authentication | Partial | Code exists but commented out |
| OPC-013 | Token type mapping | OPC UA Part 4, Section 7.37 | Map token type integers to names | Implemented | `mapTokenType()`: 0=anonymous, 1=username, 2=certificate, 3=issuedToken |

### 3.3 Browse & Discovery

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-020 | Browse node children | OPC UA Part 4, Section 5.8.2 | Browse forward references from a node | Implemented | `browse()` with direction, reference type, result mask |
| OPC-021 | Browse continuation | OPC UA Part 4, Section 5.8.3 | Handle large results with continuation points | Implemented | `browseNext()` with base64 continuation point |
| OPC-022 | Search nodes by name | OPC UA Part 4, Section 5.8 | BFS search with pattern matching | Implemented | `searchNodes()` with depth/result limits |
| OPC-023 | Translate browse path | OPC UA Part 4, Section 5.8.4 | Resolve relative path to node ID | Implemented | `translateBrowsePath()` with HierarchicalReferences |
| OPC-024 | Get endpoints | OPC UA Part 4, Section 5.4.4 | Discover server endpoints | Implemented | `getEndpoints()` with temp client |
| OPC-025 | Discovery (FindServers) | OPC UA Part 4, Section 5.4.2 | Discover OPC UA servers on network | Implemented | Static `discoverServers()` function with cache |
| OPC-026 | Discovery (GetEndpoints) | OPC UA Part 4, Section 5.4.4 | Get endpoints from discovery URL | Implemented | Static `getEndpointsFromServer()` function with cache |

### 3.4 Read / Write Values

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-030 | Read single value | OPC UA Part 4, Section 5.10.2 | Read Value attribute from a node | Implemented | `read()` with AttributeIds.Value |
| OPC-031 | Read batch values | OPC UA Part 4, Section 5.10.2 | Read multiple nodes in one call | Implemented | `read()` maps array of nodesToRead |
| OPC-032 | Read node attributes | OPC UA Part 4, Section 5.10 | Read NodeClass, BrowseName, DisplayName, etc. | Implemented | `readNodeAttributes()` reads common + variable/method attrs |
| OPC-033 | Write single value | OPC UA Part 4, Section 5.10.4 | Write Value attribute to a node | Implemented | `write()` with Variant encoding |
| OPC-034 | Write batch values | OPC UA Part 4, Section 5.10.4 | Write multiple nodes in one call | Implemented | `write()` loops over request.nodes |
| OPC-035 | Write access validation | OPC UA Part 3, Section 5.6.2 | Check AccessLevel/UserAccessLevel before write | Implemented | `validateWriteAccess()` checks bit 0x02 |
| OPC-036 | Data type inference | OPC UA Part 6, Section 5.1 | Infer OPC UA DataType from JavaScript value type | Implemented | `inferDataType()`: boolean/number/string mapping |
| OPC-037 | Data type resolution | OPC UA Part 6, Section 5.1 | Resolve data type name string to enum | Implemented | `resolveDataTypeFromName()` supports 20+ types |
| OPC-038 | ExtensionObject decoding | OPC UA Part 6, Section 5.2.2.15 | Decode complex types (EURange, EUInformation, etc.) | Implemented | `decodeExtensionObject()` handles 5+ known types |

### 3.5 Subscriptions & Monitored Items

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-040 | Create subscription | OPC UA Part 4, Section 5.13.2 | Create publish subscription with interval/priority | Implemented | `createSubscription()` with configurable parameters |
| OPC-041 | Add monitored item | OPC UA Part 4, Section 5.12.2 | Monitor node value changes | Implemented | `addMonitoredItem()` with sampling/queue config |
| OPC-042 | Deadband: None | OPC UA Part 4, Section 7.17 | No value filtering | Implemented | Default deadband type |
| OPC-043 | Deadband: Absolute | OPC UA Part 4, Section 7.17.2 | Report changes exceeding absolute threshold | Implemented | DataChangeFilter with `DeadbandType.Absolute` |
| OPC-044 | Deadband: Percent | OPC UA Part 4, Section 7.17.3 | Report changes exceeding percentage of range | Implemented | DataChangeFilter with `DeadbandType.Percent` |
| OPC-045 | Modify monitored item | OPC UA Part 4, Section 5.12.3 | Change sampling/queue/deadband at runtime | Implemented | `modifyMonitoredItem()` |
| OPC-046 | Remove monitored item | OPC UA Part 4, Section 5.12.4 | Stop monitoring a node | Implemented | `removeMonitoredItem()` terminates item |
| OPC-047 | Set publishing mode | OPC UA Part 4, Section 5.13.4 | Pause/resume subscription publishing | Implemented | `setPublishingMode()` |
| OPC-048 | Delete subscription | OPC UA Part 4, Section 5.13.8 | Remove subscription and its monitored items | Implemented | `deleteSubscription()` terminates and cleans up |
| OPC-049 | Subscription transfer | OPC UA Part 4, Section 5.13.7 | Transfer subscriptions after reconnect | Implemented | `transferSubscriptions()` verifies post-reconnect |

### 3.6 Historical Data Access

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-050 | Check historizing | OPC UA Part 11, Section 6.2 | Read Historizing attribute from node | Implemented | `checkHistorizing()` reads Historizing + access levels |
| OPC-051 | Read raw history | OPC UA Part 11, Section 6.4.3 | Read raw historical values in time range | Implemented | `readHistoryRaw()` with ReadRawModifiedDetails |
| OPC-052 | Read processed history | OPC UA Part 11, Section 6.4.4 | Read aggregated history (Avg, Min, Max, etc.) | Implemented | `readHistoryProcessed()` with ReadProcessedDetails |
| OPC-053 | History continuation | OPC UA Part 11, Section 6.4 | Handle large history results with continuation | Implemented | Continuation points in base64 encoding |

### 3.7 Method Calls

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-060 | Get method arguments | OPC UA Part 3, Section 7.3 | Read InputArguments/OutputArguments properties | Implemented | `getMethodArguments()` browses HasProperty refs |
| OPC-061 | Call method | OPC UA Part 4, Section 5.11.2 | Invoke method with input arguments | Implemented | `callMethod()` with Variant encoding |
| OPC-062 | Browse methods | OPC UA Part 3, Section 7.3 | List methods on an object node | Implemented | `browseMethods()` filters NodeClass==4 |

### 3.8 Events (Alarms & Conditions)

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-070 | Subscribe to events | OPC UA Part 9, Section 5.3 | Monitor EventNotifier attribute | Implemented | `subscribeEvents()` with EventFilter |
| OPC-071 | Event field selection | OPC UA Part 4, Section 7.17.3 | Select specific event fields | Implemented | `selectClauses` with SimpleAttributeOperand |
| OPC-072 | Event type filtering | OPC UA Part 4, Section 7.17.3 | Filter by event type (OfType operator) | Implemented | `buildEventFilter()` with OfType operands |
| OPC-073 | Acknowledge condition | OPC UA Part 9, Section 5.8.1 | Call Acknowledge method on condition | Implemented | `acknowledgeCondition()` calls i=9111 |
| OPC-074 | Confirm condition | OPC UA Part 9, Section 5.8.2 | Call Confirm method on condition | Implemented | `confirmCondition()` calls i=9113 |
| OPC-075 | Unsubscribe events | OPC UA Part 4, Section 5.12.4 | Terminate event monitoring | Implemented | `unsubscribeEvents()` terminates monitored item |

### 3.9 Connection & Session Management

| Test ID | Feature / Operation | Spec Reference | Test Description | Status | Notes |
|---------|---------------------|----------------|------------------|--------|-------|
| OPC-080 | Endpoint URL validation | OPC UA Part 6, Section 7.1 | Validate opc.tcp:// URL format | Implemented | `validateEndpointUrl()` checks protocol, host, port |
| OPC-081 | Session creation | OPC UA Part 4, Section 5.6.2 | Create session with user identity | Implemented | `connect()` calls `createSession()` |
| OPC-082 | Session timeout handling | OPC UA Part 4, Section 5.6.2 | Renew session at 75% of timeout | Implemented | `startSessionRenewal()` with interval timer |
| OPC-083 | Session recovery | OPC UA Part 4, Section 5.6.3 | Automatic recovery with exponential backoff | Implemented | `attemptSessionRecovery()` with max 5 retries |
| OPC-084 | Subscription restoration | OPC UA Part 4, Section 5.13 | Restore subscriptions after session recovery | Implemented | `restoreSubscriptions()` recreates from stored configs |
| OPC-085 | Endpoint URL parsing | OPC UA Part 6, Section 7.1 | Parse host, port, path from endpoint URL | Implemented | `parseEndpointUrl()` |

---

## Summary

| Protocol | Total Tests | Implemented | Partial | N/A | Not Tested |
|----------|------------|-------------|---------|-----|------------|
| Modbus TCP | 32 | 30 | 1 | 1 | 0 |
| MQTT | 18 | 15 | 1 | 2 | 0 |
| OPC UA | 35 | 33 | 2 | 0 | 0 |
| **Total** | **85** | **78** | **4** | **3** | **0** |

### Key Gaps

1. **Modbus float64**: DataType is defined but `convertValue()` has no float64 case; it falls through to uint16 default.
2. **MQTT will messages and retained message handling**: Not exposed in connection options.
3. **MQTT clean session**: Hardcoded `clean: true`; not configurable per connection.
4. **OPC UA certificate authentication**: Code exists but is commented out.
