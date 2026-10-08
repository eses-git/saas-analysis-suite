import { buildDatasetFromRows } from '../utils/fileParser'
import type { ParsedDataset } from '../types/dataset'

/** Identifiers for the pre-packaged sample datasets. */
export type SampleDatasetId = 'saas' | 'ecommerce'

/** Number of rows generated for each sample dataset (>= 100). */
const SAMPLE_ROW_COUNT = 120

// ---------------------------------------------------------------------------
// Deterministic randomness (mulberry32) so samples are stable across reloads.
// ---------------------------------------------------------------------------

/** Creates a seeded PRNG returning floats in [0, 1). */
function createSeededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random integer in the inclusive range [min, max]. */
function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1))
}

/** Random monetary amount rounded to two decimals. */
function randomMoney(rand: () => number, min: number, max: number): number {
  return Math.round((min + rand() * (max - min)) * 100) / 100
}

/** Random ISO date (YYYY-MM-DD) between the given start/end years (inclusive). */
function randomDate(rand: () => number, startYear: number, endYear: number): string {
  const start = Date.UTC(startYear, 0, 1)
  const end = Date.UTC(endYear, 11, 31)
  const time = start + Math.floor(rand() * (end - start))
  return new Date(time).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Sample 1 — SaaS Subscriptions & Churn
// ---------------------------------------------------------------------------

/**
 * Mock schema for the SaaS sample:
 *  - `Customer Name` (string)
 *  - `Monthly Recurring Revenue ($)` (number)
 *  - `Plan Type` (string)
 *  - `Signup Date` (date, YYYY-MM-DD)
 *  - `Churn Status` (string)
 */
const SAAS_NAMES = [
  'Acme Corp',
  'Globex',
  'Initech',
  'Umbrella',
  'Stark Industries',
  'Wayne Enterprises',
  'Hooli',
  'Pied Piper',
  'Soylent',
  'Massive Dynamic',
] as const

const SAAS_PLANS = ['Starter', 'Growth', 'Enterprise', 'Scale'] as const

const SAAS_CHURN = ['Active', 'Churned', 'At Risk'] as const

function createSaasRows(): Record<string, unknown>[] {
  const rand = createSeededRandom(1337)
  const rows: Record<string, unknown>[] = []

  for (let i = 0; i < SAMPLE_ROW_COUNT; i += 1) {
    rows.push({
      'Customer Name': `${SAAS_NAMES[i % SAAS_NAMES.length]} ${i + 1}`,
      'Monthly Recurring Revenue ($)': randomMoney(rand, 49, 15000),
      'Plan Type': SAAS_PLANS[randomInt(rand, 0, SAAS_PLANS.length - 1)],
      'Signup Date': randomDate(rand, 2019, 2024),
      'Churn Status': SAAS_CHURN[randomInt(rand, 0, SAAS_CHURN.length - 1)],
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Sample 2 — E-Commerce Global Sales
// ---------------------------------------------------------------------------

/**
 * Mock schema for the e-commerce sample:
 *  - `Order ID` (string)
 *  - `Total Amount ($)` (number)
 *  - `Category` (string)
 *  - `Region` (string)
 *  - `Order Date` (date, YYYY-MM-DD)
 *  - `Units Sold` (number)
 */
const ECOMM_CATEGORIES = [
  'Electronics',
  'Apparel',
  'Home & Garden',
  'Beauty',
  'Sports',
  'Toys',
  'Books',
  'Grocery',
] as const

const ECOMM_REGIONS = [
  'North America',
  'Europe',
  'Asia Pacific',
  'Latin America',
  'Middle East & Africa',
] as const

function createEcommerceRows(): Record<string, unknown>[] {
  const rand = createSeededRandom(42)
  const rows: Record<string, unknown>[] = []

  for (let i = 0; i < SAMPLE_ROW_COUNT; i += 1) {
    rows.push({
      'Order ID': `ORD-${100000 + i}`,
      'Total Amount ($)': randomMoney(rand, 5, 500),
      Category: ECOMM_CATEGORIES[randomInt(rand, 0, ECOMM_CATEGORIES.length - 1)],
      Region: ECOMM_REGIONS[randomInt(rand, 0, ECOMM_REGIONS.length - 1)],
      'Order Date': randomDate(rand, 2023, 2024),
      'Units Sold': randomInt(rand, 1, 20),
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Public accessor
// ---------------------------------------------------------------------------

/**
 * Returns a fully-parsed, pre-packaged sample dataset so users can explore the
 * app without uploading a file. Built through the same ingestion pipeline as
 * real uploads, guaranteeing identical typing/aggregation behavior.
 */
export function getSampleDataset(sampleId: SampleDatasetId): ParsedDataset {
  if (sampleId === 'saas') {
    return buildDatasetFromRows({
      id: 'sample-saas',
      fileName: 'saas_subscriptions.csv',
      fileSize: 0,
      rows: createSaasRows(),
    })
  }

  return buildDatasetFromRows({
    id: 'sample-ecommerce',
    fileName: 'ecommerce_sales.csv',
    fileSize: 0,
    rows: createEcommerceRows(),
  })
}
