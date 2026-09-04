'use client'

import { ChoiceChips, Divider, LinkButton, NotesArea, SectionRow } from '@/components/leads/move-stage/fields'
import { DateTimeField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { CONTACT_CHANNELS, CONTACT_MODES, OUTCOMES, SCHEDULE } from '@/lib/leads/enums'
import type { NoteDraft } from '@/lib/leads/note-model'
import { displayDateTime, parseInputDateTime } from '@/lib/format'
import styles from './contact-editor.module.css'

/**
 * Lead Details › Notes — contact log editor (frames 162 931:45124 empty · 165 931:45231 filled · 163 931:45383 view).
 * Spec: design-source/context/lead-notes/02-contact-log-dialogs.txt.
 * Editing = the Move stage window's Contacted log (components/leads/move-stage/panels.tsx LogCard): "Contacted via"
 * ChoiceChips · When + Outcome · the next-step block when the outcome asks for one · "Remarks" + NotesArea.
 * View = label/value rows (labels 104), Remarks the last row.
 * The "Contact log" title and its Auto Fill / Edit / lock hint moved to the pane header (REG-292) — it has to span
 * the pane for its rule to, and the fields scroll under it.
 * (REG-291, user 2026-09-02) A log is ALL fields: the rich body, the rule above it and the pane's formatting bar
 * are gone — the host renders no PaneToolbar for a contact log, since there is no rich text to format.
 * (REG-324, user 2026-09-04) The Attach row is back as the log's own last section (780:89150): a rule, the label and the
 * "Attach" link, which opens the files library; attached files show in the Attachments column, as for a note.
 * The links are the DS `Link` (1:1 with the mock's "Link text" instance: 14/Semi Bold primary, no underline);
 * fields.tsx LinkButton was not used — it hides itself inside a read-only scope and this editor has none.
 * Edit and Cancel · Save live in the pane's bottom bar since REG-254 (the mock's inline Edit link, frame 163,
 * and the editor footer, frame 165, both moved there — the host renders them beside the formatting).
 */
export function ContactEditor({
  draft, onChange, onAttach, errors, editing, autoFocus = true, today,
}: {
  draft: NoteDraft
  onChange: (patch: Partial<NoteDraft>) => void
  /** The Attach row's link — opens the files library (the Tasks Attach files modal) for this log (REG-324). */
  onAttach?: () => void
  /** validateDraft keys: channel · when · outcome · nextStepWhen · nextStepMode — shown after the first Save, cleared live by the host. */
  errors: Record<string, string>
  editing: boolean
  /** (REG-294) False when the host selected this log by itself — a search must not pull the caret out of its box. */
  autoFocus?: boolean
  /** Day-granular "today" for the pickers (never Date.now() in render). */
  today: Date
}) {
  const remarks = draft.body.trim()
  const scheduled = !!(draft.nextStepWhen || draft.nextStepMode)   // (REG-319) the view shows the schedule rows only when something was scheduled
  return (
    <div className={styles.editor} data-testid="contact-editor" data-mode={editing ? 'edit' : 'view'}>
      <div className={styles.fields}>
        {editing ? (
          <>
            <ChoiceChips label="Contacted via" options={CONTACT_CHANNELS} value={draft.channel}
                         onChange={(v) => onChange({ channel: v })} error={errors.channel} />
            <div className={styles.fieldPair}>
              <DateTimeField label="Date & Time" value={draft.when} today={today}
                             onChange={(v) => onChange({ when: v })} error={errors.when} />
              {/* Opens focused on its first field, as the note editor does — when the user came here to enter data (REG-294). */}
              <TextField label="Outcome" autoFocus={autoFocus} value={draft.outcome} mode="select" options={OUTCOMES}
                         onChange={(v) => onChange({ outcome: v })} error={errors.outcome} />
            </div>
            {/* (REG-319, mock 781:58313) The optional schedule block, one heading + helper for every outcome — the Move stage window's. */}
            {/* (REG-324) It appears once an outcome is chosen — the empty log (780:89150) offers no schedule yet. */}
            {draft.outcome ? (
            <div className={styles.nextStep}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionLabel}>{SCHEDULE.heading}</span>
                  <span className={styles.sectionHelper}>{SCHEDULE.helper}</span>
                </div>
                <div className={styles.fieldPair}>
                  <DateTimeField label="Date & Time" value={draft.nextStepWhen} today={today}
                                 onChange={(v) => onChange({ nextStepWhen: v })} error={errors.nextStepWhen} />
                  <TextField label="Preferred mode" value={draft.nextStepMode} mode="select" options={CONTACT_MODES}
                             onChange={(v) => onChange({ nextStepMode: v })} error={errors.nextStepMode} />
                </div>
            </div>
            ) : null}
            {/* Remarks is one of the fields now (REG-291, user 2026-09-02): the Move stage window's own
                label + NotesArea, in place of the rich "Write a note..." body the formatting bar used to serve. */}
            <div className={styles.remarks}>
              <span className={styles.sectionLabel}>Remarks (optional)</span>
              <NotesArea value={draft.body} onChange={(v) => onChange({ body: v })} />
            </div>
            {/* (REG-324, 780:89150) The Attach row, the Move stage window's own: a rule, then the label and the "Attach" link. */}
            {onAttach ? (
              <>
                <Divider />
                <SectionRow label="Attach screenshots of your call attempts"
                            action={<LinkButton icon="attach_file" onClick={onAttach}>Attach</LinkButton>} />
              </>
            ) : null}
          </>
        ) : (
          <div className={styles.rows}>
            <div className={styles.labels}>
              <span className={styles.label}>Contacted via</span>
              <span className={styles.label}>Date & Time</span>
              <span className={styles.label}>Outcome</span>
              {scheduled ? <span className={styles.label}>Next follow-up</span> : null}
              {scheduled ? <span className={styles.label}>Preferred mode</span> : null}
              {/* Last row on both sides, so a remark that wraps cannot pull the columns out of step. */}
              {remarks ? <span className={styles.label}>Remarks</span> : null}
            </div>
            <div className={styles.values}>
              <span className={styles.value}>{draft.channel ?? ''}</span>
              <span className={styles.value}>{viewDateTime(draft.when)}</span>
              <span className={styles.value}>{draft.outcome}</span>
              {scheduled ? <span className={styles.value}>{draft.nextStepWhen ? viewDateTime(draft.nextStepWhen) : '--'}</span> : null}
              {scheduled ? <span className={styles.value}>{draft.nextStepMode || '--'}</span> : null}
              {remarks ? <span className={`${styles.value} ${styles.remarksValue}`}>{remarks}</span> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** View values read "17 Jul ’26, 3:00 PM" (`displayDateTime`); a saved log always parses — the raw string is the fallback. */
function viewDateTime(input: string): string {
  const d = parseInputDateTime(input)
  return d ? displayDateTime(d) : input
}
