/**
 * Zustand store for OPC UA state management.
 * Manages OPC UA browsing, subscriptions, and events.
 */

import { create } from 'zustand'
import type {
  OpcUaNode,
  OpcUaSubscription,
  OpcUaEvent,
  OpcUaCertificate,
  OpcUaEndpoint
} from '@shared/types'

export interface OpcUaState {
  // Node browsing
  browseTree: Map<string, OpcUaNode[]>
  expandedNodes: Set<string>
  selectedNodeId: string | null

  // Subscriptions
  subscriptions: OpcUaSubscription[]
  selectedSubscriptionId: string | null

  // Events
  recentEvents: OpcUaEvent[]

  // Certificates
  certificates: OpcUaCertificate[]

  // Endpoints (cached from discovery)
  cachedEndpoints: Map<string, OpcUaEndpoint[]>

  // Actions - Browsing
  setBrowseChildren: (parentId: string, children: OpcUaNode[]) => void
  toggleNodeExpanded: (nodeId: string) => void
  setSelectedNode: (nodeId: string | null) => void
  clearBrowseTree: () => void

  // Actions - Subscriptions
  addSubscription: (subscription: OpcUaSubscription) => void
  updateSubscription: (id: string, updates: Partial<OpcUaSubscription>) => void
  removeSubscription: (id: string) => void
  setSubscriptions: (subscriptions: OpcUaSubscription[]) => void
  setSelectedSubscription: (id: string | null) => void

  // Actions - Events
  addEvent: (event: OpcUaEvent) => void
  setRecentEvents: (events: OpcUaEvent[]) => void
  clearEvents: () => void

  // Actions - Certificates
  addCertificate: (cert: OpcUaCertificate) => void
  updateCertificate: (id: string, updates: Partial<OpcUaCertificate>) => void
  removeCertificate: (id: string) => void
  setCertificates: (certs: OpcUaCertificate[]) => void

  // Actions - Endpoints
  cacheEndpoints: (serverUrl: string, endpoints: OpcUaEndpoint[]) => void
  clearEndpointCache: () => void
}

export const useOpcUaStore = create<OpcUaState>((set) => ({
  browseTree: new Map(),
  expandedNodes: new Set(),
  selectedNodeId: null,
  subscriptions: [],
  selectedSubscriptionId: null,
  recentEvents: [],
  certificates: [],
  cachedEndpoints: new Map(),

  // Browsing actions
  setBrowseChildren: (parentId: string, children: OpcUaNode[]) => {
    set((state) => {
      const newTree = new Map(state.browseTree)
      newTree.set(parentId, children)
      return { browseTree: newTree }
    })
  },

  toggleNodeExpanded: (nodeId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedNodes)
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      return { expandedNodes: newExpanded }
    })
  },

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId })
  },

  clearBrowseTree: () => {
    set({
      browseTree: new Map(),
      expandedNodes: new Set(),
      selectedNodeId: null
    })
  },

  // Subscription actions
  addSubscription: (subscription: OpcUaSubscription) => {
    set((state) => ({
      subscriptions: [...state.subscriptions, subscription]
    }))
  },

  updateSubscription: (id: string, updates: Partial<OpcUaSubscription>) => {
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) =>
        sub.id === id ? { ...sub, ...updates } : sub
      )
    }))
  },

  removeSubscription: (id: string) => {
    set((state) => {
      const newSubs = state.subscriptions.filter((sub) => sub.id !== id)
      const newSelectedId = state.selectedSubscriptionId === id ? null : state.selectedSubscriptionId
      return {
        subscriptions: newSubs,
        selectedSubscriptionId: newSelectedId
      }
    })
  },

  setSubscriptions: (subscriptions: OpcUaSubscription[]) => {
    set((state) => {
      const newSelectedId =
        state.selectedSubscriptionId &&
        subscriptions.some((s) => s.id === state.selectedSubscriptionId)
          ? state.selectedSubscriptionId
          : null
      return {
        subscriptions,
        selectedSubscriptionId: newSelectedId
      }
    })
  },

  setSelectedSubscription: (id: string | null) => {
    set({ selectedSubscriptionId: id })
  },

  // Event actions
  addEvent: (event: OpcUaEvent) => {
    set((state) => {
      // Keep only the most recent 200 events
      const newEvents = [event, ...state.recentEvents].slice(0, 200)
      return { recentEvents: newEvents }
    })
  },

  setRecentEvents: (events: OpcUaEvent[]) => {
    set({ recentEvents: events })
  },

  clearEvents: () => {
    set({ recentEvents: [] })
  },

  // Certificate actions
  addCertificate: (cert: OpcUaCertificate) => {
    set((state) => ({
      certificates: [...state.certificates, cert]
    }))
  },

  updateCertificate: (id: string, updates: Partial<OpcUaCertificate>) => {
    set((state) => ({
      certificates: state.certificates.map((cert) =>
        cert.id === id ? { ...cert, ...updates } : cert
      )
    }))
  },

  removeCertificate: (id: string) => {
    set((state) => ({
      certificates: state.certificates.filter((cert) => cert.id !== id)
    }))
  },

  setCertificates: (certs: OpcUaCertificate[]) => {
    set({ certificates: certs })
  },

  // Endpoint actions
  cacheEndpoints: (serverUrl: string, endpoints: OpcUaEndpoint[]) => {
    set((state) => {
      const newCache = new Map(state.cachedEndpoints)
      newCache.set(serverUrl, endpoints)
      return { cachedEndpoints: newCache }
    })
  },

  clearEndpointCache: () => {
    set({ cachedEndpoints: new Map() })
  }
}))

// Selector helpers
export const selectBrowseTree = (state: OpcUaState) => state.browseTree
export const selectExpandedNodes = (state: OpcUaState) => state.expandedNodes
export const selectSelectedNodeId = (state: OpcUaState) => state.selectedNodeId
export const selectNodeChildren = (parentId: string) => (state: OpcUaState) =>
  state.browseTree.get(parentId) ?? []
export const selectIsNodeExpanded = (nodeId: string) => (state: OpcUaState) =>
  state.expandedNodes.has(nodeId)

export const selectSubscriptions = (state: OpcUaState) => state.subscriptions
export const selectSelectedSubscriptionId = (state: OpcUaState) => state.selectedSubscriptionId
export const selectSelectedSubscription = (state: OpcUaState) =>
  state.subscriptions.find((s) => s.id === state.selectedSubscriptionId)
export const selectSubscriptionById = (id: string) => (state: OpcUaState) =>
  state.subscriptions.find((s) => s.id === id)

export const selectRecentEvents = (state: OpcUaState) => state.recentEvents
export const selectCertificates = (state: OpcUaState) => state.certificates
export const selectTrustedCertificates = (state: OpcUaState) =>
  state.certificates.filter((c) => c.trusted)
export const selectCachedEndpoints = (serverUrl: string) => (state: OpcUaState) =>
  state.cachedEndpoints.get(serverUrl) ?? []
