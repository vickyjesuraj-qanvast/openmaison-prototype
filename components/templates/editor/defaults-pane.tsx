'use client'

import type { TemplateDefaults } from '@/lib/templates/model'
import { Num, Sel, Sw, Txt } from './inspector-controls'
import controls from './inspector.module.css'
import styles from './defaults-pane.module.css'

type Props = {
  defaults: TemplateDefaults
  textTemplates: { id: string; kind: string; title: string }[]
  paymentPresets: { key: string; label: string }[]
  onChange: (patch: Partial<TemplateDefaults>, coalesce?: string) => void
}

/**
 * Defaults (REG-485; 6c): what a quote created from this template starts with — the payment split, the T&Cs and notes
 * templates, validity, GST, the client-signature switch, an introduction. The quote editor can change any of them after.
 */
export function DefaultsPane({ defaults: d, textTemplates, paymentPresets, onChange }: Props) {
  const terms = textTemplates.filter((t) => t.kind === 'terms'), notes = textTemplates.filter((t) => t.kind === 'notes')
  const NONE = '__none__'
  return (
    <div className={styles.pane}>
      <div className={styles.body}>
        <span className={styles.intro}>A new quote from this template starts with these. Each one can still be changed on the quote.</span>
        <div className={controls.grid}>
          <Sel label="Payment schedule" value={d.paymentPreset ?? 'default'} options={paymentPresets.map((p) => ({ value: p.key, label: p.label }))} onChange={(v) => onChange({ paymentPreset: v })} wide />
          <Sel label="Terms and Conditions" value={d.termsTemplateId ?? NONE} options={[{ value: NONE, label: 'None — write them on the quote' }, ...terms.map((t) => ({ value: t.id, label: t.title }))]} onChange={(v) => onChange({ termsTemplateId: v === NONE ? null : v })} wide />
          <Sel label="Additional Notes" value={d.notesTemplateId ?? NONE} options={[{ value: NONE, label: 'None' }, ...notes.map((t) => ({ value: t.id, label: t.title }))]} onChange={(v) => onChange({ notesTemplateId: v === NONE ? null : v })} wide />
          <Num label="Valid for" unit="days" value={d.validityDays} min={1} max={365} onChange={(v) => onChange({ validityDays: v }, 'validity')} />
          <div />
          <Sw label="GST on" value={d.gstEnabled} onChange={(v) => onChange({ gstEnabled: v })} />
          <Sw label="Client signature required" value={d.signatureRequired} onChange={(v) => onChange({ signatureRequired: v })} />
          <Txt label="Starts with these sections (one per line)" value={d.starterGroups.join('\n')} multiline fields={false} onChange={(v) => onChange({ starterGroups: v.split('\n') }, 'groups')} />
          <span className={styles.intro}>A new quote opens with these as empty groups in its Items table. Empty groups never print.</span>
          <Txt label="Introduction on every quote" value={d.introText ?? ''} multiline onChange={(v) => onChange({ introText: v || null }, 'intro')} />
        </div>
      </div>
    </div>
  )
}
