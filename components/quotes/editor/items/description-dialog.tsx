'use client'

import { createContext, useContext, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { WritingHelp } from '@/components/writing/writing-help'
import { descriptionSources, sectionNoteSources, type BookWords } from '@/lib/writing/sources'
import { keptText, nameFromHtml, narrowNameHtml, plainToHtml } from '@/lib/quotes/items-model'
import { kitTextColors } from '@/lib/templates/kit-html'
import { sanitizeRichHtml } from '@/lib/rich-html'
import type { ItemPatch } from '@/app/quotes/items-actions'
import { isBlankHtml } from '@/lib/quotes/text'
import { RichEditor, type RichEditorHandle } from '../text/rich-editor'
import styles from './items-section.module.css'


/** (pending modules S29) My Items' words, for the writing help's Use My Items' words / Add what's missing on a line (the Items section provides
    the live items it holds; never their cost). */
export const WritingBookContext = createContext<readonly BookWords[]>([])

/* (S44I — call C2) the brand kit's text colours (`kitTextColors`) live in lib/templates/kit-html.ts — one list with the template editor's Text block (S44G) */

/**
 * Expand on an active line (owner 2026-09-16, REG-444: "expand definition was to open in a modal and write the description in a
 * bigger window, maybe our 400 modal window"): the S 400 form dialog titled Description over the line's name, Cancel · Save.
 * (REG-557, the testers' ask) The box is the in-house rich editor the Terms and Notes sections use — bullets, numbered lists,
 * bold, italic, underline — so a line's description and a section's note print with their shape. Save writes both the HTML
 * and its plain text through the row's own patch (autosave, undo); text with no formatting stays plain, as before.
 * (S44I — call C2 as recommended, his ask 2026-10-15) On a line it is *Words on this line*: the name above — bold, italic, underline,
 * strike and line breaks — the description below, each with the brand kit's text colours (no free hex; REVERSES REG-557's "no colour
 * inside text"). The plain name stays the line's name for search, the X-Ray and exports. (M3) A description keeps its paragraphs, blank
 * lines and alignment. Nothing changed, nothing is written.
 */
export function DescriptionDialog({ open, name, nameHtml = null, kind = 'item', value, html, onClose, onSave, tradeNote, nested = false, line, brandColors }: {
  open: boolean
  name: string
  /** (S44I — call C2) the name's formatted copy, when it has one */
  nameHtml?: string | null
  kind?: 'item' | 'section'
  /** The plain description, and the formatted one when the line has it. */
  value: string
  html: string | null | undefined
  onClose: () => void
  /** What changed, as a row patch: the description (text + HTML) and, on a line, the name (text + HTML). */
  onSave: (patch: ItemPatch) => void
  /** (REG-617, parity Q-08) The note the section's trade carries in Settings › Quotes — printed while this one is empty. */
  tradeNote?: string
  /** (REG-617) Opened from the phone's line sheet: the lighter scrim, stacked above the sheet. */
  nested?: boolean
  /** (pending modules S29) The line's own My Items item and trade — where the writing help looks for its words. */
  line?: { priceBookItemId?: string | null; category?: string | null }
  /** (S44I — call C2) the brand kit's colours by key — the colour tool's swatches */
  brandColors?: Record<string, string>
}) {
  const book = useContext(WritingBookContext)
  const startDesc = () => html || plainToHtml(value)
  const startName = () => nameHtml || escapeText(name)
  const [draft, setDraft] = useState(startDesc)
  const [nameDraft, setNameDraft] = useState(startName)
  const [first, setFirst] = useState(() => ({ desc: startDesc(), name: startName() }))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { const d = startDesc(), n = startName(); setDraft(d); setNameDraft(n); setFirst({ desc: d, name: n }) } }   // every opening starts from what the line holds
  const editor = useRef<RichEditorHandle>(null)
  const colors = kitTextColors(brandColors)
  const isLine = kind === 'item'
  const save = () => {
    const patch: ItemPatch = {}
    if (draft !== first.desc) {
      // Plain paragraphs need no HTML: only a description with lists, emphasis or a shape plain words can't hold keeps its formatted copy.
      const kept = keptText(draft, isBlankHtml(draft))
      if (kept.text !== value || kept.html !== (html ?? null)) { patch.description = kept.text; patch.descriptionHtml = kept.html }
    }
    if (isLine && nameDraft !== first.name) {
      const narrowed = narrowNameHtml(sanitizeRichHtml(nameDraft))
      const plain = nameFromHtml(nameDraft) || 'Item'
      if (plain !== name || narrowed !== (nameHtml ?? null)) { patch.name = plain; patch.nameHtml = narrowed }
    }
    if (Object.keys(patch).length) onSave(patch)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={kind === 'section' ? 'Section note' : 'Words on this line'} subtitle={kind === 'section' ? name || 'New section' : undefined} size="form" width={600} portal nested={nested}
            footer={<>
              {/* (pending modules S29 — card api:ai-writing-help-quotes) the writing help on the words in this box: Improve · Shorten · Plain English, and
                  My Items' words for the line (a section: its trade's note) — each a proposal first; the box takes them, Save keeps them */}
              <FootStart>
                <WritingHelp label={kind === 'section' ? 'Section note' : 'Description'} subject={name || undefined} kind={kind === 'section' ? 'section-note' : 'description'} nested menuAlign="left" testId="description-writing"
                             sources={() => (kind === 'section' ? sectionNoteSources(tradeNote) : descriptionSources({ name, priceBookItemId: line?.priceBookItemId, category: line?.category }, book))}
                             read={() => ({ html: draft })} apply={(h) => { setDraft(h); editor.current?.replace(h) }} />
              </FootStart>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={save}>Save</Button>
            </>}>
      {isLine ? (
        <div className={styles.descDialogArea} data-testid="words-name">
          <span className={styles.descDialogLabel}>Name</span>
          <RichEditor value={nameDraft} onChange={setNameDraft} placeholder="Type item name" label="Name" framed minHeight={56} tools="inline" colors={colors} />
        </div>
      ) : null}
      <div className={styles.descDialogArea} data-testid="words-description">
        {isLine ? <span className={styles.descDialogLabel}>Description</span> : null}
        <RichEditor ref={editor} value={draft} onChange={setDraft} placeholder={kind === 'section' ? 'A note printed under the section band' : 'Add a description'} label={kind === 'section' ? 'Section note' : 'Description'} framed minHeight={isLine ? 160 : 200} colors={colors} pictures={kind === 'section'} />
      </div>
      <p className={styles.descHint}>{kind === 'section' ? 'Prints under the section band where the template shows section notes.' : 'Bold, colours, line breaks, bullets and numbers print as you see them here. Search and exports read the name’s plain words.'}</p>
      {kind === 'section' && tradeNote && isBlankHtml(draft) ? <p className={styles.descHint} data-testid="trade-note-hint">Left empty, this section prints its trade’s note from Settings › Quotes & pricing: “{tradeNote}”</p> : null}
    </Dialog>
  )
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
