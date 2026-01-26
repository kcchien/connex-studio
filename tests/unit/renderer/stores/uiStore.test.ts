import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@renderer/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      newConnectionDialogOpen: false,
      toolsExpanded: false,
      selectedConnectionId: null,
      batchTagDialogOpen: false,
    })
  })

  it('tracks new connection dialog state', () => {
    expect(useUIStore.getState().newConnectionDialogOpen).toBe(false)
    useUIStore.getState().setNewConnectionDialogOpen(true)
    expect(useUIStore.getState().newConnectionDialogOpen).toBe(true)
  })

  it('tracks tools section expanded state', () => {
    expect(useUIStore.getState().toolsExpanded).toBe(false)
    useUIStore.getState().setToolsExpanded(true)
    expect(useUIStore.getState().toolsExpanded).toBe(true)
  })

  it('tracks selected connection id', () => {
    expect(useUIStore.getState().selectedConnectionId).toBe(null)
    useUIStore.getState().setSelectedConnectionId('conn-1')
    expect(useUIStore.getState().selectedConnectionId).toBe('conn-1')
  })

  it('tracks batch tag dialog state', () => {
    expect(useUIStore.getState().batchTagDialogOpen).toBe(false)
    useUIStore.getState().setBatchTagDialogOpen(true)
    expect(useUIStore.getState().batchTagDialogOpen).toBe(true)
  })

  it('toggles tools expanded state', () => {
    expect(useUIStore.getState().toolsExpanded).toBe(false)
    useUIStore.getState().toggleToolsExpanded()
    expect(useUIStore.getState().toolsExpanded).toBe(true)
    useUIStore.getState().toggleToolsExpanded()
    expect(useUIStore.getState().toolsExpanded).toBe(false)
  })
})
