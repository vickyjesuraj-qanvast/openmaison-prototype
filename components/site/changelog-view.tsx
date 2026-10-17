import { Fragment } from 'react'
import { Icon } from '@/components/om/icon'
import { AREA_LABEL, releaseDate, releasesByMonth } from '@/lib/site/changelog'
import { site } from '@/lib/site/model'
import { BookDemoButton } from './book-demo'
import { ButtonLink, Container, Display, Eyebrow, Lede, Section, cx } from './primitives'
import { Reveal } from './reveal'
import { ModuleVisual } from './visuals'
import s from './site.module.css'
import p from './pages.module.css'

/*
 * (pending modules S35 — 1.0's changelog-view.tsx) What's New: one calm column — the month's dotted rule and its count, each release's date ·
 * New / Improved · its areas (AI in the signature gradient, the page's one jewel) · Headline, the title, the summary, a landmark release's
 * module picture, the highlights. Subscribe to updates goes to the closing band, whose "Subscribe below" is the footer's sign-up.
 */
export function ChangelogView() {
  const months = releasesByMonth()
  return (
    <>
      <Section top className={p.heroBand} label="What’s New">
        <Container size="narrow">
          <Reveal>
            <Eyebrow>Product updates</Eyebrow>
            <Display as="h1" size="xl" className={cx(p.mt20, p.max16)}>Everything we’ve shipped lately.</Display>
            <Lede className={p.mt24}>A running record of what’s new in OpenMaison — the features, the polish and the quiet fixes that make your studio run calmer. Something new lands every couple of weeks.</Lede>
            <div className={p.mt32}><a href="#subscribe" className={p.subscribe}>Subscribe to updates<Icon name="arrow_outward" size={16} /></a></div>
          </Reveal>
        </Container>
      </Section>
      <Section spacing="major" label="Releases">
        <Container size="narrow">
          {months.map((g) => (
            <div key={g.month} className={p.month} data-testid="release-month">
              <div className={p.monthHead}><h2 className={p.monthName}>{g.month}</h2><span aria-hidden className={p.monthRule} /><span className={s.label}>{g.items.length} {g.items.length === 1 ? 'release' : 'releases'}</span></div>
              <div>
                {g.items.map((r) => (
                  <article key={r.id} id={r.id} className={p.release} data-testid="release">
                    <Reveal>
                      <div className={p.meta}>
                        <time dateTime={r.date} className={s.label}>{releaseDate(r.date)}</time>
                        <span aria-hidden className={p.roleSep}>·</span>
                        <span className={p.status} data-new={r.status === 'new' || undefined}>{r.status === 'new' ? 'New' : 'Improved'}</span>
                        <span className={cx(s.label, p.areas)}>{r.areas.map((a, i) => <Fragment key={a}>{i > 0 ? <span aria-hidden className={p.roleSep}>·</span> : null}<span className={a === 'ai' ? s.gradientText : undefined}>{AREA_LABEL[a]}</span></Fragment>)}</span>
                        {r.featured ? <span className={p.headline}><Icon name="auto_awesome" size={12} />Headline</span> : null}
                      </div>
                      <h3 className={p.releaseTitle}>{r.title}</h3>
                      <p className={cx(s.lede, p.mt12)}>{r.summary}</p>
                      {r.moduleSlug ? <div className={p.releaseVisual}><ModuleVisual slug={r.moduleSlug} /></div> : null}
                      <ul className={p.highlights}>{r.highlights.map((x, i) => <li key={i}><span aria-hidden className={p.bullet} />{x}</li>)}</ul>
                    </Reveal>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </Container>
      </Section>
      <Section id="subscribe" spacing="major" surface="sunk" ruled="top" label="See it running">
        <Container size="narrow" className={s.center}>
          <Reveal>
            <Display size="l" className={cx(s.centerBlock, p.max22)}>See it running in your studio.</Display>
            <Lede className={cx(s.centerBlock, p.mt20)}>Book a walkthrough, or explore everything the platform can do. New here? Subscribe below to get each release in your inbox.</Lede>
            <div className={cx(s.buttons, s.buttonsCenter, p.mt32)}>
              <BookDemoButton testId="changelog-book-demo" />
              <ButtonLink href={site('/platform')} variant="ghost">Explore the platform</ButtonLink>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  )
}
