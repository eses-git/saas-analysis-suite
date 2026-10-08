import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDatasetStore } from '../../store/useDatasetStore'
import {
  buildCategoryData,
  buildDistributionData,
  buildTrendData,
  formatCompactNumber,
  formatNumber,
  getChartPalette,
  getCategoricalColumns,
  getDateColumns,
  getDefaultCategoryKey,
  getDefaultMetricKey,
  getNumericColumns,
} from '../../utils/analytics'
import type { CategoryDatum, DistributionDatum, TrendPoint } from '../../utils/analytics'

/** Theme-aware tooltip surface shared by every chart. */
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 0,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
}

const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: 'var(--surface-text)',
  fontWeight: 600,
}

interface TrendChartProps {
  data: TrendPoint[]
  metricLabel: string
  color: string
}

/** Line/area chart plotting the metric over time (or row sequence). */
function TrendChart({ data, metricLabel, color }: TrendChartProps) {
  return (
    <div className=" border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-surface-text">Trend Analysis</h3>
        <p className="text-xs text-surface-muted">{metricLabel} over time</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--surface-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCompactNumber}
              tick={{ fill: 'var(--surface-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value) => formatNumber(Number(value))}
              labelStyle={TOOLTIP_LABEL_STYLE}
              contentStyle={TOOLTIP_CONTENT_STYLE}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke={color}
              strokeWidth={2}
              fill="url(#trendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface CategoryChartProps {
  data: CategoryDatum[]
  metricLabel: string
  color: string
}

/** Horizontal bar chart comparing the metric across the top categories. */
function CategoryChart({ data, metricLabel, color }: CategoryChartProps) {
  return (
    <div className=" border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-surface-text">Category Comparison</h3>
        <p className="text-xs text-surface-muted">{metricLabel} by category</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatCompactNumber}
              tick={{ fill: 'var(--surface-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              tick={{ fill: 'var(--surface-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => formatNumber(Number(value))}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              cursor={{ fill: 'var(--surface-canvas)' }}
            />
            <Bar dataKey="value" name={metricLabel} fill={color} radius={[0, 0, 0, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface DistributionChartProps {
  data: DistributionDatum[]
}

/** Donut chart showing the percentage distribution across top categories. */
function DistributionChart({ data }: DistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className=" border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-surface-text">Distribution Breakdown</h3>
        <p className="text-xs text-surface-muted">Share by category</p>
      </div>

      <div className="flex flex-col items-center gap-6 lg:flex-row">
        <div className="h-64 w-full max-w-sm">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="var(--surface-card)" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  const num = Number(value)
                  const pct = total > 0 ? (num / total) * 100 : 0
                  return `${formatNumber(num)} (${pct.toFixed(1)}%)`
                }}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom, theme-aware legend */}
        <ul className="flex w-full flex-1 flex-col gap-2">
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 "
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex-1 truncate text-surface-muted">{entry.name}</span>
              <span className="font-medium tabular-nums text-surface-text">
                {formatNumber(entry.value)}
              </span>
              <span className="w-14 text-right tabular-nums text-surface-muted">
                {entry.percentage.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Interactive analytics suite: metric/category selectors + charts. */
export function AnalyticsView() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const selectedMetricKey = useDatasetStore((state) => state.filters.selectedMetricKey)
  const selectedCategoryKey = useDatasetStore((state) => state.filters.selectedCategoryKey)
  const setSelectedMetricKey = useDatasetStore((state) => state.setSelectedMetricKey)
  const setSelectedCategoryKey = useDatasetStore((state) => state.setSelectedCategoryKey)
  const chartPalette = useDatasetStore((state) => state.chartPalette)

  const palette = useMemo(() => getChartPalette(chartPalette), [chartPalette])
  const primaryColor = palette[0]

  const numericColumns = useMemo(() => getNumericColumns(currentDataset), [currentDataset])
  const categoricalColumns = useMemo(() => getCategoricalColumns(currentDataset), [currentDataset])
  const dateColumns = useMemo(() => getDateColumns(currentDataset), [currentDataset])

  const metricKey = useMemo(() => {
    if (numericColumns.some((column) => column.key === selectedMetricKey)) return selectedMetricKey
    return getDefaultMetricKey(currentDataset)
  }, [numericColumns, selectedMetricKey, currentDataset])

  const categoryKey = useMemo(() => {
    if (categoricalColumns.some((column) => column.key === selectedCategoryKey)) {
      return selectedCategoryKey
    }
    return getDefaultCategoryKey(currentDataset)
  }, [categoricalColumns, selectedCategoryKey, currentDataset])

  const dateKey = dateColumns.length > 0 ? dateColumns[0].key : null

  const metricLabel = useMemo(() => {
    if (currentDataset === null || metricKey === null) return ''
    return currentDataset.columns.find((column) => column.key === metricKey)?.label ?? metricKey
  }, [currentDataset, metricKey])

  const trendData = useMemo(
    () =>
      currentDataset !== null && metricKey !== null
        ? buildTrendData(currentDataset, metricKey, dateKey)
        : [],
    [currentDataset, metricKey, dateKey],
  )

  const categoryData = useMemo(
    () =>
      currentDataset !== null && metricKey !== null && categoryKey !== null
        ? buildCategoryData(currentDataset, metricKey, categoryKey)
        : [],
    [currentDataset, metricKey, categoryKey],
  )

  const distributionData = useMemo(
    () =>
      currentDataset !== null && metricKey !== null && categoryKey !== null
        ? buildDistributionData(currentDataset, metricKey, categoryKey, palette)
        : [],
    [currentDataset, metricKey, categoryKey, palette],
  )

  if (currentDataset === null) return null

  if (numericColumns.length === 0) {
    return (
      <div className=" border border-dashed border-surface-border bg-surface-card p-8 text-center text-sm text-surface-muted">
        This dataset has no numeric columns to visualize.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Interactive controls */}
      <div className="no-print flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-surface-muted">
          Metric
          <select
            value={metricKey ?? ''}
            onChange={(event) => setSelectedMetricKey(event.target.value)}
            className="h-9  border border-surface-border bg-surface-card px-2 text-sm text-surface-text focus:border-mint-500 focus:outline-none"
          >
            {numericColumns.map((column) => (
              <option key={column.key} value={column.key}>
                {column.label}
              </option>
            ))}
          </select>
        </label>

        {categoricalColumns.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-surface-muted">
            Category
            <select
              value={categoryKey ?? ''}
              onChange={(event) => setSelectedCategoryKey(event.target.value || null)}
              className="h-9  border border-surface-border bg-surface-card px-2 text-sm text-surface-text focus:border-mint-500 focus:outline-none"
            >
              {categoricalColumns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart data={trendData} metricLabel={metricLabel} color={primaryColor} />
        {categoricalColumns.length > 0 && (
          <CategoryChart data={categoryData} metricLabel={metricLabel} color={primaryColor} />
        )}
      </div>

      {categoricalColumns.length > 0 && <DistributionChart data={distributionData} />}
    </div>
  )
}


