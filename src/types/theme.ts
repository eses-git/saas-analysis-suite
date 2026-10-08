/** The user's theme preference. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** The theme that is actually applied after resolving `system`. */
export type ResolvedTheme = 'light' | 'dark'

/** Identifier for a selectable chart color palette. */
export type ChartPaletteId = 'mint-emerald' | 'cyber-indigo' | 'ocean-cyan' | 'sunset-amber'

/** Public API exposed by the theme engine context. */
export interface ThemeContextValue {
  /** The raw user-selected preference (may be `system`). */
  mode: ThemeMode
  /** The resolved light/dark theme currently applied. */
  resolvedTheme: ResolvedTheme
  /** Persist and apply a new preference. */
  setMode: (mode: ThemeMode) => void
  /** Flip between light and dark (ignores `system`). */
  toggleTheme: () => void
}
