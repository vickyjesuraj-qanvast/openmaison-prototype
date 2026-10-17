'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { CLIENT_TOOLS, HATCHES, LAYERS, SIDE_COLOR, SWATCHES, SYMBOL_GROUPS, SYMBOLS, TOOL_HINT, WEIGHTS, type HatchKey, type Side } from '@/lib/projects/floor-plan-model'
import type { CanvasTool } from './plan-canvas'
import styles from './floor-plan.module.css'

/**
 * (gaps build G, G-Q4 · G-Q5 · G-Q6) The tools over the plan — the house chips (REG-614) on the house rail, words not glyphs (an elderly owner
 * reads "Box" sooner than a square): Select first, the shapes, then Erase. A Zone or a Stamp opens its own row of choices under the tools
 * (progressive disclosure: ten stamps never crowd the first row). At the row's end: the colour and thickness (the role's colour by default,
 * 1.0 F-195), the layer a new mark goes on (the studio's), Undo, and Set the scale. The client's row is the short set (G-Q6).
 */
const STUDIO_ORDER: readonly CanvasTool[] = ['select', 'pen', 'rect', 'arrow', 'text', 'pin', 'photo', 'hatch', 'cloud', 'callout', 'symbol', 'dimension', 'erase']
const CLIENT_ORDER: readonly CanvasTool[] = ['select', ...CLIENT_TOOLS, 'erase']
export const TOOL_WORD: Record<CanvasTool, string> = {
  select: 'Select', pen: 'Pen', rect: 'Box', arrow: 'Arrow', text: 'Text', pin: 'Pin', photo: 'Photo', hatch: 'Zone', cloud: 'Cloud', callout: 'Callout', symbol: 'Stamp', dimension: 'Measure', erase: 'Erase', scale: 'Scale',
}
/** The line under the plan: what the picked tool does, in a sentence. */
export function toolLine(tool: CanvasTool, touch: boolean, scaled: boolean): string {
  const tap = touch ? 'Tap' : 'Click'
  if (tool === 'select') return `${tap} a mark to open it; drag your own to move it. ${touch ? 'Pinch' : 'Pinch, or hold Ctrl and scroll,'} to zoom.`
  if (tool === 'erase') return `${tap} one of your own marks to delete it — Undo puts it back.`
  if (tool === 'scale') return 'Mark both ends of a length you know, then type it.'
  if (tool === 'dimension' && !scaled) return 'Set the scale first — it takes two taps and a length.'
  return `${TOOL_HINT[tool]}.`
}

export function PlanToolbar({
  side, tool, onTool, symbol, onSymbol, pattern, onPattern, style, onStyle, layer, onLayer, counts, canUndo, onUndo, onScale, scaled, disabled = false,
}: {
  side: Side
  tool: CanvasTool
  onTool: (t: CanvasTool) => void
  symbol: string | null
  onSymbol: (k: string) => void
  pattern: HatchKey
  onPattern: (k: HatchKey) => void
  style: { color: string | null; weight: 1 | 2 | 3; dashed: boolean }
  onStyle: (s: { color: string | null; weight: 1 | 2 | 3; dashed: boolean }) => void
  /** the studio's drawing layer (the client's marks always go on Client requests) */
  layer?: string
  onLayer?: (k: string) => void
  counts?: Map<string, number>
  canUndo: boolean
  onUndo: () => void
  onScale?: () => void
  scaled?: boolean
  disabled?: boolean
}) {
  const order = side === 'studio' ? STUDIO_ORDER : CLIENT_ORDER
  const [styleOpen, setStyleOpen] = useState(false)
  const [layerOpen, setLayerOpen] = useState(false)
  const styleRef = useRef<HTMLSpanElement>(null)
  const layerRef = useRef<HTMLSpanElement>(null)
  const color = style.color ?? SIDE_COLOR[side]
  const picked = tool === 'scale' ? 'dimension' : tool
  const layerName = LAYERS.find((l) => l.key === layer)?.label ?? 'General'
  return (
    <div className={styles.tools} data-testid="plan-tools">
      <div className={styles.toolRow}>
        <div className={styles.toolChips}>
          <ChipRail label="Tools">
            <Chips label="Tools" options={order.map((t) => ({ value: t, label: TOOL_WORD[t] }))} value={picked} disabled={disabled}
                   onChange={(v) => onTool(v as CanvasTool)} testId="plan-tool-chips" />
          </ChipRail>
        </div>
        <div className={styles.toolEnd}>
          <span ref={styleRef} className={styles.anchor}>
            <Tooltip label="Colour and thickness" disabled={styleOpen}>
              <button type="button" className={styles.swatchButton} aria-haspopup="menu" aria-expanded={styleOpen} aria-label="Colour and thickness" disabled={disabled}
                      onClick={() => setStyleOpen((o) => !o)} data-testid="plan-style">
                <span className={styles.swatchDot} style={{ ['--swatch' as string]: color }} aria-hidden />
                <Icon name="expand_more" size={18} />
              </button>
            </Tooltip>
            <PortalMenu open={styleOpen} anchor={styleRef} onClose={() => setStyleOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="Colour and thickness">
              <DropdownLabel>Colour</DropdownLabel>
              <DropdownItem role="menuitemradio" checked={!style.color} selected={!style.color} onSelect={() => { onStyle({ ...style, color: null }); setStyleOpen(false) }}>
                <span className={styles.menuSwatch}><span className={styles.swatchDot} style={{ ['--swatch' as string]: SIDE_COLOR[side] }} aria-hidden />{side === 'studio' ? 'The studio’s colour' : 'Your colour'}</span>
              </DropdownItem>
              {SWATCHES.filter((s) => s.hex !== SIDE_COLOR[side]).map((s) => (
                <DropdownItem key={s.hex} role="menuitemradio" checked={style.color === s.hex} selected={style.color === s.hex} onSelect={() => { onStyle({ ...style, color: s.hex }); setStyleOpen(false) }}>
                  <span className={styles.menuSwatch}><span className={styles.swatchDot} style={{ ['--swatch' as string]: s.hex }} aria-hidden />{s.label}</span>
                </DropdownItem>
              ))}
              <DropdownDivider />
              <DropdownLabel>Thickness</DropdownLabel>
              {WEIGHTS.map((w) => <DropdownItem key={w.key} role="menuitemradio" checked={style.weight === w.key} onSelect={() => { onStyle({ ...style, weight: w.key }); setStyleOpen(false) }}>{w.label}</DropdownItem>)}
              <DropdownDivider />
              <DropdownItem role="menuitemcheckbox" checked={style.dashed} onSelect={() => { onStyle({ ...style, dashed: !style.dashed }); setStyleOpen(false) }}>Dashed line</DropdownItem>
            </PortalMenu>
          </span>
          {side === 'studio' && onLayer ? (
            <span ref={layerRef} className={styles.anchor}>
              <Button variant="secondary" appearance="outlined" iconEnd={<Icon name="expand_more" size={18} />} onPress={() => setLayerOpen((o) => !o)} isDisabled={disabled}
                      aria-haspopup="menu" aria-expanded={layerOpen} data-testid="plan-layer">
                <span className={styles.layerWord}>{layerName}</span>
              </Button>
              <PortalMenu open={layerOpen} anchor={layerRef} onClose={() => setLayerOpen(false)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle="New marks go on">
                <DropdownLabel>New marks go on</DropdownLabel>
                {LAYERS.map((l) => (
                  <DropdownItem key={l.key} role="menuitemradio" checked={layer === l.key} selected={layer === l.key} onSelect={() => { onLayer(l.key); setLayerOpen(false) }}
                                help={l.studioOnly ? 'The client never sees these' : undefined} meta={counts?.get(l.key) ? String(counts.get(l.key)) : undefined}>
                    {l.label}
                  </DropdownItem>
                ))}
              </PortalMenu>
            </span>
          ) : null}
          <Tooltip label="Undo your last mark" keys="mod+z"><IconButton icon="undo" label="Undo your last mark" disabled={!canUndo || disabled} onClick={onUndo} data-testid="plan-undo" /></Tooltip>
          {onScale ? <Tooltip label={scaled ? 'Set the scale again' : 'Set the scale'}><IconButton icon="open_in_full" label={scaled ? 'Set the scale again' : 'Set the scale'} selected={tool === 'scale'} disabled={disabled} onClick={onScale} data-testid="plan-scale-button" /></Tooltip> : null}
        </div>
      </div>
      {tool === 'hatch' ? (
        <ChipRail label="Zone"><Chips label="Zone" options={HATCHES.map((h) => ({ value: h.key, label: `${h.label} · ${h.hint}` }))} value={pattern} onChange={(v) => onPattern(v as HatchKey)} testId="plan-zone-chips" /></ChipRail>
      ) : null}
      {tool === 'symbol' ? (
        <ChipRail label="Stamp">
          <Chips label="Stamp" options={SYMBOL_GROUPS.flatMap((g) => SYMBOLS.filter((s) => s.group === g.key).map((s) => ({ value: s.key, label: s.label })))} value={symbol} onChange={onSymbol} testId="plan-stamp-chips" />
        </ChipRail>
      ) : null}
    </div>
  )
}
