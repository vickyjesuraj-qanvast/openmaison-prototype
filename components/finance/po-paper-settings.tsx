'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { LeaveGuard } from '@/components/company/leave-guard'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setCostRules } from '@/app/finance/cost-actions'
import { PO_PAPER_TERMS_MAX, PO_PAPER_TEXT_MAX, type PoPaperLayout } from '@/lib/finance/rules'
import s from '@/app/settings/settings.module.css'

/**
 * (parity map, FB-097 — 1.0's Accounts Setup › Document Templates › Purchase Order) Settings › Finance › Money out › **The purchase order
 * paper**: what every PO prints besides its figures — a header note under the title, a terms block, an acceptance block for the vendor to sign
 * (on to start since pending modules S06, as 1.0 printed it; it fills itself in once the vendor accepts on the link), and the issuing entity's bank (off to start — vendors bill the studio,
 * not the other way round). The Invoice paper card's grammar (fields, the two switches, Discard · Save, the leave guard); saved with the cost
 * rules. Owners and Admins change it; the module's read-only scope shows everyone else.
 */
export function PoPaperSettings({ paper, canManage }: { paper: PoPaperLayout; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [draft, setDraft] = useState<PoPaperLayout>(paper)
  const [saved, setSaved] = useState<PoPaperLayout>(paper)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (patch: Partial<PoPaperLayout>) => setDraft((d) => ({ ...d, ...patch }))
  const save = async (): Promise<boolean> => {
    if (!canManage) { snackbar({ message: 'Only Owners and Admins change the cost rules' }); return false }
    setBusy(true)
    try {
      const r = await setCostRules({ paper: draft })
      if ('error' in r) { snackbar({ message: couldnt('save the purchase order paper', refusalOf(r.error)) }); return false }
      setDraft(r.rules.paper); setSaved(r.rules.paper)
      snackbar({ message: 'Saved — purchase orders print it from now on' })   // invented copy (parity map, FB-097)
      return true
    } catch (e) { snackbar({ message: couldnt('save the purchase order paper', refusalOf(e)) }); return false } finally { setBusy(false) }
  }
  return (
    <>
      <LeaveGuard dirty={canManage && dirty} what="the purchase order paper" onSave={save} onDiscard={() => setDraft(saved)} />
      <div className={s.setting} id="po-paper" data-testid="po-paper-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>The purchase order paper</span>
          <span className={s.settingHelp}>What purchase orders print besides their figures — your note and terms, a block for the vendor to sign, and whether your bank details show. The vendor reads it on the PO’s link too.</span>
        </div>
        <TextField label="Header note" value={draft.header} onChange={(v) => set({ header: v })} maxLength={PO_PAPER_TEXT_MAX} multiline={2} helper="Under the title — “Please confirm delivery a day ahead”" />
        <TextField label="Terms" value={draft.terms} onChange={(v) => set({ terms: v })} maxLength={PO_PAPER_TERMS_MAX} multiline={4} helper="Delivery, workmanship, warranty — blank prints no terms block" />
        <div className={s.switchGroup} role="group" aria-labelledby="po-paper-shows">
          <span id="po-paper-shows" className={s.reasonLabel}>On the paper</span>
          <label className={s.switchRow}><Switch size="sm" isSelected={draft.acceptance} isDisabled={!canManage} onChange={(v: boolean) => set({ acceptance: v })} aria-label="An acceptance block for the vendor" />
            <span>An acceptance block for the vendor <span className={s.settingHelp}>· name, signature and date — filled in once they accept on the link</span></span></label>
          <label className={s.switchRow}><Switch size="sm" isSelected={draft.showBank} isDisabled={!canManage} onChange={(v: boolean) => set({ showBank: v })} aria-label="Your bank details" />
            <span>Your bank details <span className={s.settingHelp}>· the issuing entity’s bank and PayNow — usually left off, vendors bill you</span></span></label>
        </div>
        {canManage ? <div className={s.settingActions}>
          <Button variant="secondary" appearance="outlined" onPress={() => setDraft(saved)} isDisabled={!dirty || busy}>Discard</Button>
          <Button onPress={() => { void save() }} isDisabled={!dirty || busy} data-testid="po-paper-save">{busy ? 'Saving…' : 'Save the paper'}</Button>
        </div> : null}
      </div>
    </>
  )
}
