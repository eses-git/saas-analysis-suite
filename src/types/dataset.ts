/** Primitive categories a column can be inferred as during ingestion. */
export type DataType = 'string' | 'number' | 'date' | 'boolean'

/**
 * Describes a single column after ingestion.
 *
 * `key` is a sanitized, machine-friendly identifier safe for table headers and
 * chart series keys, while `label` preserves the original header text.
 */
export interface ColumnSchema {
  /** Normalized, unique field key (camelCase, no spaces or punctuation). */
  key: string
  /** Original header name as it appeared in the source file. */
  label: string
  /** The inferred data type for the column. */
  type: DataType
  /** True when the column's values can be coerced to finite numbers. */
  isNumeric: boolean
  /** True when the column's values parse as dates. */
  isDate: boolean
}

/** Aggregate statistics computed for a single numeric column. */
export interface MetricSummary {
  /** Total of all numeric values in the column. */
  sum: number
  /** Arithmetic mean of all numeric values. */
  avg: number
  /** Smallest numeric value. */
  min: number
  /** Largest numeric value. */
  max: number
}

/** A fully parsed, in-memory dataset ready for analysis and rendering. */
export interface ParsedDataset {
  /** Stable unique identifier (a UUID, or a fixed id for sample datasets). */
  id: string
  /** Original file name (or sample name) used for display. */
  fileName: string
  /** Size of the source file in bytes (0 for generated samples). */
  fileSize: number
  /** Number of data rows (excluding the header row). */
  rowCount: number
  /** Column metadata in source order. */
  columns: ColumnSchema[]
  /** Sanitized row objects keyed by each column's `key`. */
  rawData: Record<string, unknown>[]
  /** Numeric aggregates keyed by column `key`. */
  summaryMetrics: Record<string, MetricSummary>
  /** ISO 8601 timestamp of when the dataset was ingested. */
  uploadedAt: string
}

/** User-controlled view state applied on top of a dataset. */
export interface FilterState {
  /** Free-text filter matched against cell values. */
  searchQuery: string
  /** The numeric column currently highlighted (drives charts). */
  selectedMetricKey: string | null
  /** The categorical column used for grouping/series. */
  selectedCategoryKey: string | null
}
