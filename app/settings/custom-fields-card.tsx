'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { DefinitionDialog, DefinitionTable, type Definition } from '@/components/om/definition-list'
import { useSnackbar } from '@/components/om/snackbar'
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, fieldNeedsOptions, type CustomFieldDef } from '@/lib/leads/custom-fields-model'
import { saveCustomFields } from './actions'
import styles from './settings.module.css'

/**
 * (REG-612, parity Q-25 · B-31) Settings › Leads › Custom fields — the studio's own lead fields (1.0's `lead_custom_fields`): label,
 * type (text · number · date · dropdown · multi select), options, Required, Active, order. Saved whole after every change, as 1.0's
 * RPC did. They render on the Create / Edit lead form's Additional info and the Overview's Custom fields section.
 * (pending modules S17) The list and its Add / Edit form are the one definitions list Company › Questionnaire's bank uses too
 * (components/om/definition-list.tsx) — they were twins; the form now closes only once its save lands.
 */
const defOf = (f: CustomFieldDef): Definition => ({ id: f.id, name: f.label, type: CUSTOM_FIELD_TYPE_LABELS[f.fieldType], options: f.options, required: f.isRequired, active: f.isActive })

export function CustomFieldsCard({ fields: initial, canManage }: { fields: CustomFieldDef[]; canManage: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [fields, setFields] = useState<CustomFieldDef[]>(initial)
  const [editing, setEditing] = useState<{ f: CustomFieldDef | null } | null>(null)
  const [deleting, setDeleting] = useState<CustomFieldDef | null>(null)
  /* Saved whole. A switch, an arrow, a drag or a delete shows at once and is put back when refused; the form's save waits for the server
     (it closes on success and keeps what was typed when refused). */
  const write = async (next: CustomFieldDef[], done: string, prev = fields, optimistic = true): Promise<boolean> => {
    if (optimistic) setFields(next)
    try { const saved = await saveCustomFields(next); setFields(next.map((f, i) => ({ ...f, id: saved[i]?.id ?? f.id, orderIndex: i }))); snackbar({ message: done }); router.refresh(); return true }
    catch { setFields(prev); snackbar({ message: 'Couldn’t save the fields — please try again' }); return false }
  }
  const move = (f: CustomFieldDef, dir: 'up' | 'down') => { const i = fields.findIndex((x) => x.id === f.id), j = dir === 'up' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= fields.length) return; const n = [...fields]; [n[i], n[j]] = [n[j]!, n[i]!]; void write(n, 'Order saved') }
  const flag = (f: CustomFieldDef, patch: { required?: boolean; active?: boolean }) => {
    if (patch.required !== undefined) { const on = patch.required; void write(fields.map((x) => (x.id === f.id ? { ...x, isRequired: on } : x)), on ? `${f.label} is required` : `${f.label} is optional`) }
    if (patch.active !== undefined) { const on = patch.active; void write(fields.map((x) => (x.id === f.id ? { ...x, isActive: on } : x)), on ? `${f.label} is back on every lead` : `${f.label} hidden — its values are kept`) }
  }
  const cur = editing?.f ?? null
  return (
    <div className={styles.setting} id="custom-fields" data-testid="custom-fields">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Custom fields</span>
        <span className={styles.settingHelp}>Your studio’s own fields on every lead — on the lead form’s Additional info and the Overview’s Custom fields section. A required field must be filled before a lead saves; an inactive field keeps its values and stops showing.</span>
      </div>
      {fields.length === 0 ? (
        <span className={styles.settingHelp} data-testid="custom-fields-empty">No custom fields yet.</span>
      ) : (
        <DefinitionTable items={fields} defOf={defOf} nameHead="Field" label="Custom fields" testId="custom-field" canEdit={canManage} named={(d) => d.name}
                         onItems={setFields} onFlag={flag} onMove={move} onEdit={(f) => setEditing({ f })} onDelete={setDeleting}
                         onOrder={(prev, now) => { void write(now, 'Order saved', prev) }} />
      )}
      {canManage ? <div><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setEditing({ f: null })}>Add field</Button></div> : null}
      <DefinitionDialog open={!!editing} editing={!!cur} noun="field" nameLabel="Label" nameMax={60} types={CUSTOM_FIELD_TYPES} typeLabels={CUSTOM_FIELD_TYPE_LABELS} needsOptions={fieldNeedsOptions}
                        requiredLine="Required — a lead cannot save without it" optionsTestId="field-options"
                        initial={cur ? { name: cur.label, type: cur.fieldType, options: cur.options, required: cur.isRequired } : null}
                        onClose={() => setEditing(null)}
                        onSave={(input) => {
                          const next = cur ? fields.map((x) => (x.id === cur.id ? { ...x, label: input.name, fieldType: input.type, options: input.options, isRequired: input.required } : x))
                            : [...fields, { id: '', orderIndex: fields.length, isActive: true, label: input.name, fieldType: input.type, options: input.options, isRequired: input.required }]
                          return write(next, cur ? 'Field saved' : `${input.name} added`, fields, false)
                        }} />
      <ConfirmDialog open={!!deleting} title="Delete this field?" message={deleting ? `“${deleting.label}” and the values leads carry for it are removed.` : undefined} confirmLabel="Delete"
                     onCancel={() => setDeleting(null)} onConfirm={() => { const f = deleting; setDeleting(null); if (f) void write(fields.filter((x) => x.id !== f.id), `${f.label} deleted`) }} />
    </div>
  )
}
