import { create } from 'zustand'
import type { FilterState, ParsedDataset } from '../types/dataset'
import type { ChartPaletteId } from '../types/theme'
import { getSampleDataset } from '../data/sampleDatasets'
import type { SampleDatasetId } from '../data/sampleDatasets'

/** Maximum number of datasets retained in the `recentDatasets` history. */
const MAX_RECENT_DATASETS = 10

/** Default filter state applied to a freshly-loaded dataset. */
const EMPTY_FILTERS: FilterState = {
  searchQuery: '',
  selectedMetricKey: null,
  selectedCategoryKey: null,
}

/** localStorage key for the persisted chart palette. */
const CHART_PALETTE_STORAGE_KEY = 'saas-analytics-suite.chartPalette'

const CHART_PALETTE_IDS: readonly ChartPaletteId[] = [
  'mint-emerald',
  'cyber-indigo',
  'ocean-cyan',
  'sunset-amber',
]

/** Reads the persisted chart palette, falling back to the default. */
function readInitialChartPalette(): ChartPaletteId {
  if (typeof window === 'undefined') return 'mint-emerald'
  const stored = window.localStorage.getItem(CHART_PALETTE_STORAGE_KEY)
  return CHART_PALETTE_IDS.find((id) => id === stored) ?? 'mint-emerald'
}

interface DatasetState {
  /** The dataset currently being analyzed, or null when none is loaded. */
  currentDataset: ParsedDataset | null
  /** True while an asynchronous ingestion is in flight. */
  isLoading: boolean
  /** User-facing error message from the last failed operation. */
  error: string | null
  /** Active view filters applied to the current dataset. */
  filters: FilterState
  /** Recently loaded datasets, newest first, for fast toggling. */
  recentDatasets: ParsedDataset[]
  /** Active chart color palette id. */
  chartPalette: ChartPaletteId

  /** Selects and persists the active chart color palette. */
  setChartPalette: (palette: ChartPaletteId) => void

  /**
   * Replaces the active dataset and prepends it to the recent-history list,
   * de-duplicating by id and capping the list length.
   */
  setDataset: (dataset: ParsedDataset) => void
  /**
   * Loads one of the pre-packaged sample datasets and registers it in recent
   * history, so the app is immediately explorable without a file upload.
   */
  loadSampleDataset: (sampleId: SampleDatasetId) => void
  /** Updates the free-text search query in the filter state. */
  setSearchQuery: (query: string) => void
  /** Selects (or clears) the numeric column that drives charts/metrics. */
  setSelectedMetricKey: (key: string | null) => void
  /** Selects (or clears) the categorical column used for grouping. */
  setSelectedCategoryKey: (key: string | null) => void
  /** Restores the filter state to its defaults. */
  resetFilters: () => void
  /** Clears the active dataset and resets filters. */
  clearDataset: () => void
}

export const useDatasetStore = create<DatasetState>((set) => ({
  currentDataset: null,
  isLoading: false,
  error: null,
  filters: EMPTY_FILTERS,
  recentDatasets: [],
  chartPalette: readInitialChartPalette(),

  setChartPalette: (palette) => {
    window.localStorage.setItem(CHART_PALETTE_STORAGE_KEY, palette)
    set({ chartPalette: palette })
  },

  setDataset: (dataset) =>
    set((state) => ({
      currentDataset: dataset,
      recentDatasets: [
        dataset,
        ...state.recentDatasets.filter((item) => item.id !== dataset.id),
      ].slice(0, MAX_RECENT_DATASETS),
      error: null,
      isLoading: false,
    })),

  loadSampleDataset: (sampleId) => {
    const sample = getSampleDataset(sampleId)
    set((state) => ({
      currentDataset: sample,
      recentDatasets: [
        sample,
        ...state.recentDatasets.filter((item) => item.id !== sample.id),
      ].slice(0, MAX_RECENT_DATASETS),
      error: null,
      isLoading: false,
    }))
  },

  setSearchQuery: (query) =>
    set((state) => ({ filters: { ...state.filters, searchQuery: query } })),

  setSelectedMetricKey: (key) =>
    set((state) => ({ filters: { ...state.filters, selectedMetricKey: key } })),

  setSelectedCategoryKey: (key) =>
    set((state) => ({ filters: { ...state.filters, selectedCategoryKey: key } })),

  resetFilters: () => set({ filters: EMPTY_FILTERS }),

  clearDataset: () => set({ currentDataset: null, filters: EMPTY_FILTERS, error: null }),
}))
