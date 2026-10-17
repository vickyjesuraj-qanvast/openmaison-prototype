'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useState } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setHandoverReview } from '@/app/projects/ending-actions'
import st from '@/app/settings/settings.module.css'
import u from '../updates/update-review-setting.module.css'

/**
 * (Projects round 7, Q-24 · Q-03) Settings › Projects › Stages and handover — the three stages in one sentence, then the one rule on the
 * house card table (the Updates rule's look, REG-949): *Handover needs an owner's review*, who reviews, its switch (DS `sm`), OFF by default.
 * It saves as it is pressed; a refusal puts the switch back and says why. Owners and Admins change it; the module's read-only scope shows
 * everyone else the rule.
 */
export function HandoverSetting({ on, canManage, rule = true }: { on: boolean; canManage: boolean
  /** (simplify S-20) false on Settings › Projects: the switch sits in What waits for an Owner or an Admin */ rule?: boolean }) {
  const snackbar = useSnackbar()
  const [value, setValue] = useState(on)
  const [seen, setSeen] = useState(on)
  if (seen !== on) { setSeen(on); setValue(on) }
  const [busy, setBusy] = useState(false)
  /* (fix-E, E-15) Saved as it is pressed, with Undo — the portal's section switches' way (REG-1014); a second press replaces the snackbar
     in place (its `key`) instead of stacking another. */
  const approvalsLock = usePlanLock('internal_approvals')   // (pending modules S19) approvals are Pro: off on Free, a change opens the lock
  const toggle = async (next: boolean, undo = false) => {
    if (approvalsLock.locked) { approvalsLock.open(); return }
    if (busy) return
    setValue(next); setBusy(true)
    try {
      const r = await setHandoverReview({ on: next })
      if ('error' in r) { setValue(!next); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: 'handover-review', message: next ? 'A Designer’s or a Manager’s handover now waits for an Owner or an Admin' : 'The project’s team now completes its own handover', actionLabel: 'Undo', onAction: () => { void toggle(!next, true) } })
    } catch (e) { setValue(!next); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const label = 'Handover needs an owner’s review'
  return (
    <div className={st.setting} id="handover-settings" data-testid="handover-setting">
      <div className={st.settingHead}>
        <span className={st.settingTitle}>Stages and handover</span>
        <span className={st.settingHelp}>Every project runs Setting up → In progress → Completed. Complete handover ends it once its checklist is met; completed, its schedule, choices and agreed money are read-only until an Owner or an Admin reopens it — payments can still be recorded.</span>
      </div>
      {!rule ? <span className={st.settingHelp} data-testid="handover-review-pointer">Whether a Designer’s or a Manager’s handover waits for an owner’s review is switched under What waits for an Owner or an Admin, above.</span> : (
      <div className={`${st.eventTable} ${u.table}`} role="table" aria-label="Handover review" data-card-table="">
        <div className={st.eventHead} role="row">
          <span role="columnheader">Rule</span><span role="columnheader">Who reviews</span><span role="columnheader" className={st.eventCol}>On</span>
        </div>
        <div className={st.eventRow} role="row" data-testid="handover-review-row">
          <span role="cell" className={st.eventName}>
            <Icon name="approval" size={20} weight={300} />
            <span><span>{label}</span><span className={st.eventHelp}>A Designer’s or a Manager’s handover waits for review; an Owner’s or an Admin’s completes at once. Off, the project’s team completes its own handover once the checklist is met.</span></span>
          </span>
          <span role="cell" className={st.eventWho} data-label="Who reviews">Owners and Admins</span>
          <span role="cell" className={st.eventCol} data-label="On">
            <Switch size="sm" isSelected={value} isDisabled={!canManage || busy} onChange={(v: boolean) => { void toggle(v) }} aria-label={label} />
          </span>
        </div>
      </div>
      )}
    </div>
  )
}
