'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { AFTER_TITLE, BANK_ROW_LABEL, BANK_ROWS, BLOCK_ICON, BLOCK_KINDS, BLOCK_LABEL, defaultBlock, detailsLook, ELEMENT_LABEL, ITEM_COLUMN_LABEL, ITEMS_SPACE_KEYS, ITEMS_SPACE_LABEL, isCanvas, newId, rowLinesOf, SINGLETON_KINDS, SOCIAL_KEYS, SOCIAL_LABEL, subtotalStyleOf, type Align, type Block, type BlockKind, type BrandKit, type CanvasBlock, type CanvasElement, type Currency, type ItemsBlock, type KVRow, type KvLines, type SignatureColumn, type TemplateDesign, type TextStyle } from '@/lib/templates/model'
import type { Selection } from '@/components/templates/render/canvas'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { COVER_LOOKS, coverLook, type CoverLookKey } from '@/lib/templates/covers'
import { TemplateThumb } from '@/components/templates/render/document'
import type { DocData } from '@/lib/templates/data'
import { defaultElement, duplicateBlock, flowBlocks, moveBlock, patchBlock, patchElement, removeBlock } from './editor-state'
import { ColorPick, Field, Group, Num, RichTxt, Seg, Sel, StyleEditor, Sub, Sw, Txt } from './inspector-controls'
import styles from './inspector.module.css'

export type DesignSetter = (fn: (d: TemplateDesign) => TemplateDesign, opts?: { coalesce?: string }) => void
type Props = { design: TemplateDesign; brand: BrandKit; selection: Selection; onDesign: DesignSetter; onSelect: (s: Selection) => void; /** (REG-542) the host removes with an Undo snackbar */ onDeleteBlock?: (id: string) => void; onDeleteElement?: (blockId: string, elId: string) => void; /** (REG-618, parity Q-19) the host resets a block to a new block's settings, with an Undo snackbar */ onResetBlock?: (id: string) => void; /** (REG-569) the quote on the page: a field in a text shows what it prints as */ values?: Record<string, string>; /** (Dane UAT, Figma 1517:21) the studio's trades, named under "Group the items by" */ trades?: string[]
  /** (pending modules S11) the quote on the page, for the cover looks' small pages; the host lays a look over the cover, with an Undo snackbar */ sample?: DocData; onCoverLook?: (blockId: string, key: CoverLookKey) => void }

/** (Dane UAT, Figma 1517:57) The words a new block of each kind starts with — what a box's Reset puts back. Built once, outside render. */
const FRESH = Object.fromEntries(BLOCK_KINDS.map((k) => [k, defaultBlock(k)])) as Record<BlockKind, Block>
const FRESH_PAGE_NO = (() => { const e = defaultElement('pageno'); return e.kind === 'pageno' ? e.format : '' })()

const ALIGN_OPTS: { value: Align; label: string; icon: string }[] = [{ value: 'left', label: 'Left', icon: 'format_align_left' }, { value: 'center', label: 'Centre', icon: 'format_align_center' }, { value: 'right', label: 'Right', icon: 'format_align_right' }]
/* (S44T — his UAT ask 2026-10-15) the new choices' words */
const KV_LINES: { value: KvLines; label: string }[] = [{ value: 'none', label: 'None' }, { value: 'under', label: 'A line under each value' }, { value: 'boxed', label: 'Boxed' }]
const CURRENCIES: { value: Currency; label: string }[] = [{ value: 'S$', label: 'S$' }, { value: '$ ', label: '$ with a space' }, { value: 'none', label: 'Figures only' }]
const PCT_AT: { value: 'inline' | 'column' | 'none'; label: string }[] = [{ value: 'inline', label: 'Before the words' }, { value: 'column', label: 'In its own column' }, { value: 'none', label: 'Not printed' }]
const ELEMENT_KINDS: CanvasElement['kind'][] = ['text', 'image', 'kv', 'rule', 'box', 'signature', 'badges', 'pageno', 'social']
const ELEMENT_ICON: Record<CanvasElement['kind'], string> = { text: 'text_fields', image: 'image', kv: 'list_alt', rule: 'horizontal_rule', box: 'rectangle', signature: 'draw', badges: 'verified', pageno: 'tab', social: 'share' }
const elementText = (e: CanvasElement) => e.kind === 'text' ? e.text.split('\n')[0] : e.kind === 'kv' ? e.rows.map((r) => r.label).filter(Boolean).join(' · ') : e.kind === 'image' ? (e.src === 'logo' || e.src === 'logo-dark' ? 'Logo' : e.src === 'stamp' ? 'Stamp' : e.src ? 'Picture' : 'no picture chosen yet') : e.kind === 'pageno' ? '' : e.kind === 'signature' ? `${e.columns.length} columns` : e.kind === 'social' ? e.networks.map((k) => SOCIAL_LABEL[k]).join(' · ') : ''

/**
 * The inspector (REG-486; 5b/5c corrected): what the selected block or element can change — the five controls that
 * matter first, everything else under More options. No block has a settings page of its own.
 */
const TOTAL_LINE_LABEL: Record<string, string> = { pages: 'Page totals', subtotal: 'Subtotal', discount: 'Line discounts', additional: 'Additional discount', gst: 'GST', total: 'Grand total' }

export function Inspector({ design, brand, selection, onDesign, onSelect, onDeleteBlock, onDeleteElement, onResetBlock, values, trades = [], sample, onCoverLook }: Props) {
  const block = design.blocks.find((b) => b.id === selection?.blockId) ?? null
  if (!block) {
    /* (REG-542) The resting state says what to do in three plain steps — "Inspector" meant nothing to a studio owner. */
    return (
      <div className={styles.inspector}>
        <div className={styles.head}><span className={styles.headTitle}>Nothing selected</span></div>
        {/* (the calm UI build 2026-10-27, 4-23) the editor's orientation lives here alone — the first-visit banner's handle moved with its job */}
        <div className={styles.empty} data-testid="editor-hint">
          <span className={styles.emptyGlyph}><Icon name="tune" size={40} weight={300} /></span>
          Click any part of the page to change it here.
          <div className={styles.emptySteps}>
            <span className={styles.emptyStep}><span className={styles.emptyNo}>1</span><span>Pick a part of the page, or a row under Page</span></span>
            <span className={styles.emptyStep}><span className={styles.emptyNo}>2</span><span>Change its words, columns or look here</span></span>
            <span className={styles.emptyStep}><span className={styles.emptyNo}>3</span><span>Press Publish when it looks right</span></span>
          </div>
        </div>
      </div>
    )
  }
  const element = isCanvas(block) && selection?.elementId ? block.elements.find((e) => e.id === selection.elementId) ?? null : null
  if (element && isCanvas(block)) return <ElementInspector block={block} element={element} brand={brand} onDesign={onDesign} onSelect={onSelect} onDelete={onDeleteElement} values={values} />
  return <BlockInspector block={block} design={design} brand={brand} onDesign={onDesign} onSelect={onSelect} onDelete={onDeleteBlock} onReset={onResetBlock} values={values} trades={trades} sample={sample} onCoverLook={onCoverLook} />
}

/** (Dane UAT, Figma 1517:57) A box's Reset: the words a new block of this kind starts with, put back as one undo step (never folded into the typing before it). */
type ResetFor = (field: string) => { reset?: string; onReset?: () => void }

function BlockInspector({ block: b, design, brand, onDesign, onSelect, onDelete, onReset, values, trades, sample, onCoverLook }: { block: Block; design: TemplateDesign; brand: BrandKit; onDesign: DesignSetter; onSelect: (s: Selection) => void; onDelete?: (id: string) => void; onReset?: (id: string) => void; values?: Record<string, string>; trades: string[]; sample?: DocData; onCoverLook?: (blockId: string, key: CoverLookKey) => void }) {
  const upd = (patch: Record<string, unknown>, coalesce?: string) => onDesign((d) => patchBlock(d, b.id, (x) => ({ ...x, ...patch }) as Block), coalesce ? { coalesce: `${b.id}:${coalesce}` } : undefined)
  const fresh = FRESH[b.kind] as unknown as Record<string, unknown>
  const rs: ResetFor = (field) => { const v = fresh[field]; return typeof v === 'string' && v ? { reset: v, onReset: () => upd({ [field]: v }) } : {} }   // a box that starts empty has nothing to put back
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
            <Tooltip label="Move up"><IconButton icon="arrow_upward" label="Move up" size={36} variant="bare" iconSize={20} disabled={at <= 0} onClick={() => onDesign((d) => moveBlock(d, b.id, -1))} /></Tooltip>
            <Tooltip label="Move down"><IconButton icon="arrow_downward" label="Move down" size={36} variant="bare" iconSize={20} disabled={at < 0 || at >= flow.length - 1} onClick={() => onDesign((d) => moveBlock(d, b.id, 1))} /></Tooltip>
          </> : null}
          <Tooltip label={b.hidden ? 'Show on the page' : 'Hide from the page'}><IconButton icon={b.hidden ? 'visibility_off' : 'visibility'} label={b.hidden ? 'Show on the page' : 'Hide from the page'} size={36} variant="bare" iconSize={20} onClick={() => upd({ hidden: !b.hidden })} /></Tooltip>
          {!singleton ? <Tooltip label="Duplicate"><IconButton icon="content_copy" label="Duplicate" size={36} variant="bare" iconSize={20} onClick={() => { const r = duplicateBlock(design, b.id); onDesign(() => r.design); onSelect({ blockId: r.id }) }} /></Tooltip> : null}
          <Tooltip label="Remove from the page"><IconButton icon="delete" label="Remove from the page" size={36} variant="bare" iconSize={20} onClick={() => { if (onDelete) onDelete(b.id); else { onSelect(null); onDesign((d) => removeBlock(d, b.id)) } }} /></Tooltip>
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {canvas ? <CanvasFields block={b} design={design} brand={brand} upd={upd} onDesign={onDesign} onSelect={onSelect} onReset={onReset} sample={sample} onCoverLook={onCoverLook} /> : null}
          {b.kind === 'details' ? <>
            {/* (S44T — UAT row 322) Layout is the columns; Lines is how the rows are drawn — the old "Form lines" layout is two columns with a line under each value */}
            <Seg label="Layout" value={detailsLook(b).layout} options={[{ value: 'columns', label: 'Two columns' }, { value: 'stacked', label: 'One column' }]} onChange={(v) => upd({ layout: v, lines: detailsLook(b).lines })} />
            <Sel label="Lines" value={detailsLook(b).lines} options={KV_LINES} onChange={(v) => upd({ lines: v, layout: detailsLook(b).layout })} />
            <Num label="Label width" unit="mm" value={b.labelWidth} min={8} max={80} onChange={(v) => upd({ labelWidth: v })} wide />
            <KvRows label="Left column" rows={b.left} onChange={(rows) => upd({ left: rows }, 'left')} values={values} />
            <KvRows label="Right column" rows={b.right} onChange={(rows) => upd({ right: rows }, 'right')} values={values} />
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Values')}{style('labelStyle', 'Labels')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'title' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} values={values} {...rs('title')} />
            <Txt label="Subject line" value={b.subject} onChange={(v) => upd({ subject: v }, 'subject')} values={values} />
            <Txt label="Introduction" value={b.intro} multiline onChange={(v) => upd({ intro: v }, 'intro')} values={values} {...rs('intro')} help />
            <Group title="More options"><Sub>Text styles</Sub>{style('titleStyle', 'Title')}{style('subjectStyle', 'Subject')}{style('introStyle', 'Introduction')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'items' ? <ItemsFields b={b} upd={upd} style={style} onReset={onReset} rs={rs} trades={trades} brand={brand}
                                             /* (S44T — M2) the Items table's Currency: the totals and the payment schedule print it too (each can print its own after) */
                                             onCurrency={(v) => onDesign((d) => ({ ...d, blocks: d.blocks.map((x) => (x.id === b.id || x.kind === 'totals' || x.kind === 'payments' ? { ...x, currency: v } as Block : x)) }))} /> : null}
          {b.kind === 'totals' ? <>
            <div className={styles.list} role="group" aria-label="Lines">
              {b.lines.map((l, i) => (
                <div key={l.key} className={styles.row} data-off={!l.on || undefined}>
                  {/* (REG-542) the switch, then the printed words labelled with the line's name — the old label-plus-field pair squeezed "Less discount" to "Less di…" */}
                  <Switch size="sm" isSelected={l.on} onChange={(on: boolean) => upd({ lines: b.lines.map((x, j) => (j === i ? { ...x, on } : x)) })} aria-label={`Print ${TOTAL_LINE_LABEL[l.key] ?? l.key}`} />
                  <span className={styles.rowField}><TextField label={TOTAL_LINE_LABEL[l.key] ?? l.key} value={l.label} onChange={(v) => upd({ lines: b.lines.map((x, j) => (j === i ? { ...x, label: v } : x)) }, `line-${l.key}`)} /></span>
                </div>
              ))}
            </div>
            <Seg label="Where it sits" value={b.layout} options={[{ value: 'right', label: 'On the right' }, { value: 'full', label: 'Full width' }]} onChange={(v) => upd({ layout: v })} />
            {b.layout === 'right' ? <Num label="Width" unit="mm" value={b.width} min={40} max={200} onChange={(v) => upd({ width: v })} wide /> : null}
            <Sel label="Lines" value={b.rules} options={[{ value: 'none', label: 'None' }, { value: 'top', label: 'A line above the total' }, { value: 'double', label: 'A double line under the total' }, { value: 'grid', label: 'Boxed' }]} onChange={(v) => upd({ rules: v })} />
            <Sel label="Currency" value={b.currency ?? 'S$'} options={CURRENCIES} onChange={(v) => upd({ currency: v })} />   {/* (S44T — M2, rows 253 · 300) */}
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Lines')}{style('totalStyle', 'Grand total')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'payments' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} values={values} {...rs('title')} />
            <Seg label="Shown as" value={b.layout} options={[{ value: 'table', label: 'Table' }, { value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }]} onChange={(v) => upd({ layout: v })} />
            <Sw label="Show amounts" value={b.showAmounts} onChange={(v) => upd({ showAmounts: v })} />
            <Sw label="Show due dates" value={b.showDue} onChange={(v) => upd({ showDue: v })} />
            {/* (REG-618, parity Q-16) How the milestones are marked: numbers, letters or ordinals. */}
            {/* (S44T — row 354) (a) · (b) · (c) joins the marks — four choices are a select: the segments no longer fit the pane (REG-542) */}
            <Sel label="Milestones are marked" value={b.parens ? 'parens' : b.ordinals ? 'ordinals' : b.letters ? 'letters' : 'numbers'} options={[{ value: 'numbers', label: '1 · 2 · 3' }, { value: 'letters', label: 'A · B · C' }, { value: 'parens', label: '(a) · (b) · (c)' }, { value: 'ordinals', label: '1st · 2nd · 3rd' }]} onChange={(v) => upd({ letters: v === 'letters', ordinals: v === 'ordinals' || undefined, parens: v === 'parens' || undefined })} />
            {/* (S44T — rows 355 · 310) where the share prints — a fixed row prints its own word there */}
            <Sel label="The percentage" value={b.pctAt === 'column' && b.layout !== 'table' ? 'inline' : b.pctAt ?? 'inline'} options={b.layout === 'table' ? PCT_AT : PCT_AT.filter((o) => o.value !== 'column')} onChange={(v) => upd({ pctAt: v === 'inline' ? undefined : v })} helper="A fixed fee prints its own word there — set it on the quote" />
            <Sel label="Currency" value={b.currency ?? 'S$'} options={CURRENCIES} onChange={(v) => upd({ currency: v })} />
            {/* (S44T — call C5, row 294) the PayNow QR beside the schedule, as Bank details prints it */}
            <Sw label="PayNow QR beside the schedule" value={!!b.qr} onChange={(v) => upd({ qr: v || undefined })} hint="Prints when the issuing entity has a QR uploaded in Company › Profile" />
            {b.qr ? <Num label="QR size" unit="mm" value={b.qrWidth ?? 26} min={12} max={60} onChange={(v) => upd({ qrWidth: v })} /> : null}
            <Sw label="Total line under the milestones" value={!!b.showTotal} onChange={(v) => upd({ showTotal: v })} hint="The percentages' sum and, with amounts on, the quote total" />   {/* (REG-560, T-2) */}
            <Txt label="Footnote under the schedule" value={b.footnote ?? ''} multiline onChange={(v) => upd({ footnote: v || undefined }, 'footnote')} values={values} />   {/* (REG-618, parity Q-16) */}
            <Group title="More options"><Sw label="Title as a black band" value={b.band} onChange={(v) => upd({ band: v })} /><Sub>Text styles</Sub>{style('style', 'Rows')}{style('titleStyle', 'Title')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'bank' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} values={values} {...rs('title')} />
            <Seg label="PayNow QR sits" value={b.layout} options={[{ value: 'row', label: 'Beside the details' }, { value: 'stacked', label: 'Below them' }]} onChange={(v) => upd({ layout: v })} />
            <Sw label="PayNow QR" value={b.qr} onChange={(v) => upd({ qr: v })} hint="Prints when the issuing entity has a QR uploaded in Company › Profile" />
            {b.qr ? <Num label="QR size" unit="mm" value={b.qrWidth} min={12} max={60} onChange={(v) => upd({ qrWidth: v })} /> : null}
            <Sel label="Box" value={b.box} options={[{ value: 'none', label: 'None' }, { value: 'tint', label: 'Tinted' }, { value: 'outline', label: 'Outlined' }]} onChange={(v) => upd({ box: v })} />
            <span className={styles.note}>The bank, account, SWIFT and PayNow come from Company › Profile › Issuing entities; the quote’s Issuing Entity picks which one prints.</span>
            <Group title="More options">
              {/* (REG-618, parity Q-24) The studio's own words for each row. */}
              <Sub>Row labels</Sub>
              {BANK_ROWS.map((k) => <Txt key={k} label={BANK_ROW_LABEL[k]} value={b.labels?.[k] ?? BANK_ROW_LABEL[k]} fields={false} onChange={(v) => upd({ labels: { ...(b.labels ?? {}), [k]: v } }, `label-${k}`)}
                                         reset={BANK_ROW_LABEL[k]} onReset={() => upd({ labels: { ...(b.labels ?? {}), [k]: BANK_ROW_LABEL[k] } })} />)}
              <Sub>Text styles</Sub>{style('style', 'Rows')}{style('titleStyle', 'Title')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'terms' || b.kind === 'notes' ? <>
            <Txt label="Title" value={b.title} onChange={(v) => upd({ title: v }, 'title')} values={values} {...rs('title')} />
            <Sw label="Number the paragraphs" value={b.numbered} onChange={(v) => upd({ numbered: v })} />
            <Sw label="Box each paragraph" value={b.grid} onChange={(v) => upd({ grid: v })} />
            <span className={styles.note}>{b.kind === 'terms' ? 'The text is each quote’s Terms and Conditions section; the Defaults tab picks the template a new quote starts with.' : 'The text is each quote’s Additional Notes section.'}</span>
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Paragraphs')}{style('titleStyle', 'Title')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'signature' ? <>
            <SignatureColumns columns={b.columns} onChange={(columns) => upd({ columns }, 'columns')} values={values} />
            <Num label="Line thickness" unit="pt" value={b.lineWeight} min={0} max={4} step={0.25} onChange={(v) => upd({ lineWeight: v })} />
            <ColorPick label="Line colour" value={b.lineColor} onChange={(c) => upd({ lineColor: c ?? 'ink' })} brand={brand} />
            <Txt label="Sentence above the signatures" value={b.preamble ?? ''} onChange={(v) => upd({ preamble: v || undefined }, 'preamble')} values={values} />
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Lines')}{style('headingStyle', 'Names')}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'text' ? <>
            {/* (S44G — NB-08) the block's words formatted with the house rich editor: b · i · u · lists · the kit's colours · links; Insert a field at the caret */}
            <RichTxt key={b.id} label="Text" value={b.html} onChange={(html, step) => upd({ html }, step ? undefined : 'html')} brand={brand} values={values} help placeholder="Type the words this part prints" />
            <Seg label="Box around it" value={b.box} options={[{ value: 'none', label: 'None' }, { value: 'tint', label: 'Tinted' }, { value: 'outline', label: 'Outlined' }]} onChange={(v) => upd({ box: v })} />
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Text', true)}<Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'image' ? <>
            <ImageSource value={b.src} onChange={(src) => upd({ src })} />
            <Num label="Width" unit="mm" value={b.width} min={5} max={200} onChange={(v) => upd({ width: v })} wide />
            <Seg label="Sits on the" value={b.align} options={ALIGN_OPTS} onChange={(v) => upd({ align: v })} />
            <Txt label="Caption" value={b.caption ?? ''} onChange={(v) => upd({ caption: v || undefined }, 'caption')} values={values} />
            <Group title="More options"><Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'divider' ? <>
            <Num label="Thickness" unit="pt" value={b.weight} min={0.25} max={6} step={0.25} onChange={(v) => upd({ weight: v })} wide />
            <ColorPick label="Colour" value={b.color} onChange={(c) => upd({ color: c ?? 'ink' })} brand={brand} wide />
            <Group title="More options"><Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
          {b.kind === 'spacer' ? <><Num label="Height" unit="mm" value={b.height} min={1} max={200} onChange={(v) => upd({ height: v })} wide /><Group title="More options"><Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group></> : null}
          {b.kind === 'pagebreak' ? <span className={styles.note}>Everything after this point starts on a new page.</span> : null}
          {b.kind === 'badges' ? <>
            <Num label="Height" unit="mm" value={b.height} min={4} max={40} onChange={(v) => upd({ height: v })} />
            <Seg label="Sit on the" value={b.align} options={ALIGN_OPTS} onChange={(v) => upd({ align: v })} wide={false} />
            <span className={styles.note}>The badges come from the brand kit — Templates › Brand kit.</span>
            <Group title="More options"><Sub>Placement</Sub><BlockOptions b={b} upd={upd} onReset={onReset} /></Group>
          </> : null}
        </div>
      </div>
    </div>
  )
}

/** Start on a new page · keep with next · space before / after · hidden (every flow block) — and (REG-618) Reset this block. */
function BlockOptions({ b, upd, onReset }: { b: Block; upd: (patch: Record<string, unknown>) => void; onReset?: (id: string) => void }) {
  if (isCanvas(b)) return null
  return (
    <>
      <Sw label="Start on a new page" value={!!b.startNewPage} onChange={(v) => upd({ startNewPage: v || undefined })} />
      <Sw label="Keep together with what follows" value={!!b.keepWithNext} onChange={(v) => upd({ keepWithNext: v || undefined })} hint="Moves to the next page together with the part after it" />
      <Num label="Space before" unit="mm" value={b.spaceBefore ?? 0} min={0} max={100} onChange={(v) => upd({ spaceBefore: v || undefined })} />
      <Num label="Space after" unit="mm" value={b.spaceAfter ?? 0} min={0} max={100} onChange={(v) => upd({ spaceAfter: v || undefined })} />
      {onReset ? <ResetBlock onReset={() => onReset(b.id)} /> : null}
    </>
  )
}

/** (REG-618, parity Q-19) Reset this block: back to a new block's settings — the host's snackbar offers Undo. */
function ResetBlock({ onReset }: { onReset: () => void }) {
  return (
    <span className={styles.addRow}>
      <Button appearance="text" iconStart={<Icon name="restart_alt" size={20} />} onPress={onReset}>Reset this block</Button>
    </span>
  )
}

function CanvasFields({ block: b, design, brand, upd, onDesign, onSelect, onReset, sample, onCoverLook }: { block: CanvasBlock; design: TemplateDesign; brand: BrandKit; upd: (p: Record<string, unknown>) => void; onDesign: DesignSetter; onSelect: (s: Selection) => void; onReset?: (id: string) => void; sample?: DocData; onCoverLook?: (blockId: string, key: CoverLookKey) => void }) {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <>
      {b.kind !== 'cover' ? <Num label="Height" unit="mm" value={b.height} min={6} max={150} onChange={(v) => upd({ height: v })} /> : null}
      {b.kind !== 'cover' ? <Sel label="Show on" value={b.repeat} options={[{ value: 'every', label: 'Every page' }, { value: 'first', label: 'First page only' }, { value: 'not-first', label: 'Every page after the first' }]} onChange={(v) => upd({ repeat: v })} /> : null}
      <ColorPick label="Background" value={b.background} onChange={(c) => upd({ background: c })} brand={brand} none wide />
      <Sw label={b.kind === 'footer' ? 'A line above it' : 'A line under it'} value={!!b.rule} onChange={(v) => upd({ rule: v ? { weight: 0.5, color: 'ink' } : null })} />
      {b.rule ? <>
        <Num label="Line thickness" unit="pt" value={b.rule.weight} min={0.25} max={4} step={0.25} onChange={(v) => upd({ rule: { ...b.rule, weight: v } })} />
        <ColorPick label="Line colour" value={b.rule.color} onChange={(c) => upd({ rule: { ...b.rule, color: c ?? 'ink' } })} brand={brand} />
      </> : null}
      <span className={styles.note}>Whatever grows — a Details box with one more row, a longer sentence — pushes down what sits under it, and the {BLOCK_LABEL[b.kind].toLowerCase()} grows with it.</span>
      <Field label={`On the ${BLOCK_LABEL[b.kind].toLowerCase()}`} wide>
        <div className={styles.list}>
          {b.elements.map((e) => (
            <button key={e.id} type="button" className={styles.rowBtn} onClick={() => onSelect({ blockId: b.id, elementId: e.id })}>
              <Icon name={ELEMENT_ICON[e.kind]} size={18} weight={300} />
              <span className={styles.rowLabel}>{ELEMENT_LABEL[e.kind]}{elementText(e) ? ` · ${elementText(e)}` : ''}</span>
              {e.locked ? <Icon name="lock" size={16} weight={300} /> : null}
            </button>
          ))}
          {b.elements.length === 0 ? <span className={styles.note}>Nothing on it yet.</span> : null}
        </div>
      </Field>
      <span className={styles.addRow}>
        <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setAddOpen((o) => !o)} aria-haspopup="menu" aria-expanded={addOpen}>Add to the {BLOCK_LABEL[b.kind].toLowerCase()}</Button>
        <Dropdown open={addOpen} onClose={() => setAddOpen(false)} align="left" width={MENU_WIDTH.standard} sheetTitle={`Add to the ${BLOCK_LABEL[b.kind].toLowerCase()}`}>
          {ELEMENT_KINDS.map((k) => <DropdownItem key={k} onSelect={() => { setAddOpen(false); const el = defaultElement(k); onDesign((d) => patchBlock(d, b.id, (x) => (isCanvas(x) ? { ...x, elements: [...x.elements, el] } : x))); onSelect({ blockId: b.id, elementId: el.id }) }}>{ELEMENT_LABEL[k]}</DropdownItem>)}
        </Dropdown>
      </span>
      <Group title="More options">
        {/* (pending modules S11 — card held:quote-templates, 1.0's five cover-page presets) the cover starts again from one of 1.0's looks */}
        {b.kind === 'cover' && onCoverLook && sample ? <><Sub>Start the cover from a look</Sub><CoverLooks design={design} brand={brand} sample={sample} onPick={(k) => onCoverLook(b.id, k)} /></> : null}
        <Sw label="Hidden from the page" value={!!b.hidden} onChange={(v) => upd({ hidden: v || undefined })} />{onReset ? <ResetBlock onReset={() => onReset(b.id)} /> : null}
      </Group>
    </>
  )
}

/** (pending modules S11) 1.0's five cover looks as cards: the look drawn small on this template's paper and brand, its name and 1.0's line.
    A press lays the look over the cover — its words, pictures and colour — and the host offers Undo. */
function CoverLooks({ design, brand, sample, onPick }: { design: TemplateDesign; brand: BrandKit; sample: DocData; onPick: (k: CoverLookKey) => void }) {
  const looks = useMemo(() => COVER_LOOKS.map((l) => { const c = coverLook(l.key, design.page.paper); return { ...l, design: { page: design.page, brand: design.brand, blocks: [{ id: `look-${l.key}`, kind: 'cover', height: 0, repeat: 'first', elements: c.elements, background: c.background }] } as TemplateDesign } }), [design.page, design.brand])
  return (
    <div className={styles.looks} role="list" aria-label="Cover looks" data-testid="cover-looks">
      {looks.map((l) => (
        <button key={l.key} type="button" role="listitem" className={styles.look} onClick={() => onPick(l.key)} data-testid="cover-look" data-look={l.key} aria-label={`Use the ${l.name} cover — ${l.line}`}>
          <span className={styles.lookThumb}><TemplateThumb design={l.design} brand={brand} data={sample} width={64} /></span>
          <span className={styles.lookText}><span className={styles.lookName}>{l.name}</span><span className={styles.lookLine}>{l.line}</span></span>
        </button>
      ))}
    </div>
  )
}

function ElementInspector({ block: b, element: e, brand, onDesign, onSelect, onDelete, values }: { block: CanvasBlock; element: CanvasElement; brand: BrandKit; onDesign: DesignSetter; onSelect: (s: Selection) => void; onDelete?: (blockId: string, elId: string) => void; values?: Record<string, string> }) {
  const upd = (patch: Record<string, unknown>, coalesce?: string) => onDesign((d) => patchElement(d, b.id, e.id, (x) => ({ ...x, ...patch }) as CanvasElement), coalesce ? { coalesce: `${e.id}:${coalesce}` } : undefined)
  const style = (key: string, label: string, more = false) => <StyleEditor label={label} value={(e as unknown as Record<string, TextStyle>)[key] ?? {}} onChange={(s) => upd({ [key]: s })} brand={brand} more={more} />
  const hasH = e.h !== undefined
  return (
    <div className={styles.inspector} data-testid="inspector">
      <div className={styles.head}>
        <Tooltip label={`Back to ${BLOCK_LABEL[b.kind]}`}><IconButton icon="arrow_back" label={`Back to ${BLOCK_LABEL[b.kind]}`} size={36} variant="bare" iconSize={20} onClick={() => onSelect({ blockId: b.id })} /></Tooltip>
        <span className={styles.headTitle}>{ELEMENT_LABEL[e.kind]}<span className={styles.headSub}> in the {BLOCK_LABEL[b.kind].toLowerCase()}</span></span>   {/* (REG-569) "Details · Header" read as a code */}
        <span className={styles.headActions}>
          <Tooltip label={e.locked ? 'Unlock' : 'Lock in place'}><IconButton icon={e.locked ? 'lock' : 'lock_open'} label={e.locked ? 'Unlock' : 'Lock in place'} size={36} variant="bare" iconSize={20} selected={!!e.locked} onClick={() => upd({ locked: !e.locked || undefined })} /></Tooltip>
          <Tooltip label="Duplicate"><IconButton icon="content_copy" label="Duplicate element" size={36} variant="bare" iconSize={20} onClick={() => { const copy = { ...JSON.parse(JSON.stringify(e)) as CanvasElement, id: newId('e'), y: e.y + 4 }; onDesign((d) => patchBlock(d, b.id, (x) => (isCanvas(x) ? { ...x, elements: [...x.elements, copy] } : x))); onSelect({ blockId: b.id, elementId: copy.id }) }} /></Tooltip>
          <Tooltip label="Remove"><IconButton icon="delete" label="Remove" size={36} variant="bare" iconSize={20} onClick={() => { if (onDelete) onDelete(b.id, e.id); else { onSelect({ blockId: b.id }); onDesign((d) => patchBlock(d, b.id, (x) => (isCanvas(x) ? { ...x, elements: x.elements.filter((y) => y.id !== e.id) } : x))) } }} /></Tooltip>
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {e.kind === 'text' ? <>
            <Txt label="Text" value={e.text} multiline onChange={(v) => upd({ text: v }, 'text')} values={values} help />
            <span className={styles.note}>Tip: double-click the text on the page to type straight into it.</span>
            {style('style', 'Style', true)}
            <Sw label="Hide when every field is empty" value={!!e.hideIfEmpty} onChange={(v) => upd({ hideIfEmpty: v || undefined })} />
          </> : null}
          {e.kind === 'image' ? <>
            <ImageSource value={e.src} onChange={(src) => upd({ src })} dark />
            <Seg label="Fit" value={e.fit} options={[{ value: 'contain', label: 'Fit inside' }, { value: 'cover', label: 'Fill' }]} onChange={(v) => upd({ fit: v })} />
            <ColorPick label="Box behind" value={e.box} onChange={(c) => upd({ box: c })} brand={brand} none wide />
          </> : null}
          {e.kind === 'kv' ? <>
            <KvRows label="Rows" rows={e.rows} onChange={(rows) => upd({ rows }, 'rows')} values={values} />
            <Num label="Label column width" unit="mm" value={e.labelWidth} min={4} max={80} onChange={(v) => upd({ labelWidth: v })} wide />
            <Num label="Space between rows" unit="mm" value={e.gap} min={0} max={10} step={0.1} onChange={(v) => upd({ gap: v })} wide />
            <Sel label="Lines" value={e.lines} options={KV_LINES} onChange={(v) => upd({ lines: v })} />   {/* (S44T — UAT row 322) none · under the values · boxed */}
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Values')}{style('labelStyle', 'Labels')}</Group>
          </> : null}
          {e.kind === 'rule' ? <>
            <Num label="Thickness" unit="pt" value={e.weight} min={0.25} max={6} step={0.25} onChange={(v) => upd({ weight: v })} />
            <ColorPick label="Colour" value={e.color} onChange={(c) => upd({ color: c ?? 'ink' })} brand={brand} />
          </> : null}
          {e.kind === 'box' ? <>
            <ColorPick label="Fill" value={e.fill} onChange={(c) => upd({ fill: c })} brand={brand} none wide />
            <ColorPick label="Outline" value={e.stroke} onChange={(c) => upd({ stroke: c })} brand={brand} none wide />
            {e.stroke ? <Num label="Outline thickness" unit="pt" value={e.weight ?? 0.5} min={0.25} max={6} step={0.25} onChange={(v) => upd({ weight: v })} /> : null}
          </> : null}
          {e.kind === 'signature' ? <>
            <SignatureColumns columns={e.columns} onChange={(columns) => upd({ columns }, 'columns')} values={values} />
            <Num label="Line thickness" unit="pt" value={e.lineWeight} min={0} max={4} step={0.25} onChange={(v) => upd({ lineWeight: v })} />
            <ColorPick label="Line colour" value={e.lineColor} onChange={(c) => upd({ lineColor: c ?? 'ink' })} brand={brand} />
            <Txt label="Sentence above the signatures" value={e.preamble ?? ''} onChange={(v) => upd({ preamble: v || undefined }, 'preamble')} values={values} />
            <Group title="More options"><Sub>Text styles</Sub>{style('style', 'Lines')}{style('headingStyle', 'Names')}</Group>
          </> : null}
          {e.kind === 'badges' ? <>
            <Seg label="Sit on the" value={e.align} options={ALIGN_OPTS} onChange={(v) => upd({ align: v })} wide={false} />
            <Num label="Space between" unit="mm" value={e.gap} min={0} max={20} step={0.5} onChange={(v) => upd({ gap: v })} />
            <span className={styles.note}>The badges come from the brand kit — Templates › Brand kit.</span>
          </> : null}
          {e.kind === 'pageno' ? <>
            <Txt label="Reads" value={e.format} onChange={(v) => upd({ format: v }, 'format')} values={values} reset={FRESH_PAGE_NO} onReset={() => upd({ format: FRESH_PAGE_NO })} />
            {style('style', 'Style')}
          </> : null}
          {e.kind === 'social' ? <>
            {/* (REG-618, parity Q-20) Which networks print — each only when Company › Profile has it. */}
            <Field label="Networks" wide>
              <div className={styles.list}>
                {SOCIAL_KEYS.map((k) => (
                  <label key={k} className={styles.row} data-off={!e.networks.includes(k) || undefined}>
                    <Switch size="sm" isSelected={e.networks.includes(k)} onChange={(on: boolean) => upd({ networks: on ? SOCIAL_KEYS.filter((x) => x === k || e.networks.includes(x)) : e.networks.filter((x) => x !== k) })} aria-label={`Print ${SOCIAL_LABEL[k]}`} />
                    <span className={styles.rowLabel}>{SOCIAL_LABEL[k]}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Seg label="Laid out" value={e.layout} options={[{ value: 'row', label: 'In a row' }, { value: 'column', label: 'One under another' }]} onChange={(v) => upd({ layout: v })} />
            <Num label="Space between" unit="mm" value={e.gap} min={0} max={20} step={0.5} onChange={(v) => upd({ gap: v })} />
            <span className={styles.note}>The handles come from Company › Profile › Social links; a network left empty there prints nothing.</span>
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

/** Swap two neighbours — the ▲ ▼ on the Details rows (REG-560, T-8) and the Items columns (REG-560, T-1). */
const swap = <T,>(list: T[], i: number, j: number): T[] => { if (j < 0 || j >= list.length) return list; const next = [...list]; const a = next[i]!; next[i] = next[j]!; next[j] = a; return next }

/** (REG-569) A Details row as a card: the label with its move / remove buttons, then the value with its field menu and what it prints as. */
function KvRows({ label, rows, onChange, values }: { label: string; rows: KVRow[]; onChange: (rows: KVRow[]) => void; values?: Record<string, string> }) {
  return (
    <Field label={label} wide>
      <div className={styles.list}>
        {rows.map((r, i) => (
          <div key={r.id} className={styles.card} data-testid="kv-row">
            <div className={styles.cardLine}>
              <span className={styles.cardGrow}><TextField label="Label" value={r.label} onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, label: v } : x)))} /></span>
              <span className={styles.cardActions}>
                {/* (S44T — UAT row 248) this row's label in bold */}
                <Tooltip label="Label in bold"><IconButton icon="format_bold" label="Label in bold" size={36} variant="bare" iconSize={20} selected={!!r.labelBold} onClick={() => onChange(rows.map((x, j) => (j === i ? { ...x, labelBold: !x.labelBold || undefined } : x)))} /></Tooltip>
                <Tooltip label="Move up"><IconButton icon="arrow_upward" label="Move the row up" size={36} variant="bare" iconSize={20} disabled={i === 0} onClick={() => onChange(swap(rows, i, i - 1))} /></Tooltip>
                <Tooltip label="Move down"><IconButton icon="arrow_downward" label="Move the row down" size={36} variant="bare" iconSize={20} disabled={i === rows.length - 1} onClick={() => onChange(swap(rows, i, i + 1))} /></Tooltip>
                <Tooltip label="Remove the row"><IconButton icon="close" label="Remove the row" size={36} variant="bare" iconSize={20} onClick={() => onChange(rows.filter((_, j) => j !== i))} /></Tooltip>
              </span>
            </div>
            <div className={styles.cardLine}>
              <span className={styles.cardGrow}><Txt label="Value" value={r.value} onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, value: v } : x)))} values={values} /></span>
              <span className={styles.cardActions}><Tooltip label="Value in bold"><IconButton icon="format_bold" label="Value in bold" size={36} variant="bare" iconSize={20} selected={!!r.valueBold} onClick={() => onChange(rows.map((x, j) => (j === i ? { ...x, valueBold: !x.valueBold || undefined } : x)))} /></Tooltip></span>   {/* (S44T — row 248) */}
            </div>
          </div>
        ))}
        <span className={styles.addRow}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => onChange([...rows, { id: newId('r'), label: 'Label', value: '' }])}>Add a row</Button></span>
      </div>
    </Field>
  )
}

function SignatureColumns({ columns, onChange, values }: { columns: SignatureColumn[]; onChange: (c: SignatureColumn[]) => void; values?: Record<string, string> }) {
  const set = (i: number, patch: Partial<SignatureColumn>) => onChange(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  return (
    <Field label={`Who signs · ${columns.length} ${columns.length === 1 ? 'column' : 'columns'}`} wide>
      <div className={styles.list}>
        {columns.map((c, i) => (
          <div key={c.id} className={styles.grid} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--om-color-surface-variant)' : undefined }}>
            <Txt label="Name" value={c.heading} onChange={(v) => set(i, { heading: v })} values={values} />
            <Txt label="Lines under the name" value={c.lines.join('\n')} multiline onChange={(v) => set(i, { lines: v.split('\n') })} values={values} />
            <Sel label="Above the line" value={c.image} options={[{ value: 'none', label: 'Nothing — a line to sign on' }, { value: 'member', label: 'Your signature' }, { value: 'client', label: 'The client’s signature' }, { value: 'stamp', label: 'The company stamp' }]} onChange={(v) => set(i, { image: v })} />
            <Field wide><TextField label="Small print under it" value={c.caption ?? ''} onChange={(v) => set(i, { caption: v || undefined })} /></Field>
            {columns.length > 1 ? <span className={styles.addRow}><Button appearance="text" onPress={() => onChange(columns.filter((_, j) => j !== i))}>Remove this column</Button></span> : null}
          </div>
        ))}
        {columns.length < 4 ? <span className={styles.addRow}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => onChange([...columns, { id: newId('c'), heading: 'Name', lines: [], image: 'none' }])}>Add a column</Button></span> : null}
      </div>
    </Field>
  )
}

/** Logo · dark logo · stamp · a picture from this computer. */
function ImageSource({ value, onChange, dark }: { value: string; onChange: (src: string) => void; dark?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const named = value === 'logo' || value === 'logo-dark' || value === 'stamp'
  const empty = !value   // (pending modules S11) a cover look's photo place, waiting for the studio's picture
  const opts = [{ value: 'logo', label: 'Brand logo' }, ...(dark ? [{ value: 'logo-dark', label: 'Logo for dark backgrounds' }] : []), { value: 'stamp', label: 'Company stamp' }, { value: 'custom', label: named || empty ? 'A picture…' : 'Uploaded picture' }]
  return (
    <>
      <Sel label="Picture" value={named ? value : 'custom'} options={opts} onChange={(v) => { if (v === 'custom') input.current?.click(); else onChange(v) }} wide />
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onChange(await readFileAsDataUrl(f, 1600)) }} />
      {!named ? <span className={styles.addRow}><Button appearance="text" onPress={() => input.current?.click()}>{empty ? 'Choose a picture' : 'Replace picture'}</Button></span> : null}
      {empty ? <span className={styles.note}>Nothing prints here until you choose a picture.</span> : null}
    </>
  )
}

function ItemsFields({ b, upd, style, onReset, rs, trades, brand, onCurrency }: { b: ItemsBlock; upd: (p: Record<string, unknown>, c?: string) => void; style: (key: string, label: string, more?: boolean) => ReactNode; onReset?: (id: string) => void; rs: ResetFor; trades: string[]; brand: BrandKit; onCurrency: (v: Currency) => void }) {
  const space = (k: (typeof ITEMS_SPACE_KEYS)[number], v: number) => upd({ spacing: { ...(b.spacing ?? {}), [k]: v || undefined } }, `space-${k}`)
  const bandFill = b.bandStyle === 'grey' || b.bandStyle === 'accent' || b.bandStyle === 'black'
  const col = (i: number, patch: Partial<ItemsBlock['columns'][number]>) => upd({ columns: b.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) }, `col-${i}`)
  const nextAlign = (a: Align): Align => (a === 'left' ? 'center' : a === 'center' ? 'right' : 'left')
  /* (the calm UI build 2026-10-27, 4-23) the one column card that is open — its heading, width, alignment, place and colour */
  const [openCol, setOpenCol] = useState<string | null>(null)
  const ALIGN_WORD: Record<Align, string> = { left: 'left', center: 'centre', right: 'right' }
  /* (Dane UAT, Figma 1517:21) "Trade" keeps its name (REG-561 · REG-569); the line under the box says it in the studio's own words — its trades. */
  const tradeHelp = trades.length ? `A trade is one of your works — ${trades.slice(0, 2).join(', ')}${trades.length > 2 ? ' and the rest' : ''} in Settings › Quotes & pricing.` : 'A trade is one of your works, as listed in Settings › Quotes & pricing.'
  /* (Dane UAT, Figma 1518:77) Numbering the room rows needs room rows: picked while nothing splits the sections, the rooms split them. */
  const pickNumbering = (v: ItemsBlock['numbering']) => upd((v === 'rooms' || v === 'roman') && b.subGroupBy === 'none' && b.groupBy !== 'room' ? { numbering: v, subGroupBy: 'room' } : { numbering: v })
  return (
    <>
      <Sel label="Group the items by" value={b.groupBy} options={[{ value: 'none', label: 'The quote’s own sections' }, { value: 'category', label: 'Trade' }, { value: 'room', label: 'Room' }, { value: 'section', label: 'Print group' }]} onChange={(v) => upd({ groupBy: v })} helper={tradeHelp} />
      <Sel label="Then split each by" value={b.subGroupBy} options={[{ value: 'none', label: 'Nothing' }, { value: 'room', label: 'Room' }, { value: 'category', label: 'Trade' }]} onChange={(v) => upd({ subGroupBy: v })} />
      <Seg label="Sections are marked" value={b.sectionLabel} options={[{ value: 'letters', label: 'A · B · C' }, { value: 'numbers', label: '1 · 2 · 3' }, { value: 'none', label: 'Not at all' }]} onChange={(v) => upd({ sectionLabel: v })} />
      <Sel label="Item numbers" value={b.numbering} options={[{ value: 'group', label: 'Start again in each section' }, { value: 'area', label: 'Start again in each room' }, { value: 'continuous', label: 'Run through the whole quote' }, { value: 'lettered', label: 'A1 · A2 · B1' }, { value: 'nested', label: '1 · 1.1 · a b c' }, { value: 'rooms', label: 'B · 1 Kitchen · 1.1' }, { value: 'roman', label: '1 · a · i' }, { value: 'none', label: 'None' }]} onChange={pickNumbering} />
      <Sel label="Section headings" value={b.bandStyle} options={[{ value: 'grey', label: 'Grey band' }, { value: 'accent', label: 'Accent band' }, { value: 'black', label: 'Black band' }, { value: 'underlined', label: 'Underlined words' }, { value: 'inline', label: 'In the description column' }]} onChange={(v) => upd({ bandStyle: v })} />
      <Field label="Columns" wide>
        <div className={styles.list}>
          {b.columns.map((c, i) => (
            /* (REG-569) A column as a card: the switch and the column's name with its order buttons, then the printed heading, the width and the alignment — the one-line row had squeezed the heading box to a letter. */
            /* (the calm UI build 2026-10-27, the UI audit's 4-23 — the owner's rule for this editor, progressive disclosure, REG-542) one row a
               column at rest — its switch and its name — and its heading, width, alignment, place and colour one press away (its chevron); about
               sixty controls had stood in the panel at once. Every control is the one it was, inside. */
            <div key={c.key} className={styles.card} data-off={!c.on || undefined} data-open={openCol === c.key || undefined} data-testid="column-card">
              <div className={styles.cardLine}>
                <Switch size="sm" isSelected={c.on} onChange={(on: boolean) => col(i, { on })} aria-label={`Print the ${ITEM_COLUMN_LABEL[c.key]} column`} />
                <span className={styles.cardName}>{ITEM_COLUMN_LABEL[c.key]}</span>
                {c.label !== ITEM_COLUMN_LABEL[c.key] && openCol !== c.key ? <span className={styles.cardAlt}>“{c.label}”</span> : null}
                <span className={styles.cardActions}>
                  <Tooltip label={openCol === c.key ? 'Done' : `Change the ${ITEM_COLUMN_LABEL[c.key]} column`}>
                    <IconButton icon={openCol === c.key ? 'expand_less' : 'expand_more'} label={`Change the ${ITEM_COLUMN_LABEL[c.key]} column`} aria-expanded={openCol === c.key} size={36} variant="bare" iconSize={20}
                                onClick={() => setOpenCol((k) => (k === c.key ? null : c.key))} data-testid="column-card-open" />
                  </Tooltip>
                </span>
              </div>
              {openCol === c.key ? (
                <>
                  <div className={styles.cardLine}>
                    <span className={styles.cardGrow}><TextField label="Heading on the page" value={c.label} onChange={(v) => col(i, { label: v })} /></span>   {/* the column's name is on the line above; "mm" keeps the width box short */}
                    {c.key !== 'item' ? <span className={styles.rowMm}><TextField label="mm" value={String(c.width)} numeric="digits" maxLength={3} onChange={(v) => { const n = Number(v); if (n > 0) col(i, { width: n }) }} /></span> : <span className={styles.cardMeta}>takes the rest</span>}
                  </div>
                  <div className={styles.cardLine}>
                    <span className={styles.cardGrow}><span className={styles.cardMeta}>Aligned {ALIGN_WORD[c.align]} · its place on the page</span></span>
                    <span className={styles.cardActions}>
                      <Tooltip label={`Aligned ${ALIGN_WORD[c.align]} — press to change`}><IconButton icon={`format_align_${c.align}`} label={`Aligned ${ALIGN_WORD[c.align]} — press to change`} size={36} variant="bare" iconSize={20} onClick={() => col(i, { align: nextAlign(c.align) })} /></Tooltip>
                      {/* (Dane UAT, Figma 1517:27) left and right arrows: the move is across the page, as the tooltips always said */}
                      <Tooltip label="Move left on the page"><IconButton icon="arrow_back" label={`Move ${ITEM_COLUMN_LABEL[c.key]} left`} size={36} variant="bare" iconSize={20} disabled={i === 0} onClick={() => upd({ columns: swap(b.columns, i, i - 1) })} /></Tooltip>
                      <Tooltip label="Move right on the page"><IconButton icon="arrow_forward" label={`Move ${ITEM_COLUMN_LABEL[c.key]} right`} size={36} variant="bare" iconSize={20} disabled={i === b.columns.length - 1} onClick={() => upd({ columns: swap(b.columns, i, i + 1) })} /></Tooltip>
                    </span>
                  </div>
                  {/* (S44T — UAT row 309) a printed column's colour — a kit colour or any hex; the # column's colours the section and sub-section marks too */}
                  {c.on ? <ColorPick label="Colour" value={c.color} onChange={(v) => col(i, { color: v })} brand={brand} none wide /> : null}
                </>
              ) : null}
            </div>
          ))}
        </div>
        <span className={styles.note}>Top to bottom here is left to right on the page.</span>
      </Field>
      <Group title="More options">
        <Sub>Table look</Sub>
        <Sel label="Column headings" value={b.headerRow} options={[{ value: 'plain', label: 'Plain words' }, { value: 'ruled', label: 'With a line under them' }, { value: 'band', label: 'On a grey band' }, { value: 'black', label: 'On a black band' }, { value: 'none', label: 'No headings' }]} onChange={(v) => upd({ headerRow: v })} />
        <Sel label="Row height" value={b.density} options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Roomy' }]} onChange={(v) => upd({ density: v })} />
        {/* (S44T — M1, row 252) the section heading band's own height */}
        <Sel label="Section heading height" value={b.headingHeight ?? 'rows'} options={[{ value: 'rows', label: 'As the rows' }, { value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Roomy' }]} onChange={(v) => upd({ headingHeight: v === 'rows' ? undefined : v })} />
        <Sel label="Descriptions" value={b.descriptions} options={[{ value: 'none', label: 'Not printed' }, { value: 'first', label: 'First line only' }, { value: 'full', label: 'Every line' }, { value: 'bullets', label: 'As bullet points' }]} onChange={(v) => upd({ descriptions: v })} />
        <Sw label="Item photos" value={b.photos} onChange={(v) => upd({ photos: v })} />
        <Sw label="Grid lines" value={b.grid} onChange={(v) => upd({ grid: v })} />
        {/* (S44T — UAT row 363) none · between rows (the table's last row bare) · under every row — a stored template keeps its "under each row" */}
        {!b.grid ? <Sel label="Lines between rows" value={rowLinesOf(b)} options={[{ value: 'none', label: 'None' }, { value: 'between', label: 'Between rows' }, { value: 'under', label: 'Under every row' }]} onChange={(v) => upd({ rowLines: v, ruled: v !== 'none' })} /> : null}
        <Sw label="Shade every other row" value={b.zebra} onChange={(v) => upd({ zebra: v })} />
        <Sub>Amounts</Sub>
        <Sel label="Currency" value={b.currency} options={CURRENCIES} onChange={onCurrency} helper="The totals and the payment schedule print it the same way" />   {/* (S44T — M2) */}
        <Sel label="A zero quantity prints" value={b.zeroQty ?? 'blank'} options={[{ value: 'blank', label: 'Nothing' }, { value: 'dash', label: 'A dash (–)' }]} onChange={(v) => upd({ zeroQty: v === 'blank' ? undefined : v })} />   {/* (S44T — row 324) */}
        <Sel label="A line that costs nothing prints" value={b.zeroAmount} options={[{ value: 'FOC', label: 'FOC' }, { value: 'Inclusive', label: 'Inclusive' }, { value: '0.00', label: '0.00' }, { value: 'blank', label: 'Nothing' }]} onChange={(v) => upd({ zeroAmount: v })} />
        <Sel label="Items hidden from the client" value={b.hiddenItems} options={[{ value: 'omit', label: 'Left out' }, { value: 'no-price', label: 'Shown without a price' }]} onChange={(v) => upd({ hiddenItems: v })} helper="Lines you hid from the client in the quote editor." />
        <Sw label="Sub-total under each section" value={b.subtotals} onChange={(v) => upd({ subtotals: v })} />
        {/* (REG-617, parity Q-21) Where the sub-total sits: after the items, in the section's heading, or both. */}
        {b.subtotals ? <Seg label="Sub-total sits" value={b.subtotalAt ?? 'row'} options={[{ value: 'row', label: 'After the items' }, { value: 'band', label: 'In the heading' }, { value: 'both', label: 'Both' }]} onChange={(v) => upd({ subtotalAt: v })} /> : null}
        {b.subtotals && (b.subtotalAt ?? 'row') !== 'band' ? <Txt label="Sub-total reads" value={b.subtotalLabel} fields={false} onChange={(v) => upd({ subtotalLabel: v }, 'subtotalLabel')} {...rs('subtotalLabel')} /> : null}
        <Sw label="One lump sum per section" value={b.lumpSum} onChange={(v) => upd({ lumpSum: v })} hint="Prints one amount per section instead of a price on every line" />
        <Sw label="A total for each page" value={b.pageTotals} onChange={(v) => upd({ pageTotals: v })} />
        {b.pageTotals ? <Txt label="Page total reads" value={b.pageTotalLabel} fields={false} onChange={(v) => upd({ pageTotalLabel: v }, 'pageTotalLabel')} {...rs('pageTotalLabel')} /> : null}
        <Sub>Sections and pages</Sub>
        <Sw label="Section notes" value={b.groupNotes} onChange={(v) => upd({ groupNotes: v })} hint="A section's own note prints under its heading; a section without one prints its trade's note from Settings › Quotes & pricing" />
        {/* (S44T — UAT rows 270 · 329) how wide a section's note runs, and whether it sits inside the heading's band */}
        {b.groupNotes ? <Sel label="Section notes run" value={b.noteWidth ?? 'table'} options={[{ value: 'table', label: 'Across the table' }, { value: 'item', label: 'Under the Item column' }]} onChange={(v) => upd({ noteWidth: v === 'table' ? undefined : v })} /> : null}
        {b.groupNotes && bandFill ? <Sw label="Section notes sit in the heading’s band" value={!!b.noteInBand} onChange={(v) => upd({ noteInBand: v || undefined })} /> : null}
        {/* (REG-617, parity Q-11) With the Optional price column on, optional lines stay in their sections — the Optional works section has nothing left to print. */}
        {b.columns.some((c) => c.key === 'optional' && c.on)
          ? <span className={styles.note}>The Optional price column is on: lines marked optional print in their own sections, priced in that column and out of the totals.</span>
          : <>
            <Sw label="Optional works section" value={b.optionalSection} onChange={(v) => upd({ optionalSection: v })} hint="Lines marked optional print here, out of the totals" />
            {b.optionalSection ? <Txt label="That section is called" value={b.optionalTitle} fields={false} onChange={(v) => upd({ optionalTitle: v }, 'optionalTitle')} {...rs('optionalTitle')} /> : null}
          </>}
        <Sw label="Keep a section on one page" value={b.keepGroups} onChange={(v) => upd({ keepGroups: v })} />
        <Sw label="Each section on a new page" value={b.groupNewPage} onChange={(v) => upd({ groupNewPage: v })} />
        <Sw label="Fill the page with empty rows" value={b.fillPage} onChange={(v) => upd({ fillPage: v })} />
        {/* (S44T — call C1) the part a quote's sections priced after the contract print in */}
        <Txt label="Work priced after the contract is headed" value={b.afterTitle ?? AFTER_TITLE} fields={false} onChange={(v) => upd({ afterTitle: v }, 'afterTitle')} reset={AFTER_TITLE} onReset={() => upd({ afterTitle: undefined })} />
        {/* (S44T — M1, rows 257 · 265 · 266 · 267 · 303) space inside the table; 0 = none */}
        <Sub>Spacing</Sub>
        {ITEMS_SPACE_KEYS.map((k) => <Num key={k} label={ITEMS_SPACE_LABEL[k]} unit="mm" value={b.spacing?.[k] ?? 0} min={0} max={20} step={0.5} onChange={(v) => space(k, v)} wide />)}   {/* a whole row each: a half column cut "Before a section" to "Before a secti…" */}
        <Sub>Text styles</Sub>
        {/* (S44T — M3 · M2) the Items styles open with Line height; the sub-total rows have a style of their own */}
        {style('style', 'Rows', true)}{style('headerStyle', 'Column headings', true)}{style('areaStyle', 'Section and room names', true)}{style('groupNoteStyle', 'Section notes', true)}{style('descriptionStyle', 'Descriptions', true)}
        <StyleEditor label="Sub-totals" value={subtotalStyleOf(b)} onChange={(st) => upd({ subtotalStyle: st })} brand={brand} more />
        <Sub>Placement</Sub>
        <BlockOptions b={b} upd={upd} onReset={onReset} />
      </Group>
    </>
  )
}

