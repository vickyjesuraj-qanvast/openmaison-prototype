'use client'

import { useState } from 'react'
import { Card, CardRule } from '@/components/leads/detail/card'
import { displayDate, moneyCard } from '@/lib/format'
import { INVOICE_STATE_LABEL, linesWord } from '@/lib/projects/money'
import { PROFIT_EARLY, PROFIT_NO_COSTS, marginCell, profitGrade } from '@/lib/finance/profit'   // (gaps build F2 · simplify S-09, contract E: one rule for "--")
import type { ProjectDetail } from '@/lib/projects/queries'
import type { NeedHandlers } from './needs-card'
import { Row } from './row'
import styles from '../project-overview.module.css'

/* (parity Q-03) a sum on a record's card reads as the lead's mocked QUOTES card does — "S$ 77,900"; the Money tab keeps its cents */
const minusCard = (minor: number) => (minor < 0 ? `−${moneyCard(-minor)}` : moneyCard(minor))

/**
 * (simplify S-01 · S-09 · Q-08, P3 §6.6) MONEY — the owner's glance, each figure said once: the contract value, what is collected (its share
 * of the contract, beside how far the work is), what is outstanding with the overdue part in red, and the profit — **"--" with *Early
 * estimate* / *No costs yet* until the costs pass a tenth of the contract** (Money's own grading rule, `profitOf`: the whole contract never
 * reads as profit). (The next money step is Needs you's row on the same page — said once.) The payment stages fold under
 * "Payment stages ▾". Setting up: the agreed value, the stages folded, no profit. A completed project's closing summary takes this card's
 * place (the Overview). ↗ Money.
 */
export function MoneyCard({ d, onOpenMoney, stageHref, onChangeValue }: { d: ProjectDetail; h?: NeedHandlers; onOpenMoney: () => void; stageHref: (invoiceId: string | null) => string
  /** (simplify S-01) a value agreed outside a quote changes here — Getting started's done row was its door */
  onChangeValue?: () => void }) {
  const [open, setOpen] = useState(false)
  const m = d.money
  if (!m) return null
  const ms = m.summary
  const settingUp = d.project.stage === 'setting_up'
  const collectedPct = ms.contractMinor ? Math.round((ms.collectedMinor / ms.contractMinor) * 100) : null
  const workPct = d.schedule?.facts.progress.total ? d.schedule.facts.progress.pct : null
  const profit = m.profit && m.profit.state !== 'no_contract' && !settingUp ? m.profit : null
  const graded = profit ? profitGrade(profit) === 'graded' : false
  return (
    <div data-card="money">
      {/* (the calm UI build 2026-10-27, 3-02 · 3-03 · 3-04 · T-01) the tab's word, "To collect", "Payments · n" */}
      <Card title="Payments" headGap={8} metaRight={m.source === 'quote' ? `From the signed quote${m.lines ? ` · ${linesWord(m.lines)}` : ''}` : m.source === 'agreed' ? 'Agreed value' : undefined} testId="money"
            link={onChangeValue && m.source !== 'quote' && d.mayChange && d.project.stage !== 'completed' ? { label: 'Change the value', onClick: onChangeValue } : undefined}
            onOpen={onOpenMoney} openLabel="Open payments">
        <div className={styles.body}>
          <div className={styles.value}>
            <span className={styles.valueLabel}>Contract value</span>
            <span className={styles.valueFigure} data-testid="contract-value">{ms.contractMinor ? moneyCard(ms.contractMinor) : m.valueMinor ? moneyCard(m.valueMinor) : '--'}</span>
          </div>
          {ms.contractMinor ? (
            <div className={styles.group} data-testid="money-figures">
              <Row icon="account_balance" name="Collected" caption={collectedPct !== null ? `${collectedPct}%${workPct !== null ? ` · ${workPct}% of the work done` : ''}` : undefined}   /* (simplify S-01) short enough for the glance column */
                   meta={moneyCard(ms.collectedMinor)} onPress={onOpenMoney} testId="money-collected" />
              {ms.outstandingMinor ? <Row icon="schedule" state={ms.overdueMinor ? 'alert' : undefined} name="To collect" caption={ms.overdueMinor ? (ms.overdueMinor >= ms.outstandingMinor ? 'overdue' : `${moneyCard(ms.overdueMinor)} overdue`) : undefined}   /* the figure once */
                                          meta={moneyCard(ms.outstandingMinor)} onPress={onOpenMoney} testId="money-outstanding" /> : null}
              {/* (simplify S-09 · Q-08) graded, or "--" with the reason — Owners and Admins only (F2-Q1) */}
              {profit ? <Row icon="trending_up" name="Profit" caption={graded ? marginCell(profit).text : profitGrade(profit) === 'early' ? PROFIT_EARLY : PROFIT_NO_COSTS}
                             state={graded && profit.tier === 'at_risk' ? 'alert' : undefined} meta={graded ? minusCard(profit.profitMinor) : '--'} onPress={onOpenMoney} testId="money-profit" /> : null}
            </div>
          ) : null}
          {/* (simplify S-01 · each fact once) the next money step is Needs you's row on this page — the card stays a glance */}
          {ms.stages.length ? (
            <>
              <CardRule inset={0} />
              <div className={styles.group}>
                <Row icon={open ? 'keyboard_arrow_up' : 'expand_more'} name={`Payments · ${ms.stages.length}`} onPress={() => setOpen((o) => !o)} testId="payment-stages-toggle" toggle />
              </div>
              {open ? (
                <>
                  <div className={styles.group} data-testid="payment-stages">
                    {ms.stages.map((s) => (
                      <Row key={s.ref} icon="payments" state={s.invoice?.state === 'overdue' ? 'alert' : undefined} name={s.name}
                           href={stageHref(s.invoice?.id ?? null)}   /* (fix-A, A-39) a stage opens its invoice */
                           caption={s.invoice ? `${INVOICE_STATE_LABEL[s.invoice.state]}${s.invoice.number && s.invoice.dueAt ? ` · due ${displayDate(new Date(s.invoice.dueAt))}` : ''}` : s.due ?? undefined}
                           meta={<><span>{`${Number.isInteger(s.pct) ? s.pct : s.pct.toFixed(1)}%`}</span><span>·</span><span>{moneyCard(s.invoice?.amountMinor ?? s.nominalMinor)}</span></>} />
                    ))}
                  </div>
                  {m.splitName ? <p className={styles.note}>The {m.splitName.replace(/^default:\s*/i, '')} split, agreed when the project began.</p> : null}{/* (fix-D, D-44) */}
                </>
              ) : null}
            </>
          ) : <p className={styles.note}>No payment schedule yet — it comes from the signed quote.</p>}
        </div>
      </Card>
    </div>
  )
}
