import { AppShell } from './components/layout/AppShell'
import { ThemeProvider } from './context/ThemeProvider'
import { Analytics } from './pages/Analytics'
import { Dashboard } from './pages/Dashboard'
import { Extraction } from './pages/Extraction'
import { ModulePlaceholder } from './pages/ModulePlaceholder'
import { Reports } from './pages/Reports'
import { useLayoutStore } from './store/useLayoutStore'

function ShellContent() {
  const activePage = useLayoutStore((state) => state.activePage)

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
