'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { DefinitionDialog, DefinitionTable, type Definition } from '@/components/om/definition-list'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from './company-shell'
import { QuestionnaireGhost } from './company-ghosts'
import { ReadOnlyNote } from './read-only-note'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import type { StudioScopeQuestion } from '@/lib/db/schema'
import { BANK_HELP, BANK_TYPES, BANK_TYPE_LABELS, isBankType, needsOptions, parseBankOptions } from '@/lib/company/question-bank'
import { createScopeQuestion, deleteScopeQuestion, moveScopeQuestion, reorderScopeQuestions, setScopeQuestionFlags, updateScopeQuestion } from '@/app/company/scope-questions-actions'
import styles from './questionnaire-view.module.css'
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

/**
 * (REG-612, parity Q-21 · C-75) Company › Questionnaire — 1.0's "Scope Questions" builder on 2.0's pieces (Profile's card shell, the DS
 * Switch, the om Dialog): the bank every lead's questionnaire starts from. Question · type (1.0's six) · options · Required · Enabled ·
 * order. Owners and Admins edit; everyone else reads.
 * (pending modules S17) The list and its Add / Edit form are the one definitions list Settings' Custom fields uses too
 * (components/om/definition-list.tsx) — they were twins; the form now closes only once its save lands.
 */
const defOf = (q: StudioScopeQuestion): Definition => ({ id: q.id, name: q.question, type: BANK_TYPE_LABELS[isBankType(q.questionType) ? q.questionType : 'text'], options: parseBankOptions(q.options), required: q.isRequired, active: q.isEnabled })

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
  const flag = (q: StudioScopeQuestion, patch: { required?: boolean; active?: boolean }) => {
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === q.id ? { ...x, ...(patch.active !== undefined ? { isEnabled: patch.active } : {}), ...(patch.required !== undefined ? { isRequired: patch.required } : {}) } : x)))
    void run('save the question', () => setScopeQuestionFlags(q.id, { ...(patch.active !== undefined ? { enabled: patch.active } : {}), ...(patch.required !== undefined ? { required: patch.required } : {}) }),
      patch.active !== undefined ? (patch.active ? 'Question active — new leads start with it' : 'Question inactive — new leads skip it') : (patch.required ? 'Marked required' : 'No longer required'), prev)
  }
  const move = (q: StudioScopeQuestion, dir: 'up' | 'down') => {
    const prev = rows
    setRows((rs) => { const i = rs.findIndex((x) => x.id === q.id), j = dir === 'up' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= rs.length) return rs; const n = [...rs]; [n[i], n[j]] = [n[j]!, n[i]!]; return n })
    void run('move the question', () => moveScopeQuestion(q.id, dir), 'Order saved', prev)
  }
  const cur = editing?.q ?? null
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
            <p className={styles.cardHelp}>{BANK_HELP}</p>
          </div>
          {rows.length === 0 ? (
            <p className={styles.empty} data-testid="bank-empty">No questions yet — add the first one, and every new lead will start with it.</p>
          ) : (
            /* (REG-614 · REG-727) the card table: a bordered list under a caption head, every switch under its own column name, the actions
               (order · edit · delete) at the row's end */
            <DefinitionTable items={rows} defOf={defOf} nameHead="Question" label="Questions" testId="bank-question" canEdit={canEdit} named={(d) => `“${d.name}”`}
                             onItems={setRows} onFlag={flag} onMove={move} onEdit={(q) => setEditing({ q })} onDelete={setDeleting}
                             onOrder={(prev, now) => { void run('move the question', () => reorderScopeQuestions(now.map((q) => q.id)), 'Order saved', prev) }} />
          )}
        </section>
      </div>
      <DefinitionDialog open={!!editing} editing={!!cur} noun="question" nameLabel="Question" nameMax={200} types={BANK_TYPES} typeLabels={BANK_TYPE_LABELS} needsOptions={needsOptions}
                        requiredLine="Required — the homeowner must answer it" optionsTestId="question-options"
                        initial={cur ? { name: cur.question, type: isBankType(cur.questionType) ? cur.questionType : 'text', options: parseBankOptions(cur.options), required: cur.isRequired } : null}
                        onClose={() => setEditing(null)}
                        onSave={async (d) => {
                          const input = { question: d.name, type: d.type, options: d.options, required: d.required }
                          const options = input.options.length ? JSON.stringify(input.options) : null
                          if (cur) {
                            const ok = await run('save the question', () => updateScopeQuestion(cur.id, input), 'Question saved')
                            if (ok) setRows((rs) => rs.map((x) => (x.id === cur.id ? { ...x, question: input.question, questionType: input.type, options, isRequired: input.required } : x)))
                            return ok
                          }
                          /* the new row joins the list once it is saved — the refresh confirms it */
                          return run('add the question', async () => { const id = await orThrow(createScopeQuestion(input)); setRows((rs) => [...rs, { id, question: input.question, questionType: input.type, options, isRequired: input.required, isEnabled: true, sortOrder: rs.length, createdAt: new Date() }]) }, 'Question added')
                        }} />
      <ConfirmDialog open={!!deleting} title="Delete this question?" message={deleting ? `“${deleting.question}” leaves the bank. Leads that already carry it keep their copy.` : undefined} confirmLabel="Delete"
                     onCancel={() => setDeleting(null)} onConfirm={() => { const q = deleting; setDeleting(null); if (q) { const prev = rows; setRows((rs) => rs.filter((x) => x.id !== q.id)); void run('delete the question', () => deleteScopeQuestion(q.id), 'Question deleted', prev) } }} />
    </CompanyShell>
  )
}
