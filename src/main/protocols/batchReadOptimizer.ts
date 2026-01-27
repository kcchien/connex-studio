/**
 * Batch Read Optimizer for Modbus TCP.
 *
 * Merges adjacent Modbus register reads into single requests to reduce
 * network round-trips. Respects Modbus protocol limits (125 registers max).
 *
 * Rules:
 * - Only merge tags with same registerType and unitId
 * - Merge if address gap <= maxGap (default: 10)
 * - Split if total registers > maxRegisters (default: 125, Modbus limit)
 * - Preserve tag-to-result mapping for value extraction
 */

import type { Tag, ModbusAddress, BatchReadConfig } from '@shared/types'
import { DEFAULT_BATCH_READ_CONFIG } from '@shared/types'

/**
 * A batch of registers to read in a single request.
 */
export interface ReadBatch {
  /** The register type for this batch */
  registerType: ModbusAddress['registerType']
  /** The unit ID for this batch (undefined = use connection default) */
  unitId: number | undefined
  /** Starting address of the batch */
  startAddress: number
  /** Number of registers to read */
  length: number
  /** Tags included in this batch with their offset from startAddress */
  tags: Array<{
    tag: Tag
    offset: number // Offset from startAddress
    length: number // Number of registers for this tag
  }>
}

/**
 * Tag with parsed Modbus address for optimization.
 */
interface ParsedTag {
  tag: Tag
  address: ModbusAddress
  effectiveUnitId: number | undefined
}

/**
 * Create optimized read batches from a list of tags.
 *
 * @param tags The tags to batch
 * @param config Batch read configuration
 * @param defaultUnitId The connection's default unit ID
 * @returns Array of read batches
 */
export function createReadBatches(
  tags: Tag[],
  config: BatchReadConfig = DEFAULT_BATCH_READ_CONFIG,
  defaultUnitId: number = 1
): ReadBatch[] {
  if (!config.enabled) {
    // No optimization - each tag is its own batch
    return tags
      .filter((tag) => tag.enabled && tag.address.type === 'modbus')
      .map((tag) => {
        const address = tag.address as ModbusAddress
        return {
          registerType: address.registerType,
          unitId: address.unitId,
          startAddress: address.address,
          length: address.length,
          tags: [{ tag, offset: 0, length: address.length }]
        }
      })
  }

  // Parse and filter enabled Modbus tags
  const parsedTags: ParsedTag[] = tags
    .filter((tag) => tag.enabled && tag.address.type === 'modbus')
    .map((tag) => ({
      tag,
      address: tag.address as ModbusAddress,
      effectiveUnitId: (tag.address as ModbusAddress).unitId
    }))

  if (parsedTags.length === 0) {
    return []
  }

  // Group by registerType and unitId
  const groups = groupTags(parsedTags)

  // Create batches for each group
  const batches: ReadBatch[] = []

  for (const group of groups.values()) {
    const groupBatches = createBatchesForGroup(group, config)
    batches.push(...groupBatches)
  }

  return batches
}

/**
 * Group tags by registerType and unitId.
 */
function groupTags(tags: ParsedTag[]): Map<string, ParsedTag[]> {
  const groups = new Map<string, ParsedTag[]>()

  for (const parsed of tags) {
    const key = `${parsed.address.registerType}:${parsed.effectiveUnitId ?? 'default'}`
    const group = groups.get(key) || []
    group.push(parsed)
    groups.set(key, group)
  }

  return groups
}

/**
 * Create batches for a group of tags with the same registerType and unitId.
 */
function createBatchesForGroup(
  tags: ParsedTag[],
  config: BatchReadConfig
): ReadBatch[] {
  // Sort by address
  const sorted = [...tags].sort((a, b) => a.address.address - b.address.address)

  const batches: ReadBatch[] = []
  let currentBatch: ReadBatch | null = null

  for (const parsed of sorted) {
    const { address, effectiveUnitId, tag } = parsed

    if (!currentBatch) {
      // Start new batch
      currentBatch = {
        registerType: address.registerType,
        unitId: effectiveUnitId,
        startAddress: address.address,
        length: address.length,
        tags: [{ tag, offset: 0, length: address.length }]
      }
      continue
    }

    // Calculate gap between current batch end and new tag start
    const batchEnd = currentBatch.startAddress + currentBatch.length
    const gap = address.address - batchEnd

    // Calculate new length if we were to merge
    const newLength = address.address - currentBatch.startAddress + address.length

    // Can we merge?
    const canMerge =
      gap <= config.maxGap && // Gap is within limit
      newLength <= config.maxRegisters // Total length within limit

    if (canMerge) {
      // Merge into current batch
      const offset = address.address - currentBatch.startAddress
      currentBatch.tags.push({ tag, offset, length: address.length })
      currentBatch.length = newLength
    } else {
      // Finalize current batch and start new one
      batches.push(currentBatch)
      currentBatch = {
        registerType: address.registerType,
        unitId: effectiveUnitId,
        startAddress: address.address,
        length: address.length,
        tags: [{ tag, offset: 0, length: address.length }]
      }
    }
  }

  // Don't forget the last batch
  if (currentBatch) {
    batches.push(currentBatch)
  }

  return batches
}

/**
 * Extract individual tag values from a batch read result.
 *
 * @param batch The batch that was read
 * @param rawData The raw register data from the Modbus read
 * @returns Map of tagId to register values
 */
export function extractTagValues(
  batch: ReadBatch,
  rawData: number[] | boolean[]
): Map<string, number[] | boolean[]> {
  const result = new Map<string, number[] | boolean[]>()

  for (const { tag, offset, length } of batch.tags) {
    const values = rawData.slice(offset, offset + length)
    result.set(tag.id, values)
  }

  return result
}
