'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { MSG } from '@/lib/forms'
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/leads/question-model'
import styles from './add-question-card.module.css'

/**
 * Lead Details › Questionnaire — add-question card (invented, REG-188: no mock). The question card shell
 * (931:46990 — head H g16 p16/24, grey block V g16 p24, Cancel · Save) with the head reading "Q: " + a bare input
 * "Type your question" and the block holding the "Question type" select (QUESTION_TYPE_LABELS) and, for Multi select,
 * "Options (comma separated)". Save needs a question text; Multi select needs ≥ 2 options; Single select saves the
 * type's "(yes/no)" pair; Text / Number / Date save no options. Errors show after the first Save and clear live.
 * `saving` (the Notes EditorFooter's prop) locks Cancel · Save and the Enter key while `createQuestion` is in flight.
 * Spec (shell): design-source/context/lead-questionnaire/01-listing-empty-dialog.txt "Question card" b.
 */
const TYPE_LABELS = QUESTION_TYPES.map((t) => QUESTION_TYPE_LABELS[t])
/* Invented copy (REG-188) — lib/forms.ts has no "at least n" message. */
const MSG_OPTIONS = 'Enter at least two options, comma separated'

export function AddQuestionCard({ onCancel, onSave, saving }: {
  onCancel: () => void
  onSave: (text: string, type: QuestionType, options: string[]) => void
  saving?: boolean
}) {
  const [text, setText] = useState('')
  const [typeLabel, setTypeLabel] = useState<string>(QUESTION_TYPE_LABELS.text)   // default Text — the first type in the sub-section
  const [optionsText, setOptionsText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const type: QuestionType = QUESTION_TYPES.find((t) => QUESTION_TYPE_LABELS[t] === typeLabel) ?? 'text'
  const parsed = optionsText.split(',').map((s) => s.trim()).filter(Boolean)
  const textError = submitted && !text.trim() ? MSG.required : undefined
  const optionsError = submitted && type === 'multi' && parsed.length < 2 ? MSG_OPTIONS : undefined

  const save = () => {
    if (saving) return
    setSubmitted(true)
    if (!text.trim() || (type === 'multi' && parsed.length < 2)) return
    onSave(text.trim(), type, type === 'multi' ? parsed : type === 'single' ? ['Yes', 'No'] : [])
  }

  return (
    <div className={styles.card} data-testid="add-question-card">
      <div className={styles.head}>
        <span className={styles.qLabel}>Q: </span>
        <div className={styles.headField}>
          {/* Bare input — the Notes editor's title input pattern (components/leads/notes/note-editor.tsx) at body-m. */}
          <input
            className={styles.input}
            value={text}
            placeholder="Type your question"
            aria-label="Question"
            aria-invalid={textError ? true : undefined}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
          />
          {textError ? <span className={styles.support} role="alert">{textError}</span> : null}
        </div>
      </div>
      <div className={styles.block}>
        <TextField label="Question type" mode="select" options={TYPE_LABELS} value={typeLabel} onChange={setTypeLabel} />
        {type === 'multi' ? (
          <TextField label="Options (comma separated)" value={optionsText} onChange={setOptionsText} error={optionsError} />
        ) : null}
        <div className={styles.actions}>
          <Button variant="secondary" appearance="outlined" onPress={onCancel} isDisabled={saving}>Cancel</Button>
          <Button onPress={save} isDisabled={saving}>Save</Button>
        </div>
      </div>
    </div>
  )
}
