import { CONDITION_OPTIONS, DISTRICTS, KEY_COLLECTION_OPTIONS, PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'
import { DEFAULT_LEAD_SOURCE_NAMES } from '@/lib/settings/types'
import { titleCaseName } from '@/lib/format'
import type { PasteLine } from '@/lib/quotes/clipboard'
import type { UploadGroup } from '@/lib/quotes/upload'
import type { RefLine } from '@/lib/xray/reference'
import { MAX_GROUPS, MAX_LINES, type TrialLeadData, type TrialRead } from './policy'

/*
 * (pending modules S41b-3 — 1.0's anon routes' `text(v, max)` caps: "keeps one visitor from stuffing a megabyte of prose into a jsonb column")
 * What the server keeps of what a visitor's browser sends — every field a string of the form's own size, a pick one of the form's own
 * options, every number finite and bounded. Pure: the actions check with it, the claim reads what it kept.
 */

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max) : '')
const oneOf = (v: unknown, list: readonly string[]) => (typeof v === 'string' && list.includes(v) ? v : '')

/** A lead's details as the trial keeps them (the studio's form's fields, the members aside). */
export function cleanLeadData(input: unknown): TrialLeadData {
  const r = (input ?? {}) as Record<string, unknown>
  return {
    name: titleCaseName(str(r.name, 1000).trim().slice(0, 120)),   // trimmed first, so a name typed after spaces keeps its full 120; written as the studio writes it (REG-329)
    phone: str(r.phone, 20),
    source: oneOf(r.source, DEFAULT_LEAD_SOURCE_NAMES),
    propertyType: oneOf(r.propertyType, PROPERTY_TYPES),
    propertyAddress: str(r.propertyAddress, 200),
    email: str(r.email, 1000).trim().slice(0, 120),
    leadAddress: str(r.leadAddress, 200),
    budget: str(r.budget, 20),
    startDate: str(r.startDate, 12),
    style: oneOf(r.style, STYLE_OPTIONS),
    keyCollection: oneOf(r.keyCollection, KEY_COLLECTION_OPTIONS),
    condition: oneOf(r.condition, CONDITION_OPTIONS),
    areaSize: str(r.areaSize, 8).replace(/\D/g, ''),
    areaUnit: r.areaUnit === 'sq m' ? 'sq m' : 'sq ft',
    notes: str(r.notes, 2000),
    district: oneOf(r.district, DISTRICTS),
    nric: str(r.nric, 12),
    customerId: str(r.customerId, 60),
    companyName: str(r.companyName, 120),
    companyUen: str(r.companyUen, 12),
    client2Name: titleCaseName(str(r.client2Name, 1000).trim().slice(0, 120)),
    client2Nric: str(r.client2Nric, 12),
    client2Phone: str(r.client2Phone, 20),
  }
}

const money = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e10 ? Math.round(v) : undefined)
const qty = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e6 ? v : undefined)
const opt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** A read quote's sections and lines as Upload a quote read them — null when there is nothing to keep or too much to be one quote. */
export function cleanGroups(input: unknown): UploadGroup[] | null {
  if (!Array.isArray(input) || !input.length || input.length > MAX_GROUPS) return null
  let total = 0
  const out: UploadGroup[] = []
  for (const g of input as { name?: unknown; lines?: unknown }[]) {
    if (!Array.isArray(g?.lines)) return null
    const lines: PasteLine[] = []
    for (const l of g.lines as Record<string, unknown>[]) {
      const name = str(l?.name, 200).trim()
      if (!name) continue
      const discount = typeof l.discountPct === 'number' && Number.isFinite(l.discountPct) && l.discountPct >= 0 && l.discountPct <= 100 ? l.discountPct : undefined
      lines.push({ name, description: opt(l.description, 2000), qty: qty(l.qty), unit: opt(l.unit, 40), costMinor: money(l.costMinor), markupMinor: money(l.markupMinor),
        discountPct: discount, room: opt(l.room, 80), category: opt(l.category, 80), section: opt(l.section, 120) })
    }
    total += lines.length
    if (total > MAX_LINES) return null
    if (lines.length) out.push({ name: opt(g.name, 200), lines })
  }
  return out.length ? out : null
}

/** A line's money as the read prices it — quantity × (cost + mark-up), less its discount (Upload a quote's own sum, lib/quotes/upload.ts). */
export const lineMinor = (l: PasteLine) => Math.round((l.qty ?? 1) * ((l.costMinor ?? 0) + (l.markupMinor ?? 0)) * (1 - (l.discountPct ?? 0) / 100))
export const readCount = (groups: UploadGroup[]) => groups.reduce((n, g) => n + g.lines.length, 0)
export const readTotal = (groups: UploadGroup[]) => groups.reduce((n, g) => n + g.lines.reduce((m, l) => m + lineMinor(l), 0), 0)

/** The quote the visitor read, as Quote X-Ray reads a side (its lines by trade, each with its amount) — "Use the quote you read". */
export function readAsLines(read: Pick<TrialRead, 'groups'>): RefLine[] {
  return read.groups.flatMap((g) => g.lines.map((l) => ({
    trade: (l.category || g.name || 'Other').slice(0, 80), room: l.room ? l.room.slice(0, 80) : null, name: l.name.slice(0, 200),
    qty: l.qty && l.qty > 0 ? l.qty : 1, unit: l.unit ? l.unit.slice(0, 20) : null, amountMinor: Math.max(0, lineMinor(l)),
  }))).slice(0, MAX_LINES)
}
