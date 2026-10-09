import { useState } from 'react'
import { Check, Copy, FileText } from 'lucide-react'
import { AnalyticsView } from '../components/analytics/AnalyticsView'
import { MetricCards } from '../components/analytics/MetricCards'
import { ExportActions } from '../components/controls/ExportActions'
import { FullDataTable } from '../components/table/FullDataTable'
import { useDatasetStore } from '../store/useDatasetStore'
import { formatNumber } from '../utils/analytics'
import type { ParsedDataset } from '../types/dataset'

/**
 * Print scope for the executive report: render only the on-screen summary, or
 * include a full, unpaginated table of every extracted (filtered) record.
 *
 * @author Estera Bulkiewicz
 */
type PrintMode = 'current-view' | 'all-records'

/** Builds a plain-text executive summary for clipboard copying. */
function buildSummaryText(dataset: ParsedDataset): string {
  const lines: string[] = [
    `Report: ${dataset.fileName}`,
    `Generated: ${new Date().toLocaleString('en-US')}`,
    'Author: Estera Bulkiewicz',
    `Rows: ${dataset.rowCount.toLocaleString()}`,
    `Columns: ${dataset.columns.length}`,
    '',
  ]
  for (const [key, metrics] of Object.entries(dataset.summaryMetrics)) {
    const label = dataset.columns.find((column) => column.key === key)?.label ?? key
    lines.push(
      `${label}: sum=${formatNumber(metrics.sum)}, avg=${formatNumber(metrics.avg)}, min=${formatNumber(metrics.min)}, max=${formatNumber(metrics.max)}`,
    )
  }
  return lines.join('\n')
}

/** Executive report generation view, optimized for print/PDF output. */
export function Reports() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const [copied, setCopied] = useState(false)
  const [printMode, setPrintMode] = useState<PrintMode>('current-view')

  if (currentDataset === null) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-text">Reports</h1>
          <p className="mt-1 text-sm text-surface-muted">
            Generate an executive summary from your dataset.
          </p>
        </div>
        <div className="flex min-h-[50vh] flex-col items-center justify-center border border-dashed border-surface-border bg-surface-card px-6 text-center">
          <FileText className="mb-4 h-10 w-10 text-mint-500" />
          <h2 className="text-lg font-semibold text-surface-text">No dataset loaded</h2>
          <p className="mt-2 max-w-md text-sm text-surface-muted">
            Load a dataset from the Dashboard to generate a report.
          </p>
        </div>
      </div>
    )
  }

  const handleCopySummary = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(currentDataset))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be unavailable in non-secure contexts; fail silently.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Report header */}
      <section className="border border-surface-border bg-surface-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-surface-text">Executive Report</h1>
            <p className="mt-1 text-sm text-surface-text">{currentDataset.fileName}</p>
            <p className="mt-1 text-xs text-surface-muted">
              Generated {new Date().toLocaleString('en-US')} · Prepared by Estera Bulkiewicz
            </p>
          </div>

          {/* Export action toolbar */}
          <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
            <ExportActions />
            <label className="flex items-center gap-2 text-sm text-surface-muted">
              Print scope
              <select
                value={printMode}
                onChange={(event) => setPrintMode(event.target.value as PrintMode)}
                aria-label="Print scope"
                className="h-9 rounded-none border border-surface-border bg-surface-card px-2 text-sm text-surface-text focus:border-mint-500 focus:outline-none"
              >
                <option value="current-view">Print Current View</option>
                <option value="all-records">Print All Extracted Records</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void handleCopySummary()}
              className="inline-flex items-center gap-2 border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text transition-colors hover:bg-mint-50/50 hover:text-mint-700 dark:hover:bg-mint-900/10 dark:hover:text-mint-300"
            >
              {copied ? <Check className="h-4 w-4 text-mint-500" /> : <Copy className="h-4 w-4 text-mint-500" />}
              {copied ? 'Copied' : 'Copy Summary'}
            </button>
          </div>
        </div>
      </section>

      {/* Executive snapshot */}
      <MetricCards />

      {/* Printable Recharts visualizations */}
      <div className={printMode === 'all-records' ? 'print-break-after' : undefined}>
        <AnalyticsView />
      </div>

      {/* Full, unpaginated record table (print scope: all extracted records) */}
      {printMode === 'all-records' && <FullDataTable />}
    </div>
  )
}
