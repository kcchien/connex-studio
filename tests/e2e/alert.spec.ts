/**
 * E2E Test: Alert System (T177)
 *
 * Tests the complete flow of:
 * 1. Creating alert rules with conditions
 * 2. Configuring alert thresholds and durations
 * 3. Alert triggering and acknowledgment
 * 4. Alert history viewing
 * 5. Rate-of-change (ROC) alerts
 * 6. Connection status alerts
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let electronApp: ElectronApplication
let page: Page

test.describe('Alert System', () => {
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

  test.skip('should create basic threshold alert rule', async () => {
    // Navigate to Alerts section
    await page.getByRole('button', { name: /alerts/i }).click()
    await page.waitForTimeout(500)

    // Click "Create Alert Rule" button
    await page.getByRole('button', { name: /create alert|add rule/i }).click()
    await page.waitForSelector('[data-testid="alert-rule-form"]')

    // Fill in alert rule details
    await page.getByLabel(/rule name/i).fill('High Temperature Alert')

    // Select tag
    await page.getByLabel(/tag/i).click()
    await page.getByRole('option', { name: /temperature/i }).click()

    // Configure condition
    await page.getByLabel(/condition/i).click()
    await page.getByRole('option', { name: /greater than/i }).click()

    // Set threshold value
    await page.getByLabel(/threshold/i).fill('80')

    // Set duration (seconds)
    await page.getByLabel(/duration/i).fill('5')

    // Set severity
    await page.getByLabel(/severity/i).click()
    await page.getByRole('option', { name: /critical/i }).click()

    // Save rule
    await page.getByRole('button', { name: /save|create/i }).click()

    // Verify rule appears in list
    await expect(page.getByText('High Temperature Alert')).toBeVisible()
  })

  test.skip('should create range alert rule', async () => {
    // Click "Create Alert Rule" button
    await page.getByRole('button', { name: /create alert|add rule/i }).click()

    // Fill in alert rule details
    await page.getByLabel(/rule name/i).fill('Out of Range Alert')

    // Select tag
    await page.getByLabel(/tag/i).click()
    await page.getByRole('option').first().click()

    // Configure condition for outside range
    await page.getByLabel(/condition/i).click()
    await page.getByRole('option', { name: /outside range/i }).click()

    // Set range values
    await page.getByLabel(/min value/i).fill('20')
    await page.getByLabel(/max value/i).fill('80')

    // Set severity
    await page.getByLabel(/severity/i).click()
    await page.getByRole('option', { name: /warning/i }).click()

    // Save rule
    await page.getByRole('button', { name: /save|create/i }).click()

    // Verify rule appears in list
    await expect(page.getByText('Out of Range Alert')).toBeVisible()
  })

  test.skip('should create rate-of-change (ROC) alert rule', async () => {
    // Click "Create Alert Rule" button
    await page.getByRole('button', { name: /create alert|add rule/i }).click()

    // Fill in alert rule details
    await page.getByLabel(/rule name/i).fill('Rapid Change Alert')

    // Select tag
    await page.getByLabel(/tag/i).click()
    await page.getByRole('option').first().click()

    // Enable ROC mode
    await page.getByLabel(/rate of change/i).check()

    // Configure ROC threshold
    await page.getByLabel(/roc threshold/i).fill('10')

    // Set time window (seconds)
    await page.getByLabel(/time window/i).fill('60')

    // Set ROC mode (percentage or absolute)
    await page.getByLabel(/roc mode/i).click()
    await page.getByRole('option', { name: /percentage/i }).click()

    // Set severity
    await page.getByLabel(/severity/i).click()
    await page.getByRole('option', { name: /warning/i }).click()

    // Save rule
    await page.getByRole('button', { name: /save|create/i }).click()

    // Verify rule appears in list
    await expect(page.getByText('Rapid Change Alert')).toBeVisible()
  })

  test.skip('should create connection status alert rule', async () => {
    // Click "Create Alert Rule" button
    await page.getByRole('button', { name: /create alert|add rule/i }).click()

    // Fill in alert rule details
    await page.getByLabel(/rule name/i).fill('Connection Lost Alert')

    // Select alert type as connection status
    await page.getByLabel(/alert type/i).click()
    await page.getByRole('option', { name: /connection status/i }).click()

    // Select connection
    await page.getByLabel(/connection/i).click()
    await page.getByRole('option').first().click()

    // Select status trigger
    await page.getByLabel(/trigger on/i).click()
    await page.getByRole('option', { name: /disconnected/i }).click()

    // Set severity
    await page.getByLabel(/severity/i).click()
    await page.getByRole('option', { name: /critical/i }).click()

    // Save rule
    await page.getByRole('button', { name: /save|create/i }).click()

    // Verify rule appears in list
    await expect(page.getByText('Connection Lost Alert')).toBeVisible()
  })

  test.skip('should enable and disable alert rule', async () => {
    // Find the alert rule
    const ruleRow = page.getByText('High Temperature Alert').locator('..')

    // Find and click the enable/disable toggle
    const toggle = ruleRow.getByRole('switch')

    // If enabled, disable it
    if (await toggle.isChecked()) {
      await toggle.click()
      await expect(toggle).not.toBeChecked()
    }

    // Enable it
    await toggle.click()
    await expect(toggle).toBeChecked()
  })

  test.skip('should mute and unmute alert rule', async () => {
    // Find the alert rule
    const ruleRow = page.getByText('High Temperature Alert').locator('..')

    // Click mute button
    await ruleRow.getByRole('button', { name: /mute/i }).click()

    // Verify muted state (visual indicator)
    await expect(ruleRow.getByText(/muted/i)).toBeVisible()

    // Click unmute button
    await ruleRow.getByRole('button', { name: /unmute/i }).click()

    // Verify unmuted state
    await expect(ruleRow.getByText(/muted/i)).not.toBeVisible()
  })

  test.skip('should configure cooldown period', async () => {
    // Find the alert rule and click edit
    const ruleRow = page.getByText('High Temperature Alert').locator('..')
    await ruleRow.getByRole('button', { name: /edit/i }).click()

    // Set cooldown period
    await page.getByLabel(/cooldown/i).fill('300')

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()

    // Verify update
    await expect(page.getByText('5 min cooldown')).toBeVisible()
  })

  test.skip('should view alert history', async () => {
    // Navigate to alert history tab
    await page.getByRole('tab', { name: /history/i }).click()
    await page.waitForTimeout(500)

    // Verify history table is visible
    await expect(page.getByRole('table')).toBeVisible()

    // Check for history columns
    await expect(page.getByText(/timestamp/i)).toBeVisible()
    await expect(page.getByText(/rule/i)).toBeVisible()
    await expect(page.getByText(/severity/i)).toBeVisible()
    await expect(page.getByText(/message/i)).toBeVisible()
  })

  test.skip('should acknowledge active alert', async () => {
    // Navigate to active alerts tab
    await page.getByRole('tab', { name: /active/i }).click()

    // Find an active alert (if any)
    const activeAlert = page.locator('[data-testid="active-alert"]').first()

    if (await activeAlert.isVisible()) {
      // Click acknowledge button
      await activeAlert.getByRole('button', { name: /acknowledge/i }).click()

      // Verify acknowledged state
      await expect(activeAlert.getByText(/acknowledged/i)).toBeVisible()
    }
  })

  test.skip('should delete alert rule', async () => {
    // Navigate back to rules tab
    await page.getByRole('tab', { name: /rules/i }).click()

    // Find the test rule
    const ruleRow = page.getByText('Out of Range Alert').locator('..')

    // Click delete button
    await ruleRow.getByRole('button', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(500)

    // Verify rule is removed
    await expect(page.getByText('Out of Range Alert')).not.toBeVisible()
  })

  test.skip('should cleanup test alert rules', async () => {
    // Delete remaining test rules
    const rulesToDelete = [
      'High Temperature Alert',
      'Rapid Change Alert',
      'Connection Lost Alert'
    ]

    for (const ruleName of rulesToDelete) {
      const ruleRow = page.getByText(ruleName)
      if (await ruleRow.isVisible()) {
        await ruleRow.locator('..').getByRole('button', { name: /delete/i }).click()
        await page.getByRole('button', { name: /confirm/i }).click()
        await page.waitForTimeout(300)
      }
    }
  })
})
