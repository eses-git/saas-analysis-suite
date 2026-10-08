# Enterprise SaaS Analytics & Spreadsheet Extraction Suite

> **Version 1.0** — In Active Development

**Author:** Estera Bulkiewicz

A high-performance, fully client-side web application for uploading, parsing, analyzing, and visualizing SaaS and E-Commerce spreadsheet datasets — with **zero server roundtrips**.

---

## Project Overview

This suite transforms raw `.csv`, `.xls`, and `.xlsx` files into an interactive analytics workspace entirely within the browser. Upload a spreadsheet (or load a bundled sample) and the application instantly:

1. **Ingests** the file into typed, in-memory datasets.
2. **Infers** schemas and column data types automatically.
3. **Aggregates** numeric metrics (sum, average, min, max).
4. **Visualizes** trends, distributions, and category comparisons.
5. **Exports** filtered data as CSV or a print/PDF-ready executive report.

### Roadmap

This project represents **Version 1 (In Active Development)** and will be expanded with modular future enhancements, including:

- **Automated AI summary insights** generated from extracted datasets.
- **Custom query builders** for ad-hoc filtering and aggregation.
- **Database connectors** for loading datasets directly from external sources.
- **Scheduled reports** and additional chart types.

---

## Key Capabilities & Architecture

### In-Memory Ingestion Pipeline
Asynchronous parsing of `.csv` (via PapaParse) and `.xls`/`.xlsx` (via SheetJS) into a unified, strictly-typed `ParsedDataset` model. Files never leave the browser.

### Automated Schema & Dynamic Type Inference
Columns are classified as `number`, `date`, `boolean`, or `string` by sampling up to 100 rows. Currency symbols (`$`, `€`, `£`, `¥`) and thousands separators are stripped during numeric detection, ISO/`MM/DD/YYYY` dates are recognized, and header keys are sanitized into camelCase identifiers.

### Interactive Recharts Analytics
Dynamic Area/Trend, Bar, and Donut charts with **customizable color palettes**:
- **Mint Emerald** (default)
- **Cyber Indigo**
- **Ocean Cyan**
- **Sunset Amber**

Palette selection persists across sessions and synchronizes chart fills, metric-card icons, sidebar highlights, and other UI accents.

### Enterprise DataGrid
TanStack Table v8 with debounced global search, multi-column sorting (numeric/date-aware), pagination (10/25/50/100 rows), and column-visibility controls.

### Dedicated Extraction & Reporting Views
- **Extraction:** schema inspection tables, raw row review, and numeric quick-metrics.
- **Reports:** print/PDF-optimized executive summaries with copy-to-clipboard support.

### Privacy-First & Fully Client-Side
All data processing occurs in active browser memory (RAM). No files or raw data are transmitted to external servers.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 19, TypeScript (Strict Mode), Vite |
| **Styling** | Tailwind CSS v4 (class-based dark mode, custom design tokens) |
| **State** | Zustand |
| **Tables** | TanStack Table v8 |
| **Parsing** | SheetJS (`xlsx`), PapaParse |
| **Visuals** | Recharts, Lucide Icons |

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: 20+)
- npm (or pnpm/yarn)

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd enterprise-saas-analytics

# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production (type-check + bundle to dist/)
npm run build

# Preview production build locally
npm run preview
```

### Other Scripts

```bash
# Lint the codebase
npm run lint

# Run the parser self-test
npm run test:parser
```

---

## Project Structure

```
src/
├── components/
│   ├── analytics/      # MetricCards, AnalyticsView (Recharts suite)
│   ├── controls/       # ExportActions (CSV / print / copy)
│   ├── layout/         # AppShell, Sidebar, Topbar, ThemeToggle, navigation
│   ├── table/          # DataGrid (TanStack Table v8)
│   └── upload/         # Dropzone
├── context/            # ThemeProvider, ThemeContext (dark/light theme engine)
├── data/               # Pre-packaged sample datasets
├── hooks/              # useAccentColor (palette-synced accent)
├── lib/                # cn() class merge utility
├── pages/              # Dashboard, Analytics, Extraction, Reports
├── store/              # useDatasetStore, useLayoutStore (Zustand)
├── types/              # theme, dataset, navigation interfaces
└── utils/              # analytics, csv, fileParser
```

---

## Design System

- **Mint palette** tokens (50–900) plus theme-aware `surface` tokens (canvas/card/border/text/muted) for seamless light/dark transitions.
- **Sharp corners** — the UI uses unrounded (`rounded-none`) edges for a crisp, enterprise aesthetic.
- **Class-based dark mode** toggled via the `.dark` class on `<html>` and persisted to `localStorage`.
- **Chart palettes** selectable from the top bar, persisted in Zustand + `localStorage`, and mirrored to a `--accent` CSS variable for icon/focus synchronization.

---

## License

Proprietary — all rights reserved. © Estera Bulkiewicz.

