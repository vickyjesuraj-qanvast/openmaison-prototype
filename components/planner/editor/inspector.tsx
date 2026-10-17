'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { Panel } from '@/components/visualizer/editor/rail'
import { MaterialPicker } from '@/components/visualizer/editor/panels/material-picker'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { PIECE_COLOURS, PIECE_COLOUR_NAMES, catalogueItem, pieceName } from '@/lib/planner/catalogue'
import { floorLook, pieceLook, wallLook } from '@/lib/planner/look'
import { KIND_LABEL, SIDES, SIDE_LABEL, areaText, clamp, roomAt, sizeText, type Opening, type Piece, type PlanDoc, type Room, type RoomKind, type Side } from '@/lib/planner/model'
import styles from './inspector.module.css'

/** (J-Q10) The eight colours, by the names a studio says them (lib/planner/catalogue.ts — a described piece names them too). */
const COLOUR_NAMES = PIECE_COLOUR_NAMES

/** A length in centimetres: typed freely, kept on Enter or when the field is left, held inside its limits. */
export function CmField({ label, value, min, max, onCommit, disabled, unit = 'cm', testId }: { label: string; value: number; min: number; max: number; onCommit: (v: number) => void; disabled?: boolean; unit?: string; testId?: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [seen, setSeen] = useState(value)
  if (seen !== value) { setSeen(value); setDraft(null) }   // a drag or an Undo moved it: show the new value (render-phase adjust)
  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n)) onCommit(clamp(Math.round(n), min, max))
  }
  return (
    <div className={styles.cm} data-testid={testId} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }} onBlur={commit}>
      <TextField label={label} value={draft ?? String(value)} onChange={setDraft} numeric="digits" size="s" disabled={disabled} trailing={<span className={styles.unit} aria-hidden>{unit}</span>} />
    </div>
  )
}

/* ── a piece ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function PieceInspector({ p, plan, library, readOnly, overlap, onChange, onDuplicate, onRemove, onClose }: {
  p: Piece; plan: PlanDoc; library: LibraryMaterial[]; readOnly: boolean
  /** what it runs into: "the wall", "the 3-seater sofa" */ overlap: string | null
  onChange: (patch: Partial<Piece>) => void; onDuplicate: () => void; onRemove: () => void; onClose?: () => void
}) {
  const c = catalogueItem(p.key)
  const room = roomAt(plan.rooms, p.x, p.z)
  const [materials, setMaterials] = useState(!!p.finish)
  const colour = p.finish ? 'material' : p.color ?? 'own'
  return (
    <Panel title={pieceName(p.key)} sub={[room?.name ?? 'Outside the rooms', `${p.w} × ${p.d} × ${p.h} cm`].join(' · ')}
           actions={onClose ? <Tooltip label="Let go"><IconButton icon="close" label="Let go of the piece" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onClose} /></Tooltip> : undefined} testId="planner-inspector">
      {overlap ? <p className={styles.warn} role="status" data-testid="planner-overlap"><Icon name="warning" size={18} weight={300} />{`Overlaps ${overlap}`}</p> : null}
      <div className={styles.section}>
        <span className={styles.head}>Size</span>
        <div className={styles.three}>
          <CmField label="Width" value={p.w} min={10} max={1200} onCommit={(w) => onChange({ w })} disabled={readOnly} testId="planner-w" />
          <CmField label="Depth" value={p.d} min={10} max={1200} onCommit={(d) => onChange({ d })} disabled={readOnly} testId="planner-d" />
          <CmField label="Height" value={p.h} min={1} max={400} onCommit={(h) => onChange({ h })} disabled={readOnly} />
        </div>
        {c && (c.w !== p.w || c.d !== p.d || c.h !== p.h) && !readOnly ? <button type="button" className={styles.link} onClick={() => onChange({ w: c.w, d: c.d, h: c.h })}>{`Back to ${c.w} × ${c.d} × ${c.h} cm`}</button> : null}
      </div>
      <div className={styles.section}>
        <span className={styles.head}>Turn</span>
        <div className={styles.turn}>
          <Button variant="secondary" appearance="outlined" isDisabled={readOnly} onPress={() => onChange({ rot: (p.rot + 270) % 360 })} iconStart={<Icon name="undo" size={20} weight={300} />}>Left</Button>
          <Button variant="secondary" appearance="outlined" isDisabled={readOnly} onPress={() => onChange({ rot: (p.rot + 90) % 360 })} iconStart={<Icon name="redo" size={20} weight={300} />} data-testid="planner-turn">Right</Button>
          <CmField label="Angle" unit="°" value={p.rot} min={0} max={359} onCommit={(rot) => onChange({ rot })} disabled={readOnly} />
        </div>
      </div>
      <div className={styles.section}>
        <span className={styles.head}>Colour</span>
        <Chips label="Colour" disabled={readOnly} options={[{ value: 'own', label: 'Its own', swatch: c?.color ?? null }, ...PIECE_COLOURS.map((h, i) => ({ value: h, label: COLOUR_NAMES[i]!, swatch: h })), ...(p.finish ? [{ value: 'material', label: pieceLook(p, library).name ?? 'Material', swatch: pieceLook(p, library).hex }] : [])]}
               value={colour} onChange={(v) => { if (v === 'own') onChange({ color: null, finish: null }); else if (v !== 'material') onChange({ color: v, finish: null }) }} testId="planner-colour" />
        {!readOnly ? <button type="button" className={styles.link} aria-expanded={materials} onClick={() => setMaterials((o) => !o)}>{materials ? 'Hide the materials' : 'Pick a material instead'}</button> : null}
        {materials && !readOnly ? (
          <MaterialPicker scope="Furniture" categories={['Fabrics', 'Laminates', 'Metals']} style="" pick={p.finish} now={null} onPick={(id) => onChange({ finish: id, color: null })}
                          library={library} own={[]} recent={[]} onRemoveOwn={() => {}} styleHint={null} keepWords={{ name: 'Its colour', caption: 'The colour picked above' }} />
        ) : null}
      </div>
      {!readOnly ? (
        <div className={styles.foot}>
          <Button variant="secondary" appearance="outlined" onPress={onDuplicate} iconStart={<Icon name="content_copy" size={20} weight={300} />} data-testid="planner-duplicate">Duplicate</Button>
          <Button variant="secondary" appearance="outlined" onPress={onRemove} iconStart={<Icon name="delete" size={20} weight={300} />} data-testid="planner-remove">Remove</Button>
        </div>
      ) : null}
    </Panel>
  )
}

/* ── a room ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const KINDS = Object.keys(KIND_LABEL) as RoomKind[]
export function RoomInspector({ r, library, readOnly, onChange, onAddOpening, onPickOpening, onRemoveOpening, onFinishes, onRemove, onClose, onArrange, arrangeWhy, onElevations }: {
  r: Room; library: LibraryMaterial[]; readOnly: boolean
  /** (parity map, TD-088) the room's ⋮ › Arrange the furniture, and why it can't (no rule for the room, a read-only layout) */
  onArrange: () => void; arrangeWhy: string | null
  /** (parity map, TD-091) the room's ⋮ › Wall elevations… */ onElevations: () => void
  onChange: (patch: Partial<Room>) => void
  onAddOpening: (kind: 'door' | 'window', side: Side) => void
  onPickOpening: (id: string) => void
  onRemoveOpening: (id: string) => void
  onFinishes: (surface: 'floor' | 'wall') => void
  onRemove: () => void
  onClose?: () => void
}) {
  const [name, setName] = useState<string | null>(null)
  const [adding, setAdding] = useState<null | 'door' | 'window'>(null)
  const doorRef = useRef<HTMLSpanElement>(null), winRef = useRef<HTMLSpanElement>(null)
  const kebab = useRef<HTMLSpanElement>(null)
  const [menu, setMenu] = useState(false)
  const commitName = () => { if (name === null) return; const v = name.trim().slice(0, 60); setName(null); if (v && v !== r.name) onChange({ name: v }) }
  const standing = SIDES.filter((s) => r.walls[s])
  return (
    <Panel title={r.name} sub={`${sizeText(r.w, r.d)} · ${areaText(r.w * r.d)}`}
           actions={<>
             <span ref={kebab}><Tooltip label="More for this room" disabled={menu}><IconButton icon="more_vert" label="More for this room" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} data-testid="planner-room-menu" /></Tooltip></span>
             {onClose ? <Tooltip label="Let go"><IconButton icon="close" label="Let go of the room" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onClose} /></Tooltip> : null}
             <PortalMenu open={menu} anchor={kebab} onClose={() => setMenu(false)} role="menu" align="right" width={280} sheetTitle={r.name}>
               <DropdownItem onSelect={() => { setMenu(false); onArrange() }} disabled={!!arrangeWhy} title={arrangeWhy ?? undefined} help={arrangeWhy ? undefined : 'Places its main pieces by the rule — Undo puts back what was there'}>Arrange the furniture</DropdownItem>
               <DropdownDivider />
               <DropdownItem onSelect={() => { setMenu(false); onElevations() }} help="Each wall as you face it, the pieces against it to scale">Wall elevations…</DropdownItem>
             </PortalMenu>
           </>} testId="planner-inspector">
      <div className={styles.section} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitName() } }} onBlur={commitName}>
        <TextField label="Name" value={name ?? r.name} onChange={setName} disabled={readOnly} maxLength={60} size="s" />
        <TextField label="Kind of room" mode="select" options={KINDS.map((k) => KIND_LABEL[k])} value={KIND_LABEL[r.kind]} onChange={(v) => { const k = KINDS.find((x) => KIND_LABEL[x] === v); if (k) onChange({ kind: k }) }} disabled={readOnly} size="s" />
      </div>
      <div className={styles.section}>
        <span className={styles.head}>Size</span>
        <div className={styles.three}>
          <CmField label="Width" value={r.w} min={50} max={3000} onCommit={(w) => onChange({ w })} disabled={readOnly} testId="planner-room-w" />
          <CmField label="Depth" value={r.d} min={50} max={3000} onCommit={(d) => onChange({ d })} disabled={readOnly} testId="planner-room-d" />
          <CmField label="Ceiling" value={r.height} min={200} max={600} onCommit={(height) => onChange({ height })} disabled={readOnly} />
        </div>
      </div>
      <div className={styles.section}>
        <span className={styles.head}>Walls</span>
        <Chips multiple label="Walls standing" disabled={readOnly} options={SIDES.map((s) => ({ value: s, label: SIDE_LABEL[s] }))} value={standing}
               onChange={(v) => onChange({ walls: { n: v.includes('n'), e: v.includes('e'), s: v.includes('s'), w: v.includes('w') } })} testId="planner-walls" />
        <span className={styles.help}>A side left off has no wall — for an open kitchen or a living room open to its dining.</span>
      </div>
      <div className={styles.section}>
        <span className={styles.head}>Doors and windows</span>
        {r.openings.length ? (
          <ul className={styles.openings}>
            {r.openings.map((o) => (
              <li key={o.id} className={styles.opening}>
                <button type="button" className={styles.openingPick} onClick={() => onPickOpening(o.id)}>
                  <Icon name={o.kind === 'door' ? 'crop_portrait' : 'view_column'} size={20} weight={300} />
                  <span>{`${o.kind === 'door' ? 'Door' : 'Window'} · ${SIDE_LABEL[o.side]} · ${o.width} cm`}</span>
                </button>
                {!readOnly ? <Tooltip label="Remove"><IconButton icon="close" label={`Remove the ${o.kind}`} size={36} variant="bare" iconSize={18} iconWeight={300} onClick={() => onRemoveOpening(o.id)} /></Tooltip> : null}
              </li>
            ))}
          </ul>
        ) : <span className={styles.help}>No doors or windows yet.</span>}
        {!readOnly ? (
          <div className={styles.turn}>
            <span ref={doorRef}><Button variant="secondary" appearance="outlined" onPress={() => setAdding((a) => (a === 'door' ? null : 'door'))} iconStart={<Icon name="add" size={20} weight={300} />} aria-haspopup="menu" aria-expanded={adding === 'door'} data-testid="planner-add-door">Door</Button></span>
            <span ref={winRef}><Button variant="secondary" appearance="outlined" onPress={() => setAdding((a) => (a === 'window' ? null : 'window'))} iconStart={<Icon name="add" size={20} weight={300} />} aria-haspopup="menu" aria-expanded={adding === 'window'} data-testid="planner-add-window">Window</Button></span>
            <PortalMenu open={!!adding} anchor={adding === 'window' ? winRef : doorRef} onClose={() => setAdding(null)} role="menu" width={220} sheetTitle={adding === 'window' ? 'Add a window on' : 'Add a door on'}>
              {SIDES.map((s) => <DropdownItem key={s} onSelect={() => { const k = adding; setAdding(null); if (k) onAddOpening(k, s) }} meta={`${s === 'n' || s === 's' ? r.w : r.d} cm long`}>{`The ${SIDE_LABEL[s].toLowerCase()} side`}</DropdownItem>)}
            </PortalMenu>
          </div>
        ) : null}
      </div>
      <div className={styles.section}>
        <span className={styles.head}>Finishes</span>
        {(['floor', 'wall'] as const).map((s) => {
          const look = s === 'floor' ? floorLook(r, library) : wallLook(r, library)
          return (
            <button key={s} type="button" className={styles.finish} onClick={() => onFinishes(s)}>
              <span className={styles.swatch} style={{ ['--sw' as string]: look.hex } as React.CSSProperties} aria-hidden />
              <span className={styles.finishText}><span className={styles.finishLabel}>{s === 'floor' ? 'Floor' : 'Walls'}</span><span>{look.name ?? 'Template colour'}</span></span>
              <Icon name="chevron_right" size={20} weight={300} />
            </button>
          )
        })}
      </div>
      {!readOnly ? <div className={styles.foot}><Button variant="secondary" appearance="outlined" onPress={onRemove} iconStart={<Icon name="delete" size={20} weight={300} />} data-testid="planner-remove-room">Remove the room</Button></div> : null}
    </Panel>
  )
}

/* ── a door or a window ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function OpeningInspector({ o, r, readOnly, onChange, onRemove, onRoom, onClose }: {
  o: Opening; r: Room; readOnly: boolean; onChange: (patch: Partial<Opening>) => void; onRemove: () => void; onRoom: () => void; onClose?: () => void
}) {
  const len = o.side === 'n' || o.side === 's' ? r.w : r.d
  return (
    <Panel title={o.kind === 'door' ? 'Door' : 'Window'} sub={`${r.name} · the ${SIDE_LABEL[o.side].toLowerCase()} side`}
           actions={onClose ? <Tooltip label="Let go"><IconButton icon="close" label="Let go" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onClose} /></Tooltip> : undefined} testId="planner-inspector">
      <span className={styles.help}>Drag it along its wall on the Top view.</span>
      <div className={styles.section}>
        <div className={styles.three}>
          <CmField label="Width" value={o.width} min={30} max={Math.max(30, len - 10)} onCommit={(width) => onChange({ width })} disabled={readOnly} />
          {o.kind === 'window' ? <CmField label="Sill" value={o.sill ?? 90} min={0} max={250} onCommit={(sill) => onChange({ sill })} disabled={readOnly} /> : null}
          {o.kind === 'window' ? <CmField label="Height" value={o.height ?? 120} min={30} max={300} onCommit={(height) => onChange({ height })} disabled={readOnly} /> : null}
        </div>
      </div>
      {o.kind === 'door' ? (
        <div className={styles.section}>
          <span className={styles.head}>Opens from</span>
          <Chips label="Hinge" disabled={readOnly} options={[{ value: 'left', label: 'The left' }, { value: 'right', label: 'The right' }]} value={o.swing ?? 'left'} onChange={(v) => onChange({ swing: v === 'right' ? 'right' : 'left' })} />
        </div>
      ) : null}
      <div className={styles.foot}>
        <Button variant="secondary" appearance="outlined" onPress={onRoom}>{`Back to ${r.name}`}</Button>
        {!readOnly ? <Button variant="secondary" appearance="outlined" onPress={onRemove} iconStart={<Icon name="delete" size={20} weight={300} />}>Remove</Button> : null}
      </div>
    </Panel>
  )
}
