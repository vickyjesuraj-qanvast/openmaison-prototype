'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { htmlToPlain } from '@/lib/quotes/items-model'
import { isBlankHtml } from '@/lib/quotes/text'
import { RichEditor, type RichEditorHandle } from '../text/rich-editor'
import styles from './items-section.module.css'

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** A plain description as the editor's paragraphs; a line that starts with "• " becomes a list item so old bullets keep their shape. */
function plainToHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let list: string[] = []
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`); list = [] } }
  for (const l of lines) { const m = /^[•\-–*]\s+(.*)$/.exec(l); if (m) list.push(m[1]!); else { flush(); if (l.trim()) out.push(`<p>${escapeHtml(l)}</p>`) } }
  flush()
  return out.join('')
}

/**
 * Expand on an active line (owner 2026-09-16, REG-444: "expand definition was to open in a modal and write the description in a
 * bigger window, maybe our 400 modal window"): the S 400 form dialog titled Description over the line's name, Cancel · Save.
 * (REG-557, the testers' ask) The box is the in-house rich editor the Terms and Notes sections use — bullets, numbered lists,
 * bold, italic, underline — so a line's description and a section's note print with their shape. Save writes both the HTML
 * and its plain text through the row's own patch (autosave, undo); text with no formatting stays plain, as before.
 */
export function DescriptionDialog({ open, name, kind = 'item', value, html, onClose, onSave }: {
  open: boolean
  name: string
  kind?: 'item' | 'section'
  /** The plain description, and the formatted one when the line has it. */
  value: string
  html: string | null | undefined
  onClose: () => void
  onSave: (text: string, html: string | null) => void
}) {
  const [draft, setDraft] = useState(html || plainToHtml(value))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(html || plainToHtml(value)) }   // every opening starts from what the line holds
  const editor = useRef<RichEditorHandle>(null)
  const save = () => {
    const blank = isBlankHtml(draft)
    const text = blank ? '' : htmlToPlain(draft)
    // Plain paragraphs need no HTML: only a description with lists or emphasis keeps its formatted copy.
    const formatted = !blank && /<(ul|ol|li|b|strong|i|em|u|s|strike|a)\b/i.test(draft)
    onSave(text, formatted ? draft : null)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={kind === 'section' ? 'Section note' : 'Description'} subtitle={name || (kind === 'section' ? 'New section' : 'New item')} size="form" width={560} portal
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={save}>Save</Button></>}>
      <div className={styles.descDialogArea}>
        <RichEditor ref={editor} value={draft} onChange={setDraft} placeholder={kind === 'section' ? 'A note printed under the section band' : 'Add a description'} label={kind === 'section' ? 'Section note' : 'Description'} framed minHeight={200} />
      </div>
      <p className={styles.descHint}>{kind === 'section' ? 'Prints under the section band where the template shows section notes.' : 'Bullets, numbers, bold and underline print as you see them here.'}</p>
    </Dialog>
  )
}
