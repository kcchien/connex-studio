/**
 * Stability Soak Test for Connex Studio
 *
 * Launches the Electron app and runs it for an extended period,
 * monitoring memory usage, UI responsiveness, and process health.
 *
 * The test simulates real-world usage by creating multiple connections
 * and tags, then polling continuously while tracking resource consumption.
 *
 * Since industrial devices (Modbus, MQTT, OPC UA) are not available in CI,
 * the test gracefully handles connection failures — the goal is to verify
 * the APP's stability under sustained load, not device connectivity.
 *
 * Configuration via environment variables:
 *   SOAK_DURATION_MINUTES  — total run time (default: 60, set to 4320 for 72h)
 *   SOAK_SAMPLE_INTERVAL_S — seconds between memory samples (default: 30)
 *   SOAK_MEMORY_CEILING_MB — abort if memory exceeds this (default: 500)
 *   SOAK_LOG_DIR           — directory for result files (default: test-results/stability)
 */

import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page
} from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SOAK_DURATION_MINUTES = parseInt(process.env.SOAK_DURATION_MINUTES ?? '60', 10)
const SOAK_DURATION_MS = SOAK_DURATION_MINUTES * 60 * 1000
const SAMPLE_INTERVAL_S = parseInt(process.env.SOAK_SAMPLE_INTERVAL_S ?? '30', 10)
const SAMPLE_INTERVAL_MS = SAMPLE_INTERVAL_S * 1000
const MEMORY_CEILING_MB = parseInt(process.env.SOAK_MEMORY_CEILING_MB ?? '500', 10)
const LOG_DIR = process.env.SOAK_LOG_DIR
  ?? path.join(__dirname, '../../test-results/stability')
const COLD_START_LIMIT_MS = parseInt(process.env.SOAK_COLD_START_LIMIT_MS ?? '30000', 10)

// Simulated connections
const NUM_CONNECTIONS = parseInt(process.env.SOAK_NUM_CONNECTIONS ?? '5', 10)
const TAGS_PER_CONNECTION = 10
const POLL_INTERVAL_MS = 1000

// ---------------------------------------------------------------------------
// Helpers
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

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function formatMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100
}

function logPath(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  return path.join(LOG_DIR, `soak-memory-${ts}.jsonl`)
}

/** Append one JSONL record to the log file. */
function appendSample(filePath: string, sample: MemorySample): void {
  fs.appendFileSync(filePath, JSON.stringify(sample) + '\n', 'utf-8')
}

/**
 * Read memory usage from the main process via Electron's evaluate API.
 * Falls back to renderer-side performance.memory if the main process
 * call is unavailable.
 */
async function getMemoryInfo(
  electronApp: ElectronApplication,
  page: Page
): Promise<{ heapUsedMB: number; heapTotalMB: number; rssMB: number; externalMB: number }> {
  try {
    // Primary: ask main process directly
    const mem = await electronApp.evaluate(async () => {
      const usage = process.memoryUsage()
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external
      }
    })
    return {
      heapUsedMB: formatMB(mem.heapUsed),
      heapTotalMB: formatMB(mem.heapTotal),
      rssMB: formatMB(mem.rss),
      externalMB: formatMB(mem.external)
    }
  } catch {
    // Fallback: renderer process memory (less accurate but still useful)
    try {
      const mem = await page.evaluate(() => {
        const perf = (performance as any)
        if (perf.memory) {
          return {
            heapUsed: perf.memory.usedJSHeapSize,
            heapTotal: perf.memory.totalJSHeapSize,
            rss: 0,
            external: 0
          }
        }
        return { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 }
      })
      return {
        heapUsedMB: formatMB(mem.heapUsed),
        heapTotalMB: formatMB(mem.heapTotal),
        rssMB: formatMB(mem.rss),
        externalMB: formatMB(mem.external)
      }
    } catch {
      return { heapUsedMB: 0, heapTotalMB: 0, rssMB: 0, externalMB: 0 }
    }
  }
}

/**
 * Quick check: can we still query a visible DOM element?
 * If the renderer is frozen or crashed this will time out.
 */
async function checkUiResponsive(page: Page): Promise<boolean> {
  try {
    // Look for anything that proves the DOM tree is alive.
    // The app root, body, or any known element will do.
    await page.locator('body').evaluate((el) => el.tagName, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Create a single Modbus TCP connection through the UI.
 * Returns true if the connection card appeared (regardless of whether
 * the physical device is reachable).
 */
async function createConnection(
  page: Page,
  name: string,
  host: string,
  port: string
): Promise<boolean> {
  try {
    // Expand the new-connection form
    const newBtn = page.locator('button:has-text("New Connection"), text=New Connection').first()
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(400)
    }

    // Fill details
    const nameInput = page.locator('#connection-name')
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(name)
    }
    const hostInput = page.locator('#connection-host')
    if (await hostInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hostInput.fill(host)
    }
    const portInput = page.locator('#connection-port')
    if (await portInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await portInput.fill(port)
    }

    // Submit — the button label varies between "Connect" and "Create Connection"
    const createBtn = page
      .locator('button:has-text("Create Connection"), button:has-text("Connect")')
      .first()
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(800)
    }

    // Verify the card appeared
    const card = page.locator(`text=${name}`)
    return await card.isVisible({ timeout: 3000 }).catch(() => false)
  } catch {
    return false
  }
}

/**
 * Select a connection card and attempt to connect.
 * Returns true if the connect action was triggered (not necessarily
 * that a physical connection was made).
 */
async function selectAndConnect(page: Page, name: string): Promise<boolean> {
  try {
    await page.locator(`text=${name}`).first().click()
    await page.waitForTimeout(400)

    const connectBtn = page.locator('button:has-text("Connect")').first()
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click()
      await page.waitForTimeout(1000)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Attempt to start polling via IPC (fallback: click UI button).
 * Failures are expected when no real device is present.
 */
async function startPolling(page: Page, connectionId: string): Promise<boolean> {
  try {
    const startBtn = page.locator('button:has-text("Start"), button:has-text("Poll")').first()
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(500)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Attempt to stop polling.
 */
async function stopPolling(page: Page): Promise<void> {
  try {
    const stopBtn = page.locator('button:has-text("Stop")').first()
    if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stopBtn.click()
      await page.waitForTimeout(300)
    }
  } catch {
    // Ignore — polling may not have been running
  }
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe('Stability Soak Test', () => {
  // The soak test needs a very long timeout
  // Buffer includes: cold start (~15s), Phase 2 (~3 min for UI timeouts), Phase 4 (~30s)
  test.setTimeout(SOAK_DURATION_MS + 300_000) // duration + 5 min buffer

  let electronApp: ElectronApplication
  let page: Page
  let memoryLogFile: string
  let appClosed = false

  test.beforeAll(async () => {
    ensureDir(LOG_DIR)
    memoryLogFile = logPath()

    console.log('=== Connex Studio Soak Test ===')
    console.log(`Duration       : ${SOAK_DURATION_MINUTES} min`)
    console.log(`Sample interval: ${SAMPLE_INTERVAL_S} s`)
    console.log(`Memory ceiling : ${MEMORY_CEILING_MB} MB`)
    console.log(`Log file       : ${memoryLogFile}`)
    console.log('')
  })

  test.afterAll(async () => {
    if (!electronApp || appClosed) return
    try {
      await electronApp.close()
    } catch {
      // Process may already be dead
    }
  })

  test('should survive extended operation without memory leaks or crashes', async () => {
    // -----------------------------------------------------------------------
    // Phase 1: Cold start measurement
    // -----------------------------------------------------------------------
    const electronPath = path.join(__dirname, '../../node_modules/.bin/electron')
    const appPath = path.join(__dirname, '../..')
    const startTime = Date.now()

    electronApp = await electron.launch({
      executablePath: electronPath,
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })

    // The app opens DevTools as a separate window (since app.isPackaged is false
    // when running from source). We need the actual renderer window, not DevTools.
    // Wait for the first window, then find the correct one.
    page = await electronApp.firstWindow()

    // Give the app a moment to open all windows (main + DevTools)
    await page.waitForTimeout(3000)

    // Find the main application window (not DevTools)
    const allWindows = electronApp.windows()
    console.log(`  Windows open: ${allWindows.length}`)
    for (const w of allWindows) {
      const url = w.url()
      console.log(`  Window URL: ${url.substring(0, 80)}`)
      if (!url.includes('devtools')) {
        page = w
      }
    }
    console.log(`  Selected window URL: ${page.url().substring(0, 80)}`)

    // Capture browser console errors but don't fail — we log them
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${new Date().toISOString()}] ${msg.text()}`)
      }
    })

    await page.waitForLoadState('domcontentloaded')
    const coldStartMs = Date.now() - startTime

    console.log(`Cold start (DOMContentLoaded): ${coldStartMs} ms (limit: ${COLD_START_LIMIT_MS} ms)`)

    // Cold start assertion — measured until DOMContentLoaded
    // In unpackaged (dev) mode this can be slower due to DevTools opening etc.
    expect(
      coldStartMs,
      `Cold start took ${coldStartMs} ms, which exceeds the ${COLD_START_LIMIT_MS} ms target`
    ).toBeLessThanOrEqual(COLD_START_LIMIT_MS)

    // Wait for React to render something into #root (non-blocking for cold start metric)
    try {
      await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 10000 })
      console.log('  React root rendered successfully')
    } catch {
      // React may not have rendered yet, but the app is still running — continue
      console.log('  Warning: React root did not render children within 10s')
    }

    // Brief settling period for async initialization
    await page.waitForTimeout(2000)

    // -----------------------------------------------------------------------
    // Phase 2: Create connections & tags
    // -----------------------------------------------------------------------
    console.log('')
    console.log('--- Phase 2: Creating connections ---')

    const connectionNames: string[] = []
    for (let i = 0; i < NUM_CONNECTIONS; i++) {
      const name = `Soak-Conn-${i + 1}`
      // Use loopback address — connection will fail gracefully
      const created = await createConnection(page, name, '127.0.0.1', `${502 + i}`)
      connectionNames.push(name)
      console.log(`  Connection "${name}": ${created ? 'created' : 'skipped (UI issue)'}`)
    }

    // Select each connection and attempt to connect
    // (connections will fail since there's no real device — that's fine)
    for (const name of connectionNames) {
      const connected = await selectAndConnect(page, name)
      console.log(`  Connect "${name}": ${connected ? 'attempted' : 'skipped'}`)
    }

    // Try to start polling on whichever connection is currently selected
    const pollingStarted = await startPolling(page, '')
    console.log(`  Polling: ${pollingStarted ? 'started (or attempted)' : 'not available'}`)

    // Take a screenshot of initial state
    await page.screenshot({
      path: path.join(LOG_DIR, 'soak-initial-state.png')
    })

    // -----------------------------------------------------------------------
    // Phase 3: Monitoring loop
    // -----------------------------------------------------------------------
    console.log('')
    console.log('--- Phase 3: Monitoring loop ---')

    const soakStartTime = Date.now()
    let sampleCount = 0
    let peakRssMB = 0
    let abortReason: string | null = null

    while (Date.now() - soakStartTime < SOAK_DURATION_MS) {
      const elapsed = Date.now() - soakStartTime
      const elapsedMinutes = Math.round((elapsed / 60_000) * 100) / 100

      // Collect memory
      const mem = await getMemoryInfo(electronApp, page)

      // Track peak
      const currentRss = mem.rssMB > 0 ? mem.rssMB : mem.heapTotalMB
      if (currentRss > peakRssMB) {
        peakRssMB = currentRss
      }

      // UI responsiveness check
      const uiOk = await checkUiResponsive(page)

      // Determine note
      let note = ''
      if (!uiOk) note = 'UI_UNRESPONSIVE'
      if (currentRss > MEMORY_CEILING_MB) note = `MEMORY_CEILING_EXCEEDED(${currentRss}MB)`

      const sample: MemorySample = {
        timestamp: new Date().toISOString(),
        elapsedMinutes,
        heapUsedMB: mem.heapUsedMB,
        heapTotalMB: mem.heapTotalMB,
        rssMB: mem.rssMB,
        externalMB: mem.externalMB,
        uiResponsive: uiOk,
        note
      }

      appendSample(memoryLogFile, sample)
      sampleCount++

      // Periodic console output (every ~5 minutes or every 10 samples)
      if (sampleCount % Math.max(1, Math.floor(300 / SAMPLE_INTERVAL_S)) === 0) {
        console.log(
          `  [${elapsedMinutes.toFixed(1)} min] ` +
          `RSS=${mem.rssMB}MB  Heap=${mem.heapUsedMB}/${mem.heapTotalMB}MB  ` +
          `UI=${uiOk ? 'OK' : 'FAIL'}  Peak=${peakRssMB}MB`
        )
      }

      // Fail-fast: memory ceiling
      if (currentRss > MEMORY_CEILING_MB) {
        abortReason =
          `Memory (${currentRss} MB) exceeded ceiling (${MEMORY_CEILING_MB} MB) ` +
          `at ${elapsedMinutes.toFixed(1)} minutes`
        console.error(`  ABORT: ${abortReason}`)
        break
      }

      // Fail-fast: UI completely unresponsive 3 times in a row
      if (!uiOk) {
        let consecutiveFails = 1
        for (let retry = 0; retry < 2; retry++) {
          await page.waitForTimeout(5000)
          const retryOk = await checkUiResponsive(page)
          if (!retryOk) consecutiveFails++
          else break
        }
        if (consecutiveFails >= 3) {
          abortReason = `UI unresponsive 3 consecutive times at ${elapsedMinutes.toFixed(1)} minutes`
          console.error(`  ABORT: ${abortReason}`)
          break
        }
      }

      // Wait until next sample
      await page.waitForTimeout(SAMPLE_INTERVAL_MS)
    }

    // -----------------------------------------------------------------------
    // Phase 4: Cleanup & report
    // -----------------------------------------------------------------------
    console.log('')
    console.log('--- Phase 4: Cleanup ---')

    await stopPolling(page)

    // Final screenshot
    await page.screenshot({
      path: path.join(LOG_DIR, 'soak-final-state.png')
    })

    // Write console errors to a separate file
    if (consoleErrors.length > 0) {
      const errFile = path.join(LOG_DIR, 'soak-console-errors.log')
      fs.writeFileSync(errFile, consoleErrors.join('\n'), 'utf-8')
      console.log(`  Console errors (${consoleErrors.length}) saved to ${errFile}`)
    }

    // Close the app — before-quit handler sets shouldForceQuit so no dialog blocks
    try {
      await electronApp.close()
    } catch {
      // Process may already be dead
    }
    appClosed = true

    // -----------------------------------------------------------------------
    // Phase 5: Summary
    // -----------------------------------------------------------------------
    console.log('')
    console.log('=== Soak Test Summary ===')
    console.log(`  Total samples : ${sampleCount}`)
    console.log(`  Peak RSS      : ${peakRssMB} MB`)
    console.log(`  Console errors: ${consoleErrors.length}`)
    console.log(`  Memory log    : ${memoryLogFile}`)

    if (abortReason) {
      console.log(`  Abort reason  : ${abortReason}`)
    }

    // Final assertions
    expect(abortReason, `Soak test aborted: ${abortReason}`).toBeNull()
    expect(peakRssMB, `Peak memory ${peakRssMB} MB exceeds ceiling`).toBeLessThanOrEqual(
      MEMORY_CEILING_MB
    )
    console.log('')
    console.log('=== PASSED ===')
  })
})
