import { PanelsTopLeft, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useLayoutStore } from '../../store/useLayoutStore'
import { useAccentColor } from '../../hooks/useAccentColor'
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './navigation'
import type { NavItem } from '../../types/navigation'

interface NavItemButtonProps {
  item: NavItem
}

function NavItemButton({ item }: NavItemButtonProps) {
  const activePage = useLayoutStore((state) => state.activePage)
  const setActivePage = useLayoutStore((state) => state.setActivePage)
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const accent = useAccentColor()
  const isActive = activePage === item.key
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => setActivePage(item.key)}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      style={isActive ? { backgroundColor: accent } : undefined}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        isActive
          ? 'text-white shadow-sm'
          : 'text-surface-muted hover:bg-mint-50 hover:text-surface-text dark:hover:bg-mint-500/10 dark:hover:text-surface-text',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </button>
  )
}

export function Sidebar() {
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const mobileNavOpen = useLayoutStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useLayoutStore((state) => state.setMobileNavOpen)

  return (
    <>
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 no-print lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-border bg-surface-card transition-[width,transform] duration-200 lg:static lg:translate-x-0',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center gap-2 border-b border-surface-border px-4',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center  bg-mint-500 text-white">
            <PanelsTopLeft className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight text-surface-text">
              Analytics Suite
            </span>
          )}
          <button
            type="button"
            className="ml-auto  p-1 text-surface-muted hover:bg-mint-50 hover:text-surface-text dark:hover:bg-mint-500/10 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavItemButton key={item.key} item={item} />
            ))}
          </div>
          <div className="flex flex-col gap-1 border-t border-surface-border pt-4">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <NavItemButton key={item.key} item={item} />
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
