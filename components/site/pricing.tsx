import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { CreditToken } from '@/components/om/credit-token'
import type { CompareCell } from '@/lib/credits/pricing-data'
import { MODULES } from '@/lib/site/platform'
import { ACTIONS, COMPARISON, freeCard, MONTHS, PRICING_WORDS as W, TOPUP } from '@/lib/site/pricing'
import { ClosingCta } from './home'
import { PricingQuestions, PricingTop } from './pricing-client'
import { Container, Display, Eyebrow, Lede, Section, Tile, cx } from './primitives'
import { Reveal } from './reveal'
import s from './site.module.css'
import p from './pages.module.css'
import st from './pricing.module.css'

/*
 * (S46D — D4, his "fix everything" 2026-10-19 after the findability audit; finding D4 · raw T-2) OpenMaison's public Pricing at /site/pricing —
 * 1.0's plg page in its content shape, on the site's own pieces: the hero with the billing period, the three plans (Pro's Freelance · Studio
 * as Plans has it), every tool from day one, how AI credits work (per action · what a month buys · top-ups), the whole comparison, the
 * questions, and the closing band. Every number comes from the app's one source through lib/site/pricing.ts. A plan's button starts the studio
 * with the pick carried (`/sign-up?plan=…&period=…`); the new studio opens Plans on it. Max's is Talk to us — Book a demo. Drawn on the
 * server; the period, Pro's size and the questions are the client's (./pricing-client.tsx).
 */

const PLANS = ['Free', 'Pro', 'Max'] as const

export function PricingView() {
  return (
    <>
      <PricingTop />

      <Section surface="white" ruled="top" label="Every tool">
        <Container>
          <Reveal className={s.center}>
            <Display size="m" className={s.centerBlock}>{W.toolsTitle}</Display>
            <Lede className={cx(p.mt20, s.centerBlock)}>{W.toolsLede}</Lede>
          </Reveal>
          <div className={cx(s.grid4, p.mt40)}>
            {MODULES.map((m, i) => (
              <Reveal key={m.slug} delay={i * 40}>
                <Link href={m.href} className={cx(s.card, s.linkCard, st.tool)}>
                  <Tile hue={m.slug} icon={m.icon} size="m" />
                  <span className={st.toolText}><span className={s.cardTitle}>{m.name}</span><span className={st.toolBlurb}>{m.menuBlurb}</span></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section spacing="major" label="AI credits">
        <Container>
          <Reveal>
            <Eyebrow>AI credits</Eyebrow>
            <Display size="l" className={p.mt20}>{W.creditsTitle}</Display>
            <Lede className={p.mt20}>{W.creditsLede}</Lede>
          </Reveal>
          <div className={cx(st.credits, p.mt40)}>
            <Reveal className={st.fill}>
              <div className={cx(s.card, st.panel)} data-testid="pricing-actions">
                <h3 className={cx(s.cardTitle, st.panelTitle)}>{W.actionsTitle}</h3>
                <ul className={st.rows}>
                  {ACTIONS.map((a) => (
                    <li key={a.key} className={st.row} data-action={a.key}>
                      <span>{a.name}</span>
                      <span className={st.rowValue}><CreditToken size={16} /><b data-testid="pricing-action-credits">{a.credits}</b><span className={st.muted}>{` · ${a.unit}`}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={80} className={st.fill}>
              <div className={cx(s.card, st.panel)} data-testid="pricing-months">
                <h3 className={cx(s.cardTitle, st.panelTitle)}>{W.monthTitle}</h3>
                <ul className={st.rows}>
                  {MONTHS.map((m) => (
                    <li key={m.label} className={st.month}>
                      <span className={st.monthHead}><span>{m.label}</span><span className={st.rowValue}><CreditToken size={16} /><b>{m.credits.toLocaleString('en-SG')}</b></span></span>
                      <span className={st.muted}>{`${m.renders.toLocaleString('en-SG')} renders · ${m.quotes.toLocaleString('en-SG')} quotes read · ${m.copilot} of the Meeting Copilot`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <div className={cx(s.card, st.topup)} data-testid="pricing-topup">
              <div><h3 className={cx(s.cardTitle, st.panelTitle)}>{W.topupTitle}</h3><p className={cx(s.body, st.topupLine)}>{TOPUP.line}</p></div>
              <ul className={st.picks} aria-label="Top-up amounts">
                {TOPUP.picks.map((t) => <li key={t.credits} className={st.pick}><CreditToken size={16} /><b>{t.credits}</b><span className={st.muted}>{t.price}</span></li>)}
              </ul>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section spacing="major" surface="white" ruled="top" id="compare" label={W.compareTitle}>
        <Container>
          <Reveal>
            <Eyebrow>Compare plans</Eyebrow>
            <Display size="l" className={p.mt20}>{W.compareTitle}</Display>
          </Reveal>
          <div className={cx(st.compare, p.mt40)} role="table" aria-label={W.compareTitle} data-testid="pricing-compare">
            <div role="rowgroup">
              <div role="row" className={cx(st.cRow, st.cHead)}>
                <span role="columnheader" className={st.cLabel}><span className={s.srOnly}>Feature</span></span>
                {PLANS.map((n) => <span key={n} role="columnheader" className={st.cPlan}>{n}</span>)}
              </div>
            </div>
            {COMPARISON.map((g) => (
              <div key={g.group} role="rowgroup">
                <div role="row" className={st.cGroupRow}><span role="cell" className={st.cGroup}>{g.group}</span></div>
                {g.rows.map((r) => (
                  <div key={r.label} role="row" className={st.cRow} data-testid="pricing-compare-row">
                    <span role="rowheader" className={st.cLabel}>{r.label}</span>
                    {r.cells.map((v, i) => <Cell key={PLANS[i]} plan={PLANS[i]!} v={v} />)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section spacing="major" label={W.faqTitle}>
        <Container size="narrow">
          <Reveal><Display size="l">{W.faqTitle}</Display></Reveal>
          <PricingQuestions />
        </Container>
      </Section>

      <ClosingCta heading={W.closingTitle} description={W.closingLede} primary={{ label: freeCard().cta, href: freeCard().href!, fine: 'No card needed' }} testId="pricing-closing" />
    </>
  )
}

/** One comparison cell: ✓ included, — not included, else its words; on a phone each cell names its plan (the head row folds away). */
function Cell({ plan, v }: { plan: string; v: CompareCell }) {
  return (
    <span role="cell" className={st.cCell}>
      <span className={st.cellPlan}>{plan}</span>
      {v === true ? <><Icon name="check" size={18} className={st.check} /><span className={s.srOnly}>Included</span></>
        : v === false ? <><span aria-hidden className={st.no}>—</span><span className={s.srOnly}>Not included</span></> : <span>{v}</span>}
    </span>
  )
}

