'use client'

import { Button, Chip } from '@/components/ds'
import { COLUMN_LABEL, RENDERABLE_COLUMNS, type ColumnKey } from '@/lib/quotes/items-model'
import type { TemplateDefaults } from '@/lib/templates/model'
import { Num, Sel, Sw, Txt } from './inspector-controls'
import controls from './inspector.module.css'
import styles from './defaults-pane.module.css'
import { HowItWorks } from '@/components/company/price-book/how-it-works'

type Props = {
  defaults: TemplateDefaults
  textTemplates: { id: string; kind: string; title: string }[]
  paymentPresets: { key: string; label: string }[]
  onChange: (patch: Partial<TemplateDefaults>, coalesce?: string) => void
  /** (REG-578) Published at least once, and whether the working copy differs from what is published — the "Not published yet" line. */
  published: boolean
  unpublished: boolean
}

/** The Items table's own default set (lib/quotes/items-model.ts DEFAULT_COLUMNS) — what "the editor's default" means here. */
const TABLE_DEFAULT: ColumnKey[] = ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst']

/**
 * Defaults (REG-485; 6c): what a quote created from this template starts with — the payment split (the Payments library,
 * REG-538), the T&Cs and notes templates, validity, GST, the client-signature switch, the starter sections and the working
 * columns its Items table opens with. The quote editor can change any of them after. The "Introduction on every quote"
 * field is gone (REG-538): nothing printed it — the introduction is the Title & intro block's own text in the Structure tab.
 */
export function DefaultsPane({ defaults: d, textTemplates, paymentPresets, onChange, published, unpublished }: Props) {
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
        {/* (REG-578) The two facts the owner missed: these reach NEW quotes, and only once published. */}
        {/* (the calm UI build 2026-10-27, W-472) one line; the rest of what it said one press away */}
        <span className={styles.intro}>New quotes from this template start with these.</span>
        <HowItWorks label="How this works" testId="defaults-how" points={['They reach new quotes once you publish.', 'Quotes you already have keep their own settings.', 'A Draft quote can take these from its template card (Apply defaults).']} />
        {unpublished ? <span className={`${styles.intro} ${styles.note}`} data-testid="defaults-unpublished">{published ? 'Not published yet — quotes take these once you press Publish changes.' : 'Not published yet — quotes can use this template once you press Publish.'}</span> : null}
        <div className={controls.grid}>
          {/* (REG-581) A split or text that is gone (deleted from its library) reads as the fallback the quote would get, never as a blank. */}
          <Sel label="Payment schedule" value={d.paymentPreset && paymentPresets.some((p) => p.key === d.paymentPreset) ? d.paymentPreset : 'default'} options={paymentPresets.map((p) => ({ value: p.key, label: p.label }))} onChange={(v) => onChange({ paymentPreset: v })} wide />
          <Sel label="Terms and Conditions" value={d.termsTemplateId && terms.some((t) => t.id === d.termsTemplateId) ? d.termsTemplateId : NONE} options={[{ value: NONE, label: 'None — write them on the quote' }, ...terms.map((t) => ({ value: t.id, label: t.title }))]} onChange={(v) => onChange({ termsTemplateId: v === NONE ? null : v })} wide />
          <Sel label="Additional Notes" value={d.notesTemplateId && notes.some((t) => t.id === d.notesTemplateId) ? d.notesTemplateId : NONE} options={[{ value: NONE, label: 'None' }, ...notes.map((t) => ({ value: t.id, label: t.title }))]} onChange={(v) => onChange({ notesTemplateId: v === NONE ? null : v })} wide />
          <Num label="Valid for" unit="days" value={d.validityDays} min={1} max={365} onChange={(v) => onChange({ validityDays: v }, 'validity')} wide />   {/* full width: the half column clipped its label */}
          <Sw label="GST on" value={d.gstEnabled} onChange={(v) => onChange({ gstEnabled: v })} />
          <Sw label="Client signs online" value={d.signatureRequired} onChange={(v) => onChange({ signatureRequired: v })} />   {/* (REG-578) what it does, not "required": off = the client signs the printed quote */}
          <span className={`${styles.intro} ${styles.full}`}>Off: the client signs the printed quote. The signature lines themselves are on the Page tab.</span>
          <Txt label="Starts with these sections (one per line)" value={d.starterGroups.join('\n')} multiline fields={false} onChange={(v) => onChange({ starterGroups: v.split('\n') }, 'groups')} />
          <span className={`${styles.intro} ${styles.full}`}>A new quote opens with these as empty groups in its Items table. Empty groups never print.</span>
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
          <span className={styles.intro}>The studio’s working columns in the quote editor. What the client sees is the Items table on the Page tab.</span>   {/* (Dane UAT 3.30) the tab is Page since REG-569 */}
        </div>
      </div>
    </div>
  )
}
