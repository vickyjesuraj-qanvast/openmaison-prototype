'use client'

import { useState } from 'react'
import { SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { CreditToken } from '@/components/om/credit-token'
import type { BillingCycle } from '@/lib/credits/plans'
import { ANNUAL_LABEL, freeCard, maxCard, PRICING_WORDS as W, proCard, QUESTIONS, type PlanCard } from '@/lib/site/pricing'
import { BookDemoButton } from './book-demo'
import { ButtonLink, Container, Display, Eyebrow, Lede, Section, StatusTag, cx } from './primitives'
import s from './site.module.css'
import p from './pages.module.css'
import st from './pricing.module.css'

/* (S46D — D4) Pricing's client pieces: the hero's billing period and the plans it prices (Pro's Freelance · Studio), and the questions. */

/** The hero (its period) and the three plans — one state, two bands. */
export function PricingTop() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [kind, setKind] = useState<'pro_freelance' | 'pro_studio'>('pro_freelance')
  const cards = [freeCard(), proCard(kind, cycle), maxCard()]
  return (
    <>
      <Section top label="Pricing" className={p.heroBand}>
        <Container size="narrow" className={s.center}>
          <Eyebrow center>Pricing</Eyebrow>
          <Display as="h1" size="xl" className={cx(p.mt24, p.max18, s.centerBlock)}>{W.title}</Display>
          <Lede className={cx(p.mt24, s.centerBlock)}>{W.lede}</Lede>
          <div className={st.period}>
            <SegmentedButton aria-label="Billing" selectedKeys={[cycle]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'monthly' || v === 'yearly') setCycle(v) }} data-testid="pricing-period">
              <SegmentedButtonItem id="monthly">Monthly</SegmentedButtonItem>
              <SegmentedButtonItem id="yearly">{ANNUAL_LABEL}</SegmentedButtonItem>
            </SegmentedButton>
          </div>
        </Container>
      </Section>

      <Section spacing="compact" label="Plans" className={st.plansBand}>
        <Container>
          <div className={st.plans} data-testid="pricing-plans">
            {cards.map((c) => <PlanCardView key={c.key} card={c} kind={kind} onKind={setKind} />)}
          </div>
          <p className={st.under}><span>{W.taxLine}</span><a href="#compare" className={s.inlineLink} data-testid="pricing-compare-link">{W.compareLink}<Icon name="arrow_downward" size={16} className={st.inlineIcon} /></a></p>
        </Container>
      </Section>

    </>
  )
}

function PlanCardView({ card: c, kind, onKind }: { card: PlanCard; kind: 'pro_freelance' | 'pro_studio'; onKind: (k: 'pro_freelance' | 'pro_studio') => void }) {
  const pro = c.key === 'pro'
  return (
    <article className={cx(s.card, st.plan)} data-featured={pro || undefined} data-testid={`pricing-plan-${c.key}`} aria-labelledby={`plan-${c.key}`}>
      <div className={st.planHead}>
        <h2 id={`plan-${c.key}`} className={st.planName}>{c.name}</h2>
        {c.popular && pro ? <StatusTag>Popular</StatusTag> : null}
      </div>
      <p className={st.tagline}>{c.tagline}</p>
      {pro ? (
        <div className={st.kind}>
          <SegmentedButton aria-label="Studio size" selectedKeys={[kind]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'pro_freelance' || v === 'pro_studio') onKind(v) }} data-testid="pricing-kind">
            <SegmentedButtonItem id="pro_freelance">Freelance</SegmentedButtonItem>
            <SegmentedButtonItem id="pro_studio">Studio</SegmentedButtonItem>
          </SegmentedButton>
        </div>
      ) : null}
      <div className={st.priceRow}><span className={cx(st.price, !c.per && st.talk)} data-testid={`pricing-price-${c.key}`}>{c.price}</span>{c.per ? <span className={st.per}>{c.per}</span> : null}</div>
      <p className={st.note}>{c.note}</p>
      {c.annual ? <p className={st.note} data-testid="pricing-annual">{c.annual}</p> : null}
      <p className={st.allow}><CreditToken size={18} /><span><span data-testid={`pricing-allowance-${c.key}`}>{c.allowance}</span><span className={st.muted}>{` · ${c.buys}`}</span></span></p>
      <div className={st.cta}>
        {c.href ? <ButtonLink href={c.href} variant={pro ? 'primary' : 'ghost'} className={st.ctaButton} testId={`pricing-cta-${c.key}`}>{c.cta}</ButtonLink>
          : <BookDemoButton label={c.cta} variant="ghost" className={st.ctaButton} testId={`pricing-cta-${c.key}`} />}
        {c.fine ? <p className={st.fine}>{c.fine}</p> : null}
      </div>
      <ul className={st.list}>
        {c.list.map((l) => <li key={l}><Icon name="check" size={18} className={st.check} />{l}</li>)}
      </ul>
    </article>
  )
}

/** The questions, one open at a time — the first open (Plans' own pattern). */
export function PricingQuestions() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className={cx(st.faq, p.mt40)} data-testid="pricing-faq">
      {QUESTIONS.map((f, i) => (
        <div key={f.q} className={st.qa} data-open={open === i || undefined}>
          <h3 className={st.qHead}>
            <button type="button" className={st.q} aria-expanded={open === i} aria-controls={`pricing-a-${i}`} onClick={() => setOpen((x) => (x === i ? null : i))}>
              {f.q}<Icon name="expand_more" size={22} className={st.qIcon} />
            </button>
          </h3>
          {open === i ? <p id={`pricing-a-${i}`} className={st.a}>{f.a}</p> : null}
        </div>
      ))}
    </div>
  )
}
