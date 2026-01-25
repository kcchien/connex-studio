/**
 * WidgetConfig Component
 *
 * Property editor panel for configuring widget settings.
 * Displays different fields based on widget type.
 */

import React, { memo, useState, useCallback } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type {
  DashboardWidget,
  WidgetType,
  WidgetConfig as WidgetConfigType,
  GaugeConfig,
  LEDConfig,
  NumberCardConfig,
  ChartConfig,
  Threshold,
  Tag
} from '@shared/types'
import {
  DEFAULT_GAUGE_CONFIG,
  DEFAULT_LED_CONFIG,
  DEFAULT_NUMBER_CARD_CONFIG,
  DEFAULT_CHART_CONFIG
} from '@shared/types'
import { WIDGET_TYPE_LABELS } from './WidgetBase'

interface WidgetConfigProps {
  /** Widget to configure */
  widget: DashboardWidget
  /** Available tags for binding */
  availableTags: Tag[]
  /** Whether dialog is open */
  isOpen: boolean
  /** Callback to close dialog */
  onClose: () => void
  /** Callback when config changes */
  onSave: (tagRefs: string[], config: WidgetConfigType) => void
  /** Additional className */
  className?: string
}

/**
 * WidgetConfig dialog for editing widget properties.
 */
export const WidgetConfig = memo(function WidgetConfig({
  widget,
  availableTags,
  isOpen,
  onClose,
  onSave,
  className
}: WidgetConfigProps): React.ReactElement | null {
  const [tagRefs, setTagRefs] = useState<string[]>(widget.tagRefs)
  const [config, setConfig] = useState<WidgetConfigType>(widget.config)

  const handleSave = useCallback(() => {
    onSave(tagRefs, config)
    onClose()
  }, [tagRefs, config, onSave, onClose])

  const updateConfig = useCallback(
    <K extends keyof WidgetConfigType>(key: K, value: any) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-md max-h-[80vh] flex flex-col',
          'rounded-lg bg-card border border-border shadow-lg',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Configure {WIDGET_TYPE_LABELS[widget.type]}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded text-muted-foreground',
              'hover:text-foreground hover:bg-muted transition-colors'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tag binding */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Bound Tag
            </label>
            <select
              value={tagRefs[0] || ''}
              onChange={(e) => setTagRefs(e.target.value ? [e.target.value] : [])}
              className={cn(
                'w-full px-3 py-2 rounded-md text-sm',
                'bg-background border border-input',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              <option value="">Select a tag...</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name} ({tag.dataType})
                </option>
              ))}
            </select>
          </div>

          {/* Type-specific config */}
          {widget.type === 'gauge' && (
            <GaugeConfigEditor
              config={config as GaugeConfig}
              onChange={setConfig}
            />
          )}
          {widget.type === 'led' && (
            <LEDConfigEditor
              config={config as LEDConfig}
              onChange={setConfig}
            />
          )}
          {widget.type === 'numberCard' && (
            <NumberCardConfigEditor
              config={config as NumberCardConfig}
              onChange={setConfig}
            />
          )}
          {widget.type === 'chart' && (
            <ChartConfigEditor
              config={config as ChartConfig}
              onChange={setConfig}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-md text-sm',
              'border border-border text-foreground',
              'hover:bg-muted transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'px-4 py-2 rounded-md text-sm',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
})

// -----------------------------------------------------------------------------
// Config Editors
// -----------------------------------------------------------------------------

interface GaugeConfigEditorProps {
  config: GaugeConfig
  onChange: (config: GaugeConfig) => void
}

const GaugeConfigEditor = memo(function GaugeConfigEditor({
  config,
  onChange
}: GaugeConfigEditorProps): React.ReactElement {
  const addThreshold = useCallback(() => {
    onChange({
      ...config,
      thresholds: [...config.thresholds, { value: 50, color: '#f59e0b' }]
    })
  }, [config, onChange])

  const updateThreshold = useCallback(
    (index: number, updates: Partial<Threshold>) => {
      const thresholds = [...config.thresholds]
      thresholds[index] = { ...thresholds[index], ...updates }
      onChange({ ...config, thresholds })
    },
    [config, onChange]
  )

  const removeThreshold = useCallback(
    (index: number) => {
      onChange({
        ...config,
        thresholds: config.thresholds.filter((_, i) => i !== index)
      })
    },
    [config, onChange]
  )

  return (
    <>
      {/* Style */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Style</label>
        <select
          value={config.style}
          onChange={(e) =>
            onChange({ ...config, style: e.target.value as 'circular' | 'semi' })
          }
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        >
          <option value="circular">Circular (360°)</option>
          <option value="semi">Semi-circular (180°)</option>
        </select>
      </div>

      {/* Min/Max */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Min</label>
          <input
            type="number"
            value={config.min}
            onChange={(e) =>
              onChange({ ...config, min: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Max</label>
          <input
            type="number"
            value={config.max}
            onChange={(e) =>
              onChange({ ...config, max: parseFloat(e.target.value) || 100 })
            }
            className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
          />
        </div>
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Unit</label>
        <input
          type="text"
          value={config.unit || ''}
          onChange={(e) => onChange({ ...config, unit: e.target.value })}
          placeholder="e.g., °C, %, PSI"
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>

      {/* Show Value */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showValue"
          checked={config.showValue}
          onChange={(e) => onChange({ ...config, showValue: e.target.checked })}
          className="rounded border-input"
        />
        <label htmlFor="showValue" className="text-sm text-foreground">
          Show numeric value
        </label>
      </div>

      {/* Thresholds */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Color Thresholds
          </label>
          <button
            onClick={addThreshold}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
        {config.thresholds.map((threshold, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="number"
              value={threshold.value}
              onChange={(e) =>
                updateThreshold(index, {
                  value: parseFloat(e.target.value) || 0
                })
              }
              className="flex-1 px-2 py-1 rounded text-sm bg-background border border-input"
              placeholder="Value"
            />
            <input
              type="color"
              value={threshold.color}
              onChange={(e) => updateThreshold(index, { color: e.target.value })}
              className="w-10 h-8 rounded border border-input cursor-pointer"
            />
            <button
              onClick={() => removeThreshold(index)}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  )
})

interface LEDConfigEditorProps {
  config: LEDConfig
  onChange: (config: LEDConfig) => void
}

const LEDConfigEditor = memo(function LEDConfigEditor({
  config,
  onChange
}: LEDConfigEditorProps): React.ReactElement {
  return (
    <>
      {/* Shape */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Shape</label>
        <select
          value={config.shape}
          onChange={(e) =>
            onChange({ ...config, shape: e.target.value as 'circle' | 'square' })
          }
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        >
          <option value="circle">Circle</option>
          <option value="square">Square</option>
        </select>
      </div>

      {/* On Value */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">On Value</label>
        <input
          type="number"
          value={typeof config.onValue === 'number' ? config.onValue : 1}
          onChange={(e) =>
            onChange({ ...config, onValue: parseFloat(e.target.value) || 1 })
          }
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">On Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.onColor}
              onChange={(e) => onChange({ ...config, onColor: e.target.value })}
              className="w-10 h-8 rounded border border-input cursor-pointer"
            />
            <input
              type="text"
              value={config.onColor}
              onChange={(e) => onChange({ ...config, onColor: e.target.value })}
              className="flex-1 px-2 py-1 rounded text-sm bg-background border border-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Off Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.offColor}
              onChange={(e) => onChange({ ...config, offColor: e.target.value })}
              className="w-10 h-8 rounded border border-input cursor-pointer"
            />
            <input
              type="text"
              value={config.offColor}
              onChange={(e) => onChange({ ...config, offColor: e.target.value })}
              className="flex-1 px-2 py-1 rounded text-sm bg-background border border-input"
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Label</label>
        <input
          type="text"
          value={config.label || ''}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
          placeholder="e.g., Motor Running"
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>
    </>
  )
})

interface NumberCardConfigEditorProps {
  config: NumberCardConfig
  onChange: (config: NumberCardConfig) => void
}

const NumberCardConfigEditor = memo(function NumberCardConfigEditor({
  config,
  onChange
}: NumberCardConfigEditorProps): React.ReactElement {
  return (
    <>
      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Title</label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="e.g., Temperature"
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Unit</label>
        <input
          type="text"
          value={config.unit || ''}
          onChange={(e) => onChange({ ...config, unit: e.target.value })}
          placeholder="e.g., °C, %, PSI"
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>

      {/* Decimals */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Decimal Places
        </label>
        <input
          type="number"
          min={0}
          max={6}
          value={config.decimals}
          onChange={(e) =>
            onChange({ ...config, decimals: parseInt(e.target.value) || 0 })
          }
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Font Size</label>
        <select
          value={config.fontSize}
          onChange={(e) =>
            onChange({
              ...config,
              fontSize: e.target.value as 'sm' | 'md' | 'lg' | 'xl'
            })
          }
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="xl">Extra Large</option>
        </select>
      </div>
    </>
  )
})

interface ChartConfigEditorProps {
  config: ChartConfig
  onChange: (config: ChartConfig) => void
}

const ChartConfigEditor = memo(function ChartConfigEditor({
  config,
  onChange
}: ChartConfigEditorProps): React.ReactElement {
  return (
    <>
      {/* Time Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Time Range (seconds)
        </label>
        <input
          type="number"
          min={10}
          max={3600}
          value={config.timeRange}
          onChange={(e) =>
            onChange({ ...config, timeRange: parseInt(e.target.value) || 60 })
          }
          className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input"
        />
      </div>

      {/* Show Grid */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showGrid"
          checked={config.showGrid}
          onChange={(e) => onChange({ ...config, showGrid: e.target.checked })}
          className="rounded border-input"
        />
        <label htmlFor="showGrid" className="text-sm text-foreground">
          Show grid lines
        </label>
      </div>

      {/* Show Legend */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showLegend"
          checked={config.showLegend}
          onChange={(e) => onChange({ ...config, showLegend: e.target.checked })}
          className="rounded border-input"
        />
        <label htmlFor="showLegend" className="text-sm text-foreground">
          Show legend
        </label>
      </div>
    </>
  )
})

export default WidgetConfig
