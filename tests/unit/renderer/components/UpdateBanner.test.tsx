import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { UpdateBanner } from '../../../../src/renderer/components/common/UpdateBanner'

// Mock window.electronAPI.updater
beforeEach(() => {
  ;(window as any).electronAPI = {
    updater: {
      check: vi.fn().mockResolvedValue({ updateAvailable: false }),
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn(),
      onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
      onUpdateNotAvailable: vi.fn().mockReturnValue(() => {}),
      onDownloadProgress: vi.fn().mockReturnValue(() => {}),
      onUpdateDownloaded: vi.fn().mockReturnValue(() => {}),
    },
  }
})

describe('UpdateBanner', () => {
  it('renders nothing when no update', () => {
    const { container } = render(<UpdateBanner />)
    expect(container.firstChild).toBeNull()
  })
})
