'use client'

import { FEE_FIRST_WORDS, INVOICES_HELP, INVOICE_APPROVAL_POINTER, PAYMENT_TERMS_HELPER, VO_BILLING_WORDS } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { LeaveGuard } from '@/components/company/leave-guard'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setInvoiceRules } from '@/app/projects/money-actions'
import { TERMS_MAX, isVoBilling, type InvoiceRules, type VoBilling } from '@/lib/projects/invoices-model'
import { HelpLink } from '@/components/company/help-link'
import s from '@/app/settings/settings.module.css'

/**
 * (Projects round 5 — F-05 · F-13 · F-14) The Invoices card, on the module's grammars: the payment terms on the Project numbers card's
 * grammar (Discard · Save), and (gaps build B, item 13) whether a project's own split may open with a fixed fee, saved as it is pressed.
 * Owners and Admins change it; the module's read-only scope shows everyone else the rules.
 * (simplify S-15 · S-20, a deliberate change) The card moved from Settings › Projects to Settings › Finance › Money in, beside Costs and
 * Commission. Its approval switch went to Settings › Projects › *What waits for an Owner or an Admin* with the studio's other approvals (a
 * line here says so, with the link), and its invoice numbers to Finance's one *Document numbers* card.
 */
export function InvoiceSettings({ rules, canManage, linkProjects = true }: { rules: InvoiceRules; canManage: boolean
  /** (pending modules S06) whether the pointer to Settings › Projects is a link — not for Accounting, whose Settings is Finance alone */ linkProjects?: boolean }) {
  const snackbar = useSnackbar()
  const [feeFirst, setFeeFirst] = useState(!!rules.feeFirst)   // (gaps build B, item 13)
  const [busy, setBusy] = useState(false)
  const [terms, setTerms] = useState(String(rules.termsDays))
  const [saved, setSaved] = useState({ terms: String(rules.termsDays) })
  const dirty = terms !== saved.terms
  const termsN = terms.trim() === '' ? NaN : Number(terms)
  const termsOk = Number.isFinite(termsN) && termsN >= 0 && termsN <= TERMS_MAX

  /* (gaps build B, item 13 — 1.0's fee first, off by default) a project's own split may open with a fixed-amount stage */
  const toggleFee = async (next: boolean) => {
    if (busy) return
    setFeeFirst(next); setBusy(true)
    try {
      const r = await setInvoiceRules({ rules: { feeFirst: next } })
      if ('error' in r) { setFeeFirst(!next); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      snackbar({ message: next ? 'A project’s own split can now open with a fixed fee' : 'A project’s own split is shares only' })
    } catch (e) { setFeeFirst(!next); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  /* (S44O — UAT row 360, her UAT ask 2026-10-15) how an approved variation order is billed — saved as it is picked, put back when refused */
  const [voBilling, setVoBilling] = useState<VoBilling>(rules.voBilling ?? 'spread')
  const pickVoBilling = async (v: string) => {
    if (busy || !isVoBilling(v) || v === voBilling) return
    const prev = voBilling
    setVoBilling(v); setBusy(true)
    try {
      const r = await setInvoiceRules({ rules: { voBilling: v } })
      if ('error' in r) { setVoBilling(prev); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      snackbar({ message: VO_BILLING_WORDS.done[v] })
    } catch (e) { setVoBilling(prev); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const save = async (): Promise<boolean> => {
    if (!canManage) { snackbar({ message: 'Only Owners and Admins change the invoice rules' }); return false }
    if (!termsOk) { snackbar({ message: `Payment terms are 0 to ${TERMS_MAX} days` }); return false }
    setBusy(true)
    try {
      const r = await setInvoiceRules({ rules: { termsDays: termsN } })
      if ('error' in r) { snackbar({ message: couldnt('save the invoice rules', refusalOf(r.error)) }); return false }
      setTerms(String(r.rules.termsDays)); setSaved({ terms: String(r.rules.termsDays) })
      snackbar({ message: `Saved — an invoice is due ${r.rules.termsDays === 0 ? 'on receipt' : `${r.rules.termsDays} days after it is sent`}` })
      return true
    } catch (e) { snackbar({ message: couldnt('save the invoice rules', refusalOf(e)) }); return false }
    finally { setBusy(false) }
  }
  return (
    <>
      <LeaveGuard dirty={canManage && dirty} what="the invoice rules" onSave={save} onDiscard={() => setTerms(saved.terms)} />
      <div className={s.setting} id="invoice-settings" data-testid="invoice-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Invoices</span>
          <span className={s.settingHelp}>{INVOICES_HELP}</span>
        </div>
        {/* (simplify S-20) the approval switch sits with the studio's other approvals; (S-15) the numbers on Document numbers, above */}
        <span className={s.settingHelp} data-testid="invoice-approval-pointer">{INVOICE_APPROVAL_POINTER.lead}{linkProjects ? <HelpLink href="/settings?section=projects#invoice-approval" testId="invoice-approval-link">{INVOICE_APPROVAL_POINTER.link}</HelpLink> : INVOICE_APPROVAL_POINTER.link}{INVOICE_APPROVAL_POINTER.end}</span>
        {/* (gaps build B, item 13 — 1.0's fee first, off by default) */}
        <div className={s.switchGroup} role="group" aria-labelledby="invoice-split-rules">
          {/* (parity map, MI-021) the rule reaches a quote's Payment Schedule too: its first payment gets the % · S$ switch */}
          <span id="invoice-split-rules" className={s.reasonLabel}>Payment schedules and splits</span>
          <label className={s.switchRow} data-testid="invoice-fee-first"><Switch size="sm" isSelected={feeFirst} isDisabled={!canManage || busy} onChange={(v: boolean) => { void toggleFee(v) }} aria-label={FEE_FIRST_WORDS.label} /><span>{FEE_FIRST_WORDS.label} <span className={s.settingHelp}>{FEE_FIRST_WORDS.help}</span></span></label>
        </div>
        {/* (S44O — UAT row 360) the house chips, as Contracts' link days; the line under them says what the pick does */}
        <div className={s.switchGroup} data-testid="invoice-vo-billing-group">
          <span id="invoice-vo-billing" className={s.reasonLabel}>{VO_BILLING_WORDS.label}</span>
          <Chips label={VO_BILLING_WORDS.label} options={VO_BILLING_WORDS.options} value={voBilling} onChange={(v) => { void pickVoBilling(v) }} disabled={!canManage || busy} testId="invoice-vo-billing" />
          <span className={s.settingHelp} data-testid="invoice-vo-billing-help">{VO_BILLING_WORDS.help[voBilling]}</span>
        </div>
        <div className={s.numGrid}>
          <TextField label="Payment terms (days)" value={terms} numeric="digits" maxLength={2} onChange={setTerms} helper={PAYMENT_TERMS_HELPER} error={!termsOk ? `0 to ${TERMS_MAX} days` : undefined} />
        </div>
        {canManage ? <div className={s.settingActions}>
          <Button variant="secondary" appearance="outlined" onPress={() => setTerms(saved.terms)} isDisabled={!dirty || busy}>Discard</Button>
          <Button onPress={() => { void save() }} isDisabled={!dirty || busy || !termsOk} data-testid="invoice-settings-save">{busy ? 'Saving…' : 'Save invoice rules'}</Button>
        </div> : null}
      </div>
    </>
  )
}
