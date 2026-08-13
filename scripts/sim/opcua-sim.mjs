/**
 * OPC UA server simulator for manual verification.
 * Usage: node scripts/sim/opcua-sim.mjs [port]   (default 4840)
 * Endpoint: opc.tcp://localhost:4840/UA/ConnexSim
 *
 * Address space (under Objects/ConnexSim):
 *   Temperature (Double, sine 20-30)
 *   Pressure    (Double, random walk around 1000)
 *   Counter     (UInt32, +1/s)
 *   Status      (Boolean, toggles every 5s)
 *   SetPoint    (Double, writable)
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { OPCUAServer, Variant, DataType, StatusCodes } = require('node-opcua')

const PORT = Number(process.argv[2] ?? 4840)

const server = new OPCUAServer({
  port: PORT,
  resourcePath: '/UA/ConnexSim',
  buildInfo: { productName: 'ConnexSim', buildNumber: '1', buildDate: new Date() }
})

await server.initialize()

const addressSpace = server.engine.addressSpace
const namespace = addressSpace.getOwnNamespace()
const device = namespace.addObject({
  organizedBy: addressSpace.rootFolder.objects,
  browseName: 'ConnexSim'
})

let tick = 0
let pressure = 1000
let setPoint = 50

setInterval(() => {
  tick++
  pressure += Math.random() * 4 - 2
}, 1000)

namespace.addVariable({
  componentOf: device,
  browseName: 'Temperature',
  nodeId: 's=Temperature',
  dataType: 'Double',
  minimumSamplingInterval: 500,
  value: { get: () => new Variant({ dataType: DataType.Double, value: 25 + 5 * Math.sin(tick / 10) }) }
})
namespace.addVariable({
  componentOf: device,
  browseName: 'Pressure',
  nodeId: 's=Pressure',
  dataType: 'Double',
  minimumSamplingInterval: 500,
  value: { get: () => new Variant({ dataType: DataType.Double, value: pressure }) }
})
namespace.addVariable({
  componentOf: device,
  browseName: 'Counter',
  nodeId: 's=Counter',
  dataType: 'UInt32',
  minimumSamplingInterval: 500,
  value: { get: () => new Variant({ dataType: DataType.UInt32, value: tick }) }
})
namespace.addVariable({
  componentOf: device,
  browseName: 'Status',
  nodeId: 's=Status',
  dataType: 'Boolean',
  minimumSamplingInterval: 500,
  value: { get: () => new Variant({ dataType: DataType.Boolean, value: Math.floor(tick / 5) % 2 === 0 }) }
})
namespace.addVariable({
  componentOf: device,
  browseName: 'SetPoint',
  nodeId: 's=SetPoint',
  dataType: 'Double',
  minimumSamplingInterval: 500,
  value: {
    get: () => new Variant({ dataType: DataType.Double, value: setPoint }),
    set: (variant) => {
      setPoint = Number(variant.value)
      console.log(`write SetPoint = ${setPoint}`)
      return StatusCodes.Good
    }
  }
})

await server.start()
console.log(`OPC UA simulator: opc.tcp://localhost:${PORT}/UA/ConnexSim`)
console.log('Security: None (anonymous) enabled by default for testing')
