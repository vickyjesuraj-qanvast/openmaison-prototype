'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder, useDragControls } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, fieldNeedsOptions, type CustomFieldDef, type CustomFieldType } from '@/lib/leads/custom-fields-model'
import { saveCustomFields } from './actions'
import { MSG } from '@/lib/forms'
import styles from './settings.module.css'

/**
 * (REG-612, parity Q-25 · B-31) Settings › Leads › Custom fields — the studio's own lead fields (1.0's `lead_custom_fields`): label,
 * type (text · number · date · dropdown · multi select), options, Required, Active, order. Saved whole after every change, as 1.0's
 * RPC did. They render on the Create / Edit lead form's Additional info and the Overview's Custom fields section.
 */
export function CustomFieldsCard({ fields: initial, canManage }: { fields: CustomFieldDef[]; canManage: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [fields, setFields] = useState<CustomFieldDef[]>(initial)
  const [editing, setEditing] = useState<{ f: CustomFieldDef | null } | null>(null)
  const [deleting, setDeleting] = useState<CustomFieldDef | null>(null)
  const write = async (next: CustomFieldDef[], done: string, prev = fields) => {
    setFields(next)
    try { const saved = await saveCustomFields(next); setFields(next.map((f, i) => ({ ...f, id: saved[i]?.id ?? f.id, orderIndex: i }))); snackbar({ message: done }); router.refresh() }
    catch { setFields(prev); snackbar({ message: 'Couldn’t save the fields — please try again' }) }
  }
  const move = (f: CustomFieldDef, dir: 'up' | 'down') => { const i = fields.findIndex((x) => x.id === f.id), j = dir === 'up' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= fields.length) return; const n = [...fields]; [n[i], n[j]] = [n[j]!, n[i]!]; void write(n, 'Order saved') }
  /* (Dane UAT 3.38) Drag a field by its handle (the task template's steps, motion's Reorder): the order is saved once, on the drop — "Order
     saved", or put back as it was when the save is refused. The arrows stay for the keyboard and a finger. */
  const latest = useRef(fields); useEffect(() => { latest.current = fields })
  const before = useRef<CustomFieldDef[] | null>(null)
  const dropped = () => {
    const prev = before.current; before.current = null
    const now = latest.current
    if (!prev || prev.map((f) => f.id).join() === now.map((f) => f.id).join()) return
    void write(now, 'Order saved', prev)
  }
  return (
    <div className={styles.setting} data-testid="custom-fields">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Custom fields</span>
        <span className={styles.settingHelp}>Your studio’s own fields on every lead — on the lead form’s Additional info and the Overview’s Custom fields section. A required field must be filled before a lead saves; an inactive field keeps its values and stops showing.</span>
      </div>
      {fields.length === 0 ? (
        <span className={styles.settingHelp} data-testid="custom-fields-empty">No custom fields yet.</span>
      ) : (
        <div className={`${styles.eventTable} ${styles.fieldTable}`} role="table" aria-label="Custom fields" data-card-table="" data-reorder={canManage || undefined}>
          {/* (REG-614) The Notifications module's event table, so every settings list of switches reads the same. */}
          <div className={styles.eventHead} role="row">
            <span role="columnheader">Field</span>
            <span role="columnheader" className={styles.eventCol}>Required</span>
            <span role="columnheader" className={styles.eventCol}>Active</span>
            <span role="columnheader" className={styles.fieldActionsHead} aria-label="Actions" />
          </div>
          <Reorder.Group as="div" axis="y" values={fields} onReorder={(next: CustomFieldDef[]) => setFields(next)} className={styles.rowGroup} role="rowgroup">
            {fields.map((f, i) => (
              <FieldRow key={f.id || `new-${i}`} f={f} canManage={canManage} onLift={() => { before.current = latest.current }} onDrop={dropped}>
                <span className={styles.eventCol} role="cell" data-label="Required"><label className={styles.switchRow}><Switch size="sm" isSelected={f.isRequired} isDisabled={!canManage} aria-label={`${f.label} required`} onChange={(on: boolean) => { void write(fields.map((x) => (x.id === f.id ? { ...x, isRequired: on } : x)), on ? `${f.label} is required` : `${f.label} is optional`) }} /></label></span>
                <span className={styles.eventCol} role="cell" data-label="Active"><label className={styles.switchRow}><Switch size="sm" isSelected={f.isActive} isDisabled={!canManage} aria-label={`${f.label} active`} onChange={(on: boolean) => { void write(fields.map((x) => (x.id === f.id ? { ...x, isActive: on } : x)), on ? `${f.label} is back on every lead` : `${f.label} hidden — its values are kept`) }} /></label></span>
                <span className={styles.fieldActions} role="cell">
                  {canManage ? (
                    <>
                      {/* (REG-729) one glyph size in the row: 18 in the 24 bare buttons */}
                      <Tooltip label="Move up"><IconButton icon="arrow_upward" label={`Move ${f.label} up`} size={24} variant="bare" iconSize={18} disabled={i === 0} onClick={() => move(f, 'up')} /></Tooltip>
                      <Tooltip label="Move down"><IconButton icon="arrow_downward" label={`Move ${f.label} down`} size={24} variant="bare" iconSize={18} disabled={i === fields.length - 1} onClick={() => move(f, 'down')} /></Tooltip>
                      <Tooltip label="Edit"><IconButton icon="edit" label={`Edit ${f.label}`} size={24} variant="bare" iconSize={18} onClick={() => setEditing({ f })} /></Tooltip>
                      <Tooltip label="Delete"><IconButton icon="delete" label={`Delete ${f.label}`} size={24} variant="bare" iconSize={18} onClick={() => setDeleting(f)} /></Tooltip>
                    </>
                  ) : null}
                </span>
              </FieldRow>
            ))}
          </Reorder.Group>
        </div>
      )}
      {canManage ? <div><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setEditing({ f: null })}>Add field</Button></div> : null}
      <FieldDialog open={!!editing} field={editing?.f ?? null} onClose={() => setEditing(null)}
                   onSave={(input) => { const cur = editing?.f ?? null; setEditing(null); const next = cur ? fields.map((x) => (x.id === cur.id ? { ...x, ...input } : x)) : [...fields, { id: '', orderIndex: fields.length, isActive: true, ...input }]; void write(next, cur ? 'Field saved' : `${input.label} added`) }} />
      <ConfirmDialog open={!!deleting} title="Delete this field?" message={deleting ? `“${deleting.label}” and the values leads carry for it are removed.` : undefined} confirmLabel="Delete"
                     onCancel={() => setDeleting(null)} onConfirm={() => { const f = deleting; setDeleting(null); if (f) void write(fields.filter((x) => x.id !== f.id), `${f.label} deleted`) }} />
    </div>
  )
}

/** (Dane UAT 3.38) One custom field's row on motion's Reorder: the drag handle (Owners and Admins) before the label and its type, then the
    row's own cells. Dragged by its handle only. */
function FieldRow({ f, canManage, onLift, onDrop, children }: { f: CustomFieldDef; canManage: boolean; onLift: () => void; onDrop: () => void; children: React.ReactNode }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item as="div" value={f} dragListener={false} dragControls={controls} className={styles.eventRow} role="row" data-testid="custom-field" data-active={f.isActive || undefined} data-dragging={dragging || undefined}
                  onDragStart={() => { setDragging(true); onLift() }} onDragEnd={() => { setDragging(false); onDrop() }}>
      <span className={styles.fieldLead} role="cell">
        {canManage ? <button type="button" className={styles.dragHandle} aria-label={`Drag ${f.label} to reorder`} data-testid="custom-field-handle" onPointerDown={(e) => controls.start(e)}><Icon name="drag_indicator" size={20} weight={300} /></button> : null}
        <span className={styles.fieldText}>
          <span className={styles.fieldLabel}>{f.label}</span>
          <span className={styles.fieldMeta}><MetaChip>{CUSTOM_FIELD_TYPE_LABELS[f.fieldType]}</MetaChip>{f.options.length ? <span>{f.options.join(' · ')}</span> : null}</span>
        </span>
      </span>
      {children}
    </Reorder.Item>
  )
}

function FieldDialog({ open, field, onClose, onSave }: { open: boolean; field: CustomFieldDef | null; onClose: () => void; onSave: (input: { label: string; fieldType: CustomFieldType; options: string[]; isRequired: boolean }) => void }) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [options, setOptions] = useState<string[]>([''])
  const [required, setRequired] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setLabel(field?.label ?? ''); setType(field?.fieldType ?? 'text'); setOptions(field?.options.length ? field.options : ['']); setRequired(field?.isRequired ?? false); setPressed(false) }
  }
  const cleanOpts = options.map((o) => o.trim()).filter(Boolean)
  const errLabel = !label.trim() ? MSG.required : undefined
  const errOpts = fieldNeedsOptions(type) && cleanOpts.length < 1 ? 'Add at least one option' : undefined
  const submit = () => { setPressed(true); if (errLabel || errOpts) return; onSave({ label: label.trim(), fieldType: type, options: fieldNeedsOptions(type) ? cleanOpts : [], isRequired: required }) }
  return (
    <Dialog open={open} onClose={onClose} title={field ? 'Edit field' : 'Add field'} width={600} size="modal"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={submit}>{field ? 'Save' : 'Add'}</Button></>}>
      <TextField label="Label" required value={label} onChange={setLabel} maxLength={60} trailingIcon={null} error={pressed ? errLabel : undefined} />
      <TextField label="Type" mode="select" options={CUSTOM_FIELD_TYPES.map((t) => CUSTOM_FIELD_TYPE_LABELS[t])} value={CUSTOM_FIELD_TYPE_LABELS[type]} onChange={(v) => setType(CUSTOM_FIELD_TYPES.find((t) => CUSTOM_FIELD_TYPE_LABELS[t] === v) ?? 'text')} />
      {fieldNeedsOptions(type) ? (
        <div className={styles.optionList} data-testid="field-options">
          <span className={styles.settingTitle}>Options</span>
          {options.map((o, i) => (
            <div key={i} className={styles.optionRow}>
              <TextField label={`Option ${i + 1}`} value={o} onChange={(v) => setOptions((os) => os.map((x, j) => (j === i ? v : x)))} maxLength={60} trailingIcon={null} />
              <Tooltip label="Remove this option"><IconButton icon="close" label={`Remove option ${i + 1}`} size={24} variant="bare" iconSize={16} disabled={options.length <= 1} onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} /></Tooltip>   {/* (sweep S4 #22) */}
            </div>
          ))}
          {pressed && errOpts ? <span className={styles.fieldError} role="alert">{errOpts}</span> : null}
          <Button appearance="text" iconStart={<Icon name="add" size={18} />} onPress={() => setOptions((os) => [...os, ''])}>Add option</Button>
        </div>
      ) : null}
      <label className={styles.switchRow}><Switch size="sm" isSelected={required} aria-label="Required" onChange={(on: boolean) => setRequired(on)} /><span>Required — a lead cannot save without it</span></label>
    </Dialog>
  )
}
