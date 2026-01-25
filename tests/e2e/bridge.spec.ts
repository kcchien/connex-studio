/**
 * E2E Test: Bridge Data Forwarding (T175)
 *
 * Tests the complete flow of:
 * 1. Creating a bridge between Modbus and MQTT connections
 * 2. Configuring source tags and target topic templates
 * 3. Starting/stopping/pausing bridge forwarding
 * 4. Verifying data is forwarded correctly
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let electronApp: ElectronApplication
let page: Page

// Test configuration (adjust for your environment)
const MODBUS_HOST = '192.168.213.20'
const MODBUS_PORT = '5021'
const MQTT_BROKER = 'mqtt://localhost:1883'

test.describe('Bridge Data Forwarding', () => {
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
    await page.waitForTimeout(2000)
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test.skip('should create a new bridge', async () => {
    // This test requires both Modbus and MQTT connections to be available
    // Skip by default - enable when test environment is set up

    // Navigate to Bridges section
    await page.getByRole('button', { name: /bridges/i }).click()
    await page.waitForTimeout(500)

    // Click "Create Bridge" button
    await page.getByRole('button', { name: /create bridge/i }).click()
    await page.waitForSelector('[data-testid="bridge-form"]')

    // Fill in bridge details
    await page.getByLabel(/bridge name/i).fill('Test Bridge')

    // Select source connection (Modbus)
    await page.getByLabel(/source connection/i).click()
    await page.getByRole('option', { name: /modbus/i }).click()

    // Select target connection (MQTT)
    await page.getByLabel(/target connection/i).click()
    await page.getByRole('option', { name: /mqtt/i }).click()

    // Configure topic template
    await page.getByLabel(/topic template/i).fill('iiot/{{connectionId}}/{{tagName}}')

    // Configure payload template
    await page.getByLabel(/payload template/i).fill('{"value": {{value}}, "timestamp": {{timestamp}}}')

    // Save bridge
    await page.getByRole('button', { name: /save/i }).click()

    // Verify bridge appears in list
    await expect(page.getByText('Test Bridge')).toBeVisible()
  })

  test.skip('should start and stop bridge', async () => {
    // Find the test bridge in the list
    const bridgeRow = page.getByText('Test Bridge').locator('..')

    // Start the bridge
    await bridgeRow.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(1000)

    // Verify status changed to active
    await expect(bridgeRow.getByText(/active/i)).toBeVisible()

    // Stop the bridge
    await bridgeRow.getByRole('button', { name: /stop/i }).click()
    await page.waitForTimeout(500)

    // Verify status changed to idle
    await expect(bridgeRow.getByText(/idle/i)).toBeVisible()
  })

  test.skip('should pause and resume bridge', async () => {
    const bridgeRow = page.getByText('Test Bridge').locator('..')

    // Start the bridge first
    await bridgeRow.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(1000)

    // Pause the bridge
    await bridgeRow.getByRole('button', { name: /pause/i }).click()
    await page.waitForTimeout(500)

    // Verify status changed to paused
    await expect(bridgeRow.getByText(/paused/i)).toBeVisible()

    // Resume the bridge
    await bridgeRow.getByRole('button', { name: /resume/i }).click()
    await page.waitForTimeout(500)

    // Verify status changed back to active
    await expect(bridgeRow.getByText(/active/i)).toBeVisible()

    // Clean up - stop the bridge
    await bridgeRow.getByRole('button', { name: /stop/i }).click()
  })

  test.skip('should show bridge statistics', async () => {
    const bridgeRow = page.getByText('Test Bridge').locator('..')

    // Click on stats button or expand details
    await bridgeRow.getByRole('button', { name: /stats|details/i }).click()

    // Verify stats are displayed
    await expect(page.getByText(/messages forwarded/i)).toBeVisible()
    await expect(page.getByText(/bytes transferred/i)).toBeVisible()
  })

  test.skip('should delete bridge', async () => {
    const bridgeRow = page.getByText('Test Bridge').locator('..')

    // Click delete button
    await bridgeRow.getByRole('button', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(500)

    // Verify bridge is removed from list
    await expect(page.getByText('Test Bridge')).not.toBeVisible()
  })
})
