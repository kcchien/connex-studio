/**
 * Shared types barrel export.
 * Import from '@shared/types' in both Main and Renderer processes.
 */

// Core types
export * from './common'
export * from './connection'
export * from './tag'
export * from './modbus'
export * from './diagnostics'
export * from './datapoint'
export * from './polling'
export * from './profile'
export * from './dvr'
export * from './export'
export * from './log'

// Phase 2: Professional Features
export * from './environment'
export * from './collection'
export * from './bridge'
export * from './dashboard'
export * from './alert'
export * from './calculator'
export * from './workspace'

// Phase 2: OPC UA Full Client
export * from './opcua'
