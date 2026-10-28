'use client'

import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { Icon } from '@/components/om/icon'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { EmptyState } from '@/components/om/empty-state'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { InfoTip } from '@/components/om/info-tip'
import { GhostShape, useRememberShape } from '@/lib/ghost-shape'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { filterByQuery } from '@/lib/search'
import { withFrom } from '@/lib/nav'
import {
  CATEGORIES, PAGE_SIZE, SAMPLES_NOTE, SOURCE_LINE, articlesWord, categoryLabel, featuredOf, isCategory, searchFields, type InsightCategory, type InsightsData,
} from '@/lib/market-insights/model'
import { ArticleCardView, FeaturedArticle, eyebrowOf, whenOf } from './cards'
import { InsightsGhost } from './insights-ghost'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './market-insights.module.css'

/**
 * (pending modules S25 — card studio:market-insights; 1.0's /tools/market-insights) The reading room of the articles OpenMaison's editors
 * publish, for every studio role but Accounting (1.0: owner · admin · id). The bar: 1.0's category chips (All · Trends · Reports · Case
 * Studies · Industry News, each with its count — a category with none is left out) and its search ("Search articles", over the title, the
 * first lines and the tags); 1.0's featured article as one wide card on All with no search; then every article, newest first, as the house
 * gallery's cards (a reading list on a phone), twenty-four at a time with Show more. The demo's sample articles say so above the list. What the
 * page shows lives in the address (`?category=reports&q=hdb&shown=48`) — a tag on an article opens its search here — so Back from an article
 * returns to it.
 * (the calm UI build 2026-10-27, 6-12 · 6-27) The categories are ONE scope pill, "Category: All ▾", as the Marketplace's (one choice — REG-297),
 * its rows without counts; a sample says so once (the note above the list); where the articles come from is the header's info glyph.
 */
export function InsightsHome({ data }: { data: InsightsData }) {
  const params = useSearchParams()
  const all = data.articles
  const has = (c: string): c is InsightCategory => isCategory(c) && all.some((a) => a.category === c)
  const [category, setCategory] = useState<InsightCategory | ''>(() => { const c = params.get('category') ?? ''; return has(c) ? c : '' })
  const [query, setQuery] = useState(() => (params.get('q') ?? '').slice(0, 80))
  const [shown, setShown] = useState(() => { const n = Number(params.get('shown')); return Number.isFinite(n) && n > PAGE_SIZE ? Math.ceil(n / PAGE_SIZE) * PAGE_SIZE : PAGE_SIZE })
  /* an arrival on this page while it is open (a tag pressed on an article, ⌘K, Maison AI) carries its own search and category — taken as it
     lands (render-phase adjust; the page's own address writes say what the state already is) */
  const urlKey = params.toString()
  const [seenUrl, setSeenUrl] = useState(urlKey)
  if (urlKey !== seenUrl) {
    setSeenUrl(urlKey)
    const q = (params.get('q') ?? '').slice(0, 80), c = params.get('category') ?? ''
    if (q !== query.trim()) setQuery(q)   // the address keeps the words trimmed — a space being typed stays
    if ((has(c) ? c : '') !== category) setCategory(has(c) ? c : '')
  }

  const hereOf = (o: { category: string; query: string; shown: number }) => {
    const p = new URLSearchParams()
    if (o.category) p.set('category', o.category)
    if (o.query.trim()) p.set('q', o.query.trim())
    if (o.shown > PAGE_SIZE) p.set('shown', String(o.shown))
    const q = p.toString()
    return q ? `/market-insights?${q}` : '/market-insights'
  }
  const here = hereOf({ category, query, shown })
  const write = (next: Partial<{ category: string; query: string; shown: number }>) => {
    const href = hereOf({ category, query, shown, ...next })
    try { window.history.replaceState(null, '', href) } catch { /* the address is a convenience */ }
  }
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLButtonElement>(null)
  const pickCategory = (c: InsightCategory | '') => { setCategory(c); setCatOpen(false); setShown(PAGE_SIZE); write({ category: c, shown: PAGE_SIZE }) }
  const typed = (q: string) => { setQuery(q); setShown(PAGE_SIZE); write({ query: q, shown: PAGE_SIZE }) }
  const clearAll = () => { setQuery(''); setCategory(''); setShown(PAGE_SIZE); write({ query: '', category: '', shown: PAGE_SIZE }) }

  /* what the page lists: 1.0's search over its own words, in the picked category, newest first; the featured one on All with no search */
  const found = useMemo(() => filterByQuery(category ? all.filter((a) => a.category === category) : [...all], query, (a) => ({ fields: searchFields(a) })), [all, category, query])
  const featured = !category && !query.trim() ? featuredOf(all) : null
  const rest = featured ? found.filter((a) => a.id !== featured.id) : found
  const visible = rest.slice(0, shown)
  const empty = all.length === 0
  const samples = all.some((a) => a.sample)
  useRememberShape('market-insights', empty)

  /* (S10's rule) Maison AI answers from the records here, each row opening what it names */
  const rows = (list: typeof all) => list.map((a) => ({ id: a.id, label: a.title, meta: `${eyebrowOf(a)} · ${whenOf(a)}`, href: withFrom(`/market-insights/${a.id}`, here) }))
  const top = featuredOf(all)
  const busiest = CATEGORIES.map((c) => ({ c, n: all.filter((a) => a.category === c.key).length })).filter((x) => x.n > 0).sort((x, y) => y.n - x.n)[0] ?? null
  const suggestions: MaisonSuggestion[] = empty ? [] : [
    { label: 'What’s new in Market Insights?', answer: { title: 'The newest articles', rows: rows(all.slice(0, 3)) } },
    ...(top ? [{ label: 'Which article is featured?', answer: { title: 'Featured', text: top.excerpt ?? undefined, rows: rows([top]) } }] : []),
    ...(busiest && busiest.c.key !== category ? [{ label: `Show me the ${categoryLabel(busiest.c.key).toLowerCase()}`, run: () => pickCategory(busiest.c.key) }] : []),
  ]
  useMaisonAi(suggestions)

  const counts = new Map(CATEGORIES.map((c) => [c.key, all.filter((a) => a.category === c.key).length]))
  /* 1.0's rule kept: a category with no article is left out of the pill's menu */
  const live = CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) > 0)
  const ghost = <GhostShape first={empty}><InsightsGhost /></GhostShape>
  return (
    <PageReveal skeleton={ghost}>
      <div className={pageStyles.body} data-testid="market-insights">
        <PageHeader title="Market Insights" after={empty ? undefined : <InfoTip text={SOURCE_LINE} label="Where the articles come from" testId="insights-source" />} />   {/* (the calm UI build 2026-10-27, W-125) the glyph beside the title */}
        <div className={styles.content}>
          {empty ? (
            /* the feed's own first run: nothing the studio starts here (rule ③ — no search or chips to press) */
            <EmptyState icon="trending_up" tone="plain" title="No articles yet" testId="insights-empty"
                        help="Trends, reports, case studies and industry news from OpenMaison’s editors show here once they publish them." />
          ) : (
            <>
              <div className={styles.bar}>
                <div className={styles.views}>
                  <span className={styles.pillAnchor} data-testid="insights-categories">
                    <ScopePill ref={catRef} label={`Category: ${category ? categoryLabel(category) : 'All'}`} short={category ? categoryLabel(category) : 'All'} open={catOpen} scoped={!!category} onClick={() => setCatOpen((o) => !o)} />
                  </span>
                </div>
                <div className={styles.tools}>
                  <ToolbarSearch query={query} onQuery={typed} placeholder="Search articles" label="Search articles" />
                </div>
              </div>
              {samples ? <p className={styles.note} data-testid="insights-sample-note"><Icon name="info" size={20} weight={300} />{SAMPLES_NOTE}</p> : null}
              {featured ? <FeaturedArticle a={featured} here={here} /> : null}
              {visible.length === 0 && !featured ? (
                <TabSearchEmpty noun="articles" searching={query.trim() !== ''} onClearAll={clearAll} />
              ) : visible.length ? (
                <div className={styles.grid} role="list" aria-label="Articles" data-kb-list="article" data-testid="insights-list">
                  {visible.map((a) => <ArticleCardView key={a.id} a={a} here={here} />)}
                </div>
              ) : null}
              {rest.length > visible.length ? (
                <div className={styles.more}>
                  <span className={styles.moreCount} data-testid="insights-shown">{`Showing ${visible.length} of ${articlesWord(rest.length)}`}</span>
                  <Button variant="secondary" appearance="outlined" onPress={() => { const n = shown + PAGE_SIZE; setShown(n); write({ shown: n }) }} data-testid="insights-more">Show more</Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <PortalMenu open={catOpen} anchor={catRef} onClose={() => setCatOpen(false)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="Category">
        <DropdownItem role="menuitemradio" checked={!category} onSelect={() => pickCategory('')}>All</DropdownItem>
        {live.map((c) => <DropdownItem key={c.key} role="menuitemradio" checked={category === c.key} onSelect={() => pickCategory(c.key)}>{c.label}</DropdownItem>)}
      </PortalMenu>
    </PageReveal>
  )
}
