'use client'

import { Button, Chip } from '@/components/ds'
import { COLUMN_LABEL, RENDERABLE_COLUMNS, type ColumnKey } from '@/lib/quotes/items-model'
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

/** The Items table's own default set (lib/quotes/items-model.ts DEFAULT_COLUMNS) — what "the editor's default" means here. */
const TABLE_DEFAULT: ColumnKey[] = ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst']

/**
 * Defaults (REG-485; 6c): what a quote created from this template starts with — the payment split (the Payments library,
 * REG-538), the T&Cs and notes templates, validity, GST, the client-signature switch, the starter sections and the working
 * columns its Items table opens with. The quote editor can change any of them after. The "Introduction on every quote"
 * field is gone (REG-538): nothing printed it — the introduction is the Title & intro block's own text in the Structure tab.
 */
export function DefaultsPane({ defaults: d, textTemplates, paymentPresets, onChange }: Props) {
  const terms = textTemplates.filter((t) => t.kind === 'terms'), notes = textTemplates.filter((t) => t.kind === 'notes')
  const NONE = '__none__'
  const columns = d.columns ?? TABLE_DEFAULT
  const toggleColumn = (key: ColumnKey) => {
    const next = columns.includes(key) ? columns.filter((k) => k !== key) : [...columns, key]
    onChange({ columns: next })
  }
  return (
    <div className={styles.pane}>
      <div className={styles.body}>
        <span className={styles.intro}>A new quote from this template starts with these. Each one can still be changed on the quote.</span>
        <div className={controls.grid}>
          <Sel label="Payment schedule" value={d.paymentPreset ?? 'default'} options={paymentPresets.map((p) => ({ value: p.key, label: p.label }))} onChange={(v) => onChange({ paymentPreset: v })} wide />
          <Sel label="Terms and Conditions" value={d.termsTemplateId ?? NONE} options={[{ value: NONE, label: 'None — write them on the quote' }, ...terms.map((t) => ({ value: t.id, label: t.title }))]} onChange={(v) => onChange({ termsTemplateId: v === NONE ? null : v })} wide />
          <Sel label="Additional Notes" value={d.notesTemplateId ?? NONE} options={[{ value: NONE, label: 'None' }, ...notes.map((t) => ({ value: t.id, label: t.title }))]} onChange={(v) => onChange({ notesTemplateId: v === NONE ? null : v })} wide />
          <Num label="Valid for" unit="days" value={d.validityDays} min={1} max={365} onChange={(v) => onChange({ validityDays: v }, 'validity')} wide />   {/* full width: the half column clipped its label */}
          <Sw label="GST on" value={d.gstEnabled} onChange={(v) => onChange({ gstEnabled: v })} />
          <Sw label="Client signature required" value={d.signatureRequired} onChange={(v) => onChange({ signatureRequired: v })} />
          <Txt label="Starts with these sections (one per line)" value={d.starterGroups.join('\n')} multiline fields={false} onChange={(v) => onChange({ starterGroups: v.split('\n') }, 'groups')} />
          <span className={styles.intro}>A new quote opens with these as empty groups in its Items table. Empty groups never print.</span>
        </div>
        {/* (REG-538) The working columns: which of the table's columns a new quote's Items table opens with — the studio's private view, never what the client sees (that is the Items block). */}
        <div className={styles.columns}>
          <div className={styles.columnsHead}>
            <span className={styles.columnsLabel}>Items table opens with</span>
            {d.columns ? <Button appearance="text" onPress={() => onChange({ columns: null })}>Use the table’s default</Button> : <span className={styles.columnsNote}>The table’s default</span>}
          </div>
          <div className={styles.chips} role="group" aria-label="Columns a new quote opens with">
            {RENDERABLE_COLUMNS.map((key) => (
              <Chip key={key} variant="choice" isSelected={columns.includes(key)} onChange={() => toggleColumn(key)}>{COLUMN_LABEL[key]}</Chip>
            ))}
          </div>
          <span className={styles.intro}>The studio’s working columns in the quote editor. What the client sees is the Items block on the Structure tab.</span>
        </div>
      </div>
    </div>
  )
}
