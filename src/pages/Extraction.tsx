import { Calendar, Database, FileSpreadsheet, HardDrive, Hash, ToggleLeft, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DataGrid } from '../components/table/DataGrid'
import { Dropzone } from '../components/upload/Dropzone'
import { useDatasetStore } from '../store/useDatasetStore'
import { formatNumber } from '../utils/analytics'
import type { DataType } from '../types/dataset'

/** Icon + badge styling for each detected column type. */
const TYPE_META: Record<DataType, { icon: LucideIcon; className: string }> = {
  number: { icon: Hash, className: 'bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-400' },
  date: { icon: Calendar, className: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  boolean: { icon: ToggleLeft, className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  string: { icon: Type, className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300' },
}

/** Formats a byte count into a human-readable size string. */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

/** Formats an ISO timestamp into a legible date string. */
function formatUploadDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface MetaItemProps {
  icon: LucideIcon
  label: string
  value: string
}

function MetaItem({ icon: Icon, label, value }: MetaItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-surface-muted">
        <Icon className="h-3.5 w-3.5 text-mint-500" />
        {label}
      </span>
      <span className="truncate text-sm font-medium text-surface-text" title={value}>
        {value}
      </span>
    </div>
  )
}

/** Dedicated extraction view: schema inspection, quick metrics, and raw data. */
export function Extraction() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)

  if (currentDataset === null) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-text">Extraction</h1>
          <p className="mt-1 text-sm text-surface-muted">
            Upload a spreadsheet to inspect its schema and extracted rows.
          </p>
        </div>
        <Dropzone />
      </div>
    )
  }

  const numericColumns = currentDataset.columns.filter((column) => column.isNumeric)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-text">Extraction</h1>
        <p className="mt-1 text-sm text-surface-muted">
          Schema inspection and raw data for {currentDataset.fileName}.
        </p>
      </div>

      {/* File metadata / sanity check */}
      <section className="border border-surface-border bg-surface-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-surface-text">File metadata</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetaItem icon={FileSpreadsheet} label="File" value={currentDataset.fileName} />
          <MetaItem icon={HardDrive} label="Size" value={formatFileSize(currentDataset.fileSize)} />
          <MetaItem icon={Database} label="Rows" value={currentDataset.rowCount.toLocaleString()} />
          <MetaItem icon={Calendar} label="Uploaded" value={formatUploadDate(currentDataset.uploadedAt)} />
        </div>
      </section>

      {/* Schema inspection table */}
      <section className="border border-surface-border bg-surface-card shadow-sm">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="text-sm font-semibold text-surface-text">Detected columns</h2>
          <p className="text-xs text-surface-muted">{currentDataset.columns.length} columns</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-surface-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-surface-muted">Header</th>
                <th className="border-b border-surface-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-surface-muted">Normalized key</th>
                <th className="border-b border-surface-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-surface-muted">Type</th>
              </tr>
            </thead>
            <tbody>
              {currentDataset.columns.map((column) => {
                const meta = TYPE_META[column.type]
                const Icon = meta.icon
                return (
                  <tr key={column.key} className="border-b border-surface-border/60">
                    <td className="px-5 py-3 text-surface-text">{column.label}</td>
                    <td className="px-5 py-3 font-mono text-xs text-surface-muted">{column.key}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {column.type}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick metrics */}
      {numericColumns.length > 0 && (
        <section className="border border-surface-border bg-surface-card shadow-sm">
          <div className="border-b border-surface-border px-5 py-4">
            <h2 className="text-sm font-semibold text-surface-text">Quick metrics</h2>
            <p className="text-xs text-surface-muted">Raw numeric aggregations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-surface-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-surface-muted">Column</th>
                  <th className="border-b border-surface-border px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-muted">Sum</th>
                  <th className="border-b border-surface-border px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-muted">Avg</th>
                  <th className="border-b border-surface-border px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-muted">Min</th>
                  <th className="border-b border-surface-border px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-muted">Max</th>
                </tr>
              </thead>
              <tbody>
                {numericColumns.map((column) => {
                  const metrics = currentDataset.summaryMetrics[column.key]
                  return (
                    <tr key={column.key} className="border-b border-surface-border/60">
                      <td className="px-5 py-3 text-surface-text">{column.label}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-surface-text">{formatNumber(metrics.sum)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-surface-text">{formatNumber(metrics.avg)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-surface-text">{formatNumber(metrics.min)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-surface-text">{formatNumber(metrics.max)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Embedded data grid */}
      <DataGrid />
    </div>
  )
}
