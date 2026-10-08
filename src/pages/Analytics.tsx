import { BarChart3 } from 'lucide-react'
import { AnalyticsView } from '../components/analytics/AnalyticsView'
import { MetricCards } from '../components/analytics/MetricCards'
import { ExportActions } from '../components/controls/ExportActions'
import { useDatasetStore } from '../store/useDatasetStore'

/** Full-page analytics view: metric cards and the Recharts suite. */
export function Analytics() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-text">Analytics</h1>
        <p className="mt-1 text-sm text-surface-muted">
          Explore trends, distributions, and key metrics across your dataset.
        </p>
      </div>

      {currentDataset === null ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center  border border-dashed border-surface-border bg-surface-card px-6 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center  bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-400">
            <BarChart3 className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-semibold text-surface-text">No dataset loaded</h2>
          <p className="mt-2 max-w-md text-sm text-surface-muted">
            Load a dataset from the Dashboard to start exploring trends and distributions.
          </p>
        </div>
      ) : (
        <>
          <div className="no-print flex justify-end">
            <ExportActions />
          </div>
          <MetricCards />
          <AnalyticsView />
        </>
      )}
    </div>
  )
}
