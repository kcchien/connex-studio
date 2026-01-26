/**
 * ByteOrderSelector - Visual byte order configuration for Modbus connections.
 *
 * Features:
 * - Dropdown for 4 byte order options (ABCD, DCBA, BADC, CDAB)
 * - Visual example showing register layout
 * - Common vendor information for each byte order
 * - Helper text pointing to diagnostic tools
 */

import React from 'react'
import { cn } from '@renderer/lib/utils'
import type { ByteOrder } from '@shared/types'
import { BYTE_ORDER_INFO } from '@shared/types'

export interface ByteOrderSelectorProps {
  value: ByteOrder
  onChange: (value: ByteOrder) => void
  className?: string
}

const BYTE_ORDERS: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']

/**
 * Visual representation of how registers map to bytes for a FLOAT32 value.
 * Uses 123.456 (0x42F6E979) as an example.
 */
function ByteOrderVisual({ byteOrder }: { byteOrder: ByteOrder }): React.ReactElement {
  // 123.456 as IEEE 754 = 0x42F6E979
  // Bytes: 42, F6, E9, 79
  const getRegisterLayout = (): { reg0: string; reg1: string } => {
    switch (byteOrder) {
      case 'ABCD': // Big-endian: [42 F6] [E9 79]
        return { reg0: '42 F6', reg1: 'E9 79' }
      case 'DCBA': // Little-endian: [79 E9] [F6 42]
        return { reg0: '79 E9', reg1: 'F6 42' }
      case 'BADC': // Mid-big (word swap): [F6 42] [79 E9]
        return { reg0: 'F6 42', reg1: '79 E9' }
      case 'CDAB': // Mid-little (byte swap): [E9 79] [42 F6]
        return { reg0: 'E9 79', reg1: '42 F6' }
    }
  }

  const { reg0, reg1 } = getRegisterLayout()

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Example: 123.456 (FLOAT32)
      </div>
      <div className="flex items-center gap-2 font-mono text-sm">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reg 0</span>
          <span className="px-3 py-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {reg0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reg 1</span>
          <span className="px-3 py-1.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            {reg1}
          </span>
        </div>
        <span className="text-gray-400 dark:text-gray-500 mx-2">=</span>
        <span className="text-gray-900 dark:text-white font-semibold">123.456</span>
      </div>
    </div>
  )
}

/**
 * Display common vendors using this byte order.
 */
function VendorInfo({ byteOrder }: { byteOrder: ByteOrder }): React.ReactElement {
  const info = BYTE_ORDER_INFO[byteOrder]

  return (
    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      <span className="font-medium">Common: </span>
      {info.vendors.slice(0, 3).join(', ')}
      {info.vendors.length > 3 && '...'}
    </div>
  )
}

export function ByteOrderSelector({
  value,
  onChange,
  className
}: ByteOrderSelectorProps): React.ReactElement {
  return (
    <div className={cn('space-y-2', className)} data-testid="byte-order-selector">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Byte Order (32-bit)
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ByteOrder)}
        className={cn(
          'w-full px-4 py-2 rounded-lg',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'text-gray-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        )}
      >
        {BYTE_ORDERS.map((order) => {
          const info = BYTE_ORDER_INFO[order]
          return (
            <option key={order} value={order}>
              {order} - {info.name}
            </option>
          )
        })}
      </select>

      <ByteOrderVisual byteOrder={value} />
      <VendorInfo byteOrder={value} />

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Not sure? Use Tools → Float Decoder to test with your PLC.
      </p>
    </div>
  )
}
