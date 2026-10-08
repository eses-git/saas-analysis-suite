import { Menu, Palette, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useLayoutStore } from '../../store/useLayoutStore'
import { useDatasetStore } from '../../store/useDatasetStore'
import { CHART_PALETTE_LABELS, getChartPalette } from '../../utils/analytics'
import type { ChartPaletteId } from '../../types/theme'
import { ThemeToggle } from './ThemeToggle'

export function Topbar() {
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar)
  const setMobileNavOpen = useLayoutStore((state) => state.setMobileNavOpen)
  const chartPalette = useDatasetStore((state) => state.chartPalette)
  const setChartPalette = useDatasetStore((state) => state.setChartPalette)
  const accentColor = getChartPalette(chartPalette)[0]

  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-3 border-b border-surface-border bg-surface-card px-4 lg:px-6">
      {/* Mobile: open the drawer. */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 items-center justify-center  text-surface-muted hover:bg-mint-50 hover:text-surface-text dark:hover:bg-mint-500/10 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop: collapse / expand the icon rail. */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden h-9 w-9 items-center justify-center  text-surface-muted hover:bg-mint-50 hover:text-surface-text dark:hover:bg-mint-500/10 lg:inline-flex"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-muted" />
        <input
          type="search"
          placeholder="Search extractions, reports…"
          className="h-9 w-full border border-surface-border bg-surface-canvas pl-9 pr-3 text-sm text-surface-text placeholder:text-surface-muted accent-focus focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Chart palette selector */}
        <label className="hidden items-center gap-2 sm:flex">
          <Palette className="h-4 w-4 text-surface-muted" />
          <select
            value={chartPalette}
            onChange={(event) => setChartPalette(event.target.value as ChartPaletteId)}
            aria-label="Chart color palette"
            className="h-9 border border-surface-border bg-surface-card px-2 text-sm text-surface-text focus:border-mint-500 focus:outline-none"
          >
            {(Object.keys(CHART_PALETTE_LABELS) as ChartPaletteId[]).map((id) => (
              <option key={id} value={id}>
                {CHART_PALETTE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <ThemeToggle />
        <div className="flex items-center gap-2 border-l border-surface-border pl-3">
          <span
            className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            EB
          </span>
          <div className="hidden text-sm leading-tight md:block">
            <p className="font-medium text-surface-text">Estera Bulkiewicz</p>
            <p className="text-xs text-surface-muted">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  )
}
