import type { ColumnSchema, ParsedDataset } from '../types/dataset'
import type { ChartPaletteId } from '../types/theme'

/** Slate color reserved for the aggregated "Other" donut slice. */
const OTHER_COLOR = '#94A3B8'

/** Selectable chart color palettes, keyed by palette id. */
export const CHART_PALETTES: Record<ChartPaletteId, readonly string[]> = {
  'mint-emerald': ['#10B981', '#34D399', '#059669', '#38BDF8', '#818CF8'],
  'cyber-indigo': ['#6366F1', '#818CF8', '#A855F7', '#EC4899', '#38BDF8'],
  'ocean-cyan': ['#06B6D4', '#22D3EE', '#0284C7', '#38BDF8', '#10B981'],
  'sunset-amber': ['#F59E0B', '#FBBF24', '#F97316', '#EF4444', '#EC4899'],
}

/** Human-readable labels for each palette (used in the selector). */
export const CHART_PALETTE_LABELS: Record<ChartPaletteId, string> = {
  'mint-emerald': 'Mint Emerald',
  'cyber-indigo': 'Cyber Indigo',
  'ocean-cyan': 'Ocean Cyan',
  'sunset-amber': 'Sunset Amber',
}

/** Returns the color array for a given palette id. */
export function getChartPalette(id: ChartPaletteId): readonly string[] {
  return CHART_PALETTES[id]
}

/** Maximum number of categories rendered in the bar chart. */
export const MAX_BAR_CATEGORIES = 10

/** Maximum number of named slices (plus "Other") in the donut chart. */
export const MAX_DONUT_SLICES = 5

/** Maximum number of points plotted on the trend line (downsampled). */
export const MAX_TREND_POINTS = 100

/** A single point on the trend (line/area) chart. */
export interface TrendPoint {
  label: string
  value: number
}

/** An aggregated category and its summed metric value (bar chart). */
export interface CategoryDatum {
  name: string
  value: number
}

/** A donut slice with its share of the whole and a palette color. */
export interface DistributionDatum {
  name: string
  value: number
  percentage: number
  color: string
}

/** Coerces a raw cell value into a finite number, stripping currency glyphs. */
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

/** Coerces a raw cell value into a sortable timestamp, or null if not a date. */
function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const time = Date.parse(value)
    return Number.isNaN(time) ? null : time
  }
  return null
}

/** Numeric columns of a dataset (empty when the dataset is null). */
export function getNumericColumns(dataset: ParsedDataset | null): ColumnSchema[] {
  return dataset?.columns.filter((column) => column.isNumeric) ?? []
}

/** Categorical (non-numeric, non-date) columns of a dataset. */
export function getCategoricalColumns(dataset: ParsedDataset | null): ColumnSchema[] {
  return dataset?.columns.filter((column) => !column.isNumeric && !column.isDate) ?? []
}

/** Date columns of a dataset. */
export function getDateColumns(dataset: ParsedDataset | null): ColumnSchema[] {
  return dataset?.columns.filter((column) => column.isDate) ?? []
}

/** First numeric column key, or null when the dataset has none. */
export function getDefaultMetricKey(dataset: ParsedDataset | null): string | null {
  const numeric = getNumericColumns(dataset)
  return numeric.length > 0 ? numeric[0].key : null
}

/**
 * Returns a categorical column key for grouping, preferring the
 * lowest-cardinality column (the most meaningful grouping dimension), or null
 * when the dataset has no categorical columns.
 */
export function getDefaultCategoryKey(dataset: ParsedDataset | null): string | null {
  if (dataset === null) return null
  const categorical = getCategoricalColumns(dataset)
  if (categorical.length === 0) return null

  let best = categorical[0]
  let bestCardinality = Number.POSITIVE_INFINITY
  for (const column of categorical) {
    const cardinality = new Set(dataset.rawData.map((row) => row[column.key])).size
    if (cardinality < bestCardinality) {
      bestCardinality = cardinality
      best = column
    }
  }
  return best.key
}

/** Locale-aware number formatting for metric values (max 2 decimals). */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** Compact notation ("12.8K") for chart axis ticks. */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** Formats a raw date value into a short, legible label. */
function formatDateLabel(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    }
    return value
  }
  return String(value ?? '')
}

/** Evenly downsamples a series to `MAX_TREND_POINTS` when it is too dense. */
function downsample(points: TrendPoint[]): TrendPoint[] {
  if (points.length <= MAX_TREND_POINTS) return points
  const step = points.length / MAX_TREND_POINTS
  const sampled: TrendPoint[] = []
  for (let i = 0; i < MAX_TREND_POINTS; i += 1) {
    sampled.push(points[Math.floor(i * step)])
  }
  return sampled
}

/**
 * Builds the trend series for the line/area chart. When a date column is
 * available, rows are grouped by date (summing the metric) and sorted
 * chronologically; otherwise the metric is plotted against its row index.
 */
export function buildTrendData(
  dataset: ParsedDataset,
  metricKey: string,
  dateKey: string | null,
): TrendPoint[] {
  if (dateKey !== null) {
    // Group by date label and sum the metric, then sort chronologically.
    const buckets = new Map<string, { label: string; value: number; time: number }>()
    for (const row of dataset.rawData) {
      const label = formatDateLabel(row[dateKey])
      const time = toTimestamp(row[dateKey])
      const value = coerceNumber(row[metricKey]) ?? 0
      const existing = buckets.get(label)
      if (existing === undefined) {
        buckets.set(label, { label, value, time: time ?? 0 })
      } else {
        existing.value += value
        if (time !== null && time < existing.time) existing.time = time
      }
    }
    return downsample(
      Array.from(buckets.values())
        .sort((a, b) => a.time - b.time)
        .map(({ label, value }) => ({ label, value })),
    )
  }

  // No date column: plot the metric against the row index (downsampled).
  return downsample(
    dataset.rawData.map((row, index) => ({
      label: `#${index + 1}`,
      value: coerceNumber(row[metricKey]) ?? 0,
    })),
  )
}

/**
 * Aggregates the metric by a categorical column (summed), sorted descending,
 * capped at `limit` categories.
 */
export function buildCategoryData(
  dataset: ParsedDataset,
  metricKey: string,
  categoryKey: string,
  limit: number = MAX_BAR_CATEGORIES,
): CategoryDatum[] {
  const buckets = new Map<string, number>()
  for (const row of dataset.rawData) {
    const name = String(row[categoryKey] ?? '—')
    const value = coerceNumber(row[metricKey]) ?? 0
    buckets.set(name, (buckets.get(name) ?? 0) + value)
  }
  return Array.from(buckets.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/**
 * Aggregates the metric by category for the donut chart: the top `limit`
 * slices plus an "Other" bucket, each with its percentage share and color.
 */
export function buildDistributionData(
  dataset: ParsedDataset,
  metricKey: string,
  categoryKey: string,
  palette: readonly string[],
  limit: number = MAX_DONUT_SLICES,
): DistributionDatum[] {
  const sorted = buildCategoryData(dataset, metricKey, categoryKey, Number.MAX_SAFE_INTEGER)
  const total = sorted.reduce((sum, item) => sum + item.value, 0)

  const top = sorted.slice(0, limit)
  const topSum = top.reduce((sum, item) => sum + item.value, 0)
  const otherValue = total - topSum

  const slices: DistributionDatum[] = top.map((item, index) => ({
    name: item.name,
    value: item.value,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
    color: palette[index % palette.length],
  }))

  if (otherValue > 0) {
    slices.push({
      name: 'Other',
      value: otherValue,
      percentage: total > 0 ? (otherValue / total) * 100 : 0,
      color: OTHER_COLOR,
    })
  }

  return slices
}

