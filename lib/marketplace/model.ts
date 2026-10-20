/**
 * (pending modules S24 — card studio:marketplace, his "build all of them" 2026-10-11) The Marketplace's words and rules, pure and client-safe:
 * what a brand, a deal, a product and a banner are as the pages read them, the sorts 1.0 offered (Most popular · Most recent · Most reviews,
 * a featured brand first under Most popular — 1.0's order), when a deal runs and what its dates say, how Get deal reaches the brand (its own
 * page, WhatsApp or email — never a pretend checkout), and the message a press drafts. The records are Qanvast's feed (lib/marketplace/feed.ts);
 * the studio's own are its asks and the two links into its one home for each kind — Finance › Vendors for a brand, the Price book for a product.
 */
import { displayDate, money } from '@/lib/format'

/** 1.0's page size (`PER_PAGE`): Show more adds as many again. */
export const PAGE_SIZE = 12

export type MarketView = 'brands' | 'deals'
export const isMarketView = (v: string | null | undefined): v is MarketView => v === 'brands' || v === 'deals'

/** 1.0's three sorts (filter-sort-panel.tsx `SORT_OPTIONS`), its words made plain. */
export type BrandSort = 'popular' | 'recent' | 'reviews'
export const SORTS: { key: BrandSort; label: string }[] = [
  { key: 'popular', label: 'Most popular' },
  { key: 'recent', label: 'Most recent' },
  { key: 'reviews', label: 'Most reviews' },
]
export const isBrandSort = (v: string | null | undefined): v is BrandSort => SORTS.some((s) => s.key === v)
export const sortLabel = (s: BrandSort) => SORTS.find((x) => x.key === s)?.label ?? 'Most popular'

/** How a Get deal press reaches the brand: the brand's own page for the deal, a WhatsApp message, an email. */
export type AskHow = 'link' | 'whatsapp' | 'email'
export const isAskHow = (v: string): v is AskHow => v === 'link' || v === 'whatsapp' || v === 'email'

export type DealAsk = { by: string; byId: string; at: number; how: AskHow }
export type DealView = {
  id: string
  brandId: string
  brandName: string
  title: string
  description: string | null
  terms: string | null
  redemption: string | null
  startsAt: number | null
  endsAt: number | null
  ctaUrl: string | null
  ctaText: string | null
  picture: string | null
  flash: boolean
  /** the brand's ways in, for Get deal */
  brandWhatsapp: string | null
  brandEmail: string | null
  /** the studio's newest ask for it */
  asked: DealAsk | null
}
export type VendorLink = { id: string; name: string }
export type BrandCardView = {
  id: string
  name: string
  categories: string[]
  tagline: string | null
  logo: string | null
  cover: string | null
  featuredRank: number | null
  popularity: number
  reviews: number
  publishedAt: number
  whatsapp: string | null
  /** its live deals, the order the brand gave them */
  deals: DealView[]
  /** the studio's vendor that is this brand (Finance › Vendors), if it is one */
  vendor: VendorLink | null
}
export type ProductView = {
  id: string
  name: string
  description: string | null
  priceMinor: number | null
  unit: string | null
  link: string | null
  picture: string | null
  /** the Price book item made from it (live or proposed — a deleted one gives the product back); `visible` — the viewer sees it (another
      Designer's proposal is there but not theirs to open), `by` — whoever added it */
  inBook: { id: string; name: string; proposed: boolean; visible: boolean; by: string | null } | null
}
export type Website = { title: string; url: string }
export type Faq = { question: string; answer: string }
export type BrandPageView = BrandCardView & {
  services: string | null
  gallery: string[]
  email: string | null
  websites: Website[]
  instagram: string | null
  facebook: string | null
  youtube: string | null
  addresses: string[]
  faqs: Faq[]
  products: ProductView[]
}
export type BannerView = { id: string; picture: string; title: string; line: string | null; href: string; external: boolean }
export type MarketCategory = { name: string; count: number }
export type MarketViewer = { id: string; name: string; role: string; /** (pending modules S41b-1) sees costs — else Add to Price book asks a unit price only */ costs?: boolean }
export type MarketplaceData = {
  categories: MarketCategory[]
  brands: BrandCardView[]
  deals: DealView[]
  banners: BannerView[]
  viewer: MarketViewer
  studioName: string
  now: number
}
export type BrandPageData = {
  brand: BrandPageView
  viewer: MarketViewer
  studioName: string
  /** the studio's trades — a product added to the Price book takes one as its category */
  trades: string[]
  /** (S44I — M9) the studio's units — Add to Price book's Unit list */
  units?: string[]
  now: number
}

/* ── when a deal runs ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const DAY = 86_400_000
const dayStart = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
/** A deal is live from its first day to the end of its last; a deal with no dates runs until the brand withdraws it. */
export const dealLive = (d: { startsAt: number | null; endsAt: number | null }, now: number) => (d.startsAt == null || d.startsAt <= now) && (d.endsAt == null || d.endsAt >= now)
export const dealUpcoming = (d: { startsAt: number | null }, now: number) => d.startsAt != null && d.startsAt > now
/** Whole days from today to the deal's last day — 0 = ends today. */
export const daysLeft = (endsAt: number, now: number) => Math.round((dayStart(endsAt) - dayStart(now)) / DAY)
/** A deal that ends within a week says how soon; one further away says its last day. (invented copy) */
export function dealWhen(d: { startsAt: number | null; endsAt: number | null }, now: number): string | null {
  if (dealUpcoming(d, now)) return `Starts ${displayDate(new Date(d.startsAt!))}`
  if (d.endsAt == null) return null
  const n = daysLeft(d.endsAt, now)
  if (n < 0) return `Ended ${displayDate(new Date(d.endsAt))}`
  if (n === 0) return 'Ends today'
  if (n === 1) return 'Ends tomorrow'
  if (n <= 7) return `Ends in ${n} days`
  return `Until ${displayDate(new Date(d.endsAt))}`
}
/** The deal's whole run, for its dialog: "1 Oct ’26 – 31 Dec ’26", "From 1 Oct ’26", "Until 31 Dec ’26". */
export function dealRun(d: { startsAt: number | null; endsAt: number | null }): string | null {
  const a = d.startsAt != null ? displayDate(new Date(d.startsAt)) : null, b = d.endsAt != null ? displayDate(new Date(d.endsAt)) : null
  if (a && b) return `${a} – ${b}`
  if (a) return `From ${a}`
  if (b) return `Until ${b}`
  return null
}
/** A deal that ends within three days is close (the card's words lead with it). */
export const endsSoon = (d: { endsAt: number | null }, now: number) => d.endsAt != null && daysLeft(d.endsAt, now) >= 0 && daysLeft(d.endsAt, now) <= 3

/* ── order ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** 1.0's order: under Most popular a featured brand comes first by its rank (page.tsx `orderedBrands`), then the feed's popularity; Most
    recent is the newest on the Marketplace; Most reviews the most reviewed. Ties read A to Z, so the list never jumps. */
export function sortBrands<T extends Pick<BrandCardView, 'name' | 'featuredRank' | 'popularity' | 'reviews' | 'publishedAt'>>(list: readonly T[], sort: BrandSort): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name)
  return [...list].sort((a, b) => {
    if (sort === 'recent') return b.publishedAt - a.publishedAt || byName(a, b)
    if (sort === 'reviews') return b.reviews - a.reviews || byName(a, b)
    const fa = a.featuredRank, fb = b.featuredRank
    if (fa != null && fb != null) return fa - fb || byName(a, b)
    if (fa != null) return -1
    if (fb != null) return 1
    return b.popularity - a.popularity || byName(a, b)
  })
}
/** Deals in the Deals view: a flash deal first, then the soonest to end (one with no end last), then the brand's own order. */
export function sortDeals<T extends Pick<DealView, 'flash' | 'endsAt' | 'brandName' | 'title'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => Number(b.flash) - Number(a.flash) || (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity) || a.brandName.localeCompare(b.brandName) || a.title.localeCompare(b.title))
}

/* ── words ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const brandsWord = (n: number) => count(n, 'brand')
export const dealsWord = (n: number) => count(n, 'deal')
export const reviewsWord = (n: number) => count(n, 'review')
/** The quote units a product's price is given in, as the price reads them: "per piece", "per sqft". */
const UNIT_WORD: Record<string, string> = { Pieces: 'piece', Lot: 'lot', sqft: 'sqft', 'ft run': 'ft run', point: 'point', hour: 'hour', set: 'set' }
/** A product's listed price: "S$2,480 per piece", "S$5.50 per sqft" (cents only when it has them); null when the brand gives none. */
export function productPrice(p: { priceMinor: number | null; unit: string | null }): string | null {
  if (p.priceMinor == null) return null
  const whole = p.priceMinor % 100 === 0
  const amount = whole ? `S$${money(p.priceMinor)}` : `S$${(p.priceMinor / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return p.unit ? `${amount} per ${UNIT_WORD[p.unit] ?? p.unit}` : amount
}
/** The first name a message signs with. */
const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** What WhatsApp opens with when the studio writes to a brand. (invented copy) */
export const brandMessage = (brand: string, member: string, studio: string) =>
  `Hi ${brand}, this is ${firstOf(member)} from ${studio}. I found you on Qanvast’s Marketplace and would like to know more.`
/** What a Get deal press drafts, on WhatsApp or by email. (invented copy) */
export const dealMessage = (brand: string, deal: string, member: string, studio: string) =>
  `Hi ${brand}, this is ${firstOf(member)} from ${studio}. I’d like your “${deal}” deal from Qanvast’s Marketplace — how do we go ahead?`
/** How Get deal reaches the brand for this deal, in 1.0's order — the deal's own page first (1.0 opened `ctaUrl`), then WhatsApp, then email;
    null when the brand gave none (the dialog then says to ask the brand as How to redeem says). */
export function askWay(d: Pick<DealView, 'ctaUrl' | 'brandWhatsapp' | 'brandEmail'>): AskHow | null {
  if (d.ctaUrl) return 'link'
  if (d.brandWhatsapp) return 'whatsapp'
  if (d.brandEmail) return 'email'
  return null
}
/** The Get deal button's words: the brand's own (1.0's `ctaText`), else what the press does. (invented copy) */
export function askLabel(d: Pick<DealView, 'ctaUrl' | 'ctaText' | 'brandWhatsapp' | 'brandEmail'>): string {
  const way = askWay(d)
  if (way === 'link') return d.ctaText?.trim() || 'Get deal'
  if (way === 'whatsapp') return 'Get deal on WhatsApp'
  if (way === 'email') return 'Get deal by email'
  return 'Get deal'
}
/** The line an ask leaves on its deal. (invented copy) */
export function askedLine(a: DealAsk, viewerId: string): string {
  const who = a.byId === viewerId ? 'You' : a.by
  const how = a.how === 'link' ? 'on their page' : a.how === 'whatsapp' ? 'on WhatsApp' : 'by email'
  return `${who} asked for this deal ${how} on ${displayDate(new Date(a.at))}`
}
/** The same, as a card's foot line holds it: "You asked on 7 Oct ’26". */
export const askedShort = (a: DealAsk, viewerId: string): string => `${a.byId === viewerId ? 'You' : a.by} asked on ${displayDate(new Date(a.at))}`
/** A web address as a link shows it: "oakandlinen.example/sofas" — no scheme, no "www.", no trailing slash. */
/** (pending modules S24, at the lanes' merge) The demo catalogue's addresses sit on the reserved `.example` domain (lib/marketplace/demo.ts),
 *  so no press lands on a real business — and none opens a browser's error page either: such a row says it is a demo address instead. */
export const isDemoAddress = (url: string | null | undefined): boolean => !!url && /(^|[@./])[a-z0-9-]*\.?example(\.[a-z]{2,3})?([/:?#]|$)/i.test(url.replace(/^mailto:/, '').replace(/^https?:\/\//, ''))
/** (invented copy) what a demo address row says */
export const DEMO_ADDRESS = 'A demo address — a real brand’s link opens here'
export const shortUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
/** An address the app opens (a brand, a deal, a page of its own) — not a page on the brand's site. */
export const inApp = (href: string) => href.startsWith('/') && !href.startsWith('//')

/** The studio's trade a product's category goes under by default — the trade the brand's categories all point to among those the studio
    already quotes, else none (the studio picks one in the dialog). Kitchen work is carpentry and a bathroom's fittings are plumbing in a Singapore quote. */
const TRADE_FOR: Record<string, string[]> = {
  Furniture: ['Furniture', 'Loose furniture'], Lighting: ['Lighting', 'Electrical'], Flooring: ['Flooring'], Kitchen: ['Kitchen', 'Carpentry'],
  Bathroom: ['Bathroom', 'Plumbing'], Paint: ['Painting', 'Paint'], 'Curtains & Blinds': ['Curtains & Blinds', 'Curtains', 'Blinds'], 'Smart Home': ['Smart Home', 'Electrical'],
}
export function tradeFor(categories: readonly string[], trades: readonly string[]): string | null {
  const have = new Map(trades.map((t) => [t.toLowerCase(), t]))
  const hitOf = (c: string): string | null => { for (const t of TRADE_FOR[c] ?? [c]) { const hit = have.get(t.toLowerCase()); if (hit) return hit } return null }
  /* (S43E, F3-05 W5-01) the guess is the brand's only when its categories agree: Rattan Row's "Furniture · Lighting" put a rattan headboard
     under Electrical (Furniture is no trade of the studio's, Lighting is Electrical) — a product the brand could file two ways starts with
     no category and the studio picks */
  const hits = new Set(categories.map(hitOf))
  return hits.size === 1 ? [...hits][0] ?? null : null
}
