'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { ChoiceCard } from '@/components/om/choice-card'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { ProgressCard } from '@/components/om/progress-card'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { PLAN_ACCEPT } from '@/components/projects/floor-plan/plan-picture'
import { CornerEditor } from '@/components/planner/photo/corner-editor'
import { RoomList } from '@/components/planner/photo/room-list'
import { cornersStart, readPlanFile, readPlanUrl, squareByCorners, straightenPlan, type ReadPlan, type Straightened } from '@/components/planner/photo/straighten-photo'
import { quadUsable, type Quad } from '@/lib/planner/corners'
import { lookLabel, roomSentence } from '@/lib/planner/photo'
import { FP3D_WORDS, LOOK_CHOICES, READY_SAMPLES, lookNotReady, renderFileName, sampleLooks, sampleRooms, type Look, type PlaceRoom, type SamplePlan } from '@/lib/floorplan-3d/model'
import type { Fidelity } from '@/lib/floorplan-3d/service'
import { readFloorPlanRooms, renderFloorPlan } from '@/app/floorplan-3d/actions'
import { BetaTag, FloorplanGhost } from './floorplan-ghost'
import { InfoTip } from '@/components/om/info-tip'   // (the calm UI build, 6-22) the tools' one info glyph — a house piece since the landing
import welcome from '@/components/visualizer/home/welcome.module.css'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './floorplan-tool.module.css'

type Source = { kind: 'sample'; sample: SamplePlan } | { kind: 'own'; name: string }
type Stage = 'idle' | 'reading' | 'confirm' | 'generating' | 'done' | 'error'
type Result = { image: string; look: Look; take: number; fidelity: Fidelity }
type Failure = { title: string; help: string; retry: boolean }

/** 1.0's failures, in its words, split into the house empty state's title and line. */
const UNREAD: Failure = { title: 'We couldn’t read that floor plan', help: 'Try a clearer photo — any angle is fine.', retry: false }
const NOT_DRAWN: Failure = { title: 'The 3D render didn’t come through', help: 'This is usually temporary — try again.', retry: true }
/** A sample's view is a file: the card stays up long enough to be read, not as long as a model would take. */
const SAMPLE_BEAT = 700

/**
 * (REG-2800 — his "this looks like a module in 1.0", 2026-10-23, then "yes, and Sample floor plans with ready-made renders") Tools › Floorplan
 * to 3D Isometric, 1.0's module (`/tools/floorplan-3d-isometric`, Beta) on its own page again, on 2.0's pieces — no mock:
 *   idle — what it does, 1.0's How it works, the drop box, What you'll get (1.0's two looks), and the three sample plans (the AI Visualizer's
 *     welcome, REG-735 — its stylesheet, not a copy);
 *   reading — the plan straightened and cleaned in the browser for real (S28's pipeline, REG-1929), on the house progress card with 1.0's
 *     three steps (Read the plan · Confirm the rooms · 3D render);
 *   confirm — the plan, straightened, with S28's rescues (Turn a quarter · Square it by its corners — 1.0's spec: "Adjust corners"); We found
 *     (1.0's chip row) and the look (1.0's example pictures), then Generate;
 *   done — the view, Download · Try another take (1.0's Regenerate), Switch style (it regenerates), Start a new plan; 1.0's soft note when the rooms didn't match.
 * A sample's rooms are its plan's own and its views were made ahead — said under the view; a studio's own plan, while no image model is
 * plugged in (`live` false), is straightened and then the page says so plainly and offers the samples (lib/floorplan-3d/service.ts).
 * (2026-10-27, his "a lot of things missing … 1.0 is simpler to use" and the testers' "I can't see the button to generate top-down view") As
 * 1.0 does: both looks are always offered — on Confirm and as Switch style on the view — a look a sample has no view for yet staying in its
 * place, not pressable, its line saying so (the house rule: a refused choice says why in the row); a sample's Confirm is 1.0's — the plan, We
 * found, Style, Generate — with S28's rescues (Turn a quarter · Square it by its corners) kept for a studio's own plan, where a sideways photo
 * needs them (1.0's own gap); the plan stays in view, faded, while it renders (1.0); and the landing says before the upload what the
 * prototype does with a studio's own plan, so it is never a surprise after it.
 */
export function FloorplanTool({ live }: { /** an image model answers (lib/floorplan-3d/service.ts `floorplanLive`) */ live: boolean }) {
  const snackbar = useSnackbar()
  const [stage, setStage] = useState<Stage>('idle')
  const [source, setSource] = useState<Source | null>(null)
  const [read, setRead] = useState<ReadPlan | null>(null)
  const [out, setOut] = useState<Straightened | null>(null)
  const [quarter, setQuarter] = useState(0)
  const [squared, setSquared] = useState<{ plan: ReadPlan; quad: Quad } | null>(null)
  const [corners, setCorners] = useState<Quad | null>(null)
  const [cornersFound, setCornersFound] = useState(false)
  const [cornerPic, setCornerPic] = useState<string | null>(null)
  const [turning, setTurning] = useState(false)
  const [rooms, setRooms] = useState<PlaceRoom[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [look, setLook] = useState<Look>('dollhouse')
  const [result, setResult] = useState<Result | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [step, setStep] = useState(0)
  const run = useRef(0)
  const top = useRef<HTMLDivElement>(null)

  const sample = source?.kind === 'sample' ? source.sample : null
  /* (2026-10-27) both looks, always, as 1.0 offers them; one a sample has no view for yet says so in its card (`lookNotReady`) */
  const notReady = (l: Look) => lookNotReady(sample, l)
  /** a studio's own plan on the prototype: straightened, then said plainly — no rooms read, nothing drawn */
  const held = source?.kind === 'own' && !live
  const name = sample?.name ?? (source?.kind === 'own' ? source.name : 'Floor plan')
  const summary = useMemo(() => (rooms?.length ? roomSentence(rooms) : ''), [rooms])

  /* every stage starts at the page's top, and the keyboard's place moves with it (the control that was pressed is gone) */
  const first = useRef(true)
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
    if (first.current) { first.current = false; return }
    top.current?.focus({ preventScroll: true })
  }, [stage])

  const reset = () => {
    run.current++
    setStage('idle'); setSource(null); setRead(null); setOut(null); setQuarter(0); setSquared(null); setCorners(null); setCornerPic(null)
    setRooms(null); setEditing(false); setResult(null); setFailure(null); setStep(0)
  }
  const fail = (f: Failure) => { setFailure(f); setStage('error') }

  /* ── read: a sample's plan or the studio's own, straightened and cleaned, then its rooms ── */
  const begin = async (src: Source, picked: () => Promise<ReadPlan | { error: string } | null>) => {
    const me = ++run.current
    setSource(src); setStage('reading'); setStep(0); setFailure(null); setResult(null); setRooms(null); setEditing(false)
    setRead(null); setOut(null); setQuarter(0); setSquared(null); setCorners(null); setCornerPic(null)
    const r = await picked().catch(() => null)
    if (run.current !== me) return
    if (!r || 'error' in r) { fail(r && 'error' in r ? { ...UNREAD, help: r.error } : UNREAD); return }
    const s = await straightenPlan(r, { clean: true, quarter: 0 }).catch(() => null)
    if (run.current !== me) return
    if (!s) { fail(UNREAD); return }
    setRead(r); setOut(s)
    if (src.kind === 'sample') { setRooms(sampleRooms(src.sample)); const first = sampleLooks(src.sample)[0]; if (first && !src.sample.renders[look].length) setLook(first.value) }
    else if (live) {
      setStep(1)
      const got = await readFloorPlanRooms({ scan: s.data }).catch(() => null)
      if (run.current !== me) return
      setRooms(got && 'rooms' in got ? got.rooms : null)   // 1.0: a failed reading isn't fatal — the view is drawn without it
    }
    setStage('confirm'); setStep(1)
  }
  const pickSample = (s: SamplePlan) => { void begin({ kind: 'sample', sample: s }, () => readPlanUrl(s.plan, s.name)) }
  const pickFile = (f?: File) => { if (f) void begin({ kind: 'own', name: f.name.replace(/\.[^.]+$/, '') || 'Floor plan' }, () => readPlanFile(f, f.name)) }

  /* ── S28's rescues: a quarter turn, the four corners ── */
  const restraighten = async (q: number, sq: ReadPlan | null) => {
    if (!read) return
    const me = ++run.current
    setTurning(true)
    const s = await straightenPlan(sq ?? read, { clean: true, quarter: q, paper: sq ? false : undefined }).catch(() => null)
    if (run.current !== me) return
    setTurning(false)
    if (s) setOut(s)
  }
  const openCorners = () => {
    if (!read) return
    const start = squared ? { quad: squared.quad, found: cornersFound } : cornersStart(read)
    setCornerPic((p) => p ?? read.canvas.toDataURL('image/jpeg', 0.85)); setCorners(start.quad); setCornersFound(start.found)
  }
  const cornersOk = !!corners && !!read && quadUsable(corners, read.canvas.width, read.canvas.height)
  const square = async () => {
    if (!read || !corners || !cornersOk) return
    const sq = squareByCorners(read, corners)
    if (!sq) return
    const before = { squared, out }
    setSquared({ plan: sq, quad: corners }); setCorners(null)
    await restraighten(quarter, sq)
    snackbar({ key: 'fp3d-corners', message: 'Squared by its four corners', actionLabel: 'Undo', onAction: () => { run.current++; setSquared(before.squared); setOut(before.out) } })
  }

  /* ── generate: a sample's next ready-made take, or the image model's view of the studio's own plan ── */
  const generate = async (l: Look = look, again = false) => {
    if (!out || held) return
    const me = ++run.current
    setLook(l); setStage('generating'); setStep(2); setFailure(null)
    if (sample) {
      const takes = sample.renders[l]
      const take = again && result?.look === l ? (result.take + 1) % takes.length : 0
      const image = takes[take]!
      const started = Date.now()
      const ok = await new Promise<boolean>((resolve) => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = image })
      await new Promise((r) => setTimeout(r, Math.max(0, SAMPLE_BEAT - (Date.now() - started))))
      if (run.current !== me) return
      if (!ok) { fail(NOT_DRAWN); return }
      setResult({ image, look: l, take, fidelity: null }); setStage('done')
      return
    }
    const r = await renderFloorPlan({ scan: out.data, rooms, look: l }).catch(() => null)
    if (run.current !== me) return
    if (!r || 'error' in r) { fail(r && 'error' in r ? { ...NOT_DRAWN, help: r.error } : NOT_DRAWN); return }
    setResult({ image: r.image, look: l, take: 0, fidelity: r.fidelity }); setStage('done')
  }
  const download = () => {
    if (!result) return
    const ext = result.image.startsWith('data:image/png') || /\.png$/i.test(result.image) ? 'png' : 'jpg'
    const a = document.createElement('a'); a.href = result.image; a.download = renderFileName(name, result.look, ext); a.click()
    snackbar({ key: 'fp3d-download', message: `${lookLabel(result.look)} view downloaded` })
  }

  const turnLine = !out ? '' : squared ? 'Squared by its corners and cleaned' : out.angle ? `Straightened by ${Math.abs(out.angle).toFixed(1)}° and cleaned` : 'Already straight — cleaned'
  const matched = !result?.fidelity || result.fidelity.matched === result.fidelity.total

  return (
    <PageReveal skeleton={<FloorplanGhost live={live} />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {/* (the calm UI build 2026-10-27, 6-22 · W-293) the prototype's note about a studio's own plan, before the upload — behind the info glyph
            beside Beta, not a line on the landing (T-05); the held line after an upload stays where it happens */}
        <PageHeader title={FP3D_WORDS.title} after={<span className={styles.headActions}><BetaTag />{!live ? <InfoTip text={FP3D_WORDS.prototypeHint} label={FP3D_WORDS.prototypeLabel} testId="fp3d-prototype-hint" /> : null}</span>} />   {/* (the calm UI build 2026-10-27, 6-22 · W-125) Beta and the glyph beside the title, as 1.0's BetaChip */}
        <div ref={top} className={styles.content} tabIndex={-1} data-testid="fp3d" data-stage={stage}>
          {stage === 'idle' ? (
            /* ── idle: the AI Visualizer's welcome, in 1.0's words ── */
            <section className={welcome.welcome} aria-labelledby="fp3d-title" data-testid="fp3d-idle">
              <div className={welcome.hero}>
                <div className={welcome.lead}>
                  <div className={welcome.texts}>
                    <h2 id="fp3d-title" className={welcome.title}>{FP3D_WORDS.hero}</h2>
                    <p className={welcome.sub}>{FP3D_WORDS.sub}</p>
                  </div>
                  <ol className={welcome.steps}>
                    {FP3D_WORDS.steps.map(([b, rest], i) => <li key={b}><span className={welcome.stepN} aria-hidden>{i + 1}</span><span><b>{b}</b>{rest}</span></li>)}
                  </ol>
                  <Dropzone title={FP3D_WORDS.drop} helper={FP3D_WORDS.dropHelp} accept={`${PLAN_ACCEPT},image/heic,image/heif,.heic,.heif`} label="Upload a floor plan" onPick={pickFile} />
                </div>
                <figure className={`${welcome.figure} ${styles.get}`} data-testid="fp3d-get">
                  <figcaption className={styles.eyebrow}>{FP3D_WORDS.get}</figcaption>
                  <div className={styles.examples}>
                    {LOOK_CHOICES.map((o) => (
                      <div key={o.value} className={styles.example}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 1.0's example picture */}
                        <img src={o.example} alt={`${o.label} example`} />
                        <span className={styles.exampleName}>{o.label}</span>
                        <span className={styles.exampleLine}>{o.line}</span>
                      </div>
                    ))}
                  </div>
                </figure>
              </div>
              <div className={welcome.samples}>
                <h3 className={welcome.samplesTitle}>{FP3D_WORDS.samples}</h3>
                <SampleRow onPick={pickSample} />
              </div>
            </section>
          ) : stage === 'reading' || stage === 'generating' ? (
            <section className={styles.card} aria-label={FP3D_WORDS.title}>
              <ProgressCard glyph="view_in_ar" testId="fp3d-progress" steps={FP3D_WORDS.pipeline} at={step}
                            title={stage === 'reading' ? 'Reading your floor plan…' : sample ? `Opening the ${sample.name}’s ${lookLabel(look).toLowerCase()} view…` : 'Creating your 3D floor plan…'}
                            help={stage === 'reading' ? 'Straightening and cleaning it — a moment.' : sample ? FP3D_WORDS.sampleWait : 'This takes about half a minute — please keep this page open.'} />
              {/* (2026-10-27) 1.0: the plan stays in view, faded, while it renders */}
              {stage === 'generating' && out ? (
                // eslint-disable-next-line @next/next/no-img-element -- a picture drawn in the browser (a data URL)
                <img src={out.data} alt="" className={styles.faded} data-testid="fp3d-faded" />
              ) : null}
            </section>
          ) : stage === 'error' && failure ? (
            <section className={styles.card} aria-label={failure.title}>
              <EmptyState icon="error" tone="plain" kb={false} testId="fp3d-error" title={failure.title} help={failure.help}
                          primary={failure.retry && out ? { label: 'Try again', onPress: () => { void generate(look) }, testId: 'fp3d-retry' } : { label: 'Upload a different plan', onPress: reset, testId: 'fp3d-reset' }}
                          secondary={failure.retry && out ? { label: 'Upload a different plan', onPress: reset, testId: 'fp3d-reset' } : null} />
            </section>
          ) : stage === 'confirm' && out ? (
            /* ── confirm: the plan, straightened | what was found, the look, Generate ── */
            <div className={styles.columns}>
              <section className={styles.card} aria-label="Your plan, straightened" data-testid="fp3d-plan">
                <span className={styles.eyebrow}>Your plan, straightened</span>
                {corners && read && cornerPic ? (
                  <div className={styles.plan} data-testid="fp3d-corners">
                    <div className={styles.well} data-filled="">
                      <CornerEditor src={cornerPic} width={read.canvas.width} height={read.canvas.height} quad={corners} onQuad={setCorners} alt="The floor plan as it was taken, with the sheet’s four corners to place"
                                    maxHeight="min(480px, 52dvh)" testId="fp3d-corners-editor" handleTestId="fp3d-corner" />
                    </div>
                    {cornersOk ? <p className={styles.note}>{`${cornersFound ? 'The corners start on the sheet it found. ' : 'No sheet stood out — the corners start near the photo’s own. '}Put each on a corner of the paper: drag it, or Tab to it and use the arrow keys.`}</p>
                      : <p className={styles.error} role="alert"><Icon name="error" size={18} weight={300} />These four corners don’t make a sheet — move them so they go round it, each on its own corner.</p>}
                    <div className={styles.controls}>
                      <span className={styles.actions}>
                        <Button size="sm" onPress={() => { void square() }} isDisabled={!cornersOk} data-testid="fp3d-corners-square">Square it</Button>
                        <Button variant="secondary" appearance="text" size="sm" onPress={() => setCorners(null)}>Cancel</Button>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.plan}>
                    <div className={styles.well} data-filled="" aria-busy={turning || undefined}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a picture drawn in the browser (a data URL) */}
                      <img src={out.data} alt={`${name} — ${turnLine}`} className={styles.picture} data-testid="fp3d-picture" data-angle={out.angle.toFixed(2)} />
                    </div>
                    {/* (2026-10-27) a sample is straight already — 1.0's plain plan; a studio's own plan keeps S28's two rescues (a sideways photo) */}
                    {!sample ? <div className={styles.controls}>
                      <span className={styles.line} data-testid="fp3d-line">{turnLine}</span>
                      <span className={styles.actions}>
                        <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="refresh" size={18} weight={300} />} isDisabled={turning}
                                onPress={() => { const q = (quarter + 1) % 4; setQuarter(q); void restraighten(q, squared?.plan ?? null) }} data-testid="fp3d-turn">Turn a quarter</Button>
                        <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="crop_free" size={18} weight={300} />} isDisabled={turning} onPress={openCorners} data-testid="fp3d-corners-open">{squared ? 'Move the corners' : 'Square it by its corners'}</Button>
                      </span>
                    </div> : null}
                  </div>
                )}
              </section>
              <section className={styles.card} aria-label="We found" data-testid="fp3d-confirm">
                <div className={styles.section}>
                  <span className={styles.eyebrow}>{held ? FP3D_WORDS.samples.replace(/^Or t/, 'T') : 'We found'}</span>
                  {held ? (
                    <>
                      <p className={styles.prototype} data-testid="fp3d-held"><Icon name="info" size={18} weight={300} /><span>{FP3D_WORDS.held}</span></p>
                      <SampleList onPick={pickSample} />
                    </>
                  ) : summary ? (
                    <>
                      {/* (the calm UI build, 6-08 · 6-22 — T-06) what was found as one plain sentence that adds up, not capital chips */}
                      <div className={styles.found} data-testid="fp3d-rooms">
                        <p className={styles.foundText}>{summary}</p>
                        {!sample ? <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="edit" size={18} weight={300} />} onPress={() => setEditing((v) => !v)} aria-expanded={editing} data-testid="fp3d-rooms-edit">{editing ? 'Done editing' : 'Not quite right?'}</Button> : null}
                      </div>
                      {editing && rooms ? <RoomList rooms={rooms} onRooms={(next) => setRooms((list) => next(list ?? []))} label="The rooms on the plan" testId="fp3d-room" /> : null}
                    </>
                  ) : (
                    <p className={styles.note} data-testid="fp3d-no-rooms">We couldn’t auto-detect the rooms — you can still generate, or upload a clearer photo.</p>
                  )}
                </div>
                {!held ? (
                  <div className={styles.section}>
                    <span className={styles.eyebrow}>Style</span>
                    <LookCards on={look} notReady={notReady} onPick={setLook} testId="fp3d-look" />
                  </div>
                ) : null}
                <div className={styles.buttons}>
                  {!held ? <Button iconStart={<Icon name="auto_awesome" size={20} />} isDisabled={turning || !!corners} onPress={() => { void generate(look) }} data-kb="create" data-kb-label="Generate" data-testid="fp3d-generate">{`Generate ${look === 'dollhouse' ? 'dollhouse' : 'top-down'} view`}</Button> : null}
                  <Button variant="secondary" appearance="outlined" onPress={reset} data-testid="fp3d-reset">Use a different plan</Button>
                </div>
              </section>
            </div>
          ) : stage === 'done' && result ? (
            /* ── done: the view | Regenerate · Download, Switch style, Start a new plan ── */
            <div className={styles.columns}>
              <section className={styles.card} aria-label="Your 3D floor plan" data-testid="fp3d-result">
                <span className={styles.eyebrow}>Your 3D floor plan</span>
                <div className={styles.well} data-filled="">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a ready-made sample view, or the image model's */}
                  <img src={result.image} alt={`${name} — ${lookLabel(result.look)} view`} className={styles.render} data-testid="fp3d-render" data-take={result.take} />
                </div>
                {sample ? <p className={styles.note} data-testid="fp3d-sample-note">{FP3D_WORDS.sampleNote}</p> : null}
                {!matched ? <p className={styles.prototype} data-testid="fp3d-mismatch"><Icon name="info" size={18} weight={300} /><span>This render may not match the plan exactly — another take usually fixes it.</span></p> : null}
              </section>
              <section className={styles.card} aria-label="Your 3D floor plan’s actions" data-testid="fp3d-done">
                {/* (the calm UI build 2026-10-27, 6-22 · W-338 — T-03) the view's one job is to take it away: Download filled, another take outlined */}
                <div className={styles.buttons}>
                  <Button iconStart={<Icon name="download" size={20} />} onPress={download} data-testid="fp3d-download">Download</Button>
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="refresh" size={20} />} onPress={() => { void generate(result.look, true) }} data-testid="fp3d-regenerate">Try another take</Button>
                </div>
                <div className={styles.section}>
                  <span className={styles.eyebrow}>Switch style</span>
                  <LookCards on={result.look} notReady={notReady} onPick={(l) => { if (l !== result.look) void generate(l) }} testId="fp3d-switch" />
                  <p className={styles.note}>Switching regenerates in the new style.</p>
                </div>
                <div className={styles.buttons}>
                  <Button variant="secondary" appearance="outlined" onPress={reset} data-testid="fp3d-new">Start a new plan</Button>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </PageReveal>
  )
}

/** 1.0's two looks as the house ChoiceCard with its picture (REG-2802) — one radio group, both always there (1.0); one with no view to show
    stays in its place, not pressable, and its line says why. */
function LookCards({ on, notReady, onPick, testId }: { on: Look; notReady: (l: Look) => string | null; onPick: (l: Look) => void; testId: string }) {
  return (
    <div className={styles.looks} role="radiogroup" aria-label="Style">
      {LOOK_CHOICES.map((o) => {
        const why = notReady(o.value)
        return <ChoiceCard key={o.value} title={o.label} help={why ?? o.line} picture={o.example} selected={on === o.value} disabled={!!why} onSelect={() => onPick(o.value)} testId={`${testId}-${o.value}`} />
      })}
    </div>
  )
}
/** The sample plans with views as the welcome's sample row (REG-735's stylesheet): the plan's picture, its name, what kind of picture it is. */
function SampleRow({ onPick }: { onPick: (s: SamplePlan) => void }) {
  return (
    <div className={welcome.row} role="list" data-testid="fp3d-samples">
      {READY_SAMPLES.map((s) => (
        <button key={s.key} type="button" role="listitem" className={`${welcome.sample} ${styles.sample}`} onClick={() => onPick(s)} data-testid="fp3d-sample" data-key={s.key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.plan} alt="" loading="lazy" decoding="async" />
          <span className={welcome.sampleText}>
            <span className={welcome.sampleName}>{s.name}</span>
            <span className={welcome.sampleHelp}>{s.line}</span>
          </span>
          <Icon name="arrow_forward" size={24} weight={300} className={welcome.sampleGo} />
        </button>
      ))}
    </div>
  )
}
/** The same samples, as rows inside the We found card (a studio's own plan on the prototype). */
function SampleList({ onPick }: { onPick: (s: SamplePlan) => void }) {
  return (
    <div className={styles.sampleList} role="list" aria-label="Sample plans" data-testid="fp3d-held-samples">
      {READY_SAMPLES.map((s) => (
        <button key={s.key} type="button" role="listitem" className={styles.sampleItem} onClick={() => onPick(s)} data-testid="fp3d-held-sample" data-key={s.key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.plan} alt="" loading="lazy" decoding="async" />
          <span className={welcome.sampleText}>
            <span className={styles.sampleItemName}>{s.name}</span>
            <span className={welcome.sampleHelp}>{s.line}</span>
          </span>
          <Icon name="chevron_right" size={24} weight={300} className={welcome.sampleGo} />
        </button>
      ))}
    </div>
  )
}
