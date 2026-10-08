import { Download, Printer } from 'lucide-react'
import { useDatasetStore } from '../../store/useDatasetStore'
import { exportDatasetCsv } from '../../utils/csv'

/**
 * Export controls for the loaded dataset: downloads the currently-filtered
 * rows as CSV, or triggers the browser's print dialog for an executive PDF
 * preview (the layout hides chrome/controls via `@media print`).
 */
export function ExportActions() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const searchQuery = useDatasetStore((state) => state.filters.searchQuery)

  if (currentDataset === null) return null

  return (
    <div className="no-print flex items-center gap-2">
      <button
        type="button"
        onClick={() => exportDatasetCsv(currentDataset, searchQuery)}
        className="inline-flex items-center gap-2  border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text transition-colors hover:bg-mint-50/50 hover:text-mint-700 dark:hover:bg-mint-900/10 dark:hover:text-mint-300"
      >
        <Download className="h-4 w-4 text-mint-500" />
        Export CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2  border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text transition-colors hover:bg-mint-50/50 hover:text-mint-700 dark:hover:bg-mint-900/10 dark:hover:text-mint-300"
      >
        <Printer className="h-4 w-4 text-mint-500" />
        Print / PDF
      </button>
    </div>
  )
}
