const ModbusRTU = require('modbus-serial')

const client = new ModbusRTU()

async function test() {
  try {
    console.log('=== Modbus TCP 位元組順序證明測試 ===')
    console.log('目標: 127.0.0.1:5021')
    console.log('地址: 40001 (Holding Register 0)')
    console.log('取樣次數: 10 次')
    console.log('')
    
    await client.connectTCP('127.0.0.1', { port: 5021 })
    client.setID(1)
    client.setTimeout(5000)
    console.log('已連線!\n')
    
    function toFloat32(high, low) {
      const buffer = new ArrayBuffer(4)
      const view = new DataView(buffer)
      view.setUint16(0, high, false)
      view.setUint16(2, low, false)
      return view.getFloat32(0, false)
    }
    
    const samples = []
    
    // 收集 10 個樣本
    for (let i = 1; i <= 10; i++) {
      const response = await client.readHoldingRegisters(0, 2)
      const reg0 = response.data[0]
      const reg1 = response.data[1]
      
      const abcd = toFloat32(reg0, reg1)  // High=reg0, Low=reg1
      const dcba = toFloat32(reg1, reg0)  // High=reg1, Low=reg0
      
      samples.push({ reg0, reg1, abcd, dcba })
      
      console.log(`樣本 #${i.toString().padStart(2)}: reg0=0x${reg0.toString(16).padStart(4,'0')} reg1=0x${reg1.toString(16).padStart(4,'0')} | ABCD=${abcd.toFixed(2)} | DCBA=${dcba.toFixed(2)}`)
      
      await new Promise(r => setTimeout(r, 500))
    }
    
    console.log('\n=== 統計分析 ===\n')
    
    // 分析 reg0 和 reg1 的變化
    const reg0Values = [...new Set(samples.map(s => s.reg0))]
    const reg1Values = [...new Set(samples.map(s => s.reg1))]
    
    console.log(`Register 0 不同值數量: ${reg0Values.length}`)
    console.log(`Register 0 數值: ${reg0Values.map(v => '0x' + v.toString(16).padStart(4,'0')).join(', ')}`)
    console.log('')
    console.log(`Register 1 不同值數量: ${reg1Values.length}`)
    console.log(`Register 1 數值: ${reg1Values.map(v => '0x' + v.toString(16).padStart(4,'0')).join(', ')}`)
    
    console.log('\n=== ABCD 解析結果 ===')
    const abcdValues = samples.map(s => s.abcd)
    const abcdMin = Math.min(...abcdValues)
    const abcdMax = Math.max(...abcdValues)
    const abcdAvg = abcdValues.reduce((a,b) => a+b, 0) / abcdValues.length
    const abcdVariance = abcdValues.reduce((sum, v) => sum + Math.pow(v - abcdAvg, 2), 0) / abcdValues.length
    console.log(`最小值: ${abcdMin.toFixed(4)}`)
    console.log(`最大值: ${abcdMax.toFixed(4)}`)
    console.log(`平均值: ${abcdAvg.toFixed(4)}`)
    console.log(`變異數: ${abcdVariance.toFixed(6)}`)
    console.log(`範圍: ${(abcdMax - abcdMin).toFixed(4)}`)
    
    console.log('\n=== DCBA 解析結果 ===')
    const dcbaValues = samples.map(s => s.dcba)
    const dcbaMin = Math.min(...dcbaValues)
    const dcbaMax = Math.max(...dcbaValues)
    const dcbaAvg = dcbaValues.reduce((a,b) => a+b, 0) / dcbaValues.length
    const dcbaVariance = dcbaValues.reduce((sum, v) => sum + Math.pow(v - dcbaAvg, 2), 0) / dcbaValues.length
    console.log(`最小值: ${dcbaMin.toFixed(4)}`)
    console.log(`最大值: ${dcbaMax.toFixed(4)}`)
    console.log(`平均值: ${dcbaAvg.toFixed(4)}`)
    console.log(`變異數: ${dcbaVariance.toFixed(6)}`)
    console.log(`範圍: ${(dcbaMax - dcbaMin).toFixed(4)}`)
    
    console.log('\n=== 證明推論 ===\n')
    
    // 分析哪個暫存器在變化
    if (reg0Values.length === 1 && reg1Values.length > 1) {
      console.log('觀察: Register 0 固定不變，Register 1 持續變化')
      console.log('')
      console.log('IEEE 754 Float32 結構:')
      console.log('  [高位元組 (High Word)] [低位元組 (Low Word)]')
      console.log('  - 高位元組包含: 符號位 + 指數 + 尾數高位')
      console.log('  - 低位元組包含: 尾數低位')
      console.log('')
      console.log('如果 ABCD (High=reg0, Low=reg1):')
      console.log('  → 變化的 reg1 在低位，對數值影響較小')
      console.log(`  → 結果: 數值穩定在 ${abcdAvg.toFixed(2)} 附近，範圍僅 ${(abcdMax - abcdMin).toFixed(4)}`)
      console.log('')
      console.log('如果 DCBA (High=reg1, Low=reg0):')
      console.log('  → 變化的 reg1 在高位，對數值影響較大')
      console.log(`  → 結果: 數值波動在 ${dcbaMin.toFixed(2)} ~ ${dcbaMax.toFixed(2)}，範圍 ${(dcbaMax - dcbaMin).toFixed(2)}`)
    } else if (reg1Values.length === 1 && reg0Values.length > 1) {
      console.log('觀察: Register 1 固定不變，Register 0 持續變化')
    } else {
      console.log('觀察: 兩個暫存器都在變化或都固定')
    }
    
    client.close(() => console.log('\n連線已關閉'))
  } catch (err) {
    console.error('錯誤:', err.message)
    process.exit(1)
  }
}

test()
