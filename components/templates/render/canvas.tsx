'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { BLOCK_LABEL, ELEMENT_LABEL, mm, MM_PX, resolveColor, SOCIAL_LABEL, type BrandKit, type CanvasBlock, type CanvasElement, type KVRow, type KvLines, type SignatureColumn, type SocialKey, type TextStyle } from '@/lib/templates/model'
import { isEmptyResolved, isVariationDoc, resolveFields, variationHeading } from '@/lib/templates/fields'
import { stampSvg } from '@/lib/templates/assets'
import { docLetterhead, type DocData } from '@/lib/templates/data'
import { textCss, pt } from './styles'
import styles from './document.module.css'

export type Selection = { blockId: string; elementId?: string } | null
export type Interactive = {
  selected: Selection
  onSelect: (sel: Selection) => void
  onMoveElement: (blockId: string, elementId: string, patch: { x?: number; y?: number; w?: number; h?: number }, commit: boolean) => void
  onEditText: (blockId: string, elementId: string | null, field: string, text: string) => void
  zoom: number
}
export type RenderCtx = { brand: BrandKit; data: DocData; values: Record<string, string>; interactive?: Interactive }

/** A signature as the document draws it: the member's typed or drawn mark, the client's name once signed, the studio's stamp. */
export function SignatureMark({ image, ctx, height }: { image: SignatureColumn['image']; ctx: RenderCtx; height: number }) {
  const { data, brand } = ctx
  if (image === 'none') return null
  if (image === 'stamp') {
    const head = docLetterhead(data)   // (REG-618) a quote raised under another entity stamps with that entity's name and UEN
    return <img className={styles.sigImg} style={{ height }} src={brand.stamp ?? stampSvg(head.name, head.uen)} alt="" draggable={false} />
  }
  if (image === 'member') {
    const s = data.memberSignature
    if (!s) return <span style={{ height }} />
    if (s.kind === 'draw' && s.data) return <svg className={styles.sigImg} style={{ height }} viewBox="0 0 752 140" aria-hidden><path d={s.data} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    // eslint-disable-next-line @next/next/no-img-element
    if (s.kind === 'image' && s.data) return <img className={styles.sigImg} style={{ height }} src={s.data} alt="" draggable={false} />   /* (Dane UAT 6.23) an uploaded signature prints where a drawn one does */
    return <span className={styles.sigTyped} style={{ height, fontSize: height * 0.55 }}>{s.name}</span>
  }
  const c = data.clientSignature
  return c ? <span className={styles.sigTyped} style={{ height, fontSize: height * 0.55 }}>{c.name}</span> : <span style={{ height }} />
}

/** The signature columns (canvas element and flow block alike). */
export function SignatureColumns({ columns, style, headingStyle, lineWeight, lineColor, preamble, ctx }: { columns: SignatureColumn[]; style: TextStyle; headingStyle: TextStyle; lineWeight: number; lineColor: string; preamble?: string; ctx: RenderCtx }) {
  const { brand, values } = ctx
  return (
    <div className={styles.sig}>
      {preamble ? <div className={styles.sigPreamble} style={textCss(style, brand)}>{resolveFields(preamble, values)}</div> : null}
      <div className={styles.sigCols} style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, 1fr)` }}>
        {columns.map((c) => (
          <div key={c.id} className={styles.sigCol}>
            <div className={styles.sigMark}><SignatureMark image={c.image} ctx={ctx} height={mm(11)} /></div>
            <div className={styles.sigLine} style={{ borderTopWidth: pt(lineWeight), borderTopColor: resolveColor(lineColor, brand) }} />
            {c.heading ? <div style={textCss(headingStyle, brand)}>{resolveFields(c.heading, values)}</div> : null}
            {c.lines.map((l, i) => <div key={i} style={textCss(style, brand)}>{resolveFields(l, values)}</div>)}
            {c.caption ? <div className={styles.sigCaption} style={textCss({ ...style, size: (style.size ?? brand.fonts[style.role ?? 'body'].size) - 1, weight: 700 }, brand)}>{resolveFields(c.caption, values)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

/** (S44T — M5) The Details rows, for the block and the header's Details element alike: each row's label and value, either in bold when the
    row says so, with no lines, a line under each value, or every cell boxed. */
export function KvTable({ rows, values, lines, gap, labelWidth, valueCss, labelCss, ink, valueClass }: { rows: KVRow[]; values: Record<string, string>; lines: KvLines; gap: number; labelWidth: number; valueCss: CSSProperties; labelCss: CSSProperties; ink: string; valueClass?: string }) {
  const boxed = lines === 'boxed'
  /* The cells' looks are the template's own (its styles, its ink, its widths in mm) — computed here, as the rest of the print's are. */
  const cellBox: CSSProperties = boxed ? { border: `1px solid ${ink}`, padding: `${mm(0.8)}px ${mm(1.4)}px` } : {}
  const tableCss: CSSProperties = { ...valueCss, ...(boxed ? { borderCollapse: 'collapse', alignSelf: 'start' } : { borderSpacing: `0 ${mm(gap)}px` }) }   // boxed: a column's box as tall as its own rows
  const labelOf = (r: KVRow): CSSProperties => ({ ...labelCss, ...(r.labelBold ? { fontWeight: 700 } : {}), width: mm(labelWidth), ...cellBox })
  const valueOf = (r: KVRow): CSSProperties => ({ ...valueCss, ...(r.valueBold ? { fontWeight: 700 } : {}), ...(lines === 'under' ? { borderBottom: `1px solid ${ink}` } : {}), ...cellBox })
  return (
    <table className={styles.kv} data-lines={lines} style={tableCss}><tbody>
      {rows.map((r) => (
        <tr key={r.id}>
          <td className={styles.kvLabel} style={labelOf(r)}>{resolveFields(r.label, values)}</td>
          <td className={valueClass} style={valueOf(r)}>{resolveFields(r.value, values) || '\u00a0'}</td>
        </tr>
      ))}
    </tbody></table>
  )
}

/** (REG-618, parity Q-20) A plain outline mark per network, drawn in the text's colour — simple shapes, not the networks' own logos. */
export function SocialMark({ kind, size }: { kind: SocialKey; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const, style: { flex: '0 0 auto' } }
  switch (kind) {
    case 'website': return <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg>
    case 'instagram': return <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
    case 'facebook': return <svg {...common} fill="currentColor"><path d="M13.3 21v-7.3h2.4l.4-2.9h-2.8V9c0-.8.3-1.4 1.4-1.4h1.5V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.8v2.1H8v2.9h2.4V21z" /></svg>
    case 'tiktok': return <svg {...common} fill="currentColor"><path d="M14 3h2.6c.3 1.9 1.5 3.2 3.4 3.4V9c-1.3 0-2.4-.4-3.4-1.1v7.3A5.2 5.2 0 1 1 11.4 10v2.7a2.5 2.5 0 1 0 2.6 2.5z" /></svg>
    case 'whatsapp': return <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.3 20.7l4.4-1.1A8.8 8.8 0 1 0 12 3.2z" /><path d="M9.2 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.3l.6 1.5c.1.2 0 .4-.1.5l-.5.6c.5 1 1.4 1.9 2.4 2.4l.6-.5c.1-.1.3-.2.5-.1l1.5.6c.2.1.3.2.3.4v.4c0 .3-.1.5-.4.7-.5.3-1.1.4-1.7.2-2.2-.6-4-2.4-4.6-4.6-.2-.6-.1-1.2.2-1.6z" fill="currentColor" stroke="none" /></svg>
    case 'linkedin': return <svg {...common} fill="currentColor"><path d="M5 9h3v10H5zM6.5 4.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10 9h2.9v1.4c.4-.8 1.4-1.6 2.9-1.6 3 0 3.6 2 3.6 4.6V19h-3v-4.9c0-1.2 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5v5H10z" /></svg>
  }
}

function imageSrc(src: string, brand: BrandKit): string | null {
  if (src === 'logo') return brand.logo
  if (src === 'logo-dark') return brand.logoDark ?? brand.logo
  if (src === 'stamp') return brand.stamp
  return src || null
}

/** One element of a canvas, drawn in mm; in edit mode it selects, drags and resizes. `shift` (REG-569) is how far the layout pushed it
    down to clear the element above it — a transform, so the stored position stays the studio's. */
function Element({ el, block, ctx, width, shift = 0 }: { el: CanvasElement; block: CanvasBlock; ctx: RenderCtx; width: number; shift?: number }) {
  const { brand, values, interactive } = ctx
  const selected = interactive?.selected?.blockId === block.id && interactive.selected.elementId === el.id
  const [drag, setDrag] = useState<{ mode: 'move' | 'resize'; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null)
  const dragRef = useRef(drag)
  const [editing, setEditing] = useState(false)
  /* (REG-542) React never auto-focuses a div, so the in-place editor opened without the caret and the first keystrokes went
     nowhere; it takes focus with the caret at the end as soon as it mounts. */
  const editRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editing) return
    const node = editRef.current; if (!node) return
    node.focus()
    const range = document.createRange(); range.selectNodeContents(node); range.collapse(false)
    const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range)
  }, [editing])
  const base: CSSProperties = { left: mm(el.x), top: mm(el.y), width: mm(el.w), height: el.h !== undefined ? mm(el.h) : undefined, transform: shift ? `translateY(${shift}px)` : undefined }

  let inner: ReactNode = null
  switch (el.kind) {
    case 'text': {
      if (!editing && el.hideIfEmpty && isEmptyResolved(el.text, values)) return null
      /* (fix-D, D-08 · G-12) a variation order's heading names the order and its contract, never the template's "Sales Contract" */
      const text = editing ? el.text : isVariationDoc(values) && el.style?.role === 'heading' ? variationHeading(resolveFields(el.text, values), values) : resolveFields(el.text, values)
      inner = editing ? (
        <div ref={editRef} className={styles.text} style={textCss(el.style, brand)} contentEditable suppressContentEditableWarning
             onBlur={(e) => { setEditing(false); interactive?.onEditText(block.id, el.id, 'text', e.currentTarget.innerText) }}
             onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); (e.currentTarget as HTMLElement).blur() } }}>{el.text}</div>
      ) : <div className={styles.text} style={textCss(el.style, brand)}>{text}</div>
      break
    }
    case 'image': {
      const src = imageSrc(el.src, brand)
      inner = (
        <div className={styles.imgBox} style={{ background: el.box ? resolveColor(el.box, brand) : undefined }}>
          {src ? <img src={src} alt="" draggable={false} style={{ objectFit: el.fit }} /> : interactive ? <span className={styles.imgEmpty}>{el.src === 'logo' || el.src === 'logo-dark' ? 'Logo' : el.src === 'stamp' ? 'Stamp' : 'Image'}</span> : null}
        </div>
      )
      break
    }
    case 'kv':   // (S44T — UAT rows 248 · 322) bold per row; no lines, a line under each value, or boxed cells
      inner = <KvTable rows={el.rows} values={values} lines={el.lines} gap={el.gap} labelWidth={el.labelWidth} valueCss={textCss(el.style, brand)} labelCss={textCss(el.labelStyle, brand)} ink={resolveColor('ink', brand)} valueClass={styles.kvValue} />
      break
    case 'rule': inner = <div className={styles.rule} style={{ borderTopWidth: pt(el.weight), borderTopColor: resolveColor(el.color, brand) }} />; break
    case 'box': inner = <div className={styles.box} style={{ background: el.fill ? resolveColor(el.fill, brand) : 'transparent', border: el.stroke ? `${pt(el.weight ?? 0.5)}px solid ${resolveColor(el.stroke, brand)}` : undefined }} />; break
    case 'signature': inner = <SignatureColumns columns={el.columns} style={el.style} headingStyle={el.headingStyle} lineWeight={el.lineWeight} lineColor={el.lineColor} preamble={el.preamble} ctx={ctx} />; break
    case 'badges': {
      const items = el.items.length ? el.items : brand.badges
      inner = <div className={styles.badges} style={{ justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start', gap: mm(el.gap), height: el.h !== undefined ? mm(el.h) : undefined }}>{items.map((b, i) => <img key={i} src={b} alt="" draggable={false} />)}</div>
      if (!items.length && interactive) inner = <div className={styles.imgBox}><span className={styles.imgEmpty}>Badges</span></div>
      break
    }
    case 'pageno': inner = <div className={styles.text} style={textCss(el.style, brand)}>{resolveFields(el.format, values)}</div>; break
    case 'social': {
      // (REG-618, parity Q-20) Each filled network from Company › Profile: its mark and the handle as typed; nothing prints for an empty one.
      const css = textCss(el.style, brand)
      const size = (parseFloat(String(css.fontSize)) || 12) * 1.15
      const rows = el.networks.map((k) => ({ k, v: (k === 'website' ? docLetterhead(ctx.data).website : ctx.data.studio.socials?.[k]) ?? '' })).filter((r) => r.v)   // the website is the company's Website field — (pending modules S11) the issuing entity's own when it has one
      inner = rows.length ? (
        <div className={styles.social} data-layout={el.layout} style={{ ...css, gap: mm(el.gap) }}>
          {rows.map((r) => <span key={r.k} className={styles.socialItem} title={SOCIAL_LABEL[r.k]}><SocialMark kind={r.k} size={size} /><span>{r.v}</span></span>)}
        </div>
      ) : interactive ? <div className={styles.imgBox}><span className={styles.imgEmpty}>Social links — add them in Company › Profile</span></div> : null
      break
    }
  }

  if (!interactive) return <div className={styles.el} style={base} data-el-id={el.id} data-el-kind={el.kind}>{inner}</div>

  const zoom = interactive.zoom || 1
  const onDown = (e: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    if (editing || e.button !== 0) return
    e.stopPropagation()
    interactive.onSelect({ blockId: block.id, elementId: el.id })
    if (el.locked) return
    const d = { mode, sx: e.clientX, sy: e.clientY, x: el.x, y: el.y, w: el.w, h: el.h ?? 0 }
    dragRef.current = d; setDrag(d)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.sx) / zoom / MM_PX, dy = (e.clientY - d.sy) / zoom / MM_PX
    if (d.mode === 'move') interactive.onMoveElement(block.id, el.id, { x: Math.max(0, Math.round((d.x + dx) * 2) / 2), y: Math.max(0, Math.round((d.y + dy) * 2) / 2) }, false)
    else interactive.onMoveElement(block.id, el.id, { w: Math.max(4, Math.round((d.w + dx) * 2) / 2), ...(el.h !== undefined ? { h: Math.max(2, Math.round((d.h + dy) * 2) / 2) } : {}) }, false)
  }
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null; setDrag(null)
    e.currentTarget.releasePointerCapture(e.pointerId)
    interactive.onMoveElement(block.id, el.id, {}, true)
  }
  return (
    <div className={styles.el} style={{ ...base, maxWidth: mm(width) }} data-selected={selected || undefined} data-dragging={drag ? '' : undefined} data-el-id={el.id} data-el-kind={el.kind}
         /* (REG-542) reachable by keyboard: Tab lands on it, Enter selects it, Enter again on a text edits it in place */
         role="group" tabIndex={editing ? -1 : 0} aria-label={`${ELEMENT_LABEL[el.kind]} in the ${BLOCK_LABEL[block.kind]}`}
         onKeyDown={(e) => { if (editing || e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (selected && el.kind === 'text' && !el.locked) setEditing(true); else interactive.onSelect({ blockId: block.id, elementId: el.id }) } }}
         onPointerDown={(e) => onDown(e, 'move')} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
         onDoubleClick={(e) => { if (el.kind === 'text' && !el.locked) { e.stopPropagation(); setEditing(true) } }}>
      {inner}
      {selected && !el.locked && !editing ? <span className={styles.resize} onPointerDown={(e) => onDown(e, 'resize')} /> : null}
    </div>
  )
}

/* (REG-569) Elements whose height comes from their content — a Details box with one more row, a signature, a paragraph of text —
   push down whatever sits under them, and the canvas grows to hold everything (a box or a picture is a background, never a pusher).
   The gap a pushed element keeps from the one above it, in mm. */
const PUSH_GAP_MM = 1
const PUSHES = new Set<CanvasElement['kind']>(['text', 'kv', 'signature', 'badges', 'pageno', 'social'])

/** A canvas block: the header, the footer or the cover — elements placed in mm on a band of the block's height. `onMeasure` reports how
    tall the content really is (px at 1:1) so the document can give the header or the footer the room it needs (REG-569). */
export function CanvasView({ block, ctx, width, height, onMeasure, measureKey = '' }: { block: CanvasBlock; ctx: RenderCtx; width: number; height?: number; onMeasure?: (blockId: string, contentPx: number) => void; measureKey?: string }) {
  const { brand, interactive } = ctx
  const selected = interactive?.selected?.blockId === block.id && !interactive.selected.elementId
  const root = useRef<HTMLDivElement>(null)
  const [shifts, setShifts] = useState<Record<string, number>>({})
  const onMeasureRef = useRef(onMeasure); useEffect(() => { onMeasureRef.current = onMeasure })
  const sig = `${JSON.stringify(block.elements)}|${JSON.stringify(ctx.values)}|${measureKey}`
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    /* The pages may be drawn under a CSS zoom: the canvas's own style height against its drawn height gives the factor. */
    const styleH = parseFloat(el.style.height) || 0
    const drawnH = el.getBoundingClientRect().height
    const scale = styleH > 0 && drawnH > 0 ? drawnH / styleH : 1
    type Box = { id: string; kind: CanvasElement['kind']; x: number; w: number; top: number; h: number }
    const boxes: Box[] = block.elements.map((e) => {
      const node = el.querySelector<HTMLElement>(`[data-el-id="${e.id}"]`)
      const h = node ? node.getBoundingClientRect().height / scale : e.h !== undefined ? mm(e.h) : 0
      return { id: e.id, kind: e.kind, x: mm(e.x), w: mm(e.w), top: mm(e.y), h }
    })
    const gap = mm(PUSH_GAP_MM)
    const next: Record<string, number> = {}
    const placed: (Box & { bottom: number })[] = []
    for (const b of [...boxes].sort((a, c) => a.top - c.top || a.x - c.x)) {
      let top = b.top
      for (const p of placed) {
        if (!PUSHES.has(p.kind)) continue
        const across = p.x < b.x + b.w && b.x < p.x + p.w
        // an element that STARTS inside the one above it steps down under it; one already clear of it stays where the studio put it
        if (across && b.top >= p.top && b.top < p.bottom + gap) top = Math.max(top, p.bottom + gap)
      }
      const shift = Math.round(top - b.top)
      if (shift > 0) next[b.id] = shift
      placed.push({ ...b, bottom: top + b.h })
    }
    setShifts((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next))
    const content = placed.reduce((m, p) => Math.max(m, p.bottom), 0)
    onMeasureRef.current?.(block.id, content)
  }, [sig, block.id, block.elements])
  return (
    <div ref={root} className={styles.canvas} data-kind={block.kind} data-block-id={block.id} data-selected={selected || undefined}
         style={{ width: mm(width), height: height !== undefined ? height : mm(block.height), background: block.background ? resolveColor(block.background, brand) : undefined, borderBottom: block.rule ? `${pt(block.rule.weight)}px solid ${resolveColor(block.rule.color, brand)}` : undefined }}
         role={interactive ? 'group' : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? BLOCK_LABEL[block.kind] : undefined}
         onKeyDown={interactive ? (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); interactive.onSelect({ blockId: block.id }) } } : undefined}
         onPointerDown={interactive ? (e) => { if (e.target === e.currentTarget) { e.stopPropagation(); interactive.onSelect({ blockId: block.id }) } } : undefined}>
      {block.elements.map((el) => <Element key={el.id} el={el} block={block} ctx={ctx} width={width} shift={shifts[el.id] ?? 0} />)}
    </div>
  )
}
