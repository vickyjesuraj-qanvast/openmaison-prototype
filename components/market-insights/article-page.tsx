'use client'

import Link from 'next/link'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { useHere } from '@/components/om/use-here'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { fromLabel, withFrom } from '@/lib/nav'
import { sectionsOf } from '@/lib/market-insights/markdown'
import { SAMPLE_NOTE, tagHref, type ArticleData } from '@/lib/market-insights/model'
import { ArticleBody } from './article-body'
import { ArticleCardView, Cover, articleWhen, eyebrowOf, whenOf } from './cards'
import { ArticleGhost } from './article-ghost'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './article.module.css'

/**
 * (pending modules S25 — 1.0's /tools/market-insights/[id]) An article: the L2 header (Market Insights / its title; Back returns where it was
 * opened from), then one reading column — its category, its title, its first lines, the byline (who wrote it, when, how long it reads), the
 * sample note for the demo's own articles, its cover and its body (sections, quotes, tables, pictures and charts), its tags (each opens
 * Market Insights searched by it — 1.0 printed them only), and more articles to read next. Nothing to press but links: an article is read.
 */
export function ArticlePage({ data, from }: { data: ArticleData; from?: string }) {
  const a = data.article
  const here = useHere(`/market-insights/${a.id}`)
  const back = from ?? '/market-insights'
  const backName = from && !from.startsWith('/market-insights') ? fromLabel(from) : null
  const sections = sectionsOf(data.blocks)

  /* (S10's rule) Maison AI answers from the article itself: what it covers (each section a row that scrolls to it), and what to read next */
  const suggestions: MaisonSuggestion[] = [
    { label: 'What does this article cover?', answer: { title: a.title, text: a.excerpt ?? undefined,
        rows: sections.map((s) => ({ id: s.id, label: s.text, run: () => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })) } },
    ...(data.more.length ? [{ label: 'What should I read next?', answer: { title: 'Read next', rows: data.more.map((m) => ({ id: m.id, label: m.title, meta: `${eyebrowOf(m)} · ${whenOf(m)}`, href: withFrom(`/market-insights/${m.id}`, back) })) } }] : []),
    ...(a.tags[0] ? [{ label: `More about ${a.tags[0]}`, answer: { title: `Articles about ${a.tags[0]}`, text: 'Market Insights, searched for this tag.', link: { label: `Search “${a.tags[0]}”`, href: tagHref(a.tags[0]) } } }] : []),
  ]
  useMaisonAi(suggestions)

  return (
    <PageReveal skeleton={<ArticleGhost />}>
      <div className={pageStyles.body} data-testid="insight-article" data-article={a.id}>
        {/* (the calm UI build 2026-10-27, 6-34) the header is the crumb alone — the article's own h1 below names it, once */}
        <PageHeaderL2 backHref={back} crumbs={[{ label: 'Market Insights', href: '/market-insights' }]} backLabel={backName ? `Back to ${backName}` : undefined}
                      chips={a.featured ? <MetaChip icon="star">Featured</MetaChip> : undefined} />
        <div className={styles.content}>
          <article className={styles.article}>
            <header className={styles.head}>
              <span className={styles.eyebrow} data-testid="insight-article-eyebrow">{eyebrowOf(a)}</span>
              <h1 className={styles.headline}>{a.title}</h1>
              {a.excerpt ? <p className={styles.standfirst}>{a.excerpt}</p> : null}
              <div className={styles.byline}>
                <Avatar name={a.author} color="var(--om-color-primary-default)" size={36} tooltip={false} />
                <span className={styles.bylineText}>
                  <span className={styles.author}>{a.author}</span>
                  <span className={styles.when} data-testid="insight-article-when">{articleWhen(a)}</span>
                </span>
              </div>
            </header>
            {a.sample ? <p className={styles.note} data-testid="insight-sample-note"><Icon name="info" size={20} weight={300} />{SAMPLE_NOTE}</p> : null}
            {a.cover ? <span className={styles.heroWell}><Cover a={a} className={styles.hero} lazy={false} /></span> : null}
            <ArticleBody blocks={data.blocks} here={here} />
            {a.tags.length ? (
              <footer className={styles.tags} data-testid="insight-tags">
                <span className={styles.tagsLabel}>Tags</span>
                {a.tags.map((t) => <Link key={t} href={tagHref(t)} className={styles.tag} aria-label={`Articles about ${t}`}>{t}</Link>)}
              </footer>
            ) : null}
          </article>
          {data.more.length ? (
            <section className={styles.more} aria-labelledby="insight-more" data-testid="insight-more">
              <h2 id="insight-more" className={styles.moreTitle}>More from Market Insights</h2>
              <div className={styles.moreGrid} role="list" aria-label="More articles" data-kb-list="article">
                {data.more.map((m) => <ArticleCardView key={m.id} a={m} here={back} />)}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </PageReveal>
  )
}
