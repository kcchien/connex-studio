import {
  swapBytes,
  reorderRegisters,
  convertFloat32,
  convertInt32,
  convertUint32
} from '@main/protocols/byteOrderUtils'
import type { ByteOrder } from '@shared/types'

describe('byteOrderUtils', () => {
  describe('swapBytes', () => {
    it('should swap high and low bytes', () => {
      expect(swapBytes(0x1234)).toBe(0x3412)
      expect(swapBytes(0x00ff)).toBe(0xff00)
      expect(swapBytes(0xabcd)).toBe(0xcdab)
    })

    it('should mask input to 16-bit', () => {
      // Input > 0xFFFF should be masked
      const result = swapBytes(0x12345678)
      // Only lower 16 bits (0x5678) should be processed
      expect(result).toBe(0x7856)
    })
  })

  describe('convertFloat32', () => {
    // IEEE 754: 123.456 ≈ 0x42F6E979
    const HIGH = 0x42f6
    const LOW = 0xe979

    it('should convert ABCD (big-endian) correctly', () => {
      const result = convertFloat32(HIGH, LOW, 'ABCD')
      expect(result).toBeCloseTo(123.456, 2)
    })

    it('should convert DCBA (little-endian) correctly', () => {
      const result = convertFloat32(LOW, HIGH, 'DCBA')
      expect(result).toBeCloseTo(123.456, 2)
    })

    it('should convert BADC (mid-big) correctly', () => {
      const swappedHigh = 0xf642 // swapBytes(0x42F6)
      const swappedLow = 0x79e9 // swapBytes(0xE979)
      const result = convertFloat32(swappedHigh, swappedLow, 'BADC')
      expect(result).toBeCloseTo(123.456, 2)
    })

    it('should convert CDAB (mid-little) correctly', () => {
      const swappedHigh = 0xf642
      const swappedLow = 0x79e9
      const result = convertFloat32(swappedLow, swappedHigh, 'CDAB')
      expect(result).toBeCloseTo(123.456, 2)
    })
  })

  describe('Edge Cases', () => {
    it('should return NaN for NaN registers', () => {
      // IEEE 754 NaN: 0x7FC00000
      const result = convertFloat32(0x7fc0, 0x0000, 'ABCD')
      expect(result).toBeNaN()
    })

    it('should return Infinity for Infinity registers', () => {
      // IEEE 754 +Infinity: 0x7F800000
      const result = convertFloat32(0x7f80, 0x0000, 'ABCD')
      expect(result).toBe(Infinity)
    })

    it('should return -Infinity for -Infinity registers', () => {
      // IEEE 754 -Infinity: 0xFF800000
      const result = convertFloat32(0xff80, 0x0000, 'ABCD')
      expect(result).toBe(-Infinity)
    })
  })

  describe('convertInt32', () => {
    it('should handle positive values with ABCD', () => {
      const result = convertInt32(0x0000, 0x0064, 'ABCD')
      expect(result).toBe(100)
    })

    it('should handle negative values with ABCD', () => {
      const result = convertInt32(0xffff, 0xffff, 'ABCD')
      expect(result).toBe(-1)
    })

    it('should handle INT32 minimum boundary', () => {
      // 0x80000000 = -2147483648
      const result = convertInt32(0x8000, 0x0000, 'ABCD')
      expect(result).toBe(-2147483648)
    })
  })

  describe('convertUint32', () => {
    it('should handle large unsigned values', () => {
      const result = convertUint32(0xffff, 0xffff, 'ABCD')
      expect(result).toBe(4294967295)
    })
  })
})
