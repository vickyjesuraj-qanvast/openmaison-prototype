import { Icon } from '@/components/om/icon'
import { Container, Display, Section, cx } from '@/components/site/primitives'
import { CLOSING, FAQ_TITLE, ROOM_TYPES, TRIAL_TOOL_CONTENT, WORKS_ON } from '@/lib/visualizer/trial/content'
import type { TrialTool } from '@/lib/visualizer/trial/policy'
import { TryItFree } from './trial-start'
import s from '@/components/site/site.module.css'
import p from '@/components/site/pages.module.css'
import t from './trial.module.css'

/**
 * (pending modules S36 — 1.0's trial-tool-marketing.tsx, "the 'how it works / features / FAQ' sections … filled with content that's actually
 * true of this trial") What a tool's landing page says under its start, for the person and for search: the recap, the rooms it works on,
 * how it works, the key features, the questions (each opens in place — the browser's own disclosure), and the closing call. Server-drawn.
 */
export function TrialToolMarketing({ tool }: { tool: TrialTool }) {
  const c = TRIAL_TOOL_CONTENT[tool]
  const rest = c.headline.slice(c.accent.length)
  return (
    <>
      <Section surface="white" ruled="both" label="What it does">
        <Container size="narrow" className={t.recap}>
          <Display size="l" className={s.centerBlock}><span className={s.gradientText}>{c.accent}</span>{rest}</Display>
          <p className={cx(s.lede, s.centerBlock, p.mt20)}>{c.description}</p>
          <p className={cx(s.label, p.mt40)}>{WORKS_ON}</p>
          <ul className={t.rooms}>{ROOM_TYPES.map((r) => <li key={r} className={t.room}>{r}</li>)}</ul>
        </Container>
      </Section>
      <Section label="How it works">
        <Container>
          <Display size="m">How it works</Display>
          <ol className={t.steps4} data-testid="trial-steps">
            {c.steps.map((st, i) => (
              <li key={st.title} className={s.card}>
                <span className={p.stepNo}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={cx(s.cardTitle, p.mt12)}>{st.title}</h3>
                <p className={s.cardBody}>{st.desc}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>
      <Section surface="sunk" label="Key features">
        <Container>
          <Display size="m">Key features</Display>
          <div className={cx(s.grid2, p.mt32)} data-testid="trial-features">
            {c.features.map((f) => (
              <div key={f.title} className={s.card}><h3 className={s.cardTitle}>{f.title}</h3><p className={s.cardBody}>{f.desc}</p></div>
            ))}
          </div>
        </Container>
      </Section>
      <Section label={FAQ_TITLE}>
        <Container size="narrow">
          <Display size="m">{FAQ_TITLE}</Display>
          <div className={t.faqs} data-testid="trial-faqs">
            {c.faqs.map((f) => (
              <details key={f.q} className={t.faq}>
                <summary>{f.q}<Icon name="expand_more" size={20} /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>
      <Section spacing="compact" surface="white" ruled="top" label="Try it">
        <Container size="narrow" className={s.center}>
          <div className={cx(s.buttons, s.buttonsCenter)}><TryItFree label={CLOSING} /></div>
        </Container>
      </Section>
    </>
  )
}
