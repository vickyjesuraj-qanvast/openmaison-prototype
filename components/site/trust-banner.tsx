import { Container, Display, Lede, Section } from './primitives'
import { Reveal } from './reveal'
import s from './site.module.css'
import t from './trust-banner.module.css'

/*
 * (pending modules S35 — 1.0's trust-banner.tsx) "Built by the team behind Qanvast": the lineage, Qanvast's track record and the studios' logo
 * wall (a slow marquee, still with reduced motion). ONE implementation for the home page and Story, as 1.0 kept it. Each logo carries its own
 * height (1.0 normalised them by area, not by height — a tall lockup and an ultra-wide wordmark read the same size).
 */
const LOGOS = [
  { name: 'Cové Interior', src: 'cove-interior', h: 56 }, { name: 'Dyel', src: 'dyel', h: 29 }, { name: 'El Arte Design', src: 'el-arte-design', h: 33 },
  { name: 'H Design', src: 'h-design', h: 46 }, { name: 'Hi-reno', src: 'hi-reno', h: 36 }, { name: 'iDesigner Lab', src: 'idesigner-lab', h: 43 },
  { name: 'Level-Up Studio', src: 'level-up-studio', h: 36 }, { name: 'Mavid', src: 'mavid', h: 38 }, { name: 'Quad.R Design', src: 'quad-r-design', h: 42 },
  { name: 'Todz Interior', src: 'todz-interior', h: 37 }, { name: 'Vanguard Constructs', src: 'vanguard-constructs', h: 20 },
] as const
const FIGURES = [{ value: '10+', label: 'years in interior design' }, { value: '3M+', label: 'homeowners connected' }, { value: '500+', label: 'studios on the platform' }] as const

function Logo({ l, hidden = false }: { l: (typeof LOGOS)[number]; hidden?: boolean }) {
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`/site/logos/${l.src}.png`} alt={hidden ? '' : l.name} className={t.logo} style={{ height: l.h }} loading="lazy" />
}

export function TrustBanner({ surface = 'white' }: { surface?: 'white' | 'sunk' }) {
  return (
    <Section surface={surface} ruled="both" className={t.band} label="Built by the team behind Qanvast">
      <Container>
        <Reveal className={s.center}>
          <Display size="l" className={s.centerBlock}>
            <span className={t.noWrap}>Built by the team behind</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className={t.qanvast}><img src="/site/logos/qanvast.svg" alt="Qanvast" className={t.qanvastLogo} /></span>
          </Display>
          <Lede className={`${s.centerBlock} ${t.lede}`}>Asia’s largest interior design and renovation platform.</Lede>
        </Reveal>
        <Reveal delay={80} className={t.figures}>
          {FIGURES.map((f) => <div key={f.value} className={t.figure}><span className={t.value}>{f.value}</span><span className={s.label}>{f.label}</span></div>)}
        </Reveal>
        <Reveal delay={90} className={t.wall}>
          <div className={t.marquee} data-testid="trust-logos">
            <div className={t.track}>
              <div className={t.group}>{LOGOS.map((l) => <Logo key={l.src} l={l} />)}</div>
              <div className={t.group} aria-hidden>{LOGOS.map((l) => <Logo key={l.src} l={l} hidden />)}</div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
