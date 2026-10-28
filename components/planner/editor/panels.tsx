'use client'

import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button, SearchBar, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem } from '@/components/leads/dropdown'
import { Tooltip } from '@/components/om/tooltip'
import { Panel } from '@/components/visualizer/editor/rail'
import { MaterialPicker } from '@/components/visualizer/editor/panels/material-picker'
import { SURFACE_CATEGORY_MAP } from '@/lib/visualizer/catalogue'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { CATALOGUE, GROUPS, searchPieces, type CatalogueItem, type Group } from '@/lib/planner/catalogue'
import { describePiece, type Described } from '@/lib/planner/describe'
import { floorLook, wallLook } from '@/lib/planner/look'
import { KIND_LABEL, LEVEL_ONE, MAX_LEVELS, OUTDOOR, areaText, sizeText, type LevelView, type PlanDoc, type RoomKind, type ToPlace } from '@/lib/planner/model'
import { IconButton } from '@/components/om/icon-button'
import { ROOM_PRESETS } from '@/lib/planner/templates'
import { PieceGlyph } from '../plan-drawing'
import type { Sel } from './top-view'
import styles from './panels.module.css'

export type Tab = 'rooms' | 'furniture' | 'finishes'
export const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'rooms', label: 'Rooms', icon: 'space_dashboard' },
  { key: 'furniture', label: 'Furniture', icon: 'weekend' },
  { key: 'finishes', label: 'Finishes', icon: 'format_paint' },
]

/* ── Rooms (J-Q6 · J-Q18) ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function RoomsPanel({ plan, sel, library, readOnly, drawing, onDraw, onAdd, onPick, plans, onTrace, moveUnderlay, onMoveUnderlay, onUnderlay, levels, level, onLevels, toPlace = [], onPlaceNext, onSkipPlace, onResize }: {
  plan: PlanDoc; sel: Sel; library: LibraryMaterial[]; readOnly: boolean
  /** (parity map, TD-075) the layout's levels, the one on screen, and what the panel may do with them */
  levels: LevelView[]; level: string
  onLevels: (a: 'add' | 'rename' | 'remove') => void
  drawing: boolean; onDraw: () => void; onAdd: (kind: RoomKind) => void; onPick: (id: string) => void
  /** the project's floor plans a layout can trace */ plans: { id: string; name: string; scale: number | null }[]
  onTrace: (planId: string) => void
  moveUnderlay: boolean; onMoveUnderlay: (on: boolean) => void
  onUnderlay: (patch: { visible?: boolean; opacity?: number; remove?: true }) => void
  /** (pending modules S28) the rooms still to place on a floor-plan photo — a row goes next, its × takes it off the list */
  toPlace?: ToPlace[]; onPlaceNext?: (i: number) => void; onSkipPlace?: (i: number) => void
  /** (S28) Change its size… — the floor plan under the drawing given its size again */ onResize?: () => void
}) {
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const [traceMenu, setTraceMenu] = useState(false)
  const traceAnchor = useRef<HTMLSpanElement>(null)
  /* (the calm UI build, 6-16) the floor plan's own ⋮ — Remove floor plan, the card's one destructive press, out of the card's line */
  const [planMenu, setPlanMenu] = useState(false)
  const planAnchor = useRef<HTMLButtonElement | null>(null)
  const indoor = plan.rooms.filter((r) => !OUTDOOR.includes(r.kind)).reduce((n, r) => n + r.w * r.d, 0)
  const u = plan.underlay
  const lv = levels.find((l) => l.id === level) ?? levels[0]
  const many = levels.length > 1
  const sub = plan.rooms.length ? `${plan.rooms.length} ${plan.rooms.length === 1 ? 'room' : 'rooms'} · ${areaText(indoor)} inside` : 'Add a room, or draw one on the plan'
  return (
    <Panel title="Rooms" sub={many && lv ? `${lv.name} · ${sub}` : sub} testId="planner-rooms-panel">
      {!readOnly ? (
        <div className={styles.actions}>
          <span ref={anchor}><Button variant="secondary" appearance="outlined" onPress={() => setMenu((o) => !o)} iconStart={<Icon name="add" size={20} weight={300} />} iconEnd={<Icon name="arrow_drop_down" size={20} />} aria-haspopup="menu" aria-expanded={menu} data-testid="planner-add-room">Add a room</Button></span>
          <Tooltip label={drawing ? 'Drag on the plan to draw it — Esc stops' : 'Drag a rectangle on the Top view'}>
            <span><Button variant="secondary" appearance={drawing ? 'filled' : 'outlined'} onPress={onDraw} iconStart={<Icon name="draw" size={20} weight={300} />} aria-pressed={drawing} data-testid="planner-draw-room">{drawing ? 'Drawing…' : 'Draw a room'}</Button></span>
          </Tooltip>
          <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} role="menu" width={240} sheetTitle="Add a room">
            {ROOM_PRESETS.map((p) => <DropdownItem key={p.kind} onSelect={() => { setMenu(false); onAdd(p.kind) }} meta={sizeText(p.w, p.d)}>{p.name}</DropdownItem>)}
          </PortalMenu>
        </div>
      ) : null}
      {/* (pending modules S28) the rooms still to place on the floor-plan photo, in order — the first is drawn next */}
      {toPlace.length && !readOnly ? (
        <div className={styles.card} data-testid="planner-to-place">
          <span className={styles.cardHead}><Icon name="draw" size={20} weight={300} /><span className={styles.cardTitle}>{`To place on the plan · ${toPlace.length}`}</span></span>
          <span className={styles.cardText}>{drawing ? 'Drag a rectangle over each room on the plan — the first below goes next.' : 'Press a room to place it next, then drag a rectangle over it on the plan.'}</span>
          <ul className={styles.list} aria-label="Rooms to place">
            {toPlace.map((t, i) => (
              <li key={`${t.name}-${i}`} className={styles.placeRow}>
                <button type="button" className={styles.row} data-on={i === 0 && drawing ? '' : undefined} aria-pressed={i === 0 && drawing} onClick={() => onPlaceNext?.(i)} data-testid="planner-to-place-row">
                  <span className={styles.rowText}><span className={styles.rowName}>{t.name}</span>{i === 0 || KIND_LABEL[t.kind] !== t.name ? <span className={styles.rowSub}>{i === 0 ? (drawing ? 'Next — drag over it on the plan' : 'Next') : KIND_LABEL[t.kind]}</span> : null}</span>
                </button>
                <Tooltip label="Not on this plan"><IconButton icon="close" label={`${t.name} — not on this plan`} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => onSkipPlace?.(i)} /></Tooltip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {plan.rooms.length ? (
        <ul className={styles.list} aria-label="Rooms" data-testid="planner-room-list">
          {plan.rooms.map((r) => {
            const on = sel?.kind === 'room' && sel.id === r.id
            return (
              <li key={r.id}>
                <button type="button" className={styles.row} data-on={on || undefined} aria-pressed={on} onClick={() => onPick(r.id)}>
                  <span className={styles.dot} style={{ ['--sw' as string]: floorLook(r, library).hex } as CSSProperties} aria-hidden />
                  <span className={styles.rowText}><span className={styles.rowName}>{r.name}</span><span className={styles.rowSub}>{`${sizeText(r.w, r.d)} · ${areaText(r.w * r.d)}`}</span></span>
                  <Icon name="chevron_right" size={20} weight={300} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
      {/* (J-Q18) the project's floor plan under the drawing, at its true size — (the calm UI build 2026-10-27, 6-16 · W-417 · W-266 · W-133 · W-396)
          said plainly: "Floor plan underneath" over its name, "Line up the floor plan", "Set its size…", and Remove floor plan in the card's ⋮ */}
      {u ? (
        <div className={styles.card} data-testid="planner-underlay">
          <span className={styles.cardHead}>
            <Icon name="layers" size={20} weight={300} />
            <span className={styles.cardHeadText}><span className={styles.cardTitle}>Floor plan underneath</span>{u.name ? <span className={styles.cardText}>{u.name}</span> : null}</span>
            {!readOnly ? (
              <Tooltip label="More actions" disabled={planMenu}>
                <IconButton icon="more_vert" label="More actions for the floor plan" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={planMenu}
                            onClick={(e) => { planAnchor.current = e.currentTarget; setPlanMenu((o) => !o) }} data-testid="planner-underlay-menu" />
              </Tooltip>
            ) : null}
          </span>
          <PortalMenu open={planMenu} anchor={planAnchor} onClose={() => setPlanMenu(false)} role="menu" align="right" width={220} sheetTitle="Floor plan underneath">
            <DropdownItem tone="danger" onSelect={() => { setPlanMenu(false); onUnderlay({ remove: true }) }}><span data-testid="planner-underlay-remove">Remove floor plan</span></DropdownItem>
          </PortalMenu>
          <label className={styles.switchRow}><Switch size="sm" isSelected={u.visible} isDisabled={readOnly} onChange={(v: boolean) => onUnderlay({ visible: v })} aria-label="Show the floor plan" /><span>Show the floor plan</span></label>
          <Chips label="How strong" options={[{ value: '0.25', label: 'Faint' }, { value: '0.5', label: 'Half' }, { value: '0.8', label: 'Strong' }]} value={u.opacity <= 0.3 ? '0.25' : u.opacity >= 0.7 ? '0.8' : '0.5'} onChange={(v) => onUnderlay({ opacity: Number(v) })} disabled={readOnly || !u.visible} />
          {!readOnly ? <label className={styles.switchRow}><Switch size="sm" isSelected={moveUnderlay} isDisabled={!u.visible} onChange={(v: boolean) => onMoveUnderlay(v)} aria-label="Move the floor plan" /><span>Line up the floor plan</span></label> : null}
          {!readOnly && onResize ? <button type="button" className={styles.link} onClick={onResize} data-testid="planner-resize">Set its size…</button> : null}   {/* (pending modules S28) */}
        </div>
      ) : plans.length && !readOnly ? (
        <div className={styles.card}>
          <span className={styles.cardHead}><Icon name="layers" size={20} weight={300} /><span className={styles.cardTitle}>Trace the floor plan</span></span>
          <span className={styles.cardText}>Lay the project’s floor plan under the drawing at its true size, then draw the rooms over it.</span>
          <span ref={traceAnchor}><Button variant="secondary" appearance="outlined" onPress={() => setTraceMenu((o) => !o)} iconEnd={<Icon name="arrow_drop_down" size={20} />} aria-haspopup="menu" aria-expanded={traceMenu}>Pick a floor plan</Button></span>
          <PortalMenu open={traceMenu} anchor={traceAnchor} onClose={() => setTraceMenu(false)} role="menu" width={280} sheetTitle="Trace the floor plan">
            {plans.map((f) => <DropdownItem key={f.id} onSelect={() => { setTraceMenu(false); onTrace(f.id) }} disabled={!f.scale} title={f.scale ? undefined : 'Set its scale on the Floor plan tab first'}>{f.name}</DropdownItem>)}
          </PortalMenu>
        </div>
      ) : null}
      {/* (parity map, TD-075 — 1.0's multi-floor plans) the levels: one quiet button while there is one; the stage switches between them */}
      {many && lv ? (
        <div className={styles.card} data-testid="planner-levels">
          <span className={styles.cardHead}><Icon name="flip_to_front" size={20} weight={300} /><span className={styles.cardTitle}>{`${lv.name} · ${levels.findIndex((l) => l.id === lv.id) + 1} of ${levels.length} levels`}</span></span>
          <span className={styles.cardText}>Each level is drawn on its own — switch levels on the plan, top right.</span>
          {!readOnly ? (
            <div className={styles.actions}>
              <Button variant="secondary" appearance="outlined" onPress={() => onLevels('rename')} data-testid="planner-level-rename">Rename</Button>
              <Tooltip label={lv.id === LEVEL_ONE ? 'Level 1 stays — the levels above it can go' : `Remove ${lv.name} and everything on it`}>
                <span><Button variant="secondary" appearance="outlined" onPress={() => onLevels('remove')} isDisabled={lv.id === LEVEL_ONE} data-testid="planner-level-remove">Remove</Button></span>
              </Tooltip>
              {levels.length < MAX_LEVELS ? <Button variant="secondary" appearance="text" onPress={() => onLevels('add')} iconStart={<Icon name="add" size={20} weight={300} />} data-testid="planner-add-level">Add a level</Button> : null}
            </div>
          ) : null}
        </div>
      ) : !readOnly ? (
        <button type="button" className={styles.link} onClick={() => onLevels('add')} data-testid="planner-add-level">+ Add a level</button>
      ) : null}
    </Panel>
  )
}

/* ── Furniture (J-Q7) ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function PieceThumb({ c, size = 56 }: { c: Pick<CatalogueItem, 'key' | 'w' | 'd' | 'h'>; size?: number }) {
  const m = Math.max(c.w, c.d) * 0.12
  return (
    <svg className={styles.thumb} width={size} height={size} viewBox={`${-c.w / 2 - m} ${-c.d / 2 - m} ${c.w + 2 * m} ${c.d + 2 * m}`} aria-hidden>
      <PieceGlyph p={{ id: c.key, key: c.key, x: 0, z: 0, rot: 0, w: c.w, d: c.d, h: c.h, color: null, finish: null }} unit={Math.max(c.w, c.d) / size} />
    </svg>
  )
}
export function FurniturePanel({ readOnly, onPlace, onPlaceDescribed, count }: { readOnly: boolean; onPlace: (key: string) => void; onPlaceDescribed: (d: Described) => void; count: number }) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<'all' | Group>('all')
  const list = useMemo(() => searchPieces(q).filter((c) => group === 'all' || c.group === group), [q, group])
  /* (parity map, TD-090) a description — "a 3-seater sofa in grey" — read into the closest piece, by rule (a stand-in for 1.0's model) */
  const said = useMemo(() => (q.trim().split(/\s+/).length >= 2 ? describePiece(q) : null), [q])
  const offer = said && (!list.length || said.color || said.sized) ? said : null
  return (
    <Panel title="Furniture" sub={readOnly ? `${count} placed` : `${CATALOGUE.length} pieces · press one to place it${count ? ` · ${count} placed` : ''}`} testId="planner-furniture-panel">
      <span className={styles.search}><SearchBar appearance="outlined" size="md" placeholder={readOnly ? `Search ${CATALOGUE.length} pieces` : 'Search, or describe a piece'} aria-label="Search furniture, or describe a piece" value={q} onChange={setQ} /></span>
      {offer && !readOnly ? (
        <div className={styles.card} data-testid="planner-described">
          <span className={styles.cardHead}><Icon name="search" size={20} weight={300} /><span className={styles.cardTitle}>Closest piece to your words</span></span>
          <div className={styles.described}>
            <PieceThumb c={{ key: offer.item.key, w: offer.w, d: offer.d, h: offer.h }} size={48} />
            <span className={styles.rowText}>
              <span className={styles.rowName}>{offer.item.name}</span>
              <span className={styles.rowSub}>{[offer.colorName, `${offer.w} × ${offer.d} × ${offer.h} cm`].filter(Boolean).join(' · ')}</span>
            </span>
            <Button variant="secondary" appearance="outlined" onPress={() => onPlaceDescribed(offer)} data-testid="planner-place-described">Place it</Button>
          </div>
        </div>
      ) : null}
      <Chips label="Groups" options={[{ value: 'all', label: 'All' }, ...GROUPS.map((g) => ({ value: g.key, label: g.label }))]} value={group} onChange={(v) => setGroup(v as 'all' | Group)} />
      {list.length ? (
        <div className={styles.pieces} role="list" data-testid="planner-catalogue">
          {list.map((c) => (
            <button key={c.key} type="button" role="listitem" className={styles.piece} disabled={readOnly} onClick={() => onPlace(c.key)}
                    draggable={!readOnly} onDragStart={(e) => { e.dataTransfer.setData('text/x-om-piece', c.key); e.dataTransfer.effectAllowed = 'copy' }} data-testid="planner-piece" data-key={c.key}>
              <PieceThumb c={c} />
              <span className={styles.pieceName}>{c.name}</span>
              <span className={styles.pieceSize}>{`${c.w} × ${c.d} cm`}</span>
            </button>
          ))}
        </div>
      ) : offer ? null : <span className={styles.none}>{`Nothing matches “${q.trim()}”.`}</span>}
    </Panel>
  )
}

/* ── Finishes (J-Q10) ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function FinishesPanel({ plan, roomId, onRoom, library, readOnly, onFinish, onEveryRoom, roomsOnStage = false }: {
  plan: PlanDoc; roomId: string | null; onRoom: (id: string) => void; library: LibraryMaterial[]; readOnly: boolean
  /** (the calm UI build 2026-10-27, 6-31) in 3D and Walk beside the stage the rooms are the stage's strip — one place, not two; the panel's sub names the room */
  roomsOnStage?: boolean
  onFinish: (roomId: string, surface: 'floor' | 'wall', id: string | null) => void
  onEveryRoom: (surface: 'floor' | 'wall', id: string | null) => void
}) {
  const [surface, setSurface] = useState<'floor' | 'wall'>('floor')
  const [recent, setRecent] = useState<string[]>([])
  const room = plan.rooms.find((r) => r.id === roomId) ?? plan.rooms[0] ?? null
  if (!room) return <Panel title="Finishes" sub="Add a room first — then pick its floor and its walls" testId="planner-finishes-panel"><span className={styles.none}>No rooms yet.</span></Panel>
  const look = surface === 'floor' ? floorLook(room, library) : wallLook(room, library)
  const pick = surface === 'floor' ? room.floor : room.wall
  return (
    <Panel title="Finishes" sub={`${room.name} · ${surface === 'floor' ? 'Floor' : 'Walls'}: ${look.name ?? 'the template’s colour'}`} testId="planner-finishes-panel">
      {roomsOnStage ? null : <Chips label="Room" options={plan.rooms.map((r) => ({ value: r.id, label: r.name, swatch: (surface === 'floor' ? floorLook(r, library) : wallLook(r, library)).hex }))} value={room.id} onChange={onRoom} className={styles.roomChips} />}
      <div className={styles.surfaceRow}>
        <Chips label="Surface" options={[{ value: 'floor', label: 'Floor' }, { value: 'wall', label: 'Walls' }]} value={surface} onChange={(v) => setSurface(v === 'wall' ? 'wall' : 'floor')} testId="planner-surface" />
        {!readOnly && plan.rooms.length > 1 ? <button type="button" className={styles.link} onClick={() => onEveryRoom(surface, pick)} data-testid="planner-every-room">{`Use on every room`}</button> : null}
      </div>
      <div className={styles.picker} aria-disabled={readOnly || undefined}>
        <MaterialPicker scope={surface === 'floor' ? 'Floor' : 'Walls'} categories={SURFACE_CATEGORY_MAP[surface === 'floor' ? 'Floor' : 'Walls'] ?? []} style="" pick={pick} now={null}
                        onPick={(id) => { if (readOnly) return; onFinish(room.id, surface, id); if (id) setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8)) }}
                        library={library} own={[]} recent={recent} onRemoveOwn={() => {}} styleHint={null}
                        keepWords={{ name: 'Template colour', caption: surface === 'floor' ? 'The floor as the flat came' : 'The walls as the flat came' }} />
      </div>
    </Panel>
  )
}
