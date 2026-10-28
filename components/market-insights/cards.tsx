'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { categoryIcon, categoryLabel, readWords, type ArticleCard } from '@/lib/market-insights/model'
import { rememberPeek } from './peek'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import styles from './market-insights.module.css'

/** The line over a card's title: its category. (the calm UI build 2026-10-27, 6-12 · W-413) A sample says so once a page — the list's note
    and the article's — no longer "· Sample" on every card. */
export const eyebrowOf = (a: ArticleCard) => categoryLabel(a.category)
/** When it came out and how long it takes — "9 Oct ’26 · 5 min read". */
export const whenOf = (a: ArticleCard) => `${displayDate(new Date(a.publishedAt))} · ${readWords(a.readMinutes)}`
/** The article's own byline line — (S42E, E-17) the house date as the list and ⌘K say it, "9 Oct ’26 · 5 min read". */
export const articleWhen = (a: ArticleCard) => whenOf(a)
/** A card's press tells the article's ghost what it is about to draw (components/market-insights/peek.ts). */
const peek = (a: ArticleCard) => rememberPeek({ id: a.id, eyebrow: eyebrowOf(a), title: a.title, excerpt: a.excerpt, when: articleWhen(a), sample: a.sample, cover: !!a.cover })

/** An article's cover — or, with none or one that won't load, its category's glyph in the well (1.0's fallback: the category's look). */
export function Cover({ a, className, lazy = true }: { a: ArticleCard; className?: string; lazy?: boolean }) {
  const [broken, setBroken] = useState<string | null>(null)
  /* a picture that failed before the page woke (a server-drawn, eager one) is caught as it mounts; one that fails later, by its error */
  return a.cover && broken !== a.cover
    /* eslint-disable-next-line @next/next/no-img-element */
    ? <img src={a.cover} alt="" loading={lazy ? 'lazy' : undefined} decoding="async" className={className} onError={() => setBroken(a.cover)}
           ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setBroken(a.cover) }} />
    : <span className={styles.coverEmpty} data-testid="insight-cover-empty"><Icon name={categoryIcon(a.category)} size={40} weight={300} /></span>
}

/**
 * (1.0's ArticleCard) An article on the house gallery card: its cover at 3:2, its category over its title (two lines), its first lines,
 * when it came out and how long it reads. The whole card opens the article, carrying where it came from. On a phone it is a row — a square of
 * the cover, the words beside it. 1.0's read-time pill over the photo and its two tags are the meta line and the article's own page.
 */
export function ArticleCardView({ a, here }: { a: ArticleCard; here: string }) {
  return (
    <div className={gallery.card} role="listitem" data-kb-row data-kb-id={a.id} data-testid="insight-card" data-article={a.id}>
      <Link href={withFrom(`/market-insights/${a.id}`, here)} onClick={() => peek(a)} className={`${gallery.open} ${styles.open}`} data-kb-open aria-label={`${a.title} — ${eyebrowOf(a)}, ${whenOf(a)}`}>
        <span className={`${gallery.thumb} ${styles.cover}`}><Cover a={a} /></span>
        <span className={styles.cardBody}>
          <span className={styles.eyebrow} data-testid="insight-eyebrow">{eyebrowOf(a)}</span>
          <span className={styles.cardTitle}>{a.title}</span>
          {a.excerpt ? <span className={styles.cardExcerpt}>{a.excerpt}</span> : null}
          <span className={styles.cardMeta}>{whenOf(a)}</span>
        </span>
      </Link>
    </div>
  )
}

/** (1.0's FeaturedArticleCard) The featured article as one wide card: its cover with the Featured tag beside its category, title, first
    lines, tags and byline. Shown only on All with no search, as 1.0 did. (the calm UI build 2026-10-27, 6-34 · 6-08) The first lines sit under
    the title (the words were pushed to the card's foot, a hole under the title), and the tags are drawn as the article's own (its tag chips, in
    their own case — not capital tags); the card itself is the link, so here they are words, and each opens its search on the article's page. */
export function FeaturedArticle({ a, here }: { a: ArticleCard; here: string }) {
  return (
    <Link href={withFrom(`/market-insights/${a.id}`, here)} onClick={() => peek(a)} className={styles.featured} data-testid="insight-featured" data-article={a.id}
          aria-label={`Featured: ${a.title} — ${eyebrowOf(a)}, ${whenOf(a)}`}>
      <span className={styles.featuredPic}>
        <Cover a={a} />
        <span className={styles.flag} data-tone="await">Featured</span>
      </span>
      <span className={styles.featuredText}>
        <span className={styles.eyebrow}>{eyebrowOf(a)}</span>
        <span className={styles.featuredTitle}>{a.title}</span>
        {a.excerpt ? <span className={styles.featuredExcerpt}>{a.excerpt}</span> : null}
        {a.tags.length ? <span className={styles.tags}>{a.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}</span> : null}
        <span className={styles.byline}>
          <Avatar name={a.author} color="var(--om-color-primary-default)" size={36} tooltip={false} />
          <span className={styles.bylineText}><span className={styles.author}>{a.author}</span><span className={styles.when}>{whenOf(a)}</span></span>
          <span className={styles.read} aria-hidden>Read the article<Icon name="arrow_forward" size={16} weight={400} /></span>
        </span>
      </span>
    </Link>
  )
}
