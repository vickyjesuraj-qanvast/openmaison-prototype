'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import type { Next } from './cost-tables'
import plan from '@/components/company/plan/plan.module.css'
import c from './finance-cards.module.css'

/**
 * (the calm UI build 2026-10-27 — 5-10 · T-15, his "make it absolutely simple") A Finance list on a phone, on the Leads card model
 * (components/leads/lead-cards.tsx — its card, composed): line 1 the record's name (a tap opens it) and its amount, line 2 the project and when it is
 * due (red only when it is ours and late), its status chip with the status words, then ONE text verb and the ⋮ — never the table turned sideways
 * into six label lines. The section head is the house table's (plan.module.css), so the page and its ghost keep their places. Every value a
 * row's cells showed is on its card; each card keeps its row's marks (`data-po` · `data-bill` · … · `data-focus`) and the cells' testids.
 * Desks and tablets keep the tables; this is ≤767 only (the house `MOBILE`).
 */
export type FinanceCard = {
  /** The record's name — a tap opens it. */
  title: ReactNode
  open?: () => void
  /** the name's testid, as its desk cell has it (`po-open` · `bill-open` · …) */
  openTestId?: string
  /** a line under the name that belongs to it — a PO's title, a bill's reference */
  sub?: ReactNode
  amount?: ReactNode
  /** the project · when it is due — the facts after the name */
  line?: ReactNode
  status?: ReactNode
  next?: Next
  menu?: ReactNode
  /** a reversed or void record reads struck through */
  faint?: boolean
}

export function FinanceCards<T>({ title, help, actions, rows, rowKey, card, empty, noResults, testId, rowAttrs }: {
  title: string
  help?: ReactNode
  actions?: ReactNode
  rows: readonly T[]
  rowKey: (r: T) => string
  card: (r: T) => FinanceCard
  empty: ReactNode
  noResults?: ReactNode
  testId: string
  rowAttrs?: (r: T) => Record<string, string | undefined>
}) {
  return (
    <section className={plan.section} aria-label={title} data-testid={testId}>
      <div className={plan.sectionHead}>
        <div className={plan.sectionTitles}>
          <h2 className={plan.sectionTitle}>{title}</h2>
          {help ? <span className={plan.sectionHelp}>{help}</span> : null}
        </div>
        {actions ? <div className={plan.sectionTools}>{actions}</div> : null}
      </div>
      {rows.length === 0 ? noResults ?? <p className={plan.empty}>{empty}</p> : (
        <ul className={c.list} aria-label={title}>
          {rows.map((r) => {
            const s = card(r)
            return (
              <li key={rowKey(r)} className={c.card} data-card="" data-faint={s.faint ? '' : undefined} {...(rowAttrs?.(r) ?? {})}>
                <div className={c.head}>
                  <span className={c.names}>
                    {s.open ? <button type="button" className={c.name} onClick={s.open} data-testid={s.openTestId}>{s.title}</button> : <span className={c.nameText}>{s.title}</span>}
                    {s.sub ? <span className={c.sub}>{s.sub}</span> : null}
                  </span>
                  {s.amount ? <span className={c.amount}>{s.amount}</span> : null}
                </div>
                {s.line ? <p className={c.line}>{s.line}</p> : null}
                {s.status ? <div className={c.status}>{s.status}</div> : null}
                {s.next || s.menu ? (
                  <div className={c.foot}>
                    {s.next ? <Button appearance="text" onPress={s.next.run} data-testid={s.next.testId}>{s.next.label}</Button> : null}
                    {s.menu}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** The facts after a card's name, joined as the house writes them — "Shalini Menon · due 13 Oct · 14 days late" — the empty ones left out. */
export function cardLine(...parts: (ReactNode | null | undefined | false)[]): ReactNode {
  const xs = parts.filter((p): p is ReactNode => p !== null && p !== undefined && p !== false && p !== '')
  return xs.length ? xs.map((p, i) => <span key={i}>{i ? ' · ' : ''}{p}</span>) : null
}
