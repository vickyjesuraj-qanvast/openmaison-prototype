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
import { CompanyShell } from './company-shell'
import { QuestionnaireGhost } from './company-ghosts'
import { ReadOnlyNote } from './read-only-note'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import type { StudioScopeQuestion } from '@/lib/db/schema'
import { BANK_TYPES, BANK_TYPE_LABELS, isBankType, needsOptions, parseBankOptions, type BankType } from '@/lib/company/question-bank'
import { createScopeQuestion, deleteScopeQuestion, moveScopeQuestion, reorderScopeQuestions, setScopeQuestionFlags, updateScopeQuestion } from '@/app/company/scope-questions-actions'
import { MSG } from '@/lib/forms'
import styles from './questionnaire-view.module.css'

/**
 * (REG-612, parity Q-21 · C-75) Company › Questionnaire — 1.0's "Scope Questions" builder on 2.0's pieces (Profile's card shell, the DS
 * Switch, the om Dialog): the bank every lead's questionnaire starts from. Question · type (1.0's six) · options · Required · Enabled ·
 * order. Owners and Admins edit; everyone else reads.
 */
type Input = { question: string; type: BankType; options: string[]; required: boolean }

export function QuestionnaireView({ questions: initial, viewer, from }: { questions: StudioScopeQuestion[]; viewer: Viewer; from?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [rows, setRows] = useState(initial)
  const [seed, setSeed] = useState(initial)
  if (initial !== seed) { setSeed(initial); setRows(initial) }   // a refresh re-seeds the list (render-phase adjust)
  const canEdit = runsStudio(viewer.role)
  const [editing, setEditing] = useState<{ q: StudioScopeQuestion | null } | null>(null)   // { q: null } = a new question
  const [deleting, setDeleting] = useState<StudioScopeQuestion | null>(null)
  /* (sweep S4 #11 · #28) Every optimistic change is put back when the server refuses it, and the refusal names what failed. */
  const run = async (what: string, fn: () => Promise<unknown>, done: string, prev?: typeof rows): Promise<boolean> => {
    try { await fn(); snackbar({ message: done }); router.refresh(); return true }
    catch { if (prev) setRows(prev); snackbar({ message: `Couldn’t ${what} — please try again` }); return false }
  }
  const flag = (q: StudioScopeQuestion, patch: { enabled?: boolean; required?: boolean }) => {
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === q.id ? { ...x, ...(patch.enabled !== undefined ? { isEnabled: patch.enabled } : {}), ...(patch.required !== undefined ? { isRequired: patch.required } : {}) } : x)))
    void run('save the question', () => setScopeQuestionFlags(q.id, patch), patch.enabled !== undefined ? (patch.enabled ? 'Question active — new leads start with it' : 'Question inactive — new leads skip it') : (patch.required ? 'Marked required' : 'No longer required'), prev)
  }
  const move = (q: StudioScopeQuestion, dir: 'up' | 'down') => {
    const prev = rows
    setRows((rs) => { const i = rs.findIndex((x) => x.id === q.id), j = dir === 'up' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= rs.length) return rs; const n = [...rs]; [n[i], n[j]] = [n[j]!, n[i]!]; return n })
    void run('move the question', () => moveScopeQuestion(q.id, dir), 'Order saved', prev)
  }
  /* (Dane UAT 3.38) Drag a question by its handle (the task template's steps, motion's Reorder): the list follows the pointer and the order
     is written once, on the drop — "Order saved", or put back with the refusal. The arrows stay for the keyboard and a finger. */
  const latest = useRef(rows); useEffect(() => { latest.current = rows })
  const before = useRef<StudioScopeQuestion[] | null>(null)
  const dropped = () => {
    const prev = before.current; before.current = null
    const now = latest.current
    if (!prev || prev.map((q) => q.id).join() === now.map((q) => q.id).join()) return
    void run('move the question', () => reorderScopeQuestions(now.map((q) => q.id)), 'Order saved', prev)
  }
  return (
    <CompanyShell title="Questionnaire" from={from} skeleton={<QuestionnaireGhost />}>
      <div className={styles.layout} data-testid="questionnaire-bank">
        {canEdit ? null : <ReadOnlyNote text="Only Owners and Admins change the question bank." />}   {/* (sweep S4 #16) */}
        <section className={styles.card} aria-labelledby="bank-title">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}>
              <h2 id="bank-title" className={styles.cardTitle}>Question bank</h2>
              {canEdit ? <Button iconStart={<Icon name="add" size={20} />} onPress={() => setEditing({ q: null })}>Add question</Button> : null}
            </div>
            <p className={styles.cardHelp}>Customise the questions homeowners answer about their project. New leads start with the active questions; an older lead adds them from its Questionnaire tab. Ask the client sends the lead’s questionnaire to the portal.</p>
          </div>
          {rows.length === 0 ? (
            <p className={styles.empty} data-testid="bank-empty">No questions yet — add the first one, and every new lead will start with it.</p>
          ) : (
            <div className={styles.table} role="table" aria-label="Questions" data-card-table="" data-reorder={canEdit || undefined}>
              {/* (REG-614) The Notifications settings' event table: a bordered list under a caption head, every switch under its own
                  column name, the actions (order · edit · delete) at the row's end. The rows used to carry ad-hoc switch labels. */}
              <div className={styles.thead} role="row">
                <span role="columnheader">Question</span>
                <span role="columnheader" className={styles.col}>Required</span>
                <span role="columnheader" className={styles.col}>Active</span>   {/* (sweep S4 · U-10) one word with Settings' custom fields */}
                <span role="columnheader" className={styles.actionsHead} aria-label="Actions" />
              </div>
              <Reorder.Group as="div" axis="y" values={rows} onReorder={(next: StudioScopeQuestion[]) => setRows(next)} className={styles.rowGroup} role="rowgroup">
                {rows.map((q, i) => (
                  <BankRow key={q.id} q={q} index={i} last={i === rows.length - 1} canEdit={canEdit}
                           onFlag={(patch) => flag(q, patch)} onMove={(dir) => move(q, dir)} onEdit={() => setEditing({ q })} onDelete={() => setDeleting(q)}
                           onLift={() => { before.current = latest.current }} onDrop={dropped} />
                ))}
              </Reorder.Group>
            </div>
          )}
        </section>
      </div>
      <QuestionDialog open={!!editing} question={editing?.q ?? null} onClose={() => setEditing(null)}
                      onSave={async (input) => {
                        const q = editing?.q ?? null
                        setEditing(null)
                        const options = input.options.length ? JSON.stringify(input.options) : null
                        if (q) {
                          const prev = rows
                          setRows((rs) => rs.map((x) => (x.id === q.id ? { ...x, question: input.question, questionType: input.type, options, isRequired: input.required } : x)))
                          await run('save the question', () => updateScopeQuestion(q.id, input), 'Question saved', prev)
                        } else {
                          /* The new row joins the list at once — the refresh confirms it. */
                          await run('add the question', async () => { const id = await createScopeQuestion(input); setRows((rs) => [...rs, { id, question: input.question, questionType: input.type, options, isRequired: input.required, isEnabled: true, sortOrder: rs.length, createdAt: new Date() }]) }, 'Question added')
                        }
                      }} />
      <ConfirmDialog open={!!deleting} title="Delete this question?" message={deleting ? `“${deleting.question}” leaves the bank. Leads that already carry it keep their copy.` : undefined} confirmLabel="Delete"
                     onCancel={() => setDeleting(null)} onConfirm={() => { const q = deleting; setDeleting(null); if (q) { const prev = rows; setRows((rs) => rs.filter((x) => x.id !== q.id)); void run('delete the question', () => deleteScopeQuestion(q.id), 'Question deleted', prev) } }} />
    </CompanyShell>
  )
}

/** One question of the bank: (Dane UAT 3.38) the drag handle first for Owners and Admins, the question with its type and options, the two
    switches, the actions. A row on motion's Reorder, dragged by its handle only. */
function BankRow({ q, index, last, canEdit, onFlag, onMove, onEdit, onDelete, onLift, onDrop }: {
  q: StudioScopeQuestion; index: number; last: boolean; canEdit: boolean
  onFlag: (patch: { enabled?: boolean; required?: boolean }) => void; onMove: (dir: 'up' | 'down') => void; onEdit: () => void; onDelete: () => void
  onLift: () => void; onDrop: () => void
}) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  const t = isBankType(q.questionType) ? q.questionType : 'text'
  const opts = parseBankOptions(q.options)
  return (
    <Reorder.Item as="div" value={q} dragListener={false} dragControls={controls} className={styles.trow} role="row" data-testid="bank-question" data-enabled={q.isEnabled || undefined} data-dragging={dragging || undefined}
                  onDragStart={() => { setDragging(true); onLift() }} onDragEnd={() => { setDragging(false); onDrop() }}>
      <span className={styles.lead} role="cell">
        {canEdit ? <button type="button" className={styles.handle} aria-label={`Drag “${q.question}” to reorder`} data-testid="bank-question-handle" onPointerDown={(e) => controls.start(e)}><Icon name="drag_indicator" size={20} weight={300} /></button> : null}
        <span className={styles.text}>
          <span className={styles.question}>{q.question}</span>
          <span className={styles.meta}><MetaChip>{BANK_TYPE_LABELS[t]}</MetaChip>{opts.length ? <span className={styles.options}>{opts.join(' · ')}</span> : null}</span>
        </span>
      </span>
      <span className={styles.col} role="cell"><label className={styles.flag}><Switch size="sm" isSelected={q.isRequired} isDisabled={!canEdit} aria-label={`${q.question} required`} onChange={(on: boolean) => onFlag({ required: on })} /></label></span>
      <span className={styles.col} role="cell"><label className={styles.flag}><Switch size="sm" isSelected={q.isEnabled} isDisabled={!canEdit} aria-label={`${q.question} active`} onChange={(on: boolean) => onFlag({ enabled: on })} /></label></span>
      <span className={styles.actions} role="cell">
        {canEdit ? (
          <>
            {/* (REG-729) one glyph size in the row: 18 in the 24 bare buttons */}
            <Tooltip label="Move up"><IconButton icon="arrow_upward" label={`Move “${q.question}” up`} size={24} variant="bare" iconSize={18} disabled={index === 0} onClick={() => onMove('up')} /></Tooltip>
            <Tooltip label="Move down"><IconButton icon="arrow_downward" label={`Move “${q.question}” down`} size={24} variant="bare" iconSize={18} disabled={last} onClick={() => onMove('down')} /></Tooltip>
            <Tooltip label="Edit"><IconButton icon="edit" label={`Edit “${q.question}”`} size={24} variant="bare" iconSize={18} onClick={onEdit} /></Tooltip>
            <Tooltip label="Delete"><IconButton icon="delete" label={`Delete “${q.question}”`} size={24} variant="bare" iconSize={18} onClick={onDelete} /></Tooltip>
          </>
        ) : null}
      </span>
    </Reorder.Item>
  )
}

/** Add / Edit question — the om Dialog at 600: Question · Type · Options (for the two selects) · Required. */
function QuestionDialog({ open, question, onClose, onSave }: { open: boolean; question: StudioScopeQuestion | null; onClose: () => void; onSave: (input: Input) => Promise<void> | void }) {
  const [text, setText] = useState('')
  const [type, setType] = useState<BankType>('text')
  const [options, setOptions] = useState<string[]>([''])
  const [required, setRequired] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setText(question?.question ?? ''); setType(question && isBankType(question.questionType) ? question.questionType : 'text'); const o = question ? parseBankOptions(question.options) : []; setOptions(o.length ? o : ['']); setRequired(question?.isRequired ?? false); setPressed(false) }
  }
  const cleanOpts = options.map((o) => o.trim()).filter(Boolean)
  const errText = !text.trim() ? MSG.required : undefined
  const errOpts = needsOptions(type) && cleanOpts.length < 1 ? 'Add at least one option' : undefined   // 1.0's words
  const submit = () => { setPressed(true); if (errText || errOpts) return; void onSave({ question: text.trim(), type, options: cleanOpts, required }) }
  return (
    <Dialog open={open} onClose={onClose} title={question ? 'Edit question' : 'Add question'} width={600} size="modal"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={submit}>{question ? 'Save' : 'Add'}</Button></>}>
      <TextField label="Question" required value={text} onChange={setText} maxLength={200} trailingIcon={null} error={pressed ? errText : undefined} />
      <TextField label="Type" mode="select" options={BANK_TYPES.map((t) => BANK_TYPE_LABELS[t])} value={BANK_TYPE_LABELS[type]} onChange={(v) => setType(BANK_TYPES.find((t) => BANK_TYPE_LABELS[t] === v) ?? 'text')} />
      {needsOptions(type) ? (
        <div className={styles.optionList} data-testid="question-options">
          <span className={styles.optionsLabel}>Options</span>
          {options.map((o, i) => (
            <div key={i} className={styles.optionRow}>
              <TextField label={`Option ${i + 1}`} value={o} onChange={(v) => setOptions((os) => os.map((x, j) => (j === i ? v : x)))} maxLength={60} trailingIcon={null} />
              <Tooltip label="Remove this option"><IconButton icon="close" label={`Remove option ${i + 1}`} size={24} variant="bare" iconSize={16} disabled={options.length <= 1} onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} /></Tooltip>
            </div>
          ))}
          {pressed && errOpts ? <span className={styles.error} role="alert">{errOpts}</span> : null}
          <Button appearance="text" iconStart={<Icon name="add" size={18} />} onPress={() => setOptions((os) => [...os, ''])}>Add option</Button>
        </div>
      ) : null}
      <label className={styles.flag}><Switch size="sm" isSelected={required} aria-label="Required" onChange={(on: boolean) => setRequired(on)} /><span>Required — the homeowner must answer it</span></label>
    </Dialog>
  )
}
