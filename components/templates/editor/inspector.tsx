'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { BLOCK_ICON, BLOCK_LABEL, ELEMENT_LABEL, ITEM_COLUMN_LABEL, isCanvas, newId, SINGLETON_KINDS, type Align, type Block, type BrandKit, type CanvasBlock, type CanvasElement, type ItemsBlock, type KVRow, type SignatureColumn, type TemplateDesign, type TextStyle } from '@/lib/templates/model'
import type { Selection } from '@/components/templates/render/canvas'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { defaultElement, duplicateBlock, flowBlocks, moveBlock, patchBlock, patchElement, removeBlock } from './editor-state'
import { ColorPick, Field, Group, Num, Seg, Sel, StyleEditor, Sw, Txt } from './inspector-controls'
import styles from './inspector.module.css'

export type DesignSetter = (fn: (d: TemplateDesign) => TemplateDesign, opts?: { coalesce?: string }) => void
type Props = { design: TemplateDesign; brand: BrandKit; selection: Selection; onDesign: DesignSetter; onSelect: (s: Selection) => void }

const ALIGN_OPTS: { value: Align; label: string; icon: string }[] = [{ value: 'left', label: 'Left', icon: 'format_align_left' }, { value: 'center', label: 'Centre', icon: 'format_align_center' }, { value: 'right', label: 'Right', icon: 'format_align_right' }]
const ELEMENT_KINDS: CanvasElement['kind'][] = ['text', 'image', 'kv', 'rule', 'box', 'signature', 'badges', 'pageno']
const ELEMENT_ICON: Record<CanvasElement['kind'], string> = { text: 'text_fields', image: 'image', kv: 'list_alt', rule: 'horizontal_rule', box: 'rectangle', signature: 'draw', badges: 'verified', pageno: 'tab' }
const htmlToText = (h: string) => h.replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const textToHtml = (t: string) => t.split('\n').map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')
const elementText = (e: CanvasElement) => e.kind === 'text' ? e.text.split('\n')[0] : e.kind === 'kv' ? e.rows.map((r) => r.label).filter(Boolean).join(' · ') : e.kind === 'image' ? (e.src === 'logo' || e.src === 'logo-dark' ? 'Logo' : e.src === 'stamp' ? 'Stamp' : 'Picture') : e.kind === 'pageno' ? e.format : e.kind === 'signature' ? `${e.columns.length} columns` : ''

/**
 * The inspector (REG-486; 5b/5c corrected): what the selected block or element can change — the five controls that
 * matter first, everything else under More options. No block has a settings page of its own.
 */
const TOTAL_LINE_LABEL: Record<string, string> = { pages: 'Page totals', subtotal: 'Subtotal', discount: 'Line discounts', additional: 'Additional discount', gst: 'GST', total: 'Grand total' }

export function Inspector({ design, brand, selection, onDesign, onSelect }: Props) {
  const block = design.blocks.find((b) => b.id === selection?.blockId) ?? null
  if (!block) {
    return (
      <div className={styles.inspector}>
        <div className={styles.head}><span className={styles.headTitle}>Inspector</span></div>
        <div className={styles.empty}><span className={styles.emptyGlyph}><Icon name="tune" size={40} weight={300} /></span>Select a block on the page, or in Structure, to change it.</div>
      </div>
    )
  }
  const element = isCanvas(block) && selection?.elementId ? block.elements.find((e) => e.id === selection.elementId) ?? null : null
  if (element && isCanvas(block)) return <ElementInspector block={block} element={element} brand={brand} onDesign={onDesign} onSelect={onSelect} />
  return <BlockInspector block={block} design={design} brand={brand} onDesign={onDesign} onSelect={onSelect} />
}

function BlockInspector({ block: b, design, brand, onDesign, onSelect }: { block: Block; design: TemplateDesign; brand: BrandKit; onDesign: DesignSetter; onSelect: (s: Selection) => void }) {
  const upd = (patch: Record<string, unknown>, coalesce?: string) => onDesign((d) => patchBlock(d, b.id, (x) => ({ ...x, ...patch }) as Block), coalesce ? { coalesce: `${b.id}:${coalesce}` } : undefined)
  const style = (key: string, label: string, more = false) => <StyleEditor label={label} value={(b as unknown as Record<string, TextStyle>)[key] ?? {}} onChange={(s) => upd({ [key]: s })} brand={brand} more={more} />
  const flow = flowBlocks(design)
  const at = flow.findIndex((x) => x.id === b.id)
  const canvas = isCanvas(b)
  const singleton = SINGLETON_KINDS.includes(b.kind)
  return (
    <div className={styles.inspector} data-testid="inspector">
      <div className={styles.head}>
        <span className={styles.headIcon}><Icon name={BLOCK_ICON[b.kind]} size={20} weight={300} /></span>
        <span className={styles.headTitle}>{BLOCK_LABEL[b.kind]}</span>
        <span className={styles.headActions}>
          {!canvas ? <>
            <Tooltip label="Move up"><IconButton icon="arrow_upward" label="Move up" size={24} variant="bare" iconSize={18} disabled={at <= 0} onClick={() => onDesign((d) => moveBlock(d, b.id, -1))} /></Tooltip>
            <Tooltip label="Move down"><IconButton icon="arrow_downward" label="Move down" size={24} variant="bare" iconSize={18} disabled={at < 0 || at >= flow.length - 1} onClick={() => onDesign((d) => moveBlock(d, b.id, 1))} /></Tooltip>
          </> : null}
          <Tooltip label={b.hidden ? 'Show' : 'Hide'}><IconButton icon={b.hidden ? 'visibility_off' : 'visibility'} label={b.hidden ? 'Show block' : 'Hide block'} size={24} variant="bare" iconSize={18} onClick={() => upd({ hidden: !b.hidden })} /></Tooltip>
          {!singleton ? <Tooltip label="Duplicate"><IconButton icon="content_copy" label="Duplicate block" size={24} variant="bare" iconSize={18} onClick={() => { const r = duplicateBlock(design, b.id); onDesign(() => r.design); onSelect({ blockId: r.id }) }} /></Tooltip> : null}
          <Tooltip label="Delete"><IconButton icon="delete" label="Delete block" size={24} variant="bare" iconSize={18} onClick={() => { onSelect(null); onDesign((d) => removeBlock(d, b.id)) }} /></Tooltip>
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {canvas ? <CanvasFields block={b} brand={brand} upd={upd} onDesign={onDesign} onSelect={onSelect} /> : null}
          {b.kind === 'details' ? <>
            <Seg label="Layout" value={b.layout} options={[{ value: 'columns', label: 'Two columns' }, { value: 'stacked', label: 'Stacked' }, { value: 'form', label: 'Form lines' }]} onChange={(v) => upd({ layout: v })} />
            <Num label="Label width" unit="mm" value={b.labelWidth} min={8} max={80} onChange={(v) => upd({ labelWidth: v })} />
            <KvRows label="Left column" rows={b.left} onChange={(rows) => upd({ left: rows }, 'left')} />
            <KvRows label="Right column" rows={b.right} onChange={(rows) => upd({ right: rows }, 'right')} />
            <Group title="More options">{style('style', 'Values')}{style('labelStyle', 'Labels')}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'title' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} />
            <Txt label="Subject line" value={b.subject} onChange={(v) => upd({ subject: v }, 'subject')} />
            <Txt label="Introduction" value={b.intro} multiline onChange={(v) => upd({ intro: v }, 'intro')} />
            <Group title="More options">{style('titleStyle', 'Title')}{style('subjectStyle', 'Subject')}{style('introStyle', 'Introduction')}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'items' ? <ItemsFields b={b} upd={upd} style={style} /> : null}
          {b.kind === 'totals' ? <>
            <div className={styles.list} role="group" aria-label="Lines">
              {b.lines.map((l, i) => (
                <div key={l.key} className={styles.row} data-off={!l.on || undefined}>
                  <Sw label={TOTAL_LINE_LABEL[l.key] ?? l.key} value={l.on} onChange={(on) => upd({ lines: b.lines.map((x, j) => (j === i ? { ...x, on } : x)) })} />
                  <span className={styles.rowField}><TextField label={TOTAL_LINE_LABEL[l.key] ?? l.key} value={l.label} onChange={(v) => upd({ lines: b.lines.map((x, j) => (j === i ? { ...x, label: v } : x)) }, `line-${l.key}`)} /></span>
                </div>
              ))}
            </div>
            <Seg label="Layout" value={b.layout} options={[{ value: 'right', label: 'Right block' }, { value: 'full', label: 'Full width' }]} onChange={(v) => upd({ layout: v })} />
            {b.layout === 'right' ? <Num label="Width" unit="mm" value={b.width} min={40} max={200} onChange={(v) => upd({ width: v })} /> : null}
            <Sel label="Rules" value={b.rules} options={[{ value: 'none', label: 'None' }, { value: 'top', label: 'Rule above the total' }, { value: 'double', label: 'Double rule under the total' }, { value: 'grid', label: 'Boxed' }]} onChange={(v) => upd({ rules: v })} />
            <Group title="More options">{style('style', 'Lines')}{style('totalStyle', 'Grand total')}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'payments' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} />
            <Seg label="Layout" value={b.layout} options={[{ value: 'table', label: 'Table' }, { value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }]} onChange={(v) => upd({ layout: v })} />
            <Sw label="Show amounts" value={b.showAmounts} onChange={(v) => upd({ showAmounts: v })} />
            <Sw label="Show due dates" value={b.showDue} onChange={(v) => upd({ showDue: v })} />
            <Sw label="Letter the milestones" value={b.letters} onChange={(v) => upd({ letters: v })} />
            <Group title="More options"><Sw label="Title as a black band" value={b.band} onChange={(v) => upd({ band: v })} />{style('style', 'Rows')}{style('titleStyle', 'Title')}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'terms' || b.kind === 'notes' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} />
            <Sw label="Number the paragraphs" value={b.numbered} onChange={(v) => upd({ numbered: v })} />
            <Sw label="Box each paragraph" value={b.grid} onChange={(v) => upd({ grid: v })} />
            <span className={styles.note}>{b.kind === 'terms' ? 'The text is each quote’s Terms and Conditions section; the Defaults tab picks the template a new quote starts with.' : 'The text is each quote’s Additional Notes section.'}</span>
            <Group title="More options">{style('style', 'Paragraphs')}{style('titleStyle', 'Title')}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'signature' ? <>
            <SignatureColumns columns={b.columns} onChange={(columns) => upd({ columns }, 'columns')} />
            <Num label="Line weight" unit="pt" value={b.lineWeight} min={0} max={4} step={0.25} onChange={(v) => upd({ lineWeight: v })} />
            <ColorPick label="Line colour" value={b.lineColor} onChange={(c) => upd({ lineColor: c ?? 'ink' })} brand={brand} />
            <Txt label="Line above the signatures" value={b.preamble ?? ''} onChange={(v) => upd({ preamble: v || undefined }, 'preamble')} />
            <Group title="More options">{style('style', 'Lines')}{style('headingStyle', 'Names')}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'text' ? <>
            <Txt label="Text" value={htmlToText(b.html)} multiline onChange={(v) => upd({ html: textToHtml(v) }, 'html')} />
            <Seg label="Box" value={b.box} options={[{ value: 'none', label: 'None' }, { value: 'tint', label: 'Tinted' }, { value: 'outline', label: 'Outlined' }]} onChange={(v) => upd({ box: v })} />
            <Group title="More options">{style('style', 'Text', true)}<BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'image' ? <>
            <ImageSource value={b.src} onChange={(src) => upd({ src })} />
            <Num label="Width" unit="mm" value={b.width} min={5} max={200} onChange={(v) => upd({ width: v })} />
            <Seg label="Align" value={b.align} options={ALIGN_OPTS} onChange={(v) => upd({ align: v })} />
            <Txt label="Caption" value={b.caption ?? ''} onChange={(v) => upd({ caption: v || undefined }, 'caption')} />
            <Group title="More options"><BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'divider' ? <>
            <Num label="Weight" unit="pt" value={b.weight} min={0.25} max={6} step={0.25} onChange={(v) => upd({ weight: v })} />
            <ColorPick label="Colour" value={b.color} onChange={(c) => upd({ color: c ?? 'ink' })} brand={brand} wide />
            <Group title="More options"><BlockOptions b={b} upd={upd} /></Group>
          </> : null}
          {b.kind === 'spacer' ? <><Num label="Height" unit="mm" value={b.height} min={1} max={200} onChange={(v) => upd({ height: v })} wide /><Group title="More options"><BlockOptions b={b} upd={upd} /></Group></> : null}
          {b.kind === 'pagebreak' ? <span className={styles.note}>Everything after this block starts on a new page.</span> : null}
          {b.kind === 'badges' ? <>
            <Num label="Height" unit="mm" value={b.height} min={4} max={40} onChange={(v) => upd({ height: v })} />
            <Seg label="Align" value={b.align} options={ALIGN_OPTS} onChange={(v) => upd({ align: v })} wide={false} />
            <span className={styles.note}>The badges come from the brand kit — Company › Profile.</span>
            <Group title="More options"><BlockOptions b={b} upd={upd} /></Group>
          </> : null}
        </div>
      </div>
    </div>
  )
}

/** Start on a new page · keep with next · space before / after · hidden (every flow block). */
function BlockOptions({ b, upd }: { b: Block; upd: (patch: Record<string, unknown>) => void }) {
  if (isCanvas(b)) return null
  return (
    <>
      <Sw label="Start on a new page" value={!!b.startNewPage} onChange={(v) => upd({ startNewPage: v || undefined })} />
      <Sw label="Keep with the next block" value={!!b.keepWithNext} onChange={(v) => upd({ keepWithNext: v || undefined })} hint="Moves to the next page together with the block after it" />
      <Num label="Space before" unit="mm" value={b.spaceBefore ?? 0} min={0} max={100} onChange={(v) => upd({ spaceBefore: v || undefined })} />
      <Num label="Space after" unit="mm" value={b.spaceAfter ?? 0} min={0} max={100} onChange={(v) => upd({ spaceAfter: v || undefined })} />
    </>
  )
}

function CanvasFields({ block: b, brand, upd, onDesign, onSelect }: { block: CanvasBlock; brand: BrandKit; upd: (p: Record<string, unknown>) => void; onDesign: DesignSetter; onSelect: (s: Selection) => void }) {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <>
      {b.kind !== 'cover' ? <Num label="Height" unit="mm" value={b.height} min={6} max={150} onChange={(v) => upd({ height: v })} /> : null}
      {b.kind !== 'cover' ? <Sel label="Show on" value={b.repeat} options={[{ value: 'every', label: 'Every page' }, { value: 'first', label: 'First page only' }, { value: 'not-first', label: 'Every page after the first' }]} onChange={(v) => upd({ repeat: v })} /> : null}
      <ColorPick label="Background" value={b.background} onChange={(c) => upd({ background: c })} brand={brand} none wide />
      <Sw label={b.kind === 'footer' ? 'Rule above' : 'Rule below'} value={!!b.rule} onChange={(v) => upd({ rule: v ? { weight: 0.5, color: 'ink' } : null })} />
      {b.rule ? <>
        <Num label="Rule weight" unit="pt" value={b.rule.weight} min={0.25} max={4} step={0.25} onChange={(v) => upd({ rule: { ...b.rule, weight: v } })} />
        <ColorPick label="Rule colour" value={b.rule.color} onChange={(c) => upd({ rule: { ...b.rule, color: c ?? 'ink' } })} brand={brand} />
      </> : null}
      <Field label="Elements" wide>
        <div className={styles.list}>
          {b.elements.map((e) => (
            <button key={e.id} type="button" className={styles.rowBtn} onClick={() => onSelect({ blockId: b.id, elementId: e.id })}>
              <Icon name={ELEMENT_ICON[e.kind]} size={18} weight={300} />
              <span className={styles.rowLabel}>{ELEMENT_LABEL[e.kind]}{elementText(e) ? ` · ${elementText(e)}` : ''}</span>
              {e.locked ? <Icon name="lock" size={16} weight={300} /> : null}
            </button>
          ))}
          {b.elements.length === 0 ? <span className={styles.note}>Nothing on this canvas yet.</span> : null}
        </div>
      </Field>
      <span className={styles.addRow}>
        <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setAddOpen((o) => !o)} aria-haspopup="menu" aria-expanded={addOpen}>Add element</Button>
        <Dropdown open={addOpen} onClose={() => setAddOpen(false)} align="left" width={200} sheetTitle="Add element">
          {ELEMENT_KINDS.map((k) => <DropdownItem key={k} onSelect={() => { setAddOpen(false); const el = defaultElement(k); onDesign((d) => patchBlock(d, b.id, (x) => (isCanvas(x) ? { ...x, elements: [...x.elements, el] } : x))); onSelect({ blockId: b.id, elementId: el.id }) }}>{ELEMENT_LABEL[k]}</DropdownItem>)}
        </Dropdown>
      </span>
      <Group title="More options"><Sw label="Hidden" value={!!b.hidden} onChange={(v) => upd({ hidden: v || undefined })} /></Group>
    </>
  )
}

function ElementInspector({ block: b, element: e, brand, onDesign, onSelect }: { block: CanvasBlock; element: CanvasElement; brand: BrandKit; onDesign: DesignSetter; onSelect: (s: Selection) => void }) {
  const upd = (patch: Record<string, unknown>, coalesce?: string) => onDesign((d) => patchElement(d, b.id, e.id, (x) => ({ ...x, ...patch }) as CanvasElement), coalesce ? { coalesce: `${e.id}:${coalesce}` } : undefined)
  const style = (key: string, label: string, more = false) => <StyleEditor label={label} value={(e as unknown as Record<string, TextStyle>)[key] ?? {}} onChange={(s) => upd({ [key]: s })} brand={brand} more={more} />
  const hasH = e.h !== undefined
  return (
    <div className={styles.inspector} data-testid="inspector">
      <div className={styles.head}>
        <Tooltip label={`Back to ${BLOCK_LABEL[b.kind]}`}><IconButton icon="arrow_back" label={`Back to ${BLOCK_LABEL[b.kind]}`} size={24} variant="bare" iconSize={18} onClick={() => onSelect({ blockId: b.id })} /></Tooltip>
        <span className={styles.headTitle}>{ELEMENT_LABEL[e.kind]}<span className={styles.headSub}> · {BLOCK_LABEL[b.kind]}</span></span>
        <span className={styles.headActions}>
          <Tooltip label={e.locked ? 'Unlock' : 'Lock in place'}><IconButton icon={e.locked ? 'lock' : 'lock_open'} label={e.locked ? 'Unlock' : 'Lock in place'} size={24} variant="bare" iconSize={18} selected={!!e.locked} onClick={() => upd({ locked: !e.locked || undefined })} /></Tooltip>
          <Tooltip label="Duplicate"><IconButton icon="content_copy" label="Duplicate element" size={24} variant="bare" iconSize={18} onClick={() => { const copy = { ...JSON.parse(JSON.stringify(e)) as CanvasElement, id: newId('e'), y: e.y + 4 }; onDesign((d) => patchBlock(d, b.id, (x) => (isCanvas(x) ? { ...x, elements: [...x.elements, copy] } : x))); onSelect({ blockId: b.id, elementId: copy.id }) }} /></Tooltip>
          <Tooltip label="Delete"><IconButton icon="delete" label="Delete element" size={24} variant="bare" iconSize={18} onClick={() => { onSelect({ blockId: b.id }); onDesign((d) => patchBlock(d, b.id, (x) => (isCanvas(x) ? { ...x, elements: x.elements.filter((y) => y.id !== e.id) } : x))) }} /></Tooltip>
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {e.kind === 'text' ? <>
            <Txt label="Text" value={e.text} multiline onChange={(v) => upd({ text: v }, 'text')} />
            {style('style', 'Style', true)}
            <Sw label="Hide when every field is empty" value={!!e.hideIfEmpty} onChange={(v) => upd({ hideIfEmpty: v || undefined })} />
          </> : null}
          {e.kind === 'image' ? <>
            <ImageSource value={e.src} onChange={(src) => upd({ src })} dark />
            <Seg label="Fit" value={e.fit} options={[{ value: 'contain', label: 'Fit inside' }, { value: 'cover', label: 'Fill' }]} onChange={(v) => upd({ fit: v })} />
            <ColorPick label="Box behind" value={e.box} onChange={(c) => upd({ box: c })} brand={brand} none wide />
          </> : null}
          {e.kind === 'kv' ? <>
            <KvRows label="Rows" rows={e.rows} onChange={(rows) => upd({ rows }, 'rows')} />
            <Num label="Label width" unit="mm" value={e.labelWidth} min={4} max={80} onChange={(v) => upd({ labelWidth: v })} />
            <Num label="Row gap" unit="mm" value={e.gap} min={0} max={10} step={0.1} onChange={(v) => upd({ gap: v })} />
            <Seg label="Value lines" value={e.lines} options={[{ value: 'none', label: 'None' }, { value: 'under', label: 'Underlined (form)' }]} onChange={(v) => upd({ lines: v })} />
            <Group title="More options">{style('style', 'Values')}{style('labelStyle', 'Labels')}</Group>
          </> : null}
          {e.kind === 'rule' ? <>
            <Num label="Weight" unit="pt" value={e.weight} min={0.25} max={6} step={0.25} onChange={(v) => upd({ weight: v })} />
            <ColorPick label="Colour" value={e.color} onChange={(c) => upd({ color: c ?? 'ink' })} brand={brand} />
          </> : null}
          {e.kind === 'box' ? <>
            <ColorPick label="Fill" value={e.fill} onChange={(c) => upd({ fill: c })} brand={brand} none wide />
            <ColorPick label="Outline" value={e.stroke} onChange={(c) => upd({ stroke: c })} brand={brand} none wide />
            {e.stroke ? <Num label="Outline weight" unit="pt" value={e.weight ?? 0.5} min={0.25} max={6} step={0.25} onChange={(v) => upd({ weight: v })} /> : null}
          </> : null}
          {e.kind === 'signature' ? <>
            <SignatureColumns columns={e.columns} onChange={(columns) => upd({ columns }, 'columns')} />
            <Num label="Line weight" unit="pt" value={e.lineWeight} min={0} max={4} step={0.25} onChange={(v) => upd({ lineWeight: v })} />
            <ColorPick label="Line colour" value={e.lineColor} onChange={(c) => upd({ lineColor: c ?? 'ink' })} brand={brand} />
            <Txt label="Line above" value={e.preamble ?? ''} onChange={(v) => upd({ preamble: v || undefined }, 'preamble')} />
            <Group title="More options">{style('style', 'Lines')}{style('headingStyle', 'Names')}</Group>
          </> : null}
          {e.kind === 'badges' ? <>
            <Seg label="Align" value={e.align} options={ALIGN_OPTS} onChange={(v) => upd({ align: v })} wide={false} />
            <Num label="Gap" unit="mm" value={e.gap} min={0} max={20} step={0.5} onChange={(v) => upd({ gap: v })} />
            <span className={styles.note}>The badges come from the brand kit — Company › Profile.</span>
          </> : null}
          {e.kind === 'pageno' ? <>
            <Txt label="Format" value={e.format} onChange={(v) => upd({ format: v }, 'format')} />
            {style('style', 'Style')}
          </> : null}
          <Group title="Position and size" open>
            <Num label="Left" unit="mm" value={e.x} min={-50} max={300} step={0.5} onChange={(v) => upd({ x: v })} />
            <Num label="Top" unit="mm" value={e.y} min={-50} max={400} step={0.5} onChange={(v) => upd({ y: v })} />
            <Num label="Width" unit="mm" value={e.w} min={2} max={300} step={0.5} onChange={(v) => upd({ w: v })} />
            {hasH || e.kind === 'image' || e.kind === 'box' || e.kind === 'badges' ? <Num label="Height" unit="mm" value={e.h ?? 10} min={1} max={400} step={0.5} onChange={(v) => upd({ h: v })} /> : null}
          </Group>
        </div>
      </div>
    </div>
  )
}

function KvRows({ label, rows, onChange }: { label: string; rows: KVRow[]; onChange: (rows: KVRow[]) => void }) {
  return (
    <Field label={label} wide>
      <div className={styles.list}>
        {rows.map((r, i) => (
          <div key={r.id} className={styles.row}>
            <span className={styles.rowNarrow} style={{ width: 96 }}><TextField label="Label" value={r.label} onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, label: v } : x)))} /></span>
            <span className={styles.rowField}><Txt label="Value" value={r.value} onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, value: v } : x)))} wide={false} /></span>
            <IconButton icon="close" label="Remove row" size={24} variant="bare" iconSize={18} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
          </div>
        ))}
        <span className={styles.addRow}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => onChange([...rows, { id: newId('r'), label: 'Label', value: '' }])}>Add row</Button></span>
      </div>
    </Field>
  )
}

function SignatureColumns({ columns, onChange }: { columns: SignatureColumn[]; onChange: (c: SignatureColumn[]) => void }) {
  const set = (i: number, patch: Partial<SignatureColumn>) => onChange(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  return (
    <Field label={`Columns · ${columns.length}`} wide>
      <div className={styles.list}>
        {columns.map((c, i) => (
          <div key={c.id} className={styles.grid} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--om-color-surface-variant)' : undefined }}>
            <Txt label="Name line" value={c.heading} onChange={(v) => set(i, { heading: v })} />
            <Txt label="Lines under it" value={c.lines.join('\n')} multiline onChange={(v) => set(i, { lines: v.split('\n') })} />
            <Sel label="Mark" value={c.image} options={[{ value: 'none', label: 'Line only' }, { value: 'member', label: 'Your signature' }, { value: 'client', label: 'Client’s signature' }, { value: 'stamp', label: 'Company stamp' }]} onChange={(v) => set(i, { image: v })} />
            <Field><TextField label="Caption" value={c.caption ?? ''} onChange={(v) => set(i, { caption: v || undefined })} /></Field>
            {columns.length > 1 ? <span className={styles.addRow}><Button appearance="text" onPress={() => onChange(columns.filter((_, j) => j !== i))}>Remove column</Button></span> : null}
          </div>
        ))}
        {columns.length < 4 ? <span className={styles.addRow}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => onChange([...columns, { id: newId('c'), heading: 'Name', lines: [], image: 'none' }])}>Add column</Button></span> : null}
      </div>
    </Field>
  )
}

/** Logo · dark logo · stamp · a picture from this computer. */
function ImageSource({ value, onChange, dark }: { value: string; onChange: (src: string) => void; dark?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const named = value === 'logo' || value === 'logo-dark' || value === 'stamp'
  const opts = [{ value: 'logo', label: 'Brand logo' }, ...(dark ? [{ value: 'logo-dark', label: 'Logo for dark backgrounds' }] : []), { value: 'stamp', label: 'Company stamp' }, { value: 'custom', label: named ? 'A picture…' : 'Uploaded picture' }]
  return (
    <>
      <Sel label="Picture" value={named ? value : 'custom'} options={opts} onChange={(v) => { if (v === 'custom') input.current?.click(); else onChange(v) }} wide />
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onChange(await readFileAsDataUrl(f, 1600)) }} />
      {!named ? <span className={styles.addRow}><Button appearance="text" onPress={() => input.current?.click()}>Replace picture</Button></span> : null}
    </>
  )
}

function ItemsFields({ b, upd, style }: { b: ItemsBlock; upd: (p: Record<string, unknown>, c?: string) => void; style: (key: string, label: string) => ReactNode }) {
  const col = (i: number, patch: Partial<ItemsBlock['columns'][number]>) => upd({ columns: b.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) }, `col-${i}`)
  const nextAlign = (a: Align): Align => (a === 'left' ? 'center' : a === 'center' ? 'right' : 'left')
  return (
    <>
      <Sel label="Group by" value={b.groupBy} options={[{ value: 'none', label: 'The quote’s own groups' }, { value: 'category', label: 'Trade' }, { value: 'room', label: 'Room' }, { value: 'section', label: 'Section' }]} onChange={(v) => upd({ groupBy: v })} />
      <Sel label="Then by" value={b.subGroupBy} options={[{ value: 'none', label: 'Nothing' }, { value: 'room', label: 'Room' }, { value: 'category', label: 'Trade' }]} onChange={(v) => upd({ subGroupBy: v })} />
      <Seg label="Section labels" value={b.sectionLabel} options={[{ value: 'letters', label: 'A · B · C' }, { value: 'numbers', label: '1 · 2 · 3' }, { value: 'none', label: 'None' }]} onChange={(v) => upd({ sectionLabel: v })} />
      <Sel label="Item numbers" value={b.numbering} options={[{ value: 'group', label: 'Restart per section' }, { value: 'area', label: 'Restart per room' }, { value: 'continuous', label: 'Run through' }, { value: 'none', label: 'None' }]} onChange={(v) => upd({ numbering: v })} />
      <Sel label="Section bands" value={b.bandStyle} options={[{ value: 'grey', label: 'Grey band' }, { value: 'accent', label: 'Accent band' }, { value: 'black', label: 'Black band' }, { value: 'underlined', label: 'Underlined text' }, { value: 'inline', label: 'In the description column' }]} onChange={(v) => upd({ bandStyle: v })} />
      <Field label="Columns" wide>
        <div className={styles.list}>
          {b.columns.map((c, i) => (
            <div key={c.key} className={styles.row} data-off={!c.on || undefined}>
              <Sw label={ITEM_COLUMN_LABEL[c.key]} value={c.on} onChange={(on) => col(i, { on })} />
              <span className={styles.rowField}><TextField label={ITEM_COLUMN_LABEL[c.key]} value={c.label} onChange={(v) => col(i, { label: v })} /></span>
              {c.key !== 'item' ? <span className={styles.rowNarrow}><TextField label="mm" value={String(c.width)} numeric="digits" maxLength={3} onChange={(v) => { const n = Number(v); if (n > 0) col(i, { width: n }) }} /></span> : <span className={styles.rowMeta}>fills</span>}
              <Tooltip label={`Align ${c.align}`}><IconButton icon={`format_align_${c.align}`} label={`Align ${c.align}`} size={24} variant="bare" iconSize={18} onClick={() => col(i, { align: nextAlign(c.align) })} /></Tooltip>
            </div>
          ))}
        </div>
      </Field>
      <Group title="More options">
        <Sel label="Header row" value={b.headerRow} options={[{ value: 'plain', label: 'Plain' }, { value: 'ruled', label: 'Ruled' }, { value: 'band', label: 'Grey band' }, { value: 'black', label: 'Black band' }, { value: 'none', label: 'None' }]} onChange={(v) => upd({ headerRow: v })} />
        <Sel label="Descriptions" value={b.descriptions} options={[{ value: 'none', label: 'Hidden' }, { value: 'first', label: 'First line' }, { value: 'full', label: 'Every line' }, { value: 'bullets', label: 'As bullets' }]} onChange={(v) => upd({ descriptions: v })} />
        <Sel label="Zero amounts" value={b.zeroAmount} options={[{ value: 'FOC', label: 'FOC' }, { value: 'Inclusive', label: 'Inclusive' }, { value: '0.00', label: '0.00' }, { value: 'blank', label: 'Blank' }]} onChange={(v) => upd({ zeroAmount: v })} />
        <Sel label="Currency" value={b.currency} options={[{ value: 'S$', label: 'S$' }, { value: '$ ', label: '$ (spaced)' }, { value: 'none', label: 'Figures only' }]} onChange={(v) => upd({ currency: v })} />
        <Sel label="Row height" value={b.density} options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]} onChange={(v) => upd({ density: v })} />
        <Sel label="Hidden items" value={b.hiddenItems} options={[{ value: 'omit', label: 'Leave out' }, { value: 'no-price', label: 'Show without a price' }]} onChange={(v) => upd({ hiddenItems: v })} />
        <Sw label="Photos" value={b.photos} onChange={(v) => upd({ photos: v })} />
        <Sw label="Sub-total per section" value={b.subtotals} onChange={(v) => upd({ subtotals: v })} />
        {b.subtotals ? <Txt label="Sub-total label" value={b.subtotalLabel} fields={false} onChange={(v) => upd({ subtotalLabel: v }, 'subtotalLabel')} /> : null}
        <Sw label="Lump sum per section" value={b.lumpSum} onChange={(v) => upd({ lumpSum: v })} hint="Prints one amount per section instead of a price on every line" />
        <Sw label="Grid lines" value={b.grid} onChange={(v) => upd({ grid: v })} />
        <Sw label="Rule under each row" value={b.ruled} onChange={(v) => upd({ ruled: v })} />
        <Sw label="Zebra rows" value={b.zebra} onChange={(v) => upd({ zebra: v })} />
        <Sw label="Fill the page with empty rows" value={b.fillPage} onChange={(v) => upd({ fillPage: v })} />
        <Sw label="Total for each page" value={b.pageTotals} onChange={(v) => upd({ pageTotals: v })} />
        {b.pageTotals ? <Txt label="Page total label" value={b.pageTotalLabel} fields={false} onChange={(v) => upd({ pageTotalLabel: v }, 'pageTotalLabel')} /> : null}
        <Sw label="Keep a section on one page" value={b.keepGroups} onChange={(v) => upd({ keepGroups: v })} />
        <Sw label="Each section on a new page" value={b.groupNewPage} onChange={(v) => upd({ groupNewPage: v })} />
        <Sw label="Notes under section bands" value={b.groupNotes} onChange={(v) => upd({ groupNotes: v })} hint="The group's description in the quote editor" />
        <Sw label="Optional works section" value={b.optionalSection} onChange={(v) => upd({ optionalSection: v })} hint="Lines marked optional print here, out of the totals" />
        {b.optionalSection ? <Txt label="Optional section title" value={b.optionalTitle} fields={false} onChange={(v) => upd({ optionalTitle: v }, 'optionalTitle')} /> : null}
        {style('style', 'Rows')}{style('headerStyle', 'Header row')}{style('areaStyle', 'Section and room labels')}{style('groupNoteStyle', 'Section notes')}{style('descriptionStyle', 'Descriptions')}
        <BlockOptions b={b} upd={upd} />
      </Group>
    </>
  )
}

