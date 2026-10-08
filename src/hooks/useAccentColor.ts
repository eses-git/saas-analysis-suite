import { useDatasetStore } from '../store/useDatasetStore'
import { getChartPalette } from '../utils/analytics'

/**
 * Returns the primary accent color of the currently-active chart palette.
 * Components use this to keep informational icons and accents in sync with the
 * selected palette.
 */
export function useAccentColor(): string {
  const chartPalette = useDatasetStore((state) => state.chartPalette)
  return getChartPalette(chartPalette)[0]
}
