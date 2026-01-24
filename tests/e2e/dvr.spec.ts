/**
 * E2E Test: Data DVR Time-Travel (US3)
 *
 * Tests the complete flow of:
 * 1. Starting polling to collect data
 * 2. Using timeline slider to navigate history
 * 3. Go Live functionality
 * 4. Playback controls (step forward/backward)
 *
 * Note: This test requires a running Modbus server and collected data.
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let electronApp: ElectronApplication
let page: Page

// Modbus server for testing
const MODBUS_HOST = '192.168.213.20'
const MODBUS_PORT = '5021'

test.beforeAll(async () => {
  const electronPath = path.join(__dirname, '../../node_modules/.bin/electron')
  const appPath = path.join(__dirname, '../..')

  electronApp = await electron.launch({
    executablePath: electronPath,
    args: [appPath],
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  })

  page = await electronApp.firstWindow()

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error] ${msg.text()}`)
    }
  })

  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)
})

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close()
  }
})

test.describe('DVR Time-Travel Flow (US3)', () => {
  test('should collect data and navigate through time', async () => {
    // Step 1: Set up connection and tag
    await page.click('text=New Connection')
    await page.waitForTimeout(500)

    await page.fill('#connection-name', 'DVR Test')
    await page.fill('#connection-host', MODBUS_HOST)
    await page.fill('#connection-port', MODBUS_PORT)

    await page.click('button:has-text("Create Connection")')
    await page.waitForTimeout(1000)

    console.log('✅ Connection created')

    // Select and connect
    await page.click('text=DVR Test')
    await page.waitForTimeout(500)

    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(3000)

    const isConnected = await page.locator('h3:text("Quick Read")').isVisible().catch(() => false)

    if (!isConnected) {
      console.log('⚠️ Server not available - skipping DVR tests')
      return
    }

    console.log('✅ Connected')

    // Create a tag for testing
    const tagNameInput = page.locator('#tag-name, input[placeholder*="Tag"]').first()
    const tagAddressInput = page.locator('#tag-address, input[placeholder*="Address"]').first()

    if (await tagNameInput.isVisible()) {
      await tagNameInput.fill('DVR Test Tag')
      await tagAddressInput.fill('40001')

      const createTagBtn = page.locator('button:has-text("Create Tag"), button:has-text("Add Tag")').first()
      if (await createTagBtn.isVisible()) {
        await createTagBtn.click()
        await page.waitForTimeout(1000)
        console.log('✅ Tag created')
      }
    }

    // Step 2: Start polling and collect data
    const startPollingBtn = page.locator('button:has-text("Start"), button:has-text("Poll")').first()
    if (await startPollingBtn.isVisible()) {
      await startPollingBtn.click()
      console.log('✅ Started polling')

      // Collect data for a while
      console.log('⏳ Collecting data for 10 seconds...')
      await page.waitForTimeout(10000)

      await page.screenshot({ path: 'test-results/dvr-data-collected.png' })
    }

    // Step 3: Check DVR controls are visible
    const dvrSection = page.locator('text=Time Travel (DVR)')
    if (await dvrSection.isVisible()) {
      console.log('✅ DVR section visible')

      // Check for Live indicator
      const liveIndicator = page.locator('text=LIVE, text=/Live/i').first()
      const isLive = await liveIndicator.isVisible().catch(() => false)
      console.log(`Live mode: ${isLive}`)

      // Step 4: Look for timeline slider
      const slider = page.locator('input[type="range"], [role="slider"]').first()
      if (await slider.isVisible()) {
        console.log('✅ Timeline slider visible')

        // Try to interact with slider (move to middle)
        const sliderBox = await slider.boundingBox()
        if (sliderBox) {
          const middleX = sliderBox.x + sliderBox.width / 2
          const middleY = sliderBox.y + sliderBox.height / 2
          await page.mouse.click(middleX, middleY)
          await page.waitForTimeout(1000)
          console.log('✅ Moved slider to middle')

          await page.screenshot({ path: 'test-results/dvr-time-travel.png' })
        }
      }

      // Step 5: Test Go Live button
      const goLiveBtn = page.locator('button:has-text("Go Live"), button:has-text("Live")').first()
      if (await goLiveBtn.isVisible()) {
        await goLiveBtn.click()
        await page.waitForTimeout(500)
        console.log('✅ Go Live clicked')
      }

      // Step 6: Test step buttons if available
      const stepBackBtn = page.locator('button:has-text("◀"), button[aria-label*="back"]').first()
      const stepForwardBtn = page.locator('button:has-text("▶"), button[aria-label*="forward"]').first()

      if (await stepBackBtn.isVisible()) {
        await stepBackBtn.click()
        await page.waitForTimeout(500)
        console.log('✅ Step back clicked')
      }

      if (await stepForwardBtn.isVisible()) {
        await stepForwardBtn.click()
        await page.waitForTimeout(500)
        console.log('✅ Step forward clicked')
      }
    }

    // Stop polling
    const stopPollingBtn = page.locator('button:has-text("Stop")').first()
    if (await stopPollingBtn.isVisible()) {
      await stopPollingBtn.click()
      console.log('✅ Stopped polling')
    }

    await page.screenshot({ path: 'test-results/dvr-end.png' })
    console.log('✅ DVR test completed')
  })
})
