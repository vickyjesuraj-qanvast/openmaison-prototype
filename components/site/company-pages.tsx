import { Icon } from '@/components/om/icon'
import { COMPANY, site } from '@/lib/site/model'
import { BookDemoButton } from './book-demo'
import { ButtonLink, Container, Display, Eyebrow, Footnote, Lede, Section, cx } from './primitives'
import { Reveal } from './reveal'
import { TrustBanner } from './trust-banner'
import { ClosingCta } from './home'
import s from './site.module.css'
import p from './pages.module.css'

/*
 * (pending modules S35 — 1.0's story-view.tsx · trust-view.tsx · careers/page-client.tsx) Story, Trust & Security and Jobs, in 1.0's words. Trust's
 * "Region & residency" named four countries; 2.0 serves Singapore (his hold, 2026-10-12). Server-rendered.
 */

const TENETS = [
  { title: 'The studio comes first.', desc: 'Every feature starts with a real problem, not a roadmap.' },
  { title: 'Intuitive by design.', desc: 'Sophisticated under the hood. Effortless on the surface.' },
  { title: 'Margins are sacred.', desc: 'If beautiful work loses money, nobody wins. We protect your profit.' },
  { title: 'Local context is key.', desc: 'Every market has its own nuances. We build for them.' },
]

export function StoryView() {
  return (
    <>
      <Section top className={p.heroBand} label="Our story">
        <Container size="narrow"><Reveal><Display as="h1" size="xl" className={p.max20}>We built the software we wished we’d had.</Display></Reveal></Container>
      </Section>
      <Section surface="white" ruled="both" label="Why we built it">
        <Container size="narrow">
          <div className={p.storyBody}>
            <Reveal><p>Over the last decade, we’ve worked with thousands of interior designers across Asia and the Middle East, connected them with millions of homeowners, and built studios ourselves.</p></Reveal>
            <Reveal delay={80}><p>One lesson kept repeating itself: running a solo practice is very different from running a studio and the right systems make all the difference. Without them, leads get missed, margins shrink as projects evolve, and outcomes vary dramatically between individuals.</p></Reveal>
            <Reveal delay={160}><p className={p.strong}>So, we built OpenMaison where every frustration became a feature, every lesson a design principle.</p></Reveal>
          </div>
        </Container>
      </Section>
      <TrustBanner surface="sunk" />
      <Section spacing="major" label="Tenets">
        <Container>
          <Reveal><Display size="l">Tenets we’ll never compromise on.</Display></Reveal>
          <div className={cx(s.grid2, p.mt48)}>
            {TENETS.map((v, i) => <Reveal key={v.title} delay={(i % 2) * 80}><div className={s.card}><h3 className={p.tenet}>{v.title}</h3><p className={cx(s.cardBody, p.mt12)}>{v.desc}</p></div></Reveal>)}
          </div>
        </Container>
      </Section>
      <ClosingCta heading="The software we wished we’d had. Now yours." description="Join as an early member to get lifetime fixed pricing." secondary={{ label: 'Explore the platform', href: site('/platform') }} testId="story-closing" />
    </>
  )
}

const BLOCKS = [
  { icon: 'lock', title: 'Encryption', desc: 'Data is encrypted in transit and at rest. Sensitive credentials, including third-party OAuth tokens, are encrypted with strong, well-tested ciphers.' },
  { icon: 'verified_user', title: 'Data ownership', desc: 'Your studio’s data is yours. Export it whenever you like, in full. We never sell it and never train public models on it.' },
  { icon: 'key', title: 'Access control', desc: 'Role-based permissions down to the member level, so owners, designers and accounting each see exactly what they should and nothing more.' },
  { icon: 'directions', title: 'Region & residency', desc: 'We operate in Singapore, and we tell you where your data lives.' },
  { icon: 'database', title: 'Reliability', desc: 'Regular backups and monitored infrastructure keep your studio’s record of work safe and available.' },
  { icon: 'verified', title: 'Compliance', desc: 'Security is built into the product, not bolted on. We’re transparent about which formal certifications we hold today and which are on the roadmap.' },
]

export function TrustView() {
  return (
    <>
      <Section top className={p.heroBand} label="Trust & Security">
        <Container size="narrow">
          <Reveal>
            <Display as="h1" size="xl" className={p.max16}>Your studio’s data is yours. Full stop.</Display>
            <Lede className={p.mt24}>OpenMaison holds the record of your entire business, and we take that seriously. Here’s exactly how your data is protected, and how we keep it that way.</Lede>
          </Reveal>
        </Container>
      </Section>
      <Section spacing="major" surface="white" ruled="top" label="How your data is protected">
        <Container>
          <div className={s.grid3}>
            {BLOCKS.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 70}>
                <div className={cx(s.card, s.cardOnPaper)} data-testid="trust-block"><span className={p.trustIcon}><Icon name={b.icon} size={20} /></span><h3 className={cx(s.cardTitle, p.mt20)}>{b.title}</h3><p className={cx(s.cardBody, p.mt12)}>{b.desc}</p></div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
      <Section spacing="major" label="Security questions">
        <Container size="narrow" className={s.center}>
          <Reveal>
            <Display size="l" className={cx(s.centerBlock, p.max22)}>Have a security question before you commit?</Display>
            <Lede className={cx(s.centerBlock, p.mt20)}>We’d rather answer it directly than hide behind a policy page.</Lede>
            <div className={cx(s.buttons, s.buttonsCenter, p.mt32)}>
              <ButtonLink href={site('/contact')}>Talk to us about security</ButtonLink>
              <BookDemoButton variant="ghost" testId="trust-book-demo" />
            </div>
            <Footnote testId="trust-closing" />
          </Reveal>
        </Container>
      </Section>
    </>
  )
}

const PERKS = [
  { icon: 'home', label: 'Location agnostic', description: 'Work from anywhere in Southeast Asia' },
  { icon: 'schedule', label: 'Flexible hours', description: 'We measure output, not hours logged' },
  { icon: 'verified_user', label: 'Health coverage', description: 'Comprehensive medical and dental' },
  { icon: 'group', label: 'Team retreats', description: 'Quarterly in-person meetups' },
  { icon: 'menu_book', label: 'Learning budget', description: 'S$2,000/year for courses and conferences' },
  { icon: 'domain', label: 'Co-working access', description: 'WeWork or equivalent near you' },
]
const OPENINGS = [
  { title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Singapore / Remote', type: 'Full-time' },
  { title: 'AI/ML Engineer', team: 'AI Platform', location: 'Singapore / Remote', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Singapore', type: 'Full-time' },
  { title: 'Customer Success Lead, SEA', team: 'Growth', location: 'Singapore / KL', type: 'Full-time' },
]

export function CareersView() {
  return (
    <>
      <Section top label="Jobs">
        <Container size="narrow" className={s.center}>
          <Reveal><Display as="h1" size="xl">Come build software that studios actually use.</Display></Reveal>
          <Reveal delay={80}><Lede className={cx(s.centerBlock, p.mt24)}>We’re a small team building the operating system for the global interior design industry. It’s a sector that still largely runs on WhatsApp and spreadsheets, giving us a once-in-a-generation opportunity to redefine a $100B+ industry.</Lede></Reveal>
        </Container>
      </Section>
      <Section spacing="major" surface="white" label="Why join us">
        <Container>
          <Reveal className={s.center}><Eyebrow center>Why join us</Eyebrow><Display size="l" className={p.mt20}>A calm place to do your best work.</Display></Reveal>
          <div className={cx(s.grid3, p.mt48)}>
            {PERKS.map((x, i) => <Reveal key={x.label} delay={i * 60}><div className={cx(s.card, s.cardOnPaper, p.perk)}><span className={p.perkIcon}><Icon name={x.icon} size={20} /></span><div><p className={p.perkLabel}>{x.label}</p><p className={p.perkText}>{x.description}</p></div></div></Reveal>)}
          </div>
        </Container>
      </Section>
      <Section spacing="major" surface="sunk" label="Open roles">
        <Container size="narrow">
          <Reveal className={s.center}>
            <Eyebrow center>Open roles</Eyebrow>
            <Display size="l" className={p.mt20}>We’re hiring across the team.</Display>
            <p className={cx(s.bodyM, s.centerBlock, p.max52, p.mt20)}>Don’t see your role? Email us at <a href={`mailto:${COMPANY.email}`} className={s.inlineLink}>{COMPANY.email}</a></p>
          </Reveal>
          <div className={p.roles}>
            {OPENINGS.map((r, i) => (
              <Reveal key={r.title} delay={i * 70}>
                <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(`Application: ${r.title}`)}`} className={p.role} data-testid="job">
                  <div><h3 className={p.roleTitle}>{r.title}</h3><div className={p.roleMeta}><span>{r.team}</span><span aria-hidden className={p.roleSep}>·</span><span>{r.location}</span><span aria-hidden className={p.roleSep}>·</span><span>{r.type}</span></div></div>
                  <span className={p.apply}>Apply<Icon name="arrow_forward" size={16} /></span>
                </a>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
      <Section spacing="major" surface="white" label="Get in touch">
        <Container size="narrow" className={s.center}>
          <Reveal>
            <Display size="l" className={cx(s.centerBlock, p.max24)}>Come build something that lasts.</Display>
            <Lede className={cx(s.centerBlock, p.mt24)}>A small team. Big ownership. Solving hard problems.</Lede>
            <div className={cx(s.buttons, s.buttonsCenter, p.mt36)}><ButtonLink href={`mailto:${COMPANY.email}`}>Get in touch</ButtonLink></div>
          </Reveal>
        </Container>
      </Section>
    </>
  )
}

/** A site address that isn't one (1.0's marketing not-found, inside the site's frame). */
export function SiteNotFound() {
  return (
    <Section spacing="major" top label="Page not found">
      <Container size="narrow" className={s.center}>
        <Eyebrow center>404</Eyebrow>
        <Display as="h1" size="xl" className={p.mt20}>This page doesn’t exist.</Display>
        <Lede className={cx(s.centerBlock, p.mt24)}>The link may be old, or the page may have moved. Everything worth seeing is one click away.</Lede>
        <div className={cx(s.buttons, s.buttonsCenter, p.mt40)}>
          <ButtonLink href={site('/')}>Back to home</ButtonLink>
          <ButtonLink href={site('/platform')} variant="ghost">Explore the platform</ButtonLink>
        </div>
      </Container>
    </Section>
  )
}
