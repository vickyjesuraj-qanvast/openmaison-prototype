'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Sheet } from '@/components/om/sheet'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { useRun } from '@/components/leads/tasks/use-run'
import { PickOneDialog } from '@/components/company/templates/pick-one-dialog'
import { MaisonFab } from '@/components/shell/maison-fab'
import { PageReveal } from '@/components/shell/page-reveal'
import { PanelClose } from '@/components/visualizer/editor/rail'
import rail from '@/components/visualizer/editor/rail.module.css'
import { useMediaQuery, MOBILE, TABLET_DOWN } from '@/lib/breakpoint'
import { copyText } from '@/lib/clipboard'
import { backLabel as backWords, withFrom } from '@/lib/nav'
import { waLink } from '@/lib/portal/model'
import { useShortcutsHere } from '@/lib/keys/store'
import { PLANNER_KEYS } from '@/lib/keys/registry'
import { catalogueItem, isLoose, pieceName } from '@/lib/planner/catalogue'
import type { Described } from '@/lib/planner/describe'
import { KIND_LABEL, LEVEL_ONE, MAX_LEVELS, SIDE_LABEL, allRooms, fitOpening, freeSpot, levelsOf, newId, nextName, onLevel, overlapsOf, putLevel, roomAt, sideLength, snapPiece, wallRuns, type Opening, type Piece, type PlanDoc, type Room, type RoomKind, type Side } from '@/lib/planner/model'
import { PictureDialog } from '../picture/picture-dialog'   // (pending modules S28)
import { SizeDialog } from '../photo/size-dialog'   // (pending modules S28)
import { shareDraft } from '@/lib/planner/policy'
import { arrangeBlock, arrangeRoom, presetRoom } from '@/lib/planner/templates'
import { rescalePlan } from '@/lib/planner/photo'   // (pending modules S28)
import type { LayoutVersionRow, PlannerEditorData } from '@/lib/planner/queries'
import { displayDate } from '@/lib/format'
import { stashPhotos } from '@/lib/visualizer/pending-photos'
import { createDesign, openLeadDesign } from '@/app/visualizer/actions'
import { createLayout, deleteLayouts, duplicateLayout, linkLayoutToProject, readLinkableProjects, recordLayoutSent, renameLayout, saveLayoutAsTemplate, saveLayoutVersion, shareLayout, stopSharingLayout, undoSaveAsTemplate, undoStopSharing, unlinkLayout } from '@/app/planner/actions'
import { ThreeView, type ThreeHandle } from '../scene/three-view'
import { PlannerEditorGhost } from '../planner-ghosts'
import { TopView, type Measure, type Sel, type TopHandle } from './top-view'
import { PlannerTopbar, ViewMenuButton, ViewSwitch, type View } from './planner-topbar'
import { ElevationPanel } from './elevation-panel'
import { VersionsDrawer } from './versions-drawer'
import type { Change } from './use-plan-state'
import { FinishesPanel, FurniturePanel, RoomsPanel, TABS, type Tab } from './panels'
import { OpeningInspector, PieceInspector, RoomInspector } from './inspector'
import { ShareDialog } from './share-dialog'
import { usePlanState } from './use-plan-state'
import styles from './editor.module.css'

/**
 * (gaps build J — the 3D Space Planner, J-Q2…J-Q19) A layout's editor: the AI Visualizer's app frame — the bar (back · name and whose ·
 * Top · 3D · Walk · saved · undo / redo · Share with client · ⋮), the rail's three panels (Rooms · Furniture · Finishes), the stage and
 * the inspector of what is picked. Every change is one Undo step and saves itself; a viewer who may not change it reads it (the bar's
 * note says why). ≤1024 the camera-app model: the stage, a selection bar, the dock; panels and the inspector in sheets.
 * (parity map 2026-10-10 — his "build everything that's in 1.0") The View ▾ (Isometric · Ruler · Furniture · Dimensions · Present, TD-081 ·
 * TD-092 · TD-098), levels (TD-075), Save as a template (TD-076), versions (TD-087), a room's Arrange and wall elevations (TD-088 · TD-091),
 * a described piece (TD-090) and Render in AI Visualizer (TD-089).
 */
export function PlannerEditor(props: { data: PlannerEditorData; from?: string; initialView?: View; initialShare?: boolean; initialIso?: boolean }) {
  return (
    <PageReveal skeleton={<PlannerEditorGhost />}>
      <Editor {...props} />
    </PageReveal>
  )
}

function Editor({ data, from, initialView = 'top', initialShare = false, initialIso = false }: { data: PlannerEditorData; from?: string; initialView?: View; initialShare?: boolean; initialIso?: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const compact = useMediaQuery(TABLET_DOWN)
  const phone = useMediaQuery(MOBILE)
  const readOnly = !!data.mayChange
  const { plan: doc, change: changeDoc, endGesture, undo, redo, canUndo, canRedo, save, flush, rev } = usePlanState({ id: data.layout.id, plan: data.plan, rev: data.layout.rev, readOnly })
  /* (parity map, TD-075) the level on screen: every edit below works on it (`change`), the whole plan saves (`doc`) */
  const [level, setLevel] = useState(LEVEL_ONE)
  const levels = useMemo(() => levelsOf(doc), [doc])
  if (level !== LEVEL_ONE && !levels.some((l) => l.id === level)) setLevel(LEVEL_ONE)   // an Undo took the level away (render-phase adjust)
  const plan = useMemo(() => onLevel(doc, level), [doc, level])
  const change: Change = useCallback((fn, mode) => changeDoc((d) => { const v = onLevel(d, level); const n = fn(v); return n === v ? d : putLevel(d, level, n) }, mode), [changeDoc, level])
  const levelName = levels.find((l) => l.id === level)?.name ?? 'Level 1'
  /* (parity map, TD-081 · TD-098) the View ▾ — per visit: the isometric camera, the ruler and what it measured, furniture and dimensions */
  const [iso, setIso] = useState(initialIso)
  const [ruler, setRuler] = useState(false)
  const [measure, setMeasure] = useState<Measure | null>(null)
  const [showPieces, setShowPieces] = useState(true)
  const [showDims, setShowDims] = useState(true)
  const [viewMenuEl, setViewMenuEl] = useState<HTMLElement | null>(null)
  const viewMenuRef = useRef<HTMLElement | null>(null)
  const [elevRoom, setElevRoom] = useState<string | null>(null)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsTick, setVersionsTick] = useState(0)
  const [versionCount, setVersionCount] = useState(data.layout.versions)
  const [levelRename, setLevelRename] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  /* (parity map, TD-092) Present: the index of the room on screen, null while editing */
  const [presenting, setPresenting] = useState<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const isTemplate = data.layout.isTemplate
  const [name, setName] = useState(data.layout.name)
  const [view, setView] = useState<View>(initialView)
  const [tab, setTab] = useState<Tab>('rooms')
  const [sheet, setSheet] = useState<Tab | 'picked' | null>(null)
  const [sel, setSel] = useState<Sel>(null)
  /* (pending modules S28) a layout made from a floor-plan photo opens with its rooms to place: Draw a room is on, each drag takes the next */
  const [drawing, setDrawing] = useState(() => !data.mayChange && (data.plan.toPlace?.length ?? 0) > 0 && initialView === 'top')
  const [hadList] = useState(() => (data.plan.toPlace?.length ?? 0) > 0)
  const [listDone, setListDone] = useState(false)   // the "every room is on the plan" line, closed
  const [pictureOpen, setPictureOpen] = useState(false)
  const [furnishedNow, setFurnishedNow] = useState<{ rooms: number; ids: string[] } | null>(null)   // what Make the 3D picture furnished, for the picture's own Undo
  const [sizing, setSizing] = useState(false)
  const [moveUnderlay, setMoveUnderlay] = useState(false)
  const [finishRoom, setFinishRoom] = useState<string | null>(null)
  const [zoomPct, setZoomPct] = useState(100)
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null)
  const menuRef = useRef<HTMLElement | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [shareOpen, setShareOpen] = useState(initialShare && !readOnly && !isTemplate)   // (TD-076) a template never shares
  const [share, setShare] = useState(data.share)
  /* the plan the client's copy holds — "Changes not shared" while the plan on screen is another (an Undo back to it clears the line) */
  const [sharedPlan, setSharedPlan] = useState<PlanDoc | null>(data.share && data.layout.rev <= data.share.sharedRev ? data.plan : null)   // the whole plan, every level
  const [sharing, setSharing] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const fabRef = useRef<HTMLElement | null>(null)
  const topRef = useRef<TopHandle>(null)
  const threeRef = useRef<ThreeHandle>(null)
  const clip = useRef<Piece | null>(null)
  const project = data.project
  /* (pending modules S07) a lead's layout, before the lead is won: its lead is the client it is for — it goes to the project at Won */
  const onLead = data.lead
  const client = project ? { leadId: project.leadId, name: project.leadName, phone: project.clientPhone, portal: project.portal, designsOn: project.designsOn }
    : onLead ? { leadId: onLead.id, name: onLead.name, phone: onLead.clientPhone, portal: onLead.portal, designsOn: onLead.designsOn } : null
  useShortcutsHere(PLANNER_KEYS)

  const back = () => { void flush(); router.push(from ?? (project ? `/projects/${project.id}` : onLead ? `/leads/${onLead.id}` : '/planner')) }
  const backLabel = from ? backWords(from, { fallback: 'Back to the 3D Space Planner' }) : project ? 'Back to the project' : onLead ? 'Back to the lead' : 'Back to the 3D Space Planner'
  const chip = project ? `${project.number} · ${project.leadName}` : onLead ? `${onLead.name} · Lead` : isTemplate ? 'Template' : 'Personal'

  /* what overlaps — shown, never refused (J-Q8) */
  const runs = useMemo(() => wallRuns(plan.rooms), [plan.rooms])
  const overlaps = useMemo(() => new Map(plan.pieces.map((p) => [p.id, overlapsOf(p, plan.pieces, runs, isLoose)])), [plan.pieces, runs])
  const warn = useMemo(() => new Set([...overlaps].filter(([, o]) => o.wall || o.pieces.length).map(([id]) => id)), [overlaps])
  const overlapText = (id: string): string | null => {
    const o = overlaps.get(id); if (!o) return null
    const names = o.pieces.map((x) => plan.pieces.find((q) => q.id === x)).filter((q): q is Piece => !!q).map((q) => `the ${pieceName(q.key).toLowerCase()}`)
    const parts = [...(o.wall ? ['a wall'] : []), ...[...new Set(names)]]
    return parts.length ? parts.slice(0, 3).join(' and ') : null
  }

  /* the picked thing, resolved */
  const selPiece = sel?.kind === 'piece' ? plan.pieces.find((p) => p.id === sel.id) ?? null : null
  const selRoom = sel?.kind === 'room' ? plan.rooms.find((r) => r.id === sel.id) ?? null : null
  const selOpeningRoom = sel?.kind === 'opening' ? plan.rooms.find((r) => r.id === sel.roomId) ?? null : null
  const selOpening = selOpeningRoom?.openings.find((o) => o.id === sel?.id) ?? null
  /* a picked thing that an Undo took away is let go (render-phase adjust) */
  if (sel && !selPiece && !selRoom && !selOpening) setSel(null)
  if (sheet === 'picked' && !sel) setSheet(null)
  /* (TD-081) the ruler measures on the Top view only; hidden furniture can't stay picked */
  if (ruler && view !== 'top') { setRuler(false); setMeasure(null) }
  if (!showPieces && selPiece) setSel(null)

  /* ── edits ── */
  const pick = (s: Sel) => { setSel(s); if (s?.kind === 'room') setFinishRoom(s.id) }
  const updatePiece = (id: string, patch: Partial<Piece>) => change((pl) => ({ ...pl, pieces: pl.pieces.map((q) => (q.id === id ? { ...q, ...patch } : q)) }))
  const updateRoom = (id: string, patch: Partial<Room>) => change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => {
    if (r.id !== id) return r
    const next = { ...r, ...patch }
    return { ...next, openings: next.openings.map((o) => ({ ...o, ...fitOpening(next, o) })) }
  }) }))
  const updateOpening = (roomId: string, id: string, patch: Partial<Opening>) => change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id !== roomId ? r : { ...r, openings: r.openings.map((o) => (o.id === id ? { ...o, ...patch, ...fitOpening(r, { ...o, ...patch }) } : o)) })) }))

  const where = (): { x: number; z: number } => {
    const room = selRoom ?? (selPiece ? roomAt(plan.rooms, selPiece.x, selPiece.z) : null)
    if (room) return { x: room.x + room.w / 2, z: room.z + room.d / 2 }
    if (view === 'top' && topRef.current) return topRef.current.centre()
    const r = [...plan.rooms].sort((a, b) => b.w * b.d - a.w * a.d)[0]
    return r ? { x: r.x + r.w / 2, z: r.z + r.d / 2 } : { x: 200, z: 200 }
  }
  const addPiece = (key: string, at?: { x: number; z: number }, patch?: Partial<Pick<Piece, 'w' | 'd' | 'h' | 'color'>>) => {
    const c = catalogueItem(key); if (!c || readOnly) return
    const pt = at ?? where()
    const id = newId('p')
    const piece: Piece = { id, key, x: Math.round(pt.x), z: Math.round(pt.z), rot: 0, w: c.w, d: c.d, h: c.h, color: null, finish: null, ...patch }
    if (!showPieces) setShowPieces(true)   // a piece placed is a piece seen
    const placed = { ...piece, ...snapPiece(piece, runs) }
    change((pl) => ({ ...pl, pieces: [...pl.pieces, placed] }))
    setSel({ kind: 'piece', id })
    if (compact) setSheet(null)
  }
  const duplicate = () => {
    if (readOnly) return
    if (selPiece) {
      const id = newId('p'), copy = { ...selPiece, id, x: selPiece.x + 30, z: selPiece.z + 30 }
      change((pl) => ({ ...pl, pieces: [...pl.pieces, copy] })); setSel({ kind: 'piece', id })
    } else if (selRoom) {
      const id = newId('r')
      const copy: Room = { ...selRoom, id, name: nextName(selRoom.name, plan.rooms.map((r) => r.name)), x: selRoom.x + selRoom.w, openings: selRoom.openings.map((o) => ({ ...o, id: newId('o') })) }
      change((pl) => ({ ...pl, rooms: [...pl.rooms, copy] })); pick({ kind: 'room', id })
    }
  }
  /* every remove answers with Undo — putting back exactly what went, whatever else changed since */
  const remove = () => {
    if (readOnly || !sel) return
    if (selPiece) {
      const at = plan.pieces.findIndex((p) => p.id === selPiece.id), gone = selPiece
      change((pl) => ({ ...pl, pieces: pl.pieces.filter((p) => p.id !== gone.id) })); setSel(null)
      snackbar({ key: 'planner-remove', message: `${pieceName(gone.key)} removed`, actionLabel: 'Undo', onAction: () => change((pl) => ({ ...pl, pieces: [...pl.pieces.slice(0, at), gone, ...pl.pieces.slice(at)] })) })
    } else if (selRoom) {
      const at = plan.rooms.findIndex((r) => r.id === selRoom.id), gone = selRoom
      change((pl) => ({ ...pl, rooms: pl.rooms.filter((r) => r.id !== gone.id) })); setSel(null)
      snackbar({ key: 'planner-remove', message: `${gone.name} removed — its furniture stays`, actionLabel: 'Undo', onAction: () => change((pl) => ({ ...pl, rooms: [...pl.rooms.slice(0, at), gone, ...pl.rooms.slice(at)] })) })
    } else if (selOpening && selOpeningRoom) {
      const roomId = selOpeningRoom.id, gone = selOpening
      change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === roomId ? { ...r, openings: r.openings.filter((o) => o.id !== gone.id) } : r)) }))
      pick({ kind: 'room', id: roomId })
      snackbar({ key: 'planner-remove', message: `${gone.kind === 'door' ? 'Door' : 'Window'} removed`, actionLabel: 'Undo', onAction: () => change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === roomId ? { ...r, openings: [...r.openings, gone] } : r)) })) })
    }
  }
  const addRoom = (kind: RoomKind, rect?: { x: number; z: number; w: number; d: number }) => {
    if (readOnly) return
    const id = newId('r')
    const spot = rect ?? freeSpot(plan.rooms)
    const draft = presetRoom(kind, id, '', spot.x, spot.z, rect?.w, rect?.d)
    const room: Room = { ...draft, name: nextName(rect ? 'Room' : KIND_LABEL[kind], plan.rooms.map((r) => r.name)) }
    change((pl) => ({ ...pl, rooms: [...pl.rooms, room] }))
    pick({ kind: 'room', id })
    if (!rect && view === 'top') requestAnimationFrame(() => topRef.current?.fit())
  }
  const addOpening = (roomId: string, kind: 'door' | 'window', side: Side) => {
    const r = plan.rooms.find((x) => x.id === roomId); if (!r || readOnly) return
    const width = kind === 'door' ? 90 : 120
    const id = newId('o')
    const o: Opening = kind === 'door' ? { id, kind, side, at: 0, width, swing: 'left' } : { id, kind, side, at: 0, width, sill: 90, height: 120 }
    const fit = fitOpening(r, { side, at: (sideLength(r, side) - width) / 2, width })
    change((pl) => ({ ...pl, rooms: pl.rooms.map((x) => (x.id === roomId ? { ...x, walls: { ...x.walls, [side]: true }, openings: [...x.openings, { ...o, ...fit }] } : x)) }))
    setSel({ kind: 'opening', id, roomId })
  }
  const nudge = (dx: number, dz: number) => {
    if (readOnly) return
    if (selPiece) updatePiece(selPiece.id, { x: selPiece.x + dx, z: selPiece.z + dz })
    else if (selRoom) {
      const inside = plan.pieces.filter((q) => q.x >= selRoom.x && q.x <= selRoom.x + selRoom.w && q.z >= selRoom.z && q.z <= selRoom.z + selRoom.d).map((q) => q.id)
      change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === selRoom.id ? { ...r, x: r.x + dx, z: r.z + dz } : r)), pieces: pl.pieces.map((q) => (inside.includes(q.id) ? { ...q, x: q.x + dx, z: q.z + dz } : q)) }))
    }
  }
  const trace = (planId: string) => {
    const f = data.plans.find((x) => x.id === planId)
    if (!f || !project || readOnly) return
    if (!f.scale) { snackbar({ message: `Set the scale of ${f.name} on the Floor plan tab first — the layout needs its true size` }); return }
    change((pl) => ({ ...pl, underlay: { planId: f.id, projectId: project.id, name: f.name, url: `/projects/${project.id}/plan-picture/${f.id}`, mmPerPx: f.scale!, pxW: f.width, pxH: f.height, x: 0, z: 0, opacity: 0.5, visible: true } }))
    if (view !== 'top') setView('top')
    requestAnimationFrame(() => topRef.current?.fit())
  }
  const onUnderlay = (patch: { visible?: boolean; opacity?: number; remove?: true }) => {
    if (patch.remove) {
      const gone = plan.underlay
      change((pl) => ({ ...pl, underlay: null })); setMoveUnderlay(false)
      if (gone) snackbar({ key: 'planner-remove', message: 'Floor plan taken away', actionLabel: 'Undo', onAction: () => change((pl) => ({ ...pl, underlay: gone })) })
      return
    }
    change((pl) => (pl.underlay ? { ...pl, underlay: { ...pl.underlay, ...(patch.visible !== undefined ? { visible: patch.visible } : {}), ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}) } } : pl))
    if (patch.visible === false) setMoveUnderlay(false)
  }
  /* (pending modules S28) Change its size… — the floor plan, the rooms on it and the pieces' places grow or shrink together, one Undo step */
  const resize = (mmPerPx: number) => {
    const u = plan.underlay; if (!u || readOnly) return
    change((pl) => rescalePlan(pl, mmPerPx / u.mmPerPx))
    setSizing(false)
    requestAnimationFrame(() => topRef.current?.fit())
    snackbar({ key: 'planner-remove', message: 'Its size changed — the rooms and the furniture’s places followed it', actionLabel: 'Undo', onAction: undo })
  }

  /* ── (pending modules S28 — card studio:floorplan-isometric-ai) the rooms to place on a floor-plan photo: level 1's list (`toPlace`), first
     to last; each rectangle drawn on the plan becomes the first, named and kinded as the list says (one Undo step); a row can go next or come
     off the list ("Not on this plan", with Undo). Once rooms are on the plan, Make the 3D picture furnishes the bare ones by the planner's
     rule and opens the picture. ── */
  const toPlace = level === LEVEL_ONE && !readOnly ? doc.toPlace ?? [] : []
  const placing = toPlace.length > 0
  const nextPlace = toPlace[0] ?? null
  const placeDrawn = (rect: { x: number; z: number; w: number; d: number }) => {
    const t = toPlace[0]
    if (!t) { setDrawing(false); addRoom('bedroom', rect); return }
    const id = newId('r')
    const room: Room = { ...presetRoom(t.kind, id, '', rect.x, rect.z, rect.w, rect.d), name: nextName(t.name, plan.rooms.map((r) => r.name)) }
    change((pl) => ({ ...pl, rooms: [...pl.rooms, room], toPlace: (pl.toPlace ?? []).slice(1) }))
    /* nothing is picked while placing: the inspector would take the stage's width, and the plan the studio is tracing would slide under it */
    if (toPlace.length <= 1) setDrawing(false)
  }
  const placeNext = (i: number) => {
    if (i > 0) change((pl) => { const list = [...(pl.toPlace ?? [])]; const [it] = list.splice(i, 1); return it ? { ...pl, toPlace: [it, ...list] } : pl })
    setView('top'); setRuler(false); setMeasure(null); setSel(null); setDrawing(true)
    if (compact) setSheet(null)
  }
  const skipPlace = (i: number) => {
    const gone = toPlace[i]; if (!gone || readOnly) return
    change((pl) => ({ ...pl, toPlace: (pl.toPlace ?? []).filter((_, j) => j !== i) }))
    if (toPlace.length <= 1) setDrawing(false)
    snackbar({ key: 'planner-remove', message: `${gone.name} taken off the list`, actionLabel: 'Undo',
      onAction: () => change((pl) => { const list = pl.toPlace ?? []; return { ...pl, toPlace: [...list.slice(0, i), gone, ...list.slice(i)] } }) })
  }
  const setFinish = (roomId: string, surface: 'floor' | 'wall', id: string | null) => change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === roomId ? { ...r, [surface]: id } : r)) }))
  const everyRoom = (surface: 'floor' | 'wall', id: string | null) => {
    change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => ({ ...r, [surface]: id })) }))
    snackbar({ message: `Every room’s ${surface === 'floor' ? 'floor' : 'walls'} changed`, actionLabel: 'Undo', onAction: undo })
  }
  /* (parity map, TD-090) a described piece — the closest in the catalogue, in its colour and at its size */
  const placeDescribed = (d: Described) => addPiece(d.item.key, undefined, { w: d.w, d: d.d, h: d.h, color: d.color })

  /* (parity map, TD-088 — 1.0's Auto-Arrange, by rule) a room furnished afresh; Undo puts back exactly what was there */
  const inRoom = (q: Piece, r: Room) => q.x >= r.x && q.x <= r.x + r.w && q.z >= r.z && q.z <= r.z + r.d
  const arrange = (roomId: string) => {
    const r = plan.rooms.find((x) => x.id === roomId); if (!r || readOnly) return
    const why = arrangeBlock(r); if (why) { snackbar({ message: why }); return }
    const fresh = arrangeRoom(r).map((q) => ({ ...q, id: newId('p') }))
    if (!fresh.length) { snackbar({ message: `Nothing fits ${r.name} by the rule — place its pieces from Furniture` }); return }
    const gone = plan.pieces.filter((q) => inRoom(q, r))
    const goneIds = new Set(gone.map((q) => q.id)), newIds = new Set(fresh.map((q) => q.id))
    change((pl) => ({ ...pl, pieces: [...pl.pieces.filter((q) => !goneIds.has(q.id)), ...fresh] }))
    if (!showPieces) setShowPieces(true)
    snackbar({ key: 'planner-remove', message: `${r.name} arranged — ${fresh.length} ${fresh.length === 1 ? 'piece' : 'pieces'} placed${gone.length ? `, ${gone.length} taken away` : ''}`, actionLabel: 'Undo',
      onAction: () => change((pl) => ({ ...pl, pieces: [...pl.pieces.filter((q) => !newIds.has(q.id)), ...gone] })) })
  }

  /* (pending modules S28) Make the 3D picture — the rooms with nothing in them furnished first by the planner's rule (one step, Undo), then
     the picture: Dollhouse · Top-down, to download, keep in Files or take on to the AI Visualizer */
  const makePicture = () => {
    setMenuEl(null)
    if (!plan.rooms.length) { snackbar({ message: placing ? 'Place a room first — the picture is drawn from the rooms on the plan' : 'Add a room first — the picture is drawn from the rooms' }); return }
    if (!readOnly) {
      const fresh: Piece[] = []
      let furnished = 0
      for (const r of plan.rooms) {
        if (arrangeBlock(r) || plan.pieces.some((q) => inRoom(q, r))) continue
        const got = arrangeRoom(r).map((q) => ({ ...q, id: newId('p') }))
        if (got.length) { fresh.push(...got); furnished++ }
      }
      if (fresh.length) {
        change((pl) => ({ ...pl, pieces: [...pl.pieces, ...fresh] }))
        if (!showPieces) setShowPieces(true)
      }
      /* said in the picture itself, with its Undo — a snackbar would sit over the picture's own buttons */
      setFurnishedNow(fresh.length ? { rooms: furnished, ids: fresh.map((q) => q.id) } : null)
    }
    setDrawing(false); setSel(null); setPictureOpen(true)
  }
  const unfurnish = () => {
    const ids = new Set(furnishedNow?.ids ?? []); if (!ids.size) return
    change((pl) => ({ ...pl, pieces: pl.pieces.filter((q) => !ids.has(q.id)) }))
    setFurnishedNow(null)
  }

  /* (parity map, TD-075) levels: add one (empty, or with level 1's rooms copied from its empty state), rename it, remove it with Undo */
  const goLevel = (id: string) => { setLevel(id); setSel(null); setMeasure(null); setDrawing(false); setMoveUnderlay(false) }
  const addLevel = () => {
    if (readOnly || levels.length >= MAX_LEVELS) return
    const id = newId('lv'), name = nextName(`Level ${levels.length + 1}`, levels.map((l) => l.name))
    changeDoc((d) => ({ ...d, levels: [...(d.levels ?? []), { id, name, rooms: [], pieces: [], underlay: null }] }))
    goLevel(id)
    snackbar({ message: `${name} added — draw its rooms, or start from ${levels[0]?.name ?? 'Level 1'}’s` })
  }
  const copyFirstRooms = () => {
    const first = levels[0]; if (!first || readOnly || level === LEVEL_ONE) return
    const rooms: Room[] = first.rooms.map((r) => ({ ...r, id: newId('r'), walls: { ...r.walls }, openings: r.openings.map((o) => ({ ...o, id: newId('o') })) }))
    change((pl) => ({ ...pl, rooms: [...pl.rooms, ...rooms] }))
    requestAnimationFrame(() => topRef.current?.fit())
    snackbar({ message: `${rooms.length} rooms copied from ${first.name} — rename and reshape them for ${levelName}`, actionLabel: 'Undo', onAction: undo })
  }
  const removeLevel = () => {
    if (readOnly || level === LEVEL_ONE) return
    const at = (doc.levels ?? []).findIndex((l) => l.id === level), gone = doc.levels?.[at]
    if (!gone) return
    changeDoc((d) => ({ ...d, levels: (d.levels ?? []).filter((l) => l.id !== gone.id) }))
    goLevel(LEVEL_ONE)
    snackbar({ key: 'planner-remove', message: `${gone.name} removed${gone.rooms.length ? ` — its ${gone.rooms.length} ${gone.rooms.length === 1 ? 'room' : 'rooms'} with it` : ''}`, actionLabel: 'Undo',
      onAction: () => { changeDoc((d) => ({ ...d, levels: [...(d.levels ?? []).slice(0, at), gone, ...(d.levels ?? []).slice(at)] })); goLevel(gone.id) } })
  }
  const doRenameLevel = () => {
    const next = (levelRename ?? '').trim().slice(0, 60)
    if (!next) return
    changeDoc((d) => (level === LEVEL_ONE ? { ...d, levelName: next } : { ...d, levels: (d.levels ?? []).map((l) => (l.id === level ? { ...l, name: next } : l)) }))
    setLevelRename(null)
  }
  const onLevels = (a: 'add' | 'rename' | 'remove') => { if (a === 'add') addLevel(); else if (a === 'rename') setLevelRename(levelName); else removeLevel() }

  /* the 3D drag: snapped as the Top view snaps, one Undo step a drag */
  const onMove3d = useCallback((id: string, x: number, z: number, done: boolean) => {
    change((pl) => ({ ...pl, pieces: pl.pieces.map((q) => (q.id === id ? { ...q, ...snapPiece({ ...q, x, z }, wallRuns(pl.rooms)) } : q)) }), done ? 'end' : 'live')
  }, [change])
  const onCamera = useCallback((c: PlanDoc['camera']) => change((pl) => ({ ...pl, camera: c }), 'quiet'), [change])

  /* ── keys (J-Q17) ── */
  const keyRef = useRef({ sel, selPiece, selRoom, view, drawing, moveUnderlay, readOnly, ruler, measure, presenting })
  const actions = useRef({ undo, redo, remove, duplicate, nudge, updatePiece, addPiece })
  useLayoutEffect(() => {
    keyRef.current = { sel, selPiece, selRoom, view, drawing, moveUnderlay, readOnly, ruler, measure, presenting }
    actions.current = { undo, redo, remove, duplicate, nudge, updatePiece, addPiece }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.defaultPrevented || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return
      const k = keyRef.current, a = actions.current, mod = e.metaKey || e.ctrlKey
      if (k.presenting !== null) return   // Present keeps its own keys (← → Esc)
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); a.redo(); return }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); a.duplicate(); return }
      if (mod && e.key.toLowerCase() === 'c' && k.selPiece) { clip.current = k.selPiece; return }
      if (mod && e.key.toLowerCase() === 'v' && clip.current && !k.readOnly) { e.preventDefault(); const c = clip.current; a.addPiece(c.key, { x: c.x + 30, z: c.z + 30 }); return }
      if (mod || e.altKey) return
      if (e.key === '1' || e.key === '2' || e.key === '3') { setView(e.key === '1' ? 'top' : e.key === '2' ? '3d' : 'walk'); return }
      if (e.key === 'Escape') { if (k.ruler) { if (k.measure) setMeasure(null); else setRuler(false) } else if (k.drawing) setDrawing(false); else if (k.moveUnderlay) setMoveUnderlay(false); else setSel(null); return }
      if (k.view === 'walk') return   // the arrows and WASD walk (the 3D view's own keys)
      if ((e.key === 'Delete' || e.key === 'Backspace') && k.sel) { e.preventDefault(); a.remove(); return }
      if ((e.key === 'r' || e.key === 'R') && k.selPiece && !k.readOnly) { a.updatePiece(k.selPiece.id, { rot: (k.selPiece.rot + 90) % 360 }); return }
      const step = e.shiftKey ? 1 : 5
      const arrows: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }
      if (arrows[e.key] && (k.selPiece || k.selRoom)) { e.preventDefault(); const [dx, dz] = arrows[e.key]!; a.nudge(dx, dz) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── the layout's own actions ── */
  const shareUrl = share ? `${typeof window === 'undefined' ? '' : window.location.origin}/space/${share.token}` : null
  const changed = !!share && doc !== sharedPlan
  const doShare = async (message: string | null) => {
    if (sharing) return
    setSharing(true)
    try {
      const r = await shareLayout(data.layout.id, { message: share ? undefined : message, plan: doc, rev: rev.current })
      if ('error' in r) { snackbar({ message: `Couldn’t share the layout — ${r.error.replace(/^./, (c) => c.toLowerCase())}` }); return }
      const now = Date.now()
      setSharedPlan(doc)
      setVersionCount((n) => n + 1); setVersionsTick((t) => t + 1)   // (TD-087) the share kept a version
      setShare((s) => ({ id: r.shareId, token: r.token, sharedAt: r.sharedAt, updatedAt: now, sharedRev: r.rev, sharedBy: data.me.id, message: s?.message ?? message, firstViewedAt: s?.firstViewedAt ?? null, viewCount: s?.viewCount ?? 0 }))
      snackbar({ message: share ? 'Changes shared — the client sees the layout as it is now' : 'Link made — copy it or send it on WhatsApp' })
    } catch { snackbar({ message: 'Couldn’t share the layout — please try again' }) } finally { setSharing(false) }
  }
  const copyLink = () => {
    if (!shareUrl || !share) return
    void copyText(shareUrl).then(() => { snackbar({ message: 'Link copied' }); void recordLayoutSent(share.id, 'copy') }, () => snackbar({ message: 'Couldn’t copy — please try again' }))
  }
  const whatsApp = () => {
    if (!shareUrl || !share || !client?.phone) return
    window.open(waLink(client.phone, shareDraft(client.name, name, shareUrl, data.me.name)), '_blank', 'noopener')
    void recordLayoutSent(share.id, 'whatsapp')
  }
  const stopShare = async () => {
    const r = await stopSharingLayout(data.layout.id).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: `Couldn’t stop sharing — ${r.error.replace(/^./, (c) => c.toLowerCase())}` }); return }
    const was = share
    setShare(null); setShareOpen(false)
    snackbar({ message: project ? 'Sharing stopped — the link ends and the layout leaves the portal' : 'Sharing stopped — the link ends', actionLabel: 'Undo',
      onAction: () => { void run('share it again', () => undoStopSharing(r.undo)).then((ok) => { if (ok) setShare(was) }) } })
  }
  const download = async (kind: 'png' | 'pdf') => {
    setMenuEl(null)
    if (kind === 'pdf') { void flush(); router.push(withFrom(`/planner/${data.layout.id}/print`, `/planner/${data.layout.id}${from ? `?from=${encodeURIComponent(from)}` : ''}`)); return }
    const url = view === 'top' ? await topRef.current?.png() : threeRef.current?.capture()
    if (!url) { snackbar({ message: 'Couldn’t draw the picture — please try again' }); return }
    const a = document.createElement('a'); a.href = url; a.download = `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Layout'}.png`; a.click()
    snackbar({ message: view === 'top' ? 'Top view downloaded' : 'The view on screen downloaded' })
  }
  const doDuplicate = () => {
    setMenuEl(null)
    void run('duplicate the layout', async () => {
      await flush()
      const r = await duplicateLayout(data.layout.id); if ('error' in r) return r
      snackbar({ message: `Duplicated as ${r.name}`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/planner/${r.id}`, from)) })
    })
  }
  const doDelete = () => {
    setMenuEl(null)
    void run('delete the layout', async () => {
      const r = await deleteLayouts([data.layout.id]); if ('error' in r) return r
      router.push(`/planner?deleted=${data.layout.id}`)   // the gallery says so, with its Undo
    })
  }
  const doRename = async () => {
    const next = (renaming ?? '').trim()
    if (!next) return
    const r = await renameLayout(data.layout.id, next).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: `Couldn’t rename the layout — ${r.error.replace(/^./, (c) => c.toLowerCase())}` }); return }
    setName(next.slice(0, 80)); setRenaming(null); snackbar({ message: 'Layout renamed' })
  }
  const loadProjects = useCallback(() => readLinkableProjects(), [])
  const lower = (e: string) => e.replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '')

  /* (parity map, TD-076) Save as a template — the layout as it is on screen, the studio's own starting point */
  const doSaveTemplate = async () => {
    setMenuEl(null)
    if (busyAction) return
    setBusyAction('template')
    const r = await saveLayoutAsTemplate(data.layout.id, { plan: doc }).catch(() => ({ error: 'please try again' })).finally(() => setBusyAction(null))
    if ('error' in r) { snackbar({ message: `Couldn’t save it as a template — ${lower(r.error)}` }); return }
    snackbar({ message: `Saved as the template “${r.name}” — New layout lists it under My templates`, actionLabel: 'Undo',
      onAction: () => { void run('undo the template', () => undoSaveAsTemplate({ id: r.id })) } })
  }
  const startFromTemplate = () => {
    setMenuEl(null)
    void run('start a layout from the template', async () => {
      const r = await createLayout({ fromLayoutId: data.layout.id }); if ('error' in r) return r
      router.push(withFrom(`/planner/${r.id}`, '/planner'))
    })
  }

  /* (parity map, TD-087) versions — Save a version by hand; Bring back keeps the layout as it was first, then puts the version on screen */
  const saveVersion = async (note: string): Promise<boolean> => {
    const r = await saveLayoutVersion(data.layout.id, { note, plan: doc, rev: rev.current }).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: `Couldn’t save a version — ${lower(r.error)}` }); return false }
    setVersionCount((n) => n + 1); setVersionsTick((t) => t + 1)
    snackbar({ message: note ? `Version “${note.slice(0, 40)}” saved` : 'Version saved', ...(versionsOpen ? {} : { actionLabel: 'See versions', onAction: () => setVersionsOpen(true) }) })
    return true
  }
  const bringBack = async (v: LayoutVersionRow) => {
    if (readOnly || busyAction) return
    setBusyAction('version')
    const when = displayDate(new Date(v.at))
    const kept = await saveLayoutVersion(data.layout.id, { before: `${v.label.toLowerCase()} of ${when}`, plan: doc, rev: rev.current }).catch(() => ({ error: 'please try again' })).finally(() => setBusyAction(null))
    if ('error' in kept) { snackbar({ message: `Couldn’t bring it back — ${lower(kept.error)}` }); return }
    changeDoc(() => ({ ...v.plan, camera: doc.camera }))
    goLevel(LEVEL_ONE)
    setVersionCount((n) => n + 1); setVersionsTick((t) => t + 1); setVersionsOpen(false)
    snackbar({ message: `Brought back the version of ${when} — the layout as it was is kept in Versions`, actionLabel: 'Undo', onAction: undo })
  }

  /* (parity map, TD-089) Render in AI Visualizer — the 3D view on screen becomes a room photo of a Visualizer design (the project's lead's
     own design, else a new personal one), added by the Visualizer's own upload path; its own price applies when generating there */
  const toVisualizer = async (file: File) => {
    const r = client ? await openLeadDesign(client.leadId) : await createDesign({ name })
    if ('error' in r) { snackbar({ message: `Couldn’t open the AI Visualizer — ${lower(r.error)}` }); return }
    stashPhotos(r.id, [file])
    await flush()
    router.push(withFrom(`/visualizer/${r.id}`, `/planner/${data.layout.id}${from ? `?from=${encodeURIComponent(from)}` : ''}`))
  }
  const renderInVisualizer = async () => {
    setMenuEl(null)
    if (busyAction) return
    if (!allRooms(doc).length) { snackbar({ message: 'Add a room first — the picture is the 3D view of the layout' }); return }
    setBusyAction('render')
    try {
      if (view !== '3d') setView('3d')
      for (let i = 0; i < 30 && !threeRef.current; i++) await new Promise((ok) => setTimeout(ok, 100))
      await new Promise((ok) => setTimeout(ok, view === '3d' ? 150 : 1200))   // the scene builds and its first frames draw
      const shot = threeRef.current?.capture()
      const file = shot ? await jpegFile(shot, `${name} — 3D view.jpg`) : null
      if (!file) { snackbar({ message: 'Couldn’t draw the 3D view — please try again' }); return }
      await toVisualizer(file)
    } catch { snackbar({ message: 'Couldn’t open the AI Visualizer — please try again' }) } finally { setBusyAction(null) }
  }
  /* (pending modules S28) the 3D picture's own frame (Dollhouse · Top-down) taken on to the AI Visualizer — REG-1658's door */
  const pictureToVisualizer = async (shot: string) => {
    if (busyAction) return
    setBusyAction('render')
    try {
      const file = await jpegFile(shot, `${name} — 3D picture.jpg`)
      if (!file) { snackbar({ message: 'Couldn’t draw the picture — please try again' }); return }
      await toVisualizer(file)
    } catch { snackbar({ message: 'Couldn’t open the AI Visualizer — please try again' }) } finally { setBusyAction(null) }
  }

  /* (parity map, TD-092 — 1.0's Presentation mode) Present: full screen, the camera walks room to room across every level; ← → and Esc */
  const tour = useMemo(() => levels.flatMap((l) => l.rooms.filter((r) => r.kind !== 'corridor').map((r) => ({ level: l.id, levelName: l.name, room: r }))), [levels])
  const stop = presenting !== null ? tour[Math.min(presenting, tour.length - 1)] ?? null : null
  if (stop && stop.level !== level) setLevel(stop.level)   // the room's level comes on screen with it (render-phase adjust)
  const startPresent = () => {
    setViewMenuEl(null)
    if (!tour.length) { snackbar({ message: 'Add a room first — Present walks the client from room to room' }); return }
    setSel(null); setView('3d'); setSheet(null); setPresenting(0)
    void editorRef.current?.requestFullscreen?.().catch(() => {})
  }
  const stopPresent = useCallback(() => { setPresenting(null); if (typeof document !== 'undefined' && document.fullscreenElement) void document.exitFullscreen().catch(() => {}) }, [])
  const presentStep = useCallback((k: number) => setPresenting((i) => (i === null ? i : Math.max(0, Math.min(tour.length - 1, i + k)))), [tour.length])
  const stopRoom = stop?.room.id ?? null
  useEffect(() => {
    if (!stopRoom) return
    const t = window.setTimeout(() => threeRef.current?.flyTo(stopRoom), 160)
    return () => window.clearTimeout(t)
  }, [presenting, stopRoom])
  const presentingNow = presenting !== null
  useEffect(() => {
    if (!presentingNow) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); presentStep(1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); presentStep(-1) }
      else if (e.key === 'Escape') { e.preventDefault(); stopPresent() }
    }
    const onFull = () => { if (!document.fullscreenElement) setPresenting(null) }
    window.addEventListener('keydown', onKey, true); document.addEventListener('fullscreenchange', onFull)
    return () => { window.removeEventListener('keydown', onKey, true); document.removeEventListener('fullscreenchange', onFull) }
  }, [presentingNow, presentStep, stopPresent])
  const doLink = async (projectId: string) => {
    const r = await linkLayoutToProject(data.layout.id, projectId).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: `Couldn’t link the layout — ${r.error.replace(/^./, (c) => c.toLowerCase())}` }); return }
    setLinking(false)
    router.refresh()
    snackbar({ message: `Linked to ${r.projectName}`, actionLabel: 'Undo', onAction: () => { void run('undo the link', () => unlinkLayout(r.undo), undefined, { refresh: true }) } })
  }

  /* ── what renders ── */
  const flyTo = useCallback((id: string) => threeRef.current?.flyTo(id), [])
  const portal: 'on' | 'invite' | 'off' | null = !client ? null : !client.portal ? 'invite' : client.designsOn ? 'on' : 'off'
  const panelFor = (t: Tab) => t === 'rooms'
    ? <RoomsPanel plan={plan} sel={sel} library={data.library} readOnly={readOnly} drawing={drawing} onDraw={() => { setDrawing((d) => !d); setView('top'); setRuler(false); if (compact) setSheet(null) }}
                  levels={levels} level={level} onLevels={(a) => { onLevels(a); if (compact && a === 'add') setSheet(null) }}
                  onAdd={(k) => { addRoom(k); if (compact) setSheet(null) }} onPick={(id) => { pick({ kind: 'room', id }); if (view !== 'top') flyTo(id); if (compact) setSheet(null) }}
                  plans={data.plans} onTrace={trace} moveUnderlay={moveUnderlay} onMoveUnderlay={(on) => { setMoveUnderlay(on); if (on) setView('top') }} onUnderlay={onUnderlay}
                  toPlace={toPlace} onPlaceNext={placeNext} onSkipPlace={skipPlace} onResize={() => { setSizing(true); if (compact) setSheet(null) }} />
    : t === 'furniture' ? <FurniturePanel readOnly={readOnly} onPlace={(k) => addPiece(k)} onPlaceDescribed={placeDescribed} count={plan.pieces.length} />
    : <FinishesPanel plan={plan} roomId={finishRoom} onRoom={setFinishRoom} library={data.library} readOnly={readOnly} onFinish={setFinish} onEveryRoom={everyRoom} />
  /* in a sheet the Panel's own collapse closes it (PanelClose); beside the stage the inspector lets go with its × */
  const close = compact ? undefined : () => setSel(null)
  const inspector = selPiece ? (
    <PieceInspector p={selPiece} plan={plan} library={data.library} readOnly={readOnly} overlap={overlapText(selPiece.id)} onChange={(patch) => updatePiece(selPiece.id, patch)} onDuplicate={duplicate} onRemove={remove} onClose={close} />
  ) : selRoom ? (
    <RoomInspector r={selRoom} library={data.library} readOnly={readOnly} onChange={(patch) => updateRoom(selRoom.id, patch)} onAddOpening={(k, s) => addOpening(selRoom.id, k, s)}
                   onPickOpening={(id) => setSel({ kind: 'opening', id, roomId: selRoom.id })} onRemoveOpening={(id) => { setSel({ kind: 'opening', id, roomId: selRoom.id }); requestAnimationFrame(() => actions.current.remove()) }}
                   onFinishes={() => { setFinishRoom(selRoom.id); setTab('finishes'); if (compact) setSheet('finishes') }} onRemove={remove} onClose={close}
                   onArrange={() => arrange(selRoom.id)} arrangeWhy={data.mayChange ?? arrangeBlock(selRoom)} onElevations={() => { setElevRoom(selRoom.id); if (compact) setSheet(null) }} />
  ) : selOpening && selOpeningRoom ? (
    <OpeningInspector o={selOpening} r={selOpeningRoom} readOnly={readOnly} onChange={(patch) => updateOpening(selOpeningRoom.id, selOpening.id, patch)} onRemove={remove} onRoom={() => pick({ kind: 'room', id: selOpeningRoom.id })} onClose={close} />
  ) : null
  const selTitle = selPiece ? pieceName(selPiece.key) : selRoom ? selRoom.name : selOpening ? `${selOpening.kind === 'door' ? 'Door' : 'Window'} · ${SIDE_LABEL[selOpening.side]}` : ''
  const selSub = selPiece ? (overlapText(selPiece.id) ? `Overlaps ${overlapText(selPiece.id)}` : `${selPiece.w} × ${selPiece.d} cm`) : selRoom ? `${(selRoom.w / 100).toFixed(2)} × ${(selRoom.d / 100).toFixed(2)} m` : selOpeningRoom?.name ?? ''
  /* (pending modules S10 — card held:maison-ai, "the … Planner … editors' words-only suggestions · make each act or drop it") Each acts, by rule
     from the plan on screen: a bedroom arranged by the planner's own rule (Arrange — shown first, one button, Undo puts back what was there),
     the pieces that overlap a wall or each other (each picked with a press), and each room's size. "Open the kitchen to the living room" had
     nothing on record behind it (2.0 has no wall-removal) and became the room sizes. *(invented copy)* */
  /* (S42 D-12) shown only when it applies: the first bare bedroom (the master first), else a bare living room, is offered to furnish; a
     layout with every one of them furnished is offered a re-arrangement of the first, in those words — never "Furnish" over pieces */
  const furnishable = [...plan.rooms.filter((r) => r.kind === 'master'), ...plan.rooms.filter((r) => r.kind === 'bedroom'), ...plan.rooms.filter((r) => r.kind === 'living')]
  const bareRoom = furnishable.find((r) => !plan.pieces.some((q) => inRoom(q, r))) ?? null
  const bedroom = bareRoom ?? furnishable[0] ?? null
  const overlapping = plan.pieces.filter((q) => warn.has(q.id))
  const m2 = (r: Room) => Math.round((r.w * r.d) / 1000) / 10
  const aiSuggestions: MaisonSuggestion[] = [
    bedroom
      ? { label: `${bareRoom ? 'Furnish' : 'Re-arrange'} the ${bedroom.name.toLowerCase()}`, propose: () => {
          const why = readOnly ? 'This layout is read-only here.' : arrangeBlock(bedroom)
          if (why) return Promise.resolve({ title: `Can’t arrange the ${bedroom.name.toLowerCase()}`, text: why })
          const there = plan.pieces.filter((q) => inRoom(q, bedroom)).length
          return Promise.resolve({ title: `Arrange the ${bedroom.name.toLowerCase()}`, text: 'Its main pieces placed by the planner’s rule, against its longest wall without a door. Undo puts back what was there.',
            lines: [`${bedroom.name} · ${(bedroom.w / 100).toFixed(2)} × ${(bedroom.d / 100).toFixed(2)} m`, there ? `${there === 1 ? '1 piece' : `${there} pieces`} in it now — taken away` : 'Nothing in it yet'], confirm: 'Arrange it',
            run: async () => { arrange(bedroom.id); return true } })
        } }
      : { label: 'Furnish a room', answer: { title: 'No rooms yet', text: 'Add a room, or draw one on the plan — then Maison AI can arrange it.' } },
    { label: 'Which pieces overlap?', answer: () => Promise.resolve(overlapping.length
      ? { title: `${overlapping.length === 1 ? '1 piece overlaps' : `${overlapping.length} pieces overlap`}`, text: 'Shown, never refused — open one to move it.', rows: overlapping.map((q) => ({ id: q.id, label: pieceName(q.key), meta: `Overlaps ${overlapText(q.id) ?? 'something'}`, run: () => pick({ kind: 'piece', id: q.id }) })) }
      : { title: 'Nothing overlaps', text: plan.pieces.length ? 'Every piece is clear of the walls and of each other.' : 'No furniture on this level yet.' }) },
    { label: 'How big is each room?', answer: () => Promise.resolve(plan.rooms.length
      ? { title: `${plan.rooms.length === 1 ? '1 room' : `${plan.rooms.length} rooms`} on ${levelName}`, text: 'Width by depth, inside the walls — open one to pick it.', rows: plan.rooms.map((r) => ({ id: r.id, label: r.name, meta: `${(r.w / 100).toFixed(2)} × ${(r.d / 100).toFixed(2)} m · ${m2(r)} m²`, run: () => pick({ kind: 'room', id: r.id }) })) }
      : { title: 'No rooms yet', text: 'Add a room, or draw one on the plan.' }) },
  ]
  const empty = !plan.rooms.length
  const viewOff = iso || ruler || !showPieces || !showDims   // the View ▾ wears its mark while any option is away from its usual state
  const openViewMenu = (el: HTMLElement) => { viewMenuRef.current = el; setViewMenuEl((m) => (m ? null : el)) }
  const firstLevel = levels[0]

  return (
    <div ref={editorRef} className={styles.editor} data-insp={!compact && inspector && !presentingNow ? '' : undefined} data-has-sel={sel ? '' : undefined} data-present={presentingNow || undefined} data-testid="planner-editor">
      <PlannerTopbar backLabel={backLabel} onBack={back} title={name} chip={chip} view={view} onView={setView} compact={phone} tight={compact}
                     saving={save.saving} savedLabel={save.label} savedTone={save.tone} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                     onShare={() => setShareOpen(true)} shareBlock={data.mayChange ?? (isTemplate ? TEMPLATE_SHARE : null)} shared={!!share} onMenu={(el) => { menuRef.current = el; setMenuEl((m) => (m ? null : el)) }} menuOpen={!!menuEl}
                     viewButton={<ViewMenuButton onOpen={openViewMenu} open={!!viewMenuEl} on={viewOff} compact={compact} />} />   {/* (pending modules S28, found) ≤1024 the View ▾ is its icon — at 768 its words ran over Undo */}
      {readOnly ? <div className={styles.note} role="status" data-testid="planner-readonly"><Icon name="lock" size={18} weight={300} /><span className={styles.noteText}>{`${data.mayChange} — you can look, download it and duplicate it.`}</span></div>
        : share && changed ? <div className={styles.note} data-tone="info" role="status" data-testid="planner-unshared"><Icon name="info" size={18} weight={300} /><span className={styles.noteText}>Changes not shared — the client still sees the layout as you last shared it.</span><Button appearance="text" onPress={() => setShareOpen(true)}>Share changes</Button></div> : null}
      <div className={styles.body}>
        {!compact ? (
          <aside className={styles.rail} aria-label="Edit the layout">
            <PlannerTabs tab={tab} onTab={setTab} />
            {panelFor(tab)}
          </aside>
        ) : null}
        <div className={styles.stage}>
          {view === 'top' ? (
            <TopView ref={topRef} plan={plan} library={data.library} sel={sel} onSel={pick} change={change} endGesture={endGesture} warn={warn} readOnly={readOnly}
                     drawing={drawing} onDrawn={placeDrawn} moveUnderlay={moveUnderlay} onDropPiece={(k, x, z) => addPiece(k, { x, z })} onZoom={setZoomPct}
                     ruler={ruler} measure={measure} onMeasure={setMeasure} showPieces={showPieces} showDims={showDims} />
          ) : (
            <ThreeView ref={threeRef} plan={plan} library={data.library} mode={view === 'walk' ? 'walk' : 'orbit'} low={plan.wallsLow || presentingNow} selected={presentingNow ? null : selPiece?.id ?? null} editable={!readOnly && !presentingNow}
                       onSelect={(id) => { if (!presentingNow) setSel(id ? { kind: 'piece', id } : null) }} onMove={onMove3d} onCamera={presentingNow ? undefined : onCamera} walkFrom={selRoom?.id ?? (selPiece ? roomAt(plan.rooms, selPiece.x, selPiece.z)?.id ?? null : null)}
                       iso={iso && !presentingNow} pieces={showPieces} />
          )}
          {phone && !presentingNow ? (
            <div className={`${styles.float} ${styles.viewSwitch}`}>
              <ViewSwitch view={view} onView={setView} />
              <ViewMenuButton onOpen={openViewMenu} open={!!viewMenuEl} on={viewOff} compact />
            </div>
          ) : null}
          {/* (parity map, TD-075) the level switch — only once the layout has a second level */}
          {levels.length > 1 && !presentingNow ? (
            <div className={`${styles.float} ${styles.levelsBar}`} data-phone={phone || undefined}>
              <Chips label="Level" options={levels.map((l) => ({ value: l.id, label: l.name }))} value={level} onChange={goLevel} testId="planner-level-switch" />
            </div>
          ) : null}
          {ruler && view === 'top' && !compact ? <div className={`${styles.float} ${styles.hint}`} data-testid="planner-ruler-hint">{measure?.b ? 'Press again to measure afresh · Esc clears · Alt measures freely' : 'Press two points to measure between them — they land on a wall or a piece · Esc stops'}</div> : null}
          {view !== 'top' && plan.rooms.length && !presentingNow ? (
            <div className={`${styles.float} ${styles.roomsBar}`} data-below={phone || undefined} data-levels={levels.length > 1 ? '' : undefined}>
              <Chips label="Go to a room" options={plan.rooms.map((r) => ({ value: r.id, label: r.name }))} value={null} onChange={(id) => threeRef.current?.flyTo(id)} testId="planner-room-chips" />
            </div>
          ) : null}
          {view === 'top' ? (
            <div className={`${styles.float} ${styles.zoomBar}`}>
              <Tooltip label="Zoom out"><IconButton icon="zoom_out" label="Zoom out" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => topRef.current?.zoom(1 / 1.4)} /></Tooltip>
              <span className={styles.zoomPct} aria-live="polite">{`${zoomPct}%`}</span>
              <Tooltip label="Zoom in"><IconButton icon="zoom_in" label="Zoom in" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => topRef.current?.zoom(1.4)} /></Tooltip>
              <Tooltip label="Fit the layout"><IconButton icon="fit_screen" label="Fit the layout" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => topRef.current?.fit()} data-testid="planner-fit" /></Tooltip>
            </div>
          ) : view === '3d' ? (
            <div className={`${styles.float} ${styles.wallsBar}`}>
              <span>Walls</span>
              <Chips label="Walls" options={[{ value: 'full', label: 'Full' }, { value: 'low', label: 'Low' }]} value={plan.wallsLow ? 'low' : 'full'} onChange={(v) => change((pl) => ({ ...pl, wallsLow: v === 'low' }), 'quiet')} testId="planner-walls-height" />
              <Tooltip label="Fit the layout"><IconButton icon="fit_screen" label="Fit the layout" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => threeRef.current?.fit()} /></Tooltip>
            </div>
          ) : (
            <WalkPad onStep={(d, on) => threeRef.current?.walkStep(d, on)} />
          )}
          {view !== 'top' && !compact ? <div className={`${styles.float} ${styles.hint}`}>{view === 'walk' ? 'Drag to look around · the arrows or W A S D walk · walls stop you, doors let you through' : readOnly ? 'Drag to turn · scroll to zoom · right-drag to pan' : 'Drag to turn · scroll to zoom · press a piece to pick it, drag it to move it'}</div> : null}
          {empty && view === 'top' && !drawing && !placing ? (
            <div className={styles.emptyWrap} data-low={plan.underlay ? '' : undefined}>
              {level !== LEVEL_ONE ? (
                /* (TD-075) an upper level starts empty: draw it, or start from level 1's rooms (an upper storey mostly shares its outline) */
                <EmptyState icon="flip_to_front" title={`No rooms on ${levelName} yet`} help={firstLevel?.rooms.length ? `Draw its rooms, or start from ${firstLevel.name}’s rooms and reshape them — then furnish it.` : 'Draw its rooms — then furnish it.'} testId="planner-empty"
                            primary={readOnly ? null : { label: 'Draw a room', icon: 'draw', onPress: () => { setDrawing(true); setRuler(false) }, testId: 'planner-empty-draw' }}
                            secondary={readOnly || !firstLevel?.rooms.length ? null : { label: `Copy ${firstLevel.name}’s rooms`, onPress: copyFirstRooms, testId: 'planner-copy-rooms' }} />
              ) : (
                <EmptyState icon="space_dashboard" title="No rooms yet" help={plan.underlay ? 'Draw the rooms over the floor plan — Draw a room, then drag a rectangle on it.' : 'Add a room, or draw one on the plan — then furnish it.'} testId="planner-empty"
                            primary={readOnly ? null : { label: 'Draw a room', icon: 'draw', onPress: () => { setDrawing(true); setRuler(false) }, testId: 'planner-empty-draw' }}
                            secondary={readOnly ? null : { label: 'Add a living room', onPress: () => addRoom('living') }} />
              )}
            </div>
          ) : null}
          {/* (pending modules S28) placing the listed rooms on the floor-plan photo — the next one's name, how far along, and the picture */}
          {view === 'top' && !presentingNow && !readOnly && (placing || (hadList && !listDone && plan.rooms.length > 0)) ? (
            <div className={`${styles.float} ${styles.guide}`} data-levels={levels.length > 1 ? '' : undefined} data-phone={phone || undefined} role="status" aria-live="polite" data-testid="planner-place-guide">
              <span className={styles.guideText}>
                <span className={styles.guideTitle} data-testid="planner-place-title">{placing && nextPlace ? (drawing ? `Drag over the ${nextPlace.name} on the plan` : `Next: the ${nextPlace.name}`) : 'Every room is on the plan'}</span>
                <span className={styles.guideSub}>{placing ? `${plan.rooms.length} placed · ${toPlace.length} to go${drawing && !compact ? ' · Esc stops' : ''}` : 'Line up any edge with the plan, then make the picture.'}</span>
              </span>
              <span className={styles.guideActions}>
                {placing && !drawing ? <Button size="sm" onPress={() => placeNext(0)} data-testid="planner-place-next">Place it</Button> : null}
                {placing ? <Button variant="secondary" appearance="text" size="sm" onPress={() => skipPlace(0)} data-testid="planner-place-skip">Not on this plan</Button> : null}
                {plan.rooms.length ? <Button variant={placing ? 'secondary' : 'primary'} appearance={placing ? 'outlined' : 'filled'} size="sm" onPress={makePicture} data-testid="planner-make-picture">Make the 3D picture</Button> : null}
                {!placing ? <Tooltip label="Put this away"><IconButton icon="close" label="Put this away" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => setListDone(true)} /></Tooltip> : null}
              </span>
            </div>
          ) : null}
          {/* (parity map, TD-092) Present: the room on screen, the way on and back, Exit */}
          {presentingNow && stop ? (
            <>
              <div className={`${styles.float} ${styles.presentTitle}`} data-testid="planner-present-title"><span className={styles.presentName}>{stop.room.name}</span><span className={styles.presentSub}>{[name, levels.length > 1 ? stop.levelName : null].filter(Boolean).join(' · ')}</span></div>
              <div className={`${styles.float} ${styles.presentBar}`} role="toolbar" aria-label="Present" data-testid="planner-present">
                <Tooltip label="The room before" keys="left"><IconButton icon="chevron_left" label="The room before" size={36} variant="bare" iconSize={24} iconWeight={300} disabled={presenting === 0} onClick={() => presentStep(-1)} data-testid="planner-present-prev" /></Tooltip>
                <span className={styles.presentCount} aria-live="polite">{`${(presenting ?? 0) + 1} of ${tour.length}`}</span>
                <Tooltip label="The next room" keys="right"><IconButton icon="chevron_right" label="The next room" size={36} variant="bare" iconSize={24} iconWeight={300} disabled={presenting === tour.length - 1} onClick={() => presentStep(1)} data-testid="planner-present-next" /></Tooltip>
                <span className={styles.presentRule} />
                <Button variant="secondary" appearance="text" onPress={stopPresent} data-testid="planner-present-exit">Exit</Button>
              </div>
            </>
          ) : null}
          {compact && sel && !presentingNow ? (
            <div className={styles.selBar} data-testid="planner-selbar">
              <span className={styles.selName}><span>{selTitle}</span><span className={`${styles.selSub} ${selPiece && overlapText(selPiece.id) ? styles.selWarn : ''}`}>{selSub}</span></span>
              {selPiece && !readOnly ? <Tooltip label="Turn a quarter"><IconButton icon="refresh" label="Turn a quarter" size={36} variant="bare" iconSize={22} iconWeight={300} onClick={() => updatePiece(selPiece.id, { rot: (selPiece.rot + 90) % 360 })} /></Tooltip> : null}
              {(selPiece || selRoom) && !readOnly ? <Tooltip label="Duplicate"><IconButton icon="content_copy" label="Duplicate" size={36} variant="bare" iconSize={22} iconWeight={300} onClick={duplicate} /></Tooltip> : null}
              {!readOnly ? <Tooltip label="Remove"><IconButton icon="delete" label="Remove" size={36} variant="bare" iconSize={22} iconWeight={300} onClick={remove} /></Tooltip> : null}
              <Button variant="secondary" appearance="outlined" onPress={() => setSheet('picked')} data-testid="planner-details">Details</Button>
            </div>
          ) : null}
        </div>
        {!compact && inspector && !presentingNow ? <aside className={styles.inspector} aria-label="What is picked">{inspector}</aside> : null}
      </div>
      {compact && !presentingNow ? <div className={styles.dock}><PlannerTabs tab={sheet && sheet !== 'picked' ? sheet : null} onTab={(t) => setSheet((s) => (s === t ? null : t))} dock /></div> : null}
      {compact ? (
        <Sheet open={!!sheet} onClose={() => setSheet(null)} label={sheet === 'picked' ? selTitle : TABS.find((t) => t.key === sheet)?.label ?? 'Panel'} bodyClassName={styles.sheetBody}>
          <PanelClose.Provider value={() => setSheet(null)}>
            {sheet === 'picked' ? inspector : sheet ? panelFor(sheet) : null}
          </PanelClose.Provider>
        </Sheet>
      ) : null}

      <PortalMenu open={!!menuEl} anchor={menuRef} onClose={() => setMenuEl(null)} align="right" width={280} role="menu" sheetTitle={name}>
        {/* (S42 D-05 · D·3, as recommended) ≤1024 the dock and the camera-app bar are full, so Maison AI is the ⋮'s first row — the same sheet */}
        {compact && !presentingNow ? <><DropdownItem onSelect={() => { setMenuEl(null); setAiOpen(true) }} help="Furnish a room, find what overlaps, each room’s size">Maison AI</DropdownItem><DropdownDivider /></> : null}
        <DropdownItem onSelect={() => { setMenuEl(null); setRenaming(name) }} disabled={readOnly} title={data.mayChange ?? undefined}>Rename…</DropdownItem>
        <DropdownItem onSelect={doDuplicate} help="A personal copy you can change">Duplicate</DropdownItem>
        {isTemplate ? <DropdownItem onSelect={startFromTemplate} help="A new personal layout from this template">Start a layout from it</DropdownItem>
          : <DropdownItem onSelect={() => { void doSaveTemplate() }} disabled={busyAction === 'template' || !allRooms(doc).length} title={!allRooms(doc).length ? 'Add a room first — a template starts from its rooms' : undefined} help={allRooms(doc).length ? 'A starting point for the studio, under My templates' : undefined}>Save as a template</DropdownItem>}
        <DropdownDivider />
        <DropdownItem onSelect={() => { setMenuEl(null); void saveVersion('') }} disabled={readOnly} title={data.mayChange ?? undefined} help={readOnly ? undefined : 'Keeps the layout as it is now'}>Save a version</DropdownItem>
        <DropdownItem onSelect={() => { setMenuEl(null); setVersionsOpen(true) }} meta={versionCount ? String(versionCount) : undefined} help="Every version kept — bring one back">Versions…</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={makePicture} disabled={!plan.rooms.length} title={!plan.rooms.length ? 'Add a room first — the picture is drawn from the rooms' : undefined}
                      help={plan.rooms.length ? 'Dollhouse or Top-down — download it, or keep it in Files' : undefined}>3D picture…</DropdownItem>   {/* (pending modules S28) */}
        <DropdownItem onSelect={() => { void renderInVisualizer() }} disabled={busyAction === 'render' || !allRooms(doc).length} title={!allRooms(doc).length ? 'Add a room first — the picture is the 3D view' : undefined}
                      help={allRooms(doc).length ? (client ? `The 3D view becomes a room photo in ${client.name}’s design` : 'The 3D view becomes the room photo of a new design') : undefined}>Render in AI Visualizer</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { void download('png') }} help={view === 'top' ? 'The Top view, as a picture' : 'The view on screen, as a picture'}>Download PNG</DropdownItem>
        <DropdownItem onSelect={() => { void download('pdf') }} help="The plan, a 3D view, the rooms and the furniture">Download PDF</DropdownItem>
        <DropdownDivider />
        {project ? <DropdownItem onSelect={() => { setMenuEl(null); router.push(`/projects/${project.id}`) }}>Open the project</DropdownItem>
          : onLead ? <DropdownItem onSelect={() => { setMenuEl(null); router.push(`/leads/${onLead.id}`) }} help="It goes to the project once the lead is won">Open the lead</DropdownItem>
          : isTemplate ? null : <DropdownItem onSelect={() => { setMenuEl(null); setLinking(true) }} disabled={readOnly} title={data.mayChange ?? undefined} help={readOnly ? undefined : 'It is saved with the project, and can reach the client’s portal'}>Link to a project…</DropdownItem>}
        {share ? <DropdownItem onSelect={() => { setMenuEl(null); void stopShare() }} disabled={readOnly} title={data.mayChange ?? undefined}>Stop sharing</DropdownItem> : null}
        <DropdownItem onSelect={doDelete} tone="danger" disabled={readOnly} title={data.mayChange ?? undefined}>Delete layout</DropdownItem>
      </PortalMenu>
      {/* (parity map, TD-081 · TD-092 · TD-098) the one View ▾ */}
      <PortalMenu open={!!viewMenuEl} anchor={viewMenuRef} onClose={() => setViewMenuEl(null)} width={300} role="menu" sheetTitle="View">
        <DropdownItem role="menuitemcheckbox" checked={iso} onSelect={() => { setViewMenuEl(null); const on = !iso; setIso(on); if (on && view !== '3d') setView('3d') }} help="The 3D view at 35°, every length to one scale">Isometric</DropdownItem>
        <DropdownItem role="menuitemcheckbox" checked={ruler} onSelect={() => { setViewMenuEl(null); const on = !ruler; setRuler(on); setMeasure(null); if (on) { setView('top'); setDrawing(false); setSel(null) } }} help="Press two points on the Top view — Esc clears">Ruler</DropdownItem>
        <DropdownItem role="menuitemcheckbox" checked={showPieces} onSelect={() => { setViewMenuEl(null); setShowPieces((v) => !v) }} help={showPieces ? 'Hide it to see the bare rooms' : 'Show the pieces again'}>Furniture</DropdownItem>
        <DropdownItem role="menuitemcheckbox" checked={showDims} onSelect={() => { setViewMenuEl(null); setShowDims((v) => !v) }} help="The rooms’ sizes and the overall lengths on the Top view">Dimensions</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={startPresent} disabled={!tour.length} title={tour.length ? undefined : 'Add a room first'} help={tour.length ? 'Full screen, room by room — ← → and Esc' : undefined}>Present</DropdownItem>
      </PortalMenu>
      <PictureDialog open={pictureOpen} onClose={() => { setPictureOpen(false); setFurnishedNow(null) }} plan={plan} library={data.library} name={name} layoutId={data.layout.id}
                     furnished={furnishedNow ? { rooms: furnishedNow.rooms, onUndo: unfurnish } : null}
                     client={client && !isTemplate ? { name: client.name } : null} onVisualize={(shot) => { void pictureToVisualizer(shot) }} visualizing={busyAction === 'render'} />
      <SizeDialog open={sizing} onClose={() => setSizing(false)} underlay={plan.underlay} onApply={resize} />
      <ElevationPanel room={elevRoom ? plan.rooms.find((r) => r.id === elevRoom) ?? null : null} pieces={plan.pieces} library={data.library} layoutName={name} onClose={() => setElevRoom(null)} />
      <VersionsDrawer open={versionsOpen} onClose={() => setVersionsOpen(false)} layoutId={data.layout.id} doc={doc} library={data.library} block={data.mayChange} onSave={saveVersion} onBringBack={(v) => { void bringBack(v) }} refresh={versionsTick} />
      <Dialog open={levelRename !== null} onClose={() => setLevelRename(null)} title="Rename the level" size="form" closeOnScrim={false}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setLevelRename(null)}>Cancel</Button><Button onPress={doRenameLevel} isDisabled={!(levelRename ?? '').trim()}>Rename</Button></>}>
        <div onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doRenameLevel() } }}>
          <TextField label="Level name" value={levelRename ?? ''} onChange={setLevelRename} maxLength={60} autoFocus />
        </div>
      </Dialog>
      <Dialog open={renaming !== null} onClose={() => setRenaming(null)} title="Rename the layout" size="form" closeOnScrim={false}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRenaming(null)}>Cancel</Button><Button onPress={() => { void doRename() }} isDisabled={!(renaming ?? '').trim()}>Rename</Button></>}>
        <div onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void doRename() } }}>
          <TextField label="Layout name" value={renaming ?? ''} onChange={setRenaming} maxLength={80} autoFocus />
        </div>
      </Dialog>
      <PickOneDialog open={linking} onClose={() => setLinking(false)} title="Link to a project" label="Project" load={loadProjects} confirmLabel="Link" onPick={(id) => { void doLink(id) }} empty="No projects to link to yet" />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} name={name} client={client ? { name: client.name, phone: client.phone } : null} portal={portal}
                   share={share} changed={changed} url={shareUrl} busy={sharing} onShare={(m) => { void doShare(m) }} onCopy={copyLink} onWhatsApp={whatsApp} onStop={() => { void stopShare() }} />
      <MaisonAiSheet open={aiOpen} suggestions={aiSuggestions} onClose={() => setAiOpen(false)} anchorRef={compact ? menuRef : fabRef} />   {/* (pending modules S10) the shell's one sheet; (S42 D-05) ≤1024 opened from the ⋮ */}
      <span ref={(el) => { fabRef.current = el?.querySelector<HTMLElement>('button[aria-label="Maison AI"]') ?? null }} data-fab="">
        {!compact && !presentingNow ? <MaisonFab onPress={() => setAiOpen((o) => !o)} /> : null}
      </span>
    </div>
  )
}


/** (parity map, TD-076) Why a template has no Share with client. */
const TEMPLATE_SHARE = 'A template stays in the studio — start a layout from it to share one with a client'

/** The rail's tabs (the Visualizer's mode tabs, its own stylesheet) — the dock's too ≤1024. */
function PlannerTabs({ tab, onTab, dock = false }: { tab: Tab | null; onTab: (t: Tab) => void; dock?: boolean }) {
  return (
    <div className={`${rail.tabs} ${styles.tabs3}`} data-variant={dock ? 'dock' : 'rail'} role="tablist" aria-label="Edit">
      {TABS.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={rail.tab} onClick={() => onTab(t.key)} data-testid={`planner-tab-${t.key}`}>
          <span className={rail.tabIcon}><Icon name={t.icon} size={22} weight={300} fill={tab === t.key} /></span>
          <span className={rail.tabLabel}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

/** (J-Q9) Walk's pad: hold an arrow to walk; the keys do the same. */
function WalkPad({ onStep }: { onStep: (d: 'forward' | 'back' | 'left' | 'right', on: boolean) => void }) {
  const key = (d: 'forward' | 'back' | 'left' | 'right', icon: string, label: string) => (
    <button type="button" className={styles.padKey} aria-label={label}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onStep(d, true) }} onPointerUp={() => onStep(d, false)} onPointerCancel={() => onStep(d, false)} onPointerLeave={() => onStep(d, false)}>
      <Icon name={icon} size={24} weight={300} />
    </button>
  )
  return (
    <div className={`${styles.float} ${styles.pad}`} role="group" aria-label="Walk" data-testid="planner-walk-pad">
      {key('forward', 'keyboard_arrow_up', 'Walk forward')}
      {key('left', 'keyboard_arrow_left', 'Step left')}
      {key('back', 'keyboard_arrow_down', 'Walk back')}
      {key('right', 'keyboard_arrow_right', 'Step right')}
    </div>
  )
}

/** (parity map, TD-089) The 3D frame as a JPEG file — the AI Visualizer's upload takes it as a room photo (a smaller file than the PNG). */
async function jpegFile(dataUrl: string, name: string): Promise<File | null> {
  try {
    const img = new Image()
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('frame')); img.src = dataUrl })
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d'); if (!g) return null
    g.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.9))
    return blob ? new File([blob], name.replace(/[\\/:*?"<>|]+/g, ' '), { type: 'image/jpeg' }) : null
  } catch { return null }
}
