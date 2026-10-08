import type { LucideIcon } from 'lucide-react'
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../components/layout/navigation'
import type { NavItem, PageKey } from '../types/navigation'

type NonDashboardPage = Exclude<PageKey, 'dashboard'>

interface ModulePlaceholderProps {
  page: NonDashboardPage
}

interface ModuleDetails {
  description: string
}

const MODULE_DETAILS: Record<NonDashboardPage, ModuleDetails> = {
  extraction: {
    description: 'Ingest spreadsheets and CSV files, map columns, and manage your extraction jobs.',
  },
  analytics: {
    description: 'Explore trends, segments, and key performance indicators across extracted datasets.',
  },
  reports: {
    description: 'Build, schedule, and export shareable reports from your analytics.',
  },
  settings: {
    description: 'Configure workspace preferences, team members, and integrations.',
  },
}

const ALL_NAV_ITEMS: readonly NavItem[] = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS]

export function ModulePlaceholder({ page }: ModulePlaceholderProps) {
  const item = ALL_NAV_ITEMS.find((nav) => nav.key === page)
  const Icon: LucideIcon | undefined = item?.icon

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center  border border-dashed border-surface-border bg-surface-card px-6 text-center">
      {Icon !== undefined && (
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center  bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-400">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <h2 className="text-xl font-semibold tracking-tight text-surface-text">
        {item?.label ?? page}
      </h2>
      <p className="mt-2 max-w-md text-sm text-surface-muted">{MODULE_DETAILS[page].description}</p>
    </div>
  )
}
