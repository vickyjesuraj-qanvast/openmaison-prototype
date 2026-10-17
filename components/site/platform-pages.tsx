import Link from 'next/link'
import { Fragment } from 'react'
import { Icon } from '@/components/om/icon'
import { site } from '@/lib/site/model'
import { HUB_CARD_COPY, HUB_INTEGRATIONS, HUB_MATRIX, HUB_PILLAR_COPY, HUB_PILLAR_ORDER, HUB_SUPPORT, PILLARS, getModule, modulesByPillar, showsPictures, type PlatformModule } from '@/lib/site/platform'
import { BookDemoButton } from './book-demo'
import { trialEnabled, trialHref } from '@/lib/visualizer/trial/policy'
import { toolsTrialEnabled, TRY_NOW, TRY_PATH } from '@/lib/trial/policy'
import { ButtonLink, Container, Display, Eyebrow, Footnote, Lede, Rule, Section, StatusTag, TextLink, Tile, cx } from './primitives'
import { Reveal } from './reveal'
import { BeforeAfter, ModuleVisual } from './visuals'
import s from './site.module.css'
import p from './pages.module.css'

/*
 * (pending modules S35 — 1.0's platform-hub.tsx · module-template.tsx) The Platform hub and the eight module pages, one template, 1.0's sections:
 * hero · how it works · what you get · why it fits · pairs well with · the closing call. Server-rendered; the pictures and Book a demo are their
 * own client pieces. (pending modules S36) The AI Visualizer's page asks for Try now in place of Book a demo, as 1.0's did ("The visualiser has a
 * live, no-sign-up trial — send people to try it rather than book a demo") — while the trial is open (lib/visualizer/trial/policy.ts, read
 * when the site is built); closed, it offers Book a demo like the others. (pending modules S41b-3) Leads and Upload a quote do the same for
 * the no-account tools (lib/trial/policy.ts `TRY_NOW`, their own switch).
 */

/** Words in a heading may be ~~struck~~ — drawn with the signature gradient through them (1.0's HeadingWithStrikes). */
function Struck({ text }: { text: string }) {
  return <>{text.split(/(~~[^~]+~~)/g).map((part, i) => part.startsWith('~~') && part.endsWith('~~')
    ? <span key={i} className={p.struck}>{part.slice(2, -2)}<span aria-hidden className={p.strike} /></span>
    : <Fragment key={i}>{part}</Fragment>)}</>
}

export function ModulePage({ mod }: { mod: PlatformModule }) {
  const pictures = showsPictures(mod)
  /* (pending modules S41b-3 — 1.0's TRY_NOW_DESTINATIONS) Leads and Upload a quote open their no-account tools too, while those are on */
  const toolTry = TRY_NOW[mod.slug]
  const tryHref = mod.slug === 'visualizer' ? (trialEnabled() ? trialHref() : null) : toolTry && toolsTrialEnabled() ? TRY_PATH[toolTry] : null
  const tryNow = !!tryHref
  const related = mod.relatedCards.flatMap((rc) => { const t = getModule(rc.slug); return t ? [{ ...rc, href: t.href, icon: t.icon }] : [] })
  return (
    <>
      <Section top className={p.heroBand} label={mod.name}>
        <Container>
          <Reveal>
            <nav aria-label="Breadcrumb" className={p.crumbs}>
              <Link href={site('/platform')} className={p.crumbBack}><Icon name="arrow_back" size={16} />Platform</Link>
              <span aria-hidden className={p.crumbSep}>/</span><span aria-current="page" className={p.crumbHere}>{mod.name}</span>
            </nav>
          </Reveal>
          <div className={p.moduleHero}>
            <div>
              <Display as="h1" size="l">{mod.headline}</Display>
              <Lede className={p.mt24}>{mod.subcopy}</Lede>
              <div className={cx(s.buttons, p.mt32)}>
                {tryNow && tryHref ? <ButtonLink href={tryHref} icon={mod.icon} testId="module-try">Try now</ButtonLink> : <BookDemoButton testId="module-book-demo" />}
                <ButtonLink href={site('/contact')} variant="ghost">Talk to us</ButtonLink>
              </div>
            </div>
            <Reveal delay={120}>{mod.slug === 'visualizer' ? <BeforeAfter /> : <ModuleVisual slug={mod.slug} />}</Reveal>
          </div>
        </Container>
      </Section>

      <Section surface="white" ruled="both" label="How it works">
        <Container>
          <Reveal><Display size="m">{mod.stepsHeading}</Display></Reveal>
          <ol className={p.steps}>
            {mod.steps.map((st, i) => (
              <li key={st.title}><Reveal delay={i * 100}>
                <span className={p.stepNo}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={cx(s.displayS, p.mt16)}>{st.title}</h3>
                <p className={cx(s.body, p.mt8)}>{st.desc}</p>
              </Reveal></li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section spacing="major" label="What you get">
        <Container>
          <Reveal><Display size="l" className={p.max20}><Struck text={mod.capabilitiesHeading} /></Display></Reveal>
          <div className={cx(s.grid2, p.mt48)} data-testid="module-capabilities" data-pictures={pictures || undefined}>
            {mod.capabilities.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 80}>
                <div className={cx(s.card, p.capCard)}>
                  {pictures && c.image
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={c.image} alt={c.title} loading="lazy" className={p.capImage} />
                    : <Tile hue={mod.slug} icon={c.icon} size="m" className={p.capTile} />}
                  <h3 className={s.cardTitle}>{c.title}{c.tag ? <> <StatusTag>{c.tag}</StatusTag></> : null}</h3>
                  <p className={s.cardBody}>{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section surface="sunk" label="Why it fits">
        <Container size="narrow" className={s.center}>
          <Reveal>
            <Display size="m" className={cx(s.centerBlock, p.max24)}>{mod.whyHeading}</Display>
            <p className={cx(s.body, s.centerBlock, p.max46, p.mt20)}>{mod.whyBody}</p>
          </Reveal>
        </Container>
      </Section>

      {related.length ? (
        <Section spacing="compact" label={mod.relatedHeading}>
          <Container>
            <Reveal>
              <Display size="m">{mod.relatedHeading}</Display>
              <p className={cx(s.body, p.max60, p.mt12)}>{mod.relatedDescription}</p>
            </Reveal>
            <div className={cx(s.grid2, p.mt32)}>
              {related.map((r, i) => (
                <Reveal key={r.slug} delay={i * 80}>
                  <Link href={r.href} className={cx(s.card, s.linkCard)}>
                    <Tile hue={r.slug} icon={r.icon} size="m" />
                    <h3 className={cx(s.cardTitle, p.mt12)}>{r.title}</h3>
                    <p className={cx(s.fine, p.mt6)}>{r.blurb}</p>
                    <span className={s.explore}>Explore<Icon name="arrow_forward" size={16} className={s.arrow} /></span>
                  </Link>
                </Reveal>
              ))}
            </div>
            <Rule className={p.mt40} />
            <div className={p.mt24}><TextLink href={site('/platform')}>See the whole platform</TextLink></div>
          </Container>
        </Section>
      ) : null}

      <Section spacing="major" surface="white" ruled="top" label="Get started">
        <Container size="narrow" className={s.center}>
          <Reveal>
            <Display size="l" className={cx(s.centerBlock, p.max20)}>{mod.ctaHeading}</Display>
            <p className={cx(s.body, s.centerBlock, p.max52, p.mt20)}>{mod.ctaDescription}</p>
            <div className={cx(s.buttons, s.buttonsCenter, p.mt32)}>
              {tryNow && tryHref ? <ButtonLink href={tryHref} icon={mod.icon} testId="module-closing-try">Try now</ButtonLink> : <BookDemoButton testId="module-closing-book-demo" />}
              <ButtonLink href={site('/contact')} variant="ghost">Talk to us</ButtonLink>
            </div>
            <Footnote testId="module-closing" />
          </Reveal>
        </Container>
      </Section>
    </>
  )
}

export function PlatformHub() {
  return (
    <>
      <Section top className={p.hubHero} label="The platform">
        <Container size="narrow">
          <Reveal>
            <Display as="h1" size="xl" className={p.max18}>One connected platform for your entire studio.</Display>
            <Lede className={p.mt24}>Replace disconnected apps with OpenMaison. When owners, designers and finance work together, projects run smoother, clients stay happier and margins stay healthier.</Lede>
            <div className={p.mt32}><BookDemoButton testId="hub-book-demo" /></div>
          </Reveal>
        </Container>
      </Section>

      {HUB_PILLAR_ORDER.map((pid, pi) => {
        const copy = HUB_PILLAR_COPY[pid]
        const white = pi % 2 === 0
        return (
          <Section key={pid} surface={white ? 'white' : undefined} ruled="top" label={PILLARS[pid].name}>
            <Container>
              <Reveal>
                <Eyebrow>{copy.eyebrow}</Eyebrow>
                <Display size="m" className={p.mt20}>{copy.headline}</Display>
                <p className={cx(s.bodyM, p.max60, p.mt16)}>{copy.blurb}</p>
              </Reveal>
              <div className={cx(s.grid2, p.mt40)}>
                {modulesByPillar(pid).map((m, i) => (
                  <Reveal key={m.slug} delay={(i % 2) * 80}>
                    <Link href={m.href} className={cx(s.card, s.linkCard, white && s.cardOnPaper)} data-testid={`hub-${m.slug}`}>
                      <Tile hue={m.slug} icon={m.icon} size="l" />
                      <h3 className={cx(p.hubCardTitle, p.mt20)}>{m.name}</h3>
                      <p className={s.cardBody}>{HUB_CARD_COPY[m.slug]}</p>
                      <span className={s.explore}>Explore<Icon name="arrow_forward" size={16} className={s.arrow} /></span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </Container>
          </Section>
        )
      })}

      <Section spacing="major" surface="sunk" label="The better way">
        <Container size="narrow">
          <Reveal><Eyebrow>The better way</Eyebrow><Display size="l" className={p.mt20}>Nine tools, or one?</Display></Reveal>
          <Reveal delay={100} className={p.mt40}>
            <div className={p.matrix} role="table" aria-label="Business as usual and OpenMaison">
              <div className={cx(p.matrixRow, p.matrixHead)} role="row"><span role="columnheader" /><span role="columnheader" className={s.label}>Business as usual</span><span role="columnheader" className={cx(s.label, p.accentLabel)}>OpenMaison</span></div>
              {HUB_MATRIX.map((r) => (
                <div key={r.dim} className={p.matrixRow} role="row"><span role="rowheader" className={p.matrixDim}>{r.dim}</span><span role="cell" className={p.matrixStack}>{r.stack}</span><span role="cell" className={p.matrixUs}>{r.us}</span></div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section surface="white" ruled="top" label="Support">
        <Container>
          <Reveal><Display size="m">Support that actually supports.</Display></Reveal>
          <div className={cx(s.grid3, p.mt40)}>
            {HUB_SUPPORT.map((x, i) => (
              <Reveal key={x.title} delay={i * 80}><div className={cx(s.card, s.cardOnPaper)}><Icon name={x.icon} size={22} className={p.accentIcon} /><h3 className={cx(s.cardTitle, p.mt16)}>{x.title}</h3><p className={s.cardBody}>{x.body}</p></div></Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section label="Integrations">
        <Container>
          <Reveal><Eyebrow>Plays well with others</Eyebrow><Display size="m" className={p.mt20}>It fits the tools you already use.</Display></Reveal>
          <div className={cx(s.grid4, p.mt36)}>
            {HUB_INTEGRATIONS.map((x, i) => <Reveal key={x.label} delay={i * 60}><div className={p.integration}><Icon name={x.icon} size={18} className={p.accentIcon} /><span>{x.label}</span></div></Reveal>)}
          </div>
        </Container>
      </Section>

      <Section spacing="major" surface="white" ruled="top" label="Get started">
        <Container size="narrow" className={s.center}>
          <Reveal>
            <Display size="l" className={s.centerBlock}>See OpenMaison in action.</Display>
            <div className={cx(s.buttons, s.buttonsCenter, p.mt32)}>
              <BookDemoButton testId="hub-closing-book-demo" />
              <ButtonLink href={site('/contact')} variant="ghost">Talk to us</ButtonLink>
            </div>
            <Footnote testId="hub-closing" />   {/* (S42E, E-18) the house footnote — one sentence for one thing */}
          </Reveal>
        </Container>
      </Section>
    </>
  )
}
