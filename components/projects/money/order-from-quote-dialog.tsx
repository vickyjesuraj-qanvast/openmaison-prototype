'use client'

import { useState, type MouseEvent } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { money2 } from '@/lib/quotes/math'
import { wasteLine } from '@/lib/company/price-book-waste'
import { orderFromQuote, orderFromQuoteLines, undoOrderFromQuote, type OrderFromQuote } from '@/app/finance/order-from-quote-actions'
import pick from '@/components/quotes/editor/items/omit-dialog.module.css'
import styles from './money.module.css'

const lineCost = (l: { qty: number; costMinor: number }) => Math.round((Number.isFinite(l.qty) ? l.qty : 0) * l.costMinor)

/**
 * (simplify Q-10, P3 §6.8) *Order from the quote* — New ▾'s Costs group: the signed quote's lines by their Vendor/Sub (REG-623), each line that
 * is already on a PO greyed with its number, and one Draft PO made per ticked vendor (app/finance/order-from-quote-actions.ts, through today's
 * `savePo`). A vendor the directory does not know says so in its head and cannot be ticked. The house Dialog (a sheet on a phone) on the PO
 * dialog's *Add from the quote* list (omit-dialog.module.css, composed). One sentence + Undo; the Drafts wait on Costs for their own Send.
 */
export function OrderFromQuoteDialog({ open, projectId, onClose, onMade }: { open: boolean; projectId: string; onClose: () => void; onMade: (ids: string[]) => void }) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [read, setRead] = useState<{ data: OrderFromQuote | null; error: string | null } | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setRead(null); setPicked([])
      void orderFromQuoteLines(projectId).then((r) => setRead('error' in r ? { data: null, error: r.error } : { data: r, error: null }), (e) => setRead({ data: null, error: refusalOf(e) ?? 'Couldn’t read the quote — please try again' }))
    }
  }
  const data = read?.data ?? null
  const groups = data?.groups ?? []
  const free = (g: OrderFromQuote['groups'][number]) => (g.block ? [] : g.lines.filter((l) => !l.onPo))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleGroup = (g: OrderFromQuote['groups'][number]) => {
    const ids = free(g).map((l) => l.id)
    const all = ids.every((id) => picked.includes(id))
    setPicked((p) => (all ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]))
  }
  const orders = groups.filter((g) => g.vendorId).map((g) => ({ vendorId: g.vendorId!, lineIds: g.lines.filter((l) => picked.includes(l.id)).map((l) => l.id) })).filter((o) => o.lineIds.length)
  const n = orders.length
  const save = () => {
    if (!n || busy) return
    setBusy(true)
    void orderFromQuote(projectId, { orders }).then((r) => {
      setBusy(false)
      if ('error' in r) { snackbar({ message: couldnt('make the purchase orders', refusalOf(r.error)) }); return }
      onMade(r.made.map((x) => x.id))
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('take them back', () => undoOrderFromQuote(r.undo), r.made.length === 1 ? `${r.made[0]!.number} is taken back` : 'The Draft POs are taken back') } })
    }, (e) => { setBusy(false); snackbar({ message: couldnt('make the purchase orders', refusalOf(e)) }) })
  }
  const onRow = (id: string, off: boolean) => (e: MouseEvent) => { if (off || (e.target as HTMLElement).closest('label, input, button, a')) return; toggle(id) }
  return (
    <Dialog open={open} onClose={onClose} title="Order from the quote" size="modal" width={800} height={640}
            subtitle={data?.quote ? `${data.quote.number}’s lines by who does them, at their cost — one Draft PO for each vendor you tick. Lines already on a PO are greyed.` : 'The signed quote’s lines by who does them, at their cost.'}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={!n || busy} data-testid="order-make">{busy ? 'Making…' : n ? `Make ${n} Draft PO${n === 1 ? '' : 's'}` : 'Make the Draft POs'}</Button></>}>
      <div className={pick.body} data-testid="order-from-quote">
        {!read ? <p className={styles.sub}>Reading the quote…</p>
          : read.error || !data?.quote || !groups.length ? (
            <div className={pick.empty} role="status">
              <span className={pick.emptyGlyph} aria-hidden><Icon name="request_quote" size={40} weight={300} /></span>
              <span className={pick.emptyTitle}>{read.error ? 'Nothing to order here' : !data?.quote ? 'No signed quote yet' : 'No line names who does it'}</span>
              <span className={pick.emptyHelp}>{read.error ?? (!data?.quote ? 'Order from the quote reads the signed quote’s lines — raise a purchase order from New ▾ instead.' : 'Set each line’s Vendor/Sub on the quote, or raise a purchase order and Add from the quote.')}</span>
            </div>
          ) : (
            <div className={pick.list} role="list" aria-label="The quote’s lines by vendor">
              {groups.map((g) => {
                const ids = free(g).map((l) => l.id)
                const all = ids.length > 0 && ids.every((id) => picked.includes(id))
                const some = ids.some((id) => picked.includes(id))
                return (
                  <div key={g.name} role="presentation" data-testid="order-group">
                    <div className={`${pick.groupHead} ${styles.orderHead}`} role="presentation">
                      <Checkbox isSelected={all} isIndeterminate={some && !all} isDisabled={!ids.length} onChange={() => toggleGroup(g)} aria-label={`Tick every line for ${g.name}`} />
                      <span>{g.name}</span>
                      {g.block ? <span className={styles.orderBlock}>{g.block}</span> : null}
                    </div>
                    {g.lines.map((l) => {
                      const off = !!g.block || !!l.onPo
                      const on = picked.includes(l.id)
                      return (
                        <div key={l.id} className={pick.row} role="listitem" data-selected={on || undefined} data-omitted={off || undefined} data-testid="order-line" onClick={onRow(l.id, off)}>
                          <Checkbox isSelected={on || !!l.onPo} isDisabled={off} onChange={() => toggle(l.id)} aria-label={`Order ${l.name}`} />
                          <span className={pick.text}>
                            <span className={pick.name}>{l.name}{l.onPo ? <MetaChip>On {l.onPo}</MetaChip> : null}</span>
                            {/* (pending modules S12) a line whose item carries waste orders more than the quote counts — said: "1,037 sqft · 987 on the quote +5% waste"; one already on a PO reads as quoted */}
                            <span className={pick.meta} data-testid="order-qty">{(l.onPo ? null : wasteLine(l.quotedQty, l.unit, l.wastePct)) ?? `${l.onPo ? l.quotedQty : l.qty}${l.unit ? ` ${l.unit}` : ''}`}{l.category ? ` · ${l.category}` : ''}</span>
                          </span>
                          <span className={pick.price}>{money2(lineCost(l))}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {data.unassigned ? <p className={`${styles.sub} ${styles.orderNote}`}>{data.unassigned === 1 ? 'One line names nobody' : `${data.unassigned} lines name nobody`} — set its Vendor/Sub on the quote, or add it to a purchase order yourself.</p> : null}
            </div>
          )}
      </div>
    </Dialog>
  )
}
