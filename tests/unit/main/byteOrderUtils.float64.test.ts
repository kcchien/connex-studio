import { decodeFloat64, encodeFloat64, reorderRegisters64 } from '@main/protocols/byteOrderUtils'

describe('float64 byte order utilities', () => {
  // IEEE 754: 1.0 = 0x3FF0000000000000
  // As 4 registers (ABCD): [0x3FF0, 0x0000, 0x0000, 0x0000]

  describe('reorderRegisters64', () => {
    it('ABCD returns registers unchanged', () => {
      expect(reorderRegisters64(0x3FF0, 0x0000, 0x0000, 0x0000, 'ABCD'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('DCBA reverses register order', () => {
      expect(reorderRegisters64(0x0000, 0x0000, 0x0000, 0x3FF0, 'DCBA'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('BADC swaps bytes within each word', () => {
      expect(reorderRegisters64(0xF03F, 0x0000, 0x0000, 0x0000, 'BADC'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('CDAB swaps bytes and reverses words', () => {
      expect(reorderRegisters64(0x0000, 0x0000, 0x0000, 0xF03F, 'CDAB'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })
  })

  describe('decodeFloat64', () => {
    it('decodes 1.0 with ABCD byte order', () => {
      expect(decodeFloat64([0x3FF0, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(1.0)
    })

    it('decodes -1.0 with ABCD byte order', () => {
      expect(decodeFloat64([0xBFF0, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(-1.0)
    })

    it('decodes 0.0', () => {
      expect(decodeFloat64([0x0000, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(0.0)
    })

    it('decodes NaN', () => {
      expect(decodeFloat64([0x7FF8, 0x0000, 0x0000, 0x0000], 'ABCD')).toBeNaN()
    })

    it('decodes Infinity', () => {
      expect(decodeFloat64([0x7FF0, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(Infinity)
    })
  })

  describe('encodeFloat64', () => {
    it('encodes 1.0 with ABCD byte order', () => {
      expect(encodeFloat64(1.0, 'ABCD')).toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('round-trips through decode/encode for all byte orders', () => {
      const value = 3.14159265358979
      for (const order of ['ABCD', 'DCBA', 'BADC', 'CDAB'] as const) {
        const encoded = encodeFloat64(value, order)
        const decoded = decodeFloat64(encoded, order)
        expect(decoded).toBeCloseTo(value, 10)
      }
    })
  })
})
