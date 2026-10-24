'use client'

import type { ReactNode } from 'react'
import { CompanyShell } from '@/components/company/company-shell'
import { HelpLink } from '@/components/company/help-link'
import { financeTabsFor } from '@/lib/finance/sections'
import { FinanceGhost } from './finance-ghost'

/**
 * (simplify S-10 · S-11, his "build everything" 2026-10-09) Finance's frame, once for its five tabs: Company's L1 header with the door to the
 * numbers (*Reports ›*, Owners and Admins — Reports is the one home for numbers, REG-1361, so Finance repeats none: F1 §6.3 ①), and the strip —
 * To do · Money out · Vendors · Commission · Xero (a member's: To do · Money out · Vendors · My commission) — To do carrying what waits on you
 * (S-04's count rule). The page's own ghost rides with it (REG-708).
 */
export function FinanceFrame({ tab, runs, todoCount, asks, children }: { tab: string; runs: boolean; todoCount: number
  /** (S43D, F2-01) Commission: whether the page opens with its asks band — the reveal's ghost draws it then */
  asks?: boolean; children: ReactNode }) {
  const tabs = financeTabsFor(runs).map((t) => ({ label: t.label, href: t.href, count: t.key === 'todo' && todoCount > 0 ? todoCount : undefined }))
  const actions = runs ? <HelpLink href="/company/reports/finance" testId="finance-reports-door" standalone>Reports ›</HelpLink> : null
  return (
    <CompanyShell title="Finance" tabs={tabs} crumb="Finance" actions={actions} skeleton={<FinanceGhost tab={tab} runs={runs} asks={asks} />}>
      {children}
    </CompanyShell>
  )
}
