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

export {
  ProfileService,
  getProfileService,
  type SaveProfileParams,
  type LoadProfileResult
} from './ProfileService'

export {
  ExportService,
  getExportService,
  type ExportProgressCallback
} from './ExportService'

export {
  VirtualServerManager,
  getVirtualServerManager,
  disposeVirtualServerManager,
  generateWaveformValue,
  DEFAULT_VIRTUAL_SERVER_PORT,
  MIN_VIRTUAL_SERVER_PORT,
  MAX_VIRTUAL_SERVER_PORT
} from './VirtualServer'
