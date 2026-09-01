'use client'

import { Link } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ChoiceChips, Divider } from '@/components/leads/move-stage/fields'
import { DateTimeField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { CONTACT_CHANNELS, CONTACT_MODES, OUTCOMES } from '@/lib/leads/enums'
import { nextStepFor, type NoteDraft } from '@/lib/leads/note-model'
import { displayDateTime, parseInputDateTime } from '@/lib/format'
import { BodyArea } from './note-editor'
import styles from './contact-editor.module.css'

/**
 * Lead Details › Notes — contact log editor (frames 162 931:45124 empty · 165 931:45231 filled · 163 931:45383 view).
 * Spec: design-source/context/lead-notes/02-contact-log-dialogs.txt.
 * Editing = the Move stage window's Contacted log (components/leads/move-stage/panels.tsx LogCard): "Contact log" +
 * Auto Fill link · "Contacted via" ChoiceChips · When + Outcome · the next-step block when the outcome asks for one ·
 * rule · body textarea "Write a note...". View = "Contact log" + Edit link · label/value rows (labels 104) · rule · body.
 * The links are the DS `Link` (1:1 with the mock's "Link text" instance: 14/Semi Bold primary, no underline);
 * fields.tsx LinkButton was not used — it hides itself inside a read-only scope and this editor has none.
 * Edit and Cancel · Save live in the pane's bottom bar since REG-254 (the mock's inline Edit link, frame 163,
 * and the editor footer, frame 165, both moved there — the host renders them beside the formatting).
 */
export function ContactEditor({
  draft, onChange, errors, editing, locked, onEdit, onAutoFill, today,
}: {
  draft: NoteDraft
  onChange: (patch: Partial<NoteDraft>) => void
  /** validateDraft keys: channel · when · outcome · nextStepWhen · nextStepMode — shown after the first Save, cleared live by the host. */
  errors: Record<string, string>
  editing: boolean
  /** The Contacted stage's own log (REG-265): view-only — no Edit link; the stage window owns it. */
  locked?: boolean
  onEdit: () => void
  onAutoFill: () => void
  /** Day-granular "today" for the pickers (never Date.now() in render). */
  today: Date
}) {
  const nextStep = nextStepFor(draft.outcome)
  return (
    <div className={styles.editor} data-testid="contact-editor" data-mode={editing ? 'edit' : 'view'}>
      <div className={styles.fields}>
        <div className={styles.titleRow}>
          <span className={styles.blockTitle}>Contact log</span>
          {/* Edit sits inline at the title's right (user 2026-09-01, REG-256 — moved back from the REG-254 bar);
              Cancel · Save stay in the bar. Auto Fill stays with the fields it fills. A stage-logged record
              (REG-265) offers neither — where Edit would sit, a hint says why it is view-only (REG-268). */}
          {editing
            ? <Link variant="primary" onPress={onAutoFill}>Auto Fill</Link>
            : locked ? (
              <span className={styles.lockHint}>
                <Icon name="lock" size={14} />
                Added during stage movement — view only
              </span>
            ) : <Link variant="primary" onPress={onEdit}>Edit</Link>}
        </div>

        {editing ? (
          <>
            <ChoiceChips label="Contacted via" options={CONTACT_CHANNELS} value={draft.channel}
                         onChange={(v) => onChange({ channel: v })} error={errors.channel} />
            <div className={styles.fieldPair}>
              <DateTimeField label="When" value={draft.when} today={today}
                             onChange={(v) => onChange({ when: v })} error={errors.when} />
              {/* Opens focused on its first field, as the note editor does — the user came here to enter data. */}
              <TextField label="Outcome" autoFocus value={draft.outcome} mode="select" options={OUTCOMES}
                         onChange={(v) => onChange({ outcome: v })} error={errors.outcome} />
            </div>
            {nextStep ? (
              <div className={styles.nextStep}>
                <span className={styles.sectionLabel}>Next step: {nextStep}</span>
                <div className={styles.fieldPair}>
                  <DateTimeField label="Date & Time" value={draft.nextStepWhen} today={today}
                                 onChange={(v) => onChange({ nextStepWhen: v })} error={errors.nextStepWhen} />
                  <TextField label="Preferred mode" value={draft.nextStepMode} mode="select" options={CONTACT_MODES}
                             onChange={(v) => onChange({ nextStepMode: v })} error={errors.nextStepMode} />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.rows}>
            <div className={styles.labels}>
              <span className={styles.label}>Contacted via</span>
              <span className={styles.label}>Date & Time</span>
              <span className={styles.label}>Outcome</span>
              {nextStep ? <span className={styles.label}>Next follow-up</span> : null}
              {nextStep ? <span className={styles.label}>Preferred mode</span> : null}
            </div>
            <div className={styles.values}>
              <span className={styles.value}>{draft.channel ?? ''}</span>
              <span className={styles.value}>{viewDateTime(draft.when)}</span>
              <span className={styles.value}>{draft.outcome}</span>
              {nextStep ? <span className={styles.value}>{viewDateTime(draft.nextStepWhen)}</span> : null}
              {nextStep ? <span className={styles.value}>{draft.nextStepMode}</span> : null}
            </div>
          </div>
        )}

        <Divider />

        {editing
          ? <BodyArea value={draft.body} onChange={(v) => onChange({ body: v })} />
          : <BodyArea value={draft.body} onChange={() => {}} disabled />}
      </div>
    </div>
  )
}

/** View values read "17 Jul ’26, 3:00 PM" (`displayDateTime`); a saved log always parses — the raw string is the fallback. */
function viewDateTime(input: string): string {
  const d = parseInputDateTime(input)
  return d ? displayDateTime(d) : input
}
