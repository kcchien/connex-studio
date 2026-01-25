/**
 * WidgetBase Component
 *
 * Base component and interface for all dashboard widgets.
 * Provides common styling, header, and interaction patterns.
 */

import React, { memo, type ReactNode } from 'react'
import { GripVertical, Settings, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { WidgetType, WidgetConfig, Threshold } from '@shared/types'

// -----------------------------------------------------------------------------
// Widget Props Interface
// -----------------------------------------------------------------------------

export interface WidgetBaseProps {
  /** Widget ID */
  id: string
  /** Widget type */
  type: WidgetType
  /** Widget configuration */
  config: WidgetConfig
  /** Current value(s) from bound tag(s) */
  values: Map<string, number | boolean | string | null>
  /** Whether widget is in edit mode */
  isEditing?: boolean
  /** Callback for config changes */
  onConfigChange?: (config: Partial<WidgetConfig>) => void
  /** Callback for widget removal */
  onRemove?: () => void
  /** Additional className */
  className?: string
}

export interface WidgetContainerProps {
  /** Widget title (optional, from config) */
  title?: string
  /** Whether widget is in edit mode */
  isEditing?: boolean
  /** Show settings button */
  showSettings?: boolean
  /** Callback for settings click */
  onSettingsClick?: () => void
  /** Callback for remove click */
  onRemove?: () => void
  /** Children content */
  children: ReactNode
  /** Additional className */
  className?: string
}

// -----------------------------------------------------------------------------
// Widget Container
// -----------------------------------------------------------------------------

/**
 * Container wrapper for all widgets with optional header and edit controls.
 */
export const WidgetContainer = memo(function WidgetContainer({
  title,
  isEditing = false,
  showSettings = true,
  onSettingsClick,
  onRemove,
  children,
  className
}: WidgetContainerProps): React.ReactElement {
  return (
    <div
      className={cn(
        'relative h-full w-full rounded-lg border border-border bg-card',
        'flex flex-col overflow-hidden',
        isEditing && 'ring-2 ring-primary/50',
        className
      )}
    >
      {/* Header (if title or editing) */}
      {(title || isEditing) && (
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2',
            'border-b border-border bg-muted/30'
          )}
        >
          {/* Drag handle (edit mode) */}
          {isEditing && (
            <div className="widget-drag-handle cursor-move text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {/* Title */}
          {title && (
            <span className="flex-1 text-sm font-medium text-foreground truncate">
              {title}
            </span>
          )}

          {/* Edit controls */}
          {isEditing && (
            <div className="flex items-center gap-1">
              {showSettings && (
                <button
                  onClick={onSettingsClick}
                  className={cn(
                    'p-1 rounded text-muted-foreground',
                    'hover:text-foreground hover:bg-muted transition-colors'
                  )}
                  title="Widget settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
              {onRemove && (
                <button
                  onClick={onRemove}
                  className={cn(
                    'p-1 rounded text-muted-foreground',
                    'hover:text-destructive hover:bg-destructive/10 transition-colors'
                  )}
                  title="Remove widget"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3 overflow-hidden">{children}</div>
    </div>
  )
})

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Get color for value based on thresholds.
 * Returns the color of the highest threshold that the value exceeds.
 */
export function getColorForValue(
  value: number,
  thresholds: Threshold[],
  defaultColor = 'currentColor'
): string {
  if (!thresholds || thresholds.length === 0) {
    return defaultColor
  }

  // Sort thresholds by value descending
  const sorted = [...thresholds].sort((a, b) => b.value - a.value)

  // Find the first threshold that value exceeds
  for (const threshold of sorted) {
    if (value >= threshold.value) {
      return threshold.color
    }
  }

  return defaultColor
}

/**
 * Format a numeric value for display.
 */
export function formatValue(
  value: number | null | undefined,
  decimals = 2,
  unit?: string
): string {
  if (value == null || isNaN(value)) {
    return '—'
  }

  const formatted = value.toFixed(decimals)
  return unit ? `${formatted} ${unit}` : formatted
}

/**
 * Get the primary value from a values map (first non-null value).
 */
export function getPrimaryValue(
  values: Map<string, number | boolean | string | null>
): number | boolean | string | null {
  for (const value of values.values()) {
    if (value !== null) {
      return value
    }
  }
  return null
}

/**
 * Convert a value to number for numeric widgets.
 */
export function toNumericValue(
  value: number | boolean | string | null
): number | null {
  if (value === null) return null
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

// -----------------------------------------------------------------------------
// Widget Type Helpers
// -----------------------------------------------------------------------------

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  gauge: 'Gauge',
  led: 'LED Indicator',
  numberCard: 'Number Card',
  chart: 'Chart'
}

export const WIDGET_TYPE_ICONS: Record<WidgetType, string> = {
  gauge: 'gauge',
  led: 'circle-dot',
  numberCard: 'hash',
  chart: 'chart-line'
}

export const WIDGET_MIN_SIZES: Record<WidgetType, { minW: number; minH: number }> = {
  gauge: { minW: 2, minH: 2 },
  led: { minW: 1, minH: 1 },
  numberCard: { minW: 2, minH: 1 },
  chart: { minW: 3, minH: 2 }
}

export const WIDGET_DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  gauge: { w: 3, h: 3 },
  led: { w: 2, h: 2 },
  numberCard: { w: 3, h: 2 },
  chart: { w: 6, h: 3 }
}
