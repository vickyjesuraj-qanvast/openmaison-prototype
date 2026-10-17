'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useState } from 'react'
import { Button, Checkbox, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setUpdateReview, setUpdateReviewers } from '@/app/projects/updates-actions'
import { UPDATE_REVIEW_WORDS } from '@/lib/settings/copy'
import s from '@/app/settings/settings.module.css'
import u from './update-review-setting.module.css'

type TeamMember = { id: string; name: string; role: string; active: boolean }
const runs = (role: string) => role === 'Owner' || role === 'Admin'

/**
 * (REG-949, Q-17) The rule *Updates need review before the client sees them*, who reviews, and its switch (DS `sm`, REG-460) — a row of the
 * house card table (the Notifications event table, REG-727). On by default. It saves as it is pressed, as the Notifications switches do; a
 * refusal puts the switch back and says why. Owners and Admins change it; the module's read-only scope shows everyone else the rule.
 * (gaps build D, item 10 — 1.0 D-76 · D-77's named approvers) *Who reviews*: Owners and Admins always, and the members named here — a short
 * form dialog of the studio's active Designers and Managers, ticked; it closes once the save lands, with Undo.
 * (simplify S-20, a deliberate change) It was Settings › Projects › Updates, a card of its own; the row now sits in *What waits for an Owner
 * or an Admin* (app/settings/owner-approvals.tsx) with the studio's other approvals, and keeps the card's anchor (`#update-settings`, the
 * Who may do what link) and its test ids.
 */
export function UpdateReviewRow({ on, canManage, reviewers = [], team = [] }: { on: boolean; canManage: boolean; reviewers?: string[]; team?: TeamMember[] }) {
  const snackbar = useSnackbar()
  const [value, setValue] = useState(on)
  const [seen, setSeen] = useState(on)
  if (seen !== on) { setSeen(on); setValue(on) }
  const [busy, setBusy] = useState(false)
  const [named, setNamed] = useState<string[]>(reviewers)
  const [seenNamed, setSeenNamed] = useState(reviewers)
  if (seenNamed !== reviewers) { setSeenNamed(reviewers); setNamed(reviewers) }
  const [picking, setPicking] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  /* (fix-E, E-15) with Undo, replaced in place on a second press (the portal switches' way, REG-1014) */
  const approvalsLock = usePlanLock('internal_approvals')   // (pending modules S19) approvals are Pro: off on Free, a change opens the lock
  const toggle = async (next: boolean, undo = false) => {
    if (busy) return
    if (approvalsLock.locked) { approvalsLock.open(); return }
    setValue(next); setBusy(true)
    try {
      const r = await setUpdateReview({ on: next })
      if ('error' in r) { setValue(!next); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: 'update-review', message: next ? 'A Designer’s or a Manager’s update now waits for an Owner or an Admin' : 'Updates now reach the client as soon as they’re posted', actionLabel: 'Undo', onAction: () => { void toggle(!next, true) } })
    } catch (e) { setValue(!next); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? null
  const who = ['Owners and Admins', ...named.map(nameOf).filter((x): x is string => !!x)].join(', ')
  const eligible = team.filter((m) => m.active && !runs(m.role))
  const saveNamed = async (ids: string[], undo = false) => {
    if (approvalsLock.locked) { approvalsLock.open(); return false }
    const before = named
    setSaving(true)
    try {
      const r = await setUpdateReviewers({ ids })
      if ('error' in r) { snackbar({ message: couldnt('change who reviews', refusalOf(r.error)) }); return false }
      setNamed(r.ids); setPicking(null)
      if (!undo) snackbar({ key: 'update-reviewers', message: r.ids.length ? `${['Owners and Admins', ...r.ids.map(nameOf).filter(Boolean)].join(', ')} review updates` : 'Owners and Admins review updates', actionLabel: 'Undo', onAction: () => { void saveNamed(before, true) } })
      return true
    } catch (e) { snackbar({ message: couldnt('change who reviews', refusalOf(e)) }); return false }
    finally { setSaving(false) }
  }
  const label = UPDATE_REVIEW_WORDS.label   // (pending modules S17) the words the Settings ghost reads too (lib/settings/copy.ts)
  return (
    <>
      <div className={s.eventRow} role="row" id="update-settings" data-testid="update-review-row">
        <span role="cell" className={s.eventName}>
          <Icon name={UPDATE_REVIEW_WORDS.icon} size={20} weight={300} />
          <span><span>{label}</span><span className={s.eventHelp}>{UPDATE_REVIEW_WORDS.help}</span></span>
        </span>
        <span role="cell" className={`${s.eventWho} ${u.who}`} data-label="Who approves">
          <span data-testid="update-reviewers">{who}</span>
          {canManage && eligible.length ? <Button appearance="text" onPress={() => setPicking(named)} data-testid="update-reviewers-change">{named.length ? 'Change' : 'Add a reviewer'}</Button> : null}
        </span>
        <span role="cell" className={s.eventCol} data-label="On">
          <Switch size="sm" isSelected={value} isDisabled={!canManage || busy} onChange={(v: boolean) => { void toggle(v) }} aria-label={label} />
        </span>
      </div>
      <Dialog open={picking !== null} onClose={() => { if (!saving) setPicking(null) }} title="Who reviews updates" size="form" width={400} closeOnScrim={false} portal
              subtitle="Owners and Admins always review. Tick anyone else who may approve or send back an update — their own posts go out at once."
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setPicking(null)} isDisabled={saving}>Cancel</Button><Button onPress={() => { if (picking) void saveNamed(picking) }} isDisabled={saving} data-testid="update-reviewers-save">{saving ? 'Saving…' : 'Save'}</Button></>}>
        <ul className={u.pick} data-testid="update-reviewers-list">
          {eligible.map((m) => (
            <li key={m.id}>
              <label className={u.pickRow}>
                <Checkbox isSelected={!!picking?.includes(m.id)} onChange={(v: boolean) => setPicking((p) => (p ? (v ? [...p, m.id] : p.filter((x) => x !== m.id)) : p))} aria-label={m.name} />
                <span className={u.pickName}>{m.name}</span>
                <span className={u.pickRole}>{m.role}</span>
              </label>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  )
}
