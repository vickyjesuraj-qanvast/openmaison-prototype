/**
 * What every template picker draws (REG-494): the published templates as the client sees them — design, defaults, version —
 * plus the kit and the sample quote to draw them with. Built on the server from the rows, carried to the Create Quote
 * modal, the quote editor's Template card and the Preview. Client-safe.
 */
import type { QuoteTemplate } from '@/lib/db/schema'
import { parseDefaults, parseDesign, type BrandKit, type ItemsBlock, type TemplateDefaults, type TemplateDesign } from './model'
import { presetByKey } from './presets'
import type { DocData } from './data'
import type { FolderNode } from '@/lib/folders'

/** The starter sections as typed, trimmed, without the empty lines. */
export const cleanGroups = (g: string[]) => g.map((x) => x.trim()).filter(Boolean)

export type PickerTemplate = {
  id: string
  name: string
  version: number
  isDefault: boolean
  paper: string
  lastUsedAt: number | null
  design: TemplateDesign
  defaults: TemplateDefaults
  /** (REG-664) Its folder in Templates › Quotes (null = the top). */
  folderId: string | null
}
/** (REG-538) `splits` and `texts` name what a template's defaults point at — the payment library and the text library — so the facts read "Deposit-heavy 20/40/40" and "Standard T&Cs", not a key. */
export type PickerData = { templates: PickerTemplate[]; brand: BrandKit; sample: DocData; splits?: { id: string; name: string }[]; texts?: { id: string; kind: string; title: string }[]
  /** (REG-664) The studio's quote-template folders — the picker browses them as the gallery does. */
  folders?: FolderNode[] }
export type PickerExtras = Pick<PickerData, 'splits' | 'texts' | 'folders'>

export function toPickerTemplate(row: QuoteTemplate): PickerTemplate {
  return {
    id: row.id, name: row.name, version: row.version, isDefault: row.isDefault, paper: row.paper, lastUsedAt: row.lastUsedAt ? row.lastUsedAt.getTime() : null,
    design: parseDesign(row.designJson, presetByKey('letter').design()), defaults: parseDefaults(row.defaultsJson), folderId: row.folderId ?? null,
  }
}
/** Only published templates can start or print a quote; the default first, then the most recently used. */
export const pickerTemplates = (rows: QuoteTemplate[]): PickerTemplate[] =>
  rows.filter((r) => r.status === 'published' && !r.deletedAt).map(toPickerTemplate).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))

/** The words a picker prints under a template: what a quote from it starts with. */
export function startsWith(t: PickerTemplate, paymentLabel: (key: string | null) => string, texts: { id: string; kind: string; title: string }[] = []): { sections: string; payments: string; validity: string; grouping: string; text: string } {
  const items = t.design.blocks.find((b): b is ItemsBlock => b.kind === 'items')
  const grouping = !items || items.groupBy === 'none' ? 'Your own sections' : `${{ category: 'By trade', room: 'By room', section: 'By section label' }[items.groupBy]}${items.subGroupBy !== 'none' ? ` › ${items.subGroupBy}` : ''}`
  return {
    sections: cleanGroups(t.defaults.starterGroups).length ? cleanGroups(t.defaults.starterGroups).join(' · ') : 'No starter sections',
    payments: paymentLabel(t.defaults.paymentPreset), validity: `Valid ${t.defaults.validityDays} days${t.defaults.gstEnabled ? ' · GST' : ' · no GST'}${t.defaults.signatureRequired ? ' · signs online' : ' · signs on paper'}`,   // (REG-578) the switch's own words
    grouping,
    // (REG-538) Which Terms and Notes templates a new quote opens with — 'None' when the quote writes its own.
    text: [t.defaults.termsTemplateId ? texts.find((x) => x.id === t.defaults.termsTemplateId)?.title ?? null : null, t.defaults.notesTemplateId ? texts.find((x) => x.id === t.defaults.notesTemplateId)?.title ?? null : null].filter((x): x is string => !!x).join(' · ') || 'None — written on the quote',
  }
}

/** The quote editor's View by a template's items grouping maps to (REG-497). */
export function viewForTemplate(design: TemplateDesign): 'none' | 'category' | 'room' | 'section' {
  const items = design.blocks.find((b): b is ItemsBlock => b.kind === 'items')
  return items ? items.groupBy : 'none'
}

/** The editor columns that print for the client under a template (REG-497): the items block's columns, mapped to the table's keys. */
export function clientColumnsOf(design: TemplateDesign): Set<string> {
  const items = design.blocks.find((b): b is ItemsBlock => b.kind === 'items')
  const on = new Set((items?.columns ?? []).filter((c) => c.on).map((c) => c.key))
  const out = new Set<string>()
  if (on.has('qty') || on.has('qtyUnit')) out.add('qty')
  if (on.has('unit') || on.has('qtyUnit')) out.add('unit')
  if (on.has('unitPrice')) out.add('unitPrice')
  if (on.has('discount')) out.add('discount')
  if (items?.groupBy === 'room' || items?.subGroupBy === 'room') out.add('room')
  if (items?.groupBy === 'category' || items?.subGroupBy === 'category') out.add('category')
  if (items?.groupBy === 'section') out.add('section')
  return out
}
