import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import type { NavItem } from '../../types/navigation'

/** Primary navigation rendered above the divider in the sidebar. */
export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'extraction', label: 'Extraction', icon: FileSpreadsheet },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'reports', label: 'Reports', icon: FileText },
]

/** Secondary navigation rendered below the divider in the sidebar. */
export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { key: 'settings', label: 'Settings', icon: Settings },
]
