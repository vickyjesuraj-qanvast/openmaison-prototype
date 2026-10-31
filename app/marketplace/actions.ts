'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { marketplaceBrands, marketplaceDealAsks, marketplaceDeals, marketplaceProducts, members, priceBookItems, vendors, type MarketplaceBrand } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { isSgPhone } from '@/lib/format'
import { NAME_MAX, nameKey } from '@/lib/finance/model'
import { touchCosts } from '@/lib/finance/server'
import { itemVisible } from '@/lib/company/price-book-rules'
import { UNITS } from '@/lib/quotes/items-model'
import { askWay, dealLive, isAskHow, type AskHow, type DealAsk, type VendorLink } from '@/lib/marketplace/model'
import { createPriceBookItem } from '@/app/company/price-book-actions'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

/*
 * (pending modules S24 — card studio:marketplace; its question "Should a brand link to Finance › Vendors or the Price book?" answered as
 * recommended: each to its own home) The studio's three writes on the Marketplace, none of them a purchase:
 *   · a brand joins the studio's vendors — Finance › Vendors, the one list of who supplies the studio (anyone adds a vendor, F1-Q4); a
 *     vendor already of that name is linked rather than doubled;
 *   · a product joins the Price book's My Items with the brand as its vendor (the book's own rule: a Designer's is a proposal, REG-652);
 *   · a Get deal press is recorded — the brand's page, WhatsApp or email opens on the press in the browser, before this lands.
 * Every refusal answers `{ error: <the rule> }`. Accounting's pages are the books; the Marketplace is not one of them (1.0: owner · admin · id).
 */

type Refusal = { error: string }
const GONE_BRAND = 'That brand isn’t on the Marketplace any more'
const GONE_DEAL = 'That deal isn’t on the Marketplace any more'
const BOOKS_ONLY = 'The Marketplace is for the studio’s designers and owners — Accounting works in Finance'
const touch = (brandId: string) => { revalidatePath('/marketplace'); revalidatePath(`/marketplace/${brandId}`) }

async function liveBrand(id: string): Promise<MarketplaceBrand | null> {
  const [b] = await db.select().from(marketplaceBrands).where(and(eq(marketplaceBrands.id, id), isNull(marketplaceBrands.removedAt))).limit(1)
  return b ?? null
}
const firstCategory = (b: MarketplaceBrand) => { try { const a = JSON.parse(b.categories) as unknown; return Array.isArray(a) && typeof a[0] === 'string' ? a[0] : null } catch { return null } }

/** The vendor this brand is: the one linked to it (or the vendor a merged one went into), else an active vendor of the same name — linked
    now — else a new one made from the brand's own details. `how` says which, for the snackbar. */
async function vendorForBrand(b: MarketplaceBrand, memberId: string): Promise<{ vendor: VendorLink; how: 'already' | 'linked' | 'created' }> {
  const linked = await db.select().from(vendors).where(eq(vendors.marketplaceBrandId, b.id))
  const live = linked.find((v) => !v.mergedInto)
  if (live) return { vendor: { id: live.id, name: live.name }, how: 'already' }
  const merged = linked.find((v) => v.mergedInto)
  if (merged?.mergedInto) {
    const [into] = await db.select().from(vendors).where(eq(vendors.id, merged.mergedInto)).limit(1)
    if (into && !into.mergedInto) return { vendor: { id: into.id, name: into.name }, how: 'already' }
  }
  const key = nameKey(b.name)
  const twin = (await db.select().from(vendors).where(eq(vendors.isActive, true))).find((v) => !v.mergedInto && nameKey(v.name) === key)
  const now = new Date()
  if (twin) {
    await db.update(vendors).set({ marketplaceBrandId: b.id, updatedBy: memberId, updatedAt: now }).where(eq(vendors.id, twin.id))
    return { vendor: { id: twin.id, name: twin.name }, how: 'linked' }
  }
  const id = randomUUID()
  await db.insert(vendors).values({
    id, name: b.name.slice(0, NAME_MAX), trade: firstCategory(b), phone: b.whatsapp && isSgPhone(b.whatsapp) ? b.whatsapp : null, email: b.email,
    isActive: true, createdBy: memberId, createdAt: now, updatedAt: now, marketplaceBrandId: b.id,
  })
  return { vendor: { id, name: b.name }, how: 'created' }
}

/** Add to my vendors — the brand in Finance › Vendors, with its mobile and email. Anyone adds a vendor (F1-Q4). */
export async function addBrandToVendors(brandId: string): Promise<{ vendor: VendorLink; how: 'already' | 'linked' | 'created' } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: BOOKS_ONLY }
  const b = await liveBrand(brandId)
  if (!b) return { error: GONE_BRAND }
  const r = await vendorForBrand(b, viewer.id)
  touchCosts(); touch(b.id)
  return r
}

/** Get deal — the record of the press (the brand's page, WhatsApp or email opened in the browser on the press itself). */
export async function askForDeal(dealId: string, o: { how: string }): Promise<{ ask: DealAsk } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: BOOKS_ONLY }
  const [d] = await db.select().from(marketplaceDeals).where(and(eq(marketplaceDeals.id, dealId), isNull(marketplaceDeals.removedAt))).limit(1)
  const b = d ? await liveBrand(d.brandId) : null
  if (!d || !b) return { error: GONE_DEAL }
  const now = Date.now()
  if (!dealLive({ startsAt: d.startsAt?.getTime() ?? null, endsAt: d.endsAt?.getTime() ?? null }, now)) return { error: d.startsAt && d.startsAt.getTime() > now ? 'That deal hasn’t started yet' : 'That deal has ended' }
  const how = String(o?.how ?? '')
  /* the way the dialog used must be one the deal has — its own page, the brand's WhatsApp or its email */
  const ways: AskHow[] = [d.ctaUrl ? 'link' : null, b.whatsapp ? 'whatsapp' : null, b.email ? 'email' : null].filter((x): x is AskHow => !!x)
  if (!isAskHow(how) || !ways.includes(how)) return { error: askWay({ ctaUrl: d.ctaUrl, brandWhatsapp: b.whatsapp, brandEmail: b.email }) ? 'Use the deal’s own button to ask for it' : `${b.name} gives no way to ask for it here — use How to redeem` }
  const at = new Date(now)
  await db.insert(marketplaceDealAsks).values({ id: randomUUID(), dealId: d.id, memberId: viewer.id, how, createdAt: at })
  touch(b.id)
  const [me] = await db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1)
  return { ask: { by: me?.name ?? 'You', byId: viewer.id, at: now, how } }
}

export type ProductToBook = { name: string; category: string | null; unit: string; costMinor: number; markupMinor: number }
const PRICE_MAX = 100_000_000

/** Add to Price book — the product in My Items, with its words, picture and page, the brand as its vendor (made one of the studio's vendors
    if it isn't — said in the dialog), filed by the book's rule for whoever adds it. */
export async function addProductToPriceBook(productId: string, input: ProductToBook): Promise<{ item: { id: string; name: string; proposed: boolean }; vendor: VendorLink & { added: boolean } } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: BOOKS_ONLY }
  const [p] = await db.select().from(marketplaceProducts).where(and(eq(marketplaceProducts.id, productId), isNull(marketplaceProducts.removedAt))).limit(1)
  const b = p ? await liveBrand(p.brandId) : null
  if (!p || !b) return { error: 'That product isn’t on the Marketplace any more' }
  const name = String(input?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
  if (!name) return { error: 'Give the item a name' }
  const studioUnits = (await (await import('@/lib/settings/queries')).fetchUnits()).units   // (S44I — M9) the studio's own units
  const unit = [...studioUnits, ...UNITS].find((u) => u.toLowerCase() === String(input?.unit ?? '').trim().toLowerCase()) ?? null
  if (!unit) return { error: 'Pick the item’s unit' }
  const cost = Math.round(Number(input?.costMinor)), markup = Math.round(Number(input?.markupMinor) || 0)
  if (!Number.isFinite(cost) || cost < 0) return { error: 'Enter what the studio pays for it' }
  if (cost > PRICE_MAX || Math.abs(markup) > PRICE_MAX) return { error: 'That price is too large' }
  if (markup < -cost) return { error: 'The markup can’t take the price below nothing' }
  /* one entry per product: a second press opens the first (a Designer's own proposal included) */
  const had = await db.select().from(priceBookItems).where(and(eq(priceBookItems.marketplaceProductId, p.id), isNull(priceBookItems.deletedAt)))
  if (had.some((i) => itemVisible({ id: viewer.id, role: viewer.role }, i))) return { error: 'It’s in the Price book already — open it there' }
  if (had.length) return { error: 'Someone has proposed it for the Price book already — an Owner or an Admin approves it' }
  const v = await vendorForBrand(b, viewer.id)
  const category = typeof input?.category === 'string' && input.category.trim() ? input.category.trim().slice(0, 60) : null
  const item = await orThrow(createPriceBookItem({ name, description: p.description, kind: 'purchase', unit, costMinor: cost, markupMinor: markup, category, vendor: v.vendor.name, link: p.link, thumb: p.picture }))
  await db.update(priceBookItems).set({ marketplaceProductId: p.id }).where(eq(priceBookItems.id, item.id))
  if (v.how !== 'already') touchCosts()
  touch(b.id)
  return { item: { id: item.id, name: item.name, proposed: item.status === 'proposed' }, vendor: { ...v.vendor, added: v.how === 'created' } }
}
