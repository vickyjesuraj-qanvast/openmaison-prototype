'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { EmptyState } from '@/components/om/empty-state'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
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
  const pickCategory = (c: InsightCategory | '') => { setCategory(c); setShown(PAGE_SIZE); write({ category: c, shown: PAGE_SIZE }) }
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
  const ghost = <GhostShape first={empty}><InsightsGhost /></GhostShape>
  return (
    <PageReveal skeleton={ghost}>
      <div className={pageStyles.body} data-testid="market-insights">
        <PageHeader title="Market Insights" />
        <div className={styles.content}>
          {empty ? (
            /* the feed's own first run: nothing the studio starts here (rule ③ — no search or chips to press) */
            <EmptyState icon="trending_up" tone="plain" title="No articles yet" testId="insights-empty"
                        help="Trends, reports, case studies and industry news from OpenMaison’s editors show here once they publish them." />
          ) : (
            <>
              <div className={styles.bar}>
                <div className={styles.views}>
                  <ChipRail label="Categories" className={styles.rail}>
                    <Chips label="Categories" testId="insights-categories" value={category || 'all'} onChange={(v) => pickCategory(isCategory(v) ? v : '')}
                           options={[{ value: 'all', label: `All · ${all.length}` }, ...CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) > 0).map((c) => ({ value: c.key, label: `${c.label} · ${counts.get(c.key)}` }))]} />
                  </ChipRail>
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
              <p className={styles.source}>{SOURCE_LINE}</p>
            </>
          )}
        </div>
      </div>
    </PageReveal>
  )
}
