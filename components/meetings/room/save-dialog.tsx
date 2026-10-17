'use client'

import { useMemo, useState } from 'react'
import { Button, Checkbox, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { displayDue, groupDigits, moneyCard } from '@/lib/format'
import { KEY_COLLECTION_OPTIONS, STYLE_OPTIONS } from '@/lib/leads/enums'
import type { MeetingBrief } from '@/lib/meetings/model'
import styles from './room.module.css'

export type SaveLead = { propertyType: string; areaSqft: number | null; budgetMinor: number; style: string | null; keyCollection: string | null }
export type SavePlan = { fields: { propertyType?: string; areaSqft?: number; budgetMinor?: number; style?: string; keyCollection?: string }; followUp: { title: string; dueAt: number } | null; tasks: string[] }
type Field = { key: keyof SavePlan['fields']; label: string; from: string; to: string; value: string | number }

/** The follow-up 1.0 made: two days on, at 10:00 (save-to-lead's rule). */
export const followUpDue = (now: number) => { const d = new Date(now); d.setDate(d.getDate() + 2); d.setHours(10, 0, 0, 0); return d.getTime() }

/**
 * (pending modules S23 — 1.0's "Lead updates (preview → apply)" and its Save to Lead) What the brief heard, written to the lead — each change shown
 * as it is now and as it would be, ticked, before anything is written (S10's rule: a change is proposed and confirmed): the kind of home, its
 * size, the budget (the top of a range, 1.0's rule), the style (the lead form's list only), the key collection; the follow-up task (1.0's: two
 * days on at 10:00, the first next step — left unticked, and said, when the lead has one already); the other next steps as tasks. 1.0's "may
 * advance the stage" is the Met step's own move, offered on the page. *(invented copy)*
 */
export function SaveToLeadDialog({ open, onClose, onSave, brief, lead, client, now, existingFollowUp, busy }: {
  open: boolean; onClose: () => void
  onSave: (p: SavePlan) => Promise<boolean>
  brief: MeetingBrief
  lead: SaveLead
  client: string
  now: number
  existingFollowUp: { title: string; dueAt: number | null } | null
  busy?: boolean
}) {
  const fields = useMemo<Field[]>(() => {
    const p = brief.profile
    const out: Field[] = []
    if (p.propertyType && p.propertyType !== lead.propertyType) out.push({ key: 'propertyType', label: 'Property type', from: lead.propertyType || 'empty', to: p.propertyType, value: p.propertyType })
    if (p.areaSqft && p.areaSqft !== lead.areaSqft) out.push({ key: 'areaSqft', label: 'Area size', from: lead.areaSqft ? `${groupDigits(String(lead.areaSqft))} sq ft` : 'empty', to: `${groupDigits(String(p.areaSqft))} sq ft`, value: p.areaSqft })
    if (p.budgetMinor && p.budgetMinor.max !== lead.budgetMinor) out.push({ key: 'budgetMinor', label: 'Budget', from: lead.budgetMinor > 0 ? moneyCard(lead.budgetMinor) : 'empty', to: moneyCard(p.budgetMinor.max), value: p.budgetMinor.max })
    const style = p.styles.find((x) => (STYLE_OPTIONS as readonly string[]).includes(x))
    if (style && style !== lead.style) out.push({ key: 'style', label: 'Style', from: lead.style || 'empty', to: style, value: style })
    if (p.keyCollection && (KEY_COLLECTION_OPTIONS as readonly string[]).includes(p.keyCollection) && p.keyCollection !== lead.keyCollection) out.push({ key: 'keyCollection', label: 'Key collection', from: lead.keyCollection || 'empty', to: p.keyCollection, value: p.keyCollection })
    return out
  }, [brief, lead])
  const firstStep = brief.actions[0] ?? 'Follow up after the meeting'
  const [picked, setPicked] = useState<Set<string>>(() => new Set(fields.map((f) => f.key)))
  const [follow, setFollow] = useState(!existingFollowUp)
  const [title, setTitle] = useState(`Follow up: ${firstStep}`)
  const [steps, setSteps] = useState<Set<string>>(() => new Set())
  const [shown, setShown] = useState(open)
  if (open !== shown) { setShown(open); if (open) { setPicked(new Set(fields.map((f) => f.key))); setFollow(!existingFollowUp); setTitle(`Follow up: ${firstStep}`); setSteps(new Set()) } }
  const due = followUpDue(now)
  const others = brief.actions.slice(1)
  const count = picked.size + (follow ? 1 : 0) + steps.size
  const save = async () => {
    const plan: SavePlan = { fields: Object.fromEntries(fields.filter((f) => picked.has(f.key)).map((f) => [f.key, f.value])), followUp: follow && title.trim() ? { title: title.trim(), dueAt: due } : null, tasks: [...steps] }
    if (await onSave(plan)) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Save to the lead" subtitle={`What the meeting heard, onto ${client}’s lead — nothing is written until you save`} size="modal" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy || count === 0} data-testid="save-lead-confirm">{count === 0 ? 'Nothing ticked' : 'Save to the lead'}</Button></>}>
      <div className={styles.form} data-testid="save-lead-dialog">
        <div className={styles.group}>
          <span className={styles.groupLabel}>The lead’s details</span>
          {fields.length ? fields.map((f) => (
            <div key={f.key} className={styles.checkRow} data-testid="save-field">
              <Checkbox isSelected={picked.has(f.key)} onChange={(on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(f.key); else n.delete(f.key); return n })}>
                {f.label}: <s>{f.from}</s> → <b>{f.to}</b>
              </Checkbox>
            </div>
          )) : <p className={styles.line} data-testid="save-no-fields">Nothing new about the home or the budget — the lead already says it.</p>}
        </div>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Follow-up</span>
          <div className={styles.checkRow}><Checkbox isSelected={follow} onChange={(on: boolean) => setFollow(on)} data-testid="save-follow">Add a follow-up task — {displayDue(new Date(due))}</Checkbox></div>
          {follow ? <TextField label="The task" value={title} onChange={setTitle} maxLength={200} /> : null}
          {existingFollowUp ? <p className={styles.note} data-testid="save-follow-exists">{client} has a follow-up already: “{existingFollowUp.title}”{existingFollowUp.dueAt ? ` · ${displayDue(new Date(existingFollowUp.dueAt))}` : ''}.</p> : null}
        </div>
        {others.length ? (
          <div className={styles.group}>
            <span className={styles.groupLabel}>The next steps as tasks</span>
            {others.map((a) => (
              <div key={a} className={styles.checkRow}><Checkbox isSelected={steps.has(a)} onChange={(on: boolean) => setSteps((s) => { const n = new Set(s); if (on) n.add(a); else n.delete(a); return n })}>{a}</Checkbox></div>
            ))}
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/** Edit one of the brief's words — the summary, the follow-up message, the notes, or the next steps (one a line). */
export function EditTextDialog({ open, onClose, title, label, value, onSave, help, busy, lines = false }: {
  open: boolean; onClose: () => void; title: string; label: string; value: string
  onSave: (v: string) => Promise<boolean>; help?: string; busy?: boolean
  /** the next steps: one a line */
  lines?: boolean
}) {
  const [v, setV] = useState(value)
  const [shown, setShown] = useState(open)
  if (open !== shown) { setShown(open); if (open) setV(value) }
  return (
    <Dialog open={open} onClose={onClose} title={title} size="modal" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void onSave(v).then((ok) => { if (ok) onClose() }) }} isDisabled={busy || !v.trim()} data-testid="edit-save">Save</Button></>}>
      <div className={styles.form}>
        <TextArea label={label} value={v} onChange={(x: string) => setV(x)} className={styles.editBox} data-testid="edit-text" />
        {help || lines ? <p className={styles.note}>{help ?? 'One step a line.'}</p> : null}
      </div>
    </Dialog>
  )
}
