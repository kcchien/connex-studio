/**
 * WidgetPalette Component
 *
 * Selection panel for adding widgets to the dashboard.
 * Displays available widget types with previews.
 */

import React, { memo } from 'react'
import { Gauge, CircleDot, Hash, LineChart, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { WidgetType } from '@shared/types'
import { WIDGET_TYPE_LABELS, WIDGET_DEFAULT_SIZES } from './WidgetBase'

interface WidgetPaletteProps {
  /** Whether palette is open */
  isOpen: boolean
  /** Callback to close palette */
  onClose: () => void
  /** Callback when widget type is selected */
  onSelectWidget: (type: WidgetType) => void
  /** Additional className */
  className?: string
}

interface WidgetOption {
  type: WidgetType
  label: string
  description: string
  icon: React.ReactNode
  preview: React.ReactNode
}

const WIDGET_OPTIONS: WidgetOption[] = [
  {
    type: 'gauge',
    label: 'Gauge',
    description: 'Circular gauge for numeric values',
    icon: <Gauge className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 60 40" className="w-full h-full">
          <path
            d="M 10 35 A 25 25 0 0 1 50 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          <path
            d="M 10 35 A 25 25 0 0 1 30 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary"
          />
        </svg>
      </div>
    )
  },
  {
    type: 'led',
    label: 'LED',
    description: 'On/Off indicator light',
    icon: <CircleDot className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
        <div className="w-4 h-4 rounded-full bg-muted" />
      </div>
    )
  },
  {
    type: 'numberCard',
    label: 'Number',
    description: 'Large numeric display',
    icon: <Hash className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-lg font-bold text-primary">42.5</span>
        <span className="text-xs text-muted-foreground ml-1">°C</span>
      </div>
    )
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'Time-series line chart',
    icon: <LineChart className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full flex items-end justify-between px-1 pb-1">
        <div className="w-1 h-3 bg-primary/50 rounded-sm" />
        <div className="w-1 h-5 bg-primary/60 rounded-sm" />
        <div className="w-1 h-4 bg-primary/70 rounded-sm" />
        <div className="w-1 h-7 bg-primary/80 rounded-sm" />
        <div className="w-1 h-6 bg-primary/90 rounded-sm" />
        <div className="w-1 h-8 bg-primary rounded-sm" />
      </div>
    )
  }
]

/**
 * WidgetPalette displays available widget types for selection.
 */
export const WidgetPalette = memo(function WidgetPalette({
  isOpen,
  onClose,
  onSelectWidget,
  className
}: WidgetPaletteProps): React.ReactElement | null {
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
          'w-full max-w-lg p-6 rounded-lg',
          'bg-card border border-border shadow-lg',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Add Widget
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

        {/* Widget grid */}
        <div className="grid grid-cols-2 gap-4">
          {WIDGET_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                onSelectWidget(option.type)
                onClose()
              }}
              className={cn(
                'flex flex-col items-start p-4 rounded-lg',
                'border border-border bg-background',
                'hover:border-primary hover:bg-primary/5',
                'transition-colors text-left'
              )}
            >
              {/* Preview */}
              <div
                className={cn(
                  'w-full h-16 mb-3 rounded-md',
                  'bg-muted/50 border border-border',
                  'flex items-center justify-center overflow-hidden'
                )}
              >
                {option.preview}
              </div>

              {/* Info */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary">{option.icon}</span>
                <span className="font-medium text-foreground">
                  {option.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>

              {/* Size hint */}
              <p className="text-xs text-muted-foreground/70 mt-2">
                Default size: {WIDGET_DEFAULT_SIZES[option.type].w}x
                {WIDGET_DEFAULT_SIZES[option.type].h}
              </p>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Click a widget to add it to your dashboard. You can resize and
          reposition widgets in edit mode.
        </p>
      </div>
    </div>
  )
})

export default WidgetPalette
