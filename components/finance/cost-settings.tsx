'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { LeaveGuard } from '@/components/company/leave-guard'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setCostRules } from '@/app/finance/cost-actions'
import { money2 } from '@/lib/quotes/math'
import { BILL_TOLERANCE_MAX, PO_LIMIT_MAX_MINOR, PO_TERMS, type CostRules, type PoTerms } from '@/lib/finance/rules'
import s from '@/app/settings/settings.module.css'
import u from '@/components/projects/updates/update-review-setting.module.css'

/**
 * (gaps build F1 — F1-Q5 · Q6 · Q8 · Q11) Settings › Finance › Costs, on the module's two grammars — the Invoices card's: the two approval rules on
 * the house event table (saved as they are pressed, a refusal puts the switch back), then the approval limit, the usual payment terms and the PO
 * numbers on the Project numbers card's grammar (the live example — Discard · Save). Owners and Admins change it; everyone else reads it.
 * (simplify S-15, a deliberate change) The PO numbers went to the module's one *Document numbers* card (INV · RCT · CN · PO, one Save); the
 * card keeps the two approvals, the limit and the terms. Settings › Projects' *What waits for an Owner or an Admin* names the two approvals
 * and links here (S-20) — they are set here only.
 * (S44R — UAT row 361, call C8, as recommended — his UAT ask 2026-10-15; REVERSES F1-Q10 "bills: no approval") A third rule on the table: a
 * supplier bill over the limit with no PO, or more than its PO by over the tolerance beside the limit, waits for an Owner's or an Admin's OK
 * before it is paid. Its own row and its own field, saved like the rest.
 */
export function CostSettings({ rules, canManage }: { rules: CostRules; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [poApproval, setPoApproval] = useState(rules.poApproval)
  const [expenseApproval, setExpenseApproval] = useState(rules.expenseApproval)
  const [billApproval, setBillApproval] = useState(rules.billApproval)   // (S44R, C8)
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState((rules.poLimitMinor / 100).toFixed(0))
  const [terms, setTerms] = useState<PoTerms>(rules.terms)
  const [tolerance, setTolerance] = useState(String(rules.billTolerancePct))   // (S44R, C8)
  const [saved, setSaved] = useState({ limit: (rules.poLimitMinor / 100).toFixed(0), terms: rules.terms, tolerance: String(rules.billTolerancePct) })
  const dirty = limit !== saved.limit || terms !== saved.terms || tolerance !== saved.tolerance
  const limitMinor = Math.round(Number(limit.replace(/,/g, '')) * 100)
  const limitOk = limit.trim() !== '' && Number.isFinite(limitMinor) && limitMinor >= 0 && limitMinor <= PO_LIMIT_MAX_MINOR
  const tolerancePct = Number(tolerance)
  const toleranceOk = tolerance.trim() !== '' && Number.isInteger(tolerancePct) && tolerancePct >= 0 && tolerancePct <= BILL_TOLERANCE_MAX
  const approvalsLock = usePlanLock('internal_approvals')   // (pending modules S19) approvals are Pro: off on Free, a change opens the lock
  type RuleKey = 'poApproval' | 'expenseApproval' | 'billApproval'
  const setterOf = (key: RuleKey) => (key === 'poApproval' ? setPoApproval : key === 'expenseApproval' ? setExpenseApproval : setBillApproval)
  const toggle = async (key: RuleKey, next: boolean) => {
    if (busy) return
    if (approvalsLock.locked) { approvalsLock.open(); return }
    const set = setterOf(key)
    set(next); setBusy(true)
    try {
      const r = await setCostRules({ [key]: next })
      if ('error' in r) { set(!next); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      snackbar({ message: key === 'poApproval' ? (next ? `A Designer’s or a Manager’s PO over ${money2(r.rules.poLimitMinor)}, or with an advance, now waits for an Owner or an Admin` : 'The project’s team now sends its POs at any amount')
        /* (S44R, C8) invented copy */
        : key === 'billApproval' ? (next ? `A bill over ${money2(r.rules.poLimitMinor)} with no PO, or more than ${r.rules.billTolerancePct}% over its PO, now waits for an Owner or an Admin before it is paid` : 'Bills are paid as soon as they are recorded')
        : next ? 'A Designer’s or a Manager’s expense now waits for an Owner or an Admin' : 'Expenses now count as soon as they are logged' })
    } catch (e) { set(!next); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const save = async (): Promise<boolean> => {
    if (!canManage) { snackbar({ message: 'Only Owners and Admins change the cost rules' }); return false }
    if (!limitOk) { snackbar({ message: 'Enter the approval limit in dollars' }); return false }
    if (!toleranceOk) { snackbar({ message: `Enter how far over its PO a bill may come, 0 to ${BILL_TOLERANCE_MAX}%` }); return false }
    setBusy(true)
    try {
      const r = await setCostRules({ poLimitMinor: limitMinor, terms, billTolerancePct: tolerancePct })
      if ('error' in r) { snackbar({ message: couldnt('save the cost rules', refusalOf(r.error)) }); return false }
      const l = (r.rules.poLimitMinor / 100).toFixed(0)
      setLimit(l); setTerms(r.rules.terms); setTolerance(String(r.rules.billTolerancePct)); setSaved({ limit: l, terms: r.rules.terms, tolerance: String(r.rules.billTolerancePct) })
      snackbar({ message: 'Saved — new purchase orders and bills follow these rules' })
      return true
    } catch (e) { snackbar({ message: couldnt('save the cost rules', refusalOf(e)) }); return false } finally { setBusy(false) }
  }
  const discard = () => { setLimit(saved.limit); setTerms(saved.terms); setTolerance(saved.tolerance) }
  const row = (key: RuleKey, on: boolean, icon: string, label: string, help: string, testId: string) => (
    <div className={s.eventRow} role="row" data-testid={testId}>
      <span role="cell" className={s.eventName}><Icon name={icon} size={20} weight={300} /><span><span>{label}</span><span className={s.eventHelp}>{help}</span></span></span>
      <span role="cell" className={s.eventWho} data-label="Who approves">Owners and Admins</span>
      <span role="cell" className={s.eventCol} data-label="On"><Switch size="sm" isSelected={on} isDisabled={!canManage || busy} onChange={(v: boolean) => { void toggle(key, v) }} aria-label={label} /></span>
    </div>
  )
  return (
    <>
      <LeaveGuard dirty={canManage && dirty} what="the cost rules" onSave={save} onDiscard={discard} />
      <div className={s.setting} id="cost-settings" data-testid="cost-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Costs</span>
          <span className={s.settingHelp}>When POs, expenses and bills need an Owner’s or an Admin’s approval, and when vendors are paid.</span>   {/* (the calm UI build, 5-34 · T-05) one sentence — POs' numbers are the Document numbers card's own row, above */}
        </div>
        <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="Cost approvals" data-card-table="">
          <div className={s.eventHead} role="row"><span role="columnheader">Rule</span><span role="columnheader">Who approves</span><span role="columnheader" className={s.eventCol}>On</span></div>
          {row('poApproval', poApproval, 'local_shipping', 'Purchase orders over the limit need approval', `A Designer’s or a Manager’s PO over the limit below, or one with an advance, waits; an Owner’s or an Admin’s goes at once.`, 'cost-po-approval')}
          {row('expenseApproval', expenseApproval, 'shopping_cart', 'Expenses need approval', 'A Designer’s or a Manager’s expense — and a claim to be paid back — waits; an Owner’s or an Admin’s counts at once.', 'cost-expense-approval')}
          {/* (S44R — UAT row 361, call C8) invented copy */}
          {row('billApproval', billApproval, 'receipt_long', 'Supplier bills over the limit or off their PO need approval', 'A bill over the limit below with no PO, or over its PO by more than the tolerance below, waits for approval before it is paid; an Owner’s or an Admin’s goes at once.', 'cost-bill-approval')}
        </div>
        <div className={s.numGrid}>
          <TextField label="Approval limit (S$)" value={limit} numeric="amount" onChange={setLimit} helper="A PO — or a bill on no PO — over this, GST included, waits for approval" error={!limitOk ? 'Enter the limit in dollars' : undefined} />
          <TextField label="A bill may come over its PO by (%)" value={tolerance} numeric="digits" maxLength={3} onChange={setTolerance} helper="More than this over its PO, a bill waits for approval" error={!toleranceOk ? `Enter 0 to ${BILL_TOLERANCE_MAX}` : undefined} name="bill-tolerance" />
        </div>
        <div>
          <span className={s.reasonLabel}>When vendors are paid, to start</span>
          <Chips label="When vendors are paid" options={PO_TERMS.map((t) => ({ value: t.value, label: t.label }))} value={terms} onChange={(v) => setTerms(v as PoTerms)} testId="cost-terms" />
        </div>
        {canManage ? <div className={s.settingActions}>
          <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
          <Button onPress={() => { void save() }} isDisabled={!dirty || busy || !limitOk} data-testid="cost-settings-save">{busy ? 'Saving…' : 'Save'}</Button>
        </div> : null}
      </div>
    </>
  )
}
