'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { money2 } from '@/lib/quotes/math'
import type { SavedLine, SavedSection } from '@/lib/quotes/items-model'
import type { PriceBookSectionRow } from '@/lib/company/price-book'
import styles from './price-book.module.css'

const blankLine = (): SavedLine => ({ name: '', description: null, descriptionHtml: null, qty: 1, unit: 'Pieces', costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, room: null, category: null, section: null, printAs: null, printAsText: null, highlight: null, icon: null })
const moveIn = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => { const j = i + dir; if (j < 0 || j >= arr.length) return arr; const next = [...arr]; const [x] = next.splice(i, 1); next.splice(j, 0, x as T); return next }
const price = (l: SavedLine) => (l.costMinor + l.markupMinor) / 100
const lineTotal = (l: SavedLine) => Math.round(l.qty * (l.costMinor + l.markupMinor) * (1 - l.discountPct / 100))

/**
 * (REG-594) A saved section, edited outside any quote: its name and description, its lines (name · qty · unit price) and
 * the sub-sections it carries (REG-558), each line movable and removable, a line addable at the end. The unit price typed
 * here lands as cost with the line's markup kept in proportion — the quote's grid remains the place for cost and markup.
 */
export function SectionDialog({ open, section, onClose, onSave }: { open: boolean; section: PriceBookSectionRow | null; onClose: () => void; onSave: (input: { name: string; description: string | null; body: SavedSection }) => void | Promise<void> }) {
  const empty: SavedSection = { name: '', description: null, descriptionHtml: null, lines: [], subs: [] }
  const [body, setBody] = useState<SavedSection>(section?.body ?? empty)
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const [seen, setSeen] = useState(section?.id ?? null)
  if (open !== wasOpen || (section?.id ?? null) !== seen) { setWasOpen(open); setSeen(section?.id ?? null); if (open) { setBody(section?.body ?? empty); setTouched(false) } }
  const nameOk = body.name.trim().length > 0
  const total = body.lines.reduce((s, l) => s + lineTotal(l), 0) + body.subs.reduce((s, g) => s + g.lines.reduce((x, l) => x + lineTotal(l), 0), 0)
  const setLines = (subIndex: number | null, fn: (lines: SavedLine[]) => SavedLine[]) => setBody((b) => (subIndex === null ? { ...b, lines: fn(b.lines) } : { ...b, subs: b.subs.map((g, i) => (i === subIndex ? { ...g, lines: fn(g.lines) } : g)) }))
  const patchLine = (subIndex: number | null, i: number, patch: Partial<SavedLine>) => setLines(subIndex, (ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const setPrice = (subIndex: number | null, i: number, v: string) => {
    const minor = Math.round((Number.parseFloat(v) || 0) * 100)
    setLines(subIndex, (ls) => ls.map((l, k) => { if (k !== i) return l; const share = l.costMinor + l.markupMinor > 0 ? l.markupMinor / (l.costMinor + l.markupMinor) : 0; const markup = Math.round(minor * share); return { ...l, costMinor: minor - markup, markupMinor: markup } }))
  }
  const rows = (subIndex: number | null, lines: SavedLine[]) => (
    <div className={styles.lines}>
      {lines.map((l, i) => (
        <div key={i} className={styles.lineRow} data-testid="section-line">
          <TextField label="Item" size="s" value={l.name} onChange={(v) => patchLine(subIndex, i, { name: v })} maxLength={200} />
          <TextField label="Qty" size="s" numeric="amount" value={String(l.qty)} onChange={(v) => patchLine(subIndex, i, { qty: Number.parseFloat(v) || 0 })} />
          <TextField label={`Unit price${l.unit ? ` / ${l.unit}` : ''}`} size="s" numeric="amount" value={price(l).toFixed(2)} onChange={(v) => setPrice(subIndex, i, v)} />
          <span className={styles.lineTools}>
            <IconButton icon="arrow_upward" label={`Move ${l.name || 'line'} up`} size={24} variant="bare" iconSize={18} disabled={i === 0} onClick={() => setLines(subIndex, (ls) => moveIn(ls, i, -1))} />
            <IconButton icon="arrow_downward" label={`Move ${l.name || 'line'} down`} size={24} variant="bare" iconSize={18} disabled={i === lines.length - 1} onClick={() => setLines(subIndex, (ls) => moveIn(ls, i, 1))} />
            <IconButton icon="close" label={`Remove ${l.name || 'line'}`} size={24} variant="bare" iconSize={18} onClick={() => setLines(subIndex, (ls) => ls.filter((_, k) => k !== i))} />
          </span>
        </div>
      ))}
      <Button appearance="text" className={styles.addLine} iconStart={<Icon name="add" size={18} />} onPress={() => setLines(subIndex, (ls) => [...ls, blankLine()])}>Add a line</Button>
    </div>
  )
  return (
    <Dialog open={open} onClose={onClose} title={section ? 'Edit section' : 'New section'} size="modal" width={800}
            subtitle="Quotes that already carry this section keep their lines; the next insert takes what is here."
            footer={<><span className={styles.muted}>{body.lines.length + body.subs.reduce((n, g) => n + g.lines.length, 0)} lines · {money2(total)}</span><span style={{ flex: 1 }} /><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { setTouched(true); if (!nameOk) return; void onSave({ name: body.name.trim(), description: body.description, body: { ...body, name: body.name.trim(), lines: body.lines.filter((l) => l.name.trim()), subs: body.subs.map((g) => ({ ...g, lines: g.lines.filter((l) => l.name.trim()) })) } }) }}>Save</Button></>}>
      <div className={styles.fields} data-testid="section-dialog">
        <TextField label="Section name" required value={body.name} onChange={(v) => setBody((b) => ({ ...b, name: v }))} maxLength={120} autoFocus error={touched && !nameOk ? 'Give the section a name' : undefined} />
        <TextArea label="Description" value={body.description ?? ''} onChange={(v: string) => setBody((b) => ({ ...b, description: v || null }))} maxLength={2000} />
        <span className={styles.eyebrow}>Lines</span>
        {rows(null, body.lines)}
        {body.subs.map((g, gi) => (
          <div key={gi}>
            <div className={styles.subHead}>
              <TextField label="Sub-section" size="s" value={g.name} onChange={(v) => setBody((b) => ({ ...b, subs: b.subs.map((x, i) => (i === gi ? { ...x, name: v } : x)) }))} maxLength={120} />
              <IconButton icon="close" label={`Remove sub-section ${g.name}`} size={24} variant="bare" iconSize={18} onClick={() => setBody((b) => ({ ...b, subs: b.subs.filter((_, i) => i !== gi) }))} />
            </div>
            <div className={styles.subLines}>{rows(gi, g.lines)}</div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
