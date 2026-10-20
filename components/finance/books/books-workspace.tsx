'use client'

import type { BooksData, CommissionsData } from '@/lib/finance/books'
import type { XeroData } from '@/lib/finance/xero-server'
import { FinanceFrame } from '../finance-frame'
import { CommissionsView } from './commissions-view'
import { AccountingView } from './accounting-view'
import b from './books.module.css'

/**
 * (gaps build F2 — the books, F2-Q1) Finance's books tabs on Company's frame, beside F1's money-out lists — the figures handed in by the server
 * (lib/finance/books.ts — `moneyOf`, `costsOf`, `commissionsOf`, never recomputed here); a row opens its record. (REG-1361) Reports is Company ›
 * Reports › Finance; (one-home N-01) the Pipeline went there too.
 * (simplify S-10 · S-11 · S-12, his "build everything" 2026-10-09) The Overview became To do (components/finance/todo/); what stays here is
 * **Commission** (everyone — a member's own, *My commission*) and **Xero** (the Accounting tab, renamed; Owners and Admins).
 */
export function BooksWorkspace({ tab, runs, todoCount, books, commissions, xero, open }: {
  tab: 'commissions' | 'accounting'; runs: boolean; todoCount: number
  books?: BooksData | null; commissions?: CommissionsData | null; xero?: XeroData | null
  open?: string | null
}) {
  let body: React.ReactNode = null
  if (tab === 'commissions' && commissions) body = <CommissionsView data={commissions} open={open ?? null} />
  else if (tab === 'accounting' && books && xero) body = <AccountingView books={books} xero={xero} />
  return (
    <FinanceFrame tab={tab} runs={runs} todoCount={todoCount} asks={commissions ? commissions.asks.some((a) => a.status === 'open') : undefined}>
      <div className={b.page} data-testid={`finance-${tab}`}>{body}</div>
    </FinanceFrame>
  )
}
