/**
 * OpcUaBrowser - Hierarchical address space browser for OPC UA servers.
 *
 * Features:
 * - Lazy loading of child nodes (T086)
 * - Continuation point handling for large results (T087)
 * - Node search by DisplayName (T089)
 * - Drag-to-create-Tag support (T094)
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Variable,
  Play,
  Box,
  Database,
  Eye,
  Link,
  Search,
  Loader2,
  GripVertical,
  RefreshCw
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useOpcUa } from '@renderer/hooks/useOpcUa'
import type { OpcUaNode, NodeClass } from '@shared/types/opcua'
import { OBJECTS_FOLDER_NODE_ID } from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface TreeNode extends OpcUaNode {
  children?: TreeNode[]
  isLoading?: boolean
  isLoaded?: boolean
  continuationPoint?: string
}

interface OpcUaBrowserProps {
  connectionId: string
  onNodeSelect?: (node: OpcUaNode) => void
  onNodeDoubleClick?: (node: OpcUaNode) => void
  onDragStart?: (node: OpcUaNode, event: React.DragEvent) => void
  className?: string
  rootNodeId?: string
  maxReferencesPerNode?: number
}

// =============================================================================
// Icon Mapping
// =============================================================================

function getNodeIcon(nodeClass: NodeClass, isExpanded: boolean): React.ReactNode {
  switch (nodeClass) {
    case 'Object':
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-amber-500" />
      ) : (
        <Folder className="h-4 w-4 text-amber-500" />
      )
    case 'Variable':
      return <Variable className="h-4 w-4 text-blue-500" />
    case 'Method':
      return <Play className="h-4 w-4 text-green-500" />
    case 'ObjectType':
      return <Box className="h-4 w-4 text-purple-500" />
    case 'VariableType':
      return <Database className="h-4 w-4 text-indigo-500" />
    case 'ReferenceType':
      return <Link className="h-4 w-4 text-gray-500" />
    case 'DataType':
      return <Database className="h-4 w-4 text-teal-500" />
    case 'View':
      return <Eye className="h-4 w-4 text-cyan-500" />
    default:
      return <Folder className="h-4 w-4 text-gray-400" />
  }
}

// =============================================================================
// TreeNodeItem Component
// =============================================================================

interface TreeNodeItemProps {
  node: TreeNode
  level: number
  selectedNodeId?: string
  onSelect: (node: TreeNode) => void
  onDoubleClick: (node: TreeNode) => void
  onToggle: (node: TreeNode) => void
  onLoadMore: (node: TreeNode) => void
  onDragStart?: (node: OpcUaNode, event: React.DragEvent) => void
  expandedNodes: Set<string>
}

function TreeNodeItem({
  node,
  level,
  selectedNodeId,
  onSelect,
  onDoubleClick,
  onToggle,
  onLoadMore,
  onDragStart,
  expandedNodes
}: TreeNodeItemProps): React.ReactElement {
  const isExpanded = expandedNodes.has(node.nodeId)
  const isSelected = selectedNodeId === node.nodeId
  const hasChildren = node.hasChildren || (node.children && node.children.length > 0)
  const canDrag = node.nodeClass === 'Variable'

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(node)
    },
    [node, onSelect]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDoubleClick(node)
    },
    [node, onDoubleClick]
  )

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggle(node)
    },
    [node, onToggle]
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (canDrag && onDragStart) {
        e.dataTransfer.setData('application/json', JSON.stringify(node))
        e.dataTransfer.effectAllowed = 'copy'
        onDragStart(node, e)
      }
    },
    [node, canDrag, onDragStart]
  )

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm',
          'hover:bg-muted/50 transition-colors',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        draggable={canDrag}
        onDragStart={handleDragStart}
      >
        {/* Expand/Collapse Toggle */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            node.isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <button
                onClick={handleToggleClick}
                className="hover:bg-muted rounded-sm"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )
          ) : null}
        </div>

        {/* Drag Handle for Variables */}
        {canDrag && (
          <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
        )}

        {/* Node Icon */}
        <div className="flex-shrink-0">{getNodeIcon(node.nodeClass, isExpanded)}</div>

        {/* Node Name */}
        <span className="text-sm truncate" title={node.displayName}>
          {node.displayName || node.browseName}
        </span>

        {/* Node Class Badge */}
        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
          {node.nodeClass}
        </span>
      </div>

      {/* Children */}
      {isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.nodeId}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onToggle={onToggle}
              onLoadMore={onLoadMore}
              onDragStart={onDragStart}
              expandedNodes={expandedNodes}
            />
          ))}

          {/* Load More Button */}
          {node.continuationPoint && (
            <div
              className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-muted/50"
              style={{ paddingLeft: `${(level + 1) * 16 + 4}px` }}
              onClick={() => onLoadMore(node)}
            >
              <RefreshCw className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary">Load more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// OpcUaBrowser Component
// =============================================================================

export function OpcUaBrowser({
  connectionId,
  onNodeSelect,
  onNodeDoubleClick,
  onDragStart,
  className,
  rootNodeId = OBJECTS_FOLDER_NODE_ID,
  maxReferencesPerNode = 500
}: OpcUaBrowserProps): React.ReactElement {
  const { browse, browseNext, searchNodes, isLoading, error } = useOpcUa()

  const [rootNodes, setRootNodes] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OpcUaNode[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Load root nodes on mount
  useEffect(() => {
    loadRootNodes()
  }, [connectionId, rootNodeId])

  const loadRootNodes = async (): Promise<void> => {
    const result = await browse({
      connectionId,
      nodeId: rootNodeId,
      maxReferences: maxReferencesPerNode
    })

    if (result) {
      setRootNodes(
        result.nodes.map((node: OpcUaNode) => ({
          ...node,
          children: undefined,
          isLoaded: false,
          continuationPoint: undefined
        }))
      )
    }
  }

  const loadNodeChildren = useCallback(
    async (node: TreeNode): Promise<void> => {
      // Mark node as loading
      updateNode(node.nodeId, { isLoading: true })

      const result = await browse({
        connectionId,
        nodeId: node.nodeId,
        maxReferences: maxReferencesPerNode
      })

      if (result) {
        updateNode(node.nodeId, {
          isLoading: false,
          isLoaded: true,
          children: result.nodes.map((n: OpcUaNode) => ({
            ...n,
            children: undefined,
            isLoaded: false
          })),
          continuationPoint: result.continuationPoint
        })
      } else {
        updateNode(node.nodeId, { isLoading: false })
      }
    },
    [connectionId, browse, maxReferencesPerNode]
  )

  const loadMoreChildren = useCallback(
    async (node: TreeNode): Promise<void> => {
      if (!node.continuationPoint) return

      const result = await browseNext({
        connectionId,
        continuationPoint: node.continuationPoint
      })

      if (result) {
        updateNode(node.nodeId, {
          children: [
            ...(node.children || []),
            ...result.nodes.map((n: OpcUaNode) => ({
              ...n,
              children: undefined,
              isLoaded: false
            }))
          ],
          continuationPoint: result.continuationPoint
        })
      }
    },
    [connectionId, browseNext]
  )

  const updateNode = (
    nodeId: string,
    updates: Partial<TreeNode>
  ): boolean => {
    const updateInTree = (treeNodes: TreeNode[]): TreeNode[] => {
      return treeNodes.map((node) => {
        if (node.nodeId === nodeId) {
          return { ...node, ...updates }
        }
        if (node.children) {
          return { ...node, children: updateInTree(node.children) }
        }
        return node
      })
    }

    setRootNodes((prev) => updateInTree(prev))
    return true
  }

  const handleToggle = useCallback(
    async (node: TreeNode): Promise<void> => {
      const isExpanded = expandedNodes.has(node.nodeId)

      if (isExpanded) {
        // Collapse
        const newExpanded = new Set(expandedNodes)
        newExpanded.delete(node.nodeId)
        setExpandedNodes(newExpanded)
      } else {
        // Expand
        const newExpanded = new Set(expandedNodes)
        newExpanded.add(node.nodeId)
        setExpandedNodes(newExpanded)

        // Load children if not loaded
        if (!node.isLoaded && node.hasChildren) {
          await loadNodeChildren(node)
        }
      }
    },
    [expandedNodes, loadNodeChildren]
  )

  const handleSelect = useCallback(
    (node: TreeNode): void => {
      setSelectedNodeId(node.nodeId)
      onNodeSelect?.(node)
    },
    [onNodeSelect]
  )

  const handleDoubleClick = useCallback(
    (node: TreeNode): void => {
      if (node.hasChildren) {
        handleToggle(node)
      }
      onNodeDoubleClick?.(node)
    },
    [handleToggle, onNodeDoubleClick]
  )

  const handleSearch = useCallback(async (): Promise<void> => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const result = await searchNodes({
      connectionId,
      startNodeId: rootNodeId,
      searchPattern: searchQuery.trim(),
      maxDepth: 5,
      maxResults: 50
    })

    if (result) {
      setSearchResults(result.nodes)
    }
    setIsSearching(false)
  }, [connectionId, rootNodeId, searchQuery, searchNodes])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch()
    }
    if (e.key === 'Escape') {
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const handleRefresh = useCallback((): void => {
    setExpandedNodes(new Set())
    setSelectedNodeId(undefined)
    setSearchQuery('')
    setSearchResults([])
    loadRootNodes()
  }, [])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Bar */}
      <div className="p-2 border-b flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-8 h-8 text-sm border rounded-md bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="h-8 px-3 text-sm border rounded-md bg-background hover:bg-muted disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8 px-2 border rounded-md bg-background hover:bg-muted disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="border-b">
          <div className="p-2 text-xs text-muted-foreground bg-muted/50">
            Search Results ({searchResults.length})
          </div>
          <div className="max-h-48 overflow-auto">
            {searchResults.map((node) => (
              <div
                key={node.nodeId}
                className={cn(
                  'flex items-center gap-2 py-1 px-3 cursor-pointer',
                  'hover:bg-muted/50 transition-colors',
                  selectedNodeId === node.nodeId && 'bg-primary/10'
                )}
                onClick={() => {
                  setSelectedNodeId(node.nodeId)
                  onNodeSelect?.(node)
                }}
                onDoubleClick={() => onNodeDoubleClick?.(node)}
              >
                {getNodeIcon(node.nodeClass, false)}
                <span className="text-sm truncate flex-1">{node.displayName}</span>
                <span className="text-xs text-muted-foreground">{node.nodeClass}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tree View */}
      <div className="flex-1 overflow-auto">
        <div className="py-1">
          {isLoading && rootNodes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rootNodes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No nodes found
            </div>
          ) : (
            rootNodes.map((node) => (
              <TreeNodeItem
                key={node.nodeId}
                node={node}
                level={0}
                selectedNodeId={selectedNodeId}
                onSelect={handleSelect}
                onDoubleClick={handleDoubleClick}
                onToggle={handleToggle}
                onLoadMore={loadMoreChildren}
                onDragStart={onDragStart}
                expandedNodes={expandedNodes}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
