'use client'

import { Link } from '@/components/ds'
import { ChoiceChips, Divider } from '@/components/leads/move-stage/fields'
import { DateTimeField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { CONTACT_CHANNELS, CONTACT_MODES, OUTCOMES } from '@/lib/leads/enums'
import { nextStepFor, type NoteDraft } from '@/lib/leads/note-model'
import { displayDateTime, parseInputDateTime } from '@/lib/format'
import { BodyArea, EditorFooter } from './note-editor'
import styles from './contact-editor.module.css'

/**
 * Lead Details › Notes — contact log editor (frames 162 931:45124 empty · 165 931:45231 filled · 163 931:45383 view).
 * Spec: design-source/context/lead-notes/02-contact-log-dialogs.txt.
 * Editing = the Move stage window's Contacted log (components/leads/move-stage/panels.tsx LogCard): "Contact log" +
 * Auto Fill link · "Contacted via" ChoiceChips · When + Outcome · the next-step block when the outcome asks for one ·
 * rule · body textarea "Write a note...". View = "Contact log" + Edit link · label/value rows (labels 104) · rule · body.
 * The links are the DS `Link` (1:1 with the mock's "Link text" instance: 14/Semi Bold primary, no underline);
 * fields.tsx LinkButton was not used — it hides itself inside a read-only scope and this editor has none.
 * Footer (Cancel · Save) = the note editor's, shown the whole time the form is open (plan › ContactEditor: "footer Cancel · Save
 * while editing"; frame 165) — unlike the note editor it does not wait for a change: Cancel is the way out of an untouched Edit
 * and Save on an empty draft is what surfaces the validation. The host's Save with nothing changed simply leaves editing.
 */
export function ContactEditor({
  draft, onChange, errors, editing, onEdit, onAutoFill, onCancel, onSave, today, saving,
}: {
  draft: NoteDraft
  onChange: (patch: Partial<NoteDraft>) => void
  /** validateDraft keys: channel · when · outcome · nextStepWhen · nextStepMode — shown after the first Save, cleared live by the host. */
  errors: Record<string, string>
  editing: boolean
  onEdit: () => void
  onAutoFill: () => void
  onCancel: () => void
  onSave: () => void
  /** Day-granular "today" for the pickers (never Date.now() in render). */
  today: Date
  saving?: boolean
}) {
  const nextStep = nextStepFor(draft.outcome)
  return (
    <div className={styles.editor} data-testid="contact-editor" data-mode={editing ? 'edit' : 'view'}>
      <div className={styles.fields}>
        <div className={styles.titleRow}>
          <span className={styles.blockTitle}>Contact log</span>
          {editing
            ? <Link variant="primary" onPress={onAutoFill}>Auto Fill</Link>
            : <Link variant="primary" onPress={onEdit}>Edit</Link>}
        </div>

        {editing ? (
          <>
            <ChoiceChips label="Contacted via" options={CONTACT_CHANNELS} value={draft.channel}
                         onChange={(v) => onChange({ channel: v })} error={errors.channel} />
            <div className={styles.fieldPair}>
              <DateTimeField label="When" value={draft.when} today={today}
                             onChange={(v) => onChange({ when: v })} error={errors.when} />
              <TextField label="Outcome" value={draft.outcome} mode="select" options={OUTCOMES}
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
          : <p className={styles.viewBody} data-empty={draft.body.trim() ? undefined : 'true'}>{draft.body.trim() ? draft.body : 'Write a note...'}</p>}
      </div>
      {editing ? <EditorFooter onCancel={onCancel} onSave={onSave} saving={saving} /> : null}
    </div>
  )
}

/** View values read "17 Jul ’26, 3:00 PM" (`displayDateTime`); a saved log always parses — the raw string is the fallback. */
function viewDateTime(input: string): string {
  const d = parseInputDateTime(input)
  return d ? displayDateTime(d) : input
}
