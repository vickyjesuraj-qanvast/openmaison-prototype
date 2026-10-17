'use client'

import { useRef, useState, type MouseEvent } from 'react'
import { Button, Checkbox, SearchBar, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { DESCRIPTION_MAX, LINES_MAX, NOTE_MAX, advanceOf, lineAmount, nameKey, poLinesProblem, poTotals, type AdvanceKind, type PoRecord, type VendorRecord } from '@/lib/finance/model'
import { PO_TERMS, poWaits, waitWhy, type CostRules, type PoTerms } from '@/lib/finance/rules'
import type { CostProject, PoContext, QuotePick } from '@/lib/finance/queries'
import type { PoInput } from '@/app/finance/po-actions'
import { VendorField } from './vendor-field'
import { orderedQty, wasteLine } from '@/lib/company/price-book-waste'   // (pending modules S12)
import money from '@/components/projects/money/money.module.css'
import own from '@/components/projects/money/invoice-dialogs.module.css'
import pick from '@/components/quotes/editor/items/omit-dialog.module.css'
import fin from './finance.module.css'

/*
 * (gaps build F1 — F1-Q5…Q8) A purchase order's dialog — new, or a Draft (or one the vendor answered with changes) changed: the vendor (picked
 * or added in place), what it is for, the lines (typed, or *Add from the quote* — the signed quote's lines at their cost, the vendor's own
 * first), GST when the vendor charges it, an advance, the payment terms, the expected delivery and the address, a note to the vendor. Owners
 * and Admins also read what the PO leaves of the client's price for those lines. The house Dialog, fields, Chips and line grid (the one-off
 * invoice's); the errors after the first press; the host saves and closes it once the save lands.
 */
type DraftLine = { key: string; description: string; category: string; qty: string; unit: string; price: string; quoteItemId: string | null
  /** (parity map, MO-009) the milestone the line is for — kept through an edit (it was dropped before) */ milestoneId: string | null }
let seq = 0
const blank = (): DraftLine => ({ key: `n${++seq}`, description: '', category: '', qty: '1', unit: '', price: '', quoteItemId: null, milestoneId: null })
const toMinor = (v: string) => Math.round(Number(v.replace(/,/g, '')) * 100)
const fromMinor = (m: number) => (m / 100).toFixed(2)
const parsed = (l: DraftLine) => ({ description: l.description.trim(), category: l.category.trim() || null, qty: Number(l.qty.replace(/,/g, '')) || 0, unit: l.unit.trim() || null, unitMinor: toMinor(l.price || '0') || 0, quoteItemId: l.quoteItemId, milestoneId: l.milestoneId })
const ADVANCE: { value: AdvanceKind; label: string }[] = [{ value: 'none', label: 'No advance' }, { value: 'pct', label: 'A share' }, { value: 'fixed', label: 'A fixed amount' }]

export type PoSaveThen = 'draft' | 'send' | 'submit'
export function PoDialog({ open, initial, context, projects, onPickProject, vendors, onVendorAdded, rules, viewer, trades, bank, busy, onClose, onSave }: {
  open: boolean
  initial: PoRecord | null
  /** the project's context (null while a project is still to be picked in Finance) */ context: PoContext | null
  /** Finance: the projects this viewer prepares POs on — a picker heads the dialog until one is picked */ projects?: CostProject[]
  onPickProject?: (id: string) => void
  vendors: VendorRecord[]
  onVendorAdded: (v: VendorRecord) => void
  rules: CostRules
  viewer: { role: string; seesFigures: boolean; /** (pending modules S41b-1) a quote line's cost · a PO's margin against the quote */ costs?: boolean; margins?: boolean }
  trades: string[]
  bank: boolean
  busy: boolean
  onClose: () => void
  onSave: (input: PoInput, then: PoSaveThen) => void
}) {
  const fresh = () => ({
    vendorId: initial?.vendorId ?? null as string | null, title: initial?.title ?? '',
    lines: initial?.lines.length ? initial.lines.map((l): DraftLine => ({ key: l.id, description: l.description, category: l.category ?? '', qty: String(l.qty), unit: l.unit ?? '', price: fromMinor(l.unitMinor), quoteItemId: l.quoteItemId, milestoneId: l.milestoneId })) : [blank()],
    gst: initial ? initial.chargesGst : false, advanceKind: (initial?.advanceKind ?? 'none') as AdvanceKind,
    advance: initial ? (initial.advanceKind === 'fixed' ? fromMinor(initial.advanceValue) : initial.advanceKind === 'pct' ? String(initial.advanceValue) : '') : '',
    terms: (initial?.terms ?? rules.terms) as PoTerms, termsText: initial?.termsText ?? '', expected: initial?.expectedOn ? inputDate(new Date(initial.expectedOn)) : '',
    address: initial?.deliveryAddress ?? context?.project.address ?? '', note: initial?.vendorNote ?? '',
    /* (parity map, MO-011) Invoice to: the PO's own, else the issuing entity's letterhead to start (saved only when it differs) */
    billTo: initial?.billTo ?? context?.billTo ?? '',
  })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [picking, setPicking] = useState(false)
  /* (parity map, MO-011) More details — closed to start; open when this PO already says where its invoice goes */
  const [more, setMore] = useState(() => !!initial?.billTo)
  const [wasOpen, setWasOpen] = useState(open)
  const [today] = useState(() => new Date())
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false); setMore(!!initial?.billTo) } }
  /* the project's address arrives with its context (Finance picks the project first) — and with it, the letterhead "Invoice to" starts from */
  const [ctxFor, setCtxFor] = useState(context?.project.id ?? null)
  if ((context?.project.id ?? null) !== ctxFor) {
    setCtxFor(context?.project.id ?? null)
    if (context) setF((x) => ({ ...x, ...(!initial && !x.address ? { address: context.project.address ?? '' } : {}), ...(!initial?.billTo && !x.billTo.trim() ? { billTo: context.billTo } : {}) }))
  }
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const setLine = (key: string, patch: Partial<DraftLine>) => set({ lines: f.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) })
  const vendor = vendors.find((v) => v.id === f.vendorId) ?? null
  const gstRate = context?.gstRate ?? 0
  const lines = f.lines.map(parsed)
  const used = lines.filter((l) => l.description || l.unitMinor)
  const t = poTotals(used, f.gst, gstRate)
  const advValue = f.advanceKind === 'fixed' ? toMinor(f.advance || '0') : Number(f.advance) || 0
  const advance = advanceOf(f.advanceKind, advValue, t.totalMinor)
  const linesWhy = poLinesProblem(used)
  const advWhy = f.advanceKind === 'pct' && (advValue <= 0 || advValue > 100) ? 'Between 1% and 100%' : f.advanceKind === 'fixed' && (advValue <= 0 || advValue > t.totalMinor) ? `More than S$0, no more than ${money2(t.totalMinor)}` : undefined
  const termsWhy = f.terms === 'custom' && !f.termsText.trim() ? 'Write the terms in your words' : undefined
  const waits = poWaits(viewer, rules, { totalMinor: t.totalMinor, advanceMinor: advance })
  /* (F1-Q7, Owners and Admins) the client's price for the lines that came from the quote, and what this PO leaves of it */
  const quote = new Map((context?.quoteLines ?? []).map((q) => [q.id, q]))
  const milestones = context?.milestones ?? []
  const fromQuote = used.filter((l) => l.quoteItemId && quote.has(l.quoteItemId))
  /* (pending modules S12) the client pays for the quoted quantity — the waste a line orders on top is the studio's */
  const client = fromQuote.reduce((s, l) => { const q = quote.get(l.quoteItemId!)!; return s + Math.round(Math.min(l.qty, q.qty > 0 ? q.qty : l.qty) * q.priceMinor) }, 0)
  const poPart = fromQuote.reduce((s, l) => s + lineAmount(l.qty, l.unitMinor), 0)
  const save = (then: PoSaveThen) => {
    setTried(true)
    if (!context || !f.vendorId || linesWhy || advWhy || termsWhy) return
    onSave({
      id: initial?.id ?? null, projectId: context.project.id, vendorId: f.vendorId, title: f.title, lines: used.map((l) => ({ ...l })), chargesGst: f.gst && gstRate > 0,
      advanceKind: f.advanceKind, advanceValue: f.advanceKind === 'fixed' ? advValue : f.advanceKind === 'pct' ? advValue : 0, terms: f.terms, termsText: f.terms === 'custom' ? f.termsText : null,
      expectedOn: parseInputDate(f.expected)?.getTime() ?? null, deliveryAddress: f.address, vendorNote: f.note,
      /* (MO-011) only an "Invoice to" that differs from the letterhead is kept — the paper prints it then, never a copy of its own head */
      billTo: f.billTo.trim() && f.billTo.trim() !== (context.billTo ?? '').trim() ? f.billTo : null,
    }, then)
  }
  const addPicked = (picks: QuotePick[]) => {
    /* (pending modules S41b-1) a member who doesn't see costs enters the vendor's price — the quote's cost never reached this page */
    const fresh = picks.map((q): DraftLine => ({ key: `q${++seq}`, description: q.name, category: q.category ?? '', qty: String(orderedQty(q.qty, q.wastePct)), unit: q.unit ?? '', price: viewer.costs !== false ? fromMinor(q.costMinor) : '', quoteItemId: q.id, milestoneId: null }))   // (pending modules S12) the qty + its item's waste
    const keep = f.lines.filter((l) => l.description.trim() || l.price)
    set({ lines: [...keep, ...fresh].slice(0, LINES_MAX) })
    setPicking(false)
  }
  const sendLabel = waits ? 'Save and submit for approval' : 'Save and send'
  return (
    <>
      <Dialog open={open} onClose={onClose} title={initial ? `Edit ${initial.number}` : 'New purchase order'} size="form" width={1200} closeOnScrim={false}
              subtitle={initial && (initial.vendorAnswer === 'changes' || initial.vendorAnswer === 'declined') ? 'Changed, it goes back to a Draft — send it again for the vendor to answer.' : 'For a sub-contractor or a supplier. It is saved as a Draft with its number; the vendor gets it on WhatsApp with a link to accept it.'}
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
                <Button variant="secondary" appearance="outlined" onPress={() => save('draft')} isDisabled={busy || !context} data-testid="po-save-draft">Save as Draft</Button>
                <Button onPress={() => save(waits ? 'submit' : 'send')} isDisabled={busy || !context} data-testid="po-save-send">{busy ? 'Saving…' : sendLabel}</Button>
              </>}>
        <div className={money.fields} data-testid="po-dialog">
          {projects && !initial ? (
            <TextField label="Project" mode="select" searchable required options={projects.map((p) => `${p.number} · ${p.name}`)} value={context ? `${context.project.number} · ${context.project.name}` : ''}
                       onChange={(v) => { const p = projects.find((x) => `${x.number} · ${x.name}` === v); if (p) onPickProject?.(p.id) }} error={tried && !context ? 'Pick the project it is for' : undefined} helper="A PO is for one project — its signed quote’s lines can be added" />
          ) : null}
          <div className={money.pairs}>
            <VendorField vendors={vendors} value={f.vendorId} onChange={(id) => { const v = vendors.find((x) => x.id === id); set({ vendorId: id, ...(initial ? {} : { gst: !!v?.chargesGst && gstRate > 0 }) }) }}
                         onAdded={(v) => { onVendorAdded(v); set({ vendorId: v.id, gst: v.chargesGst && gstRate > 0 }) }} trades={trades} bank={bank}
                         error={tried && !f.vendorId ? 'Pick the vendor' : undefined} helper={vendor && !vendor.phone ? 'No mobile on file — add one to send it on WhatsApp' : undefined} testId="po-vendor" />
            <TextField label="What it’s for (optional)" value={f.title} onChange={(v) => set({ title: v })} maxLength={120} helper="“Kitchen and wardrobe carpentry”" />
          </div>
          <div>
            <span className={money.fieldLabel}>Lines — priced before GST</span>
            <div className={own.lines} role="list" aria-label="Lines" data-testid="po-lines">
              {f.lines.map((l, i) => {
                const q = l.quoteItemId ? quote.get(l.quoteItemId) : null
                const ms = l.milestoneId ? milestones.find((m) => m.id === l.milestoneId) ?? null : null
                return (
                  <div key={l.key} role="listitem" data-testid="po-line">
                    <div className={fin.poLine} data-ms={milestones.length ? '' : undefined}>
                      <TextField className={fin.wide} label="What it is" value={l.description} onChange={(v) => setLine(l.key, { description: v })} maxLength={DESCRIPTION_MAX} size="s" />
                      <TextField className={fin.wide} label="Trade" mode="select" options={[...new Set([...trades, ...(l.category && !trades.includes(l.category) ? [l.category] : [])])]} value={l.category} onChange={(v) => setLine(l.key, { category: v })} size="s" />
                      <TextField label="Qty" value={l.qty} numeric="decimal" onChange={(v) => setLine(l.key, { qty: v })} size="s" />
                      <TextField label="Unit" value={l.unit} onChange={(v) => setLine(l.key, { unit: v })} maxLength={20} size="s" />
                      <TextField label="Price (S$)" value={l.price} numeric="money" onChange={(v) => setLine(l.key, { price: v })} size="s" />
                      <span className={own.lineAmt} aria-label="Line amount">{money2(lineAmount(parsed(l).qty, parsed(l).unitMinor))}</span>
                      <span className={fin.lineTools}>
                        {milestones.length ? <LineMilestoneMenu index={i} milestones={milestones} value={l.milestoneId} onChange={(id) => setLine(l.key, { milestoneId: id })} /> : null}
                        <Tooltip label="Remove the line" disabled={f.lines.length === 1}>
                          <IconButton icon="delete" label={`Remove line ${i + 1}`} disabled={f.lines.length === 1} onClick={() => set({ lines: f.lines.filter((x) => x.key !== l.key) })} />
                        </Tooltip>
                      </span>
                    </div>
                    {q ? <span className={fin.lineFrom}>From the quote — {q.qty}{q.unit ? ` ${q.unit}` : ''}{viewer.costs !== false ? ` at a cost of ${money2(q.costMinor)}` : ''}{viewer.seesFigures && viewer.margins !== false ? `, the client pays ${money2(q.priceMinor)} each` : ''}</span> : null}
                    {ms ? <span className={fin.lineFrom} data-testid="po-line-milestone">For {ms.title}</span> : null}
                  </div>
                )
              })}
            </div>
            <div className={own.linesFoot}>
              <span className={fin.inlineRow}>
                <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => set({ lines: [...f.lines, blank()] })} isDisabled={f.lines.length >= LINES_MAX} data-testid="po-add-line">Add a line</Button>
                {context?.quoteLines.length ? <Button appearance="text" iconStart={<Icon name="request_quote" size={20} />} onPress={() => setPicking(true)} data-testid="po-from-quote">Add from the quote</Button> : null}
              </span>
              {gstRate > 0 ? <label className={own.switchRow}><Switch size="sm" isSelected={f.gst} onChange={(v: boolean) => set({ gst: v })} aria-label={`Add GST (${gstRate}%)`} /><span>Add GST ({gstRate}%){vendor ? <span className={money.sub}> · {vendor.chargesGst ? `${vendor.name} charges GST` : `${vendor.name} doesn’t charge GST`}</span> : null}</span></label> : null}
            </div>
            {tried && linesWhy ? <span className={money.sub} data-tone="alert">{linesWhy}</span> : null}
            <dl className={own.totals} data-testid="po-totals">
              <dt>Subtotal</dt><dd>{money2(t.subtotalMinor)}</dd>
              {f.gst && gstRate > 0 ? <><dt>GST ({gstRate}%)</dt><dd>{money2(t.gstMinor)}</dd></> : null}
              <dt className={own.grand}>Total</dt><dd className={own.grand}>{money2(t.totalMinor)}</dd>
              {advance ? <><dt>Advance</dt><dd>{money2(advance)}</dd></> : null}
            </dl>
            {viewer.seesFigures && viewer.margins !== false && fromQuote.length ? (   // (pending modules S41b-1) a margin
              <p className={`${money.differs} ${fin.gapTop}`} data-testid="po-against-quote"><Icon name="request_quote" size={20} weight={300} />
                <span>The client pays {money2(client)} for the {fromQuote.length === 1 ? 'line' : `${fromQuote.length} lines`} from the quote; this PO leaves {money2(client - poPart)}{client ? ` (${Math.round(((client - poPart) / client) * 1000) / 10}%)` : ''}.</span></p>
            ) : null}
          </div>
          <div>
            <span className={money.fieldLabel}>Advance</span>
            <Chips label="Advance" options={ADVANCE} value={f.advanceKind} onChange={(v) => set({ advanceKind: v as AdvanceKind })} testId="po-advance" />
            {f.advanceKind !== 'none' ? (
              <div className={own.under}>
                <TextField label={f.advanceKind === 'pct' ? 'Share of the total (%)' : 'Amount (S$)'} value={f.advance} numeric={f.advanceKind === 'pct' ? 'decimal' : 'money'} onChange={(v) => set({ advance: v })}
                           required error={tried ? advWhy : undefined} helper={advance ? `${money2(advance)} paid first${rules.poApproval ? ' — an advance asks an Owner’s or an Admin’s approval' : ''}` : undefined} />
              </div>
            ) : null}
          </div>
          <div>
            <span className={money.fieldLabel}>When the vendor is paid</span>
            <Chips label="When the vendor is paid" options={PO_TERMS.map((x) => ({ value: x.value, label: x.label }))} value={f.terms} onChange={(v) => set({ terms: v as PoTerms })} testId="po-terms" />
            <span className={`${money.sub} ${fin.below}`}>{PO_TERMS.find((x) => x.value === f.terms)?.help}</span>
            {f.terms === 'custom' ? <div className={own.under}><TextField label="The terms" value={f.termsText} onChange={(v) => set({ termsText: v })} maxLength={120} required error={tried ? termsWhy : undefined} /></div> : null}
          </div>
          <div className={money.pairs}>
            <DateField label="Expected delivery (optional)" value={f.expected} onChange={(v) => set({ expected: v })} today={today} />
            <TextField label="Deliver to" value={f.address} onChange={(v) => set({ address: v })} maxLength={200} helper="The site, to start" />
          </div>
          <TextField label="Note to the vendor (optional)" value={f.note} onChange={(v) => set({ note: v })} maxLength={NOTE_MAX} multiline={3} helper="Printed on the PO — “Deliver by 15 Oct, call the site foreman first”" />
          {/* (parity map, MO-011 — 1.0's Billing Address, "Invoice to" on the vendor's page) behind More details: where the vendor sends its invoice,
              the issuing entity's letterhead to start; changed, the paper prints it under the vendor */}
          <span>
            <Button appearance="text" iconEnd={<Icon name={more ? 'keyboard_arrow_up' : 'expand_more'} size={20} />} onPress={() => setMore((x) => !x)} aria-expanded={more} data-testid="po-more">More details</Button>
          </span>
          {more ? (
            <div data-testid="po-bill-to">
              <TextField label="Invoice to" value={f.billTo} onChange={(v) => set({ billTo: v })} maxLength={300} multiline={2}
                         helper={f.billTo.trim() && f.billTo.trim() !== (context?.billTo ?? '').trim() ? 'Printed on the PO — the vendor sends its invoice here' : 'Where the vendor sends its invoice — the letterhead’s, to start'} />
            </div>
          ) : null}
          {waits && t.totalMinor > 0 ? <p className={money.differs} data-testid="po-waits"><Icon name="approval" size={20} weight={300} /><span>{waitWhy(rules, { totalMinor: t.totalMinor, advanceMinor: advance }, money2)}.</span></p> : null}
        </div>
      </Dialog>
      <QuoteLinesDialog open={picking} costs={viewer.costs !== false} lines={context?.quoteLines ?? []} vendorName={vendor?.name ?? null} taken={f.lines.map((l) => l.quoteItemId).filter((x): x is string => !!x)} onClose={() => setPicking(false)} onAdd={addPicked} />
    </>
  )
}

/** (F1-Q7) The signed quote's lines to add — by trade, the vendor's own lines first (the quote line's Vendor/Sub); a line on this PO already greys
    and says so. The omit dialog's list and rows (B's, composed). */
function QuoteLinesDialog({ open, lines, vendorName, taken, onClose, onAdd, costs = true }: { open: boolean; lines: QuotePick[]; vendorName: string | null; taken: string[]; onClose: () => void; onAdd: (p: QuotePick[]) => void
  /** (pending modules S41b-1) the member sees costs — else the lines and their quantities, no amount; they enter the vendor's prices */ costs?: boolean }) {
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setPicked([]); setQuery('') } }
  const q = query.trim().toLowerCase()
  const mine = (l: QuotePick) => !!vendorName && !!l.vendor && nameKey(l.vendor) === nameKey(vendorName)   // "Floor Xpert" is Floor Xpert Pte Ltd
  const shown = lines.filter((l) => !q || l.name.toLowerCase().includes(q) || (l.category ?? '').toLowerCase().includes(q))
  const groupOf = (l: QuotePick) => (mine(l) ? `From ${vendorName}` : l.category || 'Other')
  const groups = [...new Set([...shown.filter(mine).map(groupOf), ...shown.filter((l) => !mine(l)).map(groupOf)])]
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const onRow = (l: QuotePick) => (e: MouseEvent) => { if (taken.includes(l.id) || (e.target as HTMLElement).closest('label, input, button, a')) return; toggle(l.id) }
  const n = picked.length
  return (
    <Dialog open={open} onClose={onClose} title="Add from the quote" size="modal" width={800} height={640} nested portal
            subtitle={costs ? 'The signed quote’s lines, at their cost. Each becomes a line on this PO you can still change.' : 'The signed quote’s lines and their quantities — you enter each vendor’s price on the PO.'}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => onAdd(lines.filter((l) => picked.includes(l.id)))} isDisabled={!n} data-testid="po-quote-add">{n ? `Add ${n} line${n === 1 ? '' : 's'}` : 'Add lines'}</Button></>}>
      <div className={pick.body} data-testid="po-quote-lines">
        <div className={pick.toolbar}><span className={pick.search}><SearchBar appearance="outlined" size="md" placeholder="Search the quote’s lines" aria-label="Search the quote’s lines" value={query} onChange={setQuery} /></span></div>
        {!shown.length ? (
          <div className={pick.empty} role="status"><span className={pick.emptyGlyph} aria-hidden><Icon name="search" size={40} weight={300} /></span><span className={pick.emptyTitle}>No matching lines</span></div>
        ) : (
          <div className={pick.list} role="list" aria-label="The quote’s lines">
            {groups.map((g) => (
              <div key={g} role="presentation">
                <div className={pick.groupHead} role="presentation">{g}</div>
                {shown.filter((l) => groupOf(l) === g).map((l) => {
                  const on = picked.includes(l.id), done = taken.includes(l.id)
                  return (
                    <div key={l.id} className={pick.row} role="listitem" data-selected={on || undefined} data-omitted={done || undefined} data-testid="po-quote-line" onClick={onRow(l)}>
                      <Checkbox isSelected={on || done} isDisabled={done} onChange={() => toggle(l.id)} aria-label={`Add ${l.name}`} />
                      <span className={pick.text}>
                        <span className={pick.name}>{l.name}{done ? <MetaChip>On this PO</MetaChip> : null}</span>
                        <span className={pick.meta}>{wasteLine(l.qty, l.unit, l.wastePct) ?? `${l.qty}${l.unit ? ` ${l.unit}` : ''}`}{l.category ? ` · ${l.category}` : ''}{l.vendor ? ` · ${l.vendor}` : ''}</span>
                      </span>
                      <span className={pick.price}>{costs ? money2(lineAmount(orderedQty(l.qty, l.wastePct), l.costMinor)) : null}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}

/** (parity map, MO-009 — 1.0's per-line Milestone select) A line's ⋮: Link to a milestone — the project's milestones as one radio list (No
    milestone first); the milestone panel's costs read it. Only when the project has milestones. */
function LineMilestoneMenu({ index, milestones, value, onChange }: { index: number; milestones: { id: string; title: string }[]; value: string | null; onChange: (id: string | null) => void }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const pick = (id: string | null) => { setOpen(false); onChange(id) }
  return (
    <span ref={anchor}>
      <Tooltip label="More actions" disabled={open}><IconButton icon="more_vert" label={`More actions for line ${index + 1}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="po-line-menu" /></Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="Link to a milestone">
        <DropdownLabel>Link to a milestone</DropdownLabel>
        <DropdownItem role="menuitemradio" checked={!value} onSelect={() => pick(null)}>No milestone</DropdownItem>
        {milestones.map((m) => <DropdownItem key={m.id} role="menuitemradio" checked={value === m.id} onSelect={() => pick(m.id)}>{m.title}</DropdownItem>)}
      </PortalMenu>
    </span>
  )
}
