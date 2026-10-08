import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Calendar, Columns3, FileText, Rows3, Trash2, Upload, X } from 'lucide-react'
import { AnalyticsView } from '../components/analytics/AnalyticsView'
import { MetricCards } from '../components/analytics/MetricCards'
import { ExportActions } from '../components/controls/ExportActions'
import { DataGrid } from '../components/table/DataGrid'
import { Dropzone } from '../components/upload/Dropzone'
import { useDatasetStore } from '../store/useDatasetStore'

interface MetaItemProps {
  icon: LucideIcon
  label: string
  value: string
}

/** A single metadata label/value pair shown in the dataset header. */
function MetaItem({ icon: Icon, label, value }: MetaItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-mint-500" />
      <span className="text-surface-muted">{label}:</span>
      <span className="font-medium tabular-nums text-surface-text">{value}</span>
    </div>
  )
}

/** Formats an ISO timestamp into a compact, human-readable string. */
function formatUploadDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Dashboard() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const clearDataset = useDatasetStore((state) => state.clearDataset)

  const [replaceOpen, setReplaceOpen] = useState(false)
  const previousIdRef = useRef<string | null>(null)

  // Auto-close the replace panel once a new dataset has been loaded.
  useEffect(() => {
    if (replaceOpen && currentDataset !== null && currentDataset.id !== previousIdRef.current) {
      setReplaceOpen(false)
    }
    previousIdRef.current = currentDataset?.id ?? null
  }, [currentDataset, replaceOpen])

  const showUpload = currentDataset === null || replaceOpen

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-text">Dashboard</h1>
        <p className="mt-1 text-sm text-surface-muted">
          Upload a spreadsheet or load a sample to explore your data.
        </p>
      </div>

      {showUpload && (
        <section className="flex flex-col gap-3">
          {replaceOpen && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setReplaceOpen(false)}
                className="inline-flex items-center gap-1.5  px-2 py-1 text-sm font-medium text-surface-muted transition-colors hover:text-surface-text"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
          <Dropzone />
        </section>
      )}

      {currentDataset !== null && !replaceOpen && (
        <>
          {/* Dataset metadata header */}
          <section className=" border border-surface-border bg-surface-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center  bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-surface-text">
                      {currentDataset.fileName}
                    </h2>
                    <p className="text-xs text-surface-muted">Active dataset</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  <MetaItem icon={Rows3} label="Rows" value={currentDataset.rowCount.toLocaleString()} />
                  <MetaItem icon={Columns3} label="Columns" value={String(currentDataset.columns.length)} />
                  <MetaItem icon={Calendar} label="Uploaded" value={formatUploadDate(currentDataset.uploadedAt)} />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReplaceOpen(true)}
                  className="inline-flex items-center gap-2  border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text transition-colors hover:bg-mint-50/50 hover:text-mint-700 dark:hover:bg-mint-900/10 dark:hover:text-mint-300"
                >
                  <Upload className="h-4 w-4 text-mint-500" />
                  Replace File
                </button>
                <button
                  type="button"
                  onClick={clearDataset}
                  className="inline-flex items-center gap-2  border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Dataset
                </button>
              </div>
            </div>
          </section>

          <div className="no-print flex justify-end">
            <ExportActions />
          </div>

          <MetricCards />

          <AnalyticsView />

          <DataGrid />
        </>
      )}
    </div>
  )
}

