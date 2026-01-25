/**
 * Dashboard Components Index
 *
 * Re-exports all dashboard components for convenient importing.
 */

export { DashboardCanvas } from './DashboardCanvas'
export { WidgetPalette } from './WidgetPalette'
export { WidgetConfig } from './WidgetConfig'
export {
  WidgetContainer,
  getColorForValue,
  formatValue,
  getPrimaryValue,
  toNumericValue,
  WIDGET_TYPE_LABELS,
  WIDGET_TYPE_ICONS,
  WIDGET_MIN_SIZES,
  WIDGET_DEFAULT_SIZES
} from './WidgetBase'
export type { WidgetBaseProps, WidgetContainerProps } from './WidgetBase'
export * from './widgets'
