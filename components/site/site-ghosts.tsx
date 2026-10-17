import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Words } from '@/components/shell/ghost-kit'
import { cx } from './primitives'
import s from './site.module.css'
import p from './pages.module.css'
import h from './home.module.css'
import g from './site-ghosts.module.css'

/*
 * (pending modules S35 — 1.0's page-skeleton.tsx, per route) The website's ghosts (REG-708): each page's first screen drawn with the house ghost
 * kit on the page's OWN classes — the band, the container, the heading's type set in its own words as bars — so the hand-over to the page lands
 * every line where its bar was. The bar, the phone's bottom bar and the footer stay (they are the layout's); only the page swaps. The site's
 * pages are built ahead and arrive at once, so these show only on a slow hop between them, and no page holds a ghost on its first paint.
 */

function Sheet({ label, children }: { label: string; children: React.ReactNode }) {
  return <GhostSheet label={label}><div className={g.page}>{children}</div></GhostSheet>
}

/** The home page's first screen: the eyebrow, the statement in its own words, the aside, the button. */
export function HomeGhost() {
  return (
    <Sheet label="Loading OpenMaison">
      <section className={h.statement}>
        <div className={cx(s.container, h.statementInner)}>
          <Words className={cx(s.eyebrow, s.eyebrowCenter)}>Built for interior design</Words>
          <Words as="h2" className={h.statementTitle}>Your studio runs on WhatsApp, Spreadsheets, and Prayer.</Words>
          <Words as="p" className={h.aside}>It doesn’t have to.</Words>
          <div className={h.statementCta}><Bone w={248} h={48} r={4} className={g.button} /></div>
        </div>
      </section>
    </Sheet>
  )
}

/** A page whose first band is a heading and a line (Story, Trust, Jobs, Contact, What's New, the Journal, the Platform hub). */
export function PageGhost({ label, title, lede, eyebrow, center = false, size = 'xl', narrowTitle, buttons = 0, band, gap = 24 }: {
  label: string; title: string; lede?: string; eyebrow?: string; center?: boolean; size?: 'xl' | 'l'; /** the title's measure class (the page's own) */ narrowTitle?: string; buttons?: number
  /** the band's own bottom (the page's class) */ band?: 'hero' | 'hub'; /** the title's gap under the eyebrow (the page's own) */ gap?: 20 | 24
}) {
  return (
    <Sheet label={label}>
      <section className={cx(s.section, s.pageTop, band === 'hero' && p.heroBand, band === 'hub' && p.hubHero)}>
        <div className={cx(s.container, s.narrow, center && s.center)}>
          {eyebrow ? <Words className={cx(s.eyebrow, center && s.eyebrowCenter)}>{eyebrow}</Words> : null}
          <Words as="h2" className={cx(size === 'xl' ? s.displayXl : s.displayL, eyebrow && (gap === 20 ? p.mt20 : p.mt24), narrowTitle)}>{title}</Words>
          {lede ? <Words as="p" className={cx(s.lede, p.mt24, center && s.centerBlock)}>{lede}</Words> : null}
          {buttons ? <div className={cx(s.buttons, p.mt32, center && s.buttonsCenter)}>{Array.from({ length: buttons }, (_, i) => <Bone key={i} w={152} h={48} r={4} className={g.button} />)}</div> : null}
        </div>
      </section>
    </Sheet>
  )
}

/** A module page: the crumb, the hero's heading, line and two buttons beside its 4:3 picture. */
export function ModuleGhost() {
  return (
    <Sheet label="Loading the module">
      <section className={cx(s.section, s.pageTop, p.heroBand)}>
        <div className={s.container}>
          <div className={p.crumbs}><Bone w={84} h={16} /><Bone w={8} h={16} /><Bone w={120} h={16} /></div>
          <div className={p.moduleHero}>
            <div>
              <div className={g.titleLines}><Bone w="92%" h={44} /><Bone w="70%" h={44} /></div>
              <div className={cx(g.lines, p.mt24)}><Bone w="100%" h={14} /><Bone w="94%" h={14} /><Bone w="64%" h={14} /></div>
              <div className={cx(s.buttons, p.mt32)}><Bone w={152} h={48} r={4} className={g.button} /><Bone w={120} h={48} r={4} className={g.button} /></div>
            </div>
            <Bone w="100%" r={8} style={{ height: undefined }} className={g.picture} />
          </div>
        </div>
      </section>
    </Sheet>
  )
}

/** An article: Back, the category and reading time, the title, the byline, the cover. */
export function ArticleGhost() {
  return (
    <Sheet label="Loading the article">
      <section className={cx(s.compact, s.pageTop)}>
        <div className={cx(s.container, s.narrow)}>
          <Bone w={132} h={20} className={g.back} />
          <div className={p.postMeta}><Bone w={72} h={20} r={999} /><Bone w={64} h={14} /></div>
          <div className={cx(g.titleLines, p.mt20)}><Bone w="96%" h={40} /><Bone w="58%" h={40} /></div>
          <div className={p.byline}><Bone w={140} h={16} /><Bone w={110} h={16} /></div>
        </div>
      </section>
      <div className={s.container}><Bone w="100%" r={16} style={{ height: undefined }} className={g.cover} /></div>
    </Sheet>
  )
}

/** A legal page: the eyebrow, the title, the date, the rule and the first part. */
export function LegalGhost({ title }: { title: string }) {
  return (
    <Sheet label={`Loading the ${title}`}>
      <section className={cx(s.section, s.pageTop)}>
        <div className={cx(s.container, s.narrow)}>
          <Words className={s.eyebrow}>Legal</Words>
          <Words as="h2" className={cx(s.displayL, p.mt20)}>{title}</Words>
          <Bone w={180} h={12} className={g.updated} />
          <hr className={cx(s.rule, p.mt48)} />
          <div className={p.legalBody}><div><Bone w={220} h={24} /><div className={cx(g.lines, p.mt20)}><Bone w="100%" h={14} /><Bone w="96%" h={14} /><Bone w="88%" h={14} /><Bone w="52%" h={14} /></div></div></div>
        </div>
      </section>
    </Sheet>
  )
}
