'use client'

import type { ReactNode } from 'react'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import type { Member } from '@/lib/db/schema'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import type { EditorLead } from '@/lib/quotes/editor'
import styles from './general-info.module.css'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { readVariationDays, setVariationDays } from '@/app/projects/schedule-actions'   // (parity map, SC-094)
import { pickable } from '@/lib/leads/assign-policy'
import { isNric } from '@/lib/format'
import { MSG } from '@/lib/forms'

/** What General Info edits — the editor's local copy of the quote's fields (dates as the DateField's d/m/yyyy string). */
export type GeneralState = {
  title: string
  preparedBy: string | null
  validUntil: string
  projectRef: string
  nric: string
  customerId: string
  propertyType: string
  siteAddress: string
  /** (REG-588) A second client — co-owners: printed with the first, named on the signing link. */
  client2Name: string
  client2Nric: string
  /** (S44T — UAT row 321) The quote's Remarks, printed through `{remarks}`. */
  remarks: string
}

/**
 * General Info (the page's live frame 1273:29296; spec design-source/context/quote-editor/02-section-card-general-info.txt):
 * three rows of two 611 columns — Quote Title ‖ Client (read-only, open_in_new → the lead) · Property Type; Project Ref # ‖
 * Site Address; Prepared by (member) · Quote Valid Until ‖ NRIC · Customer ID. Every value is the quote's own record, seeded
 * from the lead and the signed-in member when the quote was created (REG-403). Fields save as they change (quote-editor.tsx
 * autosaves). The status pill lives in the header (REG-404).
 */
export function GeneralInfo({ value, lead, members, today, onChange, extra, variation = false }: {
  value: GeneralState
  lead: EditorLead
  members: Member[]
  today: Date
  onChange: (patch: Partial<GeneralState>) => void
  /** (REG-489) A fourth row under the mock's three — the Template field and its actions. */
  extra?: ReactNode
  /** (fix-D, D-24 · REG-1055) a variation order is named as one: its fields read Title and Valid until, never "Quote …" */
  variation?: boolean
}) {
  const names = pickable(members, value.preparedBy ? [value.preparedBy] : []).map((m) => m.name)   // (REG-646) active members, and the one already named
  const preparedName = members.find((m) => m.id === value.preparedBy)?.name ?? ''
  const [second, setSecond] = useState(!!(value.client2Name || value.client2Nric))   /* (REG-588) */
  /* (sweep S1 #33) An NRIC is checked like the lead form's (REG-607): the message shows once the box has been left, and clears as it is put right. */
  const [left, setLeft] = useState<{ nric?: boolean; client2Nric?: boolean }>({})
  const nricError = (k: 'nric' | 'client2Nric') => (left[k] && value[k].trim() && !isNric(value[k]) ? MSG.nric : undefined)
  return (
    <div className={styles.grid}>
      {/* Row 1 */}
      <TextField label={variation ? 'Title' : 'Quote Title'} value={value.title} onChange={(v) => onChange({ title: v })} />
      <div className={styles.pair}>
        {/* The client is the lead: the field shows the name and its trailing open_in_new opens the lead (1271:39696). */}
        <TextField label="Client" value={lead.name} mode="trigger" trailingIcon="open_in_new"
                   onOpen={() => { window.open(`/leads/${lead.id}`, '_blank', 'noopener') }} />
        <TextField label="Property Type" value={value.propertyType} mode="select" options={PROPERTY_TYPES}
                   onChange={(v) => onChange({ propertyType: v })} />
      </div>
      {/* Row 2 */}
      <TextField label="Project Ref #" value={value.projectRef} onChange={(v) => onChange({ projectRef: v })} />
      <TextField label="Site Address" value={value.siteAddress} onChange={(v) => onChange({ siteAddress: v })} />
      {/* Row 3 */}
      <div className={styles.pair}>
        <TextField label="Prepared by" value={preparedName} mode="select" options={names}
                   onChange={(name) => onChange({ preparedBy: members.find((m) => m.name === name)?.id ?? null })} />
        <DateField label={variation ? 'Valid until' : 'Quote Valid Until'} value={value.validUntil} today={today} icon="calendar_month" onChange={(v) => onChange({ validUntil: v })} />
      </div>
      <div className={styles.pair}>
        <TextField label="NRIC" value={value.nric} onChange={(v) => onChange({ nric: v })} maxLength={20}
                   onBlur={() => setLeft((l) => ({ ...l, nric: true }))} error={nricError('nric')} />
        <TextField label="Customer ID" value={value.customerId} onChange={(v) => onChange({ customerId: v })} maxLength={60} />
      </div>
      {/* (REG-588) A second client — co-owners sign together: {client_name} prints "A & B", the NRICs print side by side, both are named on the signing link. */}
      {second ? (
        <div className={styles.pair}>
          <TextField label="Second client" value={value.client2Name} onChange={(v) => onChange({ client2Name: v })} maxLength={120} />
          <TextField label="NRIC (second client)" value={value.client2Nric} onChange={(v) => onChange({ client2Nric: v })} maxLength={20}
                     onBlur={() => setLeft((l) => ({ ...l, client2Nric: true }))} error={nricError('client2Nric')} />
        </div>
      ) : (
        <div className={styles.pair}><Button appearance="text" onPress={() => setSecond(true)}>Add a second client</Button></div>
      )}
      {/* (S44T — UAT row 321, her UAT ask 2026-10-15) the quote's own remarks — printed wherever its template places the Remarks field */}
      <TextField label="Remarks" value={value.remarks} onChange={(v) => onChange({ remarks: v })} maxLength={500} helper="Prints where the quote’s template has the Remarks field" />
      {/* (parity map, SC-094 — 1.0's VO "timeline impact days") a variation order says how many days it adds to the schedule */}
      {variation ? <div className={styles.pair}><VariationDaysField /><span /></div> : null}
      {extra ? <div className={styles.full}>{extra}</div> : null}
    </div>
  )
}

/**
 * (parity map, SC-094) A variation order's **Adds days to the schedule** — whole days, empty = none. Its own read and save (the order's id is the
 * editor's address), as the order's Reason for the change saves itself: the client's approval locks it with the order, the paper and the
 * client's card print "Adds n days", and once approved the Schedule counts them and asks whether to move what follows. A refused save puts the
 * value back and says why.
 */
function VariationDaysField() {
  const params = useParams<{ quoteId?: string | string[] }>()
  const quoteId = typeof params?.quoteId === 'string' ? params.quoteId : null
  const snackbar = useSnackbar()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  const [locked, setLocked] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!quoteId) return
    let live = true
    void readVariationDays(quoteId).then((r) => {
      if (!live) return
      if ('error' in r) { setLocked(r.error); setReady(true); return }
      const v = r.days ? String(r.days) : ''
      setText(v); setSaved(v); setLocked(r.locked); setReady(true)
    }, () => { if (live) setReady(true) })
    return () => { live = false }
  }, [quoteId])
  const save = () => {
    if (!quoteId || text === saved) return
    const was = saved
    setSaved(text)
    void setVariationDays(quoteId, { days: text ? Number(text) : null }).then((r) => {
      if ('error' in r) { setText(was); setSaved(was); snackbar({ message: couldnt('save the days', refusalOf(r.error)) }); return }
      const v = r.days ? String(r.days) : ''
      setText(v); setSaved(v)
    }, () => { setText(was); setSaved(was); snackbar({ message: couldnt('save the days') }) })
  }
  return (
    <TextField label="Adds days to the schedule" value={text} onChange={(v) => setText(v.slice(0, 3))} onBlur={save} numeric="digits" inputMode="numeric" disabled={!ready || !!locked} name="vo-days"
               helper={locked ?? 'Printed on the variation order — once approved, the schedule can move what follows by these days'} />
  )
}
