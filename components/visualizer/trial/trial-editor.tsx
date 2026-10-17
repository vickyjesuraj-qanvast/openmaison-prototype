'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ds'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { duration, ease } from '@/lib/motion'
import { useFlagPref } from '@/lib/prefs'
import { lightingSet, presetById } from '@/lib/visualizer/lighting'
import { resolveMaterial, type OwnSwatch } from '@/lib/visualizer/materials'
import { afterRender, changeList, descriptor, emptyPending, intentFor, litAncestor, newId, NO_FINISHES, ORIGINAL, readingFor, replaceHeld, replaceHeldLead, pickReady, toolAvailability, unlitSource, type Detection, type FurnitureDef, type Pending, type SurfaceDef, type VersionView } from '@/lib/visualizer/model'
import { renderFileName, originalFileName } from '@/lib/visualizer/outputs'
import { sampleByKey } from '@/lib/visualizer/samples'
import { normFurnitureKey, surfaceGroupFor, titleCaseLabel } from '@/lib/visualizer/surfaces'
import { KEEP } from '@/lib/visualizer/furniture'
import { MAX_REFERENCES, type ReferenceRole } from '@/lib/visualizer/tools'
import { dominantColour, referencePalette } from '@/lib/visualizer/engine/palette'
import { guardRender, loadImg, runPass } from '@/lib/visualizer/engine/run'
import { DRIFT_GUARDED, hasBlockingDrift, REPAIRED_WORDS, UNREPAIRED_WORDS } from '@/lib/visualizer/drift'
import { allowanceLine, REFUSAL_WORDS, SAMPLE_ONLY, TOOL_MODE, type TrialAnswer, type TrialTool } from '@/lib/visualizer/trial/policy'
import { TRIAL_WORDS } from '@/lib/visualizer/trial/content'
import { stampTrial } from '@/lib/visualizer/trial/watermark'
import { askTrialRender, keepTrialRender } from '@/app/site/try/actions'
import { useEditorState } from '../editor/use-editor-state'
import { beforeKeyOf, effectiveDetection, onPicture, versionRange } from '../editor/editor-model'
import { omit, PASS_STEPS, ROOMY_LANDSCAPE, SHORT_LANDSCAPE, stageMarkers, useFrameSnackbarPlace, usePictureReader, useRoomEdits, useStageLayers, waitingWash, UNDO_KEY, type Placing } from '../editor/room-session'
import { GenerateFooter, ModeTabs, PanelClose, type Change, type Mode } from '../editor/rail'
import { Stage, type Marker, type StageMode } from '../editor/stage'
import { VersionsStrip } from '../editor/versions-strip'
import { DescribeBox } from '../editor/describe-box'
import { SurfacesPanel, scopeOf, type SurfaceSel } from '../editor/panels/surfaces-panel'
import { FurniturePanel } from '../editor/panels/furniture-panel'
import { StylePanel } from '../editor/panels/style-panel'
import { LightingPanel } from '../editor/panels/lighting-panel'
import { ToolsPanel } from '../editor/panels/tools-panel'
import { AddItemDialog, SwatchDialog } from '../editor/dialogs/small-dialogs'
import styles from '../editor/editor.module.css'
import bar from '../editor/topbar.module.css'
import t from './trial-editor.module.css'

/** The room the trial opened — a sample room or the visitor's own photo (a JPEG data URL, read in this browser and never sent anywhere). */
export type TrialRoom = { id: string; name: string; imageUrl: string; sampleKey: string | null; detection: Detection; upload: boolean }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const BLANK = emptyPending()
const UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'
type Run = { title: string; step: number; steps: string[]; saving: boolean }
type Menu = { kind: 'version'; key: string } | { kind: 'more' } | null

/**
 * (pending modules S36 — her "build all of them" 2026-10-11; cards public:try-it-visualizer · onboarding:try-visualizer-public; 1.0's
 * trial-visualizer.tsx, "the UI is the REAL editor's … so a visitor's first impression is the product itself") THE AI VISUALIZER, FOR SOMEONE
 * WITH NO ACCOUNT. The studio's editor frame and pieces — the canvas with its markers and tools, the versions, the five modes and their
 * panels, the one Generate — composed around one room that lives in this page alone: no design, no autosave, no studio record; the curated
 * engine renders in the browser as it does for a studio. What differs is 1.0's trial: three free renders per browser (each asked of the
 * server before it starts and counted when it is kept — app/site/try/actions.ts), Fast and one version only, every render stamped with
 * OpenMaison's mark before it is shown (lib/visualizer/trial/watermark.ts), Start your studio and Book a demo as the ways on.
 */
export function TrialEditor({ room, tool, left, onLeft, onLeave, onNewPhoto, onOpenSketch, onStart, onBookDemo }: {
  room: TrialRoom
  /** the way in (a tool page): the mode it opens on, and its honest line when only a sample can do it */
  tool: TrialTool | null
  left: number; onLeft: (n: number) => void
  /** back to the start (the room and its renders go — asked first when there are renders) */
  onLeave: () => void
  /** a new photo for the trial (the host reads it and opens a new room) */
  onNewPhoto: (f: File) => void
  onOpenSketch: () => void
  /** Start your studio — the host carries the room's photo with it when it is the visitor's own */
  onStart: () => void
  onBookDemo: () => void
}) {
  useScrollLock(true)
  const snack = useSnackbar()
  /* the editor is a new screen over the page: the keyboard and a screen reader start in it (the press that opened it is now behind it) */
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }) }, [])
  const reduce = useReducedMotion()
  const tabletDown = useMediaQuery(TABLET_DOWN), roomyLandscape = useMediaQuery(ROOMY_LANDSCAPE), shortLandscape = useMediaQuery(SHORT_LANDSCAPE)
  const short = tabletDown && shortLandscape
  const narrow = tabletDown && !roomyLandscape && !short
  const touch = useMediaQuery('(hover: none)')
  const rootRef = useRef<HTMLDivElement>(null)
  /* one room, kept in this page alone (persist: false — no autosave, no keepalive, no draft) */
  const [seed] = useState(() => ({
    rooms: [{ id: room.id, name: room.name, imageUrl: room.imageUrl, sampleKey: room.sampleKey, sourceFileId: null, detection: room.detection,
              pending: { ...emptyPending(), ...(tool === 'defurnish' && sampleByKey(room.sampleKey)?.empty ? { tool: 'empty' as const } : {}) },
              position: 0, updatedAt: 0, hasRenders: false, mayDelete: null, mayChange: null, createdBy: null, stateRev: 0 }],
    versions: { [room.id]: [] as VersionView[] },
  }))
  const ed = useEditorState(seed, { persist: false })
  const roomId = room.id
  const versionsOf = ed.versions[roomId]
  const all = useMemo(() => versionsOf ?? [], [versionsOf])
  const live = all.filter((v) => !v.deleted)
  /** the unstamped pictures the engine works from (the stamp is on what is shown and saved) */
  const [raw, setRaw] = useState<Record<string, string>>({})
  const [stored, setStored] = useState<string | undefined>(undefined)
  const view: VersionView | null = stored === ORIGINAL ? null : (stored ? live.find((v) => v.key === stored) : undefined) ?? live[live.length - 1] ?? null
  const viewKey = view?.key ?? ORIGINAL
  const setView = (key: string) => setStored(key)
  const rawOf = useCallback((key: string): string | null => (key === ORIGINAL ? room.imageUrl : raw[key] ?? all.find((v) => v.key === key)?.imageUrl ?? null), [raw, all, room.imageUrl])
  const shown = view ? view.imageUrl : room.imageUrl
  const imageUrl = view ? rawOf(view.key) : room.imageUrl
  const finishes = view?.finishes ?? NO_FINISHES
  const pending = ed.pendingOf(roomId) ?? BLANK
  const detection = onPicture(effectiveDetection(ed.detectionOf(roomId), pending.asPhoto, finishes), viewKey, all)
  const reading = detection ? readingFor({ detection, sampleKey: room.sampleKey }, finishes) : null
  const sketch = reading?.kind === 'sketch'
  const sample = sampleByKey(room.sampleKey)
  const [own, setOwn] = useState<OwnSwatch[]>([])
  const resolve = useCallback((id: string) => resolveMaterial(id, [], own), [own])
  const tools = toolAvailability({ sampleKey: room.sampleKey, detection }, finishes, reading)
  const emptiedV = tools && !tools.canFurnish && tools.canEmpty ? [...all].reverse().find((v) => v.finishes.emptied && !v.deleted && v.key !== viewKey) ?? null : null
  const emptiedLink = emptiedV ? { n: emptiedV.n, onOpen: () => setView(emptiedV.key) } : null
  const changeItems = changeList(pending, { reading, resolve })
  const intent = intentFor(pending, { hasImage: true, sketch, reading, resolve, tools })
  const style = pending.style
  const [runError, setRunError] = useState<string | null>(null)
  const patch = useCallback((fn: (p: Pending) => Pending, opts?: { coalesce?: string; history?: boolean }) => { setRunError(null); ed.setPending(roomId, fn, opts) }, [roomId, ed])
  const patchDetection = useCallback((fn: (d: Detection) => Detection) => { setRunError(null); ed.setDetection(roomId, fn) }, [roomId, ed])

  /* ── modes, selection, the canvas' own modes ── */
  const [mode, setMode] = useState<Mode>(tool ? TOOL_MODE[tool] : 'surfaces')
  const [tray, setTray] = useState(false)
  const [surfSel, setSurfSel] = useState<SurfaceSel>(null)
  const [furnSel, setFurnSel] = useState<string | null>(null)
  const [placing, setPlacing] = useState<Placing>(null)
  const [compare, setCompare] = useState<{ on: boolean; key: string | null }>({ on: false, key: null })
  const [markersHidden, setMarkersHidden] = useFlagPref('om.trial.markers', false)
  const [hintSeen, setHintSeen] = useFlagPref('om.trial.hint', false)
  const [softSeen, setSoftSeen] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [selWas, setSelWas] = useState(viewKey)
  if (viewKey !== selWas) { setSelWas(viewKey); setSurfSel(null); setFurnSel(null); setPlacing(null); setCompare((c) => ({ ...c, key: null })); setRunError(null) }

  /* ── Generate: asked of the server first, drawn here, stamped, then counted ── */
  const runRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const asking = useRef(false)
  const focusNext = useRef<'tile' | 'generate' | null>(null)
  const [running, setRunning] = useState<Run | null>(null)
  const gated = left <= 0 && !running
  const unlit = unlitSource(view, all)
  const unlitUrl = unlit ? rawOf(unlit.key) : null
  const lightUrl = unlitUrl ?? imageUrl
  const litFrom = unlit ? null : litAncestor(view, all)
  const underLight = litFrom ? (() => { const l = rawOf(litFrom.key), u = rawOf(litFrom.unlitKey); return l && u ? { lit: l, unlit: u } : null })() : null
  /** the server's answer, said where it belongs: out of renders → the gate (left 0); anything else on the Generate line */
  const heard = (a: TrialAnswer) => { onLeft(a.left); if ('error' in a && a.reason !== 'used') setRunError(a.error) }
  const generate = async () => {
    if (!intent.kind || running || !imageUrl || !detection || asking.current || left <= 0) return
    const used: Pending = { ...pending, variants: 1, quality: 'fast' }, kind = intent.kind, consumes = intent.consumes
    asking.current = true
    const ask = await askTrialRender({ botToken: null }).catch((): TrialAnswer => ({ error: REFUSAL_WORDS.off, reason: 'off', left }))
      .finally(() => { asking.current = false })
    if ('error' in ask) { heard(ask); return }
    const token = ++runRef.current
    const guarded = DRIFT_GUARDED.includes(kind)
    const named = guarded ? [...PASS_STEPS[kind].slice(0, -1), 'Checking the room’s shape', PASS_STEPS[kind][PASS_STEPS[kind].length - 1]!] : PASS_STEPS[kind]
    setRunError(null); setRunning({ title: intent.busy, step: 0, steps: named, saving: false })
    const min = 1600
    if (tickRef.current) clearInterval(tickRef.current)
    const tick = setInterval(() => {
      if (token !== runRef.current) { clearInterval(tick); return }
      setRunning((r) => (r && r.step < r.steps.length - (guarded ? 3 : 2) ? { ...r, step: r.step + 1 } : r))
    }, Math.round(min / Math.max(1, named.length - (guarded ? 2 : 1))))
    tickRef.current = tick
    const stop = (error?: string) => {
      clearInterval(tick)
      if (token !== runRef.current) return
      setRunning(null)
      if (error) setRunError(error)
      focusNext.current = error ? 'generate' : 'tile'
    }
    await wait(60)
    const [out] = await Promise.all([runPass({
      kind, base: { key: viewKey, url: imageUrl, finishes }, room: { sampleKey: room.sampleKey, detection, name: room.name, photoUrl: room.imageUrl }, pending: used, resolve,
      leadStyle: null, unlit: unlit && unlitUrl ? { key: unlit.key, url: unlitUrl } : null, underLight,
    }).catch(() => ({ error: 'Couldn’t render this one — please try again.' })), wait(min)])
    if (token !== runRef.current) { clearInterval(tick); return }
    if ('error' in out) { stop(out.error); return }
    /* (pending modules S20) the drift guard, as for a studio — free here (the trial spends no AI credits) */
    let lined = 0
    if (guarded) {
      setRunning((r) => (r ? { ...r, step: Math.max(r.step, r.steps.length - 2) } : r))
      const checks = await Promise.all(out.variants.map((v) => guardRender(imageUrl, v.dataUrl)))
      if (token !== runRef.current) { clearInterval(tick); return }
      for (const [i, v] of out.variants.entries()) {
        const g = checks[i]
        if (!g || !hasBlockingDrift(g.report)) continue
        if (!g.repaired) { v.applied = { ...v.applied, caveat: [v.applied.caveat, UNREPAIRED_WORDS].filter(Boolean).join(' · ') }; continue }
        v.dataUrl = g.repaired.dataUrl
        v.applied = { ...v.applied, repair: { words: REPAIRED_WORDS, credits: 0 } }
        lined++
      }
    }
    setRunning((r) => (r ? { ...r, step: r.steps.length - 1, saving: true } : r))
    /* the mark goes on before the picture is shown or saved; a picture that can't take it is never shown, and nothing counts */
    const stamped = await Promise.all(out.variants.map((v) => stampTrial(v.dataUrl))).catch(() => null)
    if (token !== runRef.current) { clearInterval(tick); return }
    if (!stamped) { stop(TRIAL_WORDS.stampFailed); return }
    const kept = await keepTrialRender().catch((): TrialAnswer => ({ error: REFUSAL_WORDS.off, reason: 'off', left }))
    if (token !== runRef.current) { clearInterval(tick); return }
    if ('error' in kept) { heard(kept); stop(kept.reason === 'used' ? undefined : kept.error); return }
    onLeft(kept.left)
    const priorN = all.reduce((m, v) => Math.max(m, v.n), 0)
    const made: VersionView[] = out.variants.map((v, i) => {
      const n = priorN + i + 1, key = `trial-${newId('v')}`, d = descriptor(v.applied)
      return { key, n, jobId: 'trial', variantId: n, label: `V${n} · ${d}`, descriptor: d, imageUrl: stamped[i]!, parentKey: viewKey, applied: v.applied, finishes: v.finishes, createdAt: 0, createdBy: null, kind: v.applied.kind, deleted: false }
    })
    setRaw((r) => ({ ...r, ...Object.fromEntries(made.map((m, i) => [m.key, out.variants[i]!.dataUrl])) }))
    ed.setVersions((prev) => ({ ...prev, [roomId]: [...(prev[roomId] ?? []), ...made] }))
    setStored(made[0]!.key)
    ed.setPending(roomId, (p) => afterRender(p, { used, consumed: out.consumed ?? consumes }))
    stop()
    snack({
      key: 'viz-ready',
      message: `${versionRange(made.map((m) => m.n))} is ready${lined ? ' · lined up with your photo' : ''} · ${allowanceLine(kept.left)}`,
      actionLabel: 'Compare', onAction: () => { setMenu(null); setStored(made[0]!.key); setCompare({ on: true, key: null }) },
    })
  }
  const cancelRun = () => {
    if (!running || running.saving) return
    runRef.current++
    if (tickRef.current) clearInterval(tickRef.current)
    setRunning(null); focusNext.current = 'generate'
    snack({ message: 'Stopped — nothing was kept or counted' })
  }
  /* (F162) after a run the keyboard lands on the new version (or back on Generate) */
  useEffect(() => {
    const want = focusNext.current
    if (!want || running) return
    focusNext.current = null
    const r = requestAnimationFrame(() => {
      const a = document.activeElement
      if (a && a !== document.body && rootRef.current?.contains(a) && !(a as HTMLButtonElement).disabled && !a.closest('[data-testid="viz-running"]')) return
      rootRef.current?.querySelector<HTMLElement>(want === 'tile' ? '[data-testid="viz-version"][aria-pressed="true"]' : '[data-testid="viz-generate"], [data-testid="trial-gate-start"]')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(r)
  }, [running, viewKey])

  /* ── the canvas: markers, the region lit, the waiting washes, the light previewed — the studio editor's own (room-session.ts) ── */
  const scope: (SurfaceDef | FurnitureDef)[] = !reading ? [] : mode === 'surfaces' ? scopeOf(surfSel, reading.surfaces) : mode === 'furniture' && furnSel ? reading.furniture.filter((f) => normFurnitureKey(f.label) === furnSel) : []
  const scopeIds = new Set(scope.map((s) => s.id))
  const markers: Marker[] = stageMarkers({ reading, hidden: markersHidden || !!placing || sketch, mode, pending, finishes, resolve, scopeIds })
  const onDot = (m: Marker) => {
    if (m.kind === 'surface') { const g = surfaceGroupFor(m.label); const n = reading?.surfaces.filter((s) => surfaceGroupFor(s.label) === g).length ?? 0; setMode('surfaces'); setSurfSel(n > 1 ? { kind: 'group', group: g } : { kind: 'label', key: m.label.toLowerCase() }) }
    else { setMode('furniture'); setFurnSel(normFurnitureKey(m.label)) }
    if (narrow) setTray(true)
  }
  const washItems = !reading || !imageUrl || sketch || markersHidden || compare.on || running || placing || (mode !== 'surfaces' && mode !== 'furniture') ? [] : waitingWash({ reading, pending, resolve, scopeIds })
  const lightOn = lightingSet(pending.lighting.knobs, pending.lighting.presetId, pending.lighting.instruction)
  const relit = pending.lighting.presetId && (unlit?.key ?? viewKey) === ORIGINAL && !pending.lighting.instruction.trim() && JSON.stringify(presetById(pending.lighting.presetId)?.knobs) === JSON.stringify(pending.lighting.knobs) ? sample?.relit?.[pending.lighting.presetId] ?? null : null
  /* a live light is a picture of its own: it wears the mark too */
  const { highlight, wash, preview } = useStageLayers({ imageUrl, lightUrl, scope, reading, photoUrl: room.imageUrl, finishes, sampleKey: room.sampleKey, quiet: compare.on || !!running, wash: washItems,
                                                       lighting: { on: mode === 'lighting' && lightOn, knobs: pending.lighting.knobs, relit }, finishPreview: stampTrial })
  const defaultBefore = view ? beforeKeyOf(view, all) : ORIGINAL
  const compareKey = compare.on && view ? compare.key ?? defaultBefore : null
  const beforeV = compareKey && compareKey !== ORIGINAL ? live.find((v) => v.key === compareKey) ?? null : null
  const beforeUrl = compareKey ? (beforeV ? beforeV.imageUrl : room.imageUrl) : null
  const stageCompare = view && compareKey && beforeUrl ? { before: beforeUrl, beforeLabel: beforeV ? `V${beforeV.n}` : 'Original', afterLabel: `V${view.n}` } : null
  const stageMode: StageMode = placing?.kind === 'place' ? { kind: 'place', label: placing.label, onPlace: (p) => { setPlacing(null); placing.add(p) }, onCancel: () => setPlacing(null) }
    : placing?.kind === 'draw' ? { kind: 'draw', label: placing.label, onDone: (poly) => { setPlacing(null); placing.done(poly) }, onCancel: () => setPlacing(null) } : { kind: 'view' }

  /* ── the picks and the marking — the studio editor's own (room-session.ts) ── */
  const pushRecent = (id: string) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 12))
  const { undoFrom, pickMaterial, pickPiece, recolourToMatch, clearAll, forget, clearSlot, pickStyle, startDraw, addSurfaceLike, addPieceLike, placeNamed } = useRoomEdits({
    roomId, viewKey, imageUrl, reading, pending, finishes, style, ed, patch, patchDetection, resolve, snack, pushRecent, setMode, setSurfSel, setFurnSel, setPlacing,
    closeTray: () => { if (narrow) setTray(false) }, setRunError,
  })
  const heldReplace = reading ? Object.entries(pending.furniture).filter(([, f]) => f.action === 'replace' && pickReady(f)).map(([id]) => reading.furniture.find((x) => x.id === id)).find(Boolean) ?? null : null
  const changes: Change[] = changeItems.map((c) => ({ id: c.id, label: c.label, needs: c.needs ?? null, onRemove: () => clearSlot(c.slot, c.ids) }))
  const marks: Record<Mode, boolean> = {
    surfaces: changeItems.some((c) => c.slot === 'materials'),
    furniture: changeItems.some((c) => c.slot === 'furniture'),
    style: !!pending.style || pending.transfer.refs.length > 0,
    lighting: lightOn,
    tools: !!pending.tool,
  }
  const [addItem, setAddItem] = useState<'surface' | 'furniture' | null>(null)
  const [addPrefer, setAddPrefer] = useState<'place' | 'draw'>('place')
  const addSurface = (prefer: 'place' | 'draw') => { setAddPrefer(prefer); setAddItem('surface') }

  /* ── pictures the visitor hands over: a swatch, a reference, a piece's photo — kept in this page alone ── */
  const { okPhoto, readPicture } = usePictureReader()
  const photoInput = useRef<HTMLInputElement>(null)
  const swatchInput = useRef<HTMLInputElement>(null)
  const refInput = useRef<HTMLInputElement>(null)
  const pieceInput = useRef<HTMLInputElement>(null)
  const pieceFor = useRef<string[]>([])
  const [swatch, setSwatch] = useState<{ url: string; name: string; hex: string } | null>(null)
  const [swatchCat, setSwatchCat] = useState<string | null>(null)
  const readSwatch = async (f: File) => {
    if (!okPhoto(f)) return
    try { const url = await readPicture(f, 512); if (!url) return; setSwatch({ url, name: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 40), hex: dominantColour(await loadImg(url)) }) } catch { snack({ message: 'Couldn’t read that swatch — please try another' }) }
  }
  const saveSwatch = async (m: { name: string; hex: string; finish: string; imageUrl: string | null; category: string }): Promise<boolean> => {
    const id = newId('o'), ids = scope.filter((s) => !('category' in s)).map((s) => s.id)
    setOwn((o) => [...o, { id, name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: m.imageUrl }])
    if (ids.length) pickMaterial(ids, `own:${id}`)
    return true
  }
  /* a swatch taken off takes its picks; Undo brings back both */
  const removeOwn = (id: string) => {
    const s = own.find((x) => x.id === id); if (!s) return
    const mid = `own:${id}`, before = ed.stepNow(roomId)
    setOwn((o) => o.filter((x) => x.id !== id))
    ed.setPending(roomId, (p) => { const ids = Object.entries(p.materials).filter(([, m]) => m === mid).map(([k]) => k); return ids.length ? { ...p, materials: omit(p.materials, ids) } : p })
    snack({ key: UNDO_KEY, message: `${s.name} removed`, actionLabel: 'Undo', onAction: () => { setOwn((o) => (o.some((x) => x.id === id) ? o : [...o, s])); if (ed.stepNow(roomId) > before) undoFrom(roomId, before) } })
  }
  const addReference = async (f: File) => {
    if (!okPhoto(f)) return
    if (pending.transfer.refs.length >= MAX_REFERENCES) { snack({ message: `Up to ${MAX_REFERENCES} references` }); return }
    try {
      const url = await readPicture(f, 900); if (!url) return
      const palette = referencePalette(await loadImg(url)).map((x) => x.hex)
      const hadStyle = pending.style, before = ed.stepNow(roomId)
      patch((p) => ({ ...p, transfer: { ...p.transfer, refs: [...p.transfer.refs, { id: newId('r'), url, role: (p.transfer.refs.length ? 'palette' : 'overall') as ReferenceRole, palette }].slice(0, MAX_REFERENCES) } }))
      if (hadStyle) {
        patch((p) => ({ ...p, style: '' }))
        snack({ key: UNDO_KEY, message: `${hadStyle} taken off — the reference sets the look`, actionLabel: 'Undo', onAction: () => undoFrom(roomId, before + 1) })
      }
    } catch { snack({ message: 'Couldn’t read that image — please try another' }) }
  }
  const addPiecePhoto = async (f: File) => {
    const ids = pieceFor.current; if (!ids.length || !okPhoto(f)) return
    try {
      const url = await readPicture(f, 600); if (!url) return
      patch((p) => ({ ...p, furniture: { ...p.furniture, ...Object.fromEntries(ids.map((id) => [id, { ...(p.furniture[id] ?? KEEP), action: 'replace' as const, refImage: url }])) } }))
    } catch { snack({ message: 'Couldn’t read that photo — please try another' }) }
  }

  /* ── out of the editor: renders aren't kept in the free trial (1.0's words) ── */
  const [leaveAsk, setLeaveAsk] = useState<null | 'back' | 'photo'>(null)
  const hasWork = live.length > 0
  const leave = () => { if (hasWork) setLeaveAsk('back'); else onLeave() }
  const newPhoto = () => { if (hasWork) setLeaveAsk('photo'); else photoInput.current?.click() }
  useEffect(() => {
    if (!hasWork) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }   // a reload or a closed tab: the browser's own question
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [hasWork])
  const download = (key: string) => {
    const v = key === ORIGINAL ? null : all.find((x) => x.key === key) ?? null
    const a = document.createElement('a')
    a.href = v ? v.imageUrl : room.imageUrl; a.download = v ? renderFileName(room.name, v.n) : originalFileName(room.name)
    document.body.appendChild(a); a.click(); a.remove()
    if (v) snack({ message: TRIAL_WORDS.downloaded })
  }
  const flagDeleted = (key: string, deleted: boolean) => ed.setVersions((prev) => ({ ...prev, [roomId]: (prev[roomId] ?? []).map((x) => (x.key === key ? { ...x, deleted } : x)) }))
  const removeVersion = (v: VersionView) => {
    flagDeleted(v.key, true)
    snack({ key: 'viz-version-deleted', message: `V${v.n} deleted`, actionLabel: 'Undo', onAction: () => flagDeleted(v.key, false) })
  }
  const [menu, setMenu] = useState<Menu>(null)
  const menuAnchor = useRef<HTMLElement | null>(null)
  const openMenu = (m: NonNullable<Menu>, el: HTMLElement) => { menuAnchor.current = el; setMenu(m) }

  /* ── keys: ⌘Z / ⇧⌘Z / ⌘Y, Esc, ← → through the versions (the studio editor's, without its studio-only modes) ── */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      if (document.querySelector('[aria-modal="true"]')) return
      const textEntry = typing && !(el instanceof HTMLInputElement && /^(range|checkbox|radio|button)$/.test(el.type))
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !textEntry) { e.preventDefault(); if (e.shiftKey) ed.redo(roomId); else ed.undo(roomId); return }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y' && !textEntry) { e.preventDefault(); ed.redo(roomId); return }
      if (typing) return
      if (e.key === 'Escape') {
        if (placing) { setPlacing(null); return }
        if (compare.on) { setCompare({ on: false, key: null }); return }
        if (surfSel || furnSel) { setSurfSel(null); setFurnSel(null); return }
        if (tray) setTray(false)
        return
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !menu && !e.metaKey && !e.ctrlKey && !e.altKey && !(el?.closest?.('[role="slider"], [role="tablist"], [role="radiogroup"], [role="listbox"], [role="menu"]'))) {
        const keys = [ORIGINAL, ...live.map((v) => v.key)], i = keys.indexOf(viewKey), j = e.key === 'ArrowLeft' ? i - 1 : i + 1
        if (keys[j]) { e.preventDefault(); setView(keys[j]!) }
      }
    }
  })
  useEffect(() => { const on = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on) }, [])

  /* ── the panels: the studio editor's, fed by this room ── */
  const reshaped = finishes.reshaped
  const baseEdited = view !== null && (Object.keys(finishes.surfaces).length > 0 || finishes.removed.length > 0 || Object.keys(finishes.customized).length > 0 || finishes.emptied)
  const panel: ReactNode = !reading ? null
    : mode === 'surfaces' ? (
      <SurfacesPanel surfaces={reading.surfaces} finishes={finishes.surfaces} pending={pending.materials} resolve={resolve} sel={surfSel} onSelect={setSurfSel} onPick={pickMaterial}
                     style={style} library={[]} own={own} recent={recent} onUpload={(c) => { setSwatchCat(c ?? null); swatchInput.current?.click() }} onRemoveOwn={removeOwn}
                     onAdd={() => addSurface('place')} onDraw={(target) => { if (target) startDraw(target); else addSurface('draw') }} onAddLike={addSurfaceLike}
                     onForget={(ids) => forget(ids, titleCaseLabel(reading.surfaces.find((s) => s.id === ids[0])?.label ?? 'Surface'))} sketch={sketch} reshaped={reshaped} rough={!room.sampleKey && !sketch && ed.detectionOf(roomId)?.source === 'fallback'} />
    ) : mode === 'furniture' ? (
      <FurniturePanel furniture={reading.furniture} picks={pending.furniture} sel={furnSel} onSelect={setFurnSel} onPick={pickPiece} style={style} tools={tools} customized={finishes.customized}
                      onAdd={() => setAddItem('furniture')} onAddLike={addPieceLike}
                      onForget={(ids) => forget(ids, titleCaseLabel(normFurnitureKey(reading.furniture.find((f) => f.id === ids[0])?.label ?? 'Piece')))}
                      onRefPhoto={(ids) => { pieceFor.current = ids; pieceInput.current?.click() }} onRecolour={(ids) => { void recolourToMatch(ids) }} reshaped={reshaped} />
    ) : mode === 'style' ? (
      <StylePanel looks={sample?.looks ?? null} pending={pending} onStyle={pickStyle} leadName={null} leadStyle={null} baseEdited={baseEdited}
                  onAddRef={() => refInput.current?.click()} onPatchTransfer={(fn) => patch((p) => ({ ...p, transfer: fn(p.transfer) }), { coalesce: 'transfer' })} />
    ) : mode === 'lighting' ? (
      <LightingPanel pending={pending} onLighting={(fn, coalesce) => patch((p) => ({ ...p, lighting: fn(p.lighting) }), { coalesce })} advanced={advanced} onAdvanced={setAdvanced} />
    ) : (
      <ToolsPanel pending={pending} onTool={(x) => patch((p) => ({ ...p, tool: x }))} onPatch={(fn, coalesce) => patch(fn, { coalesce })} sketch={sketch} style={style} tools={tools} emptied={emptiedLink}
                  onUseAsPhoto={() => { const before = ed.stepNow(roomId); patch((p) => ({ ...p, asPhoto: true })); snack({ key: UNDO_KEY, message: 'Treated as a photo', actionLabel: 'Undo', onAction: () => undoFrom(roomId, before) }) }}
                  onDraw={() => addSurface('draw')} />
    )
  const describeBox = (compact: boolean) => <DescribeBox compact={compact} value={pending.note} onChange={(v, c) => patch((p) => ({ ...p, note: v }), { coalesce: c ? 'note' : undefined })} />
  const footIntent = running ? { ...intent, busy: running.title } : intent
  const footer = (compact: boolean) => (
    <GenerateFooter compact={compact} describe={compact ? null : describeBox(false)} changes={changes} onClear={clearAll} intent={footIntent} variants={1} onVariants={() => {}}
                    quality="fast" onQuality={() => {}} onGenerate={() => { void generate() }} busy={!!running} error={runError}
                    allowance={<>{allowanceLine(left)} · no sign-up needed</>}
                    reasonLink={pending.tool === 'furnish' && emptiedLink && !footIntent.kind ? { text: 'Furnish works on an emptied version —', label: `open V${emptiedLink.n}`, onPress: emptiedLink.onOpen }
                      : heldReplace && !footIntent.kind && footIntent.reason === replaceHeld(heldReplace.label) ? { text: `${replaceHeldLead(heldReplace.label)} —`, label: 'recolour it to match', onPress: () => { const g = normFurnitureKey(heldReplace.label); void recolourToMatch(reading?.furniture.filter((x) => normFurnitureKey(x.label) === g && pending.furniture[x.id]?.action === 'replace').map((x) => x.id) ?? [heldReplace.id]) } }
                      : null} />
  )
  /* 1.0's gate, where Generate was: the three are used — the ways on */
  const gate = (compact: boolean) => (
    <div className={t.gate} data-compact={compact || undefined} data-testid="trial-gate" role="status">
      <div className={t.gateText}>
        <p className={t.gateTitle}><Icon name="wand_shine" size={20} weight={300} />{TRIAL_WORDS.gateTitle}</p>
        {compact ? null : <p className={t.gateBody}>{TRIAL_WORDS.gateText}{room.upload ? ` ${TRIAL_WORDS.carried}` : ''}</p>}
      </div>
      <div className={t.gateButtons}>
        <Button onPress={onStart} data-testid="trial-gate-start">{TRIAL_WORDS.start}</Button>
        <Button variant="secondary" appearance="outlined" onPress={onBookDemo} data-testid="trial-gate-demo">{TRIAL_WORDS.bookDemo}</Button>
      </div>
    </div>
  )

  /* ── the canvas' bar: markers, before and after, download (the studio's Present, pins and Messages are its own) ── */
  const parentLabel = view ? (defaultBefore === ORIGINAL ? 'Original' : `V${all.find((v) => v.key === defaultBefore)?.n ?? '?'}`) : null
  const toggleCompare = () => setCompare((c) => (c.on ? { on: false, key: null } : { on: true, key: null }))
  const toolbar = (
    <>
      <Tooltip label={markersHidden ? 'Show markers' : 'Hide markers'}><IconButton icon={markersHidden ? 'visibility' : 'visibility_off'} label={markersHidden ? 'Show markers' : 'Hide markers'} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => setMarkersHidden(!markersHidden)} data-testid="viz-markers" /></Tooltip>
      <Tooltip label={!view ? 'Pick a version to compare' : compare.on ? 'Show it alone' : `Before and after · ${parentLabel}`}>{narrow ? <IconButton icon="compare" label="Before and after" size={36} variant="bare" iconSize={20} iconWeight={300} selected={compare.on} aria-pressed={compare.on} disabled={!view} onClick={toggleCompare} data-testid="viz-compare-toggle" />
        : <button type="button" className={styles.compareBtn} aria-pressed={compare.on} disabled={!view} onClick={toggleCompare} data-testid="viz-compare-toggle"><Icon name="compare" size={20} weight={300} />Compare</button>}</Tooltip>
      <Tooltip label="Download"><IconButton icon="download" label="Download" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => download(viewKey)} data-testid="trial-download" /></Tooltip>
    </>
  )
  const stage = (
    <Stage image={shown} alt={view ? `${room.name} · V${view.n}` : room.name} compare={stageCompare} preview={preview} highlight={highlight} wash={wash} markers={markers} onDot={onDot} mode={stageMode}
           pins={null} activePin={null} onPin={() => {}} running={running} onCancelRun={cancelRun} toolbar={toolbar}
           chip={!stageCompare ? <span className={styles.stageChip} data-testid="viz-stage-chip">{view ? <><b>V{view.n}</b> · {view.descriptor}</> : <b>Original</b>}</span> : null} />
  )
  const strip = (
    <div className={styles.stripSlot} data-viz-bottom="" data-viz-strip="">
      <VersionsStrip lineage={all} original={room.imageUrl} versions={live} viewKey={viewKey} compareKey={compareKey} inFlight={running ? 1 : 0} badges={{}}
                     onPick={(k) => { setView(k); if (k === ORIGINAL) setCompare({ on: false, key: null }) }} onMenu={(k, el) => openMenu({ kind: 'version', key: k }, el)} menuFor={menu?.kind === 'version' ? menu.key : null}
                     originalSub={effectiveDetection(ed.detectionOf(roomId), pending.asPhoto, NO_FINISHES)?.kind === 'sketch' ? 'the sketch' : 'the photo'} />
    </div>
  )
  const mv = menu?.kind === 'version' ? all.find((v) => v.key === menu.key) ?? null : null

  /* ── the tray ≤1024 — the studio editor's camera-app model, one thing moving at a time (F173) ── */
  const fold = reduce ? { duration: 0 } : { duration: duration.sheetExit, ease: ease.standard }
  const rise = reduce ? { duration: 0 } : { duration: duration.sheet, ease: ease.decelerate }
  const collapse = { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1, transition: rise }, exit: { height: 0, opacity: 0, transition: fold } }
  const unfold = { ...collapse, animate: { height: 'auto', opacity: 1, transition: fold } }
  const trayShown = narrow && tray && !!panel
  const [trayLeaving, setTrayLeaving] = useState(false)
  const [trayShownWas, setTrayShownWas] = useState(trayShown)
  if (trayShown !== trayShownWas) { setTrayShownWas(trayShown); setTrayLeaving(!trayShown && narrow) }
  if (trayLeaving && !narrow) setTrayLeaving(false)
  const trayUp = tray || trayLeaving
  const trayRef = useRef<HTMLDivElement>(null)
  const trayWas = useRef(false)
  useEffect(() => {
    const opened = tray && !trayWas.current, closed = !tray && trayWas.current
    trayWas.current = tray
    if (opened) trayRef.current?.focus({ preventScroll: true })
    if (closed) {
      const a = document.activeElement
      if (!a || a === document.body || !rootRef.current?.contains(a)) rootRef.current?.querySelector<HTMLElement>('[data-variant="dock"] [aria-selected="true"]')?.focus({ preventScroll: true })
    }
  }, [tray])
  /* the snackbar rests where the studio editor's does */
  useFrameSnackbarPlace(rootRef, short, [narrow, tray, trayUp, hintSeen, softSeen, gated])

  /* ── the line under the bar: one at a time — the honest line of a sample-only way in, the soft ask after the first render, the tip ── */
  const sampleOnly = tool && room.upload ? SAMPLE_ONLY[tool] ?? null : null
  const note: ReactNode = sampleOnly && !hasWork ? (
    <div className={styles.note} role="note" data-testid="trial-sample-only"><Icon name="info" size={20} weight={300} />
      <span className={styles.noteText}>{tool === 'sketch' ? TRIAL_WORDS.notASketch : sampleOnly}</span>
      {tool === 'sketch' ? <Button appearance="text" onPress={onOpenSketch}>{TRIAL_WORDS.openSketch}</Button> : null}</div>
  ) : hasWork && !softSeen && left > 0 && !(narrow && tray) ? (
    <div className={styles.note} role="note" data-testid="trial-soft"><Icon name="wand_shine" size={20} weight={300} />
      <span className={styles.noteText}>{TRIAL_WORDS.soft}{room.upload ? ` ${TRIAL_WORDS.carried}` : ''}</span>
      <Button appearance="text" onPress={onStart} data-testid="trial-soft-start">{TRIAL_WORDS.start}</Button>
      <Button appearance="text" onPress={() => setSoftSeen(true)}>Not now</Button></div>
  ) : !hintSeen && !hasWork && !(narrow && tray) && !short ? (
    <div className={styles.note} role="note" data-testid="viz-hint"><Icon name="info" size={20} weight={300} />
      <span className={styles.noteText}>{sketch ? 'This is a sketch — pick a style, then Render from sketch to turn it into a photo.'
        : <>{touch ? 'Tap' : 'Click'} a square on the photo to pick its finish, or {narrow ? 'a mode below' : 'choose a style or a light on the right'} — then Generate.</>}</span>
      <Button appearance="text" onPress={() => setHintSeen(true)}>Got it</Button></div>
  ) : null

  return (
    <div ref={rootRef} tabIndex={-1} aria-label={`AI Visualizer · ${room.name}`} className={`${styles.editor} ${t.frame}`} data-narrow={narrow || undefined} data-tray={(narrow && tray) || undefined} data-tray-leaving={(narrow && trayLeaving && !tray) || undefined} data-rail={!narrow || undefined} data-short={short || undefined} data-testid="trial-editor">
      <header className={bar.bar} data-compact={narrow || undefined} data-short={short || undefined} data-testid="trial-topbar">
        <Tooltip label={TRIAL_WORDS.startOver}><IconButton icon="arrow_back" label={TRIAL_WORDS.startOver} size={36} variant="bare" iconSize={24} iconWeight={300} onClick={leave} data-testid="trial-back" /></Tooltip>
        <div className={bar.titles}>
          <Tooltip label={room.name}><h1 className={bar.title}>{room.name}</h1></Tooltip>
          <span className={bar.whose}><MetaChip>{TRIAL_WORDS.chip}</MetaChip></span>
        </div>
        <span className={t.fill} />
        <div className={bar.end}>
          {!narrow ? (
            <>
              <Tooltip label="Undo" keys="mod+z"><IconButton icon="undo" label="Undo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!ed.canUndo(roomId)} onClick={() => ed.undo(roomId)} /></Tooltip>
              <Tooltip label="Redo" keys="mod+shift+z"><IconButton icon="redo" label="Redo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!ed.canRedo(roomId)} onClick={() => ed.redo(roomId)} /></Tooltip>
              <span className={bar.rule} />
              <Button variant="secondary" appearance="outlined" onPress={newPhoto} iconStart={<Icon name="add_photo_alternate" size={20} weight={300} />} data-testid="trial-new-photo">Use another photo</Button>
              <Button variant="secondary" appearance="outlined" onPress={onBookDemo} data-testid="trial-book-demo">{TRIAL_WORDS.bookDemo}</Button>
            </>
          ) : null}
          <Tooltip label="More options" disabled={menu?.kind === 'more'}><IconButton icon="more_vert" label="More options" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={menu?.kind === 'more'} onClick={(e) => openMenu({ kind: 'more' }, e.currentTarget)} data-testid="trial-menu" /></Tooltip>
        </div>
      </header>
      {note}
      {narrow ? (
        <>
          <div className={styles.body} data-viz-body="">{stage}</div>
          <AnimatePresence initial={false} onExitComplete={() => setTrayLeaving(false)}>
            {!tray ? <motion.div key="strip" className={styles.fold} {...unfold}>{strip}</motion.div> : null}
            {tray && panel ? (
              <motion.div key="tray" className={styles.fold} data-viz-bottom="" {...collapse}>
                <div ref={trayRef} className={styles.tray} tabIndex={-1} role="region" aria-label="Edit the room" data-testid="viz-tray">
                  <div className={styles.trayDescribe}>{describeBox(true)}</div><PanelClose.Provider value={() => setTray(false)}>{panel}</PanelClose.Provider>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className={styles.goDock} data-viz-bottom="" data-viz-go="">
            {gated ? gate(true) : footer(true)}
            <ModeTabs variant="dock" mode={mode} marks={marks} onMode={(m) => { if (m === mode && tray) setTray(false); else { setMode(m); setTray(true) } }} />
          </div>
        </>
      ) : (
        <div className={styles.body} data-viz-body="">
          <div className={styles.main}>{stage}{strip}</div>
          <aside className={styles.rail} aria-label="Edit the room">
            <ModeTabs mode={mode} onMode={setMode} marks={marks} />
            <div className={styles.panelWrap}>{short ? <div className={styles.trayDescribe}>{describeBox(true)}</div> : null}{panel}</div>
            {gated ? gate(short) : footer(short)}
          </aside>
        </div>
      )}
      <span className="visually-hidden" aria-live="polite" data-testid="viz-live">{view ? `V${view.n} · ${view.descriptor} on screen` : 'Original photo on screen'}</span>

      <input ref={photoInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onNewPhoto(f) }} data-testid="trial-photo-input" />
      <input ref={swatchInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readSwatch(f) }} />
      <input ref={refInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addReference(f) }} />
      <input ref={pieceInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addPiecePhoto(f) }} />

      <PortalMenu open={menu?.kind === 'version' && !!mv} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={mv ? `V${mv.n} · ${mv.descriptor}` : ''}>
        {mv ? (
          <>
            {!view ? <DropdownItem onSelect={() => { setMenu(null); setView(mv.key); setCompare({ on: true, key: null }) }}>Before and after</DropdownItem>
              : mv.key !== viewKey ? <DropdownItem onSelect={() => { setMenu(null); setCompare({ on: true, key: mv.key }) }}>{`Compare with V${view.n}`}</DropdownItem>
                : <DropdownItem onSelect={() => { setMenu(null); setCompare({ on: true, key: null }) }}>Before and after</DropdownItem>}
            <DropdownItem onSelect={() => { setMenu(null); download(mv.key) }}>Download</DropdownItem>
            <DropdownDivider />
            <DropdownItem tone="danger" onSelect={() => { setMenu(null); removeVersion(mv) }}>Delete</DropdownItem>
          </>
        ) : null}
      </PortalMenu>
      <PortalMenu open={menu?.kind === 'more'} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={room.name}>
        {narrow ? <DropdownItem onSelect={() => { setMenu(null); ed.undo(roomId) }} disabled={!ed.canUndo(roomId)}>Undo</DropdownItem> : null}
        {narrow ? <DropdownItem onSelect={() => { setMenu(null); ed.redo(roomId) }} disabled={!ed.canRedo(roomId)}>Redo</DropdownItem> : null}
        {narrow ? <DropdownItem onSelect={() => { setMenu(null); newPhoto() }}>Use another photo</DropdownItem> : null}
        <DropdownItem onSelect={() => { setMenu(null); setHintSeen(false) }}>Show the tips again</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { setMenu(null); onStart() }}>{TRIAL_WORDS.start}</DropdownItem>
        {narrow ? <DropdownItem onSelect={() => { setMenu(null); onBookDemo() }}>{TRIAL_WORDS.bookDemo}</DropdownItem> : null}
      </PortalMenu>

      <AddItemDialog kind={addItem} prefer={addPrefer} onClose={() => setAddItem(null)} onDone={(label, category, how) => { const kind = addItem; setAddItem(null); if (kind) placeNamed(kind, label, category, how) }} />
      <SwatchDialog file={swatch} suggestedCategory={swatchCat} onClose={() => setSwatch(null)} onSave={(m) => saveSwatch(m)} studioChoice={false} />
      <ConfirmDialog open={!!leaveAsk} title={TRIAL_WORDS.leaveTitle} message={TRIAL_WORDS.leaveText} confirmLabel={TRIAL_WORDS.leave} cancelLabel={TRIAL_WORDS.stay}
                     onCancel={() => setLeaveAsk(null)} onConfirm={() => { const why = leaveAsk; setLeaveAsk(null); if (why === 'photo') photoInput.current?.click(); else onLeave() }} />
    </div>
  )
}
