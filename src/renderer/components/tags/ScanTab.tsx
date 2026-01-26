import React, { useState } from 'react'
import { cn } from '@renderer/lib/utils'
import { Search, Loader2 } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag, ModbusAddress } from '@shared/types/tag'

export interface ScanTabProps {
  connectionId: string
  protocol: Protocol
  onPreviewChange: (tags: Partial<Tag>[]) => void
}

type RegisterType = 'holding' | 'input' | 'coil' | 'discrete'

/**
 * ScanTab - Scan address range for active registers
 */
export function ScanTab({
  connectionId,
  protocol,
  onPreviewChange,
}: ScanTabProps): React.ReactElement {
  const [startAddress, setStartAddress] = useState(0)
  const [endAddress, setEndAddress] = useState(99)
  const [registerType, setRegisterType] = useState<RegisterType>('holding')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ found: number; scanned: number } | null>(null)

  const handleScan = async () => {
    setIsScanning(true)
    setScanResult(null)

    try {
      // Simulate scanning (in real implementation, call IPC to scan)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Generate mock tags based on scan range
      const foundTags: Partial<Tag>[] = []
      const total = endAddress - startAddress + 1
      const found = Math.floor(total * 0.3) // Simulate ~30% active

      for (let i = 0; i < found; i++) {
        const addr = startAddress + Math.floor(i * (total / found))
        foundTags.push({
          connectionId,
          name: `${registerType}_${addr}`,
          address: {
            type: 'modbus',
            registerType,
            address: addr,
            length: 1,
          } as ModbusAddress,
          dataType: 'int16',
          displayFormat: { decimals: 0, unit: '' },
          thresholds: {},
          enabled: true,
        })
      }

      setScanResult({ found: foundTags.length, scanned: total })
      onPreviewChange(foundTags)
    } finally {
      setIsScanning(false)
    }
  }

  const isModbus = protocol === 'modbus-tcp'

  return (
    <div className="space-y-6">
      {/* Register Type (Modbus only) */}
      {isModbus && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Register Type</label>
          <div className="grid grid-cols-4 gap-2">
            {(['holding', 'input', 'coil', 'discrete'] as RegisterType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setRegisterType(type)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm capitalize',
                  'border transition-colors',
                  registerType === type
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Address Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="start-address" className="text-sm font-medium text-gray-300">
            Start Address
          </label>
          <input
            id="start-address"
            type="number"
            min={0}
            value={startAddress}
            onChange={(e) => setStartAddress(Number(e.target.value))}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-gray-800 border border-gray-700',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="end-address" className="text-sm font-medium text-gray-300">
            End Address
          </label>
          <input
            id="end-address"
            type="number"
            min={startAddress}
            value={endAddress}
            onChange={(e) => setEndAddress(Number(e.target.value))}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-gray-800 border border-gray-700',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Scan Button */}
      <button
        type="button"
        onClick={handleScan}
        disabled={isScanning || endAddress < startAddress}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
          'bg-gray-800 border border-gray-700',
          'text-white font-medium',
          'hover:bg-gray-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        {isScanning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Scanning {endAddress - startAddress + 1} addresses...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Scan Range ({endAddress - startAddress + 1} addresses)
          </>
        )}
      </button>

      {/* Scan Result */}
      {scanResult && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <p className="text-sm text-green-400">
            Found {scanResult.found} active registers out of {scanResult.scanned} scanned
          </p>
        </div>
      )}
    </div>
  )
}
