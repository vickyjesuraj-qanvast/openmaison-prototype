'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { useCopy } from '@/components/om/use-copy'
import { COMPANY, site } from '@/lib/site/model'
import { Container, Display, Eyebrow, Lede, Rule, Section, TextLink, cx } from './primitives'
import { Reveal } from './reveal'
import s from './site.module.css'
import p from './pages.module.css'

/*
 * (pending modules S35 — 1.0's blog/page-client.tsx · blog/[slug]/page-client.tsx) The Journal: the category rail (the house chips; its pick in
 * the address, so Back from an article returns to it) over the article cards; an article with its reading bar, contents (a sticky list on a
 * desktop, a fold on a phone), its key figures, the share row, the author and three related posts. The blog is OpenMaison's own writing — kept
 * apart from Tools › Market Insights (the editors' reading room inside the studio app, S25): one home each.
 */

export type PostCard = { slug: string; category: string; title: string; excerpt: string; heroImage: string | null; heroAlt: string; date: string; readTime: string }

export function BlogIndex({ posts }: { posts: PostCard[] }) {
  return (
    <>
      <Section top label="The Journal">
        <Container size="narrow" className={s.center}>
          <Reveal><Eyebrow center>The Journal</Eyebrow></Reveal>
          <Reveal delay={80}><Display as="h1" size="xl" className={p.mt24}>Insights for modern design studios.</Display></Reveal>
          <Reveal delay={160}><Lede className={cx(s.centerBlock, p.mt24)}>What we’re learning about running design studios, building software for them, and the industry around both.</Lede></Reveal>
        </Container>
      </Section>
      <Section spacing="major" className={p.postsBand} label="Articles">
        <Container size="wide">
          <Suspense fallback={<Posts posts={posts} category="All" onPick={() => {}} />}><PostsFromAddress posts={posts} /></Suspense>
          <Reveal delay={120}><p className={cx(s.fine, p.followNote)}>More articles coming soon. Follow us on <TextLink href={COMPANY.linkedin}>LinkedIn</TextLink> for updates.</p></Reveal>
        </Container>
      </Section>
    </>
  )
}

function PostsFromAddress({ posts }: { posts: PostCard[] }) {
  const params = useSearchParams()
  const router = useRouter()
  const path = usePathname()
  const categories = useMemo(() => ['All', ...Array.from(new Set(posts.map((x) => x.category)))], [posts])
  const asked = params.get('category')
  const category = asked && categories.includes(asked) ? asked : 'All'
  const pick = (c: string) => router.replace(c === 'All' ? path : `${path}?category=${encodeURIComponent(c)}`, { scroll: false })
  return <Posts posts={posts} category={category} onPick={pick} categories={categories} />
}

function Posts({ posts, category, onPick, categories }: { posts: PostCard[]; category: string; onPick: (c: string) => void; categories?: string[] }) {
  const cats = categories ?? ['All', ...Array.from(new Set(posts.map((x) => x.category)))]
  const shown = category === 'All' ? posts : posts.filter((x) => x.category === category)
  const from = category === 'All' ? site('/blog') : `${site('/blog')}?category=${encodeURIComponent(category)}`
  return (
    <>
      <div className={p.filterBar}>
        <ChipRail label="Filter articles by category"><Chips label="Filter articles by category" options={cats.map((c) => ({ value: c, label: c }))} value={category} onChange={onPick} testId="blog-categories" /></ChipRail>
      </div>
      <div className={p.posts} data-testid="blog-posts">
        {shown.map((x, i) => (
          <Reveal key={x.slug} delay={Math.min(i, 6) * 60}>
            <Link href={`${site(`/blog/${x.slug}`)}?from=${encodeURIComponent(from)}`} className={p.post} data-testid="blog-post">
              {x.heroImage ? <Cover src={x.heroImage} alt={x.heroAlt} /> : null}
              <div className={p.postBody}>
                <div className={p.postMeta}><span className={p.category}>{x.category}</span><span className={p.read}>{x.readTime}</span></div>
                <h3 className={p.postTitle}>{x.title}</h3>
                <p className={p.excerpt}>{x.excerpt}</p>
                <div className={p.postFoot}><span>{x.date}</span><span className={p.readMore}>Read<Icon name="arrow_forward" size={16} /></span></div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      {shown.length === 0 ? <p className={cx(s.bodyM, p.none)}>No articles in this category yet.</p> : null}
    </>
  )
}

export type ArticleData = {
  slug: string; title: string; category: string; readTime: string; author: { name: string; role: string; linkedin?: string }
  publishedAt: string; date: string; heroImage?: string; heroAlt?: string; sections: { heading: string; content: string }[]
  keyStats?: { label: string; value: string; source?: string }[]
}

/** The page's scroll as a share of its length — the reading bar. */
function useReading() {
  const [k, setK] = useState(0)
  useEffect(() => {
    const read = () => { const d = document.documentElement.scrollHeight - window.innerHeight; setK(d > 0 ? Math.min(1, Math.max(0, window.scrollY / d)) : 0) }
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])
  return k
}

/** Back to the Journal as it was left — `?from=` (the Journal's own address only), else the Journal. */
function useBack(): string {
  const from = useSearchParams().get('from')
  return from && /^\/site\/blog(\?category=[A-Za-z%0-9 -]+)?$/.test(from) ? from : site('/blog')
}
function BackLink() {
  return <Link href={useBack()} className={p.back} data-testid="article-back"><Icon name="arrow_back" size={16} />Back to Journal</Link>
}

export function ArticleView({ article, related }: { article: ArticleData; related: PostCard[] }) {
  const back = site('/blog')
  const progress = useReading()
  const heads = article.sections.map((x, i) => ({ id: `section-${i}`, text: x.heading }))
  const [active, setActive] = useState('')
  const [tocOpen, setTocOpen] = useState(true)
  const [phoneToc, setPhoneToc] = useState(false)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(e.target.id) }, { rootMargin: '-80px 0px -60% 0px' })
    document.querySelectorAll('[data-article-section]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [article.slug])
  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); setPhoneToc(false); document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }
  const [url, setUrl] = useState(site(`/blog/${article.slug}`))
  useEffect(() => { const t = window.setTimeout(() => setUrl(`${window.location.origin}${site(`/blog/${article.slug}`)}`), 0); return () => window.clearTimeout(t) }, [article.slug])
  const { copy } = useCopy(url)
  const enc = encodeURIComponent(url)
  return (
    <>
      <div className={p.progress} style={{ width: `${progress * 100}%` }} role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} />
      <Section spacing="compact" top label={article.title}>
        <Container size="narrow">
          <Reveal>
            <Suspense fallback={<Link href={back} className={p.back} data-testid="article-back"><Icon name="arrow_back" size={16} />Back to Journal</Link>}><BackLink /></Suspense>
            <div className={p.postMeta}><span className={p.chipCat}>{article.category}</span><span className={s.label}>{article.readTime}</span></div>
            <Display as="h1" size="l" className={p.mt20}>{article.title}</Display>
            <div className={p.byline}><strong>{article.author.name}</strong><span aria-hidden className={p.roleSep}>/</span><time dateTime={article.publishedAt}>{article.date}</time></div>
          </Reveal>
        </Container>
      </Section>
      {article.heroImage ? (
        <Container>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Reveal delay={80}><div className={p.hero}><img src={article.heroImage} alt={article.heroAlt ?? article.title} className={p.heroImg} /></div></Reveal>
        </Container>
      ) : null}
      {article.keyStats?.length ? (
        <Section spacing="compact" label="Key figures">
          <Container size="narrow">
            <Reveal>
              <div className={p.keyStats}>{article.keyStats.map((k) => <div key={k.label} className={p.stat}><p className={p.statValue}>{k.value}</p><p className={p.statLabel}>{k.label}</p>{k.source ? <p className={p.statSource}>Source: {k.source}</p> : null}</div>)}</div>
            </Reveal>
            <Rule className={p.mt40} />
          </Container>
        </Section>
      ) : null}
      <Section label="The article">
        <Container size="wide">
          <div className={p.articleGrid}>
            <div className={p.articleMain}>
              <div className={p.mobileToc}>
                <button type="button" className={p.mobileTocButton} aria-expanded={phoneToc} aria-controls="article-toc-phone" onClick={() => setPhoneToc((o) => !o)}><Icon name="list" size={16} />Table of Contents<span>{phoneToc ? 'Hide' : 'Show'}</span></button>
                {phoneToc ? <ul id="article-toc-phone" className={p.mobileTocList}>{heads.map((x) => <li key={x.id}><a href={`#${x.id}`} onClick={go(x.id)}>{x.text}</a></li>)}</ul> : null}
              </div>
              {article.sections.map((x, i) => (
                <section key={i} id={`section-${i}`} className={p.articleSection} data-article-section="">
                  <h2 className={cx(s.displayS, p.mt0)}>{x.heading}</h2>
                  {/* the editors' own HTML, written in code (lib/site/blog) — never a visitor's */}
                  <div className={cx(p.prose, p.mt20)} dangerouslySetInnerHTML={{ __html: x.content }} />
                </section>
              ))}
              <div className={p.share}>
                <span className={s.label}>Share</span>
                <a className={p.shareButton} href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><Brand name="LinkedIn" /></a>
                <a className={p.shareButton} href={`https://twitter.com/intent/tweet?url=${enc}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X"><Brand name="X" /></a>
                <button type="button" className={p.shareButton} aria-label="Copy link" onClick={() => { void copy() }} data-testid="article-copy"><Icon name="link" size={16} /></button>
              </div>
              <div className={p.author}>
                <span className={p.authorMark} aria-hidden>{article.author.name.charAt(0)}</span>
                <div><p className={p.authorName}>{article.author.name}</p><p className={p.authorRole}>{article.author.role}</p>{article.author.linkedin ? <a href={article.author.linkedin} target="_blank" rel="noopener noreferrer" className={cx(s.inlineLink, p.mt6)}>LinkedIn</a> : null}</div>
              </div>
            </div>
            <nav className={p.toc} aria-label="Table of Contents">
              <button type="button" className={p.tocHead} aria-expanded={tocOpen} aria-controls="article-toc" onClick={() => setTocOpen((o) => !o)}><Icon name="list" size={12} />Contents</button>
              {tocOpen ? <ul id="article-toc" className={p.tocList}>{heads.map((x) => <li key={x.id}><a href={`#${x.id}`} onClick={go(x.id)} className={p.tocLink} data-active={active === x.id || undefined}>{x.text}</a></li>)}</ul> : null}
            </nav>
          </div>
        </Container>
      </Section>
      {related.length ? (
        <Section ruled="top" label="Related articles">
          <Container size="wide">
            <Reveal><Eyebrow>Keep reading</Eyebrow><Display as="h2" size="s" className={p.mt12}>Related articles</Display></Reveal>
            <div className={cx(p.posts, p.mt32)}>
              {related.map((x, i) => (
                <Reveal key={x.slug} delay={i * 70}>
                  <Link href={`${site(`/blog/${x.slug}`)}?from=${encodeURIComponent(back)}`} className={p.post}>
                    {x.heroImage ? <Cover src={x.heroImage} alt={x.heroAlt} /> : null}
                    <div className={p.postBody}><span className={cx(p.chipCat, p.alignStart)}>{x.category}</span><h3 className={p.relatedTitle}>{x.title}</h3><p className={cx(p.read, p.mt8)}>{x.readTime}</p></div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <div className={p.mt40}><TextLink href={back}>Browse the journal</TextLink></div>
          </Container>
        </Section>
      ) : null}
    </>
  )
}

/** A post's cover on its card (1.0's 16:9, zooming a touch on hover). */
function Cover({ src, alt }: { src: string; alt: string }) {
  return (
    <div className={p.cover}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={p.coverImg} loading="lazy" />
    </div>
  )
}

/** LinkedIn's and X's own marks — no icon font carries them (1.0's inline strokes). */
function Brand({ name }: { name: 'LinkedIn' | 'X' }) {
  const p2 = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  return name === 'X'
    ? <svg {...p2}><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
    : <svg {...p2}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
}
