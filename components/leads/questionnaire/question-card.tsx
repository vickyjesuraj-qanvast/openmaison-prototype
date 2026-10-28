'use client'

import { useMemo, useRef, useState } from 'react'
import { Button, Tag, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import type { Question } from '@/lib/db/schema'
import { QUESTION_TYPE_LABELS, answerShown, parseMulti, parseOptions, validateAnswer } from '@/lib/leads/question-model'
import { displayDayShortMonth, relativeTime } from '@/lib/format'
import styles from './question-card.module.css'

/**
 * Lead Details › Questionnaire — question card (931:46985 unanswered · 931:46990 answering · 931:47000 answered by the
 * studio · 931:47012 answered by the client; inputs per type from the Question Types sub-section 931:47053).
 * Specs: design-source/context/lead-questionnaire/01-listing-empty-dialog.txt "Question card" · 02-question-types.txt.
 * Head H g16 p16/24: "Q: " 14/Medium + question 14/Regular (fills) + trailing "Answer" link (open) / "By Studio" ·
 * "By Client" outlined tag (answered). `mode === 'answer'` shows the grey block (V g16 p24) with the type's input and
 * Cancel · Save (the Notes editor footer's buttons, components/leads/notes/note-editor.tsx EditorFooter); the answered
 * view is the grey block H g16 p24 with "A: " + the answer · relativeTime · edit 20 (studio answers only).
 * Save validates through `validateAnswer` — the error shows after the first Save and clears live.
 * Single / Multi select open their own option menus (02: radio_button_* / check_box_* 20 rows) — see `OptionMenuField`.
 * The inputs are the app's 48px `TextField` / `DateField` where 02 draws "Text Field 36" (REG-189, as REG-176).
 */
export function QuestionCard({
  question, now, mode, onAnswer, onCancel, onSave, saving, askedAt = null, changes = 0, onHistory, client = '',
}: {
  question: Question
  /** (the calm UI build 2026-10-27 — 2-18) the client's first name — "Answered by Olivia" */
  client?: string
  /** Server "now" (ms) for the "1d ago" stamp — never Date.now() in render. */
  now: number
  mode: 'view' | 'answer'
  onAnswer: () => void
  onCancel: () => void
  onSave: (value: string | string[]) => void
  saving?: boolean
  /** (UX audit 2026-09-30, T12) When the client was last asked this question (ms) — the unanswered card wears "Asked · 30 Sep". */
  askedAt?: number | null
  /** (gaps build D, item 9 — 1.0 M-170) how many times the answer was overwritten; the clock opens its history */
  changes?: number
  onHistory?: () => void
}) {
  const [draft, setDraft] = useState<string | string[]>(() => seedDraft(question))
  const [submitted, setSubmitted] = useState(false)
  const [wasMode, setWasMode] = useState(mode)
  // Entering answer mode re-seeds the draft from the stored answer (pre-filled edit) — render-phase adjust pattern
  // (as components/leads/quotes/quotes-filters-modal.tsx), no effect.
  if (mode !== wasMode) {
    setWasMode(mode)
    if (mode === 'answer') { setDraft(seedDraft(question)); setSubmitted(false) }
  }
  const today = useMemo(() => new Date(now), [now])

  const answered = question.answeredBy !== null && question.answeredAt !== null
  const error = submitted ? validateAnswer(question.type, draft) : undefined
  const change = (v: string | string[]) => setDraft(v)
  const save = () => {
    setSubmitted(true)
    if (!validateAnswer(question.type, draft)) onSave(draft)
  }
  const state = mode === 'answer' ? 'answering' : question.answeredBy === 'client' ? 'client' : question.answeredBy === 'studio' ? 'studio' : 'open'
  /* (the calm UI build 2026-10-27 — 2-18 · T-02, a deliberate change of 931:46985's "Q: … Answer") The question is the row's title, with no
     "Q:" before it; an open one says "Not answered" in grey under it and the row itself opens the answer box — the purple "Answer" link it
     repeated on every row is gone (its press is the row's). Who answered reads beside the answer, in grey words — never a tag. */
  const open = mode === 'view' && !answered
  const tags = (
    <>
      {question.required && !answered ? <Tag appearance="outlined" className={styles.tag} data-testid="question-required">Required</Tag> : null}   {/* (REG-647) the bank's Required */}
      {askedAt && !answered ? <Tag appearance="outlined" color="blue" className={styles.tag} data-testid="question-asked">{`Asked · ${displayDayShortMonth(new Date(askedAt))}`}</Tag> : null}   {/* (T12) */}
    </>
  )
  const by = question.answeredBy === 'client' ? `Answered by ${client.trim() || 'the client'}` : 'Answered by the studio'

  return (
    <div className={styles.card} data-testid="question-card" data-state={state}>
      {open ? (
        <button type="button" className={`${styles.head} ${styles.headPress}`} onClick={onAnswer} aria-label={`Answer: ${question.text}`} data-testid="question-answer">
          <span className={styles.qStack}>
            <span className={styles.q}>{question.text}</span>
            <span className={styles.notAnswered}>Not answered</span>
          </span>
          {tags}
        </button>
      ) : (
        <div className={styles.head}>
          <p className={styles.q}>{question.text}</p>
          {tags}
        </div>
      )}

      {mode === 'answer' ? (
        <div className={styles.block}>
          <AnswerInput question={question} value={draft} onChange={change} error={error} today={today} />
          {/* Cancel · Save row (931:46995): H g12 right — the Notes EditorFooter's buttons without its rule / padding. */}
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" onPress={onCancel} isDisabled={saving}>Cancel</Button>
            <Button onPress={save} isDisabled={saving}>Save</Button>
          </div>
        </div>
      ) : answered ? (
        <div className={styles.answer}>
          <p className={styles.a}>{answerShown(question)}</p>
          {/* (Leads on the move, L4 — C-25) who answered is a line beside the when — (the calm UI build 2026-10-27 — 2-18) at every width now, the
              head's tag gone */}
          <span className={styles.when}><span className={styles.by} data-testid="question-by">{`${by} · `}</span>{question.answeredAt ? relativeTime(question.answeredAt, today) : ''}</span>
          {/* (gaps build D, item 9 — 1.0's clock icon) an answer changed since it was first given keeps every version: old → new, who, when */}
          {changes > 0 && onHistory ? (
            <Tooltip label="Answer history">
              <button type="button" className={styles.iconBtn} aria-label="Answer history" onClick={onHistory} data-testid="question-history">
                <Icon name="history" size={20} />
              </button>
            </Tooltip>
          ) : null}
          {question.answeredBy === 'studio' ? (
            <Tooltip label="Edit answer">
              {/* Bare 20 icon button — components/leads/detail/info-column.tsx `.iconBtn` in the secondary colour (931:47006 edit 20/Regular #666666). */}
              <button type="button" className={styles.iconBtn} aria-label="Edit answer" onClick={onAnswer}>
                <Icon name="edit" size={20} />
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** The stored answer as the input's value: multi = the picked options, everything else the raw string (date = d/m/yyyy). */
function seedDraft(q: Question): string | string[] {
  return q.type === 'multi' ? parseMulti(q.answer) : (q.answer ?? '')
}

/** The type's input (02-question-types.txt). Labels are the Question Types names verbatim. */
export function AnswerInput({ question, value, onChange, error, today, label }: {
  question: Question
  value: string | string[]
  onChange: (v: string | string[]) => void
  error: string | undefined
  today: Date
  /** (fix-F, F-05) the field's label for someone who isn't the studio — the client's portal says "Your answer" · "Pick one" · "Pick any";
      the studio's tab keeps the Question Types names */
  label?: string
}) {
  const str = typeof value === 'string' ? value : ''
  const list = Array.isArray(value) ? value : []
  switch (question.type) {
    case 'number':
      return <TextField label={label ?? QUESTION_TYPE_LABELS.number} value={str} numeric="digits" onChange={onChange} error={error} />
    case 'single': {
      // The question's own options; a seeded single-select without any falls back to the type's "(yes/no)" pair (02: "Yes" / "No").
      const opts = parseOptions(question)
      return <SingleSelect label={label ?? QUESTION_TYPE_LABELS.single} options={opts.length ? opts : ['Yes', 'No']} value={str} onChange={onChange} error={error} />
    }
    case 'multi':
      return <MultiSelect label={label ?? QUESTION_TYPE_LABELS.multi} options={parseOptions(question)} value={list} onChange={onChange} error={error} />
    case 'date':
      return <DateField label={label ?? QUESTION_TYPE_LABELS.date} value={str} onChange={onChange} today={today} error={error} />
    default:
      // components/om/text-field.tsx has no multiline mode, so the Text answer is the DS TextArea (52 tall per 931:47090,
      // see question-card.module.css .textArea); it carries its own error line (DS FieldError) in the TextField's style.
      // (REG-729) Labelled like its siblings — the Question Types name — as every DS TextArea is; the placeholder shows once it has focus.
      return (
        <TextArea label={label ?? QUESTION_TYPE_LABELS.text} placeholder="Enter your answer" value={str} onChange={onChange}
                  isInvalid={!!error} errorMessage={error} className={styles.textArea} />
      )
  }
}

/**
 * Option menu field (931:47054 Multi select · 931:47069 Single select): a select-styled trigger (TextField mode="trigger",
 * expand_more) opening a Dropdown of icon + label rows in the 931:47484-style list — (REG-728) the house `DropdownItem` rows as
 * role="menuitemcheckbox" / "menuitemradio" with their `checked` state, each drawing its own mark (the glyph), so no Selected fill.
 * The Dropdown only closes on presses outside it, so the multi menu stays open while toggling
 * (REG-189); the single menu closes itself on a pick, as a select does. The plan (00-build-plan.md) had the single select
 * on `TextField mode="select"`, whose rows carry no glyph — the measured spec 02 draws radio_button_checked 20/Light
 * primary (on) / radio_button_unchecked 20 secondary, so it takes this menu (review fix, REG-187).
 * The wrapper carries aria-haspopup / aria-expanded so a press anywhere on the trigger box (chevron, padding — outside
 * the field's inner button) counts as the trigger for the Dropdown's outside-press rule and toggles instead of
 * closing-then-reopening (REG-153).
 */
function OptionMenuField({ label, options, display, error, role, icons, isOn, onPick, closeOnPick }: {
  label: string
  options: string[]
  /** What the field shows (the picks joined by ", " / the picked option). */
  display: string
  error: string | undefined
  role: 'menuitemcheckbox' | 'menuitemradio'
  /** Row glyphs: [on, off] — check_box / check_box_outline_blank · radio_button_checked / radio_button_unchecked (20). */
  icons: [string, string]
  isOn: (o: string) => boolean
  onPick: (o: string) => void
  closeOnPick: boolean
}) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState<number | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  return (
    <div className={styles.multi} aria-haspopup="listbox" aria-expanded={open}>
      <TextField label={label} mode="trigger" trailingIcon="expand_more" value={display} boxRef={box} open={open} error={error}
                 onOpen={() => { setWidth(box.current?.offsetWidth ?? null); setOpen((o) => !o) }} />
      {/* The menu is as wide as the field (measured on open — the Dropdown takes a number). */}
      <Dropdown open={open} onClose={() => setOpen(false)} align="left" width={width ?? 200} sheetTitle={label}>
        {options.map((o) => {
          const on = isOn(o)
          return (
            <DropdownItem key={o} role={role} checked={on} onSelect={() => { onPick(o); if (closeOnPick) setOpen(false) }}>
              <span className={styles.check}><Icon name={on ? icons[0] : icons[1]} size={20} weight={on ? 300 : 400} /></span>
              <span className={styles.optionLabel}>{o}</span>
            </DropdownItem>
          )
        })}
      </Dropdown>
    </div>
  )
}

/** Multi select (931:47054): check_box 20/Light primary (on) · check_box_outline_blank 20 secondary; the field shows the picks joined by ", " in the options' order. */
function MultiSelect({ label, options, value, onChange, error }: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  error: string | undefined
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : options.filter((x) => x === o || value.includes(x)))
  return (
    <OptionMenuField label={label} options={options} display={value.join(', ')} error={error} role="menuitemcheckbox"
                     icons={['check_box', 'check_box_outline_blank']} isOn={(o) => value.includes(o)} onPick={toggle} closeOnPick={false} />
  )
}

/** Single select (931:47069): radio_button_checked 20/Light primary (on) · radio_button_unchecked 20 secondary + "Yes" / "No"; a pick closes the menu. */
function SingleSelect({ label, options, value, onChange, error }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  error: string | undefined
}) {
  return (
    <OptionMenuField label={label} options={options} display={value} error={error} role="menuitemradio"
                     icons={['radio_button_checked', 'radio_button_unchecked']} isOn={(o) => o === value} onPick={onChange} closeOnPick />
  )
}
