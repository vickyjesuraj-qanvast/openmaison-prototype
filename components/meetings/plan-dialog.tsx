'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { DateTimeField } from '@/components/om/date-field'
import { AssigneeField } from '@/components/leads/assignee-field'
import { MSG } from '@/lib/forms'
import { formatInputDateTime, parseInputDateTime, displayTime } from '@/lib/format'
import { AIMS, WHERE, DEFAULT_LENGTH_MIN, firstOf, type AimKey, type WhereKind } from '@/lib/meetings/model'
import type { TeamMember } from '@/lib/meetings/queries'
import { clashesFor } from '@/app/meetings/actions'
import styles from './meetings.module.css'

export type PlanValue = { aim: AimKey; aimNote: string; when: string; lengthMin: number; whereKind: WhereKind; place: string; memberIds: string[]; remind: boolean }
export const LENGTHS = [{ min: 30, label: '30 minutes' }, { min: 60, label: '1 hour' }, { min: 90, label: '1½ hours' }, { min: 120, label: '2 hours' }, { min: 180, label: '3 hours' }]
const lengthLabel = (m: number) => LENGTHS.find((l) => l.min === m)?.label ?? `${m} minutes`

/**
 * (pending modules S23 — 1.0's unmerged meetings branch "Schedule Meeting": type · location · agenda · Schedule & Send Invite) Plan a meeting
 * with the lead's client, or change one's plan: what it is for (the co-pilot's aims), when and for how long, where (the Met log's three, the
 * address or the video link), who from the studio, and the reminder task. A clash with another planned meeting of the same people is said
 * under the people, never refused. No mock draws it — the house Dialog and fields. *(invented copy: every label and line)*
 */
export function PlanDialog({ open, onClose, onSave, team, client, defaults, today, busy, editing, meetingId }: {
  open: boolean; onClose: () => void
  onSave: (v: PlanValue) => Promise<boolean>
  team: TeamMember[]
  client: string
  defaults: Partial<PlanValue>
  today: Date
  busy?: boolean
  /** Changing a plan — the reminder is kept in step, not asked again */
  editing?: boolean
  /** the meeting being changed, left out of its own clash */
  meetingId?: string | null
}) {
  const init = (): PlanValue => ({ aim: defaults.aim ?? 'first_consultation', aimNote: defaults.aimNote ?? '', when: defaults.when ?? '', lengthMin: defaults.lengthMin ?? DEFAULT_LENGTH_MIN, whereKind: defaults.whereKind ?? 'In person', place: defaults.place ?? '', memberIds: defaults.memberIds ?? [], remind: defaults.remind ?? true })
  const [v, setV] = useState<PlanValue>(init)
  const [tried, setTried] = useState(false)
  const [shown, setShown] = useState(open)
  if (open !== shown) { setShown(open); if (open) { setV(init()); setTried(false) } }   // render-phase reset on each open
  const set = (p: Partial<PlanValue>) => setV((x) => ({ ...x, ...p }))
  const at = parseInputDateTime(v.when)
  const errors = { when: !v.when ? MSG.required : !at ? MSG.dateTime : undefined, people: v.memberIds.length ? undefined : MSG.assignee }
  /* who else is booked then — read as the time and the people settle */
  const [clash, setClash] = useState<{ client: string; at: number }[]>([])
  const key = `${at?.getTime() ?? ''}|${v.lengthMin}|${v.memberIds.join(',')}`
  useEffect(() => {
    if (!open || !at) return
    let live = true
    const t = setTimeout(() => { void clashesFor({ startsAt: at.getTime(), lengthMin: v.lengthMin, memberIds: v.memberIds, except: meetingId ?? null }).then((r) => { if (live) setClash(r) }, () => {}) }, 300)
    return () => { live = false; clearTimeout(t) }
  }, [open, key])   // eslint-disable-line react-hooks/exhaustive-deps -- the key says what changed
  const placeLabel = v.whereKind === 'Video call' ? 'Video call link (optional)' : v.whereKind === 'Showroom' ? 'Showroom address (optional)' : 'Address (optional)'
  const save = async () => {
    setTried(true)
    if (errors.when || errors.people) return
    const ok = await onSave(v)
    if (ok) onClose()
  }
  const lengths = useMemo(() => LENGTHS.map((l) => l.label), [])
  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Change the plan' : 'Plan a meeting'} subtitle={`With ${firstOf(client)}`} size="modal" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="plan-save">{editing ? 'Save changes' : 'Plan the meeting'}</Button></>}>
      <div className={styles.form} data-testid="plan-dialog">
        <div className={styles.group}>
          <span className={styles.groupLabel}>What it’s for</span>
          <Chips label="What it’s for" value={v.aim} onChange={(a) => set({ aim: a as AimKey })} options={AIMS.map((a) => ({ value: a.key, label: a.label }))} testId="plan-aim" />
        </div>
        <TextField label="What you want out of it (optional)" value={v.aimNote} onChange={(x) => set({ aimNote: x })} maxLength={200} />
        <div className={styles.pair}>
          <DateTimeField label="Date and time" required value={v.when} onChange={(x) => set({ when: x })} today={today} error={tried ? errors.when : undefined} />
          <TextField label="How long" value={lengthLabel(v.lengthMin)} mode="select" options={lengths} onChange={(x) => set({ lengthMin: LENGTHS.find((l) => l.label === x)?.min ?? DEFAULT_LENGTH_MIN })} />
        </div>
        <div className={styles.pair}>
          <TextField label="Where" required value={v.whereKind} mode="select" options={[...WHERE]} onChange={(x) => set({ whereKind: x as WhereKind })} />
          <TextField label={placeLabel} value={v.place} onChange={(x) => set({ place: x })} maxLength={200} />
        </div>
        <div className={styles.group}>
          <AssigneeField label="Who’s going" team={team} value={v.memberIds} onChange={(ids) => set({ memberIds: ids })} error={tried ? errors.people : undefined} />
          {clash.length ? <p className={styles.note} data-testid="plan-clash">{clash.map((c) => `Already meeting ${c.client} at ${displayTime(new Date(c.at))}`).join(' · ')}</p> : null}
        </div>
        {editing ? null : (
          <div className={styles.check}>
            <Checkbox isSelected={v.remind} onChange={(on: boolean) => set({ remind: on })} data-testid="plan-remind">Add a reminder task</Checkbox>
            <span className={styles.checkHelp}>Due at the meeting, for the people going — it closes when the meeting starts.</span>
          </div>
        )}
      </div>
    </Dialog>
  )
}

/** A plan's `when` from a time — the field's own format. */
export const whenOf = (ms: number | null | undefined) => (ms ? formatInputDateTime(new Date(ms)) : '')
