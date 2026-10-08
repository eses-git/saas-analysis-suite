import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { CloudUpload, FileSpreadsheet, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useDatasetStore } from '../../store/useDatasetStore'
import { useAccentColor } from '../../hooks/useAccentColor'
import { FileParseError, parseFile } from '../../utils/fileParser'

/** File extensions accepted by the dropzone. */
const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx'] as const

/** Sample dataset quick-load actions rendered beneath the drop area. */
const SAMPLE_ACTIONS: readonly { id: 'saas' | 'ecommerce'; label: string }[] = [
  { id: 'saas', label: 'Load SaaS Sample' },
  { id: 'ecommerce', label: 'Load E-Commerce Sample' },
]

/**
 * Interactive file-upload surface: drag-and-drop with a native file-picker
 * fallback, async parsing with a loading spinner, typed error handling, and
 * quick-load buttons for the pre-packaged sample datasets.
 */
export function Dropzone() {
  const setDataset = useDatasetStore((state) => state.setDataset)
  const loadSampleDataset = useDatasetStore((state) => state.loadSampleDataset)
  const accentColor = useAccentColor()

  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  // Tracks nested dragenter/dragleave pairs so the highlight doesn't flicker
  // when the cursor passes over child elements.
  const dragDepth = useRef(0)

  /** Programmatically opens the hidden file input. */
  const openFilePicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  /** Parses a file and commits the result to the dataset store. */
  const handleFile = useCallback(
    async (file: File) => {
      setIsParsing(true)
      setError(null)
      try {
        const dataset = await parseFile(file)
        setDataset(dataset)
      } catch (err) {
        if (err instanceof FileParseError) {
          setError(err.message)
        } else {
          setError('An unexpected error occurred while reading the file.')
        }
      } finally {
        setIsParsing(false)
      }
    },
    [setDataset],
  )

  // --- Native HTML5 drag-and-drop handlers ---

  const handleDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    // Required for the element to register as a valid drop target.
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDragging(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
    // Reset the input so re-selecting the same file still fires a change event.
    event.target.value = ''
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFilePicker()
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a spreadsheet (.csv, .xls, or .xlsx)"
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'group flex cursor-pointer flex-col items-center justify-center  border-2 border-dashed p-10 text-center transition-colors duration-200',
          isDragging
            ? 'border-mint-500 bg-mint-500/10'
            : 'border-surface-border bg-surface-card hover:border-mint-500/50 hover:bg-mint-50/50 dark:hover:bg-mint-900/10',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={handleInputChange}
        />

        {isParsing ? (
          <LoaderCircle className="h-10 w-10 animate-spin" style={{ color: accentColor }} />
        ) : (
          <CloudUpload
            className={cn(
              'h-10 w-10 transition-transform duration-200',
              isDragging && 'animate-bounce',
            )}
            style={{ color: accentColor }}
          />
        )}

        <p className="mt-4 text-base font-semibold text-surface-text">
          {isParsing ? 'Parsing your file…' : 'Drop your spreadsheet here'}
        </p>
        <p className="mt-1 text-sm text-surface-muted">
          or{' '}
          <span className="font-medium" style={{ color: accentColor }}>browse files</span>
        </p>
        <p className="mt-3 text-xs text-surface-muted">Supports .csv, .xls, and .xlsx</p>
      </div>

      {/* Sample dataset quick actions */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <span className="text-sm text-surface-muted">No file handy?</span>
        {SAMPLE_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => loadSampleDataset(action.id)}
            className="inline-flex items-center gap-2  border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text transition-colors hover:bg-mint-50/50 hover:text-mint-700 dark:hover:bg-mint-900/10 dark:hover:text-mint-300"
          >
            <FileSpreadsheet className="h-4 w-4" style={{ color: accentColor }} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Error banner with dismiss (reset) control */}
      {error !== null && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3  border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Upload failed</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className=" p-1 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
