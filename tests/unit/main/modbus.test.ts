import {
  ByteOrder,
  BYTE_ORDER_INFO,
  DEFAULT_BYTE_ORDER,
  DEFAULT_BATCH_READ_CONFIG
} from '@shared/types/modbus'

describe('Modbus Types', () => {
  describe('ByteOrder', () => {
    it('should have info for all byte orders', () => {
      const orders: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']
      orders.forEach((order) => {
        expect(BYTE_ORDER_INFO[order]).toBeDefined()
        expect(BYTE_ORDER_INFO[order].name).toBeTruthy()
        expect(BYTE_ORDER_INFO[order].vendors.length).toBeGreaterThan(0)
      })
    })

    it('should have ABCD as default byte order', () => {
      expect(DEFAULT_BYTE_ORDER).toBe('ABCD')
    })
  })

  describe('BatchReadConfig', () => {
    it('should have sensible batch read defaults', () => {
      expect(DEFAULT_BATCH_READ_CONFIG.enabled).toBe(true)
      expect(DEFAULT_BATCH_READ_CONFIG.maxGap).toBe(10)
      expect(DEFAULT_BATCH_READ_CONFIG.maxRegisters).toBe(125)
    })
  })
})
