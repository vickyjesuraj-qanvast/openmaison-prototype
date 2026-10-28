'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useShortcutsHere } from '@/lib/keys/store'
import { newId as newUuid } from '@/lib/uid'
import { VISUALIZER_KEYS } from '@/lib/keys/registry'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ds'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { copyText } from '@/lib/clipboard'
import { suggestMaterials } from '@/lib/visualizer/catalogue'
import { styleByName } from '@/lib/visualizer/styles'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar, useSnackbarDismiss } from '@/components/om/snackbar'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { MaisonFab } from '@/components/shell/maison-fab'
import { PageReveal } from '@/components/shell/page-reveal'
import { VisualizerEditorSkeleton } from '@/components/visualizer/skeletons'
import { CreditsChip } from '@/components/credits/credits-chip'
import { chargeAI, chargeAIQuietly, refundAIWork, useCredits } from '@/components/credits/credits-client'
import { fmtCredits, spendable } from '@/lib/credits/model'
import { costOf, renderAction } from '@/lib/credits/schedule'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { duration, ease } from '@/lib/motion'
import { backLabel as backLabelFor, withFrom } from '@/lib/nav'
import { useFlagPref } from '@/lib/prefs'
import { ago } from '@/lib/templates/ago'
import { KEEP } from '@/lib/visualizer/furniture'
import { lightingSet, presetById } from '@/lib/visualizer/lighting'
import { resolveMaterial } from '@/lib/visualizer/materials'
import { afterRender, changeList, descriptor, emptyPending, fallbackDetection, intentFor, newId, NO_FINISHES, ORIGINAL, pickReady, WHOLE_ROOM_UNMARKED, readingFor, replaceHeld, replaceHeldLead, toolAvailability, unlitSource, litAncestor, type Detection, type FurnitureDef, type Pending, type Quality, type SurfaceDef, type VersionView } from '@/lib/visualizer/model'
import { originalFileName, quoteGroupName, quoteLines, renderFileName } from '@/lib/visualizer/outputs'
import { LEAD_CLOSED_SHARE, LEAD_DELETED_ROW, leadDeletedNote, PHOTO_ACCEPT } from '@/lib/visualizer/policy'
import type { Pin, VisualizerEditorData } from '@/lib/visualizer/queries'
import { sampleByImage, sampleByKey } from '@/lib/visualizer/samples'
import { styleForLead } from '@/lib/visualizer/styles'
import { normFurnitureKey, surfaceGroupFor, titleCaseLabel } from '@/lib/visualizer/surfaces'
import { MAX_REFERENCES, type ReferenceRole } from '@/lib/visualizer/tools'
import { fallbackDots } from '@/lib/visualizer/engine/fallback'
import { dominantColour, referencePalette } from '@/lib/visualizer/engine/palette'
import type { Pt } from '@/lib/visualizer/engine/pixels'
import { guardRender, loadImg, runPass } from '@/lib/visualizer/engine/run'
import { DRIFT_GUARDED, hasBlockingDrift, REPAIRED_WORDS, repairRef, UNPAID_WORDS, UNREPAIRED_WORDS } from '@/lib/visualizer/drift'
import { addPin, addRoom, addVersionToQuote, createShareLink, deleteDesigns, deletePin, deleteRoom, deleteVersion, leadsToLink, linkDesignToLead, recordShareSent, removeOwnSwatch, renameDesign, renameRoom, renewShareLink, replyPin, replyToNote, restoreDesigns, restoreOwnSwatch, restorePin, restoreRoom, restoreVersion, saveOwnSwatch, saveRender, saveRoomAsset, saveVersionToFiles, setPinStatus, setRoomPhoto, stopShareLink, undoRoomPhoto, unlinkDesign, unstopShareLink } from '@/app/visualizer/actions'
import { PickOneDialog, type PickOption } from '@/components/company/templates/pick-one-dialog'
import { createStudioMaterial } from '@/app/company/materials-actions'
import { useEditorState } from './use-editor-state'
import { omit, PASS_STEPS, ROOMY_LANDSCAPE, SHORT_LANDSCAPE, stageMarkers, useFrameSnackbarPlace, usePictureReader, useRoomEdits, useStageLayers, waitingWash, UNDO_KEY, type Placing } from './room-session'
import { roomNameFromFile } from '@/lib/visualizer/room-name'
import { beforeKeyOf, effectiveDetection, lastTouched, onPicture, versionRange } from './editor-model'
import { EditorTopbar, RoomMore, useRoomInView } from './topbar'
import { GenerateFooter, ModeTabs, PanelClose, type Change, type FootPrice, type Mode } from './rail'
import { Stage, type Marker, type StageMode } from './stage'
import { carriesClientInput, VersionsStrip, type Badge } from './versions-strip'
import { ClientNotes, DraftPin, PinThread, type ClientNote } from './pin-card'
import { DescribeBox } from './describe-box'
import { SurfacesPanel, scopeOf, type SurfaceSel } from './panels/surfaces-panel'
import { FurniturePanel } from './panels/furniture-panel'
import { StylePanel } from './panels/style-panel'
import { LightingPanel } from './panels/lighting-panel'
import { ToolsPanel } from './panels/tools-panel'
import { AddRoomDialog, AddRoomOptions } from './dialogs/add-room'
import { AddItemDialog, QuoteDialog, SwatchDialog } from './dialogs/small-dialogs'
import { ShareDialog } from './dialogs/share-dialog'
import { designKindLabel } from '@/components/visualizer/home/kind-label'
import { PresentDialog } from './dialogs/present-dialog'
import { MoodboardDialog } from './dialogs/moodboard-dialog'
import { DeletedVersionsDialog, DeleteVersionDialog } from './dialogs/deleted-versions'
import { takePhotos } from '@/lib/visualizer/pending-photos'
import { SendToMessages } from '@/components/projects/messages/send-render'   // (parity map, TD-122) a render into the project's Messages
import styles from './editor.module.css'

/* The progress card's steps (1.0's status words, C-20 · C-24, one list per pass) — room-session.ts `PASS_STEPS`, the trial's too. */
const STEPS = PASS_STEPS
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const BLANK = emptyPending()
const RECENT_KEY = 'om.viz.recent'
const readRecent = (): string[] => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 12) : [] } catch { return [] } }
const fileStem = (name: string) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 40)
/** (critic 19) every picture the editor reads from the device — (pending modules S20) HEIC on every browser */
const UPLOAD_ACCEPT = `${PHOTO_ACCEPT},image/heic,image/heif,.heic,.heif`
/* (F146 · phone-tablet 0) the frame's three shapes — room-session.ts `ROOMY_LANDSCAPE` · `SHORT_LANDSCAPE`, the trial's too */

type Menu = { kind: 'version'; key: string } | { kind: 'room' } | { kind: 'design' } | null
/** A Generate belongs to its room (F196): its card and its tiles show only there; `saving` — the version is being kept, no Cancel (F211). */
type Run = { title: string; step: number; steps: string[]; roomId: string; roomName: string; count: number; saving: boolean }

/**
 * The AI Visualizer editor (REG-673 · 674 · 675; 1.0's AiVisualizerEditor, B · C, on 2.0's pieces): an app frame — the top bar with the
 * rooms, the canvas with its markers and tools, the versions under it, the rail of five modes with one Generate at its foot. Every pick
 * waits with the room (autosaved, ⌘Z / ⇧⌘Z); Generate renders in the browser (the curated engine, audit §5), keeps the version and puts
 * it on the canvas; the version's ⋯ takes it to Files, a quote or the client. ≤1024 (portrait, phones) the camera-app model: the photo,
 * the versions, the mode dock, and a tray that opens the mode's panel above the dock (Q-25).
 */
export function VisualizerEditor({ data, from, initialRoom, initialVersion = null, initialPin = null, initialNote = null, initialNotice = null, initialFile = null }: {
  data: VisualizerEditorData; from: string | undefined; initialRoom: string | null
  /** (F095 · F098) the version to open on — a filed render, the bell's link */
  initialVersion?: string | null
  /** (F098) a pin's thread to open */
  initialPin?: string | null
  /** (UX audit V1) the version whose client notes open on arrival — the bell's `?note=` */
  initialNote?: string | null
  /** what the link asked for that is gone */
  initialNotice?: string | null
  /** (Q-31) a lead photo to add as a room on arrival */
  initialFile?: { id: string; name: string; url: string } | null
}) {
  useShortcutsHere(VISUALIZER_KEYS)   // (REG-714) the ? panel lists the design editor's own keys
  return (
    <PageReveal skeleton={<VisualizerEditorSkeleton />}>
      <Editor data={data} from={from} initialRoom={initialRoom} initialVersion={initialVersion} initialPin={initialPin} initialNote={initialNote} initialNotice={initialNotice} initialFile={initialFile} />
    </PageReveal>
  )
}

function Editor({ data, from, initialRoom, initialVersion, initialPin, initialNote, initialNotice, initialFile }: {
  data: VisualizerEditorData; from: string | undefined; initialRoom: string | null; initialVersion: string | null; initialPin: string | null; initialNote: string | null; initialNotice: string | null
  initialFile: { id: string; name: string; url: string } | null
}) {
  const router = useRouter()
  const snack = useSnackbar()
  const reduce = useReducedMotion()
  const tabletDown = useMediaQuery(TABLET_DOWN), roomyLandscape = useMediaQuery(ROOMY_LANDSCAPE), shortLandscape = useMediaQuery(SHORT_LANDSCAPE)
  const short = tabletDown && shortLandscape
  const narrow = tabletDown && !roomyLandscape && !short
  const touch = useMediaQuery('(hover: none)')
  const ed = useEditorState(data)
  const { rooms, versions } = ed
  const readOnly = !!data.design.deletedAt
  /* (critic 4) a lead that left the studio (deleted, returned) keeps its links off — the loader says so; Share says why */
  const leadClosed = data.design.leadClosed
  /* (files-9) a lead in the leads' trash: the design opens, but nothing more goes onto the lead — no filing, no quote, no link */
  const leadDeleted = data.design.leadDeleted
  const title = data.lead?.name ?? data.design.name
  /* (files-13) who made the design, named as the Deleted Designs sheet names them (the loader's `maker`, when it hands it over) */
  const maker = 'maker' in data.design && typeof data.design.maker === 'string' && data.design.maker.trim() ? data.design.maker.trim() : null
  const back = from ?? '/visualizer'
  const backLabel = backLabelFor(from, { leadName: data.lead?.name ?? null, fallback: 'Back to AI Visualizer' })
  const rootRef = useRef<HTMLDivElement>(null)

  /* ── the room and the version on screen ── */
  const [roomPick, setRoomPick] = useState<string | null>(initialRoom)
  const room = rooms.find((r) => r.id === roomPick) ?? rooms[0] ?? null
  const roomId = room?.id ?? null
  const [local, setLocal] = useState<Record<string, string>>({})
  const urlOf = useCallback((v: VersionView) => local[v.key] ?? v.imageUrl, [local])
  const all = roomId ? versions[roomId] ?? [] : []
  const live = all.filter((v) => !v.deleted)
  const [viewKeys, setViewKeys] = useState<Record<string, string>>(() => (initialRoom && initialVersion ? { [initialRoom]: initialVersion } : {}))
  const stored = roomId ? viewKeys[roomId] : undefined
  const view: VersionView | null = stored === ORIGINAL ? null : (stored ? live.find((v) => v.key === stored) : undefined) ?? live[live.length - 1] ?? null
  const viewKey = view?.key ?? ORIGINAL
  const setView = (key: string) => { if (roomId) setViewKeys((v) => ({ ...v, [roomId]: key })) }
  /** The strip's keys in its order — the Original (when the room has a photo), then the versions — and its tiles, the same order. */
  const stripKeys = () => [...(room?.imageUrl ? [ORIGINAL] : []), ...live.map((v) => v.key)]
  const stripTiles = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-viz-strip] [data-testid="viz-version"]') ?? [])]
  /* (surfaces-22 · surfaces-23) a strip tile the keyboard goes to once it is drawn (after ← →, a delete, the last restore) */
  const tileFocus = useRef<string | null>(null)
  const keysRef = useRef<string[]>([])
  useEffect(() => { keysRef.current = stripKeys() })
  useEffect(() => {
    if (!tileFocus.current) return
    const t = requestAnimationFrame(() => {
      const key = tileFocus.current, root = rootRef.current
      if (!key || !root) return
      const i = keysRef.current.indexOf(key); if (i < 0) return   // not drawn yet — the next render tries again
      tileFocus.current = null
      /* only when the keyboard was in the strip or left on nothing (a menu or a dialog that closed) — never away from where it went on purpose */
      const a = document.activeElement
      if (a && a !== document.body && root.contains(a) && !a.closest('[data-viz-strip]')) return
      root.querySelectorAll<HTMLElement>('[data-viz-strip] [data-testid="viz-version"]')[i]?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(t)
  })
  /* (fresh-tablet 3) where the studio is, for a `from` that brings it back: always the room on screen, and the version when it isn't the
     newest — never what the address happens to say after a refresh */
  const placeRef = useRef<{ room: string | null; version: string | null }>({ room: roomId, version: null })
  useEffect(() => { placeRef.current = { room: roomId, version: stored === ORIGINAL ? ORIGINAL : stored && view ? view.key : null } })
  const here = useCallback(() => {
    if (typeof window === 'undefined') return `/visualizer/${data.design.id}`
    const u = new URL(window.location.href)
    for (const k of ['file', 'v', 'version', 'pin', 'note']) u.searchParams.delete(k)
    const { room: r, version: v } = placeRef.current
    if (r) u.searchParams.set('room', r)
    if (v) u.searchParams.set('v', v === ORIGINAL ? 'original' : v)
    return `${u.pathname}${u.search}`
  }, [data.design.id])
  const imageUrl = view ? urlOf(view) : room?.imageUrl ?? null
  const finishes = view?.finishes ?? NO_FINISHES
  const pending = ed.pendingOf(roomId) ?? BLANK
  /* (F058) a sketch taken as a photo reads as one — without ever changing the stored reading; (F022) what was marked by hand on another
     picture (a whole-room look, or the photo under one) is left out of this one */
  const detection = onPicture(effectiveDetection(ed.detectionOf(roomId), pending.asPhoto, finishes), viewKey, all)
  const reading = room && detection ? readingFor({ detection, sampleKey: room.sampleKey }, finishes) : null
  const sketch = reading?.kind === 'sketch'
  const sample = sampleByKey(room?.sampleKey)
  const resolve = useCallback((id: string) => resolveMaterial(id, data.library, data.design.own), [data.library, data.design.own])
  /* (F006 · F035 · F053 · F175 · F197) one count for the rail and the button; what the room can run on the version on screen */
  const tools = toolAvailability(room ? { sampleKey: room.sampleKey, detection } : null, finishes, reading)
  /* (audit 2026-09-26, fresh-desktop) the version on screen can't be furnished but the room already has an emptied one — Furnish points to it */
  const emptiedV = tools && !tools.canFurnish && tools.canEmpty ? [...all].reverse().find((v) => v.finishes.emptied && !v.deleted && v.key !== viewKey) ?? null : null
  const emptiedLink = emptiedV ? { n: emptiedV.n, onOpen: () => setView(emptiedV.key) } : null
  const changeItems = changeList(pending, { reading, resolve })
  const intent = intentFor(pending, { hasImage: !!imageUrl, sketch, reading, resolve, tools })
  const leadStyle = styleForLead(data.lead?.style)?.name ?? ''
  const style = pending.style || leadStyle

  const [runError, setRunError] = useState<{ roomId: string; text: string } | null>(null)
  const patch = useCallback((fn: (p: Pending) => Pending, opts?: { coalesce?: string; history?: boolean }) => { if (roomId) { setRunError(null); ed.setPending(roomId, fn, opts) } }, [roomId, ed])
  const patchDetection = useCallback((fn: (d: Detection) => Detection) => { if (roomId) { setRunError(null); ed.setDetection(roomId, fn) } }, [roomId, ed])

  /* ── modes, selection, the canvas' own modes ── */
  const [mode, setMode] = useState<Mode>('surfaces')
  const [tray, setTray] = useState(false)
  const [surfSel, setSurfSel] = useState<SurfaceSel>(null)
  const [furnSel, setFurnSel] = useState<string | null>(null)
  const [placing, setPlacing] = useState<Placing>(null)
  const [pinning, setPinning] = useState(false)
  const [activePin, setActivePin] = useState<string | null>(initialPin)
  /** (UX audit V1) the version whose client notes are open (From the client) */
  const [notesFor, setNotesFor] = useState<string | null>(initialNote)
  const [draftPin, setDraftPin] = useState<Pt | null>(null)
  const [compare, setCompare] = useState<{ on: boolean; key: string | null }>({ on: false, key: null })
  const [markersHidden, setMarkersHidden] = useFlagPref('om.viz.markersHidden', false)
  const [hintSeen, setHintSeen] = useFlagPref('om.viz.hint', false)
  const [advanced, setAdvanced] = useState(false)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const selKey = `${roomId}|${viewKey}`
  const [selWas, setSelWas] = useState(selKey)
  if (selKey !== selWas) { setSelWas(selKey); setSurfSel(null); setFurnSel(null); setActivePin(null); setDraftPin(null); setPlacing(null); setCompare((c) => ({ ...c, key: null })); setRunError(null); setNotesFor((n) => (n && n === viewKey ? n : null)) }

  /* the save stamp's clock (F019): ticks while the page is open, never read from Date.now() in render */
  const [now, setNow] = useState(data.now)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  /* ── Generate ── */
  const runRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /* (REG-704) the run's charge — given back if it's stopped before it's kept; `charging` holds a second press while the charge is taken;
     (pending modules S20) `repairs` — the drift guard's own charges (one per version lined up), given back with it */
  const chargeRef = useRef<{ ref: string; charged: number; repairs: string[] } | null>(null)
  const charging = useRef(false)
  const credits = useCredits(null)
  const roomIdRef = useRef(roomId)
  const focusNext = useRef<'tile' | 'generate' | null>(null)
  useEffect(() => { roomIdRef.current = roomId })
  const [running, setRunning] = useState<Run | null>(null)
  /* (UX audit V4) the versions this visit made — the next step on them is Share: first on their ⋯, and once their Compare closes */
  const [fresh, setFresh] = useState<string[]>([])
  const [shareAsk, setShareAsk] = useState<string | null>(null)
  /** The run on screen — only in the room it renders (F196). */
  const hereRun = running && running.roomId === roomId ? running : null
  const unlit = unlitSource(view, all)
  const unlitUrl = unlit ? (unlit.key === ORIGINAL ? room?.imageUrl ?? null : (() => { const v = all.find((x) => x.key === unlit.key); return v ? urlOf(v) : imageUrl })()) : null
  /** (F063) the picture a light goes on: a relit version's own unlit picture, so lights never stack */
  const lightUrl = unlitUrl ?? imageUrl
  /* (wave F, UAT 13.32) a change made on a version made after a light keeps that light: the engine paints under it and lays it again */
  const litFrom = unlit ? null : litAncestor(view, all)
  const underLight = litFrom ? (() => {
    const l = all.find((x) => x.key === litFrom.key)
    const u = litFrom.unlitKey === ORIGINAL ? room?.imageUrl ?? null : (() => { const x = all.find((y) => y.key === litFrom.unlitKey); return x ? urlOf(x) : null })()
    return l && u ? { lit: urlOf(l), unlit: u } : null
  })() : null
  const generate = async (over?: { variants?: 1 | 2 | 3; quality?: Quality }) => {
    if (!room || !intent.kind || running || readOnly || !imageUrl || !detection || charging.current) return
    /* (F003 · F052) the picks as the render starts — what it spends; a pick made while it runs stays for the next one */
    const used: Pending = over ? { ...pending, ...over } : pending, kind = intent.kind, r0 = room, consumes = intent.consumes
    const count = kind === 'edit' || kind === 'restyle' || kind === 'transfer' ? used.variants : 1
    /* (REG-704, AI credits A-05 · B-12) the charge is taken before the work, keyed by the job's own id (so a retry can't charge twice);
       a refusal opens its moment and nothing starts. The cheaper way (Q-33): one version, or Fast, when that one fits. */
    const jobId = newUuid(), ref = `render:${jobId}`, action = renderAction(kind, used.quality), need = costOf(action, count)
    const can = credits ? spendable(credits) : null
    const fits = (n: number) => can == null || n <= can
    const smaller = count > 1 && fits(costOf(action, 1))
      ? { label: `Make 1 version · ${fmtCredits(costOf(action, 1))}`, run: () => { patch((p) => ({ ...p, variants: 1 }), { history: false }); void generate({ ...over, variants: 1 }) } }
      : used.quality === 'high' && kind !== 'empty' && fits(costOf(renderAction(kind, 'fast'), count))
        ? { label: `Fast instead · ${fmtCredits(costOf(renderAction(kind, 'fast'), count))}`, run: () => { patch((p) => ({ ...p, quality: 'fast' }), { history: false }); void generate({ ...over, quality: 'fast' }) } }
        : null
    charging.current = true
    const charged = await chargeAI({ action, count, ref, what: 'render', needed: need, retry: () => { void generate(over) }, smaller }).finally(() => { charging.current = false })
    if (charged === false) return
    const token = ++runRef.current
    const repairs: string[] = []
    chargeRef.current = { ref, charged, repairs }
    /* (Q-31) the credits go back when the work fails or isn't kept — the failure's own words say so; (pending modules S20) a repair's too */
    const giveBack = async (why: string) => {
      chargeRef.current = null
      const back = (charged > 0 ? await refundAIWork(ref) : 0) + (await Promise.all(repairs.map((r) => refundAIWork(r)))).reduce((a, b) => a + b, 0)
      if (!back) return why
      /* T-24: "Couldn’t render this one — your 20 AI credits are back. Please try again." */
      const plain = / — please try again\.$/.exec(why)
      return plain ? `${why.slice(0, plain.index)} — your ${fmtCredits(back)} AI credits are back. Please try again.` : `${why} Your ${fmtCredits(back)} AI credits are back.`
    }
    /* (F071) several versions are kept together — the last step says so; (pending modules S20) a guarded pass checks the room's shape
       before it keeps (1.0's "Checking placement…") — the timer stops short of that step, which the check itself shows */
    const guarded = DRIFT_GUARDED.includes(kind)
    const named = guarded ? [...STEPS[kind].slice(0, -1), 'Checking the room’s shape', STEPS[kind][STEPS[kind].length - 1]!] : STEPS[kind]
    const steps = count > 1 ? [...named.slice(0, -1), 'Keeping the versions'] : named
    const priorN = all.reduce((m, v) => Math.max(m, v.n), 0)
    setRunError(null); setRunning({ title: intent.busy, step: 0, steps, roomId: r0.id, roomName: r0.name, count, saving: false }); setPinning(false); setDraftPin(null); setActivePin(null)
    const min = (used.quality === 'high' ? 2600 : 1600) + (count - 1) * 450
    /* (F070) one step timer — a cancelled run's timer stops itself, a new run replaces it */
    if (tickRef.current) clearInterval(tickRef.current)
    const tick = setInterval(() => {
      if (token !== runRef.current) { clearInterval(tick); return }
      setRunning((r) => (r && r.step < r.steps.length - (guarded ? 3 : 2) ? { ...r, step: r.step + 1 } : r))
    }, Math.round(min / Math.max(1, steps.length - (guarded ? 2 : 1))))
    tickRef.current = tick
    const stop = (error?: string) => {
      clearInterval(tick)
      if (token !== runRef.current) return
      setRunning(null)
      if (error) setRunError({ roomId: r0.id, text: error })
      focusNext.current = error ? 'generate' : 'tile'
    }
    await wait(60)
    const [out] = await Promise.all([runPass({
      kind, base: { key: viewKey, url: imageUrl, finishes }, room: { sampleKey: r0.sampleKey, detection, name: r0.name, photoUrl: r0.imageUrl ?? null }, pending: used, resolve,
      leadStyle: leadStyle || null, unlit: unlit && unlitUrl ? { key: unlit.key, url: unlitUrl } : null, underLight,
    }).catch(() => ({ error: 'Couldn’t render this one — please try again.' })), wait(min)])
    if (token !== runRef.current) { clearInterval(tick); return }
    if ('error' in out) { stop(await giveBack(out.error)); return }
    /* (pending modules S20 — 1.0's drift guard) each version against the picture it was made from: where the camera moved, the one corrective
       pass lines it up again — kept only when it reads better (never worse), charged as its own repair (1.0's render_repair, 2 AI credits;
       none when nothing was repaired); a repair that can't be paid for, or didn't help, leaves the render as it came and the version says
       why. Never fatal: a check that can't run lets the render through unchecked. */
    let lined = 0
    if (guarded) {
      setRunning((r) => (r ? { ...r, step: Math.max(r.step, r.steps.length - 2) } : r))
      const checks = await Promise.all(out.variants.map((v) => guardRender(imageUrl, v.dataUrl)))
      if (token !== runRef.current) { clearInterval(tick); return }   // stopped while it checked: Cancel gave back what was taken
      for (const [i, v] of out.variants.entries()) {
        const g = checks[i]
        if (!g || !hasBlockingDrift(g.report)) continue
        if (!g.repaired) { v.applied = { ...v.applied, caveat: [v.applied.caveat, UNREPAIRED_WORDS].filter(Boolean).join(' · ') }; continue }
        const rref = repairRef(jobId, i + 1), paid = await chargeAIQuietly({ action: 'render_repair', ref: rref })
        if (paid === false) { v.applied = { ...v.applied, caveat: [v.applied.caveat, UNPAID_WORDS].filter(Boolean).join(' · ') }; continue }
        if (paid > 0) repairs.push(rref)
        if (token !== runRef.current) { clearInterval(tick); if (paid > 0) void refundAIWork(rref); return }
        v.dataUrl = g.repaired.dataUrl
        v.applied = { ...v.applied, repair: { words: REPAIRED_WORDS, credits: paid } }
        lined++
      }
    }
    /* keeping the version: no Cancel from here (F211) */
    setRunning((r) => (r ? { ...r, step: r.steps.length - 1, saving: true } : r))
    const saved = await saveRender(r0.id, { jobId, kind, model: used.quality, parentKey: viewKey, variants: out.variants.map((v) => ({ image: v.dataUrl, applied: v.applied, finishes: v.finishes, materials: v.materials })) })
      .catch(() => ({ error: 'Couldn’t keep this version — please try again.' }))
    /* (critic 10) a save that failed takes its tiles away and leaves every pick where it was — (Q-31) and gives the credits back */
    if ('error' in saved) { stop(await giveBack(saved.error)); return }
    chargeRef.current = null
    const ns = (saved as { ns?: number[] }).ns   // (F211) the numbers the server gave, when it says them
    const made: VersionView[] = out.variants.map((v, i) => {
      const key = saved.keys[i]!, d = descriptor(v.applied), n = ns?.[i] ?? priorN + i + 1
      return { key, n, jobId: saved.jobId, variantId: i + 1, label: `V${n} · ${d}`, descriptor: d, imageUrl: v.dataUrl, parentKey: viewKey, applied: v.applied, finishes: v.finishes, createdAt: data.now, createdBy: data.viewer.id, kind: v.applied.kind, deleted: false }
    })
    setLocal((l) => ({ ...l, ...Object.fromEntries(out.variants.map((v, i) => [saved.keys[i]!, v.dataUrl])) }))
    ed.setVersions((prev) => ({ ...prev, [r0.id]: [...(prev[r0.id] ?? []), ...made] }))
    setViewKeys((v) => ({ ...v, [r0.id]: saved.keys[0]! }))
    setFresh((f) => [...f, ...saved.keys])
    ed.setPending(r0.id, (p) => afterRender(p, { used, consumed: out.consumed ?? consumes }))
    stop()
    router.refresh()
    const elsewhere = roomIdRef.current !== r0.id
    /* (F014) one line: what is ready — a whole-room look's caveat is the rail's hint, not the snackbar's */
    const names = versionRange(made.map((m) => m.n))
    /* (desktop-7) one "ready" at a time; its Compare puts away a dialog opened meanwhile (Present, Share…) rather than acting behind it */
    snack({
      key: 'viz-ready',
      message: `${elsewhere ? `${r0.name} · ` : ''}${names} ${made.length === 1 ? 'is' : 'are'} ready${lined ? ' · lined up with your photo' : ''}`,
      actionLabel: 'Before and after', onAction: () => {   // (the calm UI build 2026-10-27, 6-18) the canvas bar's name for it
        setPresent(null); setShare(null); setBoard(null); setQuoteFor(null); setDeletedOpen(false); setMenu(null)
        setRoomPick(r0.id); setViewKeys((v) => ({ ...v, [r0.id]: saved.keys[0]! })); setPinning(false); setDraftPin(null); setActivePin(null); setNotesFor(null); setCompare({ on: true, key: null }); setShareAsk(saved.keys[0]!)
      },
    })
  }
  const cancelRun = () => {
    if (!running || running.saving) return   // the version is being kept — it can be deleted once it lands
    runRef.current++
    if (tickRef.current) clearInterval(tickRef.current)
    setRunning(null); focusNext.current = 'generate'
    /* (REG-704, Q-31) stopped before it was kept: the charge goes back — (pending modules S20) and any repair's */
    const c = chargeRef.current; chargeRef.current = null
    if (c && c.charged > 0) void refundAIWork(c.ref)
    for (const r of c?.repairs ?? []) void refundAIWork(r)
    snack({ message: c && (c.charged > 0 || c.repairs.length) ? 'Stopped — nothing was kept or charged' : 'Stopped — nothing was kept' })
  }
  /* (F162) after a run the keyboard lands on the new version (or back on Generate), not on the page */
  useEffect(() => {
    const want = focusNext.current
    if (!want || running) return
    focusNext.current = null
    const t = requestAnimationFrame(() => {
      /* (F162) the leaving progress card (still fading out) is no place for the keyboard — it counts as nowhere */
      const a = document.activeElement
      if (a && a !== document.body && rootRef.current?.contains(a) && !(a as HTMLButtonElement).disabled && !a.closest('[data-testid="viz-running"]')) return
      const el = rootRef.current?.querySelector<HTMLElement>(want === 'tile' ? '[data-testid="viz-version"][aria-pressed="true"]' : '[data-testid="viz-generate"]')
      el?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(t)
  }, [running, viewKey])

  /* ── the canvas: markers, the region lit, the light previewed (components/visualizer/editor/room-session.ts — the website's trial runs the
     same code, pending modules S36) ── */
  const scope: (SurfaceDef | FurnitureDef)[] = !reading ? [] : mode === 'surfaces' ? scopeOf(surfSel, reading.surfaces) : mode === 'furniture' && furnSel ? reading.furniture.filter((f) => normFurnitureKey(f.label) === furnSel) : []
  const scopeIds = new Set(scope.map((s) => s.id))
  /* (F012) a marker says what the version on screen already wears */
  const markers: Marker[] = stageMarkers({ reading, hidden: markersHidden || !!placing || sketch || readOnly || pinning, mode, pending, finishes, resolve, scopeIds })
  const onDot = (m: Marker) => {
    if (m.kind === 'surface') { const g = surfaceGroupFor(m.label); const n = reading?.surfaces.filter((s) => surfaceGroupFor(s.label) === g).length ?? 0; setMode('surfaces'); setSurfSel(n > 1 ? { kind: 'group', group: g } : { kind: 'label', key: m.label.toLowerCase() }) }
    else { setMode('furniture'); setFurnSel(normFurnitureKey(m.label)) }
    if (narrow) setTray(true)
  }
  /* (UX audit V5) every pick still waiting for Generate stays on the photo, washed in its own colour, while the studio picks the next — the
     surfaces' finishes and the pieces' new colours, not the one lit (its highlight wears its own) */
  const washItems = !reading || !imageUrl || sketch || markersHidden || compare.on || hereRun || placing || pinning || (mode !== 'surfaces' && mode !== 'furniture') ? [] : waitingWash({ reading, pending, resolve, scopeIds })
  const lightOn = lightingSet(pending.lighting.knobs, pending.lighting.presetId, pending.lighting.instruction)
  const relit = pending.lighting.presetId && (unlit?.key ?? viewKey) === ORIGINAL && !pending.lighting.instruction.trim() && JSON.stringify(presetById(pending.lighting.presetId)?.knobs) === JSON.stringify(pending.lighting.knobs) ? sample?.relit?.[pending.lighting.presetId] ?? null : null
  /* (F030 · F024 · F177 · F188) the lit region, the waiting washes and the light's live preview */
  const { highlight, wash, preview } = useStageLayers({ imageUrl, lightUrl, scope, reading, photoUrl: room?.imageUrl ?? null, finishes, sampleKey: room?.sampleKey ?? null, quiet: compare.on || !!hereRun, wash: washItems,
                                                       lighting: { on: mode === 'lighting' && lightOn, knobs: pending.lighting.knobs, relit } })

  /* compare: the version on screen over its parent (the nearest live one, F082), or the one picked from the strip */
  const defaultBefore = view ? beforeKeyOf(view, all) : ORIGINAL
  const compareKey = compare.on && view ? compare.key ?? defaultBefore : null
  const beforeV = compareKey && compareKey !== ORIGINAL ? live.find((v) => v.key === compareKey) ?? null : null
  const beforeUrl = compareKey ? (beforeV ? urlOf(beforeV) : room?.imageUrl ?? null) : null
  const stageCompare = view && compareKey && beforeUrl ? { before: beforeUrl, beforeLabel: beforeV ? `V${beforeV.n}` : 'Original', afterLabel: `V${view.n}` } : null

  /* pins on the version on screen (Q-15) */
  const vPins = view ? data.pins.filter((p) => p.key === view.key) : []
  /* (F162) a pin's card gives the keyboard back to where it came from when it closes (Cancel, Esc, Close): the pin's marker, the photo,
     a new pin's own marker after Pin it, the Pin toggle after Remove — only when the focus was left on nothing */
  const pinBack = useRef<{ kind: 'el'; el: HTMLElement } | { kind: 'pin'; id: string } | { kind: 'toggle' } | null>(null)
  const pinIds = useRef<string[]>([])
  useEffect(() => { pinIds.current = vPins.map((p) => p.id) })
  const openerFor = (): typeof pinBack.current => {
    const a = document.activeElement
    return a instanceof HTMLElement && a !== document.body && rootRef.current?.contains(a) ? { kind: 'el', el: a } : { kind: 'toggle' }
  }
  const pinCardOpen = !!draftPin || !!activePin
  const pinCardWas = useRef(pinCardOpen)
  useEffect(() => {
    const was = pinCardWas.current
    pinCardWas.current = pinCardOpen
    if (!was || pinCardOpen) return
    const back = pinBack.current ?? { kind: 'toggle' as const }
    pinBack.current = null
    const t = requestAnimationFrame(() => {
      const root = rootRef.current, a = document.activeElement
      /* (tablet-1) a new pin's thread gives the keyboard to the new pin, even when the card handed it back to the photo it was drafted on */
      const onPhoto = back.kind === 'pin' && !!a?.closest('[data-pin-bounds]') && !a.closest('[data-testid="viz-pin"]')
      if (!root || (a && a !== document.body && root.contains(a) && !onPhoto)) return
      const el = back.kind === 'el' ? (back.el.isConnected ? back.el : root.querySelector<HTMLElement>('[data-testid="viz-pin-toggle"]'))
        : back.kind === 'pin' ? root.querySelectorAll<HTMLElement>('[data-testid="viz-pin"]')[pinIds.current.indexOf(back.id)] ?? null
          : root.querySelector<HTMLElement>('[data-testid="viz-pin-toggle"]')
      el?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(t)
  }, [pinCardOpen])
  /* (tablet-6 · tablet-18 · F162) Pin, place and draw end without dropping the keyboard: the photo stops being a stop as its mode ends,
     so a keyboard left on it (or on nothing) goes back to what started the mode — the pin toggle, the button that asked for the place or
     the outline (else the panel's own Add, else the mode's tab). */
  const modeKind: 'pin' | 'place' | null = placing ? 'place' : pinning ? 'pin' : null
  const modeWas = useRef<'pin' | 'place' | null>(null)
  const modeOpener = useRef<HTMLElement | null>(null)
  /* (round 3) the button that opened Add a surface / Add furniture — a mode started from inside that dialog (Trace its outline, Tap where it
     is) began with the focus in the dialog, outside the editor, so this is where the keyboard goes back to when the mode ends */
  const addOpener = useRef<HTMLElement | null>(null)
  const rememberAddOpener = () => { const a = document.activeElement; addOpener.current = a instanceof HTMLElement && rootRef.current?.contains(a) ? a : null }
  useEffect(() => {
    const was = modeWas.current
    modeWas.current = modeKind
    if (modeKind === was) return
    if (modeKind) {
      const a = document.activeElement
      /* (round 3) the Add a surface / Add furniture dialog renders inside the editor — a field in it is never what started the mode (it is gone
         by Esc); the button that opened the dialog is */
      if (!was) { modeOpener.current = (a instanceof HTMLElement && a !== document.body && rootRef.current?.contains(a) && !a.closest('[data-pin-bounds]') && !a.closest('[role="dialog"], [aria-modal="true"]') ? a : null) ?? addOpener.current; addOpener.current = null }
      return
    }
    const opener = modeOpener.current
    modeOpener.current = null
    const t = requestAnimationFrame(() => {
      const root = rootRef.current, a = document.activeElement
      if (!root || (a && a !== document.body && (!root.contains(a) || !a.closest('[data-pin-bounds]') || a.closest('[data-testid="viz-pin"]')))) return
      const el = opener?.isConnected ? opener
        : was === 'pin' ? root.querySelector<HTMLElement>('[data-testid="viz-pin-toggle"]')
          : root.querySelector<HTMLElement>('button[aria-label="Add a surface"]:not(:disabled), button[aria-label="Add furniture"]:not(:disabled)') ?? root.querySelector<HTMLElement>('[role="tablist"] [aria-selected="true"]')
      el?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(t)
  }, [modeKind])
  const stageMode: StageMode = placing?.kind === 'place' ? { kind: 'place', label: placing.label, onPlace: (p) => { setPlacing(null); placing.add(p) }, onCancel: () => setPlacing(null) }
    : placing?.kind === 'draw' ? { kind: 'draw', label: placing.label, onDone: (poly) => { setPlacing(null); placing.done(poly) }, onCancel: () => setPlacing(null) }
    : pinning && view && !readOnly ? { kind: 'pin', onAdd: (p) => { if (!draftPin && !activePin) pinBack.current = openerFor(); setActivePin(null); setNotesFor(null); setDraftPin(p) }, onCancel: () => { setPinning(false); setDraftPin(null) }, drafting: !!draftPin } : { kind: 'view' }

  /* the strip's badges: the client's favourite and notes, pins, sent */
  const badges: Record<string, Badge> = {}
  const badge = (k: string) => (badges[k] ??= { favourite: false, pins: 0, shared: false, notes: 0 })
  for (const s of data.shares) {
    if (!s.revokedAt) for (const k of s.keys) badge(k).shared = true
    const fav = [...s.responses].reverse().find((r) => r.kind === 'favourite')
    if (fav?.versionKey) badge(fav.versionKey).favourite = true
    for (const r of s.responses) if (r.kind === 'note' && r.versionKey) badge(r.versionKey).notes++
  }
  for (const p of data.pins) if (p.status === 'open') badge(p.key).pins++

  /* ── (UX audit V1) From the client: the notes left on a version, each with the studio's replies ── */
  const clientFirst = data.lead?.name.split(' ')[0] ?? 'the client'
  const answers = data.shares.flatMap((sh) => sh.responses)
  const notesOf = (key: string): ClientNote[] => answers.filter((r) => r.kind === 'note' && r.versionKey === key && !!r.message).sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({ id: r.id, who: r.clientName ?? 'Your client', body: r.message!, at: r.createdAt,
      replies: answers.filter((x) => x.kind === 'reply' && x.replyTo === r.id && !!x.message).sort((a, b) => a.createdAt - b.createdAt).map((x) => ({ id: x.id, who: x.clientName ?? data.studio.name, body: x.message!, at: x.createdAt })) }))
  const openNotes = (key: string) => {
    if (notesFor === key && viewKey === key) { setNotesFor(null); return }
    setPinning(false); setDraftPin(null); setActivePin(null); setCompare({ on: false, key: null }); setView(key); setNotesFor(key)
    if (narrow) setTray(false)
  }
  const replyNote = async (notes: ClientNote[], body: string): Promise<boolean> => {
    const last = notes[notes.length - 1]; if (!last) return false
    const r = await replyToNote(last.id, { body }).catch(() => ({ error: 'Couldn’t send the reply — please try again' }))
    if ('error' in r) { snack({ message: r.error.startsWith('Couldn’t') ? r.error : `Couldn’t send the reply — ${r.error.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}` }); return false }
    router.refresh()
    snack({ message: `${clientFirst === 'the client' ? 'The client sees' : `${clientFirst} sees`} your reply on the link` })
    return true
  }

  /** (F210) An action with nothing on screen to show for it: on a refusal the change goes back and the snackbar says what failed. */
  const act = async (p: Promise<unknown>, what: string, o: { rollback?: () => void; done?: () => void } = {}): Promise<boolean> => {
    const r: unknown = await p.catch(() => ({ error: `Couldn’t ${what} — please try again` }))
    const error = r && typeof r === 'object' && 'error' in r && typeof r.error === 'string' ? r.error : null
    if (error) { o.rollback?.(); snack({ message: error.startsWith('Couldn’t') ? error : `Couldn’t ${what} — ${error.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}` }); return false }
    router.refresh(); o.done?.()
    return true
  }

  /* ── the picks (each a step ⌘Z takes back) and adding what the photo missed (1.0's + / draw / tap) — components/visualizer/editor/
     room-session.ts, the code the website's trial runs too (pending modules S36) ── */
  const pushRecent = (id: string) => setRecent((r) => { const next = [id, ...r.filter((x) => x !== id)].slice(0, 12); try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* private window */ } return next })
  const { undoFrom, pickMaterial, pickPiece, recolourToMatch, clearAll, forget, clearSlot, pickStyle, startDraw, addSurfaceLike, addPieceLike, placeNamed } = useRoomEdits({
    roomId, viewKey, imageUrl, reading, pending, finishes, style, ed, patch, patchDetection, resolve, snack, pushRecent, setMode, setSurfSel, setFurnSel, setPlacing,
    closeTray: () => { if (narrow) setTray(false) }, setRunError,
  })
  /** (pending modules S20) the first Replace waiting — the Generate bar's reason names it, with the one press */
  const heldReplace = reading ? Object.entries(pending.furniture).filter(([, f]) => f.action === 'replace' && pickReady(f)).map(([id]) => reading.furniture.find((x) => x.id === id)).find(Boolean) ?? null : null
  const changes: Change[] = changeItems.map((c) => ({ id: c.id, label: c.label, needs: c.needs ?? null, onRemove: () => clearSlot(c.slot, c.ids) }))
  /* (F197 · critic 13) the tabs' dots count what the list counts — what Generate would lay: never a pick whose material is gone, or one
     on a surface this picture doesn't have (F022); (fresh-phone 7) a typed note is counted in "n changes", not on the Tools tab */
  const marks: Record<Mode, boolean> = {
    surfaces: changeItems.some((c) => c.slot === 'materials'),
    furniture: changeItems.some((c) => c.slot === 'furniture'),
    style: !!pending.style || pending.transfer.refs.length > 0,
    lighting: lightOn,
    tools: !!pending.tool,
  }
  /* ── adding what the photo missed: the dialogs that name it (the marking itself is useRoomEdits') ── */
  const [addItem, setAddItem] = useState<'surface' | 'furniture' | null>(null)
  /** (F042) the pen and *Draw a surface* open Add a surface with Trace as its first way */
  const [addPrefer, setAddPrefer] = useState<'place' | 'draw'>('place')
  const addSurface = (prefer: 'place' | 'draw') => { rememberAddOpener(); setAddPrefer(prefer); setAddItem('surface') }

  /* ── files: a room photo, a swatch, a reference, a piece's photo ── */
  const photoInput = useRef<HTMLInputElement>(null)
  const swatchInput = useRef<HTMLInputElement>(null)
  const refInput = useRef<HTMLInputElement>(null)
  const pieceInput = useRef<HTMLInputElement>(null)
  const pieceFor = useRef<string[]>([])
  /* (critic 19 · pending modules S20) what the device hands over, and a picked picture redrawn as a JPEG (HEIC on every browser) —
     room-session.ts, shared with the website's trial */
  const { okPhoto, readPicture } = usePictureReader()
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [roomBusy, setRoomBusy] = useState(false)
  const [awaitRoom, setAwaitRoom] = useState<string | null>(null)
  if (awaitRoom && rooms.some((r) => r.id === awaitRoom)) { setRoomPick(awaitRoom); setAwaitRoom(null); setRoomBusy(false); setAddRoomOpen(false); setMode('surfaces'); setTray(false) }
  const landRoom = (r: { roomId: string } | { error: string }) => {
    if ('error' in r) { snack({ message: r.error }); setRoomBusy(false); return }
    setAwaitRoom(r.roomId); router.refresh()
  }
  const tooBig = (e: unknown) => /body|size|limit|413/i.test(e instanceof Error ? e.message : String(e))
  const addPhotoRoom = async (f: File, sourceFileId: string | null = null, name?: string) => {
    if (!okPhoto(f)) return
    setRoomBusy(true)
    try {
      const url = await readPicture(f, 1600); if (!url) { setRoomBusy(false); return }
      const detection = fallbackDetection(fallbackDots(await loadImg(url)))
      landRoom(await addRoom(data.design.id, { imageUrl: url, detection, sourceFileId, name: name ?? roomNameFromFile(f.name) ?? undefined }))
    } catch (e) { snack({ message: tooBig(e) ? 'That photo is over 10 MB — try a smaller one' : 'Couldn’t read that photo — please try another' }); setRoomBusy(false) }
  }
  /* (critic 19) several photos dropped at once: a room each, in order; the editor lands on the first */
  const addPhotoRooms = async (files: File[]) => {
    const good = files.filter(okPhoto); if (!good.length) return
    setRoomBusy(true)
    let first: string | null = null, failed = 0
    for (const f of good) {
      try {
        const url = await readPicture(f, 1600); if (!url) { failed++; continue }
        const r = await addRoom(data.design.id, { imageUrl: url, detection: fallbackDetection(fallbackDots(await loadImg(url))), name: roomNameFromFile(f.name) ?? undefined })
        if ('error' in r) failed++; else first ??= r.roomId
      } catch { failed++ }
    }
    if (!first) { snack({ message: 'Couldn’t add those photos — please try again' }); setRoomBusy(false); return }
    if (failed) snack({ message: `${good.length - failed} of ${good.length} rooms added — the others couldn’t be read` })
    landRoom({ roomId: first })
  }
  /* (REG-735) Photos picked on the landing's welcome ("Upload a room photo") arrive with this new design: each becomes a room, through the
     same path as a pick here. Once, on arrival — a reload in between lands on "Add the first room". (UX audit V2) A welcome upload makes a
     personal design; the editor asks, quietly, whether it is for a lead ("For a lead? Link it"). */
  const [linkAsk, setLinkAsk] = useState(false)
  useEffect(() => {
    const files = takePhotos(data.design.id)
    if (!files?.length) return
    queueMicrotask(() => { if (!data.lead) setLinkAsk(true); if (files.length > 1) void addPhotoRooms(files); else void addPhotoRoom(files[0]!) })
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps -- once, on arrival
  /* ── (UX audit V2) Link to a lead: a personal design becomes the lead's — Save to Files, Add to a quote, the client's answers reach it ── */
  const [linkOpen, setLinkOpen] = useState(false)
  const loadLinkable = useCallback(async (): Promise<PickOption[]> => (await leadsToLink()).map((l) => ({ id: l.id, label: l.name, sub: [l.stage, l.propertyType, l.blocked].filter(Boolean).join(' · '), blocked: l.blocked ?? undefined })), [])
  const linking = useRef(false)   // one press links once
  const linkTo = async (leadId: string) => {
    if (linking.current) return
    linking.current = true
    const r = await linkDesignToLead(data.design.id, leadId).catch(() => ({ error: 'Couldn’t link the design — please try again' })).finally(() => { linking.current = false })
    if ('error' in r) { snack({ message: r.error.startsWith('Couldn’t') ? r.error : `Couldn’t link the design — ${r.error.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}` }); return }
    setLinkOpen(false); setLinkAsk(false); router.refresh()
    snack({ message: `Linked to ${r.leadName}`, actionLabel: 'Undo', onAction: () => { void act(unlinkDesign(data.design.id, r.undo), 'undo the link', { done: () => snack({ message: 'Back to a design of the studio’s own' }) }) } })
  }
  const addSampleRoom = async (key: string, asSketch: boolean) => { setRoomBusy(true); landRoom(await addRoom(data.design.id, { imageUrl: '', sampleKey: key, asSketch }).catch(() => ({ error: 'Couldn’t add the room — please try again' }))) }
  const addLeadFileRoom = async (f: { id: string; name: string; url: string }) => {
    const s = sampleByImage(f.url)
    if (s) { setRoomBusy(true); landRoom(await addRoom(data.design.id, { imageUrl: '', sampleKey: s.key, sourceFileId: f.id, name: roomNameFromFile(f.name) ?? undefined, asSketch: s.sketch === f.url }).catch(() => ({ error: 'Couldn’t add the room — please try again' }))); return }
    try {
      setRoomBusy(true)
      const blob = await (await fetch(f.url)).blob()
      await addPhotoRoom(new File([blob], f.name, { type: blob.type || 'image/jpeg' }), f.id, roomNameFromFile(f.name) ?? undefined)
    } catch { snack({ message: 'Couldn’t open that file — please try another' }); setRoomBusy(false) }
  }
  /* (F090) a new photo for a room with no versions yet — with Undo, which puts the old photo and its picks back */
  const changePhoto = async (f: File) => {
    if (!roomId || !okPhoto(f)) return
    const id = roomId
    try {
      const url = await readPicture(f, 1600); if (!url) return
      const d = fallbackDetection(fallbackDots(await loadImg(url)))
      await ed.flush()   // the picks as they are now are what Undo brings back
      const r = await setRoomPhoto(id, { imageUrl: url, detection: d })
      if ('error' in r) { snack({ message: r.error }); return }
      ed.reset(id, { detection: d, pending: emptyPending() }, r.stateRev)
      router.refresh()
      snack({ message: 'Photo changed — its surfaces are marked again', actionLabel: 'Undo', onAction: () => {
        void undoRoomPhoto(id).then((u) => {
          if ('error' in u) { snack({ message: u.error }); return }
          ed.reset(id, { detection: u.detection, pending: u.pending }, u.stateRev); router.refresh()
        }).catch(() => snack({ message: 'Couldn’t put the photo back — please try again' }))
      } })
    } catch (e) { snack({ message: tooBig(e) ? 'That photo is over 10 MB — try a smaller one' : 'Couldn’t read that photo — please try another' }) }
  }
  const [swatch, setSwatch] = useState<{ url: string; name: string; hex: string } | null>(null)
  /** (F039) the category the swatch was asked for from (the picker's first) — the dialog starts on it */
  const [swatchCat, setSwatchCat] = useState<string | null>(null)
  const readSwatch = async (f: File) => {
    if (!okPhoto(f)) return
    try { const url = await readPicture(f, 512); if (!url) return; setSwatch({ url, name: fileStem(f.name), hex: dominantColour(await loadImg(url)) }) } catch { snack({ message: 'Couldn’t read that swatch — please try another' }) }
  }
  const saveSwatch = async (m: { name: string; hex: string; finish: string; imageUrl: string | null; category: string }, toStudio: boolean): Promise<boolean> => {
    const ids = scope.filter((s) => !('category' in s)).map((s) => s.id)
    if (toStudio) {
      const r = await createStudioMaterial({ name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: m.imageUrl }).catch(() => ({ error: 'Couldn’t save the material — please try again' }))
      if ('error' in r) { snack({ message: r.error }); return false }
      if (ids.length) pickMaterial(ids, `lib:${r.id}`)
      snack({ message: `${m.name} is in the studio’s materials` })
    } else {
      const r = await saveOwnSwatch(data.design.id, { id: '', name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: m.imageUrl }).catch(() => ({ error: 'Couldn’t save the swatch — please try again' }))
      if ('error' in r) { snack({ message: r.error }); return false }
      if (ids.length) pickMaterial(ids, `own:${r.id}`)
    }
    router.refresh()
    return true
  }
  /* (F197 · F210) a removed swatch takes the picks that pointed at it; Undo brings back both */
  const removeOwn = async (id: string) => {
    const s = data.design.own.find((x) => x.id === id); if (!s) return
    const r = await removeOwnSwatch(data.design.id, id).catch(() => ({ error: 'Couldn’t remove the swatch — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return }
    const mid = `own:${id}`, at = roomId, before = at ? ed.stepNow(at) : 0
    for (const rm of rooms) ed.setPending(rm.id, (p) => { const ids = Object.entries(p.materials).filter(([, m]) => m === mid).map(([k]) => k); return ids.length ? { ...p, materials: omit(p.materials, ids) } : p }, { history: rm.id === at })
    router.refresh()
    snack({ message: `${s.name} removed`, actionLabel: 'Undo', onAction: () => { void act(restoreOwnSwatch(data.design.id, id), 'bring back the swatch', { done: () => { if (at) ed.undoStep(at, before) } }) } })
  }
  /* (F189 · F200 · F057) a reference: its board's colours without the page, kept in the room's store (the picks hold its address) */
  const addReference = async (f: File) => {
    if (!roomId || !okPhoto(f)) return
    if (pending.transfer.refs.length >= MAX_REFERENCES) { snack({ message: `Up to ${MAX_REFERENCES} references` }); return }
    const id = roomId
    try {
      const data64 = await readPicture(f, 900); if (!data64) return
      const palette = referencePalette(await loadImg(data64)).map((x) => x.hex)
      const kept = await saveRoomAsset(id, { dataUrl: data64 }).catch(() => ({ error: 'Couldn’t keep that image — please try again' }))
      if ('error' in kept) { snack({ message: kept.error }); return }
      const hadStyle = pending.style, before = ed.stepNow(id)
      patch((p) => ({ ...p, transfer: { ...p.transfer, refs: [...p.transfer.refs, { id: newId('r'), url: kept.url, role: (p.transfer.refs.length ? 'palette' : 'overall') as ReferenceRole, palette }].slice(0, MAX_REFERENCES) } }))
      if (hadStyle) {
        patch((p) => ({ ...p, style: '' }))
        snack({ key: UNDO_KEY, message: `${hadStyle} taken off — the reference sets the look`, actionLabel: 'Undo', onAction: () => undoFrom(id, before + 1) })
      }
    } catch { snack({ message: 'Couldn’t read that image — please try another' }) }
  }
  const addPiecePhoto = async (f: File) => {
    const ids = pieceFor.current; if (!ids.length || !roomId || !okPhoto(f)) return
    try {
      const data64 = await readPicture(f, 600); if (!data64) return
      const kept = await saveRoomAsset(roomId, { dataUrl: data64 }).catch(() => ({ error: 'Couldn’t keep that photo — please try again' }))
      if ('error' in kept) { snack({ message: kept.error }); return }
      patch((p) => ({ ...p, furniture: { ...p.furniture, ...Object.fromEntries(ids.map((id) => [id, { ...(p.furniture[id] ?? KEEP), action: 'replace' as const, refImage: kept.url }])) } }))
    } catch { snack({ message: 'Couldn’t read that photo — please try another' }) }
  }

  /* ── out of the editor (F041 · F073 · F201: what waits is saved first; a failed save says so instead of leaving quietly) ── */
  const leave = async (href: string) => {
    const ok = await ed.flush()
    if (!ok) { snack({ message: 'Couldn’t save your changes', actionLabel: 'Leave anyway', onAction: () => router.push(href) }); return }
    router.push(href)
  }
  const [share, setShare] = useState<string[] | null>(null)
  const [present, setPresent] = useState<string | null>(null)
  const [board, setBoard] = useState<string | null>(null)
  /* (round 3) Present and the moodboard fill the screen — a "ready" snackbar raised before they opened would sit on their corner */
  const dismissSnack = useSnackbarDismiss()
  useEffect(() => { if (present || board) dismissSnack('viz-ready') }, [present, board, dismissSnack])
  const [quoteFor, setQuoteFor] = useState<VersionView | null>(null)
  const [rename, setRename] = useState<{ kind: 'room' | 'design'; value: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  /** The Maison AI button (the house FAB takes no ref) — found once the frame is drawn: its own press toggles the sheet. */
  const fabRef = useRef<HTMLElement | null>(null)
  useEffect(() => { fabRef.current = rootRef.current?.querySelector<HTMLElement>('button[aria-label="Maison AI"]') ?? null })
  const [menu, setMenu] = useState<Menu>(null)
  const menuAnchor = useRef<HTMLElement | null>(null)
  const openMenu = (m: NonNullable<Menu>, el: HTMLElement) => { menuAnchor.current = el; setMenu(m) }
  /* (REG-719) a room's ⋯ sits in its own chip: pressing it on another room picks that room, and the menu (which acts on the picked room) is its */
  const openRoomMenu = (id: string, el: HTMLElement) => { if (id !== roomId) { setRoomPick(id); setTray(false) } openMenu({ kind: 'room' }, el) }
  const versionOf = (key: string) => all.find((v) => v.key === key) ?? null
  const download = (key: string) => {
    const v = key === ORIGINAL ? null : versionOf(key)
    const url = v ? urlOf(v) : room?.imageUrl
    if (!url || !room) return
    const a = document.createElement('a')
    a.href = url; a.download = v ? renderFileName(room.name, v.n) : originalFileName(room.name)
    document.body.appendChild(a); a.click(); a.remove()
  }
  const toFiles = async (v: VersionView) => {
    const r = await saveVersionToFiles(v.jobId, v.variantId).catch(() => ({ error: 'Couldn’t save to Files — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return }
    snack({ message: r.existed ? `V${v.n} is already in Files › Renders` : `V${v.n} saved to Files › Renders`, actionLabel: 'Open', onAction: () => { void leave(withFrom(`/leads/${r.leadId}/files/${r.fileId}`, here())) } })
  }
  const flagDeleted = (rid: string, key: string, deleted: boolean) => ed.setVersions((prev) => ({ ...prev, [rid]: (prev[rid] ?? []).map((x) => (x.key === key ? { ...x, deleted } : x)) }))
  /* (F077) a version the client has seen or answered is deleted after a named ask; any other at once, with Undo */
  const [confirmVersion, setConfirmVersion] = useState<VersionView | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const askRemoveVersion = (v: VersionView) => { if (carriesClientInput(badges[v.key])) setConfirmVersion(v); else void removeVersion(v) }
  const bringBack = async (v: VersionView): Promise<boolean> => {
    if (!roomId) return false
    const rid = roomId
    flagDeleted(rid, v.key, false)
    return act(restoreVersion(v.jobId, v.variantId), `bring back V${v.n}`, { rollback: () => flagDeleted(rid, v.key, true) })
  }
  /* (versions-menus 10) from Deleted versions: the restore says so, and the dialog closes once nothing is left in it */
  const restoreFromDialog = async (v: VersionView): Promise<boolean> => {
    const last = all.filter((x) => x.deleted && x.key !== v.key).length === 0
    const ok = await bringBack(v)
    /* (audit 2026-09-26) while others remain, the dialog says it in place — a snackbar would land over the dialog; (surfaces-23) the last
       one closes it, and the keyboard lands on the version brought back (the dialog's own opener, "n deleted", has gone) */
    if (ok && last) { tileFocus.current = v.key; setDeletedOpen(false); snack({ message: `V${v.n} restored` }) }
    return ok
  }
  const removeVersion = async (v: VersionView) => {
    if (!roomId) return
    const rid = roomId
    /* (surfaces-23) the keyboard moves on to the tile beside it — the next, else the one before — never back to the page */
    const keys = stripKeys(), at = keys.indexOf(v.key)
    tileFocus.current = keys[at + 1] ?? keys[at - 1] ?? null
    flagDeleted(rid, v.key, true)
    const r = await deleteVersion(v.jobId, v.variantId).catch(() => ({ error: 'Couldn’t delete the version — please try again' }))
    if ('error' in r) { flagDeleted(rid, v.key, false); snack({ message: r.error }); return }
    router.refresh()
    snack({ key: 'viz-version-deleted', message: `V${v.n} deleted`, actionLabel: 'Undo', onAction: () => { void bringBack(v) } })
  }
  const removeRoom = async () => {
    if (!room) return
    const r0 = room
    const r = await deleteRoom(r0.id).catch(() => ({ error: 'Couldn’t delete the room — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return }
    router.refresh()
    snack({ message: `${r0.name} deleted`, actionLabel: 'Undo', onAction: () => { void act(restoreRoom(r0.id), `bring back ${r0.name}`, { done: () => setRoomPick(r0.id) }) } })
  }
  /* (F083 · fresh-desktop 18) the name's rules in the field, as it is typed — a long name is never cut quietly, a taken one names the room
     as it is spelled; the server says the same as the backstop */
  const renameLimit = rename?.kind === 'room' ? 60 : 80
  const renameName = rename?.value.replace(/\s+/g, ' ').trim() ?? ''
  const renameTaken = rename?.kind === 'room' && room ? rooms.find((r) => r.id !== room.id && r.name.toLowerCase() === renameName.toLowerCase()) ?? null : null
  const renameError = !rename ? null : renameName.length > renameLimit ? `Keep the ${rename.kind === 'room' ? 'room’s' : 'design’s'} name to ${renameLimit} characters`
    : renameTaken ? `There’s already a room called ${renameTaken.name}` : null
  const saveRename = async () => {
    if (!rename || renameError) return
    const name = renameName; if (!name) return
    if (rename.kind === 'room' && room) {
      ed.setRooms((rs) => rs.map((r) => (r.id === room.id ? { ...r, name } : r)))
      const r = await renameRoom(room.id, name).catch(() => ({ error: 'Couldn’t rename the room — please try again' }))
      if ('error' in r) { snack({ message: r.error }); ed.setRooms((rs) => rs.map((x) => (x.id === room.id ? { ...x, name: room.name } : x))); return }
    } else {
      const r = await renameDesign(data.design.id, name).catch(() => ({ error: 'Couldn’t rename the design — please try again' }))
      if ('error' in r) { snack({ message: r.error }); return }
    }
    setRename(null); router.refresh()
  }
  /* (F085) the gallery raises "… deleted · Undo" on arrival (the REG-634 hand-off); a lead page gets there without it */
  const removeDesign = async () => {
    const r = await deleteDesigns([data.design.id]).catch(() => ({ error: 'Couldn’t delete the design — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return }
    const u = new URL(back, 'http://x')
    if (u.pathname === '/visualizer') u.searchParams.set('deleted', data.design.id)
    router.push(`${u.pathname}${u.search}`)
  }
  const addToQuote = async (quoteId: string | 'new', again = false) => {
    const v = quoteFor; if (!v) return
    const r = await addVersionToQuote(v.jobId, v.variantId, quoteId, again).catch(() => ({ error: 'Couldn’t add to the quote — please try again' }))
    if ('error' in r) {
      if (/already in that quote/i.test(r.error)) snack({ message: r.error, actionLabel: 'Add again', onAction: () => { void addToQuote(quoteId, true) } })
      else snack({ message: r.error })
      return
    }
    setQuoteFor(null); router.refresh()
    /* (desktop-9) one line: what went in and what waits for a measure — the dialog said where the prices come from; "Open", as Save to
       Files' snackbar says it, so the line never wraps */
    snack({ message: `${r.lines} ${r.lines === 1 ? 'line' : 'lines'} added${r.quantityless ? ` · ${r.quantityless} to measure` : ''}`, actionLabel: 'Open', onAction: () => { void leave(withFrom(`/quotes/${r.quoteId}`, here())) } })
  }

  /* ── pins ── */
  const savePin = async (body: string): Promise<boolean> => {
    if (!view || !draftPin) return false
    const r = await addPin(view.jobId, view.variantId, draftPin.x, draftPin.y, body).catch(() => ({ error: 'Couldn’t pin it — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return false }
    pinBack.current = { kind: 'pin', id: r.id }
    setDraftPin(null); setActivePin(r.id); router.refresh()
    return true
  }
  const reply = async (pin: Pin, body: string) => { const r = await replyPin(pin.id, body).catch(() => ({ error: 'Couldn’t send the reply — please try again' })); if ('error' in r) { snack({ message: r.error }); return false } router.refresh(); return true }
  const removePin = async (pin: Pin) => {
    const r = await deletePin(pin.id).catch(() => ({ error: 'Couldn’t remove the pin — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return }
    pinBack.current = { kind: 'toggle' }
    setActivePin(null); router.refresh()
    snack({ message: 'Pin removed', actionLabel: 'Undo', onAction: () => { void act(restorePin(pin.id), 'bring back the pin') } })
  }

  /* (UX audit V4) the fresh version's Compare, opened from "V3 is ready", closes on the next step: Share it with the client */
  const shareOk = !readOnly && !leadClosed && !leadDeleted
  const askShare = () => {
    const k = shareAsk; setShareAsk(null)
    const v = k ? live.find((x) => x.key === k) : null
    if (!v || !shareOk) return
    snack({ key: 'viz-ready', message: `Share V${v.n} with ${clientFirst}?`, actionLabel: 'Share', onAction: () => { setBoard(null); setPresent(null); setShare([v.key]) } })
  }
  const endCompare = () => { setCompare({ on: false, key: null }); askShare() }
  /* ── keys: ⌘Z / ⇧⌘Z, Esc, ← → through the versions ── */
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if (document.querySelector('[aria-modal="true"]')) return
      /* (F061) a slider, a switch or a button keeps ⌘Z for the room; only text entry keeps its own undo */
      const textEntry = typing && !(t instanceof HTMLInputElement && /^(range|checkbox|radio|button)$/.test(t.type))
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !textEntry) { e.preventDefault(); if (!roomId) return; if (e.shiftKey) ed.redo(roomId); else ed.undo(roomId); return }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y' && !textEntry) { e.preventDefault(); if (roomId) ed.redo(roomId); return }   // (REG-714) ⌘Y redoes, as in the other editors
      if (typing) return
      if (e.key === 'Escape') {
        if (placing) { setPlacing(null); return }
        if (draftPin) { setDraftPin(null); return }
        if (activePin) { setActivePin(null); return }
        if (notesFor) { setNotesFor(null); return }
        if (pinning) { setPinning(false); return }
        if (compare.on) { endCompare(); return }
        if (surfSel || furnSel) { setSurfSel(null); setFurnSel(null); return }
        if (tray) setTray(false)
        return
      }
      /* (F081) the arrows walk the versions — never behind an open menu */
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !menu && !e.metaKey && !e.ctrlKey && !e.altKey && !(t?.closest?.('[role="slider"], [role="tablist"], [role="radiogroup"], [role="listbox"], [role="menu"]'))) {
        /* (surfaces-22) from a tile in the strip the arrows step from that tile and the keyboard goes with the version shown (a roving
           list) — never two rings, one of them left behind */
        const keys = stripKeys(), tiles = stripTiles(), from = t?.closest('[role="listitem"]')?.querySelector<HTMLElement>('[data-testid="viz-version"]') ?? null
        const fromTile = from ? tiles.indexOf(from) : -1
        const i = fromTile >= 0 ? fromTile : keys.indexOf(viewKey), j = e.key === 'ArrowLeft' ? i - 1 : i + 1
        if (keys[j]) { e.preventDefault(); if (fromTile >= 0) tileFocus.current = keys[j]!; setView(keys[j]!) }
      }
    }
  })
  useEffect(() => { const on = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on) }, [])

  /* the address carries the room (a link to it opens it); what the link asked for on arrival (a file, a version, a pin) is spent */
  /* (fresh-tablet 3) through Next's own history (state null), so a router.refresh() after an action keeps the room in the address; and
     again whenever the address loses it */
  const urlRoom = useSearchParams().get('room')
  useEffect(() => {
    if (!roomId) return
    const u = new URL(window.location.href)
    const spent = ['file', 'v', 'version', 'pin', 'note'].filter((k) => u.searchParams.has(k))
    if (u.searchParams.get('room') === roomId && !spent.length) return
    u.searchParams.set('room', roomId); for (const k of spent) u.searchParams.delete(k)
    window.history.replaceState(null, '', `${u.pathname}${u.search}`)
  }, [roomId, urlRoom])
  /* what the link asked for that is gone: one line on arrival */
  useEffect(() => {
    if (!initialNotice) return
    const t = setTimeout(() => snack({ message: initialNotice }), 0)
    return () => clearTimeout(t)
  }, [initialNotice, snack])
  /* (Q-31) Opened from a lead's photo that isn't a room yet: add it on arrival (once). */
  const fileDone = useRef(false)
  const addFileRef = useRef(addLeadFileRoom)
  useEffect(() => { addFileRef.current = addLeadFileRoom })
  useEffect(() => {
    if (!initialFile || fileDone.current || readOnly) return
    const t = setTimeout(() => { if (fileDone.current) return; fileDone.current = true; void addFileRef.current(initialFile) }, 0)
    return () => clearTimeout(t)
  }, [initialFile, readOnly])

  /* ── the panels ── */
  const reshaped = finishes.reshaped
  const baseEdited = view !== null && (Object.keys(finishes.surfaces).length > 0 || finishes.removed.length > 0 || Object.keys(finishes.customized).length > 0 || finishes.emptied)
  const panel: ReactNode = !room || !reading ? null
    : mode === 'surfaces' ? (
      <SurfacesPanel surfaces={reading.surfaces} finishes={finishes.surfaces} pending={pending.materials} resolve={resolve} sel={surfSel} onSelect={setSurfSel} onPick={pickMaterial}
                     style={style} library={data.library} own={data.design.own} recent={recent} onUpload={(c) => { setSwatchCat(c ?? null); swatchInput.current?.click() }} onRemoveOwn={(id) => { void removeOwn(id) }}
                     onAdd={() => addSurface('place')} onDraw={(target) => { if (target) startDraw(target); else addSurface('draw') }}
                     onAddLike={addSurfaceLike}   /* (F023) "another like this" on a drawn surface is drawn too */
                     onForget={(ids) => forget(ids, titleCaseLabel(reading.surfaces.find((s) => s.id === ids[0])?.label ?? 'Surface'))} sketch={sketch} reshaped={reshaped} rough={!room.sampleKey && !sketch && ed.detectionOf(room.id)?.source === 'fallback'} />
    ) : mode === 'furniture' ? (
      <FurniturePanel furniture={reading.furniture} picks={pending.furniture} sel={furnSel} onSelect={setFurnSel} onPick={pickPiece} style={style} tools={tools} customized={finishes.customized}
                      onAdd={() => { rememberAddOpener(); setAddItem('furniture') }} onAddLike={addPieceLike}
                      onForget={(ids) => forget(ids, titleCaseLabel(normFurnitureKey(reading.furniture.find((f) => f.id === ids[0])?.label ?? 'Piece')))}
                      onRefPhoto={(ids) => { pieceFor.current = ids; pieceInput.current?.click() }} onRecolour={(ids) => { void recolourToMatch(ids) }} reshaped={reshaped} />
    ) : mode === 'style' ? (
      <StylePanel looks={sample?.looks ?? null} pending={pending} onStyle={pickStyle} leadName={data.lead?.name ?? null} leadStyle={data.lead?.style ?? null} baseEdited={baseEdited}
                  onAddRef={() => refInput.current?.click()} onPatchTransfer={(fn) => patch((p) => ({ ...p, transfer: fn(p.transfer) }), { coalesce: 'transfer' })} />
    ) : mode === 'lighting' ? (
      <LightingPanel pending={pending} onLighting={(fn, coalesce) => patch((p) => ({ ...p, lighting: fn(p.lighting) }), { coalesce })} advanced={advanced} onAdvanced={setAdvanced} />
    ) : (
      <ToolsPanel pending={pending} onTool={(t) => patch((p) => ({ ...p, tool: t }))} onPatch={(fn, coalesce) => patch(fn, { coalesce })} sketch={sketch} style={style} tools={tools} emptied={emptiedLink}
                  onUseAsPhoto={() => {
                    if (!roomId) return
                    const before = ed.stepNow(roomId)
                    patch((p) => ({ ...p, asPhoto: true }))
                    snack({ key: UNDO_KEY, message: 'Treated as a photo', actionLabel: 'Undo', onAction: () => undoFrom(roomId, before) })
                  }}
                  onDraw={() => addSurface('draw')} />
    )
  const describeBox = (compact: boolean) => <DescribeBox compact={compact} value={pending.note} disabled={readOnly || !room} onChange={(v, c) => patch((p) => ({ ...p, note: v }), { coalesce: c ? 'note' : undefined })} />
  /* the footer speaks for the run in this room (its own busy word, F003); another room's run waits with where it is (F196) */
  const footIntent = hereRun ? { ...intent, busy: hereRun.title } : running ? { ...intent, kind: null, reason: `Rendering in ${running.roomName}…` } : intent
  const shownError = runError && runError.roomId === roomId ? runError.text : null
  /* (REG-704, Q-29) what this Generate costs, before the press — from the one price list, so every number agrees (E-02) */
  const footPrice = ((): FootPrice | null => {
    if (!credits || !credits.provisioned || !footIntent.kind) return null
    const kind = footIntent.kind, many = kind === 'edit' || kind === 'restyle' || kind === 'transfer', n = many ? pending.variants : 1
    const action = renderAction(kind, pending.quality), cost = costOf(action, n)
    const can = spendable(credits)
    let short: string | null = null
    if (can != null && cost > can) {
      const ways = [...(n > 1 && costOf(action, 1) <= can ? ['make 1 version'] : []), ...(pending.quality === 'high' && kind !== 'empty' && costOf(renderAction(kind, 'fast'), n) <= can ? ['pick Fast'] : [])]
      short = `Needs ${fmtCredits(cost)} — you can use ${fmtCredits(can)}${ways.length ? ` · ${ways.join(' or ')}` : ''}`
    }
    return { cost, left: can != null && !short ? can - cost : null, short, per: kind === 'empty' ? null : { fast: costOf('render_fast'), high: costOf('render_pro') }, repair: DRIFT_GUARDED.includes(kind) ? costOf('render_repair') : null }
  })()
  const footer = (compact: boolean) => (
    <GenerateFooter compact={compact} describe={compact ? null : describeBox(false)} changes={changes} onClear={clearAll} intent={footIntent} variants={pending.variants} onVariants={(n) => patch((p) => ({ ...p, variants: n }), { history: false })}
                    quality={pending.quality} onQuality={(q) => patch((p) => ({ ...p, quality: q }), { history: false })} onGenerate={() => { void generate() }} busy={!!hereRun} error={shownError} disabled={readOnly} price={footPrice}
                    reasonLink={pending.tool === 'furnish' && emptiedLink && !footIntent.kind ? { text: 'Furnish works on an emptied version —', label: `open V${emptiedLink.n}`, onPress: emptiedLink.onOpen }
                      : heldReplace && !footIntent.kind && footIntent.reason === replaceHeld(heldReplace.label) ? { text: `${replaceHeldLead(heldReplace.label)} —`, label: 'recolour it to match', onPress: () => { const g = normFurnitureKey(heldReplace.label); void recolourToMatch(reading?.furniture.filter((x) => normFurnitureKey(x.label) === g && pending.furniture[x.id]?.action === 'replace').map((x) => x.id) ?? [heldReplace.id]) } }
                      : null} />
  )

  /* ── the canvas' bar ── */
  const parentLabel = view ? (defaultBefore === ORIGINAL ? 'Original' : `V${all.find((v) => v.key === defaultBefore)?.n ?? '?'}`) : null
  /* (F080) Compare and Pin take turns: pins go on the version alone */
  const toggleCompare = () => { if (compare.on) { endCompare(); return } setPinning(false); setDraftPin(null); setActivePin(null); setNotesFor(null); setCompare({ on: true, key: null }) }
  const toolbar = (
    <>
      <Tooltip label={markersHidden ? 'Show markers' : 'Hide markers'}><IconButton icon={markersHidden ? 'visibility' : 'visibility_off'} label={markersHidden ? 'Show markers' : 'Hide markers'} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => setMarkersHidden(!markersHidden)} data-testid="viz-markers" /></Tooltip>
      {/* (the calm UI build 2026-10-27, 6-18 · W-148) one name for one action — the bar's button says "Before and after", as the version's
          ⋮, its tooltip, Present and the ready snackbar's Compare… the tooltip still names what it lays underneath */}
      <Tooltip label={!view ? 'Pick a version to compare' : compare.on ? 'Show it alone' : `Before and after · ${parentLabel}`}>{narrow ? <IconButton icon="compare" label="Before and after" size={36} variant="bare" iconSize={20} iconWeight={300} selected={compare.on} aria-pressed={compare.on} disabled={!view} onClick={toggleCompare} data-testid="viz-compare-toggle" />
        : <button type="button" className={styles.compareBtn} aria-pressed={compare.on} disabled={!view} onClick={toggleCompare} data-testid="viz-compare-toggle"><Icon name="compare" size={20} weight={300} />Before and after</button>}</Tooltip>
      <Tooltip label={!view ? 'Pins go on a version — generate one first' : pinning ? 'Stop pinning' : 'Pin a note on the photo'}><IconButton icon="push_pin" label="Pin a note" size={36} variant="bare" iconSize={20} iconWeight={300} selected={pinning} aria-pressed={pinning} disabled={!view || readOnly} onClick={() => { if (!pinning) setCompare({ on: false, key: null }); setPinning(!pinning); setDraftPin(null); setActivePin(null) }} data-testid="viz-pin-toggle" /></Tooltip>
      <Tooltip label="Present"><IconButton icon="fullscreen" label="Present" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => setPresent(viewKey)} data-testid="viz-present-open" /></Tooltip>
      <Tooltip label="Download"><IconButton icon="download" label="Download" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => download(viewKey)} /></Tooltip>
      {/* (parity map, TD-122) a version of a design on a live project — only then — goes to the project's Messages */}
      {view && room && imageUrl ? <SendToMessages leadId={data.lead?.id ?? null} version={{ jobId: view.jobId, variantId: view.variantId, n: view.n, room: room.name, imageUrl }} /> : null}
    </>
  )
  const activePinRow = activePin ? vPins.find((p) => p.id === activePin) ?? null : null
  const stage = (
    <Stage image={imageUrl} alt={view ? `${room?.name} · V${view.n}` : room?.name ?? ''} compare={stageCompare} preview={preview} highlight={highlight} wash={wash} markers={markers} onDot={onDot} mode={stageMode}
           pins={vPins} activePin={activePin} onPin={(id) => { if (!draftPin && !activePin) pinBack.current = openerFor(); setDraftPin(null); setNotesFor(null); setActivePin((a) => (a === id ? null : id)) }} running={hereRun} onCancelRun={cancelRun} toolbar={toolbar}
           chip={room && !stageCompare ? <span className={styles.stageChip} data-testid="viz-stage-chip">{view ? <><b>V{view.n}</b> · {view.descriptor}</> : <b>Original</b>}</span> : null}
           empty={
             <div className={styles.empty} data-testid="viz-empty">
               <span className={styles.emptyGlyph}><Icon name="add_photo_alternate" size={40} weight={300} /></span>   {/* (REG-729) the house empty glyph: 40 in a 72 well */}
               <h2 className={styles.emptyTitle}>Add the first room</h2>
               <p className={styles.emptyText}>A photo of the room — its surfaces and furniture are marked for you. Then pick finishes, a style or a light, and Generate.</p>
               <div className={styles.emptyOptions}><AddRoomOptions onFile={(f) => { void addPhotoRoom(f) }} onFiles={(fs) => { void addPhotoRooms(fs) }} onLeadFile={(f) => { void addLeadFileRoom(f) }} onSample={(k, s) => { void addSampleRoom(k, s) }} leadImages={data.leadImages} leadName={data.lead?.name ?? null} busy={roomBusy} /></div>
             </div>
           }>
      {activePinRow ? (
        <PinThread pin={activePinRow} index={vPins.indexOf(activePinRow)} now={data.now} onReply={(b) => reply(activePinRow, b)}
                   onStatus={(st) => { void act(setPinStatus(activePinRow.id, st), st === 'resolved' ? 'resolve the pin' : 'reopen the pin') }}
                   onDelete={activePinRow.authorRole === 'studio' ? () => { void removePin(activePinRow) } : null} onClose={() => setActivePin(null)} image={imageUrl} />
      ) : null}
      {draftPin ? <DraftPin x={draftPin.x} y={draftPin.y} onSave={savePin} onCancel={() => setDraftPin(null)} image={imageUrl} /> : null}
      {view && notesFor === view.key && !activePinRow && !draftPin ? (() => { const ns = notesOf(view.key); return ns.length ? (
        <ClientNotes version={`V${view.n} · ${view.descriptor}`} notes={ns} now={now} client={clientFirst} onReply={(b) => replyNote(ns, b)} onClose={() => setNotesFor(null)} />
      ) : null })() : null}
    </Stage>
  )
  const strip = room ? (
    <div className={styles.stripSlot} data-viz-bottom="" data-viz-strip="">
      <VersionsStrip lineage={all} original={room.imageUrl} versions={live.map((v) => (local[v.key] ? { ...v, imageUrl: local[v.key]! } : v))} viewKey={viewKey} compareKey={compareKey} inFlight={hereRun ? hereRun.count : 0} badges={badges}
                     onPick={(k) => { setView(k); if (k === ORIGINAL) setCompare({ on: false, key: null }) }} onMenu={(k, el) => openMenu({ kind: 'version', key: k }, el)} menuFor={menu?.kind === 'version' ? menu.key : null}
                     deleted={all.length - live.length} onDeleted={() => setDeletedOpen(true)} originalSub={effectiveDetection(ed.detectionOf(room.id), pending.asPhoto, NO_FINISHES)?.kind === 'sketch' ? 'the sketch' : 'the photo'}
                     onNotes={openNotes} notesFor={notesFor} />
    </div>
  ) : null
  const mv = menu?.kind === 'version' ? versionOf(menu.key) : null
  /* (the calm UI build 2026-10-27, 6-18) the version whose ⋮ is open is the one on screen — its Share and Download are in view already */
  const mvOnScreen = !!mv && !!view && mv.key === viewKey
  const mvLines = mv && room ? quoteLines(mv, ed.detectionOf(room.id)) : []
  /* (tablet-15) why a version has nothing to quote, in words that say what to do — a whole-room look names no finishes */
  const noQuoteReason = (v: VersionView) => (v.finishes.reshaped ? 'A whole-room look has no finishes to quote — pick finishes on the Original' : 'This version has no finishes to quote')
  /* (E12) the room's rule for Rename and Change photo; when it is Delete room's too (the same words), it is said once, under Delete */
  const roomRule = room?.mayChange ?? null
  const ruleOnce = !!roomRule && roomRule === (room?.mayDelete ?? null)
  const shareRooms = rooms.map((r) => ({ id: r.id, name: r.name, versions: (versions[r.id] ?? []).filter((v) => !v.deleted).map((v) => (local[v.key] ? { ...v, imageUrl: local[v.key]! } : v)) }))
  const anyLive = shareRooms.some((r) => r.versions.length > 0)
  const roomsRowRef = useRoomInView(roomId)
  const roomChips = rooms.length ? (
    <div ref={roomsRowRef} className={styles.roomRailWrap}>
      <ChipRail label="Rooms" className={styles.roomRail}><Chips className={styles.roomChips} label="Rooms" options={rooms.map((r) => ({ value: r.id, label: r.name }))} value={roomId} onChange={(id) => { setRoomPick(id); setTray(false) }} testId="viz-rooms"
        trail={(id, on) => <RoomMore name={rooms.find((r) => r.id === id)?.name ?? ''} on={on} open={on && menu?.kind === 'room'} className={styles.roomMore} onPress={(el) => openRoomMenu(id, el)} />} /></ChipRail>
    </div>
  ) : null

  /* (critic 8) Maison AI speaks about what is on screen.
     (pending modules S10 — card held:maison-ai, "the Visualizer … editors' words-only suggestions · make each act or drop it") Each acts, by rule
     from the design on screen: what is in it and the client's favourite (each a press away), how to take a photo that renders well, the lead's
     style, the version in words (to copy), the style's own finishes for the room's surfaces (each opens Surfaces on it — the studio picks), and
     the WhatsApp to the client (the Share dialog, which drafts it). Nothing is generated and nothing is metered here. *(invented copy)* */
  const leadFirst = data.lead?.name.split(' ')[0] ?? data.lead?.name ?? null
  const openGroup = (group: ReturnType<typeof surfaceGroupFor>) => { setMode('surfaces'); setSurfSel({ kind: 'group', group }); if (narrow) setTray(true) }
  const favourites = Object.entries(badges).filter(([, b]) => b.favourite).map(([k]) => k)
  const versionAt = (key: string) => { for (const r of rooms) { const v = (versions[r.id] ?? []).find((x) => x.key === key && !x.deleted); if (v) return { r, v } } return null }
  const goVersion = (r: { id: string }, key: string) => { setRoomPick(r.id); setViewKeys((v) => ({ ...v, [r.id]: key })) }
  const styleRow = styleByName(style)
  const shareNow = () => setShare(view ? [view.key] : live.slice(-1).map((v) => v.key))
  const aiSuggestions: MaisonSuggestion[] = readOnly ? [
    { label: 'What’s in this design?', answer: { title: `${rooms.length === 1 ? '1 room' : `${rooms.length} rooms`}`, text: 'Each room with its versions — open one to look at it.',
      rows: rooms.map((r) => { const n = (versions[r.id] ?? []).filter((v) => !v.deleted).length; return { id: r.id, label: r.name, meta: n ? `${n === 1 ? '1 version' : `${n} versions`}` : 'No version yet', run: () => setRoomPick(r.id) } }) } },
    { label: 'Which version did the client like?', answer: favourites.length
      ? { title: `${favourites.length === 1 ? '1 favourite' : `${favourites.length} favourites`}`, text: `The version${favourites.length === 1 ? '' : 's'} ${leadFirst ?? 'the client'} hearted on the link.`,
          rows: favourites.flatMap((k) => { const at = versionAt(k); return at ? [{ id: k, label: `V${at.v.n} · ${at.r.name}`, meta: at.v.descriptor, run: () => goVersion(at.r, k) }] : [] }) }
      : { title: 'No favourite yet', text: `When ${leadFirst ?? 'the client'} hearts a version on the link you sent, it shows here.` } },
  ] : !room ? [
    { label: 'Which photo works best?', answer: { title: 'A photo that renders well', text: 'The engine repaints what it can see — the more of the room in good light, the better.',
      rows: [
        { id: 'light', label: 'In daylight, the lights on', meta: 'No harsh sun across the floor' },
        { id: 'corner', label: 'From a corner, at chest height', meta: 'Two walls, the floor and some ceiling in view' },
        { id: 'level', label: 'Held level, not tilted', meta: 'Straight upright lines' },
        { id: 'clear', label: 'Clutter cleared', meta: 'What is in the way gets repainted too' },
        { id: 'add', label: 'Add a room’s photo', run: () => setAddRoomOpen(true) },
      ] } },
    { label: 'Start from the lead’s style', answer: leadStyle
      ? { title: `${leadFirst ?? 'The client'} likes ${leadStyle}`, text: `${styleByName(leadStyle)?.description ?? ''} Add a room’s photo and the Style panel starts on it.`.trim(), rows: [{ id: 'add', label: 'Add a room’s photo', run: () => setAddRoomOpen(true) }] }
      : { title: data.lead ? `No style on ${leadFirst}’s record` : 'No lead on this design', text: data.lead ? 'Set the style on the lead (Edit Lead › Style) and every new design for them starts on it.' : 'Link the design to a lead and it starts on their style.' } },
  ] : [
    view
      ? { label: `Describe V${view.n} for the client`, answer: () => {
          const lines = quoteLines(view, ed.detectionOf(room.id))
          const words = `V${view.n} of the ${room.name.toLowerCase()} — ${view.descriptor}${lines.length ? `: ${lines.map((l) => `${l.what.toLowerCase()} in ${l.to}`).join(', ')}` : ''}.`
          return Promise.resolve({ title: `V${view.n} in words`, text: words, rows: [
            ...lines.slice(0, 8).map((l, i) => ({ id: `l-${i}`, label: `${l.what} · ${l.to}` })),
            { id: 'copy', label: 'Copy these words', meta: 'To paste into a message or a quote', run: () => { void copyText(words).then(() => snack({ message: 'The words are copied' }), () => snack({ message: 'Couldn’t copy the words' })) } },
          ] })
        } }
      : { label: `What would suit the ${room.name.toLowerCase()}?`, answer: styleRow
          ? { title: `${styleRow.name}${leadStyle === styleRow.name && leadFirst ? ` — ${leadFirst}’s style` : ''}`, text: styleRow.description, rows: [{ id: 'style', label: `Open Style on ${styleRow.name}`, run: () => { setMode('style'); if (narrow) setTray(true) } }] }
          : { title: 'Pick a style to start', text: 'The Style panel shows each look on this room — pick one, then Generate.', rows: [{ id: 'style', label: 'Open Style', run: () => { setMode('style'); if (narrow) setTray(true) } }] } },
    /* (pending modules S20 — the S10 note: "applying a pick from the sheet behind the editor's own Undo") the style's own finish for each
       surface group is proposed — what it will pick, one button — and the press picks them all as one step (⌘Z and the snackbar's Undo take
       it back), then opens Surfaces on the first so the studio sees them waiting; nothing renders until Generate. A whole-room look has no
       surfaces marked, and a version's finish already worn is no change: both are said instead. */
    { label: style ? `Suggest ${style} finishes for the ${room.name.toLowerCase()}` : `Suggest finishes for the ${room.name.toLowerCase()}`, propose: () => {
      const st = style || 'Modern'
      const surf = reading?.surfaces ?? []
      const picks = [...new Set(surf.map((x) => surfaceGroupFor(x.label)))].slice(0, 6).flatMap((group) => {
        const ids = surf.filter((x) => surfaceGroupFor(x.label) === group).map((x) => x.id)
        const m = suggestMaterials(group, st, 1)[0] ?? suggestMaterials(surf.find((x) => surfaceGroupFor(x.label) === group)?.label ?? group, st, 1)[0]
        const fresh = m ? ids.filter((id) => finishes.surfaces[id]?.materialId !== m.id) : []
        return m && fresh.length ? [{ group, m, ids: fresh }] : []
      })
      if (!picks.length) return Promise.resolve(surf.length
        ? { title: `The ${room.name.toLowerCase()} already wears ${st}’s finishes`, text: 'Every surface on this version has the style’s own pick — try another style, or Generate a variation.', rows: [{ id: 'style', label: 'Open Style', run: () => { setMode('style'); if (narrow) setTray(true) } }] }
        : { title: 'No surfaces to finish yet', text: finishes.reshaped ? WHOLE_ROOM_UNMARKED : 'The room’s surfaces show once its photo is read — open Surfaces to mark them.', rows: [{ id: 'surfaces', label: 'Open Surfaces', run: () => { setMode('surfaces'); if (narrow) setTray(true) } }] })
      return Promise.resolve({
        title: `${st} finishes for the ${room.name.toLowerCase()}`,
        text: `The style’s own pick for each surface${style ? '' : ' (no style picked yet, so Modern’s)'} — they wait with your other changes; nothing renders until you Generate.`,
        lines: picks.map(({ group, m }) => `${group} · ${m.name}`),
        confirm: picks.length === 1 ? 'Pick this finish' : `Pick these ${picks.length} finishes`,
        run: async () => {
          if (!roomId || readOnly) return false
          const rid = roomId, before = ed.stepNow(rid)
          patch((p) => ({ ...p, materials: { ...p.materials, ...Object.fromEntries(picks.flatMap(({ m, ids }) => ids.map((id) => [id, m.id]))) } }))
          for (const { m } of picks) pushRecent(m.id)
          openGroup(picks[0]!.group)
          snack({ key: UNDO_KEY, message: `${picks.length === 1 ? '1 finish' : `${picks.length} finishes`} picked — ${st}’s`, actionLabel: 'Undo', onAction: () => undoFrom(rid, before) })
          return true
        },
      })
    } },
    !anyLive || readOnly || leadClosed
      ? { label: data.lead ? `Draft the WhatsApp note to ${leadFirst}` : 'Draft a note to go with these versions', answer: { title: 'Nothing to share yet', text: readOnly ? 'This design is deleted.' : leadClosed ? (leadDeleted ? LEAD_DELETED_ROW : LEAD_CLOSED_SHARE) : 'Generate a version first — the note goes with the versions you share.' } }
      : { label: data.lead ? `Draft the WhatsApp note to ${leadFirst}` : 'Draft a note to go with these versions', run: shareNow },
  ]

  /* ── the tray ≤1024 (F173): it rises and settles on the sheet's curve; the rooms and the versions fold away on the same beat ── */
  /* (F173) one thing moves at a time: closing, the tray folds away first and only then do the rooms and the versions unfold (and the
     canvas bar fade back) — `trayLeaving` holds them until the tray's exit is done; reduced motion folds both at once, with no motion */
  const fold = reduce ? { duration: 0 } : { duration: duration.sheetExit, ease: ease.standard }
  const rise = reduce ? { duration: 0 } : { duration: duration.sheet, ease: ease.decelerate }
  const collapse = { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1, transition: rise }, exit: { height: 0, opacity: 0, transition: fold } }
  /* (tablet-2) closing, the rooms and the versions unfold on the tray's own beat (its fold's time and curve), so the stage grows once and
     the photo travels once; the canvas bar still waits for the fold to finish (`trayLeaving`), so its row never squeezes the photo midway */
  const unfold = { ...collapse, animate: { height: 'auto', opacity: 1, transition: fold } }
  const trayShown = narrow && tray && !!room && !readOnly && !!panel
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

  /* (F014 · F089 · F140 · wave E, E1 · phone-tablet 11) Where a snackbar rests in the frame — room-session.ts, shared with the trial */
  useFrameSnackbarPlace(rootRef, short, [narrow, tray, trayUp, roomId, readOnly, hintSeen, rooms.length])

  const conflict = ed.anyConflict
  /* (F019) a design with no rooms yet reads its own time */
  const designAt = Math.max(data.design.updatedAt, data.design.createdAt)
  const touched = ed.save.at ?? lastTouched(data.rooms, data.jobs) ?? (designAt > 0 ? designAt : null)
  const savedLabel = conflict ? 'Changed in another tab' : ed.save.error ? 'Not saved — retrying' : touched ? `Saved ${ago(touched, Math.max(now, touched))}` : null
  const hasRail = !narrow && !!room && !readOnly

  return (
    <div ref={rootRef} className={styles.editor} data-card={(!!notesFor || pinCardOpen) || undefined} data-narrow={narrow || undefined} data-tray={(narrow && tray) || undefined} data-tray-leaving={(narrow && trayLeaving && !tray) || undefined} data-rail={hasRail || undefined} data-short={short || undefined} data-testid="viz-editor">
      {/* (the calm UI build 2026-10-27, 6-08) no "LEAD · MET" chip beside the name — the name and Back say whose it is; what it is
          ("Project · P-2026-001") rides the name's tooltip */}
      <EditorTopbar backLabel={backLabel} onBack={() => { void leave(back) }} title={title} chip={designKindLabel(data.design.kind, data.lead?.stage, data.lead?.projectNumber)} rooms={rooms.map((r) => ({ id: r.id, name: r.name }))} roomId={roomId} onRoom={(id) => setRoomPick(id)}
                    onRoomMenu={openRoomMenu} roomMenuOpen={menu?.kind === 'room'} onAddRoom={() => setAddRoomOpen(true)}
                    saving={!conflict && !ed.save.error && (ed.save.saving || ed.dirty)} savedLabel={savedLabel} savedTone={conflict || ed.save.error ? 'warn' : 'ok'}
                    canUndo={ed.canUndo(roomId)} canRedo={ed.canRedo(roomId)} onUndo={() => { if (roomId) ed.undo(roomId) }} onRedo={() => { if (roomId) ed.redo(roomId) }}
                    onShare={() => setShare(view ? [view.key] : live.slice(-1).map((v) => v.key))} shareDisabled={readOnly ? 'This design is deleted' : leadDeleted ? LEAD_DELETED_ROW : leadClosed ? LEAD_CLOSED_SHARE : anyLive ? null : 'Generate a version first'} onMenu={(el) => openMenu({ kind: 'design' }, el)} menuOpen={menu?.kind === 'design'} compact={narrow} short={short} credits={<CreditsChip />} />
      {readOnly ? (
        <div className={styles.note} data-testid="viz-deleted"><Icon name="delete" size={16} weight={300} />
          {/* (F204) Restore only for who may — anyone else reads who can */}
          {/* (files-13) the sheet's own name, and who may restore it by name as the sheet says it */}
          {data.design.mayChange ? <span className={styles.noteText}>This design is in Deleted Designs — only {maker ?? 'whoever made it'}, an Owner or an Admin can restore it.</span> : <>
            <span className={styles.noteText}>This design is in Deleted Designs — restore it to keep working.</span>
            <Button appearance="text" onPress={() => { void act(restoreDesigns([data.design.id]), 'restore the design', { done: () => snack({ message: `${title} restored` }) }) }}>Restore</Button></>}</div>
      ) : leadDeleted && !conflict ? (
        <div className={styles.note} role="note" data-testid="viz-lead-deleted"><Icon name="delete" size={16} weight={300} />
          <span className={styles.noteText}>{leadDeletedNote(data.lead?.name ?? title)}</span></div>
      ) : conflict ? (
        <div className={styles.note} role="alert" data-tone="warn" data-testid="viz-conflict"><Icon name="error" size={20} weight={300} />
          <span className={styles.noteText}>Changed in another tab — reload to see the latest. Your picks here since then aren’t saved.</span>
          <Button appearance="text" onPress={() => window.location.reload()}>Reload</Button></div>
      ) : linkAsk && !data.lead && !(narrow && tray) ? (
        /* (UX audit V2) right after the welcome's upload lands: is it for a lead? */
        <div className={styles.note} role="note" data-testid="viz-link-ask"><Icon name="person" size={20} weight={300} />
          <span className={styles.noteText}>For a lead? Link this design to it — its versions can then go to the lead’s Files, a quote and the client.</span>
          <Button appearance="text" onPress={() => setLinkOpen(true)}>Link it</Button>
          <Button appearance="text" onPress={() => setLinkAsk(false)}>Not now</Button></div>
      ) : !hintSeen && rooms.length && !(narrow && tray) && !short ? (
        <div className={styles.note} role="note" data-testid="viz-hint"><Icon name="info" size={20} weight={300} />
          <span className={styles.noteText}>{sketch && !view ? 'This is a sketch — pick a style, then Render from sketch to turn it into a photo.'
            : <>{touch ? 'Tap' : 'Click'} a square on the photo to pick its finish, or {narrow ? 'a mode below' : 'choose a style or a light on the right'} — then Generate.</>}</span>
          <Button appearance="text" onPress={() => setHintSeen(true)}>Got it</Button></div>
      ) : null}
      {narrow ? (
        <>
          <AnimatePresence initial={false}>
            {rooms.length && !tray ? (
              <motion.div key="rooms" className={styles.fold} {...unfold}>
                <div className={styles.roomsRow}>
                  {roomChips}
                  <Tooltip label="Add room"><IconButton icon="add_photo_alternate" label="Add room" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => setAddRoomOpen(true)} data-testid="viz-add-room" /></Tooltip>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className={styles.body} data-viz-body="">{stage}</div>
          <AnimatePresence initial={false} onExitComplete={() => setTrayLeaving(false)}>
            {!tray && strip ? <motion.div key="strip" className={styles.fold} {...unfold}>{strip}</motion.div> : null}
            {room && !readOnly && tray && panel ? (
              <motion.div key="tray" className={styles.fold} data-viz-bottom="" {...collapse}>
                <div ref={trayRef} className={styles.tray} tabIndex={-1} role="region" aria-label="Edit the room" data-testid="viz-tray">
                  <div className={styles.trayDescribe}>{describeBox(true)}</div><PanelClose.Provider value={() => setTray(false)}>{panel}</PanelClose.Provider>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {room && !readOnly ? (
            <div className={styles.goDock} data-viz-bottom="" data-viz-go="">
              {footer(true)}
              <ModeTabs variant="dock" mode={mode} marks={marks} onMode={(m) => { if (m === mode && tray) setTray(false); else { setMode(m); setTray(true) } }} />
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.body} data-viz-body="">
          <div className={styles.main}>{stage}{strip}</div>
          {hasRail ? (
            <aside className={styles.rail} aria-label="Edit the room">
              <ModeTabs mode={mode} onMode={setMode} marks={marks} />
              <div className={styles.panelWrap}>{short ? <div className={styles.trayDescribe}>{describeBox(true)}</div> : null}{panel}</div>
              {footer(short)}
            </aside>
          ) : null}
        </div>
      )}

      {/* (F171) the version on screen, said when it changes */}
      <span className="visually-hidden" aria-live="polite" data-testid="viz-live">{view ? `V${view.n} · ${view.descriptor} on screen` : room?.imageUrl ? 'Original photo on screen' : ''}</span>

      <input ref={photoInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void changePhoto(f) }} />
      <input ref={swatchInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readSwatch(f) }} />
      <input ref={refInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addReference(f) }} />
      <input ref={pieceInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addPiecePhoto(f) }} />

      {/* (REG-728) the ⋯ menus: rows with a second line (why one waits) — the width scale's 240, all three */}
      <PortalMenu open={menu?.kind === 'version' && !!mv} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={mv ? `V${mv.n} · ${mv.descriptor}` : ''}>
        {mv ? (
          <>
            {/* (the calm UI build 2026-10-27, 6-18 · W-367) one place each: for the version on screen, Share is the top bar's Share (it picks the
                version on screen) and Download the canvas bar's download — both in view at every width wherever this ⋮ is — so its ⋮ leaves
                them out; another version's ⋮ keeps both, so it is still shared or saved in one press */}
            {/* (UX audit V4) a version made this visit: Share is its next step, first */}
            {fresh.includes(mv.key) && !mvOnScreen ? <DropdownItem onSelect={() => { setMenu(null); setShare([mv.key]) }} disabled={readOnly || leadClosed} help={leadClosed && !readOnly ? (leadDeleted ? LEAD_DELETED_ROW : LEAD_CLOSED_SHARE) : undefined}>Share with the client…</DropdownItem> : null}
            {/* (UX audit V1) what the client said on it, readable here */}
            {badges[mv.key]?.notes ? <DropdownItem onSelect={() => { setMenu(null); openNotes(mv.key) }}>{`From the client · ${badges[mv.key]!.notes} ${badges[mv.key]!.notes === 1 ? 'note' : 'notes'}`}</DropdownItem> : null}
            {(fresh.includes(mv.key) && !mvOnScreen) || badges[mv.key]?.notes ? <DropdownDivider /> : null}
            {/* (surfaces-27) with the Original on screen, a version's own ⋯ offers its before and after — never a dead Compare */}
            {!view ? <DropdownItem onSelect={() => { setMenu(null); setPinning(false); setDraftPin(null); setActivePin(null); setView(mv.key); setCompare({ on: true, key: null }) }}>Before and after</DropdownItem>
              : mv.key !== viewKey ? <DropdownItem onSelect={() => { setMenu(null); setPinning(false); setDraftPin(null); setActivePin(null); setCompare({ on: true, key: mv.key }) }}>{`Compare with V${view.n}`}</DropdownItem>
                : <DropdownItem onSelect={() => { setMenu(null); setPinning(false); setDraftPin(null); setActivePin(null); setCompare({ on: true, key: null }) }}>Before and after</DropdownItem>}
            <DropdownItem onSelect={() => { setMenu(null); setPresent(mv.key) }}>Present</DropdownItem>
            <DropdownItem onSelect={() => { setMenu(null); setBoard(mv.key) }}>Moodboard</DropdownItem>
            {mvOnScreen ? null : <DropdownItem onSelect={() => { setMenu(null); download(mv.key) }}>Download</DropdownItem>}
            <DropdownDivider />
            {/* (files-9) a deleted lead takes nothing more from its design — the rows say why */}
            {data.lead ? <DropdownItem onSelect={() => { setMenu(null); void toFiles(mv) }} disabled={leadDeleted} help={leadDeleted ? LEAD_DELETED_ROW : undefined}>Save to Files</DropdownItem> : null}
            {data.lead ? <DropdownItem onSelect={() => { setMenu(null); setQuoteFor(mv) }} disabled={leadDeleted || !mvLines.length} help={leadDeleted ? LEAD_DELETED_ROW : !mvLines.length ? noQuoteReason(mv) : undefined}>Add to a quote…</DropdownItem> : null}
            {fresh.includes(mv.key) || mvOnScreen ? null : <DropdownItem onSelect={() => { setMenu(null); setShare([mv.key]) }} disabled={readOnly || leadClosed} help={leadClosed && !readOnly ? (leadDeleted ? LEAD_DELETED_ROW : LEAD_CLOSED_SHARE) : undefined}>Share with the client…</DropdownItem>}
            <DropdownDivider />
            <DropdownItem tone="danger" onSelect={() => { setMenu(null); askRemoveVersion(mv) }} disabled={readOnly}>Delete</DropdownItem>
          </>
        ) : null}
      </PortalMenu>
      {/* (E12 · surfaces-9) Rename and Change photo follow the Delete-room rule; one sentence names all three, said once under the rows it greys */}
      <PortalMenu open={menu?.kind === 'room' && !!room} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={room?.name ?? ''}>
        <DropdownItem onSelect={() => { setMenu(null); if (room) setRename({ kind: 'room', value: room.name }) }} disabled={readOnly || !!roomRule} help={roomRule && !ruleOnce ? roomRule : undefined}>Rename</DropdownItem>
        <DropdownItem onSelect={() => { setMenu(null); photoInput.current?.click() }} disabled={readOnly || !!roomRule || live.length > 0} help={roomRule ? (!ruleOnce ? roomRule : undefined) : live.length ? 'Its versions were made of this photo — add a new room instead' : undefined}>Change photo</DropdownItem>
        <DropdownDivider />
        <DropdownItem tone="danger" onSelect={() => { setMenu(null); void removeRoom() }} disabled={readOnly || !!room?.mayDelete} help={room?.mayDelete || undefined}>Delete room</DropdownItem>
      </PortalMenu>
      <PortalMenu open={menu?.kind === 'design'} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
        {/* (round 3) a deleted lead has no page to open — the row says so, as Share and Save to Files do */}
        {data.lead ? <DropdownItem onSelect={() => { setMenu(null); void leave(withFrom(`/leads/${data.lead!.id}`, here())) }} disabled={leadDeleted} help={leadDeleted ? `${LEAD_DELETED_ROW} — restore it from Leads › Deleted Leads` : undefined}>Open the lead</DropdownItem>
          : <DropdownItem onSelect={() => { setMenu(null); setRename({ kind: 'design', value: data.design.name }) }} disabled={!!data.design.mayChange || readOnly} help={data.design.mayChange || undefined}>Rename</DropdownItem>}
        {/* (UX audit V2) a personal design joins a lead from here, as from its card on the landing */}
        {data.lead ? null : <DropdownItem onSelect={() => { setMenu(null); setLinkOpen(true) }} disabled={!!data.design.mayChange || readOnly} help={data.design.mayChange || undefined}>Link to a lead…</DropdownItem>}
        {narrow ? <DropdownItem onSelect={() => { setMenu(null); if (roomId) ed.undo(roomId) }} disabled={!ed.canUndo(roomId)}>Undo</DropdownItem> : null}
        {narrow ? <DropdownItem onSelect={() => { setMenu(null); if (roomId) ed.redo(roomId) }} disabled={!ed.canRedo(roomId)}>Redo</DropdownItem> : null}
        <DropdownItem onSelect={() => { setMenu(null); setHintSeen(false) }}>Show the tips again</DropdownItem>
        <DropdownDivider />
        <DropdownItem tone="danger" onSelect={() => { setMenu(null); setConfirmDelete(true) }} disabled={!!data.design.mayChange || readOnly} help={data.design.mayChange || undefined}>Delete design</DropdownItem>
      </PortalMenu>

      <PickOneDialog open={linkOpen} onClose={() => setLinkOpen(false)} title="Link to a lead" label="Lead" load={loadLinkable} confirmLabel="Link" onPick={(id) => linkTo(id)} empty="No leads to link to yet" />
      <AddRoomDialog open={addRoomOpen} onClose={() => { if (!roomBusy) setAddRoomOpen(false) }} onFile={(f) => { void addPhotoRoom(f) }} onFiles={(fs) => { void addPhotoRooms(fs) }} onLeadFile={(f) => { void addLeadFileRoom(f) }} onSample={(k, s) => { void addSampleRoom(k, s) }} leadImages={data.leadImages} leadName={data.lead?.name ?? null} busy={roomBusy} />
      <AddItemDialog kind={addItem} prefer={addPrefer} onClose={() => setAddItem(null)} onDone={(label, category, how) => {
        const kind = addItem; setAddItem(null)
        if (kind) placeNamed(kind, label, category, how)
      }} />
      <SwatchDialog file={swatch} suggestedCategory={swatchCat} onClose={() => setSwatch(null)} onSave={saveSwatch} />
      <QuoteDialog open={!!quoteFor} onClose={() => setQuoteFor(null)} title={quoteFor ? `V${quoteFor.n}` : ''} quotes={data.quotes} onAdd={(q, again) => addToQuote(q, again)} quotable={data.quotable}
                   groupName={quoteFor && room ? quoteGroupName(room.name, quoteFor.n) : undefined} lines={quoteFor && room ? quoteLines(quoteFor, ed.detectionOf(room.id)) : []} />
      <ShareDialog open={!!share} onClose={() => setShare(null)} rooms={shareRooms} initial={share ?? []} lead={data.lead ? { name: data.lead.name, phone: data.lead.phone } : null} studio={data.studio.name} sender={data.viewer.name} shares={data.shares} now={data.now}
                   onCreate={async (keys, message) => { const r = await createShareLink(data.design.id, { keys, message }).catch(() => ({ error: 'Couldn’t make the link — please try again' })); if (!('error' in r)) router.refresh(); return r }}
                   onSent={(id, via) => { void act(recordShareSent(id, via), 'note that it was sent') }}
                   onStop={(id) => { void act(stopShareLink(id), 'stop sharing') }} onUnstop={(id) => { void act(unstopShareLink(id), 'open the link again') }}
                   onRenew={(id) => { void act(renewShareLink(id), 'keep the link open', { done: () => snack({ message: 'The link is open for another 7 days' }) }) }} />
      {room ? <MoodboardDialog open={!!board} onClose={() => setBoard(null)} version={board ? (() => { const v = versionOf(board); return v ? (local[v.key] ? { ...v, imageUrl: local[v.key]! } : v) : null })() : null} room={room.name} title={title} studio={data.studio.name} onShare={() => { if (readOnly || leadClosed) { snack({ message: readOnly ? 'This design is deleted' : LEAD_CLOSED_SHARE }); return } const k = board; setBoard(null); if (k) setShare([k]) }} labels={ed.detectionOf(room.id)} /> : null}
      {room ? <PresentDialog open={!!present} onClose={() => setPresent(null)} room={room.name} original={room.imageUrl} versions={live.map((v) => (local[v.key] ? { ...v, imageUrl: local[v.key]! } : v))} start={present ?? viewKey} labels={ed.detectionOf(room.id)} lineage={all} /> : null}
      {room ? <DeletedVersionsDialog open={deletedOpen} onClose={() => setDeletedOpen(false)} room={room.name} versions={all.filter((v) => v.deleted).map((v) => (local[v.key] ? { ...v, imageUrl: local[v.key]! } : v))} onRestore={restoreFromDialog} /> : null}
      <DeleteVersionDialog version={confirmVersion} badge={confirmVersion ? badges[confirmVersion.key] : undefined} leadName={data.lead?.name ?? null}
                           onCancel={() => setConfirmVersion(null)} onConfirm={() => { const v = confirmVersion; setConfirmVersion(null); if (v) void removeVersion(v) }} />
      <Dialog open={!!rename} onClose={() => setRename(null)} title={rename?.kind === 'room' ? 'Rename the room' : 'Rename the design'} size="form" width={400}
              footer={<><Button appearance="outlined" variant="secondary" onPress={() => setRename(null)}>Cancel</Button><Button isDisabled={!renameName || !!renameError} onPress={() => { void saveRename() }}>Save</Button></>}>
        <TextField label="Name" required autoFocus error={renameError ?? undefined} helper={!renameError && renameName.length > renameLimit - 10 ? `${renameName.length} / ${renameLimit}` : undefined} value={rename?.value ?? ''} onChange={(v) => setRename((r) => (r ? { ...r, value: v } : r))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveRename() } }} />
      </Dialog>
      <ConfirmDialog open={confirmDelete} title={data.lead ? `Delete ${title}’s design?` : `Delete ${title}?`} message="Its rooms and versions go to Deleted Designs, where you can restore them. Shared links stop working." confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); void removeDesign() }} />
      {/* (editor-visual 3) the sheet opens against its own button wherever the editor parks it (beside the rail, in the versions band —
          editor.module.css); a press on the button closes it rather than closing and opening again (REG-153) */}
      <MaisonAiSheet open={aiOpen} suggestions={aiSuggestions} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (pending modules S10) the shell's one sheet */}
      <MaisonFab className={styles.fab} onPress={() => setAiOpen((o) => !o)} />
    </div>
  )
}
