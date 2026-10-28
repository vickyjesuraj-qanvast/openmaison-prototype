'use client'

import { useState } from 'react'
import { Chips } from '@/components/om/chips'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ModuleHead } from '@/app/settings/module-head'
import { FINANCE_GROUP_LABELS, financeModuleHelp } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too · (the calm UI build 2026-10-27) the groups' names
import type { CostRules } from '@/lib/finance/rules'
import { CostSettings } from './cost-settings'
import { PoPaperSettings } from './po-paper-settings'
import { ExpenseCategorySettings, type ExpenseCategoriesData } from './expense-categories-settings'
import { CommissionSettings, CreditSettings } from './books/books-settings'   // (gaps build F2)
import type { BooksSettings } from '@/lib/finance/books'
import { InvoiceSettings } from '@/components/projects/money/invoice-settings'
import { InvoicePaperSetting, type PaperEntity } from '@/components/projects/money/invoice-paper-settings'
import { PaymentSettings, type PaymentSettingsData } from '@/components/projects/money/payments-settings'
import type { InvoiceRules } from '@/lib/projects/invoices-model'
import type { PaperSettings } from '@/lib/projects/invoices-paper'
import { DocumentNumbersSetting } from '@/app/settings/document-numbers'
import type { DocumentNumbersData } from '@/lib/settings/document-numbers'
import s from '@/app/settings/settings.module.css'

/** (simplify S-15) Money in's cards, as Settings › Projects held them until now: invoices' rules, their paper, client payments. */
export type MoneyInSettings = { invoices: InvoiceRules; paper: PaperSettings | null; entities: PaperEntity[]; payments: Pick<PaymentSettingsData, 'rules' | 'team'> | null }

/** A named group of the module's cards — its caption, then the cards (simplify S-15). */
function Group({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section className={s.cardGroup} aria-labelledby={id} data-testid={id}>
      <h3 id={id} className={s.groupLabel}>{label}</h3>
      <div className={s.cardStack}>{children}</div>
    </section>
  )
}

/** (the calm UI build 2026-10-27 — 5-34) The two printed papers under one group, one at a time by its chip (Invoice · Purchase order). Both stay
    mounted (the other is hidden), so an edit not yet saved on one is still there, and its leave guard still asks, when the chip changes. */
function PrintedPapers({ invoice, po }: { invoice: React.ReactNode; po: React.ReactNode }) {
  const [paper, setPaper] = useState<'invoice' | 'po'>('invoice')
  if (!invoice && !po) return null
  if (!invoice || !po) return <Group id="finance-papers" label="Printed papers">{invoice ?? po}</Group>
  return (
    <Group id="finance-papers" label="Printed papers">
      <Chips label="Printed papers" options={[{ value: 'invoice', label: 'Invoice' }, { value: 'po', label: 'Purchase order' }]} value={paper} onChange={(v) => setPaper(v === 'po' ? 'po' : 'invoice')} testId="finance-papers-pick" />
      <div hidden={paper !== 'invoice'}>{invoice}</div>
      <div hidden={paper !== 'po'}>{po}</div>
    </Group>
  )
}

/**
 * (gaps build F1 — F1-Q1) Settings › Finance, live with money out (the module kept its place as an inert tab until it came): the Costs card —
 * the two approvals, the limit, when vendors are paid. Owners and Admins change it; everyone else reads it in the read-only scope. F2 added
 * Commission.
 * (simplify S-15 — P3 §6.7 · F1 §6.8, his "build everything" 2026-10-09) **One Settings home for money rules.** The module keeps its name and
 * gathers every money rule: the one **Document numbers** card first (INV · RCT · CN · PO, one Save — the house order, numbers first), then
 * *Money in* — Invoices · Invoice paper · Client payments · Credit notes, moved here from Settings › Projects (an old address to one of them
 * lands here, settings-view.tsx) — *Money out* — Costs — and *Commission*. The head's *Kept in Company:* links name where the records sit:
 * Profile (how a client pays — the bank, PayNow — the issuing entities and the GST switch), Templates › Payment schedules, Vendors and
 * Commissions.
 */
export function FinanceSettings({ costs, books, money, numbers, studio, canManage, from: _from, linksOpen = () => true }: {
  costs: { rules: CostRules; numbers: string[]; /** (pending modules S06) the studio's expense categories */ categories?: ExpenseCategoriesData } | null
  /** (gaps build F2) commission */ books?: BooksSettings | null
  /** (simplify S-15) money in, from Settings › Projects */ money?: MoneyInSettings | null
  /** (simplify S-15) the one Document numbers card */ numbers?: DocumentNumbersData | null
  studio: string; canManage: boolean; from: string
  /** (pending modules S06) whether the viewer opens a *Kept in Company* link — Accounting sees only Vendors and Commission (lib/settings/roles.ts `opensPath`) */
  linksOpen?: (href: string) => boolean
}) {
  const readOnly = !canManage
  return (
    <section className={s.panel} aria-labelledby="settings-finance-title" data-testid="settings-finance">
      <div className={s.sectionHead}>
        {/* (the calm UI build 2026-10-27 — 5-17) one help line; the Company doors (Profile — with its old pointer sentence as the door's tooltip and
            its test id, Payment schedules, Vendors, Commission) are the module's Related line, drawn after it (settings-view.tsx `ModuleRelated`) */}
        <ModuleHead id="settings-finance-title" title="Finance" help={financeModuleHelp(studio)} readOnly={readOnly} />
      </div>
      <ReadOnlyScope readOnly={readOnly}>
        {numbers ? <DocumentNumbersSetting data={numbers} canManage={canManage} /> : null}
        {/* (the calm UI build 2026-10-27 — §2) the groups take Finance's names: Client payments · Costs · Commission (ids unchanged) */}
        <Group id="finance-money-in" label={FINANCE_GROUP_LABELS.in}>
          {money ? <InvoiceSettings rules={money.invoices} canManage={canManage} linkProjects={linksOpen('/settings?section=projects')} /> : null}   {/* (Projects round 5) */}
          {money?.payments ? <PaymentSettings rules={money.payments.rules} team={money.payments.team} canManage={canManage} /> : null}   {/* (Projects round 6) */}
          <CreditSettings />   {/* (gaps build F2 — F2-Q9) */}
        </Group>
        <Group id="finance-money-out" label={FINANCE_GROUP_LABELS.out}>
          {costs ? <CostSettings rules={costs.rules} canManage={canManage} /> : null}
          {costs?.categories ? <ExpenseCategorySettings data={costs.categories} canManage={canManage} /> : null}   {/* (pending modules S06) */}
        </Group>
        <PrintedPapers invoice={money?.paper ? <InvoicePaperSetting paper={money.paper} entities={money.entities} canManage={canManage} /> : null}   /* (gaps build B, item 14) */
                       po={costs ? <PoPaperSettings paper={costs.rules.paper} canManage={canManage} /> : null} />   {/* (parity map, FB-097) */}
        {books ? (
          <Group id="finance-commission" label={FINANCE_GROUP_LABELS.commission}>
            <CommissionSettings data={books.commission} canManage={canManage} />   {/* (gaps build F2 — F2-Q4) */}
          </Group>
        ) : null}
      </ReadOnlyScope>
    </section>
  )
}
