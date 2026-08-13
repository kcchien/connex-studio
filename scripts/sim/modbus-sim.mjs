/**
 * Modbus TCP simulator for manual verification.
 * Usage: node scripts/sim/modbus-sim.mjs [port]   (default 5020)
 *
 * Register map (unit id 1):
 *   Holding 0-9   : counter, sine wave (x100), sawtooth, random walk, constants
 *   Input   0-9   : mirrors holding registers +1000
 *   Coils   0-15  : alternating bits, bit 0 toggles every second
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { ServerTCP } = require('modbus-serial')

const PORT = Number(process.argv[2] ?? 5020)

let tick = 0
const holding = new Array(100).fill(0)
const coils = new Array(100).fill(false)

setInterval(() => {
  tick++
  holding[0] = tick % 65536 // counter
  holding[1] = Math.round((Math.sin(tick / 10) + 1) * 5000) // sine 0-10000
  holding[2] = (tick * 100) % 10000 // sawtooth
  holding[3] = Math.max(0, Math.min(65535, holding[3] + Math.round(Math.random() * 200 - 100))) // random walk
  holding[4] = 1234 // constant
  holding[5] = 42 // constant
  coils[0] = tick % 2 === 0
  for (let i = 1; i < 16; i++) coils[i] = i % 2 === 0
}, 1000)

const vector = {
  getHoldingRegister: (addr) => holding[addr] ?? 0,
  getInputRegister: (addr) => (holding[addr] ?? 0) + 1000,
  getCoil: (addr) => coils[addr] ?? false,
  setRegister: (addr, value) => {
    holding[addr] = value
    console.log(`write holding[${addr}] = ${value}`)
  },
  setCoil: (addr, value) => {
    coils[addr] = value
    console.log(`write coil[${addr}] = ${value}`)
  }
}

const server = new ServerTCP(vector, { host: '0.0.0.0', port: PORT, debug: false, unitID: 1 })
server.on('socketError', (err) => console.error('socket error:', err.message))
console.log(`Modbus TCP simulator listening on 0.0.0.0:${PORT} (unit id 1)`)
