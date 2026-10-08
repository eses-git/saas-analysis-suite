import type { ParsedDataset } from '../types/dataset'

/** Escapes a cell for inclusion in a CSV (quotes and doubles embedded quotes). */
function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
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
