import { CollectionRunner } from '../../../src/main/services/CollectionRunner'

const mockReadOnce = jest.fn()

jest.mock('../../../src/main/services/ConnectionManager', () => ({
  getConnectionManager: () => ({
    readOnce: mockReadOnce
  })
}))

describe('CollectionRunner', () => {
  let runner: CollectionRunner

  beforeEach(() => {
    runner = new CollectionRunner()
    mockReadOnce.mockReset()
  })

  it('executes read request via ConnectionManager.readOnce', async () => {
    mockReadOnce.mockResolvedValue({
      value: 123,
      quality: 'good',
      timestamp: Date.now()
    })

    const collection = await runner.create({
      name: 'Read Test',
      requests: [
        {
          id: 'req-1',
          connectionId: 'conn-1',
          operation: 'read',
          parameters: {
            address: {
              type: 'modbus',
              registerType: 'holding',
              address: 0,
              length: 1
            },
            dataType: 'uint16'
          },
          assertions: [{ type: 'equals', target: 'value', expected: 123 }],
          timeout: 1000
        }
      ]
    })

    const result = await runner.run(collection.id)

    expect(mockReadOnce).toHaveBeenCalledTimes(1)
    expect(mockReadOnce).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        type: 'modbus',
        registerType: 'holding',
        address: 0,
        length: 1
      }),
      'uint16'
    )
    expect(result.status).toBe('success')
    expect(result.summary.passed).toBe(1)
    expect(result.results[0].value).toBe(123)
  })

  it('returns failed result when read parameters are invalid', async () => {
    const collection = await runner.create({
      name: 'Invalid Params',
      requests: [
        {
          id: 'req-invalid',
          connectionId: 'conn-1',
          operation: 'read',
          parameters: {},
          assertions: [],
          timeout: 1000
        }
      ]
    })

    const result = await runner.run(collection.id)

    expect(result.status).toBe('failed')
    expect(result.summary.failed).toBe(1)
    expect(result.results[0].error).toContain('address is required')
  })

  it('returns failed result for write operation until implemented', async () => {
    const collection = await runner.create({
      name: 'Write Not Implemented',
      requests: [
        {
          id: 'req-write',
          connectionId: 'conn-1',
          operation: 'write',
          parameters: {
            address: {
              type: 'modbus',
              registerType: 'holding',
              address: 10,
              length: 1
            },
            value: 42
          },
          assertions: [],
          timeout: 1000
        }
      ]
    })

    const result = await runner.run(collection.id)

    expect(result.status).toBe('failed')
    expect(result.results[0].error).toContain('Write operation is not implemented yet')
  })

  it('fails request when read exceeds timeout', async () => {
    mockReadOnce.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ value: 1, quality: 'good' }), 50))
    )

    const collection = await runner.create({
      name: 'Timeout Test',
      requests: [
        {
          id: 'req-timeout',
          connectionId: 'conn-1',
          operation: 'read',
          parameters: {
            address: {
              type: 'modbus',
              registerType: 'holding',
              address: 0,
              length: 1
            }
          },
          assertions: [],
          timeout: 10
        }
      ]
    })

    const result = await runner.run(collection.id)

    expect(result.status).toBe('failed')
    expect(result.results[0].error).toContain('timed out')
  })
})
