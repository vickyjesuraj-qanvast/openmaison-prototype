'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from './dialog'
import { Icon } from './icon'
import { IconButton } from './icon-button'
import { MetaChip } from './meta-chip'
import { TextField } from './text-field'
import { Tooltip } from './tooltip'
import { MSG } from '@/lib/forms'
import styles from './definition-list.module.css'

/**
 * (pending modules S17 — consistency leftovers, card held:consistency-leftovers, as recommended — her "build all of them" 2026-10-11) A list of
 * the studio's own definitions — something every lead carries, with a type, its options, Required and Active, in an order: Settings › Lead
 * management › **Custom fields** (REG-612 · Q-25) and Company › Questionnaire's **Question bank** (REG-612 · Q-21). They were twin components
 * with twin dialogs — the same card table, drag handle, switches, arrows, Edit / Delete and the same Add / Edit form, each copied and each
 * drifting on its own (the consistency programme's root cause, REG-725). This is the one list and the one form; each page keeps its card,
 * its words and its saves.
 *
 * The list: the card table (REG-727) — the name over its type and options, Required, Active, the row's tools (order · edit · delete); a row
 * drags by its handle (Dane UAT 3.38, motion's Reorder) and the order is written once, on the drop (`onOrder`, put back by the page when
 * refused); the arrows stay for the keyboard and a finger. Owners and Admins edit (`canEdit`); everyone else reads.
 */

/** One entry as the list shows it. */
export type Definition = { id: string; name: string; type: string; options: string[]; required: boolean; active: boolean }

export function DefinitionTable<T>({ items, defOf, nameHead, label, testId, canEdit, named, onItems, onFlag, onMove, onEdit, onDelete, onOrder }: {
  items: T[]
  defOf: (t: T) => Definition
  /** the first column's head: "Field" · "Question" */
  nameHead: string
  /** the table's accessible name */
  label: string
  /** the rows' test id; the handle's is `<testId>-handle` */
  testId: string
  canEdit: boolean
  /** how a row is named in its tools' labels (a question is quoted: Delete “Do you have pets?”) */
  named: (d: Definition) => string
  /** the list as it is dragged */
  onItems: (next: T[]) => void
  onFlag: (t: T, patch: { required?: boolean; active?: boolean }) => void
  onMove: (t: T, dir: 'up' | 'down') => void
  onEdit: (t: T) => void
  onDelete: (t: T) => void
  /** once, on the drop, when the order changed: the order before the drag and the one to save */
  onOrder: (before: T[], next: T[]) => void
}) {
  const latest = useRef(items); useEffect(() => { latest.current = items })
  const before = useRef<T[] | null>(null)
  const dropped = () => {
    const prev = before.current; before.current = null
    const now = latest.current
    if (!prev || prev.map((t) => defOf(t).id).join() === now.map((t) => defOf(t).id).join()) return
    onOrder(prev, now)
  }
  return (
    <div className={styles.table} role="table" aria-label={label} data-card-table="" data-reorder={canEdit || undefined}>
      <div className={styles.head} role="row">
        <span role="columnheader">{nameHead}</span>
        <span role="columnheader" className={styles.col}>Required</span>
        <span role="columnheader" className={styles.col}>Active</span>
        <span role="columnheader" className={styles.actionsHead} aria-label="Actions" />
      </div>
      <Reorder.Group as="div" axis="y" values={items} onReorder={onItems} className={styles.rowGroup} role="rowgroup">
        {items.map((t, i) => {
          const d = defOf(t)
          return (
            <DefinitionRow key={d.id || `new-${i}`} item={t} d={d} handle={`Drag ${named(d)} to reorder`} testId={testId} canEdit={canEdit} onLift={() => { before.current = latest.current }} onDrop={dropped}>
              <span className={styles.col} role="cell"><label className={styles.flag}><Switch size="sm" isSelected={d.required} isDisabled={!canEdit} aria-label={`${d.name} required`} onChange={(on: boolean) => onFlag(t, { required: on })} /></label></span>
              <span className={styles.col} role="cell"><label className={styles.flag}><Switch size="sm" isSelected={d.active} isDisabled={!canEdit} aria-label={`${d.name} active`} onChange={(on: boolean) => onFlag(t, { active: on })} /></label></span>
              <span className={styles.actions} role="cell">
                {canEdit ? (
                  <>
                    {/* (REG-729) one glyph size in the row: 18 in the 24 bare buttons */}
                    <Tooltip label="Move up"><IconButton icon="arrow_upward" label={`Move ${named(d)} up`} size={24} variant="bare" iconSize={18} disabled={i === 0} onClick={() => onMove(t, 'up')} /></Tooltip>
                    <Tooltip label="Move down"><IconButton icon="arrow_downward" label={`Move ${named(d)} down`} size={24} variant="bare" iconSize={18} disabled={i === items.length - 1} onClick={() => onMove(t, 'down')} /></Tooltip>
                    <Tooltip label="Edit"><IconButton icon="edit" label={`Edit ${named(d)}`} size={24} variant="bare" iconSize={18} onClick={() => onEdit(t)} /></Tooltip>
                    <Tooltip label="Delete"><IconButton icon="delete" label={`Delete ${named(d)}`} size={24} variant="bare" iconSize={18} onClick={() => onDelete(t)} /></Tooltip>
                  </>
                ) : null}
              </span>
            </DefinitionRow>
          )
        })}
      </Reorder.Group>
    </div>
  )
}

/** One row on motion's Reorder: the drag handle (Owners and Admins) before the name and its type, then the row's own cells. Dragged by its handle only. */
function DefinitionRow<T>({ item, d, handle, testId, canEdit, onLift, onDrop, children }: { item: T; d: Definition; handle: string; testId: string; canEdit: boolean; onLift: () => void; onDrop: () => void; children: ReactNode }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item as="div" value={item} dragListener={false} dragControls={controls} className={styles.row} role="row" data-testid={testId} data-active={d.active || undefined} data-dragging={dragging || undefined}
                  onDragStart={() => { setDragging(true); onLift() }} onDragEnd={() => { setDragging(false); onDrop() }}>
      <span className={styles.lead} role="cell">
        {canEdit ? <button type="button" className={styles.handle} aria-label={handle} data-testid={`${testId}-handle`} onPointerDown={(e) => controls.start(e)}><Icon name="drag_indicator" size={20} weight={300} /></button> : null}
        <span className={styles.text}>
          <span className={styles.name}>{d.name}</span>
          <span className={styles.meta}><MetaChip>{d.type}</MetaChip>{d.options.length ? <span>{d.options.join(' · ')}</span> : null}</span>
        </span>
      </span>
      {children}
    </Reorder.Item>
  )
}

/** What the form saves. */
export type DefinitionInput<K extends string> = { name: string; type: K; options: string[]; required: boolean }

/**
 * Add / Edit — the house Dialog at 600: the name · Type · Options (for the types that list them) · Required. It closes only once its save
 * lands (REG-656 · the UI sweep's rule): `onSave` resolves true; when it is refused the page says why and the form stays with what was typed.
 */
export function DefinitionDialog<K extends string>({ open, editing, noun, nameLabel, nameMax, types, typeLabels, needsOptions, requiredLine, optionsTestId, initial, onClose, onSave }: {
  open: boolean
  /** an entry is being edited (else a new one is added) */
  editing: boolean
  /** "field" · "question" — the title says Add {noun} / Edit {noun} */
  noun: string
  /** the first box's label: "Label" · "Question" */
  nameLabel: string
  nameMax: number
  types: readonly K[]
  typeLabels: Record<K, string>
  needsOptions: (t: K) => boolean
  /** what Required means here */
  requiredLine: string
  optionsTestId: string
  initial: DefinitionInput<K> | null
  onClose: () => void
  onSave: (input: DefinitionInput<K>) => Promise<boolean>
}) {
  const first = types[0]!
  const [name, setName] = useState('')
  const [type, setType] = useState<K>(first)
  const [options, setOptions] = useState<string[]>([''])
  const [required, setRequired] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setName(initial?.name ?? ''); setType(initial?.type ?? first); setOptions(initial?.options.length ? initial.options : ['']); setRequired(initial?.required ?? false); setPressed(false); setBusy(false) }
  }
  const cleanOpts = options.map((o) => o.trim()).filter(Boolean)
  const errName = !name.trim() ? MSG.required : undefined
  const errOpts = needsOptions(type) && cleanOpts.length < 1 ? 'Add at least one option' : undefined   // 1.0's words
  const submit = async () => {
    setPressed(true)
    if (errName || errOpts || busy) return
    setBusy(true)
    const ok = await onSave({ name: name.trim(), type, options: needsOptions(type) ? cleanOpts : [], required }).catch(() => false)
    setBusy(false)
    if (ok) onClose()
  }
  const title = `${editing ? 'Edit' : 'Add'} ${noun}`
  return (
    <Dialog open={open} onClose={onClose} title={title} width={600} size="modal"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Add'}</Button></>}>
      <TextField label={nameLabel} required value={name} onChange={setName} maxLength={nameMax} trailingIcon={null} error={pressed ? errName : undefined} />
      <TextField label="Type" mode="select" options={types.map((t) => typeLabels[t])} value={typeLabels[type]} onChange={(v) => setType(types.find((t) => typeLabels[t] === v) ?? first)} />
      {needsOptions(type) ? (
        <div className={styles.optionList} data-testid={optionsTestId}>
          <span className={styles.optionsLabel}>Options</span>
          {options.map((o, i) => (
            <div key={i} className={styles.optionRow}>
              <TextField label={`Option ${i + 1}`} value={o} onChange={(v) => setOptions((os) => os.map((x, j) => (j === i ? v : x)))} maxLength={60} trailingIcon={null} />
              <Tooltip label="Remove this option"><IconButton icon="close" label={`Remove option ${i + 1}`} size={24} variant="bare" iconSize={16} disabled={options.length <= 1} onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} /></Tooltip>   {/* (sweep S4 #22) */}
            </div>
          ))}
          {pressed && errOpts ? <span className={styles.error} role="alert">{errOpts}</span> : null}
          <Button appearance="text" iconStart={<Icon name="add" size={18} />} onPress={() => setOptions((os) => [...os, ''])}>Add option</Button>
        </div>
      ) : null}
      <label className={styles.switchRow}><Switch size="sm" isSelected={required} aria-label="Required" onChange={(on: boolean) => setRequired(on)} /><span>{requiredLine}</span></label>
    </Dialog>
  )
}
