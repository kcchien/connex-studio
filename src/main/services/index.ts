/**
 * Main Process Services Index
 *
 * Exports all service singletons and utilities.
 */

export {
  DataBuffer,
  getDataBuffer,
  closeDataBuffer,
  type DataBufferConfig,
  type SparklineOptions,
  type SparklineResult,
  type DataRange
} from './DataBuffer'

export {
  CredentialService,
  getCredentialService,
  type Credentials,
  type CredentialEntry
} from './CredentialService'

export {
  LogService,
  getLogService,
  log,
  type LogServiceConfig
} from './LogService'

export {
  ConnectionManager,
  getConnectionManager,
  disposeConnectionManager
} from './ConnectionManager'

export {
  PollingEngine,
  getPollingEngine,
  disposePollingEngine
} from './PollingEngine'
