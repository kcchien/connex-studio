/**
 * TagByteOrderSelector - Compact byte order selector for tag-level override.
 *
 * Shows "Connection Default" as the first option, then the 4 byte order choices.
 * Only visible for 32-bit data types (int32, uint32, float32, float64).
 */

import React from 'react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@renderer/lib/utils'
import type { ByteOrder } from '@shared/types'
import { BYTE_ORDER_INFO } from '@shared/types'

export interface TagByteOrderSelectorProps {
  /** Current value - undefined means "Connection Default" */
  value: ByteOrder | undefined
  /** Callback when value changes - undefined means "Connection Default" */
  onChange: (value: ByteOrder | undefined) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Optional additional className */
  className?: string
}

const BYTE_ORDERS: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']

export function TagByteOrderSelector({
  value,
  onChange,
  disabled = false,
  className
}: TagByteOrderSelectorProps): React.ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const selected = e.target.value
    if (selected === '') {
      onChange(undefined)
    } else {
      onChange(selected as ByteOrder)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label.Root
        htmlFor="tag-byte-order"
        className="text-xs font-medium text-muted-foreground"
      >
        Byte Order
      </Label.Root>
      <select
        id="tag-byte-order"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'w-full h-8 px-2.5 text-sm rounded-md',
          'bg-background border border-input',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <option value="">Connection Default</option>
        {BYTE_ORDERS.map((order) => {
          const info = BYTE_ORDER_INFO[order]
          return (
            <option key={order} value={order}>
              {order} ({info.name})
            </option>
          )
        })}
      </select>
      <p className="text-xs text-muted-foreground">
        Override connection's byte order for this tag
      </p>
    </div>
  )
}
