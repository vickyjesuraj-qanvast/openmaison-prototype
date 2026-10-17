'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { CompareSlider } from '@/components/om/compare-slider'
import { Icon } from '@/components/om/icon'
import { Container, Display, Eyebrow, Lede, Section, cx } from '@/components/site/primitives'
import { site } from '@/lib/site/model'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import { HERO_COMPARE, START, TOOL_INFO, TRIAL_CARDS } from '@/lib/visualizer/trial/content'
import { allowanceLine, SAMPLE_ONLY, TRIAL_TOOLS, trialHref, type TrialTool } from '@/lib/visualizer/trial/policy'
import { ROOM_ACCEPT } from '../editor/picture-reader'
import s from '@/components/site/site.module.css'
import p from '@/components/site/pages.module.css'
import t from './trial.module.css'

/** The sample rooms the start offers (1.0's VISUALIZER_SAMPLES order: the living room, the kitchen, the bedroom). */
const ROOMS = ['living-room', 'kitchen', 'bedroom'].map((k) => SAMPLE_ROOMS.find((x) => x.key === k)).filter((x): x is (typeof SAMPLE_ROOMS)[number] => !!x)
const KITCHEN = SAMPLE_ROOMS.find((x) => x.key === 'kitchen')

/**
 * (pending modules S36 — 1.0's trial-start.tsx) The trial before a photo is in: three ways in, in order of effort — a sample room, a photo,
 * the phone's camera. The root page adds the proof (a live before / after the engine made) and one card per tool, each its own before /
 * after and a door to that tool's page; a tool's page leads with that tool. Site pages, the website's own type and buttons.
 */
export function TrialStart({ tool, left, busy, onFile, onSample }: {
  tool: TrialTool | null
  left: number
  /** what is opening: 'upload', or a sample's key (with `:sketch`) */
  busy: string | null
  onFile: (f: File) => void
  onSample: (key: string, asSketch: boolean) => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const info = tool ? TOOL_INFO[tool] : null
  const isSketch = tool === 'sketch'
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }
  const tiles: { key: string; name: string; src: string; sketch: boolean }[] = isSketch && KITCHEN?.sketch
    ? [{ key: KITCHEN.key, name: 'Kitchen concept sketch', src: KITCHEN.sketch, sketch: true }]
    : ROOMS.map((r) => ({ key: r.key, name: r.name, src: r.original, sketch: false }))
  return (
    <>
      <Section top className={p.heroBand} label={info ? info.title : 'Try the AI Visualizer'} id="try-start">
        <Container>
          <nav aria-label="Breadcrumb" className={p.crumbs}>
            {tool
              ? <Link href={trialHref()} className={p.crumbBack} data-testid="trial-crumb"><Icon name="arrow_back" size={16} />Try the AI Visualizer</Link>
              : <Link href={site('/platform/visualizer')} className={p.crumbBack} data-testid="trial-crumb"><Icon name="arrow_back" size={16} />AI Visualizer</Link>}
            <span aria-hidden className={p.crumbSep}>/</span><span aria-current="page" className={p.crumbHere}>{info ? info.title : 'Try it'}</span>
          </nav>
          <div className={t.hero} data-tool={tool || undefined}>
            <div>
              <Eyebrow><span className={t.allowance} data-testid="trial-allowance">{START.eyebrow} · {allowanceLine(left)}</span></Eyebrow>
              <Display as="h1" size="l" className={p.mt20}>{info ? info.title : START.title}</Display>
              <Lede className={p.mt20}>{info ? info.subtitle : START.lede}</Lede>
              <input ref={file} type="file" accept={ROOM_ACCEPT} hidden onChange={pick} data-testid="trial-file" />
              <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
              <div className={cx(t.uploadRow, p.mt32)}>
                <button type="button" className={cx(s.button, s.primary)} disabled={!!busy} onClick={() => file.current?.click()} data-testid="trial-upload">
                  <Icon name={busy === 'upload' ? 'progress_activity' : 'add_photo_alternate'} size={20} className={busy === 'upload' ? t.spin : undefined} />{busy === 'upload' ? 'Opening…' : isSketch ? START.uploadSketch : START.upload}
                </button>
                <button type="button" className={cx(s.button, s.ghost, t.camera)} disabled={!!busy} onClick={() => camera.current?.click()}><Icon name="photo_camera" size={20} />{START.camera}</button>
              </div>
              {tool && SAMPLE_ONLY[tool] ? <p className={cx(s.fine, p.mt12)} data-testid="trial-sample-only-line">{SAMPLE_ONLY[tool]}</p> : null}
              <div className={p.mt32}>
                <p className={t.samplesHead}>{isSketch ? START.sketchSample : START.samples}</p>
                <div className={t.samples} role="list">
                  {tiles.map((x) => {
                    const key = `${x.key}${x.sketch ? ':sketch' : ''}`
                    return (
                      <button key={key} type="button" role="listitem" className={t.sample} disabled={!!busy} onClick={() => onSample(x.key, x.sketch)} data-testid="trial-sample" data-sample={key}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={x.src} alt="" loading="lazy" decoding="async" />
                        <span className={t.sampleName}>{x.name}<Icon name={busy === key ? 'progress_activity' : 'arrow_forward'} size={16} className={busy === key ? t.spin : undefined} /></span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className={cx(s.fine, p.mt24)}>{START.fine}</p>
            </div>
            {!tool ? (
              <figure className={t.figure}>
                <CompareSlider before={HERO_COMPARE.before} after={HERO_COMPARE.after} className={t.compare} testId="trial-hero-compare" />
                <figcaption className={t.caption}>
                  <span>{HERO_COMPARE.caption}</span>
                  <button type="button" className={cx(s.textLink, t.linkButton)} disabled={!!busy} onClick={() => onSample(HERO_COMPARE.sample, false)} data-testid="trial-hero-open">Open this sample<Icon name="arrow_forward" size={16} className={s.arrow} /></button>
                </figcaption>
              </figure>
            ) : null}
          </div>
        </Container>
      </Section>
      {!tool ? (
        <Section spacing="compact" label={START.tools}>
          <Container>
            <div className={t.toolsHead}><Display size="m">{START.tools}</Display><span className={s.fine}>{START.toolsAside}</span></div>
            <div className={s.grid3}>
              {TRIAL_TOOLS.map((k) => {
                const c = TRIAL_CARDS[k], m = TOOL_INFO[k]
                return (
                  <div key={k} className={t.toolCard} data-testid="trial-tool-card" data-tool={k}>
                    <CompareSlider before={c.before} after={c.after} beforeLabel={c.beforeLabel} afterLabel={c.afterLabel} className={t.toolCompare} />
                    <Link href={trialHref(k)} className={t.toolButton} data-testid="trial-tool-link">
                      <span className={t.toolTitle}><Icon name={m.icon} size={20} />{m.title}<Icon name="arrow_forward" size={16} /></span>
                      <span className={t.toolLine}>{m.subtitle}</span>
                    </Link>
                  </div>
                )
              })}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  )
}

/** A landing page's closing call (1.0's "Try it free"): back up to the page's own start, the upload button in hand. */
export function TryItFree({ label }: { label: string }) {
  return (
    <button type="button" className={cx(s.button, s.primary)} data-testid="trial-closing"
            onClick={() => {
              const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
              document.getElementById('try-start')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
              document.querySelector<HTMLElement>('[data-testid="trial-upload"]')?.focus({ preventScroll: true })
            }}><Icon name="add_photo_alternate" size={20} />{label}</button>
  )
}
