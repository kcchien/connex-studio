const ModbusRTU = require('modbus-serial')

const client = new ModbusRTU()

async function test() {
  try {
    console.log('=== Modbus TCP Test ===')
    console.log('Target: 127.0.0.1:5021')
    console.log('Address: 40001 (Holding Register 0)')
    console.log('')
    
    await client.connectTCP('127.0.0.1', { port: 5021 })
    client.setID(1)
    client.setTimeout(5000)
    console.log('Connected!\n')
    
    // Read multiple times
    for (let i = 1; i <= 5; i++) {
      const response = await client.readHoldingRegisters(0, 2)
      const reg0 = response.data[0]
      const reg1 = response.data[1]
      
      function toFloat32(high, low) {
        const buffer = new ArrayBuffer(4)
        const view = new DataView(buffer)
        view.setUint16(0, high, false)
        view.setUint16(2, low, false)
        return view.getFloat32(0, false)
      }
      
      const swapBytes = (w) => ((w & 0xff) << 8) | ((w >> 8) & 0xff)
      
      const abcd = toFloat32(reg0, reg1)
      const dcba = toFloat32(reg1, reg0)
      const badc = toFloat32(swapBytes(reg0), swapBytes(reg1))
      const cdab = toFloat32(swapBytes(reg1), swapBytes(reg0))
      
      console.log(`Read #${i}: [0x${reg0.toString(16).padStart(4,'0')}, 0x${reg1.toString(16).padStart(4,'0')}]`)
      console.log(`  ABCD: ${abcd.toFixed(2)} | DCBA: ${dcba.toFixed(2)} | BADC: ${badc.toFixed(2)} | CDAB: ${cdab.toFixed(2)}`)
      console.log('')
      
      await new Promise(r => setTimeout(r, 1000))
    }
    
    client.close(() => console.log('Connection closed'))
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

test()
