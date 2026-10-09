import { useDatasetStore } from '../../store/useDatasetStore'
import { filterRowsByQuery } from '../../utils/csv'
import { formatNumber } from '../../utils/analytics'
import { cn } from '../../lib/utils'
import type { ColumnSchema } from '../../types/dataset'

/**
 * Coerces a raw cell value into a finite number, stripping currency glyphs and
 * thousands separators so numeric strings render with locale formatting.
 */
function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$€£¥,]/g, '').trim()
    if (cleaned === '') return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Formats a date value as a legible, locale-aware date string. */
function formatDate(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString('en-US')
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-US')
  }
  return String(value)
}

/**
 * Renders a cell value for the print table: numeric columns use locale
 * formatting, date columns use a legible date string, everything else is
 * stringified. Always returns a plain string, which React renders as escaped
 * text (never raw HTML).
 *
 * @author Estera Bulkiewicz
 */
function formatCellValue(value: unknown, column: ColumnSchema): string {
  if (value === null || value === undefined || value === '') return '—'
  if (column.isNumeric) {
    const num = coerceNumber(value)
    return num === null ? String(value) : formatNumber(num)
  }
  if (column.isDate) return formatDate(value)
  return String(value)
}

/**
 * Print-optimized, unpaginated data table that renders every search-filtered
 * row in the loaded dataset. Used by the Reports "Print All Extracted Records"
 * scope so complete datasets can be exported to PDF without the 10-row page
 * limit.
 *
 * @author Estera Bulkiewicz
 */
export function FullDataTable() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const searchQuery = useDatasetStore((state) => state.filters.searchQuery)

  if (currentDataset === null) return null

  const rows = filterRowsByQuery(currentDataset.rawData, searchQuery)
  const numericKeys = new Set(
    currentDataset.columns.filter((column) => column.isNumeric).map((column) => column.key),
  )

  return (
    <section className="border border-surface-border bg-surface-card shadow-sm">
      <div className="print-avoid-break flex flex-col gap-1 border-b border-surface-border px-5 py-4">
        <h2 className="text-sm font-semibold text-surface-text">All Extracted Records</h2>
        <p className="text-xs text-surface-muted">
          {rows.length.toLocaleString()} rows · {currentDataset.columns.length} columns
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface-canvas">
            <tr>
              {currentDataset.columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'border-b border-surface-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-surface-muted',
                    numericKeys.has(column.key) && 'text-right',
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-surface-border/60">
                {currentDataset.columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-2 text-surface-text',
                      numericKeys.has(column.key) && 'text-right tabular-nums',
                    )}
                  >
                    {formatCellValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
