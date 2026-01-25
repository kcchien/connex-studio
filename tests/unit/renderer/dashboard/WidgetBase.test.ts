/**
 * WidgetBase Unit Tests
 *
 * Tests for dashboard widget utility functions and helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  getColorForValue,
  formatValue,
  getPrimaryValue,
  toNumericValue,
  WIDGET_TYPE_LABELS,
  WIDGET_MIN_SIZES,
  WIDGET_DEFAULT_SIZES
} from '@renderer/components/dashboard/WidgetBase'
import type { Threshold } from '@shared/types'

describe('getColorForValue', () => {
  const thresholds: Threshold[] = [
    { value: 80, color: 'red', label: 'Critical' },
    { value: 60, color: 'orange', label: 'Warning' },
    { value: 0, color: 'green', label: 'Normal' }
  ]

  it('should return color for value above highest threshold', () => {
    expect(getColorForValue(90, thresholds)).toBe('red')
  })

  it('should return color for value at threshold boundary', () => {
    expect(getColorForValue(80, thresholds)).toBe('red')
    expect(getColorForValue(60, thresholds)).toBe('orange')
    expect(getColorForValue(0, thresholds)).toBe('green')
  })

  it('should return color for value between thresholds', () => {
    expect(getColorForValue(70, thresholds)).toBe('orange')
    expect(getColorForValue(50, thresholds)).toBe('green')
  })

  it('should return default color for value below all thresholds', () => {
    const result = getColorForValue(-10, thresholds, 'blue')
    expect(result).toBe('blue')
  })

  it('should return default color when no thresholds', () => {
    expect(getColorForValue(50, [], 'gray')).toBe('gray')
    expect(getColorForValue(50, undefined as any, 'gray')).toBe('gray')
  })

  it('should handle unsorted thresholds', () => {
    const unsorted: Threshold[] = [
      { value: 0, color: 'green' },
      { value: 80, color: 'red' },
      { value: 60, color: 'orange' }
    ]
    expect(getColorForValue(75, unsorted)).toBe('orange')
    expect(getColorForValue(85, unsorted)).toBe('red')
  })
})

describe('formatValue', () => {
  it('should format number with default decimals', () => {
    expect(formatValue(42.123)).toBe('42.12')
  })

  it('should format number with specified decimals', () => {
    expect(formatValue(42.12345, 3)).toBe('42.123')
    expect(formatValue(42, 0)).toBe('42')
  })

  it('should append unit when provided', () => {
    expect(formatValue(100, 1, '°C')).toBe('100.0 °C')
    expect(formatValue(50, 2, '%')).toBe('50.00 %')
  })

  it('should return dash for null value', () => {
    expect(formatValue(null)).toBe('—')
  })

  it('should return dash for undefined value', () => {
    expect(formatValue(undefined)).toBe('—')
  })

  it('should return dash for NaN value', () => {
    expect(formatValue(NaN)).toBe('—')
  })

  it('should handle zero correctly', () => {
    expect(formatValue(0, 2)).toBe('0.00')
  })

  it('should handle negative numbers', () => {
    expect(formatValue(-25.5, 1)).toBe('-25.5')
  })
})

describe('getPrimaryValue', () => {
  it('should return first non-null value', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', null],
      ['tag2', 42],
      ['tag3', 100]
    ])
    expect(getPrimaryValue(values)).toBe(42)
  })

  it('should return null if all values are null', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', null],
      ['tag2', null]
    ])
    expect(getPrimaryValue(values)).toBeNull()
  })

  it('should return null for empty map', () => {
    const values = new Map<string, number | boolean | string | null>()
    expect(getPrimaryValue(values)).toBeNull()
  })

  it('should handle boolean values', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', true]
    ])
    expect(getPrimaryValue(values)).toBe(true)
  })

  it('should handle string values', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', 'hello']
    ])
    expect(getPrimaryValue(values)).toBe('hello')
  })

  it('should return false as valid value (not null)', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', false]
    ])
    expect(getPrimaryValue(values)).toBe(false)
  })

  it('should return zero as valid value', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', 0]
    ])
    expect(getPrimaryValue(values)).toBe(0)
  })

  it('should return empty string as valid value', () => {
    const values = new Map<string, number | boolean | string | null>([
      ['tag1', '']
    ])
    expect(getPrimaryValue(values)).toBe('')
  })
})

describe('toNumericValue', () => {
  it('should return number as-is', () => {
    expect(toNumericValue(42)).toBe(42)
    expect(toNumericValue(-10)).toBe(-10)
    expect(toNumericValue(3.14)).toBe(3.14)
  })

  it('should convert boolean to number', () => {
    expect(toNumericValue(true)).toBe(1)
    expect(toNumericValue(false)).toBe(0)
  })

  it('should parse numeric string', () => {
    expect(toNumericValue('42')).toBe(42)
    expect(toNumericValue('3.14')).toBe(3.14)
    expect(toNumericValue('-10')).toBe(-10)
  })

  it('should return null for non-numeric string', () => {
    expect(toNumericValue('hello')).toBeNull()
    expect(toNumericValue('abc123')).toBeNull()
  })

  it('should return null for null input', () => {
    expect(toNumericValue(null)).toBeNull()
  })

  it('should handle zero correctly', () => {
    expect(toNumericValue(0)).toBe(0)
    expect(toNumericValue('0')).toBe(0)
  })

  it('should handle whitespace in string', () => {
    expect(toNumericValue(' 42 ')).toBe(42)
  })
})

describe('Widget Type Constants', () => {
  describe('WIDGET_TYPE_LABELS', () => {
    it('should define labels for all widget types', () => {
      expect(WIDGET_TYPE_LABELS.gauge).toBe('Gauge')
      expect(WIDGET_TYPE_LABELS.led).toBe('LED Indicator')
      expect(WIDGET_TYPE_LABELS.numberCard).toBe('Number Card')
      expect(WIDGET_TYPE_LABELS.chart).toBe('Chart')
    })
  })

  describe('WIDGET_MIN_SIZES', () => {
    it('should define minimum sizes for all widget types', () => {
      expect(WIDGET_MIN_SIZES.gauge).toEqual({ minW: 2, minH: 2 })
      expect(WIDGET_MIN_SIZES.led).toEqual({ minW: 1, minH: 1 })
      expect(WIDGET_MIN_SIZES.numberCard).toEqual({ minW: 2, minH: 1 })
      expect(WIDGET_MIN_SIZES.chart).toEqual({ minW: 3, minH: 2 })
    })
  })

  describe('WIDGET_DEFAULT_SIZES', () => {
    it('should define default sizes for all widget types', () => {
      expect(WIDGET_DEFAULT_SIZES.gauge).toEqual({ w: 3, h: 3 })
      expect(WIDGET_DEFAULT_SIZES.led).toEqual({ w: 2, h: 2 })
      expect(WIDGET_DEFAULT_SIZES.numberCard).toEqual({ w: 3, h: 2 })
      expect(WIDGET_DEFAULT_SIZES.chart).toEqual({ w: 6, h: 3 })
    })

    it('should have default sizes >= minimum sizes', () => {
      for (const type of Object.keys(WIDGET_DEFAULT_SIZES) as Array<keyof typeof WIDGET_DEFAULT_SIZES>) {
        const def = WIDGET_DEFAULT_SIZES[type]
        const min = WIDGET_MIN_SIZES[type]
        expect(def.w).toBeGreaterThanOrEqual(min.minW)
        expect(def.h).toBeGreaterThanOrEqual(min.minH)
      }
    })
  })
})
