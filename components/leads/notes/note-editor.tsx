'use client'

import { Button } from '@/components/ds'
import type { NoteDraft } from '@/lib/leads/note-model'
import styles from './note-editor.module.css'

/**
 * Lead Details › Notes — note editor (frames 79 931:44866 empty · 80 931:45013 editing · 82 931:45491 view).
 * Spec: design-source/context/lead-notes/01-layout-list-editor.txt (Pane › Body: editor column p24 g24; footer 68).
 * Title input 20/Bold ("Title" placeholder, secondary) over the body textarea 16/Regular ("Write a note..."), 24 apart;
 * the editor is always live — the footer (Cancel secondary outlined · Save primary) only shows while `dirty`.
 * Textarea = components/leads/move-stage/fields.tsx NotesArea restyled (no box) with a CSS hidden-mirror auto-grow.
 */
export function NoteEditor({
  draft, onChange, dirty, onCancel, onSave, saving,
}: {
  draft: NoteDraft
  onChange: (patch: Partial<NoteDraft>) => void
  dirty: boolean
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  return (
    <div className={styles.editor} data-testid="note-editor">
      <div className={styles.fields}>
        {/* The editor only exists because the user asked to write something, so it opens with the caret already in
            the title — nobody should have to hunt for the field and click it first (user 2026-08-31). */}
        <input
          className={styles.title}
          value={draft.title}
          placeholder="Title"
          aria-label="Title"
          autoFocus
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <BodyArea value={draft.body} onChange={(v) => onChange({ body: v })} />
      </div>
      {dirty ? <EditorFooter onCancel={onCancel} onSave={onSave} saving={saving} /> : null}
    </div>
  )
}

/**
 * The note body: "Write a note..." 16/Regular, no visible border, grows with its text.
 * Auto-grow is the hidden-mirror trick (note-editor.module.css `.grow::after` repeats `data-value` in the same font under
 * the textarea) — pure CSS from a data attribute, so no measuring effect and no setState; `field-sizing: content` was not
 * used because it is Chromium-only. Shared with the contact editor (spec 02: "the same free text as a note").
 */
export function BodyArea({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={styles.grow} data-value={value}>
      <textarea
        className={styles.body}
        rows={1}
        placeholder="Write a note..."
        aria-label="Note"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Footer (frame 80): "Cancel" secondary outlined 80×36 · "Save" primary filled 65×36, right-aligned, 12 apart, top rule. */
export function EditorFooter({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving?: boolean }) {
  return (
    <div className={styles.footer}>
      <Button variant="secondary" appearance="outlined" onPress={onCancel} isDisabled={saving}>Cancel</Button>
      <Button onPress={onSave} isDisabled={saving}>Save</Button>
    </div>
  )
}
