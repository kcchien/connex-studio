/**
 * E2E Test: Dashboard Widget Management (T176)
 *
 * Tests the complete flow of:
 * 1. Creating a new dashboard
 * 2. Adding widgets (gauge, LED, number card, chart)
 * 3. Configuring widget settings
 * 4. Resizing and repositioning widgets
 * 5. Deleting widgets and dashboards
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let electronApp: ElectronApplication
let page: Page

test.describe('Dashboard Widget Management', () => {
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

  test.skip('should create a new dashboard', async () => {
    // Navigate to Dashboards section
    await page.getByRole('button', { name: /dashboards/i }).click()
    await page.waitForTimeout(500)

    // Click "Create Dashboard" button
    await page.getByRole('button', { name: /create dashboard/i }).click()
    await page.waitForSelector('[data-testid="dashboard-form"]')

    // Fill in dashboard name
    await page.getByLabel(/dashboard name/i).fill('Test Dashboard')

    // Save dashboard
    await page.getByRole('button', { name: /save|create/i }).click()

    // Verify dashboard appears in list
    await expect(page.getByText('Test Dashboard')).toBeVisible()
  })

  test.skip('should add gauge widget to dashboard', async () => {
    // Open the test dashboard
    await page.getByText('Test Dashboard').click()
    await page.waitForTimeout(500)

    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click()

    // Open widget palette
    await page.getByRole('button', { name: /add widget/i }).click()
    await page.waitForSelector('[data-testid="widget-palette"]')

    // Select gauge widget
    await page.getByRole('button', { name: /gauge/i }).click()

    // Configure widget
    await page.getByLabel(/widget title/i).fill('Temperature')

    // Select tag binding
    await page.getByLabel(/tag/i).click()
    await page.getByRole('option').first().click()

    // Set min/max range
    await page.getByLabel(/min value/i).fill('0')
    await page.getByLabel(/max value/i).fill('100')

    // Save widget configuration
    await page.getByRole('button', { name: /add|save/i }).click()

    // Verify widget appears on canvas
    await expect(page.getByText('Temperature')).toBeVisible()
  })

  test.skip('should add LED indicator widget', async () => {
    // Open widget palette
    await page.getByRole('button', { name: /add widget/i }).click()

    // Select LED widget
    await page.getByRole('button', { name: /led/i }).click()

    // Configure widget
    await page.getByLabel(/widget title/i).fill('Status LED')

    // Select tag binding
    await page.getByLabel(/tag/i).click()
    await page.getByRole('option').first().click()

    // Save widget configuration
    await page.getByRole('button', { name: /add|save/i }).click()

    // Verify widget appears on canvas
    await expect(page.getByText('Status LED')).toBeVisible()
  })

  test.skip('should add number card widget', async () => {
    // Open widget palette
    await page.getByRole('button', { name: /add widget/i }).click()

    // Select number card widget
    await page.getByRole('button', { name: /number card/i }).click()

    // Configure widget
    await page.getByLabel(/widget title/i).fill('Counter')
    await page.getByLabel(/unit/i).fill('units')

    // Select tag binding
    await page.getByLabel(/tag/i).click()
    await page.getByRole('option').first().click()

    // Save widget configuration
    await page.getByRole('button', { name: /add|save/i }).click()

    // Verify widget appears on canvas
    await expect(page.getByText('Counter')).toBeVisible()
  })

  test.skip('should add chart widget', async () => {
    // Open widget palette
    await page.getByRole('button', { name: /add widget/i }).click()

    // Select chart widget
    await page.getByRole('button', { name: /chart/i }).click()

    // Configure widget
    await page.getByLabel(/widget title/i).fill('Trend Chart')

    // Select multiple tags
    await page.getByLabel(/tags/i).click()
    await page.getByRole('option').first().click()
    await page.keyboard.press('Escape')

    // Save widget configuration
    await page.getByRole('button', { name: /add|save/i }).click()

    // Verify widget appears on canvas
    await expect(page.getByText('Trend Chart')).toBeVisible()
  })

  test.skip('should resize widget by dragging', async () => {
    // Find the gauge widget
    const widget = page.locator('[data-testid="widget-gauge"]').first()

    // Get initial size
    const initialBox = await widget.boundingBox()
    expect(initialBox).not.toBeNull()

    // Find resize handle and drag
    const resizeHandle = widget.locator('.react-resizable-handle')
    await resizeHandle.hover()
    await page.mouse.down()
    await page.mouse.move(initialBox!.x + initialBox!.width + 100, initialBox!.y + initialBox!.height + 50)
    await page.mouse.up()

    // Verify size changed
    const newBox = await widget.boundingBox()
    expect(newBox!.width).toBeGreaterThan(initialBox!.width)
  })

  test.skip('should reposition widget by dragging', async () => {
    // Find the LED widget
    const widget = page.locator('[data-testid="widget-led"]').first()

    // Get initial position
    const initialBox = await widget.boundingBox()
    expect(initialBox).not.toBeNull()

    // Find drag handle and drag
    const dragHandle = widget.locator('.widget-drag-handle')
    await dragHandle.hover()
    await page.mouse.down()
    await page.mouse.move(initialBox!.x + 200, initialBox!.y)
    await page.mouse.up()

    // Verify position changed
    const newBox = await widget.boundingBox()
    expect(newBox!.x).not.toBe(initialBox!.x)
  })

  test.skip('should configure widget thresholds', async () => {
    // Enter edit mode if not already
    await page.getByRole('button', { name: /edit/i }).click()

    // Click settings on gauge widget
    const widget = page.locator('[data-testid="widget-gauge"]').first()
    await widget.getByRole('button', { name: /settings/i }).click()

    // Add threshold
    await page.getByRole('button', { name: /add threshold/i }).click()
    await page.getByLabel(/threshold value/i).fill('80')
    await page.getByLabel(/threshold color/i).fill('red')

    // Save settings
    await page.getByRole('button', { name: /save/i }).click()

    // Verify threshold is applied (visual indicator or config)
  })

  test.skip('should delete widget from dashboard', async () => {
    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click()

    // Find the chart widget
    const widget = page.locator('[data-testid="widget-chart"]').first()

    // Click remove button
    await widget.getByRole('button', { name: /remove|delete/i }).click()

    // Confirm deletion if dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm/i })
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    // Verify widget is removed
    await expect(page.getByText('Trend Chart')).not.toBeVisible()
  })

  test.skip('should save dashboard layout', async () => {
    // Exit edit mode (save)
    await page.getByRole('button', { name: /save|done/i }).click()
    await page.waitForTimeout(500)

    // Reload the dashboard
    await page.getByRole('button', { name: /dashboards/i }).click()
    await page.getByText('Test Dashboard').click()

    // Verify widgets are still there
    await expect(page.getByText('Temperature')).toBeVisible()
    await expect(page.getByText('Status LED')).toBeVisible()
    await expect(page.getByText('Counter')).toBeVisible()
  })

  test.skip('should delete dashboard', async () => {
    // Go to dashboard list
    await page.getByRole('button', { name: /dashboards/i }).click()

    // Find and delete the test dashboard
    const dashboardRow = page.getByText('Test Dashboard').locator('..')
    await dashboardRow.getByRole('button', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(500)

    // Verify dashboard is removed
    await expect(page.getByText('Test Dashboard')).not.toBeVisible()
  })
})
