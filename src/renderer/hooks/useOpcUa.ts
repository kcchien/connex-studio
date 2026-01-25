/**
 * Custom hook for OPC UA operations with loading/error state management.
 * Wraps IPC calls for OPC UA-specific functionality.
 */

import { useState, useCallback, useEffect } from 'react'
import { opcuaApi } from '../lib/ipc'
import type {
  OpcUaEndpoint,
  OpcUaNode,
  OpcUaBrowseRequest,
  OpcUaBrowseResult,
  OpcUaBrowseNextRequest,
  OpcUaBrowsePathRequest,
  OpcUaBrowsePathResult,
  OpcUaSearchNodesRequest,
  OpcUaSearchResult,
  OpcUaNodeAttributesRequest,
  OpcUaNodeAttributes,
  OpcUaReadRequest,
  OpcUaReadResult,
  OpcUaWriteRequest,
  OpcUaWriteResult,
  OpcUaSubscription,
  CreateSubscriptionRequest,
  AddMonitoredItemRequest,
  MonitoredItem,
  OpcUaDataChange,
  OpcUaServerInfo,
  // Event types
  OpcUaEvent,
  SubscribeEventsRequest,
  AcknowledgeConditionRequest,
  ConfirmConditionRequest,
  // Method types
  OpcUaCallMethodRequest,
  OpcUaCallMethodResult,
  OpcUaMethodArguments
} from '@shared/types/opcua'

export interface SessionStatus {
  connected: boolean
  sessionId?: string
  timeout?: number
  serverInfo?: OpcUaServerInfo
}

export interface TestConnectionResult {
  success: boolean
  message: string
  serverInfo?: OpcUaServerInfo
}

export interface UseOpcUaReturn {
  // Discovery
  getEndpoints: (endpointUrl: string) => Promise<OpcUaEndpoint[] | null>
  testConnection: (
    endpointUrl: string,
    securityMode: string,
    securityPolicy: string
  ) => Promise<TestConnectionResult | null>

  // Session
  getSessionStatus: (connectionId: string) => Promise<SessionStatus | null>

  // Browse
  browse: (request: OpcUaBrowseRequest) => Promise<OpcUaBrowseResult | null>
  browseNext: (request: OpcUaBrowseNextRequest) => Promise<OpcUaBrowseResult | null>
  browsePath: (request: OpcUaBrowsePathRequest) => Promise<OpcUaBrowsePathResult | null>
  searchNodes: (request: OpcUaSearchNodesRequest) => Promise<OpcUaSearchResult | null>
  readNodeAttributes: (request: OpcUaNodeAttributesRequest) => Promise<OpcUaNodeAttributes | null>

  // Read/Write
  read: (request: OpcUaReadRequest) => Promise<OpcUaReadResult | null>
  write: (request: OpcUaWriteRequest) => Promise<OpcUaWriteResult | null>

  // Subscriptions
  createSubscription: (request: CreateSubscriptionRequest) => Promise<OpcUaSubscription | null>
  deleteSubscription: (connectionId: string, subscriptionId: string) => Promise<boolean>
  addMonitoredItem: (request: AddMonitoredItemRequest) => Promise<MonitoredItem | null>
  removeMonitoredItem: (
    connectionId: string,
    subscriptionId: string,
    itemId: string
  ) => Promise<boolean>

  // Events (Alarms & Conditions)
  subscribeEvents: (request: SubscribeEventsRequest) => Promise<{ subscriptionId: string } | null>
  unsubscribeEvents: (connectionId: string, subscriptionId: string) => Promise<boolean>
  acknowledgeCondition: (request: AcknowledgeConditionRequest) => Promise<boolean>
  confirmCondition: (request: ConfirmConditionRequest) => Promise<boolean>

  // Methods
  getMethodArgs: (
    connectionId: string,
    objectId: string,
    methodId: string
  ) => Promise<OpcUaMethodArguments | null>
  callMethod: (request: OpcUaCallMethodRequest) => Promise<OpcUaCallMethodResult | null>

  // State
  isLoading: boolean
  error: string | null
  dataChanges: OpcUaDataChange[]
  events: OpcUaEvent[]

  // Actions
  clearError: () => void
  clearDataChanges: () => void
  clearEvents: () => void
}

export function useOpcUa(): UseOpcUaReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataChanges, setDataChanges] = useState<OpcUaDataChange[]>([])
  const [events, setEvents] = useState<OpcUaEvent[]>([])

  // Subscribe to data change events
  useEffect(() => {
    const unsubscribe = opcuaApi.onDataChange((change: OpcUaDataChange) => {
      setDataChanges((prev) => [...prev, change])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Subscribe to OPC UA events (alarms & conditions)
  useEffect(() => {
    const unsubscribe = opcuaApi.onEvent((event: OpcUaEvent) => {
      setEvents((prev) => [...prev, event])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearDataChanges = useCallback(() => {
    setDataChanges([])
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  // ==========================================================================
  // Discovery
  // ==========================================================================

  /**
   * Discover endpoints from an OPC UA server URL.
   */
  const getEndpoints = useCallback(
    async (endpointUrl: string): Promise<OpcUaEndpoint[] | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const endpoints = await opcuaApi.getEndpoints(endpointUrl)
        return endpoints
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get endpoints'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Test connection to an OPC UA server.
   */
  const testConnection = useCallback(
    async (
      endpointUrl: string,
      securityMode: string,
      securityPolicy: string
    ): Promise<TestConnectionResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.testConnection({
          endpointUrl,
          securityMode,
          securityPolicy
        })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to test connection'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ==========================================================================
  // Session
  // ==========================================================================

  /**
   * Get session status for a connection.
   */
  const getSessionStatus = useCallback(
    async (connectionId: string): Promise<SessionStatus | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const status = await opcuaApi.getSessionStatus(connectionId)
        return status
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get session status'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ==========================================================================
  // Browse
  // ==========================================================================

  /**
   * Browse child nodes with lazy loading support.
   */
  const browse = useCallback(
    async (request: OpcUaBrowseRequest): Promise<OpcUaBrowseResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.browse(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to browse nodes'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Continue browsing with continuation point.
   */
  const browseNext = useCallback(
    async (request: OpcUaBrowseNextRequest): Promise<OpcUaBrowseResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.browseNext(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to continue browsing'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Translate browse path to node ID.
   */
  const browsePath = useCallback(
    async (request: OpcUaBrowsePathRequest): Promise<OpcUaBrowsePathResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.browsePath(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to translate browse path'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Search for nodes by DisplayName pattern.
   */
  const searchNodes = useCallback(
    async (request: OpcUaSearchNodesRequest): Promise<OpcUaSearchResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.searchNodes(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search nodes'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Read comprehensive node attributes.
   */
  const readNodeAttributes = useCallback(
    async (request: OpcUaNodeAttributesRequest): Promise<OpcUaNodeAttributes | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.readNodeAttributes(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to read node attributes'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ==========================================================================
  // Read/Write
  // ==========================================================================

  /**
   * Read node values.
   */
  const read = useCallback(
    async (request: OpcUaReadRequest): Promise<OpcUaReadResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.read(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to read values'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Write node values.
   */
  const write = useCallback(
    async (request: OpcUaWriteRequest): Promise<OpcUaWriteResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.write(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to write values'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Create a subscription.
   */
  const createSubscription = useCallback(
    async (request: CreateSubscriptionRequest): Promise<OpcUaSubscription | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const subscription = await opcuaApi.createSubscription(request)
        return subscription
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create subscription'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Delete a subscription.
   */
  const deleteSubscription = useCallback(
    async (connectionId: string, subscriptionId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.deleteSubscription({ connectionId, subscriptionId })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete subscription'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Add a monitored item to a subscription.
   */
  const addMonitoredItem = useCallback(
    async (request: AddMonitoredItemRequest): Promise<MonitoredItem | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const item = await opcuaApi.addMonitoredItem(request)
        return item
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add monitored item'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Remove a monitored item from a subscription.
   */
  const removeMonitoredItem = useCallback(
    async (connectionId: string, subscriptionId: string, itemId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.removeMonitoredItem({
          connectionId,
          subscriptionId,
          itemId
        })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove monitored item'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ==========================================================================
  // Events (Alarms & Conditions)
  // ==========================================================================

  /**
   * Subscribe to events from a source node.
   */
  const subscribeEvents = useCallback(
    async (request: SubscribeEventsRequest): Promise<{ subscriptionId: string } | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.subscribeEvents(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to subscribe to events'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Unsubscribe from events.
   */
  const unsubscribeEvents = useCallback(
    async (connectionId: string, subscriptionId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.unsubscribeEvents({ connectionId, subscriptionId })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to unsubscribe from events'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Acknowledge a condition/alarm.
   */
  const acknowledgeCondition = useCallback(
    async (request: AcknowledgeConditionRequest): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.acknowledgeCondition(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to acknowledge condition'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Confirm a condition/alarm.
   */
  const confirmCondition = useCallback(
    async (request: ConfirmConditionRequest): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.confirmCondition(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to confirm condition'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ==========================================================================
  // Methods
  // ==========================================================================

  /**
   * Get method arguments (input/output definitions).
   */
  const getMethodArgs = useCallback(
    async (
      connectionId: string,
      objectId: string,
      methodId: string
    ): Promise<OpcUaMethodArguments | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.getMethodArgs({ connectionId, objectId, methodId })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get method arguments'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Call an OPC UA method.
   */
  const callMethod = useCallback(
    async (request: OpcUaCallMethodRequest): Promise<OpcUaCallMethodResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opcuaApi.callMethod(request)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to call method'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    // Discovery
    getEndpoints,
    testConnection,

    // Session
    getSessionStatus,

    // Browse
    browse,
    browseNext,
    browsePath,
    searchNodes,
    readNodeAttributes,

    // Read/Write
    read,
    write,

    // Subscriptions
    createSubscription,
    deleteSubscription,
    addMonitoredItem,
    removeMonitoredItem,

    // Events (Alarms & Conditions)
    subscribeEvents,
    unsubscribeEvents,
    acknowledgeCondition,
    confirmCondition,

    // Methods
    getMethodArgs,
    callMethod,

    // State
    isLoading,
    error,
    dataChanges,
    events,

    // Actions
    clearError,
    clearDataChanges,
    clearEvents
  }
}
