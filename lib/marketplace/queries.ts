import 'server-only'   // libSQL never reaches the browser
import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { marketplaceBanners, marketplaceBrands, marketplaceCategories, marketplaceDealAsks, marketplaceDeals, marketplaceProducts, members, priceBookItems, vendors, type MarketplaceBrand, type MarketplaceDeal } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { fetchBrand } from '@/lib/templates/queries'
import { fetchTrades } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { itemVisible } from '@/lib/company/price-book-rules'
import {
  dealLive, inApp, isAskHow, sortDeals, type BannerView, type BrandCardView, type BrandPageData, type BrandPageView, type DealAsk, type DealView, type Faq, type MarketplaceData,
  type MarketViewer, type ProductView, type VendorLink, type Website,
} from './model'

/*
 * (pending modules S24) The Marketplace as its pages read it — the feed's live brands (never one the feed withdrew), their deals that run
 * today (1.0's API sent only those), the banners in their window, the studio's asks and the two links into its one homes: a brand that is one
 * of the studio's vendors (Finance › Vendors), a product already in its Price book. Every studio role reads it (1.0: owner · admin · id);
 * Accounting's pages are the books (the page's gate, `refusesWorkspace`).
 */

const list = <T,>(raw: string | null | undefined, ok: (x: unknown) => x is T): T[] => { try { const a = JSON.parse(raw ?? '[]'); return Array.isArray(a) ? a.filter(ok) : [] } catch { return [] } }
const isText = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0
const isSite = (x: unknown): x is Website => !!x && typeof x === 'object' && typeof (x as Website).url === 'string' && typeof (x as Website).title === 'string'
const isFaq = (x: unknown): x is Faq => !!x && typeof x === 'object' && typeof (x as Faq).question === 'string' && typeof (x as Faq).answer === 'string'

async function viewerOf(): Promise<MarketViewer & { teamIds: string[] }> {
  const v = await fetchViewer()
  const [m] = await db.select({ name: members.name }).from(members).where(eq(members.id, v.id)).limit(1)
  return { id: v.id, name: m?.name ?? 'You', role: v.role, teamIds: v.teamIds, costs: seesCost(v) }
}

/** The studio's newest ask for each deal — who, when, how. */
async function asksFor(dealIds: string[]): Promise<Map<string, DealAsk>> {
  const out = new Map<string, DealAsk>()
  if (!dealIds.length) return out
  const rows = await db.select({ a: marketplaceDealAsks, name: members.name }).from(marketplaceDealAsks).leftJoin(members, eq(members.id, marketplaceDealAsks.memberId))
    .where(inArray(marketplaceDealAsks.dealId, dealIds)).orderBy(desc(marketplaceDealAsks.createdAt))
  for (const r of rows) if (!out.has(r.a.dealId) && isAskHow(r.a.how)) out.set(r.a.dealId, { by: r.name ?? 'A member', byId: r.a.memberId, at: r.a.createdAt.getTime(), how: r.a.how })
  return out
}

/** The vendor each brand is — the active one it was linked to, or the vendor a merged one went into. */
async function vendorsFor(brandIds: string[]): Promise<Map<string, VendorLink>> {
  const out = new Map<string, VendorLink>()
  if (!brandIds.length) return out
  const linked = await db.select().from(vendors).where(and(isNotNull(vendors.marketplaceBrandId), inArray(vendors.marketplaceBrandId, brandIds)))
  const intoIds = linked.map((v) => v.mergedInto).filter((x): x is string => !!x)
  const into = intoIds.length ? new Map((await db.select().from(vendors).where(inArray(vendors.id, intoIds))).map((v) => [v.id, v])) : new Map()
  /* an active link wins over a merged one; a vendor deactivated by hand still names the brand (Finance reactivates it) */
  for (const v of [...linked].sort((a, b) => Number(!!a.mergedInto) - Number(!!b.mergedInto))) {
    const brand = v.marketplaceBrandId!
    if (out.has(brand)) continue
    const kept = v.mergedInto ? into.get(v.mergedInto) : v
    if (kept && !kept.mergedInto) out.set(brand, { id: kept.id, name: kept.name })
  }
  return out
}

const dealView = (d: MarketplaceDeal, b: Pick<MarketplaceBrand, 'name' | 'whatsapp' | 'email'>, asks: Map<string, DealAsk>): DealView => ({
  id: d.id, brandId: d.brandId, brandName: b.name, title: d.title, description: d.description, terms: d.terms, redemption: d.redemption,
  startsAt: d.startsAt?.getTime() ?? null, endsAt: d.endsAt?.getTime() ?? null, ctaUrl: d.ctaUrl, ctaText: d.ctaText, picture: d.picture, flash: d.flash,
  brandWhatsapp: b.whatsapp, brandEmail: b.email, asked: asks.get(d.id) ?? null,
})
const cardView = (b: MarketplaceBrand, deals: DealView[], vendor: VendorLink | null): BrandCardView => ({
  id: b.id, name: b.name, categories: list(b.categories, isText), tagline: b.tagline, logo: b.logo, cover: b.cover, featuredRank: b.featuredRank, popularity: b.popularity,
  reviews: b.reviews, publishedAt: b.publishedAt.getTime(), whatsapp: b.whatsapp, deals, vendor,
})

async function studioName(): Promise<string> {
  const brand = await fetchBrand()
  return shortStudioName(brand.details.name || 'our studio')
}

/** The Marketplace page: every live brand with its live deals, the categories that hold one, every live deal, the banners in their window. */
export async function fetchMarketplace(): Promise<MarketplaceData> {
  const now = Date.now()
  const [viewer, brands, deals, cats, banners, name] = await Promise.all([
    viewerOf(),
    db.select().from(marketplaceBrands).where(isNull(marketplaceBrands.removedAt)).orderBy(asc(marketplaceBrands.name)),
    db.select().from(marketplaceDeals).where(isNull(marketplaceDeals.removedAt)).orderBy(asc(marketplaceDeals.position)),
    db.select().from(marketplaceCategories).orderBy(asc(marketplaceCategories.position)),
    db.select().from(marketplaceBanners).orderBy(asc(marketplaceBanners.position)),
    studioName(),
  ])
  const byId = new Map(brands.map((b) => [b.id, b]))
  const live = deals.filter((d) => byId.has(d.brandId) && dealLive({ startsAt: d.startsAt?.getTime() ?? null, endsAt: d.endsAt?.getTime() ?? null }, now))
  const [asks, linked] = await Promise.all([asksFor(live.map((d) => d.id)), vendorsFor(brands.map((b) => b.id))])
  const views = live.map((d) => dealView(d, byId.get(d.brandId)!, asks))
  const cards = brands.map((b) => cardView(b, views.filter((d) => d.brandId === b.id), linked.get(b.id) ?? null))
  const counts = new Map<string, number>()
  for (const c of cards) for (const cat of c.categories) counts.set(cat, (counts.get(cat) ?? 0) + 1)
  const bannerViews: BannerView[] = banners
    .filter((n) => (!n.startsAt || n.startsAt.getTime() <= now) && (!n.endsAt || n.endsAt.getTime() >= now))
    .map((n) => ({ id: n.id, picture: n.picture, title: n.title, line: n.line, href: n.href, external: !inApp(n.href) }))
  return {
    categories: cats.filter((c) => (counts.get(c.name) ?? 0) > 0).map((c) => ({ name: c.name, count: counts.get(c.name)! })),
    brands: cards, deals: sortDeals(views), banners: bannerViews,
    viewer: { id: viewer.id, name: viewer.name, role: viewer.role }, studioName: name, now,
  }
}

/** A brand's page, or null when the feed has no such brand (or withdrew it). */
export async function fetchBrandPage(id: string): Promise<BrandPageData | null> {
  const now = Date.now()
  const [b] = await db.select().from(marketplaceBrands).where(and(eq(marketplaceBrands.id, id), isNull(marketplaceBrands.removedAt))).limit(1)
  if (!b) return null
  const [viewer, deals, products, linked, trades, name] = await Promise.all([
    viewerOf(),
    db.select().from(marketplaceDeals).where(and(eq(marketplaceDeals.brandId, id), isNull(marketplaceDeals.removedAt))).orderBy(asc(marketplaceDeals.position)),
    db.select().from(marketplaceProducts).where(and(eq(marketplaceProducts.brandId, id), isNull(marketplaceProducts.removedAt))).orderBy(asc(marketplaceProducts.position)),
    vendorsFor([id]),
    fetchTrades(),
    studioName(),
  ])
  const live = deals.filter((d) => dealLive({ startsAt: d.startsAt?.getTime() ?? null, endsAt: d.endsAt?.getTime() ?? null }, now))
  const asks = await asksFor(live.map((d) => d.id))
  /* the Price book items made from its products — one the viewer may not see (another Designer's proposal) still says it is there */
  const items = products.length ? await db.select({ i: priceBookItems, by: members.name }).from(priceBookItems).leftJoin(members, eq(members.id, priceBookItems.createdBy))
    .where(and(inArray(priceBookItems.marketplaceProductId, products.map((p) => p.id)), isNull(priceBookItems.deletedAt))).orderBy(asc(priceBookItems.createdAt)) : []
  const v = { id: viewer.id, role: viewer.role }
  const productViews: ProductView[] = products.map((p) => {
    const mine = items.filter((x) => x.i.marketplaceProductId === p.id)
    const seen = mine.find((x) => itemVisible(v, x.i)) ?? null
    const hit = seen ?? mine[0] ?? null
    return {
      id: p.id, name: p.name, description: p.description, priceMinor: p.priceMinor, unit: p.unit, link: p.link, picture: p.picture,
      inBook: hit ? { id: hit.i.id, name: hit.i.name, proposed: hit.i.status === 'proposed', visible: !!seen, by: hit.by } : null,
    }
  })
  const card = cardView(b, live.map((d) => dealView(d, b, asks)), linked.get(id) ?? null)
  const page: BrandPageView = {
    ...card, services: b.services, gallery: list(b.gallery, isText), email: b.email, websites: list(b.websites, isSite), instagram: b.instagram, facebook: b.facebook, youtube: b.youtube,
    addresses: list(b.addresses, isText), faqs: list(b.faqs, isFaq), products: productViews,
  }
  const { fetchUnits } = await import('@/lib/settings/queries')   // (S44I — M9)
  return { brand: page, viewer: { id: viewer.id, name: viewer.name, role: viewer.role, costs: viewer.costs }, studioName: name, trades: trades.trades, units: (await fetchUnits()).units, now }
}

/** (the global search) Live brands and their live deals whose words hold the query — a cheap read of the feed's copy. */
export async function marketplaceRecords(): Promise<{ brands: MarketplaceBrand[]; deals: (MarketplaceDeal & { brandName: string })[] }> {
  const now = Date.now()
  const brands = await db.select().from(marketplaceBrands).where(isNull(marketplaceBrands.removedAt))
  const names = new Map(brands.map((b) => [b.id, b.name]))
  const deals = (await db.select().from(marketplaceDeals).where(isNull(marketplaceDeals.removedAt)))
    .filter((d) => names.has(d.brandId) && dealLive({ startsAt: d.startsAt?.getTime() ?? null, endsAt: d.endsAt?.getTime() ?? null }, now))
    .map((d) => ({ ...d, brandName: names.get(d.brandId)! }))
  return { brands, deals }
}
