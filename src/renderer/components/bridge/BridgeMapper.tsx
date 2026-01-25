/**
 * BridgeMapper Component
 *
 * Visual drag-and-drop interface for mapping source tags to target MQTT topics.
 * Allows users to configure bridges between connections.
 */

import React, { memo, useCallback, useState } from 'react'
import {
  ArrowRight,
  GripVertical,
  Plus,
  Trash2,
  Wifi,
  Radio
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Tag, Connection, BridgeTargetConfig } from '@shared/types'

interface TagMapping {
  tagId: string
  tagName: string
  topicTemplate: string
}

interface BridgeMapperProps {
  /** Source connection */
  sourceConnection: Connection | null
  /** Available tags from source connection */
  sourceTags: Tag[]
  /** Target connection (MQTT) */
  targetConnection: Connection | null
  /** Current mappings */
  mappings: TagMapping[]
  /** Target config template */
  targetConfig: BridgeTargetConfig
  /** Callback when mappings change */
  onMappingsChange: (mappings: TagMapping[]) => void
  /** Callback when target config changes */
  onTargetConfigChange: (config: BridgeTargetConfig) => void
  /** Whether the mapper is read-only */
  readonly?: boolean
  /** Optional additional className */
  className?: string
}

interface TagItemProps {
  tag: Tag
  isSelected: boolean
  onSelect: () => void
  readonly?: boolean
}

const TagItem = memo(function TagItem({
  tag,
  isSelected,
  onSelect,
  readonly = false
}: TagItemProps): React.ReactElement {
  return (
    <div
      onClick={readonly ? undefined : onSelect}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md',
        'border border-border transition-colors',
        !readonly && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-primary/10 border-primary'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{tag.name}</div>
        <div className="text-xs text-muted-foreground">
          {tag.dataType}
        </div>
      </div>
    </div>
  )
})

interface MappingRowProps {
  mapping: TagMapping
  index: number
  onUpdate: (index: number, mapping: TagMapping) => void
  onRemove: (index: number) => void
  readonly?: boolean
}

const MappingRow = memo(function MappingRow({
  mapping,
  index,
  onUpdate,
  onRemove,
  readonly = false
}: MappingRowProps): React.ReactElement {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-md',
      'bg-muted/30 border border-border group'
    )}>
      {/* Tag name */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0 w-40">
        <Radio className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium truncate">{mapping.tagName}</span>
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      {/* Topic template input */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={mapping.topicTemplate}
          onChange={(e) =>
            onUpdate(index, { ...mapping, topicTemplate: e.target.value })
          }
          disabled={readonly}
          placeholder="devices/${connectionId}/${tagName}"
          className={cn(
            'w-full px-2 py-1 rounded text-sm',
            'bg-background border border-input',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:opacity-50'
          )}
        />
      </div>

      {/* Remove button */}
      {!readonly && (
        <button
          onClick={() => onRemove(index)}
          className={cn(
            'p-1 rounded text-muted-foreground',
            'hover:text-destructive hover:bg-destructive/10',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
          title="Remove mapping"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})

/**
 * BridgeMapper for visual tag-to-topic mapping.
 */
export const BridgeMapper = memo(function BridgeMapper({
  sourceConnection,
  sourceTags,
  targetConnection,
  mappings,
  targetConfig,
  onMappingsChange,
  onTargetConfigChange,
  readonly = false,
  className
}: BridgeMapperProps): React.ReactElement {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  // Get mapped tag IDs
  const mappedTagIds = new Set(mappings.map((m) => m.tagId))

  // Available tags (not yet mapped)
  const availableTags = sourceTags.filter((t) => !mappedTagIds.has(t.id))

  // Toggle tag selection
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  // Add selected tags to mappings
  const addSelectedToMappings = useCallback(() => {
    const tagsToAdd = availableTags.filter((t) => selectedTags.has(t.id))
    const newMappings: TagMapping[] = tagsToAdd.map((tag) => ({
      tagId: tag.id,
      tagName: tag.name,
      topicTemplate: `devices/\${connectionId}/\${tagName}`
    }))

    onMappingsChange([...mappings, ...newMappings])
    setSelectedTags(new Set())
  }, [availableTags, selectedTags, mappings, onMappingsChange])

  // Update mapping
  const updateMapping = useCallback(
    (index: number, mapping: TagMapping) => {
      const updated = [...mappings]
      updated[index] = mapping
      onMappingsChange(updated)
    },
    [mappings, onMappingsChange]
  )

  // Remove mapping
  const removeMapping = useCallback(
    (index: number) => {
      onMappingsChange(mappings.filter((_, i) => i !== index))
    },
    [mappings, onMappingsChange]
  )

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Connection display */}
      <div className="flex items-center gap-4">
        {/* Source */}
        <div className="flex-1 p-3 rounded-md bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Source</span>
          </div>
          <div className="text-sm text-foreground">
            {sourceConnection?.name ?? 'Select source connection'}
          </div>
          <div className="text-xs text-muted-foreground">
            {sourceConnection?.protocol ?? '—'}
          </div>
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

        {/* Target */}
        <div className="flex-1 p-3 rounded-md bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Target (MQTT)</span>
          </div>
          <div className="text-sm text-foreground">
            {targetConnection?.name ?? 'Select target connection'}
          </div>
          <div className="text-xs text-muted-foreground">
            {targetConnection?.protocol ?? '—'}
          </div>
        </div>
      </div>

      {/* Tag selection panel */}
      <div className="grid grid-cols-2 gap-4">
        {/* Available tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Available Tags
            </span>
            {selectedTags.size > 0 && !readonly && (
              <button
                onClick={addSelectedToMappings}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 transition-colors'
                )}
              >
                <Plus className="h-3 w-3" />
                Add Selected ({selectedTags.size})
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {availableTags.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                {sourceTags.length === 0
                  ? 'No tags available'
                  : 'All tags are mapped'}
              </div>
            ) : (
              availableTags.map((tag) => (
                <TagItem
                  key={tag.id}
                  tag={tag}
                  isSelected={selectedTags.has(tag.id)}
                  onSelect={() => toggleTag(tag.id)}
                  readonly={readonly}
                />
              ))
            )}
          </div>
        </div>

        {/* Mappings */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">
            Tag Mappings ({mappings.length})
          </span>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {mappings.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
                Select tags and add to create mappings
              </div>
            ) : (
              mappings.map((mapping, index) => (
                <MappingRow
                  key={mapping.tagId}
                  mapping={mapping}
                  index={index}
                  onUpdate={updateMapping}
                  onRemove={removeMapping}
                  readonly={readonly}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Global target config */}
      <div className="p-3 rounded-md bg-muted/20 border border-border space-y-3">
        <span className="text-sm font-medium text-foreground">
          Target Configuration
        </span>

        <div className="grid grid-cols-2 gap-4">
          {/* QoS */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              QoS Level
            </label>
            <select
              value={targetConfig.qos}
              onChange={(e) =>
                onTargetConfigChange({
                  ...targetConfig,
                  qos: parseInt(e.target.value) as 0 | 1 | 2
                })
              }
              disabled={readonly}
              className={cn(
                'w-full px-2 py-1.5 rounded text-sm',
                'bg-background border border-input',
                'focus:outline-none focus:ring-1 focus:ring-ring',
                'disabled:opacity-50'
              )}
            >
              <option value={0}>0 - At most once</option>
              <option value={1}>1 - At least once</option>
              <option value={2}>2 - Exactly once</option>
            </select>
          </div>

          {/* Retain */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="retain"
              checked={targetConfig.retain}
              onChange={(e) =>
                onTargetConfigChange({
                  ...targetConfig,
                  retain: e.target.checked
                })
              }
              disabled={readonly}
              className="rounded border-input"
            />
            <label htmlFor="retain" className="text-sm text-foreground">
              Retain Messages
            </label>
          </div>
        </div>
      </div>
    </div>
  )
})
