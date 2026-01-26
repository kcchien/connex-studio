import React, { useState } from 'react'
import { cn } from '@renderer/lib/utils'
import {
  X,
  FileSpreadsheet,
  Search,
  Wand2,
  Loader2,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import type { Protocol } from '@shared/types/connection'
import type { Tag } from '@shared/types/tag'
import { ImportTab } from './ImportTab'
import { ScanTab } from './ScanTab'
import { GenerateTab } from './GenerateTab'

export interface BatchTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
  protocol: Protocol
  onTagsCreated: (tags: Partial<Tag>[]) => void | Promise<void>
}

type TabValue = 'import' | 'scan' | 'generate'

const tabConfig: { value: TabValue; label: string; icon: typeof FileSpreadsheet }[] = [
  { value: 'import', label: 'Import', icon: FileSpreadsheet },
  { value: 'scan', label: 'Scan', icon: Search },
  { value: 'generate', label: 'Generate', icon: Wand2 },
]

/**
 * BatchTagDialog - Multi-method batch tag creation
 * Supports import (CSV/Excel), scan (address range), and generate (pattern)
 */
export function BatchTagDialog({
  open,
  onOpenChange,
  connectionId,
  protocol,
  onTagsCreated,
}: BatchTagDialogProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabValue>('import')
  const [isCreating, setIsCreating] = useState(false)
  const [previewTags, setPreviewTags] = useState<Partial<Tag>[]>([])

  const handleCreateTags = async () => {
    if (previewTags.length === 0) return

    setIsCreating(true)
    try {
      await onTagsCreated(previewTags)
      onOpenChange(false)
      setPreviewTags([])
    } finally {
      setIsCreating(false)
    }
  }

  const handlePreviewChange = (tags: Partial<Tag>[]) => {
    setPreviewTags(tags)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#111827] rounded-xl border border-gray-700 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-white">
              Add Tags
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Tabs Content */}
          <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            {/* Tab List */}
            <Tabs.List className="flex border-b border-gray-700">
              {tabConfig.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.value
                return (
                  <Tabs.Trigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      'flex items-center gap-2 px-6 py-3',
                      'text-sm font-medium transition-colors',
                      'border-b-2 -mb-px',
                      isActive
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Tabs.Trigger>
                )
              })}
            </Tabs.List>

            {/* Tab Panels */}
            <div className="p-6">
              <Tabs.Content value="import" forceMount className={activeTab !== 'import' ? 'hidden' : ''}>
                <ImportTab
                  connectionId={connectionId}
                  protocol={protocol}
                  onPreviewChange={handlePreviewChange}
                />
              </Tabs.Content>

              <Tabs.Content value="scan" forceMount className={activeTab !== 'scan' ? 'hidden' : ''}>
                <ScanTab
                  connectionId={connectionId}
                  protocol={protocol}
                  onPreviewChange={handlePreviewChange}
                />
              </Tabs.Content>

              <Tabs.Content value="generate" forceMount className={activeTab !== 'generate' ? 'hidden' : ''}>
                <GenerateTab
                  connectionId={connectionId}
                  protocol={protocol}
                  onPreviewChange={handlePreviewChange}
                />
              </Tabs.Content>
            </div>
          </Tabs.Root>

          {/* Preview & Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              {previewTags.length > 0 ? (
                <span>{previewTags.length} tags ready to create</span>
              ) : (
                <span>No tags configured</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  'px-4 py-2 rounded-lg',
                  'bg-gray-700 text-gray-300',
                  'hover:bg-gray-600 hover:text-white',
                  'transition-colors'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTags}
                disabled={isCreating || previewTags.length === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-gradient-to-r from-blue-500 to-teal-400',
                  'text-white font-medium',
                  'hover:shadow-lg hover:shadow-blue-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all'
                )}
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create {previewTags.length} Tags
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
