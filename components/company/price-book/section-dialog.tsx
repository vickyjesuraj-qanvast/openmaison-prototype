'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { MSG } from '@/lib/forms'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { money2 } from '@/lib/quotes/math'
import { UNITS, keptText, plainToHtml, type SavedLine, type SavedSection } from '@/lib/quotes/items-model'
import { isBlankHtml } from '@/lib/quotes/text'
import { RichEditor } from '@/components/quotes/editor/text/rich-editor'
import type { PriceBookSectionRow } from '@/lib/company/price-book'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import { cleanSectionTags } from '@/lib/quotes/items-model'
import styles from './price-book.module.css'

const blankLine = (): SavedLine => ({ name: '', description: null, descriptionHtml: null, qty: 1, unit: 'Pieces', costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, room: null, category: null, section: null, printAs: null, printAsText: null, highlight: null, icon: null })
const moveIn = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => { const j = i + dir; if (j < 0 || j >= arr.length) return arr; const next = [...arr]; const [x] = next.splice(i, 1); next.splice(j, 0, x as T); return next }
const price = (l: SavedLine) => (l.costMinor + l.markupMinor) / 100
const lineTotal = (l: SavedLine) => Math.round(l.qty * (l.costMinor + l.markupMinor) * (1 - l.discountPct / 100))

/**
 * (REG-594) A saved section, edited outside any quote: its name and description, its lines (name · qty · unit price) and
 * the sub-sections it carries (REG-558), each line movable and removable, a line addable at the end. The unit price typed
 * here lands as cost with the line's markup kept in proportion — the quote's grid remains the place for cost and markup.
 * (REG-653, price book parity Q-10) The note is edited as it prints (the house rich editor), sub-sections can be added, each line shows
 * its unit; a new section is written only on Save; a line's hidden, optional, one-line and rebate marks ride along untouched.
 */
export function SectionDialog({ open, section, onClose, onSave, readOnly = null }: { open: boolean; section: PriceBookSectionRow | null; onClose: () => void; onSave: (input: { name: string; description: string | null; descriptionHtml: string | null; body: SavedSection; propertyType: string | null; tags: string[] }) => void | Promise<void>; /** (REG-652) why the viewer may only read it */ readOnly?: string | null }) {
  const empty: SavedSection = { name: '', description: null, descriptionHtml: null, lines: [], subs: [] }
  const [body, setBody] = useState<SavedSection>(section?.body ?? empty)
  const [note, setNote] = useState(() => section?.body?.descriptionHtml || plainToHtml(section?.body?.description ?? ''))
  const [touched, setTouched] = useState(false)
  /* (REG-619, parity Q-27) What the section suits and how the studio finds it: a property type and a few tags. */
  const [propertyType, setPropertyType] = useState<string | null>(section?.propertyType ?? null)
  const [tagsText, setTagsText] = useState((section?.tagList ?? []).join(', '))
  const [wasOpen, setWasOpen] = useState(open)
  const [seen, setSeen] = useState(section?.id ?? null)
  if (open !== wasOpen || (section?.id ?? null) !== seen) { setWasOpen(open); setSeen(section?.id ?? null); if (open) { setBody(section?.body ?? empty); setNote(section?.body?.descriptionHtml || plainToHtml(section?.body?.description ?? '')); setTouched(false); setPropertyType(section?.propertyType ?? null); setTagsText((section?.tagList ?? []).join(', ')) } }
  const nameOk = body.name.trim().length > 0
  const snackbar = useSnackbar()
  const [busy, setBusy] = useState(false)
  /* (sweep S5 #14) An item with a price and no name is not dropped in silence: it asks for its name; a wholly blank row is just an empty row. */
  const nameless = (l: SavedLine) => !l.name.trim() && (l.costMinor + l.markupMinor > 0 || !!l.description)
  /* (sweep S5 #19) A removed item comes back with Undo — at its place, in its sub-section. */
  const removeLine = (subIndex: number | null, i: number, l: SavedLine) => {
    setLines(subIndex, (ls) => ls.filter((_, k) => k !== i))
    snackbar({ message: `${l.name.trim() || 'Item'} removed`, actionLabel: 'Undo', onAction: () => setLines(subIndex, (ls) => [...ls.slice(0, i), l, ...ls.slice(i)]) })
  }
  const total = body.lines.reduce((s, l) => s + lineTotal(l), 0) + body.subs.reduce((s, g) => s + g.lines.reduce((x, l) => x + lineTotal(l), 0), 0)
  const setLines = (subIndex: number | null, fn: (lines: SavedLine[]) => SavedLine[]) => setBody((b) => (subIndex === null ? { ...b, lines: fn(b.lines) } : { ...b, subs: b.subs.map((g, i) => (i === subIndex ? { ...g, lines: fn(g.lines) } : g)) }))
  const patchLine = (subIndex: number | null, i: number, patch: Partial<SavedLine>) => setLines(subIndex, (ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  /* (REG-651, price book parity Q-01) A box being typed in keeps the typed text — "12.", "4360" — and the line takes its value; the
     formatted figure returns when the box is left. */
  const [typing, setTyping] = useState<{ key: string; text: string } | null>(null)
  const shown = (key: string, formatted: string) => (typing?.key === key ? typing.text : formatted)
  const setPrice = (subIndex: number | null, i: number, v: string) => {
    const minor = Math.round((Number(v) || 0) * 100)
    setLines(subIndex, (ls) => ls.map((l, k) => { if (k !== i) return l; const share = l.costMinor + l.markupMinor > 0 ? l.markupMinor / (l.costMinor + l.markupMinor) : 0; const markup = Math.round(minor * share); return { ...l, costMinor: minor - markup, markupMinor: markup } }))
  }
  const rows = (subIndex: number | null, lines: SavedLine[]) => (
    <div className={styles.lines}>
      {lines.map((l, i) => (
        <div key={i} className={styles.lineRow} data-testid="section-line">
          <TextField label="Item" size="s" value={l.name} onChange={(v) => patchLine(subIndex, i, { name: v })} maxLength={200} error={touched && nameless(l) ? 'Name the item or remove it' : undefined} />
          <TextField label="Qty" size="s" numeric="decimal" value={shown(`${subIndex}:${i}:q`, String(l.qty))} onBlur={() => setTyping(null)}
                     onChange={(v) => { setTyping({ key: `${subIndex}:${i}:q`, text: v }); patchLine(subIndex, i, { qty: Number(v) || 0 }) }} />
          <TextField label="Unit" size="s" mode="select" options={l.unit && !(UNITS as readonly string[]).includes(l.unit) ? [l.unit, ...UNITS] : [...UNITS]} value={l.unit ?? 'Pieces'} onChange={(v) => patchLine(subIndex, i, { unit: v })} />   {/* (REG-653, Q-10 · E-71) */}
          <TextField label="Unit price" size="s" numeric="money" value={shown(`${subIndex}:${i}:p`, price(l).toFixed(2))} onBlur={() => setTyping(null)}
                     onChange={(v) => { setTyping({ key: `${subIndex}:${i}:p`, text: v }); setPrice(subIndex, i, v) }} />
          {readOnly ? null : <span className={styles.lineTools}>
            <Tooltip label="Move up"><IconButton icon="arrow_upward" label={`Move ${l.name || 'item'} up`} size={36} variant="bare" iconSize={18} disabled={i === 0} onClick={() => setLines(subIndex, (ls) => moveIn(ls, i, -1))} /></Tooltip>
            <Tooltip label="Move down"><IconButton icon="arrow_downward" label={`Move ${l.name || 'item'} down`} size={36} variant="bare" iconSize={18} disabled={i === lines.length - 1} onClick={() => setLines(subIndex, (ls) => moveIn(ls, i, 1))} /></Tooltip>
            <Tooltip label="Remove"><IconButton icon="close" label={`Remove ${l.name || 'item'}`} size={36} variant="bare" iconSize={18} onClick={() => removeLine(subIndex, i, l)} /></Tooltip>
          </span>}
        </div>
      ))}
      {readOnly ? null : <Button appearance="text" className={styles.addLine} iconStart={<Icon name="add" size={18} />} onPress={() => setLines(subIndex, (ls) => [...ls, blankLine()])}>Add an item</Button>}
    </div>
  )
  const named = (ls: SavedLine[]) => ls.filter((l) => l.name.trim()).length
  const count = named(body.lines) + body.subs.reduce((n, g) => n + named(g.lines), 0)   // (sweep S5 #14) what Save keeps
  const summary = <span className={styles.muted}>{count} {count === 1 ? 'item' : 'items'} · {money2(total)}</span>   /* (REG-653, Q-18) "items", as the card says */
  const save = async () => {
    setTouched(true); if (!nameOk || busy) return
    if ([...body.lines, ...body.subs.flatMap((g) => g.lines)].some(nameless)) return
    const kept = keptText(note, isBlankHtml(note))
    setBusy(true)
    try { await onSave({ name: body.name.trim(), description: kept.text || null, descriptionHtml: kept.html, propertyType, tags: cleanSectionTags(tagsText.split(',')), body: { ...body, name: body.name.trim(), description: kept.text || null, descriptionHtml: kept.html, lines: body.lines.filter((l) => l.name.trim()), subs: body.subs.map((g) => ({ ...g, lines: g.lines.filter((l) => l.name.trim()) })) } }) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title={readOnly ? 'Section details' : section ? 'Edit section' : 'New section'} size="modal" width={800}
            subtitle={readOnly ? undefined : section ? 'Quotes that already carry this section keep their lines; the next insert takes what is here.' : 'Its lines land together when a quote picks it from My Sections.'}
            footer={readOnly ? <>{summary}<span style={{ flex: 1 }} /><Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button></>
              : <>{summary}<span style={{ flex: 1 }} /><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={busy} onPress={() => { void save() }}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={styles.fields} data-testid="section-dialog">
        {readOnly ? <ReadOnlyNote text={`${readOnly}. You can add it to your quotes.`} /> : null}
        <ReadOnlyScope readOnly={!!readOnly}>
        <TextField label="Section name" required value={body.name} onChange={(v) => setBody((b) => ({ ...b, name: v }))} maxLength={120} autoFocus={!readOnly && !section} error={touched && !nameOk ? MSG.required : undefined} />   {/* (sweep S5 #18 · #24) */}
        {/* (sweep S5 #20) read-only, the note keeps its shape */}
        {readOnly ? <div className={styles.richBox}><span className={styles.eyebrow}>Section note</span>{isBlankHtml(note) ? <span className={styles.muted}>No note</span> : <div className={styles.richRead} dangerouslySetInnerHTML={{ __html: note }} />}</div>
          : <div className={styles.richBox}><span className={styles.eyebrow}>Section note</span><RichEditor value={note} onChange={setNote} placeholder="A note printed under the section band — bullets and bold print as you see them" label="Section note" framed minHeight={80} /></div>}
        <div className={styles.pair}>
          <TextField label="Property type" mode="select" value={propertyType ?? 'Any property'} options={['Any property', ...PROPERTY_TYPES]} onChange={(v) => setPropertyType(v === 'Any property' ? null : v)}
                     helper="A quote for another property type lists it under Show all." />
          <TextField label="Tags" value={tagsText} onChange={setTagsText} maxLength={240} helper="Words to find it by, separated by commas — e.g. Kitchen, Premium." />
        </div>
        <span className={styles.eyebrow}>Items</span>   {/* (sweep S5 #31) one word — "items", as the card and the list count them */}
        {rows(null, body.lines)}
        {body.subs.map((g, gi) => (
          <div key={gi}>
            <div className={styles.subHead}>
              <TextField label="Sub-section" size="s" value={g.name} onChange={(v) => setBody((b) => ({ ...b, subs: b.subs.map((x, i) => (i === gi ? { ...x, name: v } : x)) }))} maxLength={120} />
              {readOnly ? null : <IconButton icon="close" label={`Remove sub-section ${g.name}`} size={24} variant="bare" iconSize={18} onClick={() => setBody((b) => ({ ...b, subs: b.subs.filter((_, i) => i !== gi) }))} />}
            </div>
            <div className={styles.subLines}>{rows(gi, g.lines)}</div>
          </div>
        ))}
        {readOnly ? null : <Button appearance="text" className={styles.addLine} iconStart={<Icon name="create_new_folder" size={18} />} onPress={() => setBody((b) => ({ ...b, subs: [...b.subs, { name: 'Sub-section', description: null, descriptionHtml: null, lines: [blankLine()] }] }))}>Add a sub-section</Button>}   {/* (REG-653, Q-10 · E-71) */}
        </ReadOnlyScope>
      </div>
    </Dialog>
  )
}
