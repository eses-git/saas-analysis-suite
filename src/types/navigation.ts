import type { LucideIcon } from 'lucide-react'

/** Stable identifiers for every top-level view in the shell. */
export type PageKey =
  | 'dashboard'
  | 'extraction'
  | 'analytics'
  | 'reports'
  | 'settings'

/** A single navigation entry rendered in the sidebar. */
export interface NavItem {
  key: PageKey
  label: string
  icon: LucideIcon
}
