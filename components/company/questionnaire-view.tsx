'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import type { StudioScopeQuestion } from '@/lib/db/schema'
import { BANK_TYPES, BANK_TYPE_LABELS, isBankType, needsOptions, parseBankOptions, type BankType } from '@/lib/company/question-bank'
import { createScopeQuestion, deleteScopeQuestion, moveScopeQuestion, setScopeQuestionFlags, updateScopeQuestion } from '@/app/company/scope-questions-actions'
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
  const run = async (fn: () => Promise<unknown>, done: string) => { try { await fn(); snackbar({ message: done }); router.refresh() } catch { snackbar({ message: 'Couldn’t save — please try again' }) } }
  const flag = (q: StudioScopeQuestion, patch: { enabled?: boolean; required?: boolean }) => {
    setRows((rs) => rs.map((x) => (x.id === q.id ? { ...x, ...(patch.enabled !== undefined ? { isEnabled: patch.enabled } : {}), ...(patch.required !== undefined ? { isRequired: patch.required } : {}) } : x)))
    void run(() => setScopeQuestionFlags(q.id, patch), patch.enabled !== undefined ? (patch.enabled ? 'Question enabled — new leads start with it' : 'Question disabled — new leads skip it') : (patch.required ? 'Marked required' : 'No longer required'))
  }
  const move = (q: StudioScopeQuestion, dir: 'up' | 'down') => {
    setRows((rs) => { const i = rs.findIndex((x) => x.id === q.id), j = dir === 'up' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= rs.length) return rs; const n = [...rs]; [n[i], n[j]] = [n[j]!, n[i]!]; return n })
    void run(() => moveScopeQuestion(q.id, dir), 'Order saved')
  }
  return (
    <CompanyShell title="Questionnaire" from={from}>
      <div className={styles.layout} data-testid="questionnaire-bank">
        <section className={styles.card} aria-labelledby="bank-title">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}>
              <h2 id="bank-title" className={styles.cardTitle}>Question bank</h2>
              {canEdit ? <Button iconStart={<Icon name="add" size={20} />} onPress={() => setEditing({ q: null })}>Add question</Button> : null}
            </div>
            <p className={styles.cardHelp}>Customise the questions homeowners answer about their project. New leads start with the enabled questions; an older lead adds them from its Questionnaire tab. Ask the client sends the lead’s questionnaire to the portal.</p>
          </div>
          {rows.length === 0 ? (
            <p className={styles.empty} data-testid="bank-empty">No questions yet — add the first one, and every new lead will start with it.</p>
          ) : (
            <div className={styles.table} role="table" aria-label="Questions">
              {/* (REG-614) The Notifications settings' event table: a bordered list under a caption head, every switch under its own
                  column name, the actions (order · edit · delete) at the row's end. The rows used to carry ad-hoc switch labels. */}
              <div className={styles.thead} role="row">
                <span role="columnheader">Question</span>
                <span role="columnheader" className={styles.col}>Required</span>
                <span role="columnheader" className={styles.col}>Enabled</span>
                <span role="columnheader" className={styles.actionsHead} aria-label="Actions" />
              </div>
              {rows.map((q, i) => {
                const t = isBankType(q.questionType) ? q.questionType : 'text'
                const opts = parseBankOptions(q.options)
                return (
                  <div key={q.id} className={styles.trow} role="row" data-testid="bank-question" data-enabled={q.isEnabled || undefined}>
                    <span className={styles.text} role="cell">
                      <span className={styles.question}>{q.question}</span>
                      <span className={styles.meta}><MetaChip>{BANK_TYPE_LABELS[t]}</MetaChip>{opts.length ? <span className={styles.options}>{opts.join(' · ')}</span> : null}</span>
                    </span>
                    <span className={styles.col} role="cell"><label className={styles.flag}><Switch size="sm" isSelected={q.isRequired} isDisabled={!canEdit} aria-label={`${q.question} required`} onChange={(on: boolean) => flag(q, { required: on })} /></label></span>
                    <span className={styles.col} role="cell"><label className={styles.flag}><Switch size="sm" isSelected={q.isEnabled} isDisabled={!canEdit} aria-label={`${q.question} enabled`} onChange={(on: boolean) => flag(q, { enabled: on })} /></label></span>
                    <span className={styles.actions} role="cell">
                      {canEdit ? (
                        <>
                          <Tooltip label="Move up"><IconButton icon="arrow_upward" label={`Move “${q.question}” up`} size={24} variant="bare" iconSize={16} disabled={i === 0} onClick={() => move(q, 'up')} /></Tooltip>
                          <Tooltip label="Move down"><IconButton icon="arrow_downward" label={`Move “${q.question}” down`} size={24} variant="bare" iconSize={16} disabled={i === rows.length - 1} onClick={() => move(q, 'down')} /></Tooltip>
                          <Tooltip label="Edit"><IconButton icon="edit" label={`Edit “${q.question}”`} size={24} variant="bare" iconSize={18} onClick={() => setEditing({ q })} /></Tooltip>
                          <Tooltip label="Delete"><IconButton icon="delete" label={`Delete “${q.question}”`} size={24} variant="bare" iconSize={18} onClick={() => setDeleting(q)} /></Tooltip>
                        </>
                      ) : null}
                    </span>
                  </div>
                )
              })}
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
                          setRows((rs) => rs.map((x) => (x.id === q.id ? { ...x, question: input.question, questionType: input.type, options, isRequired: input.required } : x)))
                          await run(() => updateScopeQuestion(q.id, input), 'Question saved')
                        } else {
                          /* The new row joins the list at once — the refresh confirms it. */
                          await run(async () => { const id = await createScopeQuestion(input); setRows((rs) => [...rs, { id, question: input.question, questionType: input.type, options, isRequired: input.required, isEnabled: true, sortOrder: rs.length, createdAt: new Date() }]) }, 'Question added')
                        }
                      }} />
      <ConfirmDialog open={!!deleting} title="Delete this question?" message={deleting ? `“${deleting.question}” leaves the bank. Leads that already carry it keep their copy.` : undefined} confirmLabel="Delete"
                     onCancel={() => setDeleting(null)} onConfirm={() => { const q = deleting; setDeleting(null); if (q) { setRows((rs) => rs.filter((x) => x.id !== q.id)); void run(() => deleteScopeQuestion(q.id), 'Question deleted') } }} />
    </CompanyShell>
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
              <IconButton icon="close" label={`Remove option ${i + 1}`} size={24} variant="bare" iconSize={16} disabled={options.length <= 1} onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} />
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
