import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type {
  ColumnSchema,
  DataType,
  MetricSummary,
  ParsedDataset,
} from '../types/dataset'

/**
 * Machine-readable codes for ingestion failures so callers can present
 * targeted, user-friendly messaging.
 */
export type FileParseErrorCode =
  | 'unsupported-format'
  | 'empty-file'
  | 'no-columns'
  | 'parse-failed'

/** Typed error thrown whenever a file cannot be parsed into a dataset. */
export class FileParseError extends Error {
  readonly code: FileParseErrorCode

  constructor(code: FileParseErrorCode, message: string) {
    super(message)
    this.name = 'FileParseError'
    this.code = code
  }
}

/** Extensions routed through the CSV parser. */
const CSV_EXTENSIONS = new Set(['csv'])

/** Extensions routed through the SheetJS parser. */
const XLSX_EXTENSIONS = new Set(['xls', 'xlsx'])

/** Maximum number of rows sampled when inferring a column's type. */
const INFERENCE_SAMPLE_SIZE = 100

// ---------------------------------------------------------------------------
// Phase 1 — Dynamic type inference
// ---------------------------------------------------------------------------

/** A value is "non-empty" if it is not null/undefined or whitespace-only. */
function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

/**
 * Strips currency glyphs and thousands separators so numeric-looking strings
 * can be parsed with `Number`. Handles `$`, `€`, `£`, `¥`, and commas.
 */
function stripCurrencySymbols(value: unknown): string {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return ''
  return value.trim().replace(/[$€£¥]/g, '').replace(/,/g, '')
}

/** True when a value can be coerced to a finite number. */
function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'string') return false
  const cleaned = stripCurrencySymbols(value)
  if (cleaned === '') return false
  return Number.isFinite(Number(cleaned))
}

/** Coerces a value to a number, or returns null when it isn't numeric. */
function toNumber(value: unknown): number | null {
  if (!isNumericValue(value)) return null
  if (typeof value === 'number') return value
  return Number(stripCurrencySymbols(value))
}

/** True when a value is a boolean literal or a `"true"`/`"false"` string. */
function isBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return true
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === 'false'
  }
  return false
}

/**
 * True when a value looks like a date: a `Date` instance, an ISO `YYYY-MM-DD`
 * string, or a US-style `MM/DD/YYYY` string.
 */
function isDateValue(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed === '') return false
  // ISO 8601 date (optionally followed by a time component).
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return !Number.isNaN(Date.parse(trimmed))
  // US-style date with a full four-digit year.
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return !Number.isNaN(Date.parse(trimmed))
  return false
}

/**
 * Classifies a single cell value. Order matters:
 *  1. booleans first, so `"true"` is never mistaken for text;
 *  2. numbers next, so a bare year like `"2024"` is numeric;
 *  3. dates last, so only well-formed date strings reach the date category.
 */
function inferValueType(value: unknown): DataType {
  if (!isNonEmpty(value)) return 'string'
  if (isBooleanValue(value)) return 'boolean'
  if (isNumericValue(value)) return 'number'
  if (isDateValue(value)) return 'date'
  return 'string'
}

/**
 * Infers a column's type by sampling up to `INFERENCE_SAMPLE_SIZE` non-empty
 * values. If every sampled value shares one category, that category wins;
 * otherwise the column degrades to `string` — the safe, lossless default.
 */
function inferColumnType(values: unknown[]): DataType {
  const sampled = values.filter(isNonEmpty).slice(0, INFERENCE_SAMPLE_SIZE)
  if (sampled.length === 0) return 'string'
  const firstType = inferValueType(sampled[0])
  const homogeneous = sampled.every((value) => inferValueType(value) === firstType)
  return homogeneous ? firstType : 'string'
}

// ---------------------------------------------------------------------------
// Phase 2 — Data sanitization
// ---------------------------------------------------------------------------

/**
 * Converts an arbitrary header into a camelCase key that is safe to use as a
 * table column id and chart series key (no spaces or punctuation).
 *
 * @example "Monthly Recurring Revenue ($)" -> "monthlyRecurringRevenue"
 */
function normalizeKey(label: string): string {
  const words = label
    .trim()
    .replace(/[^A-Za-z0-9]+/g, ' ') // collapse punctuation into spaces
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'field'
  const [first, ...rest] = words
  return (
    first.toLowerCase() +
    rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
  )
}

/**
 * Builds column schemas from the original header labels, deduplicating any
 * normalized keys that collide (e.g. "revenue" vs "Revenue") by appending a
 * numeric suffix so no column's data is ever overwritten.
 */
function buildColumns(labels: string[], rows: Record<string, unknown>[]): ColumnSchema[] {
  const usedKeys = new Set<string>()
  return labels.map((label) => {
    let key = normalizeKey(label)

    if (usedKeys.has(key)) {
      let suffix = 2
      while (usedKeys.has(`${key}${suffix}`)) suffix += 1
      key = `${key}${suffix}`
    }
    usedKeys.add(key)

    const type = inferColumnType(rows.map((row) => row[label]))
    return {
      key,
      label,
      type,
      isNumeric: type === 'number',
      isDate: type === 'date',
    }
  })
}

/**
 * ASCII control characters (and the DEL byte) that are stripped from string
 * cell values during normalization. Tab (`\t`), line feed (`\n`), and carriage
 * return (`\r`) are deliberately preserved: they are legitimate in-cell
 * whitespace, and formula-injection neutralization for those characters is
 * handled separately at CSV-export time (see `src/utils/csv.ts`).
 *
 * @author Estera Bulkiewicz
 */
// eslint-disable-next-line no-control-regex -- intentional match of C0/DEL control characters for sanitization
const CONTROL_CHARACTER_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/**
 * Strips non-printable ASCII characters and control codes from a value so
 * untrusted cell content cannot smuggle invisible or control bytes into the
 * in-memory dataset. Non-string values (numbers, dates, booleans) are returned
 * unchanged.
 *
 * @author Estera Bulkiewicz
 */
function stripControlCharacters(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.replace(CONTROL_CHARACTER_PATTERN, '')
}

/**
 * Remaps each raw row from original header keys to sanitized column keys,
 * stripping non-printable control characters from string values so the
 * in-memory model stays clean and safe to render.
 */
function sanitizeRows(
  rows: Record<string, unknown>[],
  columns: ColumnSchema[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const sanitized: Record<string, unknown> = {}
    for (const column of columns) {
      sanitized[column.key] = stripControlCharacters(row[column.label])
    }
    return sanitized
  })
}

// ---------------------------------------------------------------------------
// Phase 3 — Automated aggregations
// ---------------------------------------------------------------------------

/**
 * Computes `sum`/`avg`/`min`/`max` for every numeric column across all rows.
 * Non-numeric cells are skipped rather than coerced to zero.
 */
function computeMetrics(
  rows: Record<string, unknown>[],
  columns: ColumnSchema[],
): Record<string, MetricSummary> {
  const metrics: Record<string, MetricSummary> = {}

  for (const column of columns) {
    if (!column.isNumeric) continue

    let sum = 0
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    let count = 0

    for (const row of rows) {
      const parsed = toNumber(row[column.label])
      if (parsed === null) continue
      sum += parsed
      if (parsed < min) min = parsed
      if (parsed > max) max = parsed
      count += 1
    }

    if (count === 0) continue
    metrics[column.key] = { sum, avg: sum / count, min, max }
  }

  return metrics
}

// ---------------------------------------------------------------------------
// Shared dataset builder
// ---------------------------------------------------------------------------

/** Inputs required to build a dataset from already-extracted row objects. */
export interface BuildDatasetInput {
  fileName: string
  fileSize: number
  rows: Record<string, unknown>[]
  /** Optional header labels; defaults to the keys of the first row. */
  labels?: string[]
  /** Optional override id (used by pre-packaged sample datasets). */
  id?: string
  /** Optional override timestamp (used by pre-packaged sample datasets). */
  uploadedAt?: string
}

/** Generates a stable unique id, preferring the native crypto API. */
function generateId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `dataset-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Shared pipeline that turns raw rows (keyed by original headers) into a fully
 * typed `ParsedDataset`: infer types, sanitize keys, and aggregate metrics.
 *
 * @throws {FileParseError} when the input has no rows or no detectable columns.
 */
export function buildDatasetFromRows(input: BuildDatasetInput): ParsedDataset {
  const { fileName, fileSize, rows } = input

  if (rows.length === 0) {
    throw new FileParseError('empty-file', `"${fileName}" contains no data rows.`)
  }

  const labels = input.labels ?? Object.keys(rows[0] ?? {})
  if (labels.length === 0) {
    throw new FileParseError('no-columns', `"${fileName}" has no detectable columns.`)
  }

  const columns = buildColumns(labels, rows)

  return {
    id: input.id ?? generateId(),
    fileName,
    fileSize,
    rowCount: rows.length,
    columns,
    rawData: sanitizeRows(rows, columns),
    summaryMetrics: computeMetrics(rows, columns),
    uploadedAt: input.uploadedAt ?? new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// File-format parsing
// ---------------------------------------------------------------------------

/** Returns the lower-cased file extension without the leading dot. */
function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return fileName.slice(dotIndex + 1).toLowerCase()
}

/**
 * Parses CSV text into row objects. `header: true` maps the first row to
 * object keys and `skipEmptyLines` drops blank lines.
 */
function parseCsvText(text: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  // Surface PapaParse's row-level problems when nothing was produced.
  if (result.errors.length > 0 && result.data.length === 0) {
    const message = result.errors[0].message || 'the file could not be parsed'
    throw new FileParseError('parse-failed', `Could not parse CSV: ${message}`)
  }

  return result.data
}

/**
 * Parses `.xls`/`.xlsx` bytes into row objects using SheetJS, reading the
 * first worksheet. `cellDates: true` preserves date cells as `Date` instances
 * so they are recognized by the date classifier.
 */
function parseSpreadsheetBytes(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetName = workbook.SheetNames[0]
  if (sheetName === undefined) {
    throw new FileParseError('empty-file', 'The spreadsheet contains no worksheets.')
  }

  const worksheet = workbook.Sheets[sheetName]
  if (worksheet === undefined) {
    throw new FileParseError('parse-failed', 'The first worksheet could not be read.')
  }

  // `defval: null` fills blank cells so column alignment is preserved.
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null })
}

/**
 * Ingests a CSV or Excel file into a `ParsedDataset`, dispatching by extension.
 *
 * @throws {FileParseError} for unsupported formats, empty files, or parse
 *   failures, with a user-friendly message.
 */
export async function parseFile(file: File): Promise<ParsedDataset> {
  const extension = getFileExtension(file.name)

  if (CSV_EXTENSIONS.has(extension)) {
    const text = await file.text()
    const rows = parseCsvText(text)
    return buildDatasetFromRows({ fileName: file.name, fileSize: file.size, rows })
  }

  if (XLSX_EXTENSIONS.has(extension)) {
    const buffer = await file.arrayBuffer()
    const rows = parseSpreadsheetBytes(buffer)
    return buildDatasetFromRows({ fileName: file.name, fileSize: file.size, rows })
  }

  throw new FileParseError(
    'unsupported-format',
    `Unsupported file type ".${extension}". Please upload a .csv, .xls, or .xlsx file.`,
  )
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

/**
 * Lightweight, dependency-free self-test that exercises the pure parsing
 * helpers against mock objects. Throws on the first failing batch so a
 * non-zero exit can be treated as failure.
 *
 * Run via `npm run test:parser` (executes this file under `tsx`), or import
 * and call `runParserSelfTest()` from a REPL/browser console.
 */
export function runParserSelfTest(): void {
  const failures: string[] = []
  const assert = (condition: boolean, message: string): void => {
    if (!condition) failures.push(message)
  }

  // --- Dynamic type inference (including currency stripping) ---
  assert(inferValueType('$1,250.50') === 'number', 'currency value should be numeric')
  assert(inferValueType('€3.99') === 'number', 'euro value should be numeric')
  assert(inferValueType('2024-01-15') === 'date', 'ISO date should be a date')
  assert(inferValueType('01/15/2024') === 'date', 'MM/DD/YYYY should be a date')
  assert(inferValueType('true') === 'boolean', '"true" should be boolean')
  assert(inferValueType('Acme Corp') === 'string', 'plain text should be string')
  assert(inferColumnType(['10', '20', '30']) === 'number', 'homogeneous numeric column -> number')
  assert(inferColumnType(['10', 'twenty', '30']) === 'string', 'mixed column -> string')

  // --- Key sanitization ---
  assert(normalizeKey('Customer Name') === 'customerName', 'spaces become camelCase')
  assert(
    normalizeKey('Monthly Recurring Revenue ($)') === 'monthlyRecurringRevenue',
    'symbols are stripped from keys',
  )

  // --- End-to-end dataset build + metrics ---
  const mockRows: Record<string, unknown>[] = [
    { Product: 'Widget', 'Revenue ($)': '$10.00' },
    { Product: 'Gadget', 'Revenue ($)': '$30.00' },
    { Product: 'Widget', 'Revenue ($)': '$20.00' },
  ]
  const dataset = buildDatasetFromRows({ fileName: 'mock.csv', fileSize: 42, rows: mockRows })

  assert(dataset.rowCount === 3, 'row count should match input')
  assert(dataset.columns.length === 2, 'two columns should be detected')
  assert(dataset.rawData[0].product === 'Widget', 'row keys should be sanitized')
  assert(dataset.summaryMetrics.revenue.sum === 60, 'numeric sum should be 60')
  assert(dataset.summaryMetrics.revenue.avg === 20, 'numeric average should be 20')
  assert(dataset.summaryMetrics.revenue.min === 10, 'numeric min should be 10')
  assert(dataset.summaryMetrics.revenue.max === 30, 'numeric max should be 30')

  // --- Error handling ---
  let emptyThrew = false
  try {
    buildDatasetFromRows({ fileName: 'empty.csv', fileSize: 0, rows: [] })
  } catch (error) {
    emptyThrew = error instanceof FileParseError && error.code === 'empty-file'
  }
  assert(emptyThrew, 'empty input should throw a typed "empty-file" error')

  if (failures.length > 0) {
    throw new Error(`parser self-test failed:\n- ${failures.join('\n- ')}`)
  }

  console.log('fileParser self-test passed ✓')
}

// Run the self-test when this module is executed directly (e.g. via
// `npm run test:parser` → `tsx src/utils/fileParser.ts`). In the browser this
// is a no-op because `process` is undefined.
const entryArg = (globalThis as typeof globalThis & { process?: { argv?: string[] } }).process
  ?.argv?.[1]
if (typeof entryArg === 'string' && entryArg.replace(/\\/g, '/').endsWith('fileParser.ts')) {
  runParserSelfTest()
}



