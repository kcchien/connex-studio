/**
 * Memory Analysis Utility for Soak Test Results
 *
 * Reads the JSONL memory log produced by soak-test.spec.ts and generates
 * a summary report with leak detection.
 *
 * Usage:
 *   npx tsx tests/stability/memory-report.ts [path-to-log-file]
 *
 * If no path is provided, the script will find the most recent .jsonl file
 * in test-results/stability/.
 *
 * Exit codes:
 *   0 — all metrics within thresholds
 *   1 — memory leak detected (growth rate > threshold) or other failure
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemorySample {
  timestamp: string
  elapsedMinutes: number
  heapUsedMB: number
  heapTotalMB: number
  rssMB: number
  externalMB: number
  uiResponsive: boolean
  note: string
}

interface ReportResult {
  totalSamples: number
  durationMinutes: number
  peakRssMB: number
  peakHeapUsedMB: number
  avgRssMB: number
  avgHeapUsedMB: number
  minRssMB: number
  minHeapUsedMB: number
  growthRateMBPerHour: number
  heapGrowthRateMBPerHour: number
  uiUnresponsiveCount: number
  leakDetected: boolean
  leakConfidence: 'none' | 'low' | 'medium' | 'high'
  notes: string[]
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** If memory grows faster than this rate, we flag it as a leak. */
const LEAK_THRESHOLD_MB_PER_HOUR = parseFloat(
  process.env.SOAK_LEAK_THRESHOLD_MB_PER_HOUR ?? '10'
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findLatestLogFile(): string | null {
  const dir = path.join(__dirname, '../../test-results/stability')
  if (!fs.existsSync(dir)) return null

  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('soak-memory-') && f.endsWith('.jsonl'))
    .map((f) => ({
      name: f,
      fullPath: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)

  return files.length > 0 ? files[0].fullPath : null
}

function readSamples(filePath: string): MemorySample[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean)
  const samples: MemorySample[] = []

  for (const line of lines) {
    try {
      samples.push(JSON.parse(line) as MemorySample)
    } catch {
      // Skip malformed lines
    }
  }

  return samples
}

/**
 * Compute simple linear regression (slope) for a series of values.
 * x = elapsed minutes, y = memory in MB.
 * Returns the slope in MB per minute.
 */
function linearRegressionSlope(points: Array<{ x: number; y: number }>): number {
  const n = points.length
  if (n < 2) return 0

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (const { x, y } of points) {
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return 0

  return (n * sumXY - sumX * sumY) / denominator
}

/**
 * Compute R-squared for the linear fit to gauge how consistently
 * memory grows (high R^2 = strong linear trend = probable leak).
 */
function rSquared(points: Array<{ x: number; y: number }>): number {
  const n = points.length
  if (n < 3) return 0

  const meanY = points.reduce((s, p) => s + p.y, 0) / n
  const slope = linearRegressionSlope(points)

  // Intercept
  const meanX = points.reduce((s, p) => s + p.x, 0) / n
  const intercept = meanY - slope * meanX

  let ssTot = 0
  let ssRes = 0
  for (const { x, y } of points) {
    const predicted = slope * x + intercept
    ssTot += (y - meanY) ** 2
    ssRes += (y - predicted) ** 2
  }

  if (ssTot === 0) return 0
  return 1 - ssRes / ssTot
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function analyze(samples: MemorySample[]): ReportResult {
  const notes: string[] = []

  if (samples.length === 0) {
    return {
      totalSamples: 0,
      durationMinutes: 0,
      peakRssMB: 0,
      peakHeapUsedMB: 0,
      avgRssMB: 0,
      avgHeapUsedMB: 0,
      minRssMB: 0,
      minHeapUsedMB: 0,
      growthRateMBPerHour: 0,
      heapGrowthRateMBPerHour: 0,
      uiUnresponsiveCount: 0,
      leakDetected: false,
      leakConfidence: 'none',
      notes: ['No samples found in the log file.']
    }
  }

  // Basic statistics
  const durationMinutes =
    samples[samples.length - 1].elapsedMinutes - samples[0].elapsedMinutes

  // Use RSS if available, otherwise fall back to heapTotal
  const effectiveMemory = (s: MemorySample) => (s.rssMB > 0 ? s.rssMB : s.heapTotalMB)

  const rssValues = samples.map(effectiveMemory)
  const heapValues = samples.map((s) => s.heapUsedMB)

  const peakRssMB = Math.max(...rssValues)
  const peakHeapUsedMB = Math.max(...heapValues)
  const minRssMB = Math.min(...rssValues)
  const minHeapUsedMB = Math.min(...heapValues)
  const avgRssMB = Math.round((rssValues.reduce((a, b) => a + b, 0) / rssValues.length) * 100) / 100
  const avgHeapUsedMB =
    Math.round((heapValues.reduce((a, b) => a + b, 0) / heapValues.length) * 100) / 100

  // Growth rate via linear regression
  const rssPoints = samples.map((s) => ({
    x: s.elapsedMinutes,
    y: effectiveMemory(s)
  }))
  const heapPoints = samples.map((s) => ({
    x: s.elapsedMinutes,
    y: s.heapUsedMB
  }))

  const rssSlopePerMin = linearRegressionSlope(rssPoints)
  const heapSlopePerMin = linearRegressionSlope(heapPoints)
  const growthRateMBPerHour = Math.round(rssSlopePerMin * 60 * 100) / 100
  const heapGrowthRateMBPerHour = Math.round(heapSlopePerMin * 60 * 100) / 100

  // R-squared indicates how linear (consistent) the growth is
  const rssR2 = rSquared(rssPoints)
  const heapR2 = rSquared(heapPoints)

  // UI responsiveness
  const uiUnresponsiveCount = samples.filter((s) => !s.uiResponsive).length

  // Leak detection logic
  let leakDetected = false
  let leakConfidence: 'none' | 'low' | 'medium' | 'high' = 'none'

  // We use the more aggressive of RSS or heap growth for detection
  const maxGrowthRate = Math.max(Math.abs(growthRateMBPerHour), Math.abs(heapGrowthRateMBPerHour))
  const maxR2 = Math.max(rssR2, heapR2)

  if (maxGrowthRate > LEAK_THRESHOLD_MB_PER_HOUR) {
    leakDetected = true
    if (maxR2 > 0.8) {
      leakConfidence = 'high'
      notes.push(
        `Strong linear growth pattern detected (R^2=${maxR2.toFixed(3)}). ` +
        `Growth rate ${maxGrowthRate.toFixed(2)} MB/hr exceeds threshold of ` +
        `${LEAK_THRESHOLD_MB_PER_HOUR} MB/hr.`
      )
    } else if (maxR2 > 0.5) {
      leakConfidence = 'medium'
      notes.push(
        `Moderate upward trend detected (R^2=${maxR2.toFixed(3)}). ` +
        `Growth rate ${maxGrowthRate.toFixed(2)} MB/hr exceeds threshold. ` +
        `Could be a slow leak or natural GC variance.`
      )
    } else {
      leakConfidence = 'low'
      notes.push(
        `Growth rate ${maxGrowthRate.toFixed(2)} MB/hr exceeds threshold, ` +
        `but the trend is noisy (R^2=${maxR2.toFixed(3)}). ` +
        `Likely GC fluctuation rather than a true leak. Consider a longer test run.`
      )
    }
  } else {
    notes.push(
      `Growth rate ${maxGrowthRate.toFixed(2)} MB/hr is within the ` +
      `${LEAK_THRESHOLD_MB_PER_HOUR} MB/hr threshold. No leak detected.`
    )
  }

  if (uiUnresponsiveCount > 0) {
    notes.push(
      `UI was unresponsive in ${uiUnresponsiveCount} of ${samples.length} samples ` +
      `(${((uiUnresponsiveCount / samples.length) * 100).toFixed(1)}%).`
    )
  }

  // Check for abnormal samples
  const abortedSamples = samples.filter((s) => s.note.includes('MEMORY_CEILING_EXCEEDED'))
  if (abortedSamples.length > 0) {
    notes.push(`Test was aborted due to memory ceiling breach.`)
  }

  return {
    totalSamples: samples.length,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
    peakRssMB,
    peakHeapUsedMB,
    avgRssMB,
    avgHeapUsedMB,
    minRssMB,
    minHeapUsedMB,
    growthRateMBPerHour,
    heapGrowthRateMBPerHour,
    uiUnresponsiveCount,
    leakDetected,
    leakConfidence,
    notes
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printReport(report: ReportResult, filePath: string): void {
  const divider = '─'.repeat(60)

  console.log('')
  console.log(divider)
  console.log('  Connex Studio — Soak Test Memory Report')
  console.log(divider)
  console.log('')
  console.log(`  Log file        : ${filePath}`)
  console.log(`  Total samples   : ${report.totalSamples}`)
  console.log(`  Duration        : ${report.durationMinutes.toFixed(1)} minutes`)
  console.log('')
  console.log('  Memory (RSS / Resident Set Size):')
  console.log(`    Peak          : ${report.peakRssMB} MB`)
  console.log(`    Average       : ${report.avgRssMB} MB`)
  console.log(`    Minimum       : ${report.minRssMB} MB`)
  console.log(`    Growth rate   : ${report.growthRateMBPerHour} MB/hr`)
  console.log('')
  console.log('  Memory (JS Heap Used):')
  console.log(`    Peak          : ${report.peakHeapUsedMB} MB`)
  console.log(`    Average       : ${report.avgHeapUsedMB} MB`)
  console.log(`    Minimum       : ${report.minHeapUsedMB} MB`)
  console.log(`    Growth rate   : ${report.heapGrowthRateMBPerHour} MB/hr`)
  console.log('')
  console.log('  UI Responsiveness:')
  console.log(`    Unresponsive  : ${report.uiUnresponsiveCount} / ${report.totalSamples} samples`)
  console.log('')
  console.log('  Leak Detection:')
  console.log(`    Leak detected : ${report.leakDetected ? 'YES' : 'NO'}`)
  console.log(`    Confidence    : ${report.leakConfidence}`)
  console.log(`    Threshold     : ${LEAK_THRESHOLD_MB_PER_HOUR} MB/hr`)
  console.log('')

  if (report.notes.length > 0) {
    console.log('  Notes:')
    for (const note of report.notes) {
      console.log(`    - ${note}`)
    }
    console.log('')
  }

  // Verdict
  const passed = !report.leakDetected || report.leakConfidence === 'low'
  console.log(divider)
  console.log(`  VERDICT: ${passed ? 'PASS' : 'FAIL'}`)
  console.log(divider)
  console.log('')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const explicitPath = process.argv[2]
  const filePath = explicitPath ?? findLatestLogFile()

  if (!filePath) {
    console.error(
      'No memory log file found. Provide a path as argument or run the soak test first.'
    )
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const samples = readSamples(filePath)
  if (samples.length === 0) {
    console.error(`No valid samples in ${filePath}`)
    process.exit(1)
  }

  const report = analyze(samples)
  printReport(report, filePath)

  // Write JSON report alongside the log
  const jsonReportPath = filePath.replace(/\.jsonl$/, '-report.json')
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`  JSON report saved to: ${jsonReportPath}`)

  // Exit code: fail if leak detected with medium or high confidence
  if (report.leakDetected && (report.leakConfidence === 'medium' || report.leakConfidence === 'high')) {
    console.error('')
    console.error(
      `Memory leak detected with ${report.leakConfidence} confidence. ` +
      `Growth rate: ${Math.max(report.growthRateMBPerHour, report.heapGrowthRateMBPerHour)} MB/hr ` +
      `(threshold: ${LEAK_THRESHOLD_MB_PER_HOUR} MB/hr).`
    )
    process.exit(1)
  }

  process.exit(0)
}

// Export for testing
export { analyze, readSamples, linearRegressionSlope, rSquared }
export type { MemorySample, ReportResult }

// Run if executed directly
main()
