'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { MSG } from '@/lib/forms'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { RichEditor } from '@/components/quotes/editor/text/rich-editor'
import { isBlankHtml } from '@/lib/quotes/text'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { money2 } from '@/lib/quotes/math'
import { ITEM_KINDS, ITEM_KIND_LABEL, UNITS, cleanLink, isItemKind, keptText, plainToHtml } from '@/lib/quotes/items-model'
import { ago } from '@/lib/templates/ago'
import { CHANGE_WORD, changeLine, type ItemChange } from '@/lib/company/price-book-changes'
import type { PriceBookItem } from '@/lib/db/schema'
import { listItemHistory, type PriceBookItemInput } from '@/app/company/price-book-actions'
import { ProposalBar } from './proposal-bar'
import styles from './price-book.module.css'

type Draft = { name: string; description: string; html: string; kind: string; unit: string; cost: string; markup: string; category: string; vendor: string; link: string; thumb: string | null }
const toDraft = (i: PriceBookItem | null): Draft => ({ name: i?.name ?? '', description: i?.description ?? '', html: i?.descriptionHtml || plainToHtml(i?.description ?? ''), kind: ITEM_KIND_LABEL[isItemKind(i?.kind) ? i.kind : 'purchase'], unit: i?.unit ?? 'Pieces', cost: i ? (i.costMinor / 100).toFixed(2) : '', markup: i ? (i.markupMinor / 100).toFixed(2) : '', category: i?.category ?? '', vendor: i?.vendor ?? '', link: i?.link ?? '', thumb: i?.thumb ?? null })
const toMinor = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }   // (REG-651) dollars and cents, as typed
const kindOf = (label: string) => ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === label) ?? 'purchase'
const HISTORY_SHOWN = 6
/** (Dane UAT 3.10) The item changed under the open dialog (a Bring back, its Undo): each box the member left alone follows the item; a box
    they typed in keeps what they typed. */
const follow = (cur: Draft, was: Draft, next: Draft): Draft => {
  const out = { ...cur }
  for (const k of Object.keys(next) as (keyof Draft)[]) if (cur[k] === was[k]) (out as Record<keyof Draft, unknown>)[k] = next[k]
  return out
}
/** Whether a History entry's earlier values differ from the item's now — Bring back would change something. */
const differs = (item: PriceBookItem, h: ItemChange) => Object.entries(h.changes).some(([f, [before]]) => ((item as Record<string, unknown>)[f] ?? null) !== (before ?? null))

/**
 * (REG-594) One item of My Items, new or edited: what the Add Item popover and a picked line copy — name, description, kind,
 * unit, cost and markup (the unit price follows), category and vendor. The M 600 modal shell; amounts filter as typed (REG-150).
 * (REG-652, price book parity Q-03…Q-05) A member who may only read opens it read-only with the line that says why; a Designer's new
 * item is a proposal ("Propose an item"); a proposed item carries the proposal bar; an existing item ends on its History.
 * (REG-653, price book parity Q-08) An item carries what a line copies: its description with its shape (the house rich editor, REG-557),
 * a product or spec page, and its photo — shown, replaced and removed here, on the card and in the Add Item box.
 */
const NO_CATEGORY = 'No category'
export function ItemDialog({ open, item, onClose, onSave, trades = [], proposing = false, readOnly = null, proposal = null, now, onBringBack }: {
  open: boolean; item: PriceBookItem | null; onClose: () => void; onSave: (input: PriceBookItemInput) => void | Promise<unknown>
  /** (REG-651, Q-07) the studio's trades */ trades?: string[]
  /** A new item from someone who doesn't run the book: it is proposed. */ proposing?: boolean
  /** Why the viewer may only read this item, else null. */ readOnly?: string | null
  /** A proposed item: who proposed it, whether the viewer reviews it, and the two answers. */
  proposal?: { by: string | null; at: number; canReview: boolean; onApprove: (edited: PriceBookItemInput | null) => void | Promise<unknown>; onSendBack: () => void } | null
  now: number
  /** (Dane UAT 3.10) History › Bring back — the entry's earlier values, through the item's own write; absent when the viewer may only read. */
  onBringBack?: (h: ItemChange) => void | Promise<unknown>
}) {
  const [d, setD] = useState<Draft>(() => toDraft(item))
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
  if (open !== wasOpen || (item?.id ?? null) !== seen) { setWasOpen(open); setSeen(item?.id ?? null); setBase(item); if (open) { setD(toDraft(item)); setTouched(false); setAllHistory(false) } }
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
  const nameOk = d.name.trim().length > 0
  const linkOk = cleanLink(d.link) !== undefined
  const pickPhoto = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp,image/gif'
    input.onchange = async () => { const f = input.files?.[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { snackbar({ message: 'That photo is over 10 MB — pick a smaller one' }); return } const url = await readFileAsDataUrl(f, 480); setD((x) => ({ ...x, thumb: url })) }
    input.click()
  }
  const unitPrice = toMinor(d.cost) + toMinor(d.markup)
  const units = UNITS.includes(d.unit as (typeof UNITS)[number]) ? [...UNITS] : [d.unit, ...UNITS]
  /* (REG-651, price book parity Q-07) The category is one of the studio's trades; an older free-text one stays offered until changed. */
  const categories = [NO_CATEGORY, ...trades, ...(d.category && !trades.some((t) => t.toLowerCase() === d.category.toLowerCase()) ? [d.category] : [])]
  /* (sweep S5 #1 · #3) The draft as the server takes it — saved on Save, or with an Approve when an Owner changed the proposal. */
  const draftInput = (): PriceBookItemInput | null => {
    setTouched(true); if (!nameOk || !linkOk) return null
    const kept = keptText(d.html, isBlankHtml(d.html))
    return { name: d.name.trim(), description: kept.text.trim() || null, descriptionHtml: kept.html, kind: kindOf(d.kind), unit: d.unit, costMinor: toMinor(d.cost), markupMinor: toMinor(d.markup), category: d.category.trim() || null, vendor: d.vendor.trim() || null, link: cleanLink(d.link) ?? null, thumb: d.thumb }
  }
  const dirty = !!item && JSON.stringify(d) !== JSON.stringify(toDraft(item))
  const save = async () => { const v = draftInput(); if (!v || busy) return; setBusy(true); try { await onSave(v) } finally { setBusy(false) } }
  const approveNow = async () => { const v = dirty ? draftInput() : null; if ((dirty && !v) || busy || !proposal) return; setBusy(true); try { await proposal.onApprove(v) } finally { setBusy(false) } }
  const bringBack = async (h: ItemChange) => { if (!onBringBack || bringing) return; setBringing(h.id); try { await onBringBack(h) } finally { setBringing(null) } }
  const title = readOnly ? 'Item details' : item ? 'Edit item' : proposing ? 'Propose an item' : 'New item'
  const subtitle = readOnly ? undefined : item ? 'Lines already on a quote keep what they copied; new picks take these values.'
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
          {readOnly ? <div className={styles.richBox}><span className={styles.eyebrow}>Description</span>{isBlankHtml(d.html) ? <span className={styles.muted}>No description</span> : <div className={styles.richRead} dangerouslySetInnerHTML={{ __html: d.html }} />}</div>
            : <div className={styles.richBox}><span className={styles.eyebrow}>Description</span><RichEditor value={d.html} onChange={set('html')} placeholder="What the line says under its name — bullets and bold print as you see them" label="Description" framed minHeight={96} /></div>}
          <div className={styles.pair}>
            <TextField label="Kind" mode="select" options={ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k])} value={d.kind} onChange={set('kind')} />
            <TextField label="Unit" mode="select" options={units} value={d.unit} onChange={set('unit')} />
          </div>
          <div className={styles.pair}>
            <TextField label="Cost (S$)" numeric="money" value={d.cost} onChange={set('cost')} />
            <TextField label="Markup (S$)" numeric="money" value={d.markup} onChange={set('markup')} helper={`Unit price ${money2(unitPrice)}`} />
          </div>
          <div className={styles.pair}>
            <TextField label="Category" mode="select" options={categories} value={d.category || NO_CATEGORY} onChange={(v) => set('category')(v === NO_CATEGORY ? '' : v)} helper="The studio’s trades — Settings › Quotes & pricing" />
            <TextField label="Vendor" value={d.vendor} onChange={set('vendor')} maxLength={80} helper="Who supplies it — the same product from two vendors is two items" />
          </div>
          <TextField label="Website link" value={d.link} onChange={set('link')} maxLength={500} helper="A product or spec page — the line keeps it; it never prints" error={touched && !linkOk ? MSG.url : undefined} />
          <div className={styles.photoRow} data-testid="item-photo">
            <button type="button" className={styles.photoWell} onClick={pickPhoto} disabled={!!readOnly} aria-label={d.thumb ? 'Replace the photo' : 'Add a photo'}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.thumb ? <img src={d.thumb} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={20} weight={300} /> Photo</span>}
            </button>
            <span className={styles.photoHelp}>{d.thumb ? 'Shows on the card and in the Add Item box, and goes onto every line picked from it.' : 'A photo shows on the card and in the Add Item box, and goes onto every line picked from it.'}</span>
            {d.thumb && !readOnly ? <Button appearance="text" variant="secondary" onPress={() => setD((x) => ({ ...x, thumb: null }))}>Remove photo</Button> : null}
          </div>
        </ReadOnlyScope>
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
    </Dialog>
  )
}
