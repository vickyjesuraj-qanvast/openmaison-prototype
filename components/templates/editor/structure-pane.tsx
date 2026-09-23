'use client'

import { useState, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { BLOCK_ICON, BLOCK_KINDS, BLOCK_LABEL, SINGLETON_KINDS, type Block, type BlockKind, type Paper, type TemplateDesign } from '@/lib/templates/model'
import type { Selection } from '@/components/templates/render/canvas'
import { flowBlocks, patchBlock, reorderFlow } from './editor-state'
import { Group, Num, Seg, Sub, Txt, Sel } from './inspector-controls'
import styles from './structure-pane.module.css'

type Props = {
  design: TemplateDesign; selection: Selection; pageOfBlock: Record<string, number>; pages: number
  onSelect: (s: Selection) => void; onDesign: (fn: (d: TemplateDesign) => TemplateDesign, opts?: { coalesce?: string }) => void; onAddBlock: (kind: BlockKind) => void
}

const sub = (b: Block): string => {
  switch (b.kind) {
    case 'header': case 'footer': return b.repeat === 'every' ? 'Every page' : b.repeat === 'first' ? 'First page' : 'After the first page'
    case 'cover': return 'Its own page'
    case 'items': return `${b.groupBy === 'none' ? 'Quote sections' : { category: 'By trade', room: 'By room', section: 'By section label' }[b.groupBy]}${b.subGroupBy !== 'none' ? ` › ${b.subGroupBy}` : ''} · ${b.columns.filter((c) => c.on).length} columns`
    case 'totals': return `${b.lines.filter((l) => l.on).length} lines`
    case 'payments': return `${b.layout.charAt(0).toUpperCase()}${b.layout.slice(1)} layout`
    case 'bank': return b.qr ? 'With the PayNow QR' : 'Bank and account'
    case 'signature': return `${b.columns.length} columns`
    case 'text': return b.html.replace(/<[^>]+>/g, '').slice(0, 40)
    case 'title': return b.title || b.subject || ''
    case 'spacer': return `${b.height} mm`
    default: return ''
  }
}

/**
 * Structure (REG-486; 5a corrected): page setup, then the outline — cover and header pinned, the flow reorderable by its
 * handle, the footer pinned — with a "Page n" marker where the live pagination breaks, an eye per block, and Add block.
 */
export function StructurePane({ design, selection, pageOfBlock, pages, onSelect, onDesign, onAddBlock }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const flow = flowBlocks(design)
  const cover = design.blocks.find((b) => b.kind === 'cover'), header = design.blocks.find((b) => b.kind === 'header'), footer = design.blocks.find((b) => b.kind === 'footer')
  const toggle = (b: Block) => onDesign((d) => patchBlock(d, b.id, { hidden: !b.hidden || undefined }))
  const row = (b: Block, handle?: ReactNode) => (
    <div className={styles.row} data-on={selection?.blockId === b.id || undefined} data-hidden={b.hidden || undefined}>
      {handle ?? <span className={styles.handleSpace} />}
      <button type="button" className={styles.rowMain} onClick={() => onSelect({ blockId: b.id })} aria-current={selection?.blockId === b.id ? 'true' : undefined}>
        <Icon name={BLOCK_ICON[b.kind]} size={20} weight={300} />
        <span className={styles.rowText}><span className={styles.rowLabel}>{BLOCK_LABEL[b.kind]}</span>{sub(b) ? <span className={styles.rowSub}>{sub(b)}</span> : null}</span>
      </button>
      <Tooltip label={b.hidden ? 'Show on the page' : 'Hide from the page'}><IconButton icon={b.hidden ? 'visibility_off' : 'visibility'} label={b.hidden ? `Show ${BLOCK_LABEL[b.kind]}` : `Hide ${BLOCK_LABEL[b.kind]}`} size={36} variant="bare" iconSize={20} onClick={() => toggle(b)} className={styles.eye} /></Tooltip>
    </div>
  )
  const markers: Record<string, number | null> = {}
  { let last = 1; for (const b of flow) { const page = (pageOfBlock[b.id] ?? last - 1) + 1; const m = page > last && !b.hidden ? page : null; if (page > last) last = page; markers[b.id] = m } }   // the first body page needs no marker; a cover is page 1 and says so
  const present = new Set(design.blocks.map((b) => b.kind))
  return (
    <div className={styles.pane}>
      <div className={styles.setup}>
        {/* (REG-542) "Page setup" with the summary beside it — "Page · A4, 12/18/10/18 mm" read as a code; the margins are captioned and named by side. */}
        <Group title="Page setup" sub={design.page.paper}>   {/* (REG-569) the margins code "12/18/10/18 mm" is inside, named by side */}
          <Seg label="Paper" value={design.page.paper} options={[{ value: 'A4' as Paper, label: 'A4' }, { value: 'Letter' as Paper, label: 'Letter' }]} onChange={(p) => onDesign((d) => ({ ...d, page: { ...d.page, paper: p } }))} />
          <Sub>Margins</Sub>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Num key={side} label={`${side.charAt(0).toUpperCase()}${side.slice(1)}`} unit="mm" value={design.page.margins[side]} min={0} max={60} onChange={(v) => onDesign((d) => ({ ...d, page: { ...d.page, margins: { ...d.page.margins, [side]: v } } }), { coalesce: `margin-${side}` })} />
          ))}
          <Txt label="Watermark" value={design.page.watermark} fields={false} onChange={(v) => onDesign((d) => ({ ...d, page: { ...d.page, watermark: v } }), { coalesce: 'watermark' })} />
          {/* (REG-592) How the dates print — Dyel's "Sunday, 7 February 2026". */}
          <Sel label="Dates print as" value={design.page.dateFormat} options={[{ value: 'short', label: '17 Sep ’26' }, { value: 'long', label: '17 September 2026' }, { value: 'weekday', label: 'Sunday, 17 September 2026' }]} onChange={(v) => onDesign((d) => ({ ...d, page: { ...d.page, dateFormat: v } }))} />
        </Group>
      </div>
      <div className={styles.outline} role="list" aria-label="On the page">
        {cover ? <div className={styles.marker}>Page 1 · cover</div> : null}
        {cover ? row(cover) : null}
        {header ? row(header) : null}
        <Reorder.Group as="div" axis="y" values={flow.map((b) => b.id)} onReorder={(ids: string[]) => onDesign((d) => reorderFlow(d, ids), { coalesce: 'reorder' })} className={styles.flow}>
          {flow.map((b) => <FlowRow key={b.id} id={b.id} marker={markers[b.id] ?? null}>{row(b, undefined)}</FlowRow>)}
        </Reorder.Group>
        {footer ? row(footer) : null}
        <span className={styles.pagesNote}>{pages} page{pages === 1 ? '' : 's'} with this quote</span>
      </div>
      <div className={styles.foot}>
        <span className={styles.addAnchor}>
          <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setAddOpen((o) => !o)} aria-haspopup="menu" aria-expanded={addOpen}>Add to the page</Button>   {/* (REG-569) "block" was the code's word */}
          <Dropdown open={addOpen} onClose={() => setAddOpen(false)} align="left" side="up" width={232} sheetTitle="Add to the page">
            {BLOCK_KINDS.filter((k) => !isCanvasKind(k)).map((k) => <DropdownItem key={k} onSelect={() => { setAddOpen(false); onAddBlock(k) }} disabled={SINGLETON_KINDS.includes(k) && present.has(k)} title={SINGLETON_KINDS.includes(k) && present.has(k) ? 'Already in the template' : undefined}>{BLOCK_LABEL[k]}</DropdownItem>)}
            <DropdownDivider />
            {(['cover', 'header', 'footer'] as BlockKind[]).map((k) => <DropdownItem key={k} onSelect={() => { setAddOpen(false); onAddBlock(k) }} disabled={present.has(k)} title={present.has(k) ? 'Already in the template' : undefined}>{k === 'cover' ? 'Cover page' : BLOCK_LABEL[k]}</DropdownItem>)}
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
const isCanvasKind = (k: BlockKind) => k === 'cover' || k === 'header' || k === 'footer'

function FlowRow({ id, marker, children }: { id: string; marker: number | null; children: ReactNode }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item as="div" value={id} dragListener={false} dragControls={controls} className={styles.item} data-dragging={dragging || undefined}
                  onDragStart={() => setDragging(true)} onDragEnd={() => setDragging(false)}>
      {marker ? <div className={styles.marker}>Page {marker}</div> : null}
      <div className={styles.itemRow}>
        <span className={styles.handle} onPointerDown={(e) => { e.preventDefault(); controls.start(e) }} aria-hidden><Icon name="drag_indicator" size={18} weight={300} /></span>
        {children}
      </div>
    </Reorder.Item>
  )
}

