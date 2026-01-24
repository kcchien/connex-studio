/**
 * UI Store
 *
 * Manages global UI state including:
 * - Theme (light/dark/system)
 * - Sidebar collapse state
 * - Log viewer visibility
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface UIState {
  // Theme
  theme: Theme
  resolvedTheme: 'light' | 'dark' // Actual applied theme (resolved from system)

  // Sidebar
  sidebarCollapsed: boolean

  // Log viewer
  logViewerOpen: boolean

  // Actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setLogViewerOpen: (open: boolean) => void
  toggleLogViewer: () => void
}

/**
 * Resolve the actual theme from 'system' to 'light' or 'dark'.
 */
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

/**
 * Apply the theme to the document.
 */
function applyTheme(resolvedTheme: 'light' | 'dark'): void {
  const root = document.documentElement
  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      resolvedTheme: resolveTheme('system'),
      sidebarCollapsed: false,
      logViewerOpen: false,

      // Theme actions
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme)
        applyTheme(resolvedTheme)
        set({ theme, resolvedTheme })
      },

      toggleTheme: () => {
        const { theme } = get()
        // Cycle through: light -> dark -> system -> light
        const nextTheme: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
        const resolvedTheme = resolveTheme(nextTheme)
        applyTheme(resolvedTheme)
        set({ theme: nextTheme, resolvedTheme })
      },

      // Sidebar actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Log viewer actions
      setLogViewerOpen: (open) => set({ logViewerOpen: open }),
      toggleLogViewer: () => set((state) => ({ logViewerOpen: !state.logViewerOpen }))
    }),
    {
      name: 'connex-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed
        // Don't persist logViewerOpen - always start closed
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Apply saved theme on rehydration
            const resolvedTheme = resolveTheme(state.theme)
            applyTheme(resolvedTheme)
            state.resolvedTheme = resolvedTheme
          }
        }
      }
    }
  )
)

// Listen for system theme changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    const state = useUIStore.getState()
    if (state.theme === 'system') {
      const resolvedTheme = resolveTheme('system')
      applyTheme(resolvedTheme)
      useUIStore.setState({ resolvedTheme })
    }
  })
}
