'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { ScopePill } from '@/components/om/scope-pill'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { PortalMenu } from '@/components/om/portal-menu'
import { EmptyState } from '@/components/om/empty-state'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { GhostShape, useRememberShape } from '@/lib/ghost-shape'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { filterByQuery } from '@/lib/search'
import { withFrom } from '@/lib/nav'
import {
  PAGE_SIZE, SORTS, brandsWord, dealWhen, dealsWord, isBrandSort, isMarketView, sortBrands, sortLabel, type BrandCardView, type BrandSort, type DealView, type MarketView, type MarketplaceData,
} from '@/lib/marketplace/model'
import { Banners } from './banners'
import { BrandCard, DealCard } from './cards'
import { DealDialog } from './deal-dialog'
import { MarketplaceGhost } from './marketplace-ghost'
import { useMarket, vendorHref } from './use-market'
import pageStyles from '@/app/leads/leads.module.css'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import styles from './marketplace.module.css'

const SHORT: Record<BrandSort, string> = { popular: 'Popular', recent: 'Recent', reviews: 'Reviews' }
/** The All chip's own value — never a category's name (the house Chips take '' for nothing picked). */
const ALL = '__all'

/**
 * (pending modules S24 — card studio:marketplace; 1.0's /marketplace) Qanvast's partner brands and their deals, for every studio role but
 * Accounting (1.0: owner · admin · id). The banners at the top; Brands · Deals as the house chips with their counts; the search (1.0's
 * "Search brands", here over each view's own words) and the sort (1.0's Most popular · Most recent · Most reviews, a featured brand first);
 * the categories as a chip rail (1.0's, each with its count, the empty ones left out); the brands as the house gallery's cards, twelve at a
 * time with Show more (1.0's PER_PAGE, its infinite scroll made a press). A deal opens its dialog; a brand its page. What the page shows lives
 * in the address (`?view=deals&category=Kitchen&sort=recent&shown=24`, `?deal=<id>` opens a deal), so Back from a brand returns to it.
 */
export function MarketplaceHome({ data }: { data: MarketplaceData }) {
  const router = useRouter()
  const params = useSearchParams()
  const [view, setView] = useState<MarketView>(() => (isMarketView(params.get('view')) ? (params.get('view') as MarketView) : 'brands'))
  const [category, setCategory] = useState<string>(() => { const c = params.get('category'); return c && data.categories.some((x) => x.name === c) ? c : '' })
  const [sort, setSort] = useState<BrandSort>(() => (isBrandSort(params.get('sort')) ? (params.get('sort') as BrandSort) : 'popular'))
  const [shown, setShown] = useState(() => { const n = Number(params.get('shown')); return Number.isFinite(n) && n > PAGE_SIZE ? Math.ceil(n / PAGE_SIZE) * PAGE_SIZE : PAGE_SIZE })
  const [query, setQuery] = useState('')
  const [dealId, setDealId] = useState<string | null>(() => params.get('deal'))
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState<{ b: BrandCardView } | null>(null)
  const menuAnchor = useRef<HTMLElement | null>(null)
  /* an arrival on this page while it is open (⌘K's deal, Maison AI's row, a link in a notice) carries its own view and deal: taken as it
     lands (render-phase adjust — the page's own address writes say what the state already is) */
  const urlKey = params.toString()
  const [seenUrl, setSeenUrl] = useState(urlKey)
  if (urlKey !== seenUrl) {
    setSeenUrl(urlKey)
    const d = params.get('deal'), v = params.get('view')
    if (isMarketView(v) && v !== view) setView(v)
    if (d && d !== dealId) { setDealId(d); if (!isMarketView(v)) setView('deals') }
  }

  /* the page as it stands, in the address (a convenience — the page never refetches for it) and as the way back from a brand or a deal */
  const hereOf = (o: { view: MarketView; category: string; sort: BrandSort; shown: number; deal?: string | null }) => {
    const p = new URLSearchParams()
    if (o.view === 'deals') p.set('view', 'deals')
    if (o.category) p.set('category', o.category)
    if (o.sort !== 'popular') p.set('sort', o.sort)
    if (o.shown > PAGE_SIZE) p.set('shown', String(o.shown))
    if (o.deal) p.set('deal', o.deal)
    const q = p.toString()
    return q ? `/marketplace?${q}` : '/marketplace'
  }
  const here = hereOf({ view, category, sort, shown })
  const write = (next: Partial<{ view: MarketView; category: string; sort: BrandSort; shown: number; deal: string | null }>) => {
    const o = { view, category, sort, shown, deal: dealId, ...next }
    try { window.history.replaceState(null, '', hereOf(o)) } catch { /* the address is a convenience */ }
  }
  const pickView = (v: MarketView) => { setView(v); setShown(PAGE_SIZE); setQuery(''); write({ view: v, shown: PAGE_SIZE }) }
  const pickCategory = (c: string) => { setCategory(c); setShown(PAGE_SIZE); write({ category: c, shown: PAGE_SIZE }) }
  const pickSort = (s: BrandSort) => { setSort(s); setSortOpen(false); write({ sort: s }) }
  /** A deal's dialog — over the view it was opened from, or (a banner, Maison AI) over Deals; the address says both in one write. */
  const openDeal = (id: string, inView?: MarketView) => {
    setDealId(id)
    if (inView && inView !== view) { setView(inView); setShown(PAGE_SIZE); setQuery(''); write({ deal: id, view: inView, shown: PAGE_SIZE }); return }
    write({ deal: id })
  }
  const closeDeal = () => { setDealId(null); write({ deal: null }) }

  const market = useMarket({ viewer: data.viewer, studioName: data.studioName, here })
  const deal = dealId ? data.deals.find((d) => d.id === dealId) ?? null : null

  /* what each view lists: the search over its own words, the brands in the picked category, in the picked order */
  const brands = useMemo(() => {
    const inCat = category ? data.brands.filter((b) => b.categories.includes(category)) : data.brands
    const found = filterByQuery(inCat, query, (b) => ({ fields: [b.name, b.tagline, b.categories.join(' '), ...b.deals.map((d) => d.title)] }))
    return sortBrands(found, sort)
  }, [data.brands, category, query, sort])
  const deals = useMemo(() => filterByQuery(data.deals, query, (d) => ({ fields: [d.title, d.brandName, d.description] })), [data.deals, query])
  const list = view === 'brands' ? brands : deals
  const visible = list.slice(0, shown)
  const empty = data.brands.length === 0
  useRememberShape('marketplace', empty)

  /* (S10's rule) Maison AI answers from the records here, each row opening what it names */
  const soonest = [...data.deals].filter((d) => d.endsAt != null).sort((a, b) => a.endsAt! - b.endsAt!)
  const suggestions: MaisonSuggestion[] = [
    { label: 'Which deals end soonest?', answer: soonest.length
      ? { title: 'Deals ending soonest', rows: soonest.slice(0, 5).map((d) => ({ id: d.id, label: d.title, meta: [d.brandName, dealWhen(d, data.now)].filter(Boolean).join(' · '), run: () => openDeal(d.id, 'deals') })) }
      : { title: 'No deal ends soon', text: 'None of the deals on the Marketplace has an end date.' } },
    { label: 'Which brands are in my vendors?', answer: (() => { const mine = data.brands.filter((b) => b.vendor); return mine.length
      ? { title: 'Brands in your vendors', text: 'Each opens in Company › Finance › Vendors.', rows: mine.map((b) => ({ id: b.id, label: b.name, meta: b.vendor!.name, href: vendorHref(b.vendor!, here) })) }
      : { title: 'None of these brands is a vendor yet', text: 'Open a brand and press Add to my vendors — it joins Company › Finance › Vendors.' } })() },
    { label: 'Which deals have we asked for?', answer: (() => { const asked = data.deals.filter((d) => d.asked); return asked.length
      ? { title: 'Deals the studio asked for', rows: asked.map((d) => ({ id: d.id, label: d.title, meta: `${d.brandName} · ${d.asked!.by}`, run: () => openDeal(d.id, 'deals') })) }
      : { title: 'No deal asked for yet', text: 'Get deal on a deal reaches the brand, and the deal then says who asked.' } })() },
  ]
  useMaisonAi(suggestions)

  const counts = { brands: data.brands.length, deals: data.deals.length }
  const menuRows = (b: BrandCardView) => (
    <>
      <DropdownItem onSelect={() => { setMenu(null); router.push(withFrom(`/marketplace/${b.id}`, here)) }}>Open</DropdownItem>
      {b.whatsapp ? <DropdownItem onSelect={() => { setMenu(null); market.whatsapp(b) }}>{`WhatsApp ${b.name}`}</DropdownItem> : null}
      <DropdownDivider />
      {b.vendor
        ? <DropdownItem onSelect={() => { setMenu(null); router.push(vendorHref(b.vendor!, here)) }} help={`${b.vendor.name} · Company › Finance › Vendors`}>Open in Vendors</DropdownItem>
        : <DropdownItem onSelect={() => { setMenu(null); void market.addToVendors(b) }} help="It joins Company › Finance › Vendors">Add to my vendors</DropdownItem>}
    </>
  )

  const ghost = <GhostShape first={empty}><MarketplaceGhost /></GhostShape>
  return (
    <PageReveal skeleton={ghost}>
      <div className={pageStyles.body} data-testid="marketplace">
        <PageHeader title="Marketplace" />
        <div className={styles.content}>
          {data.banners.length ? <Banners banners={data.banners} here={here} onDeal={(id) => openDeal(id, 'deals')} /> : null}
          {empty ? (
            /* the feed's own first run: nothing the studio can start here (rule ③ — no search, sort or views to press) */
            <EmptyState icon="storefront" tone="plain" title="No brands on the Marketplace yet" testId="market-empty"
                        help="Qanvast’s partner brands and their deals show here once Qanvast shares them with your studio." />
          ) : (
            <>
              <div className={styles.filters}>
                <div className={styles.bar}>
                  <div className={styles.views}>
                    <Chips label="Show" testId="market-views" value={view} onChange={(v) => pickView(v as MarketView)}
                           options={[{ value: 'brands', label: `Brands · ${counts.brands}` }, { value: 'deals', label: `Deals · ${counts.deals}` }]} />
                  </div>
                  <div className={styles.tools}>
                    <ToolbarSearch query={query} onQuery={(q) => { setQuery(q); setShown(PAGE_SIZE) }} placeholder={view === 'brands' ? 'Search brands' : 'Search deals'} label={view === 'brands' ? 'Search brands' : 'Search deals'} />
                    {view === 'brands' ? (
                      <span className={styles.pillAnchor}>
                        <ScopePill ref={sortRef} label={`Sort: ${sortLabel(sort)}`} short={SHORT[sort]} open={sortOpen} onClick={() => setSortOpen((o) => !o)} />
                      </span>
                    ) : null}
                  </div>
                </div>
                {view === 'brands' && data.categories.length > 1 ? (
                  <ChipRail label="Categories" className={styles.rail}>
                    {/* (pending modules S25 — a bug fix: the house Chips read '' as nothing picked, so All never showed as the pick) All is its own value */}
                    <Chips label="Categories" testId="market-categories" value={category || ALL} onChange={(v) => pickCategory(v === ALL ? '' : v)}
                           options={[{ value: ALL, label: `All · ${counts.brands}` }, ...data.categories.map((c) => ({ value: c.name, label: `${c.name} · ${c.count}` }))]} />
                  </ChipRail>
                ) : null}
              </div>
              {visible.length === 0 ? (
                <TabSearchEmpty noun={view} searching={query.trim() !== ''} onClearAll={() => { setQuery(''); pickCategory('') }} />
              ) : (
                <div className={gallery.grid} role="list" aria-label={view === 'brands' ? 'Brands' : 'Deals'} data-kb-list={view === 'brands' ? 'brand' : 'deal'} data-testid={`market-${view}`}>
                  {view === 'brands'
                    ? (visible as BrandCardView[]).map((b) => <BrandCard key={b.id} b={b} here={here} menuOpen={menu?.b.id === b.id} onMenu={(x, el) => { menuAnchor.current = el; setMenu({ b: x }) }} onDeal={(d) => openDeal(d.id)} />)
                    : (visible as DealView[]).map((d) => <DealCard key={d.id} d={d} now={data.now} viewerId={data.viewer.id} onOpen={(x) => openDeal(x.id)} />)}
                </div>
              )}
              {list.length > visible.length ? (
                <div className={styles.more}>
                  <span className={styles.moreCount} data-testid="market-shown">{`Showing ${visible.length} of ${view === 'brands' ? brandsWord(list.length) : dealsWord(list.length)}`}</span>
                  <Button variant="secondary" appearance="outlined" onPress={() => { const n = shown + PAGE_SIZE; setShown(n); write({ shown: n }) }} data-testid="market-more">Show more</Button>
                </div>
              ) : null}
              <p className={styles.source}>Brands and deals come from Qanvast’s partners. Each brand sets its own prices and terms.</p>
            </>
          )}
        </div>
      </div>
      <PortalMenu open={sortOpen} anchor={sortRef} onClose={() => setSortOpen(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Sort brands">
        {SORTS.map((s) => <DropdownItem key={s.key} role="menuitemradio" checked={sort === s.key} onSelect={() => pickSort(s.key)}>{s.label}</DropdownItem>)}
      </PortalMenu>
      <PortalMenu open={!!menu} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={menu?.b.name ?? ''}>
        {menu ? menuRows(menu.b) : null}
      </PortalMenu>
      <DealDialog deal={deal} onClose={closeDeal} viewer={data.viewer} now={data.now} here={here} onGet={market.getDeal} />
    </PageReveal>
  )
}
