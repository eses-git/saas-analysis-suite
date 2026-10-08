import { Activity, ArrowUpRight, Database, Sigma } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useDatasetStore } from '../../store/useDatasetStore'
import { useAccentColor } from '../../hooks/useAccentColor'
import { formatNumber, getDefaultMetricKey, getNumericColumns } from '../../utils/analytics'

interface MetricCardProps {
  title: string
  icon: LucideIcon
  value: string
  sub?: string
  badge?: string
  accent: string
}

/** A single elevated metric card with an icon, value, and optional badge. */
function MetricCard({ title, icon: Icon, value, sub, badge, accent }: MetricCardProps) {
  return (
    <div className="border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-surface-muted">{title}</p>
        <span
          className="inline-flex h-9 w-9 items-center justify-center"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-surface-text">{value}</p>
      {sub !== undefined && <p className="mt-1 text-sm text-surface-muted">{sub}</p>}
      {badge !== undefined && (
        <span
          className="mt-2 inline-flex px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

/**
 * Executive summary cards calculated from the active dataset, driven by the
 * selected numeric metric column (mirrored to `filters.selectedMetricKey`).
 */
export function MetricCards() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const selectedMetricKey = useDatasetStore((state) => state.filters.selectedMetricKey)
  const setSelectedMetricKey = useDatasetStore((state) => state.setSelectedMetricKey)
  const accent = useAccentColor()

  if (currentDataset === null) return null

  const numericColumns = getNumericColumns(currentDataset)
  if (numericColumns.length === 0) return null

  const metricKey = numericColumns.some((column) => column.key === selectedMetricKey)
    ? selectedMetricKey
    : getDefaultMetricKey(currentDataset)

  if (metricKey === null) return null

  const metrics = currentDataset.summaryMetrics[metricKey]

  return (
    <div>
      {/* Metric selector */}
      <div className="no-print mb-4 flex items-center gap-2">
        <label htmlFor="metric-select" className="text-sm text-surface-muted">
          Metric
        </label>
        <select
          id="metric-select"
          value={metricKey}
          onChange={(event) => setSelectedMetricKey(event.target.value)}
          className="h-9  border border-surface-border bg-surface-card px-2 text-sm text-surface-text focus:border-mint-500 focus:outline-none"
        >
          {numericColumns.map((column) => (
            <option key={column.key} value={column.key}>
              {column.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Records"
          icon={Database}
          value={currentDataset.rowCount.toLocaleString()}
          accent={accent}
        />
        <MetricCard title="Total Sum" icon={Sigma} value={formatNumber(metrics.sum)} badge="Σ aggregate" accent={accent} />
        <MetricCard title="Average" icon={Activity} value={formatNumber(metrics.avg)} accent={accent} />
        <MetricCard
          title="Peak / Floor"
          icon={ArrowUpRight}
          value={formatNumber(metrics.max)}
          sub={`Floor ${formatNumber(metrics.min)}`}
          badge="Peak"
          accent={accent}
        />
      </div>
    </div>
  )
}
