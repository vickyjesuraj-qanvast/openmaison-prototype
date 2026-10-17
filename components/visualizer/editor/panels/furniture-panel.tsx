'use client'

import { useEffect, useRef } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { COLOUR_HEX, finishRowFor, FURNITURE_COLOURS, FURNITURE_PRESETS, KEEP, nextPick, PART_WORD, suggestReplacements, type FurnitureAction, type FurniturePick } from '@/lib/visualizer/furniture'
import { pickNeeds, pieceRemoveBlock, type Finishes, type FurnitureDef, type ToolAvailability } from '@/lib/visualizer/model'
import { labelInText, normFurnitureKey, titleCaseLabel } from '@/lib/visualizer/surfaces'
import { Panel } from '../rail'
import { furnitureGlyph } from './furniture-glyph'
import { revealInPanel } from './reveal'
import styles from './panels.module.css'

const ACTIONS: { value: Exclude<FurnitureAction, 'keep'>; label: string }[] = [{ value: 'remove', label: 'Remove' }, { value: 'replace', label: 'Replace' }, { value: 'customize', label: 'Customize' }]
/** (new:fresh-desktop:quick pick cut mid-word) Words the studio typed, cut at a word with "…" — never mid-word. */
function clipWords(text: string, max = 40): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max + 1), at = cut.lastIndexOf(' ')
  return `${(at > max / 2 ? cut.slice(0, at) : t.slice(0, max)).replace(/[\s,.;:—–-]+$/, '')}…`
}
/** (surfaces-20) A finish that names a colour of its own ("Matte black pot", "Black frame", "Gloss white") loses that word when a
    colour is picked with it — "Navy matte pot", never "Navy matte black pot". */
const FINISH_COLOUR_WORD = /\b(?:black|white|cream)\b/gi
function customizeWords(colour: string | null, finish: string | null): string {
  const f = finish ? (colour ? finish.replace(FINISH_COLOUR_WORD, '').replace(/\s{2,}/g, ' ').trim() : finish).toLowerCase() : ''
  return [colour, f].filter(Boolean).join(' ')
}

/**
 * Furniture (REG-674; 1.0's rows, B-76…B-84): one row per piece — identical ones as one row ×N, whatever you pick reaching every one;
 * Remove · Replace · Customize (press the active one again to keep it); Replace offers 1.0's quick picks for the style, a description
 * and a photo; Customize its finish table for the piece and twelve colours. Remove lifts the piece out where the room has an empty plate
 * (the engine's rule, audit §5.1) — elsewhere the chip is off and the line under it says why (F037 · F053).
 * (F038 · F012) A row on a version says what that version already did to the piece ("Now: Emerald velvet · Keep"); (F032) a Replace or a
 * Customize that can't render yet says what it still needs.
 */
export function FurniturePanel({ furniture, picks, sel, onSelect, onPick, style, canRemove, tools = null, customized = {}, onAdd, onAddLike, onForget, onRefPhoto, onRecolour, reshaped }: {
  furniture: FurnitureDef[]
  picks: Record<string, FurniturePick>
  sel: string | null
  onSelect: (key: string | null) => void
  onPick: (ids: string[], pick: FurniturePick) => void
  style: string
  /** @deprecated — pass `tools` (it says why too). Read only when `tools` is absent. */
  canRemove?: boolean
  /** (F053) What can run on the version on screen — Remove's refusal and its reason. */
  tools?: ToolAvailability | null
  /** (F038 · F012) The version's own changes to a piece — `finishes.customized` (id → the words it was restyled to). */
  customized?: Finishes['customized']
  onAdd: () => void
  onAddLike: (label: string, category: string) => void
  onForget: (ids: string[]) => void
  onRefPhoto: (ids: string[]) => void
  /** (pending modules S20 — Q-21 as she answered) Replace's pick as a Customize — the piece keeps its shape and takes the pick's colour. */
  onRecolour?: (ids: string[]) => void
  reshaped: boolean
}) {
  const removeWhy = tools ? tools.removeWhy : canRemove === false ? 'Taking a piece out isn’t available on this photo yet' : null
  const groups = [...new Map(furniture.map((f) => [normFurnitureKey(f.label), f])).entries()].map(([key, f]) => ({ key, f, ids: furniture.filter((x) => normFurnitureKey(x.label) === key).map((x) => x.id) }))
  /* (surfaces-13) a piece picked — on the photo or in the list — brings its row and what opened under it into view, the row kept at
     the top when both don't fit (the Tools panel's helper); an action that opens options brings its first options group in, starting
     from the action chips when the row and the group don't fit together. A panel opening on a piece already picked (a marker tapped
     with the tray closed) brings it in too. */
  const list = useRef<HTMLDivElement>(null)
  const selAction = sel ? (picks[groups.find((g) => g.key === sel)?.ids[0] ?? ''] ?? KEEP).action : null
  const shown = useRef<{ sel: string | null; action: string | null }>({ sel: null, action: null })
  useEffect(() => {
    const was = shown.current
    shown.current = { sel, action: selAction }
    if (!sel || (was.sel === sel && was.action === selAction)) return
    const item = Array.from(list.current?.children ?? []).find((el) => el.getAttribute('data-piece') === sel)
    if (!item) return
    if (was.sel !== sel) revealInPanel(item.firstElementChild, item)
    else revealInPanel(item.firstElementChild, item.querySelector('[data-viz-opts]') ?? item, item.querySelector('[data-testid="viz-furniture-actions"]'))
  }, [sel, selAction])
  return (
    <Panel title="Furniture" sub={groups.length ? `${groups.length} ${groups.length === 1 ? 'piece' : 'pieces'} on the photo · pick what happens to each` : undefined} testId="viz-furniture"
           actions={<Tooltip label="Add a piece the photo missed"><IconButton icon="add" label="Add furniture" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onAdd} /></Tooltip>}>
      {!groups.length ? (
        <div className={styles.section}>
          <span className={styles.none}>{reshaped ? 'This version is a whole-room look — its pieces aren’t marked. Add one by name and tap where it is.' : 'No furniture marked on this photo yet.'}</span>
          <div className={styles.actions}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={onAdd}>Add furniture</Button></div>
        </div>
      ) : (
        <div ref={list} className={styles.list} data-testid="viz-furniture-list">
          {groups.map(({ key, f, ids }) => {
            const p = picks[ids[0]!] ?? KEEP
            const on = sel === key
            /* (D3) the finish row, only where the part it names is traced on the photo (a fig's pot, an artwork's frame, a TV's frame and
               stand) — then the colour lands on that part too; a piece without it offers the whole-piece rows only */
            const fin = finishRowFor(f)
            const part = fin?.part ? PART_WORD[fin.part] : null
            const quick = suggestReplacements(f.category, style || 'Modern', 4, f.label)
            /* a quick pick is named by its own name ("Mid-Century Coffee Table"), not its long description */
            const picked = p.replacementDesc ? (quick.find((r) => r.description === p.replacementDesc) ?? FURNITURE_PRESETS.find((r) => r.description === p.replacementDesc))?.label ?? null : null
            const setAll = (next: FurniturePick) => onPick(ids, next)
            const now = ids.map((id) => customized[id]).find(Boolean) ?? null
            /* (surfaces-14) a piece with no finish row takes a colour only — its words say so */
            const unready = p.action === 'replace' || p.action === 'customize' ? pickNeeds(p, f) : null
            const needs = unready && p.action === 'customize' && !fin ? `Pick a colour for the ${labelInText(f.label)} first.` : unready
            /* (F064) a piece the room's empty plate still shows (the living room's sheer curtains) can't come out of this photo */
            const pieceWhy = removeWhy ? null : furniture.filter((x) => ids.includes(x.id)).map(pieceRemoveBlock).find(Boolean) ?? null
            const offRemove = !!(removeWhy || pieceWhy) && p.action !== 'remove'
            const caption = p.action === 'keep' ? (now ? `Now: ${now} · Keep` : `Keep · ${f.category}`)
              : p.action === 'remove' ? 'Taken out'
              : needs ? (p.action === 'replace' ? 'Replace · choose what' : fin ? 'Customize · choose a colour or finish' : 'Customize · choose a colour')
              : p.action === 'replace' ? `Replace${p.replacementDesc ? ` · ${picked ?? clipWords(p.replacementDesc)}` : p.refImage ? ' · from your photo' : ''}`
              : `Customize · ${customizeWords(p.customizeColor, p.customizeMaterial) || (p.replacementDesc ? clipWords(p.replacementDesc) : '')}`
            return (
              <div key={key} data-piece={key}>
                <div className={styles.row} data-on={on || undefined}>
                  <button type="button" className={styles.rowMain} onClick={() => onSelect(on ? null : key)} aria-expanded={on} data-testid="viz-furniture-row">
                    <span className={styles.glyph} aria-hidden><Icon name={furnitureGlyph(f.label, f.category)} size={20} weight={300} /></span>
                    <span className={styles.texts}><span className={styles.name}>{titleCaseLabel(key)}{ids.length > 1 ? ` ×${ids.length}` : ''}</span>
                      <span className={styles.caption} data-new={(p.action !== 'keep' && !needs) || undefined}>{caption}</span></span>
                  </button>
                  <span className={styles.rowTools} data-hover="">
                    <Tooltip label="Mark another one like this on the photo"><IconButton icon="add" label={`Add another ${titleCaseLabel(key)}`} size={36} variant="bare" iconSize={18} onClick={() => onAddLike(key, f.category)} /></Tooltip>
                    <Tooltip label="Take off the list (the photo doesn’t change)"><IconButton icon="close" label={`Take ${titleCaseLabel(key)} off the list`} size={36} variant="bare" iconSize={18} onClick={() => onForget(ids)} /></Tooltip>
                  </span>
                </div>
                {on ? (
                  <div className={`${styles.row} ${styles.pieceBody}`} data-sub="">
                    {now ? <span className={styles.hint}>Now: {now}</span> : null}
                    <Chips label={`What happens to the ${titleCaseLabel(key).toLowerCase()}`} options={ACTIONS.map((a) => ({ value: a.value, label: a.label, disabled: a.value === 'remove' && offRemove }))} value={p.action === 'keep' ? null : p.action}
                           onChange={(v) => { if (v === 'remove' && offRemove) return; setAll(nextPick(p, v as FurnitureAction)) }} testId="viz-furniture-actions" />
                    {removeWhy ? <span className={styles.hint} data-testid="viz-remove-why">Remove is off: {removeWhy.charAt(0).toLowerCase() + removeWhy.slice(1)}. Customize it instead.</span> : null}
                    {pieceWhy ? <span className={styles.hint} data-testid="viz-remove-why">{pieceWhy}</span> : null}
                    {needs ? <span className={styles.hint}>{needs}</span> : null}
                    {p.action === 'replace' ? (
                      <>
                        <div className={styles.field} data-viz-opts=""><span className={styles.head}>Quick pick</span>
                          <Chips label="Quick pick" options={quick.map((r) => ({ value: r.description, label: r.label }))} value={p.replacementDesc} onChange={(v) => setAll({ ...p, replacementDesc: v })} /></div>
                        <TextArea label="Or describe it" placeholder="e.g. an oversized rattan chair with terracotta velvet cushions" value={p.replacementDesc ?? ''} onChange={(v: string) => setAll({ ...p, replacementDesc: v || null })} />
                        <span className={styles.refRow}>
                          {p.refImage ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img className={styles.refThumb} src={p.refImage} alt="The photo of the new piece" data-testid="viz-piece-photo" />
                              <Tooltip label="Remove the photo"><IconButton icon="close" label="Remove the photo" size={36} variant="bare" iconSize={20} onClick={() => setAll({ ...p, refImage: null })} /></Tooltip>
                            </>
                          ) : null}
                          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} weight={300} />} onPress={() => onRefPhoto(ids)}>{p.refImage ? 'Change the photo' : 'Add a photo of it'}</Button>
                        </span>
                        {/* (pending modules S20 — Q-21 as she answered: the engine answers Replace honestly) the pick is kept — the live app's image
                            model draws it in; here the one way on is a recolour, named for what it is */}
                        <span className={styles.hint} data-testid="viz-replace-held">This is the prototype, so a new piece can’t be drawn into the photo — in the live app, the image model puts your pick in its place. For now, the {titleCaseLabel(key).toLowerCase()} can take its colour and finish.</span>
                        {onRecolour ? <span className={styles.actions}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="palette" size={20} weight={300} />} isDisabled={!!unready} onPress={() => onRecolour(ids)} data-testid="viz-recolour">Recolour it to match</Button></span> : null}
                      </>
                    ) : null}
                    {p.action === 'customize' ? (
                      <>
                        {fin ? (
                          <div className={styles.field} data-viz-opts=""><span className={styles.head}>{fin.heading}</span>
                            <Chips label={fin.heading} options={fin.options} value={p.customizeMaterial} onChange={(v) => setAll({ ...p, customizeMaterial: p.customizeMaterial === v ? null : v })} /></div>
                        ) : null}
                        <div className={styles.field} data-viz-opts=""><span className={styles.head}>{part ? `Colour · the ${part}` : 'Colour'}</span>
                          <Chips label="Colour" options={FURNITURE_COLOURS.map((c) => ({ value: c, label: c, swatch: COLOUR_HEX[c] ?? null }))} value={p.customizeColor} onChange={(v) => setAll({ ...p, customizeColor: p.customizeColor === v ? null : v })} /></div>
                        {p.customizeColor ? <span className={styles.hint}>{customizeWords(p.customizeColor, p.customizeMaterial)}</span> : null}
                        <TextArea label="Or describe it" placeholder="e.g. reupholster in emerald velvet, keep the walnut legs" value={p.replacementDesc ?? ''} onChange={(v: string) => setAll({ ...p, replacementDesc: v || null })} />
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
