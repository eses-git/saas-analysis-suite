import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ThemeProvider } from './context/ThemeProvider'
import { Analytics } from './pages/Analytics'
import { Dashboard } from './pages/Dashboard'
import { Extraction } from './pages/Extraction'
import { ModulePlaceholder } from './pages/ModulePlaceholder'
import { Reports } from './pages/Reports'
import { useLayoutStore } from './store/useLayoutStore'
import { useDatasetStore } from './store/useDatasetStore'
import { getChartPalette } from './utils/analytics'

function ShellContent() {
  const activePage = useLayoutStore((state) => state.activePage)
  const chartPalette = useDatasetStore((state) => state.chartPalette)

  // Sync the active palette's primary color to a CSS variable so focus/hover
  // states and any `var(--accent)` consumers stay in sync with the charts.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', getChartPalette(chartPalette)[0])
  }, [chartPalette])

  return (
    <AppShell>
      {activePage === 'dashboard' ? (
        <Dashboard />
      ) : activePage === 'analytics' ? (
        <Analytics />
      ) : activePage === 'extraction' ? (
        <Extraction />
      ) : activePage === 'reports' ? (
        <Reports />
      ) : (
        <ModulePlaceholder page={activePage} />
      )}
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ShellContent />
    </ThemeProvider>
  )
}
