import type { ParsedDataset } from '../types/dataset'

/**
 * Formula-injection trigger characters that cause spreadsheet software
 * (Microsoft Excel, LibreOffice, Google Sheets) to interpret a cell as a
 * formula instead of rendering it as plain text.
 *
 * @author Estera Bulkiewicz
 */
const FORMULA_TRIGGER_PATTERN = /^[=+\-@\t\r]/

/**
 * Neutralizes CSV / formula-injection vectors by prefixing cells that begin
 * with a formula trigger character (`=`, `+`, `-`, `@`, tab, carriage return)
 * with a single quote (`'`). Spreadsheet applications treat a leading
 * apostrophe as a plain-text escape, so a value like `=cmd|' /C calc'!A0` is
 * exported verbatim instead of being executed.
 *
 * Applied to every exported cell (headers included) before CSV escaping so
 * untrusted file contents can never execute on the client or in downstream
 * spreadsheet tooling.
 *
 * @author Estera Bulkiewicz
 */
export function sanitizeCsvCell(value: unknown): string {
  const text = String(value ?? '')
  return FORMULA_TRIGGER_PATTERN.test(text) ? `'${text}` : text
}

/** Escapes a cell for inclusion in a CSV (quotes and doubles embedded quotes). */
function escapeCsvCell(value: unknown): string {
  const text = sanitizeCsvCell(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/** Filters rows by a case-insensitive substring match across all fields. */
export function filterRowsByQuery(
  rows: Record<string, unknown>[],
  query: string,
): Record<string, unknown>[] {
  const normalized = query.toLowerCase().trim()
  if (normalized === '') return rows
  return rows.filter((row) =>
    Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(normalized)),
  )
}

/** Builds a CSV string (with a UTF-8 BOM for Excel) from a dataset and its rows. */
export function buildDatasetCsv(
  dataset: ParsedDataset,
  rows: Record<string, unknown>[],
): string {
  const header = dataset.columns.map((column) => escapeCsvCell(column.label)).join(',')
  const body = rows.map((row) =>
    dataset.columns.map((column) => escapeCsvCell(row[column.key])).join(','),
  )
  return `\uFEFF${[header, ...body].join('\n')}`
}

/** Triggers a browser download for the given text content. */
function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Exports the search-filtered dataset rows as a downloadable CSV file. */
export function exportDatasetCsv(dataset: ParsedDataset, searchQuery: string): void {
  const rows = filterRowsByQuery(dataset.rawData, searchQuery)
  const csv = buildDatasetCsv(dataset, rows)
  const baseName = dataset.fileName.replace(/\.[^.]+$/, '') || 'dataset'
  downloadTextFile(`${baseName}.csv`, csv, 'text/csv;charset=utf-8;')
}
