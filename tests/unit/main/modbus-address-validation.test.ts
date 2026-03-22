import { parseModbusAddress } from '@main/protocols/ModbusTcpAdapter'

describe('parseModbusAddress range validation', () => {
  it('accepts plain address 0 with registerType', () => {
    expect(() => parseModbusAddress('0', 'holding')).not.toThrow()
  })

  it('accepts plain address 65535 with registerType', () => {
    expect(() => parseModbusAddress('65535', 'holding')).not.toThrow()
  })

  it('rejects plain address 65536 with registerType', () => {
    expect(() => parseModbusAddress('65536', 'holding')).toThrow(/out of range/)
  })

  it('rejects IEC format with out-of-range address', () => {
    expect(() => parseModbusAddress('HR65536')).toThrow(/out of range/)
  })
})
