import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  Column,
  ColumnDef,
  FilterFn,
  PaginationState,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronsUpDown,
  Database,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useDatasetStore } from '../../store/useDatasetStore'
import { useAccentColor } from '../../hooks/useAccentColor'
import type { ColumnSchema } from '../../types/dataset'

/** Available page sizes for the pagination selector. */
const PAGE_SIZES = [10, 25, 50, 100] as const

/** Delay before a search query is committed to the table filter (ms). */
const SEARCH_DEBOUNCE_MS = 300

// ---------------------------------------------------------------------------
// Cell formatting
// ---------------------------------------------------------------------------

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

/** Formats a numeric value with locale-aware thousands separators. */
function formatNumber(value: unknown): string {
  const num = coerceNumber(value)
  return num === null ? String(value) : num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** Formats a date value as a legible, locale-aware date string. */
function formatDate(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString('en-US')
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-US')
  }
  return String(value)
}

/**
 * Renders a cell value according to its inferred column type: numbers use
 * locale formatting, dates use a legible date string, everything else is
 * stringified. Empty cells render an em dash.
 */
function formatCellValue(value: unknown, column: ColumnSchema): string {
  if (value === null || value === undefined || value === '') return '—'
  if (column.isNumeric) return formatNumber(value)
  if (column.isDate) return formatDate(value)
  return String(value)
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Coerces a value into a sort-comparable primitive: numbers stay numbers,
 * dates become timestamps, and text is lower-cased for case-insensitive sort.
 */
function toSortableValue(value: unknown): number | string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const num = coerceNumber(value)
    if (num !== null) return num
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(value.trim())) {
      const time = Date.parse(value)
      if (!Number.isNaN(time)) return time
    }
    return value.toLowerCase()
  }
  return String(value).toLowerCase()
}

/** Numeric/date-aware comparator for a single column. */
function compareRows(
  rowA: Row<Record<string, unknown>>,
  rowB: Row<Record<string, unknown>>,
  column: ColumnSchema,
): number {
  const a = toSortableValue(rowA.original[column.key])
  const b = toSortableValue(rowB.original[column.key])
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

// ---------------------------------------------------------------------------
// Global text filter
// ---------------------------------------------------------------------------

/** Case-insensitive substring match across every field in a row. */
const globalFilterFn: FilterFn<Record<string, unknown>> = (row, _columnId, filterValue) => {
  const query = String(filterValue).toLowerCase().trim()
  if (query === '') return true
  return Object.values(row.original).some((value) =>
    String(value ?? '').toLowerCase().includes(query),
  )
}

// ---------------------------------------------------------------------------
// Column building & rendering
// ---------------------------------------------------------------------------

interface SortableHeaderProps {
  column: Column<Record<string, unknown>, unknown>
  label: string
}

/** Clickable header that toggles column sorting and shows the sort direction. */
function SortableHeader({ column, label }: SortableHeaderProps) {
  const sorted = column.getIsSorted()
  const accent = useAccentColor()
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      style={sorted ? { color: accent } : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
        sorted ? undefined : 'text-surface-muted hover:text-surface-text',
      )}
    >
      {label}
      {sorted === 'asc' ? (
        <ChevronUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  )
}

interface CellValueProps {
  value: unknown
  column: ColumnSchema
}

/** Renders a cell value with type-aware formatting and alignment. */
function CellValue({ value, column }: CellValueProps) {
  return (
    <span className={cn('block truncate', column.isNumeric && 'text-right tabular-nums')}>
      {formatCellValue(value, column)}
    </span>
  )
}

interface PaginationButtonProps {
  onClick: () => void
  disabled: boolean
  label: string
  icon: LucideIcon
}

/** Icon button used for the pagination navigation controls. */
function PaginationButton({ onClick, disabled, label, icon: Icon }: PaginationButtonProps) {
  const accent = useAccentColor()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center border border-surface-border bg-surface-card text-surface-muted transition-colors hover:bg-mint-50/50 hover:text-surface-text disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-mint-900/10"
    >
      <Icon className="h-4 w-4" style={{ color: accent }} />
    </button>
  )
}

/** Builds a TanStack column definition from a dataset column schema. */
function buildColumnDef(column: ColumnSchema): ColumnDef<Record<string, unknown>> {
  return {
    id: column.key,
    accessorKey: column.key,
    header: ({ column: headerColumn }) => (
      <SortableHeader column={headerColumn} label={column.label} />
    ),
    cell: ({ row }) => <CellValue value={row.original[column.key]} column={column} />,
    sortingFn: (rowA, rowB) => compareRows(rowA, rowB, column),
  }
}

/** High-performance, feature-rich data grid built on TanStack Table v8. */
export function DataGrid() {
  const currentDataset = useDatasetStore((state) => state.currentDataset)
  const searchQuery = useDatasetStore((state) => state.filters.searchQuery)
  const setSearchQuery = useDatasetStore((state) => state.setSearchQuery)

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [globalFilter, setGlobalFilter] = useState<unknown>(searchQuery)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnsOpen, setColumnsOpen] = useState(false)

  const columnsMenuRef = useRef<HTMLDivElement>(null)
  const previousDatasetId = useRef<string | null>(null)

  // Debounce the search input so the table only filters after typing pauses.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setGlobalFilter(searchInput)
      setSearchQuery(searchInput)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [searchInput, setSearchQuery])

  // Close the column-visibility menu when clicking outside of it.
  useEffect(() => {
    if (!columnsOpen) return
    const handlePointerDown = (event: MouseEvent): void => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [columnsOpen])

  const data = useMemo(() => currentDataset?.rawData ?? [], [currentDataset])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => currentDataset?.columns.map((column) => buildColumnDef(column)) ?? [],
    [currentDataset],
  )

  const numericKeys = useMemo(
    () =>
      new Set(
        currentDataset?.columns.filter((column) => column.isNumeric).map((column) => column.key) ??
          [],
      ),
    [currentDataset],
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable getters by design; results stay local to this component.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Reset local view state when a different dataset is loaded.
  useEffect(() => {
    const id = currentDataset?.id ?? null
    if (id !== previousDatasetId.current) {
      previousDatasetId.current = id
      setSearchInput('')
      setGlobalFilter('')
      setSearchQuery('')
      setSorting([])
      setPagination({ pageIndex: 0, pageSize: 10 })
      setColumnVisibility({})
    }
  }, [currentDataset, setSearchQuery])

  if (currentDataset === null) {
    return (
      <div className="flex flex-col items-center justify-center  border border-dashed border-surface-border bg-surface-card px-6 py-20 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center  bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-400">
          <Database className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-semibold text-surface-text">No dataset loaded</h2>
        <p className="mt-2 max-w-md text-sm text-surface-muted">
          Upload a spreadsheet or load a sample dataset to start exploring your data.
        </p>
      </div>
    )
  }

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalFiltered = table.getFilteredRowModel().rows.length
  const pageCount = Math.max(table.getPageCount(), 1)
  const firstRow = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalFiltered)

  return (
    <div className="overflow-hidden  border border-surface-border bg-surface-card shadow-sm">
      {/* Toolbar: search + column visibility */}
      <div className="no-print flex flex-col gap-3 border-b border-surface-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-muted" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search all columns…"
            aria-label="Search dataset"
            className="h-9 w-full border border-surface-border bg-surface-canvas pl-9 pr-3 text-sm text-surface-text placeholder:text-surface-muted accent-focus focus:outline-none"
          />
        </div>

        <div className="relative" ref={columnsMenuRef}>
          <button
            type="button"
            onClick={() => setColumnsOpen((open) => !open)}
            className="inline-flex h-9 items-center gap-2  border border-surface-border bg-surface-card px-3 text-sm font-medium text-surface-text transition-colors hover:bg-mint-50/50 hover:text-mint-700 dark:hover:bg-mint-900/10 dark:hover:text-mint-300"
          >
            <SlidersHorizontal className="h-4 w-4 text-mint-500" />
            Columns
          </button>

          {columnsOpen && (
            <div className="absolute right-0 z-20 mt-2 w-60  border border-surface-border bg-surface-card p-2 shadow-lg">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-surface-muted">
                Toggle columns
              </p>
              <div className="max-h-72 overflow-y-auto">
                {currentDataset.columns.map((column) => {
                  const tableColumn = table.getColumn(column.key)
                  const visible = tableColumn?.getIsVisible() ?? true
                  return (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2  px-2 py-1.5 text-sm text-surface-text hover:bg-mint-50/50 dark:hover:bg-mint-900/10"
                    >
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => tableColumn?.toggleVisibility()}
                        className="h-4 w-4 rounded border-surface-border text-mint-500 focus:ring-mint-500/30"
                      />
                      <span className="truncate">{column.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface-canvas">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'border-b border-surface-border px-4 py-3',
                      numericKeys.has(header.column.id) && 'text-right',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllLeafColumns().length}
                  className="px-4 py-12 text-center text-sm text-surface-muted"
                >
                  No rows match your search.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/60 hover:bg-mint-50/50 dark:hover:bg-mint-900/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-surface-text">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="no-print flex flex-col gap-3 border-t border-surface-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-surface-muted">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            aria-label="Rows per page"
            className="h-8  border border-surface-border bg-surface-card px-2 text-sm text-surface-text focus:border-mint-500 focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="ml-2 tabular-nums">
            {firstRow}–{lastRow} of {totalFiltered}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-surface-muted">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <PaginationButton onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} label="First page" icon={ChevronsLeft} />
            <PaginationButton onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} label="Previous page" icon={ChevronLeft} />
            <PaginationButton onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} label="Next page" icon={ChevronRight} />
            <PaginationButton onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} label="Last page" icon={ChevronsRight} />
          </div>
        </div>
      </div>
    </div>
  )
}

