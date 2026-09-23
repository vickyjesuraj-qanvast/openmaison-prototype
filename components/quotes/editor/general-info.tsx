'use client'

import type { ReactNode } from 'react'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import type { Member } from '@/lib/db/schema'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import type { EditorLead } from '@/lib/quotes/editor'
import styles from './general-info.module.css'
import { useState } from 'react'
import { Button } from '@/components/ds'

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
}

/**
 * General Info (the page's live frame 1273:29296; spec design-source/context/quote-editor/02-section-card-general-info.txt):
 * three rows of two 611 columns — Quote Title ‖ Client (read-only, open_in_new → the lead) · Property Type; Project Ref # ‖
 * Site Address; Prepared by (member) · Quote Valid Until ‖ NRIC · Customer ID. Every value is the quote's own record, seeded
 * from the lead and the signed-in member when the quote was created (REG-403). Fields save as they change (quote-editor.tsx
 * autosaves). The status pill lives in the header (REG-404).
 */
export function GeneralInfo({ value, lead, members, today, onChange, extra }: {
  value: GeneralState
  lead: EditorLead
  members: Member[]
  today: Date
  onChange: (patch: Partial<GeneralState>) => void
  /** (REG-489) A fourth row under the mock's three — the Template field and its actions. */
  extra?: ReactNode
}) {
  const names = members.map((m) => m.name)
  const preparedName = members.find((m) => m.id === value.preparedBy)?.name ?? ''
  const [second, setSecond] = useState(!!(value.client2Name || value.client2Nric))   /* (REG-588) */
  return (
    <div className={styles.grid}>
      {/* Row 1 */}
      <TextField label="Quote Title" value={value.title} onChange={(v) => onChange({ title: v })} />
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
        <DateField label="Quote Valid Until" value={value.validUntil} today={today} icon="calendar_month" onChange={(v) => onChange({ validUntil: v })} />
      </div>
      <div className={styles.pair}>
        <TextField label="NRIC" value={value.nric} onChange={(v) => onChange({ nric: v })} maxLength={20} />
        <TextField label="Customer ID" value={value.customerId} onChange={(v) => onChange({ customerId: v })} maxLength={60} />
      </div>
      {/* (REG-588) A second client — co-owners sign together: {client_name} prints "A & B", the NRICs print side by side, both are named on the signing link. */}
      {second ? (
        <div className={styles.pair}>
          <TextField label="Second client" value={value.client2Name} onChange={(v) => onChange({ client2Name: v })} maxLength={120} />
          <TextField label="NRIC (second client)" value={value.client2Nric} onChange={(v) => onChange({ client2Nric: v })} maxLength={20} />
        </div>
      ) : (
        <div className={styles.pair}><Button appearance="text" onPress={() => setSecond(true)}>Add a second client</Button></div>
      )}
      {extra ? <div className={styles.full}>{extra}</div> : null}
    </div>
  )
}
