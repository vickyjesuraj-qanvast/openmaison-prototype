/**
 * (pending modules S12 — card held:price-book, "Waste factor % per item — dropped, handed to Finance and never picked up · revisit: Order from
 * the quote sends quoted quantities to vendors"; the card's question "Waste % on the item, or on the order?" answered as recommended: **set on
 * the item, applied on the order**.) 1.0's `waste_percent` (price-book-item-editor.tsx: "Adds a buffer to ordered quantities to account for
 * cuts, breakages, and overage. e.g., 10% waste on 100 sqft = 110 sqft ordered.", 0–50 in steps of 0.5) lives on the My Items entry, where a
 * studio knows each tile's or board's wastage once. A purchase order made from the signed quote (Order from the quote, a PO's *Add from the
 * quote*) orders the quote's quantity plus that share; the quote itself — its quantity, its price and its total — never changes (1.0 also
 * multiplied the client's amount, which printed a quantity times a rate that didn't add up). Pure, client-safe.
 */

/** 1.0's ceiling. */
export const WASTE_MAX = 50

/** A typed waste share as the book keeps it: 0 to 50, one decimal; anything else is none. */
export function cleanWaste(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/%$/, '').trim()) : NaN
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(Math.min(WASTE_MAX, n) * 10) / 10
}

/** The quantity to order for a quoted one: the quote's plus the waste share, rounded **up** — to a whole one when the quote counts whole ones
    (7 pieces + 10 % orders 8, never 7.7), else to two decimals (12.5 sqft + 10 % orders 13.75). No waste, the quote's quantity as it is. */
export function orderedQty(qty: number, wastePct: number | null | undefined): number {
  const w = cleanWaste(wastePct)
  if (!w || !(qty > 0)) return qty
  const raw = qty * (1 + w / 100)
  return Number.isInteger(qty) ? Math.ceil(raw - 1e-9) : Math.ceil(raw * 100 - 1e-6) / 100
}

/** "+10% waste" — the share as a line's note says it. */
export const wasteWord = (wastePct: number) => `+${cleanWaste(wastePct)}% waste`

const qtyText = (n: number) => n.toLocaleString('en-SG', { maximumFractionDigits: 2 })
/** What an order line says of its quantity when waste is added: "1,220 sqft · 1,161 on the quote +5% waste"; null without waste. */
export function wasteLine(qty: number, unit: string | null, wastePct: number | null | undefined): string | null {
  const w = cleanWaste(wastePct)
  if (!w || !(qty > 0)) return null
  const u = unit ? ` ${unit}` : ''
  return `${qtyText(orderedQty(qty, w))}${u} · ${qtyText(qty)} on the quote ${wasteWord(w)}`
}
