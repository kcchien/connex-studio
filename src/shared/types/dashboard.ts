/**
 * Dashboard type definitions for widget-based visualization.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Core Dashboard Types
// -----------------------------------------------------------------------------

export interface Dashboard {
  id: string
  name: string
  isDefault: boolean
  layout: WidgetLayout[]
  widgets: DashboardWidget[]
  createdAt: number
  updatedAt: number
}

// -----------------------------------------------------------------------------
// Widget Types
// -----------------------------------------------------------------------------

export type WidgetType = 'gauge' | 'led' | 'numberCard' | 'chart'

export interface DashboardWidget {
  id: string
  type: WidgetType
  tagRefs: string[]
  config: WidgetConfig
}

export type WidgetConfig = GaugeConfig | LEDConfig | NumberCardConfig | ChartConfig

// -----------------------------------------------------------------------------
// Layout Types (react-grid-layout compatible)
// -----------------------------------------------------------------------------

export interface WidgetLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

// -----------------------------------------------------------------------------
// Widget Configuration Types
// -----------------------------------------------------------------------------

export interface Threshold {
  value: number
  color: string
  label?: string
}

export type GaugeStyle = 'circular' | 'semi'

export interface GaugeConfig {
  style: GaugeStyle
  min: number
  max: number
  unit?: string
  thresholds: Threshold[]
  showValue: boolean
}

export type LEDShape = 'circle' | 'square'

export interface LEDConfig {
  shape: LEDShape
  onValue: number | boolean
  onColor: string
  offColor: string
  label?: string
}

export type FontSize = 'sm' | 'md' | 'lg' | 'xl'

export interface NumberCardConfig {
  title?: string
  unit?: string
  decimals: number
  fontSize: FontSize
  thresholds: Threshold[]
}

export interface ChartConfig {
  timeRange: number
  showGrid: boolean
  showLegend: boolean
}

// -----------------------------------------------------------------------------
// Dashboard Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateDashboardRequest {
  name: string
  isDefault?: boolean
}

export interface UpdateDashboardRequest {
  id: string
  name?: string
  isDefault?: boolean
}

export interface AddWidgetRequest {
  dashboardId: string
  type: WidgetType
  tagRefs: string[]
  config: WidgetConfig
  layout?: Partial<WidgetLayout>
}

export interface UpdateWidgetRequest {
  dashboardId: string
  widgetId: string
  tagRefs?: string[]
  config?: Partial<WidgetConfig>
}

export interface UpdateLayoutRequest {
  dashboardId: string
  layout: WidgetLayout[]
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_GAUGE_CONFIG: GaugeConfig = {
  style: 'circular',
  min: 0,
  max: 100,
  thresholds: [],
  showValue: true
}

export const DEFAULT_LED_CONFIG: LEDConfig = {
  shape: 'circle',
  onValue: 1,
  onColor: '#22c55e',
  offColor: '#6b7280'
}

export const DEFAULT_NUMBER_CARD_CONFIG: NumberCardConfig = {
  decimals: 2,
  fontSize: 'lg',
  thresholds: []
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  timeRange: 60,
  showGrid: true,
  showLegend: true
}

export const DEFAULT_WIDGET_LAYOUT: Omit<WidgetLayout, 'i'> = {
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  minW: 2,
  minH: 2
}
