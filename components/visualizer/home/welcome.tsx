'use client'

import { useRef } from 'react'
import { Button } from '@/components/ds'
import { CompareSlider } from '@/components/om/compare-slider'
import { Icon } from '@/components/om/icon'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import { WELCOME_AFTER } from '@/lib/visualizer/welcome-after'
import { ROOM_ACCEPT } from '@/components/visualizer/editor/dialogs/add-room'
import styles from './welcome.module.css'

/** The sample the welcome shows first: the living room, its own photo before and after — the after is that same photo painted by the
    engine (lib/visualizer/welcome-after.ts, scripts/viz/welcome-render.mts), so the divider shows only what the picks change. (Owner
    2026-09-30: "this before and after image looks different … keep one image and do perfect before and after of the same image" — the
    1.0 Japandi render it used was a different camera.) */
const SHOWN = SAMPLE_ROOMS.find((s) => s.key === WELCOME_AFTER.sample) ?? SAMPLE_ROOMS[0]!
/** The row under it — the living room, the kitchen, the master bedroom (the canvas' order). */
const ROW = ['living-room', 'kitchen', 'bedroom'].map((k) => SAMPLE_ROOMS.find((s) => s.key === k)).filter((s): s is (typeof SAMPLE_ROOMS)[number] => !!s)
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * (REG-735, owner 2026-09-30 — the canvas' direction D: "users might land here for the first time and … don't know where to click") Tools ›
 * AI Visualizer's first run: the intro card and the empty state become ONE welcome (rule ④, say it once). The result first — a sample
 * room, before and after, the divider yours to drag — then the one filled way in, "Upload a room photo" (it answers C), a lead's photos
 * second, and the three sample rooms right under it. Samples stay doors, not records: one becomes a design ("Sample · Living room") only
 * when it is opened. The first design brings the gallery, its toolbar and the three-step card back.
 */
export function VisualizerWelcome({ busy, onUpload, onLead, onSample }: {
  busy: boolean
  /** The picked photos: the landing makes the design and hands them to the editor (lib/visualizer/pending-photos.ts). */
  onUpload: (files: File[]) => void
  onLead: () => void
  onSample: (key: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <section className={styles.welcome} aria-labelledby="viz-welcome-title" data-testid="viz-welcome">
      <div className={styles.hero}>
        <div className={styles.lead}>
          <div className={styles.texts}>
            <h2 id="viz-welcome-title" className={styles.title}>Turn a room photo into a finished design</h2>
            <p className={styles.sub}>In minutes — and show the client before a single tile is ordered.</p>
          </div>
          <ol className={styles.steps}>
            <li><span className={styles.stepN} aria-hidden>1</span><span><b>Add a room photo</b> — a site photo, a 3D view or a sketch.</span></li>
            <li><span className={styles.stepN} aria-hidden>2</span><span><b>Tap a surface, pick a finish</b> — or restyle the whole room.</span></li>
            <li><span className={styles.stepN} aria-hidden>3</span><span><b>Generate and share</b> — the client picks from a link.</span></li>
          </ol>
          <div className={styles.buttons}>
            <input ref={input} type="file" accept={ROOM_ACCEPT} multiple hidden data-testid="viz-welcome-file"
                   onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; if (files.length) onUpload(files) }} />
            <Button iconStart={<Icon name="add_photo_alternate" size={20} />} isDisabled={busy} onPress={() => input.current?.click()}
                    data-kb="create" data-kb-label="Upload a room photo" data-testid="viz-welcome-upload">Upload a room photo</Button>
            <Button variant="primary" appearance="outlined" isDisabled={busy} onPress={onLead} data-testid="viz-welcome-lead">Use a lead’s photos</Button>
          </div>
        </div>
        {SHOWN ? (
          <figure className={styles.figure}>
            <CompareSlider before={SHOWN.original} after={WELCOME_AFTER.image} className={styles.compare} testId="viz-welcome-compare" />
            <figcaption className={styles.caption}>
              <span>Sample · {SHOWN.name}: {WELCOME_AFTER.label} — drag to compare</span>
              <Button appearance="text" isDisabled={busy} iconEnd={<Icon name="arrow_forward" size={20} />} onPress={() => onSample(SHOWN.key)}>Open this sample</Button>
            </figcaption>
          </figure>
        ) : null}
      </div>
      <div className={styles.samples}>
        <h3 className={styles.samplesTitle}>Or open a sample room</h3>
        <div className={styles.row} role="list">
          {ROW.map((s) => (
            <button key={s.key} type="button" role="listitem" className={styles.sample} disabled={busy} onClick={() => onSample(s.key)} data-testid="viz-welcome-sample">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.original} alt="" loading="lazy" decoding="async" />
              <span className={styles.sampleText}>
                <span className={styles.sampleName}>{s.name}</span>
                <span className={styles.sampleHelp}>{sentence(s.context)}</span>
              </span>
              <Icon name="arrow_forward" size={24} weight={300} className={styles.sampleGo} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
