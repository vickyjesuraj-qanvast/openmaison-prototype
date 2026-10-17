'use client'

import { useState } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setDefaultCapacity } from '@/app/projects/workload-actions'
import { setStarterTasks } from '@/app/projects/compliance-actions'
import { CAPACITY_MAX, CAPACITY_MIN } from '@/lib/projects/workload'
import { HelpLink } from '@/components/company/help-link'
import s from '@/app/settings/settings.module.css'
import u from '../updates/update-review-setting.module.css'
import w from './workload.module.css'

const COUNTS = Array.from({ length: CAPACITY_MAX - CAPACITY_MIN + 1 }, (_, i) => `${i + CAPACITY_MIN} ${i + CAPACITY_MIN === 1 ? 'project' : 'projects'}`)

/**
 * (gaps build I, I-Q3 · I-Q11) Settings › Projects › Workload and Compliance — two cards on the module's grammars: Workload's one select (the
 * Schedule card's Alerts lead time, a number from 1 to 20) for how many running projects one person can carry unless Set capacity says
 * otherwise; Compliance's one rule on the card table (the Handover rule's look) — *Start each project with its compliance tasks*, on by
 * default. Each saves as it is changed, with Undo; a refusal puts it back and says why. Owners and Admins change them; everyone else reads.
 */
export function WorkloadComplianceSettings({ capacity, starterTasks, canManage }: { capacity: number; starterTasks: boolean; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [cap, setCap] = useState(capacity)
  const [seenCap, setSeenCap] = useState(capacity)
  if (seenCap !== capacity) { setSeenCap(capacity); setCap(capacity) }
  const [on, setOn] = useState(starterTasks)
  const [seenOn, setSeenOn] = useState(starterTasks)
  if (seenOn !== starterTasks) { setSeenOn(starterTasks); setOn(starterTasks) }
  const [busy, setBusy] = useState(false)

  const saveCap = async (n: number, prev: number, undo = false) => {
    if (busy || n === prev) return
    setCap(n); setBusy(true)
    try {
      const r = await setDefaultCapacity({ n })
      if ('error' in r) { setCap(prev); snackbar({ message: couldnt('change the capacity', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: 'workload-capacity', message: `One person now runs up to ${n} ${n === 1 ? 'project' : 'projects'} unless set otherwise`, actionLabel: 'Undo', onAction: () => { void saveCap(prev, n, true) } })
    } catch (e) { setCap(prev); snackbar({ message: couldnt('change the capacity', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const toggle = async (next: boolean, undo = false) => {
    if (busy) return
    setOn(next); setBusy(true)
    try {
      const r = await setStarterTasks({ on: next })
      if ('error' in r) { setOn(!next); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: 'compliance-starter', message: next ? 'New projects now start with their compliance tasks' : 'New projects now start with no compliance tasks', actionLabel: 'Undo', onAction: () => { void toggle(!next, true) } })
    } catch (e) { setOn(!next); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const label = 'Start each project with its compliance tasks'
  return (
    <>
      <div className={s.setting} id="workload-settings" data-testid="workload-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Workload</span>
          {/* (one-home N-17) a member's own number lives on Company › Members now (the view's Set capacity writes the same column) */}
          <span className={s.settingHelp}>How many running projects one person can carry at once — the Projects listing’s Workload view measures each person against it. Set someone’s own number under <HelpLink href="/company/members">Company › Members</HelpLink>, or in the view’s Set capacity.</span>
        </div>
        <div className={w.settingField}>
          <TextField label="Projects one person can run at once" mode="select" value={COUNTS[cap - CAPACITY_MIN] ?? ''} options={COUNTS} disabled={!canManage || busy}
                     onChange={(v) => { const n = Number(v.split(' ')[0]); if (n) void saveCap(n, cap) }} helper="Completed projects never count." />
        </div>
      </div>
      <div className={s.setting} id="compliance-settings" data-testid="compliance-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Compliance</span>
          <span className={s.settingHelp}>Each project’s Compliance tab lists Singapore’s rules for its kind of home — HDB flats, condos and landed homes — phase by phase.</span>
        </div>
        <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="Compliance tasks" data-card-table="">
          <div className={s.eventHead} role="row">
            <span role="columnheader">Rule</span><span role="columnheader">Who gets them</span><span role="columnheader" className={s.eventCol}>On</span>
          </div>
          <div className={s.eventRow} role="row" data-testid="compliance-starter-row">
            <span role="cell" className={s.eventName}>
              <Icon name="verified_user" size={20} weight={300} />
              <span><span>{label}</span><span className={s.eventHelp}>Up to ten tasks a new project needs first — the permit, the licensed workers, the neighbours’ notice — each tied to its item on the Compliance tab, so ticking one ticks the other.</span></span>
            </span>
            <span role="cell" className={s.eventWho} data-label="Who gets them">The project’s team</span>
            <span role="cell" className={s.eventCol} data-label="On">
              <Switch size="sm" isSelected={on} isDisabled={!canManage || busy} onChange={(v: boolean) => { void toggle(v) }} aria-label={label} />
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
