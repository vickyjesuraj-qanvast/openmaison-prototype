'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ds'
import { ChoiceCard } from '@/components/om/choice-card'
import { Chips, rovingKey } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { EMPTY_SCOPES, FURNISH_DENSITIES, leavesOut, ROOM_PROGRAMS, type EmptyScope, type FurnishDensity } from '@/lib/visualizer/tools'
import type { OpenTool, Pending, ToolAvailability } from '@/lib/visualizer/model'
import { Panel } from '../rail'
import { revealInPanel } from './reveal'
import styles from './panels.module.css'

/**
 * Tools (REG-674; 1.0's drawers and the phone's Tools tray, C-15 · C-16 · C-104 · B-102): what the next Generate does — your picks, Empty
 * the room (Keep built-ins · Strip to shell, anything else to take out) or Furnish the room (1.0's room programs, how much, what to leave
 * out, a direction) — on every width (1.0 could not furnish on a phone, MM-03). A sketch is rendered into a photo first; the note rides
 * along with any render and can be a render on its own. (F053) What can't run on the version on screen is off and says why in its
 * own card; (F169) the three cards are one radio group — one Tab stop, the arrows move and pick.
 */
export function ToolsPanel({ pending, onTool, onPatch, sketch, onUseAsPhoto, onDraw, style, tools = null, emptied = null }: {
  pending: Pending
  onTool: (t: OpenTool) => void
  onPatch: (fn: (p: Pending) => Pending, coalesce?: string) => void
  sketch: boolean
  onUseAsPhoto: () => void
  onDraw: () => void
  style: string
  /** (F053) What can run on the version on screen — `toolAvailability(…)` from the model. */
  tools?: ToolAvailability | null
  /** (new:fresh-desktop:Furnish says empty first) The room's newest emptied version, when the one on screen isn't — Furnish points to it. */
  emptied?: { n: number; onOpen: () => void } | null
}) {
  const group = useRef<HTMLDivElement>(null)
  /* (F169) the group's one Tab stop is the picked card — ChoiceCard has no tabIndex of its own, so the group sets it after each render */
  useEffect(() => {
    const cards = Array.from(group.current?.querySelectorAll<HTMLElement>(':scope > [role=radio]') ?? [])
    const on = cards.find((c) => c.getAttribute('aria-checked') === 'true' && !(c as HTMLButtonElement).disabled) ?? cards.find((c) => !(c as HTMLButtonElement).disabled)
    for (const c of cards) c.tabIndex = c === on ? 0 : -1
  })
  /* (F062) picking Empty or Furnish opens its options under the card — on a short screen they start below the panel's fold, so the
     panel scrolls them up (never the chosen card past its top); a panel opened on a tool already picked stays where it is */
  const opts = useRef<HTMLDivElement>(null)
  const shownTool = useRef(pending.tool)
  useEffect(() => {
    if (shownTool.current === pending.tool) return
    shownTool.current = pending.tool
    /* the card and its options, the card kept in sight (the one helper Furniture and Style use too) */
    const el = opts.current
    if (el) revealInPanel(el.previousElementSibling, el)
  }, [pending.tool])
  const emptyOff = !!tools && !tools.canEmpty && pending.tool !== 'empty'
  /* the version on screen can't be furnished but could be emptied — and the room already has an emptied version to furnish from */
  const openEmptied = !!emptied && !!tools && !tools.canFurnish && tools.canEmpty
  const furnishOff = !!tools && !tools.canFurnish && !tools.canEmpty && pending.tool !== 'furnish'
  const program = ROOM_PROGRAMS.find((r) => r.id === pending.furnish.room) ?? ROOM_PROGRAMS[0]!
  const density = FURNISH_DENSITIES.find((d) => d.key === pending.furnish.density) ?? FURNISH_DENSITIES[1]!
  const places = [...program.essential, ...(pending.furnish.density === 'minimal' ? [] : pending.furnish.density === 'balanced' ? program.optional.slice(0, 3) : program.optional)].filter((x) => !leavesOut(pending.furnish.leaveOut, x))
  return (
    <Panel title="Tools" sub="Whole-room passes and a surface drawn by hand — describe a change in the box above Generate" testId="viz-tools">
      {sketch && !pending.asPhoto ? (
        <div className={styles.section}>
          <div className={styles.note}><Icon name="draw" size={20} weight={300} /><span><b>Looks like a sketch.</b> Render from sketch turns it into a photo first — then every tool works on it. Pick a style to render it in that look.</span></div>
          <span className={styles.actions}><Button appearance="text" onPress={onUseAsPhoto}>Not a sketch? Use it as it is</Button></span>
        </div>
      ) : (
        <div className={styles.section}>
          <span className={styles.head}>The next Generate</span>
          <div ref={group} className={styles.field} role="radiogroup" aria-label="The next Generate" onKeyDown={(e) => { rovingKey(e, ':scope > [role=radio]') }}>
            <ChoiceCard title="Your picks" help="Surfaces, furniture, style and light — whatever you’ve picked" selected={pending.tool === null} onSelect={() => onTool(null)} />
            <ChoiceCard title="Empty the room" help={tools?.emptyWhy ?? 'Take the furniture out and keep the room’s finishes, camera and light'} selected={pending.tool === 'empty'} disabled={emptyOff} onSelect={() => onTool('empty')} />
            {pending.tool === 'empty' ? (
              <div ref={opts} className={styles.field} style={{ paddingLeft: 'var(--om-spacing-4)' }}>
                <Chips label="How far" options={EMPTY_SCOPES.map((s) => ({ value: s.key, label: s.label }))} value={pending.empty.scope} onChange={(v) => onPatch((p) => ({ ...p, empty: { ...p.empty, scope: v as EmptyScope } }))} />
                <span className={styles.hint}>{EMPTY_SCOPES.find((s) => s.key === pending.empty.scope)?.hint}</span>
                {tools && !tools.builtIns ? <span className={styles.hint}>This photo has no panelling or fitted cabinetry, so both give the same room.</span> : null}
                <TextField label="Anything else to take out" value={pending.empty.extra} onChange={(v) => onPatch((p) => ({ ...p, empty: { ...p.empty, extra: v } }), 'empty-extra')} placeholder="e.g. the ceiling fan and the radiator" />
              </div>
            ) : null}
            <ChoiceCard title="Furnish the room" help={openEmptied ? `Furnish works on an emptied version — V${emptied!.n} is one` : tools?.furnishWhy ?? `Furnish an empty room${style ? ` in ${style}` : ''} — the architecture, camera and framing stay put`} selected={pending.tool === 'furnish'} disabled={furnishOff} onSelect={() => onTool('furnish')} />
            {pending.tool === 'furnish' ? (
              <div ref={opts} className={styles.field} style={{ paddingLeft: 'var(--om-spacing-4)' }}>
                <TextField label="What room is it" mode="select" value={program.label} options={ROOM_PROGRAMS.map((r) => r.label)} onChange={(v) => onPatch((p) => ({ ...p, furnish: { ...p.furnish, room: ROOM_PROGRAMS.find((r) => r.label === v)?.id ?? p.furnish.room } }))} />
                <Chips label="How much furniture" options={FURNISH_DENSITIES.map((d) => ({ value: d.key, label: d.label }))} value={pending.furnish.density} onChange={(v) => onPatch((p) => ({ ...p, furnish: { ...p.furnish, density: v as FurnishDensity } }))} />
                {/* (style-light-tools 7 · fresh-phone 6) the density's own line, then what the render places today, in plain words */}
                <span className={styles.hint}>{density.hint}. For now it places the pieces the sample room holds.</span>
                <div className={styles.note}><Icon name="chair" size={20} weight={300} /><span><b>Will place:</b> {places.join(', ')}. <b>Never touches:</b> {program.preserve.join(', ')}.</span></div>
                <TextField label="Leave out" value={pending.furnish.leaveOut} onChange={(v) => onPatch((p) => ({ ...p, furnish: { ...p.furnish, leaveOut: v } }), 'furnish-leave')} placeholder="e.g. no TV, no rug" />
                <TextField label="Extra direction" value={pending.furnish.direction} onChange={(v) => onPatch((p) => ({ ...p, furnish: { ...p.furnish, direction: v } }), 'furnish-dir')} placeholder="e.g. seating for six, keep the window wall clear" />
                {/* (desktop-13) why Furnish waits is said once on the card and once, with the way to the emptied version, under
                    Generate — never a third time here */}
                <span className={styles.hint}>{style ? `Style: ${style} — change it in the Style tab.` : 'No style picked — the room’s own look is used. Pick one in the Style tab.'}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
      <div className={styles.section}>
        <span className={styles.head}>By hand</span>
        <span className={styles.actions}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="draw" size={20} weight={300} />} onPress={onDraw} isDisabled={sketch && !pending.asPhoto}>Draw a surface</Button></span>
        <span className={styles.hint}>{sketch && !pending.asPhoto ? 'Render the sketch into a photo first — then trace what it didn’t mark.' : 'Trace a wall, a floor or a panel the photo didn’t mark — it joins the Surfaces list.'}</span>
      </div>
    </Panel>
  )
}
