'use client'

import { useEffect, useRef } from 'react'
import { bodyHtml, type NoteDraft } from '@/lib/leads/note-model'
import styles from './note-editor.module.css'

/**
 * Lead Details › Notes — note editor (frames 79 931:44866 empty · 80 931:45013 editing · 82 931:45491 view).
 * Spec: design-source/context/lead-notes/01-layout-list-editor.txt (Pane › Body: editor column p24 g24; footer 68).
 * Title input 20/Bold ("Title" placeholder, secondary) over the body textarea 16/Regular ("Write a note..."), 24 apart;
 * the editor is always live — the footer (Cancel secondary outlined · Save primary) only shows while `dirty`.
 * Textarea = components/leads/move-stage/fields.tsx NotesArea restyled (no box) with a CSS hidden-mirror auto-grow.
 */
export function NoteEditor({
  draft, onChange,
}: {
  draft: NoteDraft
  onChange: (patch: Partial<NoteDraft>) => void
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
    </div>
  )
}

/** Blank = no text and no structural content; the lone <br> contenteditable leaves behind is blank. */
const isBlankHtml = (h: string) =>
  !/<(ul|ol|li|img)/i.test(h) && h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() === ''

/**
 * The note body: "Write a note..." 16/Regular, no visible border, grows with its text.
 * A contenteditable div since REG-252 (user 2026-09-01: "when i edit and try to make a format it doesn't
 * work") — the pane toolbar's bold / italic / underline / lists act on its selection for real, so the body
 * persists as the editor's HTML; a body saved before then is plain text and loads through `bodyHtml`.
 * Uncontrolled while focused (rewriting innerHTML would throw the caret): its own typing round-trips
 * through onChange untouched, and external changes — Cancel, switching notes — land through the effect.
 * Paste is forced to plain text so formatting only ever comes from the toolbar.
 * Shared with the contact editor (spec 02: "the same free text as a note"); the old hidden-mirror
 * auto-grow textarea is retired — a contenteditable grows natively.
 */
export function BodyArea({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const html = bodyHtml(value)
    if (document.activeElement !== el && el.innerHTML !== html) el.innerHTML = html
    el.toggleAttribute('data-empty', isBlankHtml(el.innerHTML))
  }, [value, disabled])
  return (
    <div
      ref={ref}
      className={styles.rich}
      contentEditable={!disabled}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Note"
      /* An invitation to type — a read-only body (a contact log before Edit) shows nothing instead (user 2026-09-01). */
      data-placeholder={disabled ? undefined : 'Write a note...'}
      onInput={(e) => {
        const el = e.currentTarget
        el.toggleAttribute('data-empty', isBlankHtml(el.innerHTML))
        onChange(el.innerHTML)
      }}
      onPaste={(e) => {
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
    />
  )
}

