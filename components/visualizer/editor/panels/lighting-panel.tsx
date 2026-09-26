'use client'

import { Button, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { cycleTri, FIXTURES, intensityLabel, RANGES, RELIGHT_PRESETS, shadowLabel, sunLabel, tempLabel, type RelightKnobs } from '@/lib/visualizer/lighting'
import { neutralKnobs, type Pending } from '@/lib/visualizer/model'
import { rovingKey } from '@/components/om/chips'
import chips from '@/components/om/chips.module.css'
import { Panel } from '../rail'
import styles from './panels.module.css'

/**
 * Lighting (REG-674, Q-22; 1.0's RelightControls, B-93…B-99): the six moods with 1.0's photos of each, Off, then the sliders with their
 * words and the fixtures (unset → on → off). The photo previews the light live as it changes — one step where 1.0 rendered first
 * and let you tweak after; Generate keeps it as a version. (F065) Words about the light go in *Describe a change* — the one box for
 * words; the old *Anything else about the light* field shows only for a design that still holds such words, so they can be read and
 * cleared.
 */
export function LightingPanel({ pending, onLighting, advanced, onAdvanced }: {
  pending: Pending
  onLighting: (fn: (l: Pending['lighting']) => Pending['lighting'], coalesce?: string) => void
  advanced: boolean
  onAdvanced: (v: boolean) => void
}) {
  const l = pending.lighting, k = l.knobs
  const knob = (patch: Partial<RelightKnobs>, key: string) => onLighting((x) => ({ ...x, presetId: null, knobs: { ...x.knobs, ...patch } }), key)
  const slider = (key: 'sunAngle' | 'colorTemp' | 'intensity' | 'shadows', label: string, [min, max]: readonly [number, number], step: number, words: string) => (
    <div className={styles.slider}>
      <label htmlFor={`viz-${key}`}>{label}</label><output htmlFor={`viz-${key}`}>{words}</output>
      <input id={`viz-${key}`} type="range" min={min} max={max} step={step} value={k[key]} onChange={(e) => knob({ [key]: Number(e.target.value) }, key)} />
    </div>
  )
  const picked = !!l.presetId && RELIGHT_PRESETS.some((p) => p.id === l.presetId)
  const off = !l.presetId && JSON.stringify(k) === JSON.stringify(neutralKnobs()) && !l.instruction.trim()
  return (
    <Panel title="Lighting" sub="The photo previews it as you pick — Generate keeps it" testId="viz-lighting"
           actions={!off ? <Button appearance="text" onPress={() => onLighting(() => ({ presetId: null, knobs: neutralKnobs(), instruction: '' }))}>Reset</Button> : undefined}>
      {/* (F169) one Tab stop — the arrows move along the moods and pick the one reached */}
      <div className={styles.cards} role="radiogroup" aria-label="Lighting" onKeyDown={(e) => { rovingKey(e, ':scope > [role=radio]') }}>
        <button type="button" role="radio" aria-checked={off} tabIndex={off || !picked ? 0 : -1} className={styles.card} data-on={off || undefined} onClick={() => onLighting(() => ({ presetId: null, knobs: neutralKnobs(), instruction: '' }))}>
          <span className={styles.hatch} /><span className={styles.cardName}>Off</span><span className={styles.cardHelp}>The photo’s own light</span>
        </button>
        {RELIGHT_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={l.presetId === p.id} tabIndex={l.presetId === p.id ? 0 : -1} className={styles.card} data-on={l.presetId === p.id || undefined} data-testid="viz-light-card"
                  onClick={() => onLighting((x) => (x.presetId === p.id ? { presetId: null, knobs: neutralKnobs(), instruction: x.instruction } : { ...x, presetId: p.id, knobs: { ...p.knobs, fixtures: { ...p.knobs.fixtures } } }))}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cardPic} src={p.preview} alt="" loading="lazy" />
            {l.presetId === p.id ? <span className={styles.cardCheck}><Icon name="done" size={14} /></span> : null}
            <span className={styles.cardName}>{p.label}</span><span className={styles.cardHelp}>{p.desc}</span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.disclose} aria-expanded={advanced} onClick={() => onAdvanced(!advanced)}><Icon name={advanced ? 'expand_less' : 'expand_more'} size={20} />Fine-tune it by hand</button>
      {advanced ? (
        <div className={styles.section}>
          {slider('sunAngle', 'Sun angle', RANGES.sun, 1, sunLabel(k.sunAngle))}
          {slider('colorTemp', 'Colour temperature', RANGES.temp, 100, tempLabel(k.colorTemp))}
          {slider('intensity', 'Intensity', RANGES.intensity, 1, intensityLabel(k.intensity))}
          {slider('shadows', 'Shadows', RANGES.shadows, 1, shadowLabel(k.shadows))}
          <span className={styles.head}>Fixtures</span>
          <div className={styles.tri} role="group" aria-label="Fixtures">
            {FIXTURES.map((f) => (
              <button key={f.key} type="button" className={chips.chip} data-state={k.fixtures[f.key]} aria-label={`${f.label}: ${k.fixtures[f.key] === 'unset' ? 'as it is' : k.fixtures[f.key]}`}
                      onClick={() => onLighting((x) => ({ ...x, knobs: { ...x.knobs, fixtures: { ...x.knobs.fixtures, [f.key]: cycleTri(x.knobs.fixtures[f.key]) } } }))}>
                {f.label}{k.fixtures[f.key] !== 'unset' ? ` · ${k.fixtures[f.key]}` : ''}
              </button>
            ))}
          </div>
          <span className={styles.hint}>Tap a fixture to switch it on, again for off, a third time to leave it as it is.</span>
        </div>
      ) : null}
      {l.instruction.trim() ? <TextArea label="Anything else about the light (optional)" value={l.instruction} onChange={(v: string) => onLighting((x) => ({ ...x, instruction: v }), 'instruction')} /> : null}
      <span className={styles.hint}>Words about the light — “a warm glow in the corner” — go in Describe a change.</span>
    </Panel>
  )
}
