import { create } from 'zustand'
import type { PageKey } from '../types/navigation'

interface LayoutState {
  /** The view currently rendered in the content area. */
  activePage: PageKey
  /** Whether the desktop sidebar is collapsed to an icon rail. */
  sidebarCollapsed: boolean
  /** Whether the mobile navigation drawer is open. */
  mobileNavOpen: boolean
  setActivePage: (page: PageKey) => void
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activePage: 'dashboard',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  setActivePage: (page) => set({ activePage: page, mobileNavOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}))
