/**
 * Items section vocabulary (1260:31209 · 1271:40400 · reference screenshots, owner 2026-09-11) — client-safe.
 */
export const ITEM_STATUSES = ['Pending', 'Approved', 'Declined'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]
export const isItemStatus = (s: string): s is ItemStatus => (ITEM_STATUSES as readonly string[]).includes(s)
/** Status chip (1260:31267 · 31303 · 31337): glyph + tint. */
export const ITEM_STATUS_CHIP: Record<ItemStatus, { icon: string; tone: 'yellow' | 'green' | 'red' }> = {
  Pending: { icon: 'hourglass_top', tone: 'yellow' },
  Approved: { icon: 'check_circle', tone: 'green' },
  Declined: { icon: 'warning', tone: 'red' },
}

/** Use Icon (1271:41123): the five item kinds and their glyphs; labels per the owner (Design · Fee · Labour · Delivery · Purchase). */
export const ITEM_KINDS = ['design', 'fee', 'labour', 'delivery', 'purchase'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]
export const ITEM_KIND_ICON: Record<ItemKind, string> = { design: 'design_services', fee: 'attach_money', labour: 'handyman', delivery: 'local_shipping', purchase: 'shopping_cart' }
export const ITEM_KIND_LABEL: Record<ItemKind, string> = { design: 'Design', fee: 'Fee', labour: 'Labour', delivery: 'Delivery', purchase: 'Purchase' }
export const isItemKind = (s: string | null | undefined): s is ItemKind => !!s && (ITEM_KINDS as readonly string[]).includes(s)

/** Unit types the studio prices by (the mock's "Pieces" + "Add Unit Type"; the rest are how Singapore renovation quotes are lined). */
export const UNITS = ['Pieces', 'Lot', 'sqft', 'ft run', 'point', 'hour', 'set'] as const

/** In the menu's order (1271:40931): Hide Items · Show Items without Pricing · Show Items with Pricing. */
export const VISIBILITIES = ['hidden', 'no-price', 'visible'] as const
export type Visibility = (typeof VISIBILITIES)[number]
/** Visibility menu (1271:40931): "Customize visibility for your client". */
export const VISIBILITY_LABEL: Record<Visibility, string> = { hidden: 'Hide Items', 'no-price': 'Show Items without Pricing', visible: 'Show Items with Pricing' }
export const isVisibility = (s: string): s is Visibility => (VISIBILITIES as readonly string[]).includes(s)

export const ITEM_VIEWS = ['none', 'category', 'room', 'section'] as const
export type ItemsView = (typeof ITEM_VIEWS)[number]
export const ITEM_VIEW_LABEL: Record<ItemsView, string> = { none: 'None', category: 'Category', room: 'Room', section: 'Section' }
export const isItemsView = (s: string): s is ItemsView => (ITEM_VIEWS as readonly string[]).includes(s)
/** The bucket a line with no label falls into, per view (reference: "Uncategorized" for categories, "Unassigned" for rooms / sections). */
export const UNLABELLED: Record<Exclude<ItemsView, 'none'>, string> = { category: 'Uncategorized', room: 'Unassigned', section: 'Unassigned' }

export const DENSITIES = ['single', 'double', 'triple'] as const
export type ItemsDensity = (typeof DENSITIES)[number]
/** The table's base state clamps the description to two lines (1260:31372) — Double is the default (owner 2026-09-15). */
export const DEFAULT_DENSITY: ItemsDensity = 'double'
export const DENSITY_LABEL: Record<ItemsDensity, string> = { single: 'Single', double: 'Double', triple: 'Triple' }
export const isDensity = (s: string): s is ItemsDensity => (DENSITIES as readonly string[]).includes(s)

/** Column settings (1271:41169): the mocked catalogue in its order — plus Section, which the Section view needs (REG-415) — the mocked ON set is the table's default. */
export const COLUMN_KEYS = ['sku', 'status', 'type', 'category', 'section', 'qty', 'unit', 'cost', 'msrp', 'markup', 'margin', 'unitPrice', 'discount', 'gst', 'room', 'color', 'dimensions', 'materials', 'shipping', 'shippingMarkup', 'taxable', 'vendor', 'website'] as const
export type ColumnKey = (typeof COLUMN_KEYS)[number]
export const COLUMN_LABEL: Record<ColumnKey, string> = {
  sku: 'SKU', status: 'Status', type: 'Type', category: 'Category', section: 'Section', qty: 'Qty', unit: 'Unit', cost: 'Cost', msrp: 'MSRP', markup: 'Markup', margin: 'Margin',
  unitPrice: 'Unit Price', discount: 'Discount', gst: 'GST (%)', room: 'Room', color: 'Color', dimensions: 'Dimensions', materials: 'Materials',
  shipping: 'Shipping', shippingMarkup: 'Shipping Markup', taxable: 'Taxable', vendor: 'Vendor/Sub', website: 'Website Link',
}
/** Columns the table can actually render today (the rest are in the catalogue, off, and answer coming soon when switched on). */
export const RENDERABLE_COLUMNS: readonly ColumnKey[] = ['status', 'qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst', 'room', 'category', 'section', 'type', 'margin']
export type ColumnSettings = { details: { description: boolean; images: boolean; autonumber: boolean }; columns: { key: ColumnKey; on: boolean }[] }
/** The table as mocked (1260:31209, updated 2026-09-15 — the STATUS column left the default set, REG-426): Qty · Unit · Cost ·
    Markup · Unit Price · Discount · GST (%). Status stays in the catalogue (1271:41169 lists it) and turns on in Column settings. */
export const DEFAULT_COLUMNS: ColumnSettings = {
  details: { description: true, images: true, autonumber: true },
  columns: COLUMN_KEYS.map((key) => ({ key, on: ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst'].includes(key) })),
}
export function parseColumns(json: string | null | undefined): ColumnSettings {
  let raw: unknown = null
  if (json) { try { raw = JSON.parse(json) } catch { raw = null } }
  const r = (raw ?? {}) as Partial<ColumnSettings>
  const seen = new Set<ColumnKey>()
  const columns: ColumnSettings['columns'] = []
  for (const c of Array.isArray(r.columns) ? r.columns : []) {
    if (c && (COLUMN_KEYS as readonly string[]).includes(c.key) && !seen.has(c.key)) { seen.add(c.key); columns.push({ key: c.key, on: !!c.on }) }
  }
  for (const d of DEFAULT_COLUMNS.columns) if (!seen.has(d.key)) columns.push({ ...d })
  const d = r.details ?? DEFAULT_COLUMNS.details
  return { details: { description: d.description !== false, images: d.images !== false, autonumber: d.autonumber !== false }, columns }
}

export type ItemLabels = { categories: string[]; rooms: string[]; sections: string[] }
export function parseLabels(json: string | null | undefined): ItemLabels {
  let raw: unknown = null
  if (json) { try { raw = JSON.parse(json) } catch { raw = null } }
  const r = (raw ?? {}) as Partial<Record<keyof ItemLabels, unknown>>
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 50) : [])
  return { categories: list(r.categories), rooms: list(r.rooms), sections: list(r.sections) }
}

/** Reference row menu (owner 2026-09-11; "Create Document(s)" dropped — REG-410). */
export type RowMenuAction = 'library' | 'duplicate' | 'copyName' | 'group' | 'showFull' | 'addAbove' | 'addBelow' | 'moveUp' | 'moveDown' | 'remove'
