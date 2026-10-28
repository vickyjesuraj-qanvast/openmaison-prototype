'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FieldError } from '@/components/leads/move-stage/fields'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { PLAN_ACCEPT } from '@/components/projects/floor-plan/plan-picture'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import { planNameOf } from '@/lib/projects/floor-plan-model'
import { roomSentence, roomsForType, scaleOk, sizeAt, startingArea, type PlaceRoom } from '@/lib/planner/photo'
import { floorPlanPhotoFolder, readPhotoTarget, readPhotoTargets, startFromFloorPlan, type PhotoOption, type PhotoTarget, type PhotoTargetFacts } from '@/app/planner/photo-actions'
import { cornersStart, readPlanFile, readPlanUrl, squareByCorners, straightenPlan, type ReadPlan, type Straightened } from './straighten-photo'
import { CornerEditor } from './corner-editor'
import { RoomList } from './room-list'
import { useSnackbar } from '@/components/om/snackbar'
import { quadUsable, type Quad } from '@/lib/planner/corners'
import { SizeFields, sizeOf, type Measured } from './size-fields'
import styles from './photo-dialog.module.css'

/** Where the floor plan comes from: picked in the dialog, a file already in the client's Files, or a floor plan of the project's Floor plan tab. */
export type PhotoFrom = { kind: 'upload' } | { kind: 'file'; fileId: string; name: string } | { kind: 'plan'; planId: string }

/**
 * (pending modules S28 — card studio:floorplan-isometric-ai, 1.0's Tools › Floorplan to 3D Isometric in 2.0's shape) **Make a 3D picture** — one
 * dialog, two steps, then the 3D Space Planner:
 *   1. **The floor plan** — who it is for (when the door didn't say: a lead, a project, or Personal as 1.0's tool was); the photo picked (any
 *      angle, a HEIC, a PDF) and made straight and clean in the browser by 1.0's rules, with Turn a quarter (walls can't tell "up" from
 *      "sideways") and the photo as it was one switch away; a file from Files, or a plan of the Floor plan tab, as it is there.
 *   2. **The rooms and its size** — 1.0's chip row ("3 bedrooms · 2 bathrooms · Kitchen …"), its list from the client's flat type by rule (1.0
 *      asked a model to read it off the plan) and Change the rooms to take away or add; the size from the floor area (the lead's own, else the
 *      planner's flat) or one length the studio knows, marked on the plan.
 * Place the rooms keeps the photo (one record — the project's Floor plan, else the lead's photo with its original in Files › Floor plans) and
 * opens the new layout with the photo under it and the rooms to place; the planner's 3D picture (Dollhouse · Top-down) follows. Nothing is
 * charged — 1.0's tool charged none. The dialog closes once the layout is made; a refusal stays in it, in words.
 */
export function PhotoDialog({ open, onClose, target, from = { kind: 'upload' }, back }: {
  open: boolean
  onClose: () => void
  /** the lead or project the door is on — null asks (Tools, the planner's home) */ target: PhotoTarget | null
  from?: PhotoFrom
  /** where the planner's Back returns (the page the door was on) */ back?: string
}) {
  const router = useRouter()
  const [was, setWas] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [facts, setFacts] = useState<PhotoTargetFacts | null>(null)
  const [options, setOptions] = useState<PhotoOption[] | null>(null)
  const [picked, setPicked] = useState<PhotoTarget | null>(target)
  const [file, setFile] = useState<File | null>(null)
  const [read, setRead] = useState<ReadPlan | null>(null)
  const [out, setOut] = useState<Straightened | null>(null)
  const [clean, setClean] = useState(true)
  const [quarter, setQuarter] = useState(0)
  const [busy, setBusy] = useState<'reading' | 'straightening' | 'squaring' | 'saving' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<PlaceRoom[]>([])
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [sizeBy, setSizeBy] = useState<'area' | 'length'>('area')
  const [area, setArea] = useState('')
  const [measured, setMeasured] = useState<Measured | null>(null)
  const [tried, setTried] = useState(false)
  /* (S42 D·1 — S41's proposal, built as recommended) Square it by its corners: the four corners being placed (null while not), whether the
     paper finder placed them, the photo they sit on, and the sheet once squared (the straightening then runs on it) */
  const [corners, setCorners] = useState<Quad | null>(null)
  const [cornersFound, setCornersFound] = useState(false)
  const [cornerPic, setCornerPic] = useState<string | null>(null)
  const [squared, setSquared] = useState<{ plan: ReadPlan; quad: Quad } | null>(null)
  const snackbar = useSnackbar()
  const run = useRef(0)

  /* a fresh dialog on every opening (render-phase adjust) */
  if (open !== was) {
    setWas(open)
    if (open) { setStep(1); setFacts(null); setOptions(null); setPicked(target); setFile(null); setRead(null); setOut(null); setClean(true); setQuarter(0); setBusy(from.kind === 'upload' ? null : 'reading'); setError(null); setRoomsOpen(false); setSizeBy('area'); setArea(''); setMeasured(null); setTried(false); setRooms([]); setCorners(null); setCornerPic(null); setSquared(null) }
  }
  const forOption = (o: Pick<PhotoTargetFacts, 'propertyType' | 'areaSqft'>) => { setRooms(roomsForType(o.propertyType).rooms); setArea(String(startingArea(o.propertyType, o.areaSqft).m2)) }

  /* the place's facts (a door's), or the list to pick from (Tools) — and, from a file or a plan, the picture read as it is there */
  const fileId = from.kind === 'file' ? from.fileId : null, planId = from.kind === 'plan' ? from.planId : null
  const tKey = target ? `${target.kind}:${'id' in target ? target.id : ''}` : null
  useEffect(() => {
    if (!open) return
    const me = ++run.current
    let cancelled = false
    const live = () => !cancelled && run.current === me
    if (!target) {
      void readPhotoTargets().then((r) => {
        if (!live()) return
        if ('error' in r) { setError(r.error); return }
        setOptions(r.options)
        const first = r.options[0]
        if (first) { setPicked(first.target); setFacts(first); forOption(first) }
      }, () => { if (live()) setError('Couldn’t read who it can be for — please try again') })
      return
    }
    void readPhotoTarget(target, { fileId, planId }).then(async (f) => {
      if (!live()) return
      if ('error' in f) { setError(f.error); setBusy(null); return }
      setFacts(f); setPicked(f.target); forOption(f)
      if (f.plan) {   // a floor plan of the Floor plan tab: as it is there
        const r = await readPlanUrl(f.plan.url, f.plan.name)
        if (!live()) return
        if (!r) { setError('The floor plan didn’t read — open it on the Floor plan tab and try again'); setBusy(null); return }
        setRead(r)
        const s = await straightenPlan(r, { clean: false, quarter: 0 })
        if (!live()) return
        setOut(s); setBusy(null)
        if (f.plan.scale) setSizeBy('area')
        return
      }
      if (fileId) {
        const res = await fetch(`/files/raw/${encodeURIComponent(fileId)}`).catch(() => null)
        const blob = res && res.ok ? await res.blob() : null
        if (!live()) return
        const r = blob ? await readPlanFile(blob, from.kind === 'file' ? from.name : '') : null
        if (!live()) return
        if (!r || 'error' in r) { setError(r && 'error' in r ? r.error : 'That file didn’t read as a plan — pick another'); setBusy(null); return }
        setRead(r)
        setBusy('straightening')
        const s = await straightenPlan(r, { clean: true, quarter: 0 })
        if (!live()) return
        setOut(s); setBusy(null)
      }
    }, () => { if (live()) { setError('Couldn’t open it — please try again'); setBusy(null) } })
    return () => { cancelled = true }
  }, [open, tKey, fileId, planId])   // eslint-disable-line react-hooks/exhaustive-deps -- once per opening and per source

  const redo = async (r: ReadPlan, c: boolean, q: number, sq: ReadPlan | null = squared?.plan ?? null) => {
    const me = ++run.current
    setBusy('straightening')
    const s = await straightenPlan(sq ?? r, { clean: c, quarter: q, paper: sq ? false : undefined }).catch(() => null)
    if (run.current !== me) return
    setBusy(null)
    if (!s) { setError('Couldn’t straighten it — try the photo as it is'); return }
    setOut(s); setMeasured(null)
  }
  const pick = async (f?: File) => {
    if (!f) return
    setError(null); setFile(f); setBusy('reading'); setClean(true); setQuarter(0); setMeasured(null); setCorners(null); setSquared(null)
    const me = ++run.current
    const r = await readPlanFile(f, f.name).catch(() => null)
    if (run.current !== me) return
    if (!r || 'error' in r) { setBusy(null); setFile(null); setError(r && 'error' in r ? r.error : 'That file didn’t read as a plan — try a photo, a PNG or a PDF'); return }
    setRead(r)
    void redo(r, true, 0, null)
  }
  const reset = () => { run.current++; setFile(null); setRead(null); setOut(null); setMeasured(null); setError(null); setBusy(null); setCorners(null); setSquared(null) }
  /* (S42 D·1) Square it by its corners: the handles start where they were left, else on the sheet the paper finder reads */
  const openCorners = () => {
    if (!read) return
    const start = squared ? { quad: squared.quad, found: cornersFound } : cornersStart(read)
    setCornerPic((p) => p ?? read.canvas.toDataURL('image/jpeg', 0.85)); setCorners(start.quad); setCornersFound(start.found); setError(null)
  }
  const cornersAgain = () => { if (!read) return; const start = cornersStart(read); setCorners(start.quad); setCornersFound(start.found) }
  const square = async () => {
    if (!read || !corners || !quadUsable(corners, read.canvas.width, read.canvas.height)) return
    const me = ++run.current
    setBusy('squaring')
    await new Promise((r) => setTimeout(r, 30))   // the line says what it does before the work holds the page
    const sq = squareByCorners(read, corners)
    const s = sq ? await straightenPlan(sq, { clean, quarter, paper: false }).catch(() => null) : null
    if (run.current !== me) return
    setBusy(null)
    if (!sq || !s) { setError('Couldn’t square it — move the corners and try again'); return }
    const before = { squared, out }
    setSquared({ plan: sq, quad: corners }); setCorners(null); setOut(s); setMeasured(null)
    snackbar({ key: 'photo-corners', message: 'Squared by its four corners', actionLabel: 'Undo', onAction: () => { run.current++; setSquared(before.squared); setOut(before.out); setMeasured(null) } })
  }

  const asItIs = !!facts?.plan
  const planScale = facts?.plan?.scale ?? null
  const mmPerPx = !out ? null : planScale ? planScale : sizeOf({ src: out.data, width: out.width, height: out.height, share: out.share, read: out.read }, sizeBy, area, measured)
  const startArea = facts ? startingArea(facts.propertyType, facts.areaSqft) : null
  const summary = useMemo(() => roomSentence(rooms), [rooms])
  const basis = facts ? roomsForType(facts.propertyType).basis : ''
  const forLabel = options?.find((o) => sameTarget(o.target, picked))?.label ?? ''

  const next = () => { setTried(true); if (!out || busy || facts?.block) return; setTried(false); setStep(2) }
  const start = async () => {
    setTried(true)
    if (!out || !picked || busy) return
    if (!scaleOk(mmPerPx)) return
    setBusy('saving'); setError(null)
    try {
      let source: Parameters<typeof startFromFloorPlan>[0]['source']
      if (facts?.plan) source = { kind: 'plan', planId: facts.plan.id }
      else {
        let keptId: string | null = fileId
        if (picked.kind !== 'personal' && !keptId && file) {
          /* the original first, kept with its bytes in the client's Files › Floor plans */
          const f = await floorPlanPhotoFolder(picked)
          if ('error' in f) { setError(couldnt('keep the photo', f.error)); return }
          const up = await uploadPicked(f.leadId, file, f.folderId)
          if (!up || 'error' in up) { setError(couldnt('keep the photo', up && 'error' in up ? up.error : null)); return }
          keptId = up.id
        }
        source = { kind: 'photo', fileId: keptId, picture: out.data, width: out.width, height: out.height, name: planNameOf(file?.name ?? (from.kind === 'file' ? from.name : 'Floor plan')) }
      }
      const r = await startFromFloorPlan({ target: picked, source, scale: { mmPerPx: measured && sizeBy === 'length' ? null : planScale ? null : mmPerPx, measured: sizeBy === 'length' ? measured : null }, rooms })
      if ('error' in r) { setError(couldnt('make the layout', r.error)); return }
      router.push(withFrom(`/planner/${r.id}`, back ?? (typeof window === 'undefined' ? '/planner' : `${window.location.pathname}${window.location.search}`)))
      onClose()
    } catch (e) { setError(couldnt('make the layout', refusalOf(e))) } finally { setBusy(null) }
  }

  const status = busy === 'reading' ? 'Reading the plan…' : busy === 'straightening' ? 'Straightening the plan…' : busy === 'squaring' ? 'Squaring it by its corners…' : null
  const turnLine = !out ? '' : asItIs ? 'As it is on the Floor plan tab' : squared ? (clean ? 'Squared by its corners and cleaned' : 'Squared by its corners') : !clean ? 'As it was taken' : out.angle ? `Straightened by ${Math.abs(out.angle).toFixed(1)}° and cleaned` : 'Already straight — cleaned'
  const cornersOk = !!corners && !!read && quadUsable(corners, read.canvas.width, read.canvas.height)
  const sub = picked?.kind === 'personal' ? 'The picture stays with the layout — nothing goes to a client’s Files.'
    : facts?.plan ? `${facts.plan.name}, from ${facts.name}’s Floor plan tab.`
    : facts ? `For ${facts.name} — the photo is kept in their Files › Floor plans.` : 'From a floor-plan photo, in two steps.'

  return (
    <Dialog open={open} onClose={() => { if (busy !== 'saving') onClose() }} title="Trace a floor-plan photo" subtitle={step === 1 ? sub : 'Check the rooms and how big it is, then place the rooms on the plan.'} size="modal" width={800} closeOnScrim={false}
            actions={<span className={styles.step} data-testid="photo-step">{`Step ${step} of 2`}</span>}
            footer={step === 1 ? (
              <>
                <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                <Button onPress={next} isDisabled={!out || !!busy || !!facts?.block || !!corners} data-testid="photo-next">Next</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" appearance="outlined" onPress={() => { setStep(1); setTried(false) }} isDisabled={busy === 'saving'}>Back</Button>
                <Button onPress={() => { void start() }} isDisabled={busy === 'saving'} data-testid="photo-start">{busy === 'saving' ? 'Getting it ready…' : 'Place the rooms'}</Button>
              </>
            )}>
      <div className={styles.body} data-testid="photo-dialog">
        {error ? <p className={styles.error} role="alert"><Icon name="error" size={18} weight={300} />{error}</p> : null}
        {facts?.block ? <p className={styles.error} role="alert" data-testid="photo-block"><Icon name="lock" size={18} weight={300} />{facts.block}</p> : null}
        {step === 1 ? (
          <>
            {!target && options ? (
              <TextField label="For" mode="select" searchable value={forLabel} options={options.map((o) => o.label)}
                         onChange={(label) => { const o = options.find((x) => x.label === label); if (o) { setPicked(o.target); setFacts(o); forOption(o) } }}
                         helper={picked?.kind === 'personal' ? 'Pick a lead or a project to keep the photo in their Files' : options.find((o) => sameTarget(o.target, picked))?.sub || undefined} />
            ) : null}
            {status ? (
              <div className={styles.well} role="status" aria-live="polite" data-testid="photo-working"><span className={styles.wellText}>{status}</span></div>
            ) : corners && read && cornerPic ? (
              /* (S42 D·1) the four corners placed on the photo as it was taken, then Square it */
              <div className={styles.plan} data-testid="photo-corners">
                <div className={styles.well} data-filled="">
                  <CornerEditor src={cornerPic} width={read.canvas.width} height={read.canvas.height} quad={corners} onQuad={setCorners} alt="The floor plan as it was taken, with the sheet’s four corners to place"
                                maxHeight="min(420px, 50dvh)" testId="photo-corners-editor" handleTestId="photo-corner" />
                </div>
                {cornersOk ? <p className={styles.note} data-testid="photo-corners-line">{`${cornersFound ? 'The corners start on the sheet it found. ' : 'No sheet stood out — the corners start near the photo’s own. '}Put each on a corner of the paper: drag it, or Tab to it and use the arrow keys.`}</p>
                  : <p className={styles.error} role="alert" data-testid="photo-corners-refused"><Icon name="error" size={18} weight={300} />These four corners don’t make a sheet — move them so they go round it, each on its own corner.</p>}
                <div className={styles.controls}>
                  <span className={styles.actions}>
                    <Button size="sm" onPress={() => { void square() }} isDisabled={!cornersOk} data-testid="photo-corners-square">Square it</Button>
                    <Button variant="secondary" appearance="text" size="sm" onPress={() => setCorners(null)} data-testid="photo-corners-cancel">Cancel</Button>
                  </span>
                  <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="restart_alt" size={18} weight={300} />} onPress={cornersAgain}>Start the corners again</Button>
                </div>
              </div>
            ) : out ? (
              <div className={styles.plan} data-testid="photo-plan">
                <div className={styles.well} data-filled="">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a picture drawn in the browser (a data URL) */}
                  <img src={out.data} alt={`${turnLine} — the floor plan`} className={styles.picture} data-testid="photo-picture" data-angle={out.angle.toFixed(2)} data-width={out.width} data-height={out.height} />
                </div>
                <div className={styles.controls}>
                  <span className={styles.line} data-testid="photo-line">{turnLine}</span>
                  {!asItIs && read ? (
                    <span className={styles.actions}>
                      <label className={styles.switchRow}><Switch size="sm" isSelected={clean} onChange={(v: boolean) => { setClean(v); void redo(read, v, quarter) }} aria-label="Straighten and clean it" /><span>Straighten and clean it</span></label>
                      <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="refresh" size={18} weight={300} />} onPress={() => { const q = (quarter + 1) % 4; setQuarter(q); void redo(read, clean, q) }} data-testid="photo-turn">Turn a quarter</Button>
                      <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="crop_free" size={18} weight={300} />} onPress={openCorners} data-testid="photo-corners-open">{squared ? 'Move the corners' : 'Square it by its corners'}</Button>
                      {from.kind === 'upload' ? <Button variant="secondary" appearance="text" size="sm" onPress={reset}>Pick another</Button> : null}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : from.kind === 'upload' ? (
              <>
                <Dropzone title="Drop the floor plan here or browse" helper="A photo is fine — any angle, even paper on a desk. JPG, PNG, WebP, HEIC or PDF." accept={`${PLAN_ACCEPT},image/heic,image/heif,.heic,.heif`} label="Upload a floor plan" onPick={(f) => { void pick(f) }} />
                <FieldError message={tried && !out ? 'Pick the floor plan first' : undefined} />
              </>
            ) : null}
          </>
        ) : out ? (
          <>
            <section className={styles.section} aria-label="The rooms" data-testid="photo-rooms">
              <div className={styles.headRow}><h3 className={styles.h}>The rooms</h3>
                <Button variant="secondary" appearance="text" size="sm" onPress={() => setRoomsOpen((v) => !v)} aria-expanded={roomsOpen} data-testid="photo-rooms-change">{roomsOpen ? 'Done' : 'Change the rooms'}</Button></div>
              <p className={styles.summary} data-testid="photo-summary">{summary}</p>   {/* (the calm UI build, 6-08 · 6-22) one plain sentence, not capital chips */}
              <p className={styles.note}>{`Started from ${basis}${facts?.propertyType ? ' — the flat type on record' : ''}. Take away what the plan doesn’t have, add what it does — you place each one on the plan next.`}</p>
              {roomsOpen ? (
                <>
                  <RoomList rooms={rooms} onRooms={setRooms} />   {/* (REG-2800) shared with Floorplan to 3D Isometric */}
                </>
              ) : null}
            </section>
            <section className={styles.section} aria-label="Its size" data-testid="photo-size">
              <h3 className={styles.h}>How big it is</h3>
              {planScale ? (
                <p className={styles.note}>{`Its size is set on the Floor plan tab — about ${sizeAt(planScale, out.width, out.height)}.`}</p>
              ) : (
                <SizeFields pic={{ src: out.data, width: out.width, height: out.height, share: out.share, read: out.read }} by={sizeBy} onBy={(v) => { setSizeBy(v); if (v === 'area') setMeasured(null) }}
                            area={area} onArea={setArea} measured={measured} onMeasured={setMeasured} tried={tried}
                            areaHelper={startArea?.basis === 'lead' && facts?.areaSqft ? `${facts.name}’s home, ${facts.areaSqft.toLocaleString('en-SG')} sq ft on record` : `The planner’s ${startArea?.flat ?? 'flat'} — type the home’s own if you know it`} />
              )}
            </section>
          </>
        ) : null}
      </div>
    </Dialog>
  )
}

const sameTarget = (a: PhotoTarget | null, b: PhotoTarget | null) => !!a && !!b && a.kind === b.kind && (a.kind === 'personal' || ('id' in a && 'id' in b && a.id === b.id))
