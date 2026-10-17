'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { RowMenu, type RowAction } from './cost-tables'
import money from '@/components/projects/money/money.module.css'
import own from '@/components/projects/money/invoice-dialogs.module.css'
import fin from './finance.module.css'
import panel from './cost-panel.module.css'

/*
 * (gaps build F1 — money out) One record of money out in the house side panel (Drawer — a sheet on a phone): its one word and why, its facts,
 * its lines and totals, its files, what was paid on it, its history, and its steps as buttons (the first filled, the rest outlined), the rare
 * ones in its ⋮. A PO, a bill and an expense each hand it their parts — the panel never decides a rule; the host's actions do.
 * (simplify S-08, P3 §6.4) Every money record's panel — an invoice too: `amounts` (its totals when it has no lines), `links` (Preview · Download
 * PDF · Copy the no-login link), `lists` (its payments and its credit notes, each line with its status and its own ⋮, `lit` on the one a
 * `?open=` named). Finance passes none of them, so its POs, bills and expenses read exactly as before.
 */
export type PanelLine = { key: string; text: ReactNode; sub?: ReactNode; amount: number }
export type PanelDoc = { id: string; name: string; image: boolean }
export type PanelPayment = { id: string; text: ReactNode; amount: number; reversed?: string | null }
export type PanelHistory = { key: string; at: number; text: ReactNode }
/** (S-08) A line of a list in the panel — a payment, a credit note: its words, its status, its amount, its ⋮. */
export type PanelListRow = { id: string; text: ReactNode; sub?: ReactNode; status?: ReactNode; amount: number; void?: boolean; lit?: boolean; menu?: RowAction[]; menuTitle?: string; menuLabel?: string; testId?: string; attrs?: Record<string, string | undefined> }
export type PanelList = { title: string; rows: PanelListRow[]; empty?: string; testId?: string }
export type PanelLink = { label: string; icon: string; run: () => void; testId?: string }

export function CostPanel({ open, title, status, note, facts, lines, totals, docs, payments, history, actions, menu, onClose, testId, extra, amounts, links, lists }: {
  open: boolean
  title: string
  status: ReactNode
  /** the record's own words — a vendor's answer, a reason it was sent back */ note?: { text: ReactNode; tone?: 'alert' } | null
  facts: { label: string; value: ReactNode }[]
  lines?: PanelLine[]
  totals?: { label: string; amount: number; grand?: boolean }[]
  docs?: PanelDoc[]
  payments?: PanelPayment[]
  history?: PanelHistory[] | null
  actions: { label: string; run: () => void; primary?: boolean; testId?: string; disabled?: boolean }[]
  menu: RowAction[]
  onClose: () => void
  testId: string
  extra?: ReactNode
  /** (S-08) A record with no lines (a stage's invoice): its amount, GST inside, credited, paid, to pay. */
  amounts?: { label: string; amount: number; grand?: boolean }[]
  /** (S-08) The record's paper: Preview · Download PDF · Copy the no-login link. */
  links?: PanelLink[]
  /** (S-08) Its payments and its credit notes, each with its ⋮. */
  lists?: PanelList[]
}) {
  return (
    <Drawer open={open} title={title} onClose={onClose} width="wide" label={title}
            actions={menu.length ? <RowMenu label={`More actions for ${title}`} title={title} items={menu} /> : undefined}
            footer={actions.length ? <div className={fin.actions}>{actions.map((a) => <Button key={a.label} variant={a.primary ? 'primary' : 'secondary'} appearance={a.primary ? 'filled' : 'outlined'} onPress={a.run} isDisabled={a.disabled} data-testid={a.testId}>{a.label}</Button>)}</div> : undefined}>
      <div className={fin.panel} data-testid={testId}>
        <div className={fin.status}>{status}</div>
        {note ? <p className={fin.note} data-tone={note.tone}>{note.text}</p> : null}
        <dl className={money.facts}>{facts.map((f) => <FactRow key={f.label} {...f} />)}</dl>
        {links?.length ? (
          <div className={panel.links} data-testid={`${testId}-links`}>
            {links.map((l) => <Button key={l.label} appearance="text" iconStart={<Icon name={l.icon} size={20} />} onPress={l.run} data-testid={l.testId}>{l.label}</Button>)}
          </div>
        ) : null}
        {lines?.length ? (
          <section className={fin.section}>
            <h3 className={fin.sectionTitle}>Lines</h3>
            <ul className={fin.panelLines}>
              {lines.map((l) => <li key={l.key} className={fin.panelLine}><span>{l.text}</span><span className={money.num}>{money2(l.amount)}</span>{l.sub ? <span className={money.sub}>{l.sub}</span> : null}</li>)}
            </ul>
            {totals?.length ? <dl className={own.totals}>{totals.map((t) => <FactRow key={t.label} label={t.label} value={money2(t.amount)} grand={t.grand} />)}</dl> : null}
          </section>
        ) : null}
        {amounts?.length ? (
          <section className={fin.section}>
            <h3 className={fin.sectionTitle}>Amount</h3>
            <dl className={own.totals}>{amounts.map((t) => <FactRow key={t.label} label={t.label} value={money2(t.amount)} grand={t.grand} />)}</dl>
          </section>
        ) : null}
        {extra}
        {docs?.length ? (
          <section className={fin.section}>
            <h3 className={fin.sectionTitle}>Files</h3>
            <div className={fin.docs}>
              {docs.map((d) => (
                <a key={d.id} className={fin.doc} href={`/finance/doc/${d.id}`} target="_blank" rel="noopener" data-testid="cost-doc">
                  <span className={fin.docThumb} style={{ backgroundImage: `url(/finance/doc/${d.id}?thumb=1)` }}>{d.image ? null : null}</span>
                  <span className={fin.docName}>{d.name}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
        {payments ? (
          <section className={fin.section}>
            <h3 className={fin.sectionTitle}>Paid</h3>
            {payments.length ? (
              <ul className={fin.panelLines}>
                {payments.map((p) => <li key={p.id} className={fin.panelLine}><span className={p.reversed ? money.void : undefined}>{p.text}</span><span className={`${money.num}${p.reversed ? ` ${money.void}` : ''}`}>{money2(p.amount)}</span>{p.reversed ? <span className={money.sub} data-tone="alert">Reversed — “{p.reversed}”</span> : null}</li>)}
              </ul>
            ) : <span className={money.sub}>Nothing paid yet.</span>}
          </section>
        ) : null}
        {lists?.map((list) => (
          <section key={list.title} className={fin.section} data-testid={list.testId}>
            <h3 className={fin.sectionTitle}>{list.title}</h3>
            {list.rows.length ? (
              <ul className={panel.list}>
                {list.rows.map((r) => (
                  <li key={r.id} className={panel.row} data-focus={r.lit ? '' : undefined} data-testid={r.testId} {...(r.attrs ?? {})}>
                    <span className={panel.rowText}>
                      <span className={r.void ? money.void : undefined}>{r.text}</span>
                      {r.sub ? <span className={money.sub}>{r.sub}</span> : null}
                      {r.status ? <span className={panel.rowStatus}>{r.status}</span> : null}
                    </span>
                    <span className={`${money.num}${r.void ? ` ${money.void}` : ''}`}>{money2(r.amount)}</span>
                    <span className={panel.rowMenu}>{r.menu?.length ? <RowMenu label={r.menuLabel ?? `More actions for ${r.menuTitle ?? 'this line'}`} title={r.menuTitle ?? list.title} items={r.menu} /> : null}</span>
                  </li>
                ))}
              </ul>
            ) : <span className={money.sub}>{list.empty ?? 'None yet.'}</span>}
          </section>
        ))}
        {history ? (
          <section className={fin.section}>
            <h3 className={fin.sectionTitle}>History</h3>
            {history.length ? (
              <ul className={fin.history}>{history.map((h) => <li key={h.key} className={fin.historyRow}><Icon name="history" size={16} weight={300} /> {h.text} · {displayDate(new Date(h.at))}</li>)}</ul>
            ) : <span className={money.sub}>Nothing yet.</span>}
          </section>
        ) : null}
      </div>
    </Drawer>
  )
}
function FactRow({ label, value, grand }: { label: string; value: ReactNode; grand?: boolean }) {
  return <><dt className={grand ? own.grand : undefined}>{label}</dt><dd className={grand ? own.grand : undefined}>{value}</dd></>
}
