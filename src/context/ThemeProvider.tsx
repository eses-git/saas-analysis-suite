import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext } from './ThemeContext'
import type { ResolvedTheme, ThemeContextValue, ThemeMode } from '../types/theme'

const STORAGE_KEY = 'saas-analytics-suite.theme'

function readStoredMode(): ThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }
  return readStoredMode()
}

function getSystemPreference(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(getSystemPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPreference(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemPreference : mode

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const value = useMemo<ThemeContextValue>(() => {
    const persist = (next: ThemeMode): void => {
      window.localStorage.setItem(STORAGE_KEY, next)
    }

    return {
      mode,
      resolvedTheme,
      setMode: (next: ThemeMode) => {
        setMode(next)
        persist(next)
      },
      toggleTheme: () => {
        const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark'
        setMode(next)
        persist(next)
      },
    }
  }, [mode, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
