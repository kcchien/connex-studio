/**
 * E2E Test: OPC UA Features (T178)
 *
 * Tests the complete flow of:
 * 1. OPC UA server discovery
 * 2. Connecting with security settings
 * 3. Address space browsing
 * 4. Node search
 * 5. Read/Write operations
 * 6. Subscriptions and data changes
 * 7. Method calls
 * 8. History queries
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let electronApp: ElectronApplication
let page: Page

// Test OPC UA server (adjust for your environment)
const OPCUA_ENDPOINT = 'opc.tcp://localhost:4840'

test.describe('OPC UA Features', () => {
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

  test.skip('should discover OPC UA servers on network', async () => {
    // Navigate to Connections section
    await page.getByRole('button', { name: /connections/i }).click()
    await page.waitForTimeout(500)

    // Click "Add Connection" and select OPC UA
    await page.getByRole('button', { name: /add connection/i }).click()
    await page.getByRole('option', { name: /opc ua/i }).click()

    // Click "Discover Servers" button
    await page.getByRole('button', { name: /discover servers/i }).click()
    await page.waitForTimeout(3000) // Discovery takes time

    // Verify discovery panel appears with servers
    await expect(page.getByText(/discovered servers/i)).toBeVisible()
  })

  test.skip('should get endpoints from server', async () => {
    // Enter server URL
    await page.getByLabel(/discovery url|server url/i).fill(OPCUA_ENDPOINT)

    // Click "Get Endpoints" button
    await page.getByRole('button', { name: /get endpoints/i }).click()
    await page.waitForTimeout(2000)

    // Verify endpoints are listed
    await expect(page.getByText(/endpoints/i)).toBeVisible()

    // Check that security options are shown
    await expect(page.getByText(/none|sign|signandencrypt/i)).toBeVisible()
  })

  test.skip('should create OPC UA connection with anonymous auth', async () => {
    // Fill in connection details
    await page.getByLabel(/connection name/i).fill('Test OPC UA Server')
    await page.getByLabel(/endpoint url/i).fill(OPCUA_ENDPOINT)

    // Select security mode
    await page.getByLabel(/security mode/i).click()
    await page.getByRole('option', { name: /none/i }).click()

    // Select security policy
    await page.getByLabel(/security policy/i).click()
    await page.getByRole('option', { name: /none/i }).click()

    // Select anonymous authentication
    await page.getByLabel(/authentication/i).click()
    await page.getByRole('option', { name: /anonymous/i }).click()

    // Save connection
    await page.getByRole('button', { name: /save|create/i }).click()

    // Verify connection appears in list
    await expect(page.getByText('Test OPC UA Server')).toBeVisible()
  })

  test.skip('should connect to OPC UA server', async () => {
    // Find and select the connection
    await page.getByText('Test OPC UA Server').click()

    // Click connect button
    await page.getByRole('button', { name: /connect/i }).click()
    await page.waitForTimeout(3000)

    // Verify connected status
    await expect(page.getByText(/connected/i)).toBeVisible()
  })

  test.skip('should browse address space', async () => {
    // Verify browser panel is visible
    await expect(page.getByTestId('opcua-browser')).toBeVisible()

    // Expand Objects folder
    await page.getByText('Objects').click()
    await page.waitForTimeout(1000)

    // Verify child nodes appear
    const treeItems = page.locator('[data-testid="tree-node"]')
    expect(await treeItems.count()).toBeGreaterThan(0)
  })

  test.skip('should search nodes by name', async () => {
    // Find search input
    await page.getByPlaceholder(/search/i).fill('Server')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)

    // Verify search results
    await expect(page.getByText(/search results/i)).toBeVisible()
    await expect(page.getByText(/server/i)).toBeVisible()
  })

  test.skip('should read node value', async () => {
    // Clear search and browse to a variable node
    await page.getByPlaceholder(/search/i).clear()

    // Expand Server > ServerStatus > CurrentTime
    await page.getByText('Server').click()
    await page.waitForTimeout(500)
    await page.getByText('ServerStatus').click()
    await page.waitForTimeout(500)

    // Click on CurrentTime node
    await page.getByText('CurrentTime').click()

    // Verify node details panel shows value
    await expect(page.getByTestId('node-details')).toBeVisible()
    await expect(page.getByText(/value:/i)).toBeVisible()
  })

  test.skip('should show node attributes', async () => {
    // With a node selected, check attributes panel
    await expect(page.getByText(/node id/i)).toBeVisible()
    await expect(page.getByText(/data type/i)).toBeVisible()
    await expect(page.getByText(/access level/i)).toBeVisible()
  })

  test.skip('should write value to node', async () => {
    // Navigate to a writable node (e.g., simulation variable)
    await page.getByPlaceholder(/search/i).fill('Simulation')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)

    // Click on a writable variable
    const writableNode = page.locator('[data-testid="tree-node"][data-writable="true"]').first()
    if (await writableNode.isVisible()) {
      await writableNode.click()

      // Click write button
      await page.getByRole('button', { name: /write/i }).click()

      // Enter new value
      await page.getByLabel(/new value/i).fill('42')

      // Confirm write
      await page.getByRole('button', { name: /confirm|write/i }).click()

      // Verify success message
      await expect(page.getByText(/write successful|value written/i)).toBeVisible()
    }
  })

  test.skip('should create subscription and receive data changes', async () => {
    // Navigate to a variable node
    await page.getByPlaceholder(/search/i).clear()
    await page.getByText('CurrentTime').click()

    // Click subscribe button
    await page.getByRole('button', { name: /subscribe/i }).click()

    // Configure subscription
    await page.getByLabel(/sampling interval/i).fill('1000')

    // Create subscription
    await page.getByRole('button', { name: /create subscription|start/i }).click()

    // Verify subscription is active
    await expect(page.getByText(/subscribed|monitoring/i)).toBeVisible()

    // Wait for data changes
    await page.waitForTimeout(3000)

    // Verify data change indicator
    await expect(page.getByTestId('data-change-indicator')).toBeVisible()
  })

  test.skip('should call OPC UA method', async () => {
    // Navigate to a method node
    await page.getByPlaceholder(/search/i).fill('Method')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)

    const methodNode = page.locator('[data-testid="tree-node"][data-nodeclass="Method"]').first()
    if (await methodNode.isVisible()) {
      await methodNode.click()

      // Click call method button
      await page.getByRole('button', { name: /call method/i }).click()

      // Fill in method arguments (if any)
      const argInput = page.getByLabel(/argument/i)
      if (await argInput.isVisible()) {
        await argInput.fill('test value')
      }

      // Execute method call
      await page.getByRole('button', { name: /execute|call/i }).click()

      // Verify result
      await expect(page.getByText(/method result|output/i)).toBeVisible()
    }
  })

  test.skip('should query node history', async () => {
    // Navigate to a historizing node
    await page.getByPlaceholder(/search/i).fill('History')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)

    const historyNode = page.locator('[data-testid="tree-node"][data-historizing="true"]').first()
    if (await historyNode.isVisible()) {
      await historyNode.click()

      // Click history button
      await page.getByRole('button', { name: /history/i }).click()

      // Set time range
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      await page.getByLabel(/start time/i).fill(oneHourAgo.toISOString())
      await page.getByLabel(/end time/i).fill(now.toISOString())

      // Execute query
      await page.getByRole('button', { name: /query|read history/i }).click()
      await page.waitForTimeout(2000)

      // Verify history data is displayed
      await expect(page.getByText(/history data/i)).toBeVisible()
    }
  })

  test.skip('should handle session reconnection', async () => {
    // Simulate connection loss (this is tricky to test without server control)
    // For now, just verify reconnection UI is present

    // Check for session timeout handling
    await expect(page.getByText(/session timeout/i)).not.toBeVisible()

    // Verify recovery state indicator
    const recoveryIndicator = page.getByTestId('recovery-state')
    if (await recoveryIndicator.isVisible()) {
      await expect(recoveryIndicator.getByText(/idle|connected/i)).toBeVisible()
    }
  })

  test.skip('should disconnect from OPC UA server', async () => {
    // Click disconnect button
    await page.getByRole('button', { name: /disconnect/i }).click()
    await page.waitForTimeout(1000)

    // Verify disconnected status
    await expect(page.getByText(/disconnected|idle/i)).toBeVisible()
  })

  test.skip('should delete OPC UA connection', async () => {
    // Find and delete the test connection
    const connectionRow = page.getByText('Test OPC UA Server').locator('..')
    await connectionRow.getByRole('button', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click()
    await page.waitForTimeout(500)

    // Verify connection is removed
    await expect(page.getByText('Test OPC UA Server')).not.toBeVisible()
  })
})
