'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Chips } from '@/components/om/chips'
import { resolveSurfaceCategories } from '@/lib/visualizer/catalogue'
import type { LibraryMaterial, OwnSwatch } from '@/lib/visualizer/materials'
import type { Finishes, MaterialRef, SurfaceDef } from '@/lib/visualizer/model'
import { groupMaterialCategories, SURFACE_GROUP_ORDER, surfaceCategoriesFor, surfaceGroupFor, titleCaseLabel, type SurfaceGroup } from '@/lib/visualizer/surfaces'
import { Panel } from '../rail'
import { MaterialPicker, useSwatchCss } from './material-picker'
import { revealInPanel } from './reveal'
import styles from './panels.module.css'

/** A motif's repeat on the rows' 20px dot — two repeats show, never one stripe of a wallpaper (audit 2026-09-26). */
const DOT_REPEAT = 10

export type SurfaceSel = { kind: 'label'; key: string } | { kind: 'group'; group: SurfaceGroup } | null
/** The surfaces a selection covers: one label's instances (1.0's leaf, ×N) or a whole structural group (B-58). */
export const scopeOf = (sel: SurfaceSel, surfaces: SurfaceDef[]) => (!sel ? [] : sel.kind === 'group' ? surfaces.filter((s) => surfaceGroupFor(s.label) === sel.group) : surfaces.filter((s) => s.label.toLowerCase() === sel.key))

/**
 * Surfaces & Materials (REG-674; 1.0's two-level list and its picker, B-55…B-74): every surface on the photo in its structural group —
 * press a group to change all of it at once, open it to set each; a row's + marks another one like it, its × takes it off the list (the
 * photo never changes, 1.0's words). A selection lights its region on the photo and opens the picker; the canvas's squares select too.
 */
export function SurfacesPanel({ surfaces, finishes, pending, resolve, sel, onSelect, onPick, style, library, own, recent, onUpload, onRemoveOwn, onAdd, onDraw, onAddLike, onForget, sketch, reshaped = false, rough = false }: {
  surfaces: SurfaceDef[]
  finishes: Finishes['surfaces']
  pending: Record<string, string>
  resolve: (id: string) => MaterialRef | null
  sel: SurfaceSel
  onSelect: (sel: SurfaceSel) => void
  onPick: (ids: string[], materialId: string | null) => void
  style: string
  library: LibraryMaterial[]; own: OwnSwatch[]; recent: string[]
  onUpload: (category: string | null) => void; onRemoveOwn: (id: string) => void
  onAdd: () => void; onDraw: (target: SurfaceDef | null) => void; onAddLike: (label: string) => void; onForget: (ids: string[]) => void
  sketch: boolean
  /** (F022) The version on screen is a whole-room look — its surfaces were redrawn, only what the studio marks on it is listed. */
  reshaped?: boolean
  /** (F060) The surfaces were read roughly from a studio's own photo (`detection.source === 'fallback'`) — say so, and offer to trace. */
  rough?: boolean
}) {
  const SKETCH_WHY = 'Render the sketch into a photo first — then trace what it didn’t mark'
  const [open, setOpen] = useState<Record<string, boolean>>({})
  /* (surfaces-13) a group opened by its chevron brings its rows into view, the group's own row kept at the top */
  const listRef = useRef<HTMLDivElement>(null)
  const opened = useRef<string | null>(null)
  useEffect(() => {
    const g = opened.current
    opened.current = null
    const item = g ? Array.from(listRef.current?.children ?? []).find((el) => el.getAttribute('data-group') === g) : null
    if (item) revealInPanel(item.firstElementChild, item)
  }, [open])
  /* (F087) a row's chip is the picker's — a wallpaper wears the tile the engine lays */
  const css = useSwatchCss()
  const scope = scopeOf(sel, surfaces)
  /* (F197 · critic-13) a pick whose material is gone (a swatch taken off, a material deleted) is no pick: the header, the ticks and
     the rows read only the picks that still resolve */
  const live = (id: string): string | null => { const p = pending[id]; return p && resolve(p) ? p : null }
  const swatchOf = (id: string): { css: string | null; name: string; pending: boolean } => {
    const p = live(id); const m = p ? resolve(p) : null
    if (m) return { css: css(m, DOT_REPEAT), name: m.name, pending: true }
    const f = finishes[id]
    /* the finish as the version laid it — its colour and motif; a studio material's photo while it still has one */
    return f ? { css: css({ hex: f.hex, pattern: f.pattern ?? null, imageUrl: resolve(f.materialId)?.imageUrl ?? null }, DOT_REPEAT), name: f.name, pending: false } : { css: null, name: 'As in the photo', pending: false }
  }
  if (sel && scope.length) {
    const label = sel.kind === 'group' ? sel.group : titleCaseLabel(scope[0]!.label)
    const cats = sel.kind === 'group' ? groupMaterialCategories(sel.group) : resolveSurfaceCategories(scope[0]!.label) ?? surfaceCategoriesFor(scope[0]!.label)
    const picks = [...new Set(scope.map((s) => live(s.id)))]
    const pick = picks.length === 1 ? picks[0]! : null
    /* (F027) some of the scope changing, not all (or not to the same finish): nothing is ticked as the whole scope's, each finish
       picked for part of it is tagged, and the line says how many change */
    const mixed = picks.length > 1
    const changing = scope.filter((s) => live(s.id)).length
    const partial = mixed ? picks.filter((x): x is string => !!x) : []
    const nows = [...new Set(scope.map((s) => finishes[s.id]?.materialId ?? null))]
    const now = nows.length === 1 ? nows[0]! : null
    /* (D6 · critic-13) the version keeps the name and colour the material had when it rendered; changed since in Materials, it says so
       — the picker's *Now* swatch shows the material as it is today */
    const keptFin = now ? finishes[scope[0]!.id] ?? null : null
    const kept = keptFin?.name ?? ''
    const current = now ? resolve(now) : null
    /* (gallery-1) both said when both changed; a recoloured material's swatch isn't tagged *Now* (picking it would lay today's colour) —
       the kept finish is: *As in the photo* wears it, by its kept name */
    const renamed = !!current && !!keptFin && !!kept && current.name !== kept
    const recoloured = !!current && !!keptFin && current.hex.toLowerCase() !== keptFin.hex.toLowerCase()
    const edited = renamed && recoloured ? 'renamed and recoloured' : renamed ? 'renamed' : recoloured ? 'recoloured' : null
    const since = edited ? ` (${edited} since)` : ''
    const nowName = now ? `${kept || current?.name || ''}${since}` : nows.length > 1 ? 'Mixed' : 'As in the photo'
    const keptChip = now && keptFin ? { name: kept || current?.name || '', css: css({ hex: keptFin.hex, pattern: keptFin.pattern ?? null, imageUrl: recoloured ? null : current?.imageUrl ?? null }, DOT_REPEAT) } : null
    const pickName = pick ? resolve(pick)?.name ?? null : null
    /* (simplicity pass) a square on the photo picks its whole group — "the walls" is what a studio means; one tap narrows it to one */
    const group = sel.kind === 'group' ? sel.group : surfaceGroupFor(scope[0]!.label)
    const members = surfaces.filter((s) => surfaceGroupFor(s.label) === group)
    const leaves = [...new Map(members.map((m) => [m.label.toLowerCase(), m])).values()]
    const scopeChips = leaves.length > 1 ? (
      <Chips className={styles.scopeChips} label="Change" testId="viz-scope" value={sel.kind === 'group' ? `g:${group}` : `l:${sel.key}`}
             options={[{ value: `g:${group}`, label: `All ${group.toLowerCase()} · ${members.length}` }, ...leaves.map((l) => ({ value: `l:${l.label.toLowerCase()}`, label: titleCaseLabel(l.label) }))]}
             onChange={(v) => onSelect(v.startsWith('g:') ? { kind: 'group', group } : { kind: 'label', key: v.slice(2) })} />
    ) : null
    return (
      /* the picker and the list are two views: each opens at its top — never at the scroll the other one left (the key remounts the
         panel's scroller); scope chips inside one group keep the picker as it is */
      <Panel key={`pick:${group}`} title={label} testId="viz-picker" back={{ label: 'All surfaces', onBack: () => onSelect(null) }}
             sub={<>{scope.length > 1 ? `${scope.length} surfaces · ` : ''}Now: {nowName}{pickName ? <> · <b>→ {pickName}</b></> : mixed ? <> · <b>→ Mixed ({changing} of {scope.length} changing)</b></> : null}</>}
             actions={sel.kind === 'label' ? <Tooltip label="Redraw its outline on the photo"><IconButton icon="draw" label="Redraw its outline" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => onDraw(scope[0]!)} /></Tooltip> : undefined}>
        {scopeChips}
        <MaterialPicker scope={label} categories={cats} style={style} pick={pick} mixed={mixed} partial={partial} now={now} kept={keptChip} nowEdited={edited} onPick={(id) => onPick(scope.map((s) => s.id), id)} library={library} own={own} recent={recent} onUpload={() => onUpload(cats[0] ?? null)} onRemoveOwn={onRemoveOwn} />
      </Panel>
    )
  }
  const groups = SURFACE_GROUP_ORDER.map((g) => ({ g, members: surfaces.filter((s) => surfaceGroupFor(s.label) === g) })).filter((x) => x.members.length)
  return (
    <Panel key="list" title="Surfaces & materials" sub={surfaces.length ? `${surfaces.length} ${surfaces.length === 1 ? 'surface' : 'surfaces'} on the photo · tap one to pick its finish` : undefined} testId="viz-surfaces"
           actions={<><Tooltip label={sketch ? SKETCH_WHY : 'Draw a surface on the photo'}><IconButton icon="draw" label="Draw a surface" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={sketch} onClick={() => onDraw(null)} /></Tooltip><Tooltip label={sketch ? SKETCH_WHY : 'Add a surface by name'}><IconButton icon="add" label="Add a surface" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={sketch} onClick={onAdd} /></Tooltip></>}>
      {sketch ? (
        <div className={styles.note}><Icon name="draw" size={20} weight={300} /><span>This photo reads as a sketch. Render it into a photo first (Tools, or the button below) — then its surfaces are marked for you.</span></div>
      ) : !surfaces.length ? (
        <div className={styles.section}>
          <span className={styles.none}>{reshaped ? 'This version is a whole-room look — its surfaces aren’t marked. Draw one, or edit from the Original.' : 'No surfaces marked on this photo yet.'}</span>
          <div className={styles.actions}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="draw" size={20} weight={300} />} onPress={() => onDraw(null)}>Draw a surface</Button><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={onAdd}>Add by name</Button></div>
        </div>
      ) : (
        <>
        {rough ? (
          <div className={styles.note} data-testid="viz-rough"><Icon name="info" size={20} weight={300} /><span>Marked roughly on your photo — check the highlight, or <button type="button" className={styles.inlineLink} onClick={() => onDraw(null)}>draw a surface</button> to trace it.</span></div>
        ) : null}
        <div ref={listRef} className={styles.list} data-testid="viz-surface-list">
          {groups.map(({ g, members }) => {
            const labels = [...new Map(members.map((m) => [m.label.toLowerCase(), m])).values()]
            const sws = members.map((m) => swatchOf(m.id))
            const same = sws.every((x) => x.name === sws[0]!.name)
            const anyPending = sws.some((x) => x.pending)
            const expanded = !!open[g] && labels.length > 0
            /* (F043) a group of one surface is that surface: the row opens it by its own name (the picker's title, Redraw), and its
               + / × sit on the row — no chevron to open a list of one */
            const single = members.length === 1 ? members[0]! : null
            const on = single ? sel?.kind === 'label' && sel.key === single.label.toLowerCase() : sel?.kind === 'group' && sel.group === g
            const name = single ? titleCaseLabel(single.label) : g
            return (
              <div key={g} data-group={g}>
                <div className={styles.row} data-on={on || undefined}>
                  <button type="button" className={styles.rowMain} onClick={() => onSelect(single ? { kind: 'label', key: single.label.toLowerCase() } : { kind: 'group', group: g })}
                          aria-label={single ? `${name}: change it` : `${g}: change all ${members.length}`} data-testid="viz-surface-group">
                    <span className={styles.dotSwatch} data-none={!same || !sws[0]!.css || undefined} style={same && sws[0]!.css ? { ['--sw' as string]: sws[0]!.css } as CSSProperties : undefined} />
                    <span className={styles.texts}><span className={styles.name}>{name}</span><span className={styles.caption} data-new={anyPending || undefined}>{same ? (sws[0]!.pending ? `→ ${sws[0]!.name}` : sws[0]!.name) : anyPending ? 'Mixed — some changing' : 'Mixed'}</span></span>
                    {members.length > 1 ? <span className={styles.count}>{members.length}</span> : null}
                  </button>
                  {single ? (
                    <span className={styles.rowTools} data-hover="">
                      <Tooltip label="Mark another one like this on the photo"><IconButton icon="add" label={`Add another ${name}`} size={36} variant="bare" iconSize={18} onClick={() => onAddLike(single.label)} /></Tooltip>
                      <Tooltip label="Take off the list (the photo doesn’t change)"><IconButton icon="close" label={`Take ${name} off the list`} size={36} variant="bare" iconSize={18} onClick={() => onForget([single.id])} /></Tooltip>
                    </span>
                  ) : (
                    <Tooltip label={expanded ? 'Collapse' : `Set each of the ${g.toLowerCase()} on its own`}><IconButton icon={expanded ? 'expand_less' : 'expand_more'} label={expanded ? `Collapse ${g}` : `Expand ${g}`} size={36} variant="bare" iconSize={20} aria-expanded={expanded} onClick={() => { opened.current = expanded ? null : g; setOpen((o) => ({ ...o, [g]: !o[g] })) }} /></Tooltip>
                  )}
                </div>
                {expanded && !single ? labels.map((m) => {
                  const inst = members.filter((x) => x.label.toLowerCase() === m.label.toLowerCase())
                  const sw = swatchOf(m.id)
                  return (
                    <div key={m.id} className={styles.row} data-sub="" data-on={(sel?.kind === 'label' && sel.key === m.label.toLowerCase()) || undefined}>
                      <button type="button" className={styles.rowMain} onClick={() => onSelect({ kind: 'label', key: m.label.toLowerCase() })} data-testid="viz-surface-row">
                        <span className={styles.dotSwatch} data-none={!sw.css || undefined} style={sw.css ? { ['--sw' as string]: sw.css } as CSSProperties : undefined} />
                        <span className={styles.texts}><span className={styles.name}>{titleCaseLabel(m.label)}{inst.length > 1 ? ` ×${inst.length}` : ''}</span><span className={styles.caption} data-new={sw.pending || undefined}>{sw.pending ? `→ ${sw.name}` : sw.name}</span></span>
                      </button>
                      <span className={styles.rowTools} data-hover="">
                        <Tooltip label="Mark another one like this on the photo"><IconButton icon="add" label={`Add another ${titleCaseLabel(m.label)}`} size={36} variant="bare" iconSize={18} onClick={() => onAddLike(m.label)} /></Tooltip>
                        <Tooltip label="Take off the list (the photo doesn’t change)"><IconButton icon="close" label={`Take ${titleCaseLabel(m.label)} off the list`} size={36} variant="bare" iconSize={18} onClick={() => onForget(inst.map((x) => x.id))} /></Tooltip>
                      </span>
                    </div>
                  )
                }) : null}
              </div>
            )
          })}
        </div>
        </>
      )}
      {surfaces.length && !sketch ? <span className={styles.hint}>Missed one? Draw it on the photo, or add it by name and tap where it is.</span> : null}
    </Panel>
  )
}
