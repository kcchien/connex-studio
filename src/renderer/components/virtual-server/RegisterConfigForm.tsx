/**
 * RegisterConfigForm Component
 *
 * Form for configuring virtual register ranges and their waveforms.
 */

import React, { useState } from 'react'
import { WaveformSelector } from './WaveformSelector'
import type { Waveform } from '@shared/types/virtual-server'

export interface RegisterConfig {
  address: number
  length: number
  waveform: Waveform
}

interface RegisterConfigFormProps {
  registers: RegisterConfig[]
  onChange: (registers: RegisterConfig[]) => void
  className?: string
}

const DEFAULT_WAVEFORM: Waveform = {
  type: 'constant',
  amplitude: 0,
  offset: 100,
  period: 1000
}

export function RegisterConfigForm({
  registers,
  onChange,
  className = ''
}: RegisterConfigFormProps): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    registers.length > 0 ? 0 : null
  )

  const handleAddRegister = () => {
    // Find next available address (after last register)
    const lastAddress =
      registers.length > 0
        ? Math.max(...registers.map((r) => r.address + r.length))
        : 0

    const newRegister: RegisterConfig = {
      address: lastAddress,
      length: 1,
      waveform: { ...DEFAULT_WAVEFORM }
    }

    onChange([...registers, newRegister])
    setExpandedIndex(registers.length) // Expand new register
  }

  const handleRemoveRegister = (index: number) => {
    const newRegisters = registers.filter((_, i) => i !== index)
    onChange(newRegisters)

    if (expandedIndex === index) {
      setExpandedIndex(newRegisters.length > 0 ? 0 : null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const handleUpdateRegister = (index: number, updates: Partial<RegisterConfig>) => {
    const newRegisters = registers.map((reg, i) =>
      i === index ? { ...reg, ...updates } : reg
    )
    onChange(newRegisters)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Virtual Registers
        </label>
        <button
          onClick={handleAddRegister}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Add Register
        </button>
      </div>

      {registers.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md">
          No registers configured. Click &quot;Add Register&quot; to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {registers.map((register, index) => (
            <RegisterItem
              key={index}
              register={register}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              onChange={(updates) => handleUpdateRegister(index, updates)}
              onRemove={() => handleRemoveRegister(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface RegisterItemProps {
  register: RegisterConfig
  index: number
  isExpanded: boolean
  onToggle: () => void
  onChange: (updates: Partial<RegisterConfig>) => void
  onRemove: () => void
}

function RegisterItem({
  register,
  index,
  isExpanded,
  onToggle,
  onChange,
  onRemove
}: RegisterItemProps): React.ReactElement {
  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-sm font-medium">
            Register {index + 1}
          </span>
          <span className="text-xs text-muted-foreground">
            Address: {register.address}, Length: {register.length}, Type: {register.waveform.type}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove register"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-3 border-t">
          {/* Address and Length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Start Address
              </label>
              <input
                type="number"
                value={register.address}
                onChange={(e) =>
                  onChange({ address: parseInt(e.target.value) || 0 })
                }
                min="0"
                max="65535"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Length (registers)
              </label>
              <input
                type="number"
                value={register.length}
                onChange={(e) =>
                  onChange({ length: parseInt(e.target.value) || 1 })
                }
                min="1"
                max="125"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Waveform Configuration */}
          <WaveformSelector
            value={register.waveform}
            onChange={(waveform) => onChange({ waveform })}
          />
        </div>
      )}
    </div>
  )
}
