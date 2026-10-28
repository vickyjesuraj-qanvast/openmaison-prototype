'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { MSG } from '@/lib/forms'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { RichEditor } from '@/components/quotes/editor/text/rich-editor'
import { WritingHelp } from '@/components/writing/writing-help'
import { isBlankHtml } from '@/lib/quotes/text'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { money2, pct } from '@/lib/quotes/math'
import { ITEM_KINDS, ITEM_KIND_LABEL, UNITS, cleanLink, isItemKind, keptText, plainToHtml } from '@/lib/quotes/items-model'
import { ago } from '@/lib/templates/ago'
import { CHANGE_WORD, changeLine, type ItemChange } from '@/lib/company/price-book-changes'
import type { PriceBookItem } from '@/lib/db/schema'
import { listItemHistory, type PriceBookItemInput } from '@/app/company/price-book-actions'
import { ProposalBar } from './proposal-bar'
import { VendorNameField } from '@/components/finance/vendor-name-field'
import { useVendorDirectory } from '@/components/finance/use-vendor-directory'
import { spellVendor } from '@/lib/finance/model'
import { WASTE_MAX, cleanWaste, orderedQty } from '@/lib/company/price-book-waste'
import styles from './price-book.module.css'
import { sanitizeRichHtml } from '@/lib/rich-html'   // (S44Q, triage §12.1) the saved words drawn through the house allowlist
import { moneyTyped } from '@/lib/format'
import { TRADES_RULE } from '@/lib/settings/trades'
import { NewCategoryDialog } from './new-category-dialog'
import { NewUnitDialog } from './new-unit-dialog'   // (S44I — M9)
import { HowItWorks } from './how-it-works'
import { UNITS_RULE } from '@/lib/settings/units'

type Draft = { name: string; description: string; html: string; kind: string; unit: string; cost: string; markup: string; /** (S44P, M8) the unit price as typed — cost + markup */ price: string; category: string; vendor: string; link: string; thumb: string | null; waste: string }
const toDraft = (i: PriceBookItem | null): Draft => ({ name: i?.name ?? '', description: i?.description ?? '', html: i?.descriptionHtml || plainToHtml(i?.description ?? ''), kind: ITEM_KIND_LABEL[isItemKind(i?.kind) ? i.kind : 'purchase'], unit: i?.unit ?? 'Pieces', cost: i ? (i.costMinor / 100).toFixed(2) : '', markup: i ? (i.markupMinor / 100).toFixed(2) : '', price: i ? ((i.costMinor + i.markupMinor) / 100).toFixed(2) : '', category: i?.category ?? '', vendor: i?.vendor ?? '', link: i?.link ?? '', thumb: i?.thumb ?? null, waste: i?.wastePct ? String(i.wastePct) : '' })
const toMinor = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }   // (REG-651) dollars and cents, as typed
const fmt = (minor: number) => (minor / 100).toFixed(2)
/** (S44P, M8 — rows 346 · 347) A markup as typed may carry a minus — an item sold under its cost; dollars and cents after it (REG-651). */
const signedMoney = (raw: string) => `${/^\s*[-−–]/.test(raw) ? '-' : ''}${moneyTyped(raw)}`
const kindOf = (label: string) => ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === label) ?? 'purchase'
const HISTORY_SHOWN = 6
/** (the calm UI build 2026-10-27, the UI audit's 4-40) what the item dialog's field helpers said, behind "How the Price book works". */
const HOW_ITEMS = [
  'Lines already on a quote keep what they copied; new picks take these values.',
  'The unit price is what a quote line starts at.',
  'Units and trades are the studio’s own lists — Settings › Quotes & pricing. “New unit…” and “New trade…” at the foot of each list add one.',
  'Vendor: who supplies it — the same product from two vendors is two items. Vendors come from Company › Finance › Vendors.',
  'Waste (a Purchase item): ordered on top of the quote’s quantity, for cuts and breakage.',
  'Website link: a product or spec page — the line keeps it; it never prints.',
  'A photo shows on the card and in the Add Item box, and goes onto every line picked from it.',
]
/** (Dane UAT 3.10) The item changed under the open dialog (a Bring back, its Undo): each box the member left alone follows the item; a box
    they typed in keeps what they typed. */
const follow = (cur: Draft, was: Draft, next: Draft): Draft => {
  const out = { ...cur }
  for (const k of Object.keys(next) as (keyof Draft)[]) if (cur[k] === was[k]) (out as Record<keyof Draft, unknown>)[k] = next[k]
  /* (S44P, M8) the three prices stay in step: a cost or markup that followed moves the unit price with it */
  if ((out.cost !== cur.cost || out.markup !== cur.markup) && !(out.cost.trim() === '' && out.markup.trim() === '')) out.price = fmt(Math.max(0, toMinor(out.cost) + toMinor(out.markup)))
  return out
}
/** Whether a History entry's earlier values differ from the item's now — Bring back would change something. */
const differs = (item: PriceBookItem, h: ItemChange) => Object.entries(h.changes).some(([f, [before]]) => (f === 'price' ? item.costMinor + item.markupMinor : (item as Record<string, unknown>)[f] ?? null) !== (before ?? null))   // (pending modules S41b-1) a price line reads the item's price

/**
 * (REG-594) One item of My Items, new or edited: what the Add Item popover and a picked line copy — name, description, kind,
 * unit, cost and markup (the unit price follows), category and vendor. The M 600 modal shell; amounts filter as typed (REG-150).
 * (REG-652, price book parity Q-03…Q-05) A member who may only read opens it read-only with the line that says why; a Designer's new
 * item is a proposal ("Propose an item"); a proposed item carries the proposal bar; an existing item ends on its History.
 * (REG-653, price book parity Q-08) An item carries what a line copies: its description with its shape (the house rich editor, REG-557),
 * a product or spec page, and its photo — shown, replaced and removed here, on the card and in the Add Item box.
 * (one-home N-16) Its Vendor picks from Company › Finance › Vendors (type-ahead; a new name added there, else kept as typed) and is saved as
 * the directory spells it — so renaming or merging the vendor there follows onto the item.
 * (pending modules S12 — 1.0's waste factor) A Purchase item carries its **Waste (%)**: the share a purchase order made from the signed quote
 * orders on top of the quoted quantity (lib/company/price-book-waste.ts) — offered for a Purchase, and on any item that already carries one.
 */
const NO_CATEGORY = 'No trade'   // (the calm UI build 2026-10-27, the UI audit's 4-01) the item's grouping is its Trade on screen; the stored field stays `category`
export function ItemDialog({ open, item, onClose, onSave, trades = [], proposing = false, readOnly = null, proposal = null, now, onBringBack, costs = true, canAddTrade = false, units: studioUnits = UNITS, canAddUnit = false }: {
  /** (pending modules S41b-1 — 1.0's Cost & Margin Visibility) the member sees costs — else one Unit price box in place of Cost and Markup: the
      item came with its cost folded into its price, so its mark-up box IS its price, and the server keeps the stored cost on the save */
  costs?: boolean
  open: boolean; item: PriceBookItem | null; onClose: () => void; onSave: (input: PriceBookItemInput) => void | Promise<unknown>
  /** (REG-651, Q-07) the studio's trades */ trades?: string[]
  /** (S44I — M9) the studio's units — Settings › Quotes & pricing › Units */ units?: readonly string[]
  /** (S44I — M9, S44P's "New category…" as the pattern) the viewer may add a unit — an Owner or an Admin: the Unit list's "New unit…" makes one; else it says why */
  canAddUnit?: boolean
  /** (S44P, row 319) the viewer may add a trade — an Owner or an Admin: the Category list's "New category…" makes one; else it says why */
  canAddTrade?: boolean
  /** A new item from someone who doesn't run the book: it is proposed. */ proposing?: boolean
  /** Why the viewer may only read this item, else null. */ readOnly?: string | null
  /** A proposed item: who proposed it, whether the viewer reviews it, and the two answers. */
  proposal?: { by: string | null; at: number; canReview: boolean; onApprove: (edited: PriceBookItemInput | null) => void | Promise<unknown>; onSendBack: () => void } | null
  now: number
  /** (Dane UAT 3.10) History › Bring back — the entry's earlier values, through the item's own write; absent when the viewer may only read. */
  onBringBack?: (h: ItemChange) => void | Promise<unknown>
}) {
  const [d, setD] = useState<Draft>(() => toDraft(item))
  /* (S44P, row 319) trades added from this dialog's "New category…" — offered at once, before the page reads the list again */
  const [added, setAdded] = useState<string[]>([])
  const [naming, setNaming] = useState(false)
  /* (S44I — M9) units added from this dialog's "New unit…" — offered at once, as the trades above */
  const [addedUnits, setAddedUnits] = useState<string[]>([])
  const [namingUnit, setNamingUnit] = useState(false)
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const [seen, setSeen] = useState(item?.id ?? null)
  const [history, setHistory] = useState<{ id: string; rows: ItemChange[] | 'failed' } | null>(null)
  const [historyTry, setHistoryTry] = useState(0)
  const [bringing, setBringing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [allHistory, setAllHistory] = useState(false)
  /* (Dane UAT 3.10) the item as last read — a newer one (a Bring back, its Undo) moves the boxes the member left alone and reloads History */
  const [base, setBase] = useState<PriceBookItem | null>(item)
  if (open !== wasOpen || (item?.id ?? null) !== seen) { setWasOpen(open); setSeen(item?.id ?? null); setBase(item); if (open) { setD(toDraft(item)); setTouched(false); setAllHistory(false); setAdded([]); setNaming(false); setAddedUnits([]); setNamingUnit(false) } }
  else if (item && base && item !== base && item.id === base.id && (item.updatedAt?.getTime() ?? 0) !== (base.updatedAt?.getTime() ?? 0)) { setBase(item); setD((cur) => follow(cur, toDraft(base), toDraft(item))); setHistoryTry((n) => n + 1) }
  const itemId = open ? item?.id ?? null : null
  useEffect(() => {
    if (!itemId) return
    let live = true
    void listItemHistory(itemId).then((rows) => { if (live) setHistory({ id: itemId, rows }) }).catch(() => { if (live) setHistory({ id: itemId, rows: 'failed' }) })   // (sweep S5 #25) a failed load says so
    return () => { live = false }
  }, [itemId, historyTry])
  const loaded = history && history.id === itemId ? history.rows : null
  const historyFailed = loaded === 'failed'
  const rows = loaded === 'failed' ? null : loaded
  const set = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }))
  const snackbar = useSnackbar()
  const vendors = useVendorDirectory(open && !readOnly)   // (one-home N-16)
  const nameOk = d.name.trim().length > 0
  const linkOk = cleanLink(d.link) !== undefined
  /* (pending modules S12) Waste: 0–50 % (1.0's bounds); shown for a Purchase, or wherever one is already kept — never hidden with a value in it */
  const wasteN = d.waste.trim() === '' ? 0 : Number(d.waste)
  const wasteOk = Number.isFinite(wasteN) && wasteN >= 0 && wasteN <= WASTE_MAX
  const showWaste = kindOf(d.kind) === 'purchase' || (!!item && item.wastePct > 0) || wasteN > 0
  const wasteUnit = d.unit.toLowerCase() === 'pieces' ? 'pieces' : d.unit
  const pickPhoto = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp,image/gif'
    input.onchange = async () => { const f = input.files?.[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { snackbar({ message: 'That photo is over 10 MB — pick a smaller one' }); return } const url = await readFileAsDataUrl(f, 480); setD((x) => ({ ...x, thumb: url })) }
    input.click()
  }
  /* (S44P, M8 — rows 346 · 347) Cost · Markup · Unit price stay in step as the quote's Items grid keeps them (item-row.tsx, REG-417): a cost
     keeps the markup (the price follows), a markup moves the price, a unit price moves the markup — so an item may sell at S$0, or under
     its cost (a markup below zero), never below S$0 (the markup goes no lower than minus the cost — the server's own floor, row()). */
  const costM = toMinor(d.cost), markupM = toMinor(d.markup)
  const priceOf = (cost: string, markup: string) => (cost.trim() === '' && markup.trim() === '' ? '' : fmt(Math.max(0, toMinor(cost) + toMinor(markup))))
  const onCost = (v: string) => setD((x) => ({ ...x, cost: v, price: priceOf(v, x.markup) }))
  const onMarkup = (v: string) => { const m = signedMoney(v); setD((x) => ({ ...x, markup: m, price: priceOf(x.cost, m) })) }
  const onPrice = (v: string) => setD((x) => ({ ...x, price: v, markup: v.trim() === '' && x.cost.trim() === '' ? '' : fmt(toMinor(v) - toMinor(x.cost)) }))
  /* the grid's floor, said once the box is left: a markup below minus the cost reads as the cost's minus (a price of S$0) */
  const settleMarkup = () => setD((x) => (x.markup.trim() !== '' && toMinor(x.markup) < -toMinor(x.cost) ? { ...x, markup: fmt(-toMinor(x.cost)), price: fmt(0) } : x))
  const markupHelp = costM > 0 && d.markup.trim() !== '' ? (markupM < 0 ? `Below cost by ${money2(Math.min(-markupM, costM))}` : `${pct(Number(((markupM / costM) * 100).toFixed(2)))} of the cost`) : undefined
  const unitList = [...studioUnits, ...addedUnits.filter((a) => !studioUnits.some((u) => u.toLowerCase() === a.toLowerCase()))]
  const units = !d.unit || unitList.some((u) => u.toLowerCase() === d.unit.toLowerCase()) ? unitList : [d.unit, ...unitList]   // (S44I — M9) an older unit stays offered until changed
  /* (REG-651, price book parity Q-07) The category is one of the studio's trades; an older free-text one stays offered until changed.
     (S44P, row 319) a trade added here joins the list at once. */
  const tradeList = [...trades, ...added.filter((a) => !trades.some((t) => t.toLowerCase() === a.toLowerCase()))]
  const categories = [NO_CATEGORY, ...tradeList, ...(d.category && !tradeList.some((t) => t.toLowerCase() === d.category.toLowerCase()) ? [d.category] : [])]
  /* (sweep S5 #1 · #3) The draft as the server takes it — saved on Save, or with an Approve when an Owner changed the proposal. */
  const draftInput = (): PriceBookItemInput | null => {
    setTouched(true); if (!nameOk || !linkOk || !wasteOk) return null
    const kept = keptText(d.html, isBlankHtml(d.html))
    return { name: d.name.trim(), description: kept.text.trim() || null, descriptionHtml: kept.html, kind: kindOf(d.kind), unit: d.unit, costMinor: toMinor(d.cost), markupMinor: costs ? Math.max(-Math.max(0, toMinor(d.cost)), toMinor(d.markup)) : toMinor(d.markup), category: d.category.trim() || null, vendor: spellVendor(vendors.list ?? [], d.vendor), link: cleanLink(d.link) ?? null, thumb: d.thumb, wastePct: cleanWaste(wasteN) }
  }
  const dirty = !!item && JSON.stringify(d) !== JSON.stringify(toDraft(item))
  const save = async () => { const v = draftInput(); if (!v || busy) return; setBusy(true); try { await onSave(v) } finally { setBusy(false) } }
  const approveNow = async () => { const v = dirty ? draftInput() : null; if ((dirty && !v) || busy || !proposal) return; setBusy(true); try { await proposal.onApprove(v) } finally { setBusy(false) } }
  const bringBack = async (h: ItemChange) => { if (!onBringBack || bringing) return; setBringing(h.id); try { await onBringBack(h) } finally { setBringing(null) } }
  const title = readOnly ? 'Item details' : item ? 'Edit item' : proposing ? 'Propose an item' : 'New item'
  const subtitle = readOnly ? undefined : item ? 'Quotes that already use this item keep their prices.'
    : proposing ? 'It’s on your quotes at once; an Owner or an Admin approves it before the rest of the studio uses it.' : 'What a quote line starts with when this item is picked.'
  return (
    /* (Dane UAT 3.10) An item's History sits beside its form, in its own column — the dialog takes the house l (800); a phone keeps it below */
    <Dialog open={open} onClose={onClose} title={title} size="modal" width={item ? 800 : 600} subtitle={subtitle}
            footer={readOnly ? <Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>
              : <><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={busy || (!nameOk && touched)} onPress={() => { void save() }}>{busy ? 'Saving…' : item ? 'Save' : proposing ? 'Propose' : 'Add to My Items'}</Button></>}>
      <div className={item ? styles.withHistory : styles.fields} data-testid="item-dialog">
      <div className={styles.fields}>
        {proposal ? <ProposalBar by={proposal.by} at={proposal.at} now={now} canReview={proposal.canReview} onApprove={() => { void approveNow() }} onSendBack={proposal.onSendBack} /> : null}
        {readOnly ? <ReadOnlyNote text={`${readOnly}. You can use it on your quotes.`} /> : null}
        <ReadOnlyScope readOnly={!!readOnly}>
          <TextField label="Item name" required value={d.name} onChange={set('name')} maxLength={200} autoFocus={!readOnly && !item} error={touched && !nameOk ? MSG.required : undefined} />   {/* (sweep S5 #18 · #24) the caret goes in on a new item only (REG-226) */}
          {/* (sweep S5 #20) read-only, the description keeps its shape — the saved HTML, cleaned on save (cleanHtml) */}
          {readOnly ? <div className={styles.richBox}><span className={styles.eyebrow}>Description</span>{isBlankHtml(d.html) ? <span className={styles.muted}>No description</span> : <div className={styles.richRead} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(d.html) }} />}</div>
            : <div className={styles.richBox}><span className={styles.eyebrow}>Description</span><RichEditor value={d.html} onChange={set('html')} placeholder="What the line says under its name — bullets and bold print as you see them" label="Description" framed minHeight={96}
                                                                                                                                  right={<WritingHelp label="Description" subject={d.name.trim() || undefined} kind="description" trigger="icon" nested testId="book-writing" sources={{}} read={() => ({ html: d.html })} apply={set('html')} />} /></div>}
          <div className={styles.pair}>
            <TextField label="Type" mode="select" options={ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k])} value={d.kind} onChange={set('kind')} />   {/* (the calm UI build 2026-10-27, W-536) the quote's Items table calls it Type */}
            <TextField label="Unit" mode="select" options={units} value={d.unit} onChange={set('unit')} searchable={units.length > 8}
                       action={{ label: 'New unit…', onSelect: () => setNamingUnit(true), disabled: !canAddUnit, help: canAddUnit ? undefined : UNITS_RULE, testId: 'new-unit-row' }} />   {/* (S44I — M9) */}
          </div>
          {costs ? (
            /* (S44P, M8) the quote grid's three, in its order — a markup may carry a minus; a unit price of S$0 is a price */
            <div className={styles.trio} data-testid="item-prices">
              <TextField label="Cost (S$)" numeric="money" value={d.cost} onChange={onCost} onBlur={settleMarkup} />
              <TextField label="Markup (S$)" inputMode="decimal" value={d.markup} onChange={onMarkup} onBlur={settleMarkup} helper={markupHelp} />
              <TextField label="Unit price (S$)" numeric="money" value={d.price} onChange={onPrice} />
            </div>
          ) : (
            <div className={styles.pair}>
              <TextField label="Unit price (S$)" numeric="money" value={d.markup} onChange={set('markup')} />
            </div>
          )}
          <div className={styles.pair}>
            <TextField label="Trade" mode="select" options={categories} value={d.category || NO_CATEGORY} onChange={(v) => set('category')(v === NO_CATEGORY ? '' : v)}
                       action={{ label: 'New trade…', onSelect: () => setNaming(true), disabled: !canAddTrade, help: canAddTrade ? undefined : TRADES_RULE, testId: 'new-category-row' }} />   {/* (S44P, row 319) */}
            {/* (one-home N-16) from Company › Finance › Vendors — the house text field with the directory under it */}
            <VendorNameField label="Vendor" value={d.vendor} onChange={set('vendor')} directory={vendors.list} onAdd={vendors.add} maxLength={80} testId="item-vendor" />
          </div>
          {showWaste ? (
            <div className={styles.pair}>
              <TextField label="Waste (%)" numeric="decimal" value={d.waste} onChange={set('waste')}
                         error={touched && !wasteOk ? `Up to ${WASTE_MAX}%` : undefined}
                         helper={wasteOk && wasteN > 0 ? `A PO from the quote orders ${orderedQty(100, wasteN)} ${wasteUnit} for every 100 quoted; the quote keeps its own` : undefined} />
            </div>
          ) : null}
          <TextField label="Website link" value={d.link} onChange={set('link')} maxLength={500} helper="Never printed" error={touched && !linkOk ? MSG.url : undefined} />
          <div className={styles.photoRow} data-testid="item-photo">
            <button type="button" className={styles.photoWell} onClick={pickPhoto} disabled={!!readOnly} aria-label={d.thumb ? 'Replace the photo' : 'Add a photo'}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.thumb ? <img src={d.thumb} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={20} weight={300} /> Photo</span>}
            </button>
            {d.thumb && !readOnly ? <Button appearance="text" variant="secondary" onPress={() => setD((x) => ({ ...x, thumb: null }))}>Remove photo</Button> : null}
          </div>
        </ReadOnlyScope>
        {/* (the calm UI build 2026-10-27, the UI audit's 4-40 · T-05) the helpers that sat under the fields — one press away, every word kept */}
        <HowItWorks points={HOW_ITEMS} />
      </div>
        {item ? (
          <section className={styles.history} aria-label="History" data-testid="item-history">
            <span className={styles.eyebrow}>History</span>
            {historyFailed ? <span className={styles.muted} role="status">Couldn’t load the history — <button type="button" className={styles.retry} onClick={() => setHistoryTry((n) => n + 1)}>try again</button></span>
              : rows === null ? <span className={styles.muted}>Loading…</span> : rows.length === 0 ? <span className={styles.muted}>No changes kept yet.</span> : (
              <ul className={styles.historyList}>
                {(allHistory ? rows : rows.slice(0, HISTORY_SHOWN)).map((h) => (
                  <li key={h.id} className={styles.historyRow} data-testid="history-row">
                    <span className={styles.historyHead}><b>{CHANGE_WORD[h.kind]}</b>{h.by ? ` by ${h.by}` : ''} · {ago(h.at, now)}</span>
                    {Object.entries(h.changes).map(([f, c]) => <span key={f} className={styles.historyLine}>{changeLine(f, c)}</span>)}
                    {h.note ? <span className={styles.historyNote}>“{h.note}”</span> : null}
                    {/* (Dane UAT 3.10) the values this entry changed, as they were before it — offered while they differ from the item's now */}
                    {onBringBack && Object.keys(h.changes).length > 0 && differs(item, h) ? <Button appearance="text" className={styles.bringBack} isDisabled={!!bringing} onPress={() => { void bringBack(h) }} data-testid="history-bring-back">Bring back</Button> : null}
                  </li>
                ))}
              </ul>
            )}
            {rows && rows.length > HISTORY_SHOWN ? <Button appearance="text" className={styles.historyMore} onPress={() => setAllHistory((v) => !v)}>{allHistory ? 'Show fewer' : `Show all ${rows.length}`}</Button> : null}
          </section>
        ) : null}
      </div>
      {/* (S44P, row 319) the new trade lands on this item's Category */}
      <NewUnitDialog open={namingUnit} units={unitList} onClose={() => setNamingUnit(false)}
                     onAdded={(name) => { setAddedUnits((xs) => [...xs, name]); setD((x) => ({ ...x, unit: name })); setNamingUnit(false) }} />
      <NewCategoryDialog open={naming} trades={tradeList} onClose={() => setNaming(false)}
                         onAdded={(name) => { setAdded((xs) => [...xs, name]); setD((x) => ({ ...x, category: name })); setNaming(false) }} />
    </Dialog>
  )
}
