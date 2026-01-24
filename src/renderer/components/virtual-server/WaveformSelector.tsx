/**
 * WaveformSelector Component
 *
 * Allows selection and configuration of waveform type for virtual registers.
 * Supports: constant, sine, square, triangle, random
 */

import React from 'react'
import type { Waveform } from '@shared/types/virtual-server'

interface WaveformSelectorProps {
  value: Waveform
  onChange: (waveform: Waveform) => void
  className?: string
}

const WAVEFORM_TYPES = [
  { value: 'constant', label: 'Constant', description: 'Fixed value' },
  { value: 'sine', label: 'Sine', description: 'Smooth oscillation' },
  { value: 'square', label: 'Square', description: 'On/off switching' },
  { value: 'triangle', label: 'Triangle', description: 'Linear ramp' },
  { value: 'random', label: 'Random', description: 'Random values' }
] as const

export function WaveformSelector({
  value,
  onChange,
  className = ''
}: WaveformSelectorProps): React.ReactElement {
  const handleTypeChange = (type: Waveform['type']) => {
    // Set sensible defaults for each waveform type
    const defaults: Record<Waveform['type'], Partial<Waveform>> = {
      constant: { amplitude: 0, offset: 100, period: 1000 },
      sine: { amplitude: 50, offset: 100, period: 10000 },
      square: { amplitude: 50, offset: 100, period: 2000 },
      triangle: { amplitude: 50, offset: 100, period: 5000 },
      random: { amplitude: 0, offset: 0, period: 1000, min: 0, max: 100 }
    }

    onChange({
      ...value,
      ...defaults[type],
      type
    })
  }

  const handleFieldChange = (field: keyof Waveform, fieldValue: number) => {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Waveform Type */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Waveform Type
        </label>
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as Waveform['type'])}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {WAVEFORM_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>
      </div>

      {/* Waveform Parameters */}
      <div className="grid grid-cols-2 gap-3">
        {value.type !== 'random' && (
          <>
            {/* Offset */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Offset (Center)
              </label>
              <input
                type="number"
                value={value.offset}
                onChange={(e) => handleFieldChange('offset', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Amplitude - not needed for constant */}
            {value.type !== 'constant' && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Amplitude
                </label>
                <input
                  type="number"
                  value={value.amplitude}
                  onChange={(e) => handleFieldChange('amplitude', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </>
        )}

        {/* Random: Min/Max */}
        {value.type === 'random' && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Min Value
              </label>
              <input
                type="number"
                value={value.min ?? 0}
                onChange={(e) => handleFieldChange('min', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Max Value
              </label>
              <input
                type="number"
                value={value.max ?? 100}
                onChange={(e) => handleFieldChange('max', parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {/* Period - for oscillating waveforms */}
        {value.type !== 'constant' && (
          <div className={value.type === 'random' ? 'col-span-2' : ''}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Period (ms)
            </label>
            <input
              type="number"
              value={value.period}
              onChange={(e) => handleFieldChange('period', parseInt(e.target.value) || 1000)}
              min="100"
              step="100"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <WaveformPreview waveform={value} />
    </div>
  )
}

/**
 * Simple waveform preview visualization
 */
function WaveformPreview({ waveform }: { waveform: Waveform }): React.ReactElement {
  const points = React.useMemo(() => {
    const width = 200
    const height = 40
    const numPoints = 50

    const values: number[] = []
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * waveform.period
      values.push(generateValue(waveform, t))
    }

    // Normalize to fit in preview
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return values
      .map((v, i) => {
        const x = (i / numPoints) * width
        const y = height - ((v - min) / range) * (height - 4) - 2
        return `${x},${y}`
      })
      .join(' ')
  }, [waveform])

  return (
    <div className="p-2 bg-muted/50 rounded border">
      <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
      </svg>
    </div>
  )
}

/**
 * Generate waveform value for preview
 */
function generateValue(waveform: Waveform, timestamp: number): number {
  const phase = (timestamp % waveform.period) / waveform.period

  switch (waveform.type) {
    case 'constant':
      return waveform.offset

    case 'sine':
      return waveform.offset + waveform.amplitude * Math.sin(2 * Math.PI * phase)

    case 'square':
      return phase < 0.5
        ? waveform.offset + waveform.amplitude
        : waveform.offset - waveform.amplitude

    case 'triangle': {
      const triangleValue = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase
      return waveform.offset + waveform.amplitude * triangleValue
    }

    case 'random':
      return (waveform.min ?? 0) + Math.random() * ((waveform.max ?? 100) - (waveform.min ?? 0))

    default:
      return waveform.offset
  }
}
