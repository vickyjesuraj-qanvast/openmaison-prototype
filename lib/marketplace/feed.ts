/**
 * (pending modules S24) The seam to Qanvast's brand feed — pure, server- and script-safe. 1.0 read Qanvast's brand API through `/api/qanvast/*`
 * (src/app/(main)/marketplace/_api.ts: brands, brand-promo, categories, brand/[id] — the routes themselves are not in the 1.0 repo, so its page
 * loaded nothing). These are that API's shapes as 1.0 typed them, and the one mapper from them to the studio's copy (lib/db/schema.ts
 * `marketplace_*`): the demo's catalogue (lib/marketplace/demo.ts) is written in the feed's own shape and goes through this mapper, so a real
 * feed is the developers' fetch of the same payload into `feedStatements` — nothing on a page changes.
 */
import { UNITS } from '@/lib/quotes/items-model'

export type FeedImage = { baseUrl: string }
/** 1.0's BrandPromoModel, the fields it read. */
export type FeedPromo = {
  id: number; title: string; description?: string; terms?: string; redemption?: string; startDate?: string; endDate?: string
  ctaUrl?: string; ctaText?: string; isDeleted?: boolean; isFlashDeal?: boolean; images?: { Cover?: FeedImage }
}
/** 1.0's BrandProductModel (its `price` is words, as the brand typed them). */
export type FeedProduct = { id: number; name: string; description?: string; externalUrl?: string; price?: string; isPublished?: boolean; image?: FeedImage }
/** 1.0's BrandModel, the fields it read (`reviewCount` is what its Most reviews sort ranked by on the server). */
export type FeedBrand = {
  id: number; title: string; categories: string[]; categoryTexts?: string[]; locations?: unknown[]; products?: FeedProduct[]; brandPromos?: FeedPromo[]
  isPublished: boolean; publishedAt: string; whatsappContact?: number | string; leadCount?: string; reviewCount?: number; featuredRank?: number | null
  editorNote?: string; quote?: string; email?: string; facebook?: string; instagram?: string; youtube?: string
  websites?: { title: string; url: string }[]; faqs?: { question: string; answer: string }[]
  images?: { Cover?: FeedImage; Logo?: FeedImage; Gallery?: FeedImage[] }
}
/** 1.0's CategoryModel (`isEmpty` — a category with no brand, which 1.0 hid). */
export type FeedCategory = { id: number | string; category: string; isEmpty?: boolean }
/** 1.0's BrandHeroBanner (its list was a fixed array, empty), with the words 2.0 draws over the picture instead of baking them into it. */
export type FeedBanner = { id: number; image: string; link: string; title: string; line?: string; startDate?: string; endDate?: string }
export type FeedPayload = { categories: FeedCategory[]; brands: FeedBrand[]; banners: FeedBanner[] }

/* ── the mapper ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const clean = (v: unknown, max = 2000) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max); return s || null }
const at = (iso: string | undefined | null): number | null => { if (!iso) return null; const t = Date.parse(iso); return Number.isFinite(t) ? t : null }
const isWeb = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\/[^\s]+$/i.test(u)
/** A picture's address: the studio's own copy (a path in the app) as it is, else the CDN's sized file — 1.0's `${baseUrl}/w${width}`. */
export const feedPicture = (img: FeedImage | undefined | null, width = 1200): string | null => (!img?.baseUrl ? null : img.baseUrl.startsWith('/') ? img.baseUrl : `${img.baseUrl}/w${width}`)
/** A logo: 1.0's `${baseUrl}/thumbnail-nofill`. */
export const feedLogo = (img: FeedImage | undefined | null): string | null => (!img?.baseUrl ? null : img.baseUrl.startsWith('/') ? img.baseUrl : `${img.baseUrl}/thumbnail-nofill`)
/** A WhatsApp number as the studio keeps one — the last eight digits (1.0 dialled `wa.me/65${whatsappContact}`). */
export const feedPhone = (v: unknown): string | null => { const d = String(v ?? '').replace(/\D/g, '').slice(-8); return /^[689]\d{7}$/.test(d) ? d : null }

/** 1.0's `getLocationAddresses`: a location is words, or an object with an address, or one put together from its parts — each once. */
export function feedAddresses(locations: unknown[] | undefined): string[] {
  const out = (locations ?? []).map((l) => {
    if (typeof l === 'string') return l.trim()
    if (!l || typeof l !== 'object') return ''
    const v = l as Record<string, unknown>
    for (const k of ['address', 'fullAddress', 'formattedAddress', 'streetAddress']) { const d = v[k]; if (typeof d === 'string' && d.trim()) return d.trim() }
    return ['block', 'street', 'unitNo', 'buildingName', 'postalCode'].map((k) => v[k]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join(', ')
  }).filter((a) => a.length > 0)
  return [...new Set(out)]
}

/** The unit a price's words name, as a quote counts it. */
const UNIT_OF: [RegExp, (typeof UNITS)[number]][] = [[/\b(sq\.?\s?ft|sqft|square feet|psf)\b/i, 'sqft'], [/\bft\.?\s?run\b|\brunning (ft|foot|feet)\b/i, 'ft run'], [/\bsets?\b/i, 'set'],
  [/\bpoints?\b/i, 'point'], [/\b(hours?|hr)\b/i, 'hour'], [/\blots?\b/i, 'Lot'], [/\b(pieces?|pcs?|units?|each|panels?)\b/i, 'Pieces']]
/** A product's price from the brand's words — "S$2,480", "From $5.50 per sqft", "$165 / panel" — as cents and a quote unit; nothing when it
    names no amount. */
export function feedPrice(words: string | undefined | null): { priceMinor: number | null; unit: string | null } {
  const w = String(words ?? '')
  const m = /(\d[\d,]*(?:\.\d{1,2})?)/.exec(w)
  if (!m) return { priceMinor: null, unit: null }
  const n = Number(m[1]!.replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return { priceMinor: null, unit: null }
  const rest = w.slice(m.index + m[1]!.length)
  const unit = /(?:per|\/|a)\s*/i.test(rest) ? UNIT_OF.find(([re]) => re.test(rest))?.[1] ?? null : null
  return { priceMinor: Math.round(n * 100), unit }
}

export type FeedRows = {
  categories: { id: string; name: string; position: number; feedRef: string }[]
  brands: {
    id: string; name: string; categories: string; tagline: string | null; services: string | null; logo: string | null; cover: string | null; gallery: string
    whatsapp: string | null; email: string | null; websites: string; instagram: string | null; facebook: string | null; youtube: string | null; addresses: string; faqs: string
    featuredRank: number | null; popularity: number; reviews: number; publishedAt: number; feedRef: string
  }[]
  deals: { id: string; brandId: string; title: string; description: string | null; terms: string | null; redemption: string | null; startsAt: number | null; endsAt: number | null; ctaUrl: string | null; ctaText: string | null; picture: string | null; flash: boolean; position: number; feedRef: string }[]
  products: { id: string; brandId: string; name: string; description: string | null; priceMinor: number | null; unit: string | null; link: string | null; picture: string | null; position: number; feedRef: string }[]
  banners: { id: string; picture: string; title: string; line: string | null; href: string; position: number; startsAt: number | null; endsAt: number | null; feedRef: string }[]
}
/** The studio's ids for the feed's records — the feed's own id, prefixed by kind, so a second sync finds the same row. */
export const brandId = (feedId: number | string) => `mkb-${feedId}`
export const dealId = (feedId: number | string) => `mkd-${feedId}`
export const productId = (feedId: number | string) => `mkp-${feedId}`
export const categoryId = (feedId: number | string) => `mkc-${feedId}`
export const bannerId = (feedId: number | string) => `mkn-${feedId}`

/** The feed's payload as the studio's rows. Only what is published: a brand not published, a deal 1.0 marked deleted, a product not published
    and an empty category are left out — the writer then marks what the feed no longer sends as removed. */
export function rowsFromFeed(feed: FeedPayload): FeedRows {
  const out: FeedRows = { categories: [], brands: [], deals: [], products: [], banners: [] }
  const live = feed.brands.filter((b) => b.isPublished && clean(b.title))
  const used = new Set(live.flatMap((b) => (b.categoryTexts?.length ? b.categoryTexts : b.categories)))
  feed.categories.filter((c) => !c.isEmpty && used.has(c.category)).forEach((c, i) => out.categories.push({ id: categoryId(c.id), name: c.category, position: i, feedRef: String(c.id) }))
  for (const b of live) {
    const id = brandId(b.id)
    const websites = (b.websites ?? []).filter((s) => isWeb(s.url)).map((s) => ({ title: clean(s.title, 80) ?? 'Website', url: s.url }))
    out.brands.push({
      id, name: clean(b.title, 120)!, categories: JSON.stringify(b.categoryTexts?.length ? b.categoryTexts : b.categories), tagline: clean(b.quote, 200), services: clean(b.editorNote, 4000),
      logo: feedLogo(b.images?.Logo), cover: feedPicture(b.images?.Cover), gallery: JSON.stringify((b.images?.Gallery ?? []).map((g) => feedPicture(g)).filter(Boolean)),
      whatsapp: feedPhone(b.whatsappContact), email: clean(b.email, 120), websites: JSON.stringify(websites),
      instagram: isWeb(b.instagram) ? b.instagram : null, facebook: isWeb(b.facebook) ? b.facebook : null, youtube: isWeb(b.youtube) ? b.youtube : null,
      addresses: JSON.stringify(feedAddresses(b.locations)), faqs: JSON.stringify((b.faqs ?? []).filter((f) => clean(f.question) && clean(f.answer)).map((f) => ({ question: clean(f.question, 300)!, answer: clean(f.answer, 2000)! }))),
      featuredRank: typeof b.featuredRank === 'number' ? b.featuredRank : null, popularity: Number(b.leadCount) || 0, reviews: Math.max(0, Math.round(Number(b.reviewCount) || 0)),
      publishedAt: at(b.publishedAt) ?? 0, feedRef: String(b.id),
    })
    ;(b.brandPromos ?? []).filter((p) => !p.isDeleted && clean(p.title)).forEach((p, i) => out.deals.push({
      id: dealId(p.id), brandId: id, title: clean(p.title, 160)!, description: clean(p.description), terms: clean(p.terms), redemption: clean(p.redemption),
      startsAt: at(p.startDate), endsAt: at(p.endDate), ctaUrl: isWeb(p.ctaUrl) ? p.ctaUrl : null, ctaText: clean(p.ctaText, 40), picture: feedPicture(p.images?.Cover, 800),
      flash: !!p.isFlashDeal, position: i, feedRef: String(p.id),
    }))
    ;(b.products ?? []).filter((p) => p.isPublished !== false && clean(p.name)).forEach((p, i) => {
      const price = feedPrice(p.price)
      out.products.push({ id: productId(p.id), brandId: id, name: clean(p.name, 120)!, description: clean(p.description), ...price, link: isWeb(p.externalUrl) ? p.externalUrl : null, picture: feedPicture(p.image, 600), position: i, feedRef: String(p.id) })
    })
  }
  feed.banners.filter((n) => clean(n.title) && n.image && n.link).forEach((n, i) => out.banners.push({
    id: bannerId(n.id), picture: n.image, title: clean(n.title, 120)!, line: clean(n.line, 200), href: n.link, position: i, startsAt: at(n.startDate), endsAt: at(n.endDate), feedRef: String(n.id),
  }))
  return out
}

type Stmt = { sql: string; args: (string | number | null)[] }
/** The writes that bring the studio's copy in line with the feed, in one batch: every row upserted by its id; a brand, deal or product the
    feed stopped sending is marked removed (never deleted — a vendor or a Price book item may point at it), one it sends again is back; the
    categories and the banners are the feed's whole list. The studio's own rows (asks, vendors, the Price book) are never touched. */
export function feedStatements(rows: FeedRows, now: number): Stmt[] {
  const s: Stmt[] = []
  const ids = (list: { id: string }[]) => (list.length ? list.map((r) => `'${r.id.replace(/'/g, "''")}'`).join(',') : "''")
  s.push({ sql: `DELETE FROM marketplace_categories WHERE id NOT IN (${ids(rows.categories)})`, args: [] })
  for (const c of rows.categories) s.push({ sql: `INSERT INTO marketplace_categories (id, name, position, feed_ref, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, position = excluded.position, feed_ref = excluded.feed_ref, updated_at = excluded.updated_at`, args: [c.id, c.name, c.position, c.feedRef, now] })
  for (const b of rows.brands) {
    s.push({ sql: `INSERT INTO marketplace_brands (id, name, categories, tagline, services, logo, cover, gallery, whatsapp, email, websites, instagram, facebook, youtube, addresses, faqs, featured_rank, popularity, reviews, published_at, feed_ref, updated_at, removed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                   ON CONFLICT(id) DO UPDATE SET name = excluded.name, categories = excluded.categories, tagline = excluded.tagline, services = excluded.services, logo = excluded.logo, cover = excluded.cover, gallery = excluded.gallery,
                     whatsapp = excluded.whatsapp, email = excluded.email, websites = excluded.websites, instagram = excluded.instagram, facebook = excluded.facebook, youtube = excluded.youtube, addresses = excluded.addresses,
                     faqs = excluded.faqs, featured_rank = excluded.featured_rank, popularity = excluded.popularity, reviews = excluded.reviews, published_at = excluded.published_at, feed_ref = excluded.feed_ref, updated_at = excluded.updated_at, removed_at = NULL`,
      args: [b.id, b.name, b.categories, b.tagline, b.services, b.logo, b.cover, b.gallery, b.whatsapp, b.email, b.websites, b.instagram, b.facebook, b.youtube, b.addresses, b.faqs, b.featuredRank, b.popularity, b.reviews, b.publishedAt, b.feedRef, now] })
  }
  for (const d of rows.deals) {
    s.push({ sql: `INSERT INTO marketplace_deals (id, brand_id, title, description, terms, redemption, starts_at, ends_at, cta_url, cta_text, picture, flash, position, feed_ref, updated_at, removed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                   ON CONFLICT(id) DO UPDATE SET brand_id = excluded.brand_id, title = excluded.title, description = excluded.description, terms = excluded.terms, redemption = excluded.redemption, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
                     cta_url = excluded.cta_url, cta_text = excluded.cta_text, picture = excluded.picture, flash = excluded.flash, position = excluded.position, feed_ref = excluded.feed_ref, updated_at = excluded.updated_at, removed_at = NULL`,
      args: [d.id, d.brandId, d.title, d.description, d.terms, d.redemption, d.startsAt, d.endsAt, d.ctaUrl, d.ctaText, d.picture, d.flash ? 1 : 0, d.position, d.feedRef, now] })
  }
  for (const p of rows.products) {
    s.push({ sql: `INSERT INTO marketplace_products (id, brand_id, name, description, price_minor, unit, link, picture, position, feed_ref, updated_at, removed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                   ON CONFLICT(id) DO UPDATE SET brand_id = excluded.brand_id, name = excluded.name, description = excluded.description, price_minor = excluded.price_minor, unit = excluded.unit, link = excluded.link, picture = excluded.picture,
                     position = excluded.position, feed_ref = excluded.feed_ref, updated_at = excluded.updated_at, removed_at = NULL`,
      args: [p.id, p.brandId, p.name, p.description, p.priceMinor, p.unit, p.link, p.picture, p.position, p.feedRef, now] })
  }
  s.push({ sql: `UPDATE marketplace_brands SET removed_at = ? WHERE removed_at IS NULL AND id NOT IN (${ids(rows.brands)})`, args: [now] })
  s.push({ sql: `UPDATE marketplace_deals SET removed_at = ? WHERE removed_at IS NULL AND id NOT IN (${ids(rows.deals)})`, args: [now] })
  s.push({ sql: `UPDATE marketplace_products SET removed_at = ? WHERE removed_at IS NULL AND id NOT IN (${ids(rows.products)})`, args: [now] })
  s.push({ sql: `DELETE FROM marketplace_banners WHERE id NOT IN (${ids(rows.banners)})`, args: [] })
  for (const n of rows.banners) s.push({ sql: `INSERT INTO marketplace_banners (id, picture, title, line, href, position, starts_at, ends_at, feed_ref, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET picture = excluded.picture, title = excluded.title, line = excluded.line, href = excluded.href, position = excluded.position, starts_at = excluded.starts_at, ends_at = excluded.ends_at, feed_ref = excluded.feed_ref, updated_at = excluded.updated_at`,
    args: [n.id, n.picture, n.title, n.line, n.href, n.position, n.startsAt, n.endsAt, n.feedRef, now] })
  return s
}
