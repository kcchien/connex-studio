/**
 * Workspace IPC Handler Integration Tests
 *
 * Tests the workspace:* IPC channel handlers including YAML export,
 * validation, file I/O with size limits, and error handling for
 * non-existent files.
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { invokeHandler, resetHandlerRegistry, hasHandler, dialogMock } from './setup'

// ---------------------------------------------------------------------------
// Mock WorkspaceExporter / WorkspaceImporter
// ---------------------------------------------------------------------------

const mockExport = jest.fn()
const mockImport = jest.fn()
const mockValidate = jest.fn()

jest.mock('@main/services/WorkspaceExporter', () => ({
  getWorkspaceExporter: () => ({
    export: mockExport
  })
}))

jest.mock('@main/services/WorkspaceImporter', () => ({
  getWorkspaceImporter: () => ({
    import: mockImport,
    validate: mockValidate
  })
}))

// ---------------------------------------------------------------------------
// Import handler registration (after mocks)
// ---------------------------------------------------------------------------

import { registerWorkspaceHandlers } from '@main/ipc/workspace'
import {
  WORKSPACE_EXPORT,
  WORKSPACE_VALIDATE,
  WORKSPACE_LOAD_FILE,
  WORKSPACE_SAVE_FILE
} from '@shared/constants/ipc-channels'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temporary directory for file tests. */
async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'connex-ws-test-'))
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Workspace IPC Handlers', () => {
  let tempDir: string

  beforeEach(async () => {
    resetHandlerRegistry()
    jest.clearAllMocks()
    registerWorkspaceHandlers()
    tempDir = await createTempDir()
  })

  afterEach(async () => {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  // -------------------------------------------------------------------------
  // Handler registration
  // -------------------------------------------------------------------------

  it('registers all workspace channels', () => {
    expect(hasHandler(WORKSPACE_EXPORT)).toBe(true)
    expect(hasHandler(WORKSPACE_VALIDATE)).toBe(true)
    expect(hasHandler(WORKSPACE_LOAD_FILE)).toBe(true)
    expect(hasHandler(WORKSPACE_SAVE_FILE)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // workspace:export
  // -------------------------------------------------------------------------

  describe('workspace:export', () => {
    it('exports workspace to YAML string', async () => {
      const fakeYaml = 'schemaVersion: 2\nmeta:\n  name: Test\n'
      mockExport.mockResolvedValue(fakeYaml)

      const result = await invokeHandler<{ success: boolean; yaml?: string }>(
        WORKSPACE_EXPORT,
        { name: 'Test Export', includeConnections: true }
      )

      expect(result.success).toBe(true)
      expect(result.yaml).toBe(fakeYaml)
      expect(mockExport).toHaveBeenCalledWith({
        name: 'Test Export',
        includeConnections: true
      })
    })

    it('returns error when exporter throws', async () => {
      mockExport.mockRejectedValue(new Error('Export failure'))

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_EXPORT,
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Export failure')
    })
  })

  // -------------------------------------------------------------------------
  // workspace:validate — valid YAML
  // -------------------------------------------------------------------------

  describe('workspace:validate', () => {
    it('validates well-formed YAML and returns valid: true', async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      })

      const yamlContent = [
        'schemaVersion: 2',
        'meta:',
        '  name: Test Workspace',
        '  exportedAt: "2026-01-01T00:00:00Z"',
        '  connexVersion: "1.0.0"',
        '  schemaVersion: 2'
      ].join('\n')

      const result = await invokeHandler<{
        valid: boolean
        errors: unknown[]
        warnings: unknown[]
      }>(WORKSPACE_VALIDATE, yamlContent)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid for empty YAML content', async () => {
      const result = await invokeHandler<{
        valid: boolean
        errors: Array<{ path: string; message: string }>
      }>(WORKSPACE_VALIDATE, '')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].message).toContain('empty')
    })

    it('returns invalid for whitespace-only YAML', async () => {
      const result = await invokeHandler<{
        valid: boolean
        errors: Array<{ path: string; message: string }>
      }>(WORKSPACE_VALIDATE, '   \n  \n  ')

      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('empty')
    })

    it('returns validation errors from importer', async () => {
      mockValidate.mockResolvedValue({
        valid: false,
        errors: [
          { path: '/schemaVersion', message: 'Missing required field: schemaVersion' }
        ],
        warnings: ['Some warning']
      })

      const result = await invokeHandler<{
        valid: boolean
        errors: Array<{ path: string; message: string }>
        warnings: string[]
      }>(WORKSPACE_VALIDATE, 'meta:\n  name: Broken')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('schemaVersion')
      expect(result.warnings).toContain('Some warning')
    })

    it('catches unexpected errors from validator gracefully', async () => {
      mockValidate.mockRejectedValue(new Error('YAML parse explosion'))

      const result = await invokeHandler<{
        valid: boolean
        errors: Array<{ path: string; message: string }>
      }>(WORKSPACE_VALIDATE, 'not: valid: yaml: {{{')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------------------
  // workspace:load-file — file operations
  // -------------------------------------------------------------------------

  describe('workspace:load-file', () => {
    it('loads a valid YAML file from disk', async () => {
      const filePath = path.join(tempDir, 'workspace.yaml')
      const yamlContent = 'schemaVersion: 2\nmeta:\n  name: Loaded\n'
      await fs.writeFile(filePath, yamlContent, 'utf-8')

      const result = await invokeHandler<{
        success: boolean
        yaml?: string
        path?: string
      }>(WORKSPACE_LOAD_FILE, { path: filePath })

      expect(result.success).toBe(true)
      expect(result.yaml).toBe(yamlContent)
      expect(result.path).toBe(filePath)
    })

    it('fails gracefully for non-existent file', async () => {
      const fakePath = path.join(tempDir, 'does-not-exist.yaml')

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_LOAD_FILE,
        { path: fakePath }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('File not found')
    })

    it('rejects file larger than 10MB', async () => {
      const filePath = path.join(tempDir, 'huge.yaml')
      // Create a file just over 10MB
      const size = 10 * 1024 * 1024 + 1
      const buffer = Buffer.alloc(size, 'x')
      await fs.writeFile(filePath, buffer)

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_LOAD_FILE,
        { path: filePath }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('loads file exactly 10MB (boundary test)', async () => {
      const filePath = path.join(tempDir, 'boundary.yaml')
      const size = 10 * 1024 * 1024 // Exactly 10MB
      const buffer = Buffer.alloc(size, 'y')
      await fs.writeFile(filePath, buffer)

      const result = await invokeHandler<{ success: boolean; yaml?: string }>(
        WORKSPACE_LOAD_FILE,
        { path: filePath }
      )

      // Exactly 10MB should succeed (not > 10MB)
      expect(result.success).toBe(true)
    })

    it('shows open dialog when no path provided and dialog is cancelled', async () => {
      dialogMock.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_LOAD_FILE,
        undefined
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('cancelled')
    })
  })

  // -------------------------------------------------------------------------
  // workspace:save-file
  // -------------------------------------------------------------------------

  describe('workspace:save-file', () => {
    it('returns error for empty YAML content', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_SAVE_FILE,
        { yaml: '' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('returns error for whitespace-only YAML', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_SAVE_FILE,
        { yaml: '   ' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('writes file when dialog provides path', async () => {
      const savePath = path.join(tempDir, 'saved-workspace.yaml')
      dialogMock.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: savePath
      })

      const yamlContent = 'schemaVersion: 2\nmeta:\n  name: Saved\n'
      const result = await invokeHandler<{ success: boolean; path?: string }>(
        WORKSPACE_SAVE_FILE,
        { yaml: yamlContent }
      )

      expect(result.success).toBe(true)
      expect(result.path).toBe(savePath)

      // Verify file was actually written
      const written = await fs.readFile(savePath, 'utf-8')
      expect(written).toBe(yamlContent)
    })

    it('returns cancelled when save dialog is dismissed', async () => {
      dialogMock.showSaveDialog.mockResolvedValue({
        canceled: true,
        filePath: undefined
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        WORKSPACE_SAVE_FILE,
        { yaml: 'some content' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('cancelled')
    })
  })
})
