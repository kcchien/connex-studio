/**
 * DashboardCanvas Component
 *
 * Main dashboard container using react-grid-layout for widget positioning.
 * Supports edit mode with drag-and-drop, resize, and widget management.
 */

import React, { memo, useCallback, useMemo } from 'react'
import GridLayout, { type Layout, type LayoutItem } from 'react-grid-layout'
import { Edit2, Eye, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type {
  Dashboard,
  DashboardWidget,
  WidgetLayout,
  WidgetType,
  GaugeConfig,
  LEDConfig,
  NumberCardConfig,
  ChartConfig
} from '@shared/types'
import {
  WIDGET_MIN_SIZES,
  WIDGET_DEFAULT_SIZES
} from './WidgetBase'
import { GaugeWidget, LEDWidget, NumberCardWidget, ChartWidget } from './widgets'

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface DashboardCanvasProps {
  /** Current dashboard */
  dashboard: Dashboard
  /** Tag values map (tagId -> value) */
  tagValues: Map<string, number | boolean | string | null>
  /** Whether canvas is in edit mode */
  isEditing: boolean
  /** Callback to toggle edit mode */
  onEditModeChange: (isEditing: boolean) => void
  /** Callback for layout changes */
  onLayoutChange: (layout: WidgetLayout[]) => void
  /** Callback for widget removal */
  onWidgetRemove: (widgetId: string) => void
  /** Callback to add widget */
  onAddWidget: () => void
  /** Callback for widget config change */
  onWidgetConfigChange: (widgetId: string, config: Partial<any>) => void
  /** Container width */
  width?: number
  /** Additional className */
  className?: string
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const GRID_COLS = 12
const GRID_ROW_HEIGHT = 80
const GRID_MARGIN: readonly [number, number] = [16, 16] as const
const GRID_CONTAINER_PADDING: readonly [number, number] = [16, 16] as const

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * DashboardCanvas renders the dashboard grid with all widgets.
 */
export const DashboardCanvas = memo(function DashboardCanvas({
  dashboard,
  tagValues,
  isEditing,
  onEditModeChange,
  onLayoutChange,
  onWidgetRemove,
  onAddWidget,
  onWidgetConfigChange,
  width = 1200,
  className
}: DashboardCanvasProps): React.ReactElement {
  // Convert layout to react-grid-layout format
  const gridLayout = useMemo((): Layout => {
    return dashboard.layout.map((item): LayoutItem => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
      static: !isEditing
    }))
  }, [dashboard.layout, isEditing])

  // Handle layout change
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const widgetLayout: WidgetLayout[] = newLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH
      }))
      onLayoutChange(widgetLayout)
    },
    [onLayoutChange]
  )

  // Render individual widget
  const renderWidget = useCallback(
    (widget: DashboardWidget): React.ReactElement => {
      // Get values for this widget's tags
      const widgetValues = new Map<string, number | boolean | string | null>()
      for (const tagRef of widget.tagRefs) {
        widgetValues.set(tagRef, tagValues.get(tagRef) ?? null)
      }

      const commonProps = {
        id: widget.id,
        type: widget.type,
        config: widget.config,
        values: widgetValues,
        isEditing,
        onRemove: isEditing ? () => onWidgetRemove(widget.id) : undefined,
        onConfigChange: isEditing
          ? (config: Partial<any>) => onWidgetConfigChange(widget.id, config)
          : undefined
      }

      switch (widget.type) {
        case 'gauge':
          return (
            <GaugeWidget
              {...commonProps}
              config={widget.config as GaugeConfig}
            />
          )
        case 'led':
          return (
            <LEDWidget
              {...commonProps}
              config={widget.config as LEDConfig}
            />
          )
        case 'numberCard':
          return (
            <NumberCardWidget
              {...commonProps}
              config={widget.config as NumberCardConfig}
            />
          )
        case 'chart':
          return (
            <ChartWidget
              {...commonProps}
              config={widget.config as ChartConfig}
              tagRefs={widget.tagRefs}
            />
          )
        default:
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Unknown widget type
            </div>
          )
      }
    },
    [tagValues, isEditing, onWidgetRemove, onWidgetConfigChange]
  )

  return (
    <div className={cn('relative', className)}>
      {/* Toolbar */}
      <div
        className={cn(
          'flex items-center justify-between mb-4 px-4 py-2',
          'bg-muted/30 rounded-lg border border-border'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {dashboard.name}
          </span>
          {dashboard.isDefault && (
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
              Default
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={onAddWidget}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </button>
          )}

          <button
            onClick={() => onEditModeChange(!isEditing)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
              'border border-border',
              isEditing
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            {isEditing ? (
              <>
                <Eye className="h-4 w-4" />
                View Mode
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4" />
                Edit Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid */}
      {dashboard.widgets.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center py-20',
            'border-2 border-dashed border-border rounded-lg'
          )}
        >
          <p className="text-muted-foreground mb-4">
            No widgets added yet
          </p>
          <button
            onClick={onAddWidget}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Plus className="h-4 w-4" />
            Add Your First Widget
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'relative min-h-[400px]',
            isEditing && 'bg-muted/20 rounded-lg border border-dashed border-border'
          )}
        >
          <GridLayout
            layout={gridLayout}
            width={width - 32} // Account for container padding
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: GRID_ROW_HEIGHT,
              margin: GRID_MARGIN,
              containerPadding: GRID_CONTAINER_PADDING,
              maxRows: Infinity
            }}
            dragConfig={{
              enabled: isEditing,
              handle: '.widget-drag-handle',
              bounded: false,
              threshold: 3
            }}
            resizeConfig={{
              enabled: isEditing,
              handles: ['se']
            }}
            onLayoutChange={handleLayoutChange}
          >
            {dashboard.widgets.map((widget) => (
              <div key={widget.id} className="h-full">
                {renderWidget(widget)}
              </div>
            ))}
          </GridLayout>
        </div>
      )}
    </div>
  )
})

export default DashboardCanvas
