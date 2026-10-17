'use client'

import { useState, type MouseEvent } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { money2 } from '@/lib/quotes/math'
import type { PriceBookItem, QuoteItem } from '@/lib/db/schema'
import { marginAfter, matchLines, priceGapSaid, startsTicked, unitPriceOf, type BookEntry, type LineMatch } from '@/lib/company/price-book-match'
import styles from './match-book-dialog.module.css'

/** The review's reading of the quote: the lines that match an item, and the ones not in My Items (one per name and vendor — a name twice is one item). */
export type BookPlan = { matches: (LineMatch & { item: BookEntry; line: QuoteItem })[]; fresh: QuoteItem[] }
const entryOf = (p: PriceBookItem): BookEntry => ({ id: p.id, name: p.name, description: p.description, category: p.category, unit: p.unit, costMinor: p.costMinor, markupMinor: p.markupMinor, vendor: p.vendor, link: p.link, kind: p.kind, status: p.status })
/* one entries array per book the editor holds — the matcher keeps its reading of the book per array (a cell edit never reads the book again) */
const ENTRIES = new WeakMap<PriceBookItem[], BookEntry[]>()
const entriesOf = (book: PriceBookItem[]) => { let e = ENTRIES.get(book); if (!e) { e = book.map(entryOf); ENTRIES.set(book, e) } return e }
/** (pending modules S12) What the review would offer for these lines and this book — the editor's link and Maison AI count with it. */
export function planBookMatches(items: QuoteItem[], book: PriceBookItem[]): BookPlan {
  const read = matchLines(items, entriesOf(book))
  const matches: BookPlan['matches'] = []
  const fresh: QuoteItem[] = []
  const seen = new Set<string>()
  /* (S42 B-14) a line that came from My Sections is the book's already: never "not in My Items yet" — its section is one (the section row
     keeps the saved section's id, REG-594) */
  const byId = new Map(items.map((i) => [i.id, i]))
  const fromSection = (line: QuoteItem) => { let p = line.parentId ? byId.get(line.parentId) : undefined; while (p) { if (p.kind === 'group' && p.priceBookItemId) return true; p = p.parentId ? byId.get(p.parentId) : undefined } return false }
  for (const m of read) {
    const line = items.find((i) => i.id === m.lineId)
    if (!line) continue
    /* (S42 B-14) a match that would change nothing — the item's cost is already the line's — is no suggestion */
    if (m.item && m.item.costMinor === line.costMinor) continue
    if (m.item) { matches.push({ ...m, item: m.item, line }); continue }
    if (fromSection(line)) continue
    const key = `${line.name.trim().toLowerCase()}|${(line.vendor ?? '').trim().toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key); fresh.push(line)
  }
  return { matches, fresh }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const per = (unit: string | null) => (unit ? ` a ${unit.toLowerCase() === 'pieces' ? 'piece' : unit}` : '')

/**
 * (pending modules S12 — card held:price-book, 1.0's *Auto-Match to Price Book* review and its "add to the price book" suggestions after a parse)
 * **Match lines**: the quote's lines not taken from My Items, each beside the item it reads like (lib/company/price-book-match.ts — 1.0's
 * rule). A ticked match takes the item's cost and points at it; the client's price stays (the margin it leaves is said, red below cost). A
 * close match far off in price starts unticked and says how far; one that would sell the line below its cost starts unticked too. The lines no item matches can be added to My Items — proposed, for a member
 * who doesn't run the book (REG-652). The plan is read once on opening, so nothing moves while the member ticks. The house Dialog (a bottom
 * sheet on a phone) on the Order from the quote list. Closes once the server has written it; the section's snackbar carries Undo.
 */
export function MatchBookDialog({ open, items, book, runsBook, busy, onClose, onApply, costs = true }: {
  open: boolean
  /** (pending modules S41b-1) the member sees costs — else a match says the item's price, never its cost or the margin it leaves; the server
      writes the item's cost on the line all the same (lib/quotes/book-fill.ts) */
  costs?: boolean
  items: QuoteItem[]
  /** the items this member may pick (the editor's) */ book: PriceBookItem[]
  /** whether this member's new items join the book (else they're proposed) */ runsBook: boolean
  busy: boolean
  onClose: () => void
  onApply: (o: { matches: { lineId: string; itemId: string }[]; add: string[] }) => void
}) {
  const [plan, setPlan] = useState<BookPlan>({ matches: [], fresh: [] })
  const [ticked, setTicked] = useState<Set<string>>(() => new Set())
  const [adding, setAdding] = useState<Set<string>>(() => new Set())
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { const p = planBookMatches(items, book); setPlan(p); setTicked(new Set(p.matches.filter((x) => startsTicked(x, x.line)).map((x) => x.lineId))); setAdding(new Set()) }
  }
  const flip = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n }
  const n = plan.matches.filter((m) => ticked.has(m.lineId)).length
  const m = plan.fresh.filter((l) => adding.has(l.id)).length
  const addWord = runsBook ? 'add' : 'propose'
  const label = busy ? 'Matching…' : n && m ? `Match ${n} · ${addWord} ${m}` : n ? `Match ${plural(n, 'line', 'lines')}` : m ? (runsBook ? `Add ${m} to My Items` : `Propose ${m} for My Items`) : 'Match lines'
  const apply = () => { if (!busy && (n || m)) onApply({ matches: plan.matches.filter((x) => ticked.has(x.lineId)).map((x) => ({ lineId: x.lineId, itemId: x.item.id })), add: plan.fresh.filter((l) => adding.has(l.id)).map((l) => l.id) }) }
  const onRow = (fn: () => void) => (e: MouseEvent) => { if ((e.target as HTMLElement).closest('label, input, button, a')) return; fn() }
  const allMatches = plan.matches.length > 0 && plan.matches.every((x) => ticked.has(x.lineId))
  const allFresh = plan.fresh.length > 0 && plan.fresh.every((l) => adding.has(l.id))
  return (
    <Dialog open={open} onClose={onClose} title="Match lines to the Price book" size="modal" width={800} portal
            subtitle={`Lines not taken from My Items, each beside the item it reads like. ${costs ? 'A ticked line takes the item’s cost' : 'A ticked line is linked to its item, so the studio knows what it costs'} — the client’s price stays as it is.${plan.fresh.length ? runsBook ? ' A line not in My Items can be added to it.' : ' A line not in My Items can be proposed for it — an Owner or an Admin approves it.' : ''}`}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={apply} isDisabled={busy || !(n || m)} data-testid="match-apply">{label}</Button></>}>
      <div className={styles.body} data-testid="match-dialog">
        {!plan.matches.length && !plan.fresh.length ? (
          <div className={styles.empty} role="status">
            <span className={styles.emptyGlyph} aria-hidden><Icon name="list_alt" size={40} weight={300} /></span>
            <span className={styles.emptyTitle}>Every priced line is from My Items</span>
            <span className={styles.emptyHelp}>Lines added from the Price book already carry its cost.</span>
          </div>
        ) : (
          <div className={styles.list} role="list" aria-label="The quote’s lines and the Price book">
            {plan.matches.length ? (
              <div role="presentation">
                <div className={styles.groupHead} role="presentation">
                  <Checkbox isSelected={allMatches} isIndeterminate={!allMatches && plan.matches.some((x) => ticked.has(x.lineId))} onChange={() => setTicked(allMatches ? new Set() : new Set(plan.matches.map((x) => x.lineId)))} aria-label="Tick every match" />
                  <span>{`In My Items (${plan.matches.length})`}</span>
                </div>
                {plan.matches.map((x) => {
                  const on = ticked.has(x.lineId)
                  const margin = costs ? marginAfter(x.line, x.item) : null   // (pending modules S41b-1)
                  const gap = priceGapSaid(x) && x.gapPct !== null ? ` · priced ${Math.abs(Math.round(x.gapPct))}% ${x.gapPct > 0 ? 'above' : 'below'} it` : ''
                  return (
                    <div key={x.lineId} className={styles.row} role="listitem" data-selected={on || undefined} data-testid="match-row" data-line={x.lineId} data-tier={x.tier} onClick={onRow(() => setTicked((s) => flip(s, x.lineId)))}>
                      <Checkbox isSelected={on} onChange={() => setTicked((s) => flip(s, x.lineId))} aria-label={`Match ${x.line.name} to ${x.item.name}`} />
                      <span className={styles.text}>
                        <span className={styles.name}>{x.line.name}{x.tier === 'close' ? <MetaChip>Close match</MetaChip> : null}</span>
                        <span className={styles.meta}>{`My Items: ${x.item.name}${x.item.vendor ? ` · by ${x.item.vendor}` : ''}`}</span>
                        <span className={styles.meta}>{costs ? `Cost ${money2(x.item.costMinor)}${per(x.item.unit)}${gap}` : `Sells for ${money2(unitPriceOf(x.item))}${per(x.item.unit)}${gap}`}</span>
                      </span>
                      <span className={styles.price} data-tone={margin !== null && margin < 0 ? 'below' : undefined}>{margin === null ? '' : margin < 0 ? 'Below cost' : `${margin}% margin`}</span>
                    </div>
                  )
                })}
              </div>
            ) : null}
            {plan.fresh.length ? (
              <div role="presentation">
                <div className={styles.groupHead} role="presentation">
                  <Checkbox isSelected={allFresh} isIndeterminate={!allFresh && plan.fresh.some((l) => adding.has(l.id))} onChange={() => setAdding(allFresh ? new Set() : new Set(plan.fresh.map((l) => l.id)))} aria-label={runsBook ? 'Tick every line to add to My Items' : 'Tick every line to propose for My Items'} />
                  <span>{`Not in My Items yet (${plan.fresh.length})`}</span>
                </div>
                {plan.fresh.map((l) => {
                  const on = adding.has(l.id)
                  return (
                    <div key={l.id} className={styles.row} role="listitem" data-selected={on || undefined} data-testid="fresh-row" data-line={l.id} onClick={onRow(() => setAdding((s) => flip(s, l.id)))}>
                      <Checkbox isSelected={on} onChange={() => setAdding((s) => flip(s, l.id))} aria-label={`${runsBook ? 'Add' : 'Propose'} ${l.name} ${runsBook ? 'to' : 'for'} My Items`} />
                      <span className={styles.text}>
                        <span className={styles.name}>{l.name}</span>
                        <span className={styles.meta}>{`${money2(unitPriceOf(l))}${per(l.unit)}${l.category ? ` · ${l.category}` : ''}${l.vendor ? ` · by ${l.vendor}` : ''}`}</span>
                      </span>
                      <span className={styles.price} />
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Dialog>
  )
}
