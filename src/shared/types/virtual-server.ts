/**
 * Virtual Server type definitions for IIoT Protocol Studio.
 * Provides built-in protocol simulators for testing.
 */

export type VirtualServerStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface VirtualServer {
  id: string
  protocol: 'modbus-tcp'
  port: number
  status: VirtualServerStatus
  registers: VirtualRegister[]
  clientCount?: number
  lastError?: string
}

export interface VirtualRegister {
  address: number
  length: number
  waveform: Waveform
  currentValues: number[]
}

export interface Waveform {
  type: 'constant' | 'sine' | 'square' | 'triangle' | 'random'
  amplitude: number
  offset: number
  period: number
  min?: number
  max?: number
}

// Default waveform configurations
export const DEFAULT_CONSTANT_WAVEFORM: Waveform = {
  type: 'constant',
  amplitude: 0,
  offset: 100,
  period: 1000
}

export const DEFAULT_SINE_WAVEFORM: Waveform = {
  type: 'sine',
  amplitude: 50,
  offset: 100,
  period: 10000
}

export const DEFAULT_RANDOM_WAVEFORM: Waveform = {
  type: 'random',
  amplitude: 0,
  offset: 0,
  period: 1000,
  min: 0,
  max: 100
}

// Virtual server port constraints
export const DEFAULT_VIRTUAL_SERVER_PORT = 5020
export const MIN_VIRTUAL_SERVER_PORT = 1024
export const MAX_VIRTUAL_SERVER_PORT = 65535
