// AEBACK appearance preference shared by the marketing site and workspace.
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

const storageKey = 'aeback-theme'

export type ThemeMode = 'dark' | 'light'

type ThemeContextValue = { theme: ThemeMode; toggleTheme: () => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): ThemeMode {
  try {
    return window.localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)
  const toggleTheme = useCallback(() => setTheme((current) => current === 'dark' ? 'light' : 'dark'), [])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // Keep the selected theme for this session if browser storage is unavailable.
    }
  }, [theme])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
