'use client'

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { mm, MM_PX, resolveColor, type BrandKit, type CanvasBlock, type CanvasElement, type SignatureColumn, type TextStyle } from '@/lib/templates/model'
import { isEmptyResolved, resolveFields } from '@/lib/templates/fields'
import { stampSvg } from '@/lib/templates/assets'
import type { DocData } from '@/lib/templates/data'
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
    return <img className={styles.sigImg} style={{ height }} src={brand.stamp ?? stampSvg(data.studio.name, data.studio.uen)} alt="" draggable={false} />
  }
  if (image === 'member') {
    const s = data.memberSignature
    if (!s) return <span style={{ height }} />
    if (s.kind === 'draw' && s.data) return <svg className={styles.sigImg} style={{ height }} viewBox="0 0 752 140" aria-hidden><path d={s.data} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

function imageSrc(src: string, brand: BrandKit): string | null {
  if (src === 'logo') return brand.logo
  if (src === 'logo-dark') return brand.logoDark ?? brand.logo
  if (src === 'stamp') return brand.stamp
  return src || null
}

/** One element of a canvas, drawn in mm; in edit mode it selects, drags and resizes. */
function Element({ el, block, ctx, width }: { el: CanvasElement; block: CanvasBlock; ctx: RenderCtx; width: number }) {
  const { brand, values, interactive } = ctx
  const selected = interactive?.selected?.blockId === block.id && interactive.selected.elementId === el.id
  const [drag, setDrag] = useState<{ mode: 'move' | 'resize'; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null)
  const dragRef = useRef(drag)
  const [editing, setEditing] = useState(false)
  const base: CSSProperties = { left: mm(el.x), top: mm(el.y), width: mm(el.w), height: el.h !== undefined ? mm(el.h) : undefined }

  let inner: ReactNode = null
  switch (el.kind) {
    case 'text': {
      if (!editing && el.hideIfEmpty && isEmptyResolved(el.text, values)) return null
      const text = editing ? el.text : resolveFields(el.text, values)
      inner = editing ? (
        <div className={styles.text} style={textCss(el.style, brand)} contentEditable suppressContentEditableWarning autoFocus
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
    case 'kv':
      inner = (
        <table className={styles.kv} style={{ ...textCss(el.style, brand), borderSpacing: `0 ${mm(el.gap)}px` }}>
          <tbody>
            {el.rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.kvLabel} style={{ ...textCss(el.labelStyle, brand), width: mm(el.labelWidth) }}>{resolveFields(r.label, values)}</td>
                <td className={styles.kvValue} style={{ ...textCss(el.style, brand), borderBottom: el.lines === 'under' ? `1px solid ${resolveColor('ink', brand)}` : undefined }}>{resolveFields(r.value, values) || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
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
  }

  if (!interactive) return <div className={styles.el} style={base}>{inner}</div>

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
    <div className={styles.el} style={{ ...base, maxWidth: mm(width) }} data-selected={selected || undefined} data-dragging={drag ? '' : undefined} data-el-id={el.id}
         onPointerDown={(e) => onDown(e, 'move')} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
         onDoubleClick={(e) => { if (el.kind === 'text' && !el.locked) { e.stopPropagation(); setEditing(true) } }}>
      {inner}
      {selected && !el.locked && !editing ? <span className={styles.resize} onPointerDown={(e) => onDown(e, 'resize')} /> : null}
    </div>
  )
}

/** A canvas block: the header, the footer or the cover — elements placed in mm on a band of the block's height. */
export function CanvasView({ block, ctx, width, height }: { block: CanvasBlock; ctx: RenderCtx; width: number; height?: number }) {
  const { brand, interactive } = ctx
  const selected = interactive?.selected?.blockId === block.id && !interactive.selected.elementId
  return (
    <div className={styles.canvas} data-kind={block.kind} data-block-id={block.id} data-selected={selected || undefined}
         style={{ width: mm(width), height: height !== undefined ? height : mm(block.height), background: block.background ? resolveColor(block.background, brand) : undefined, borderBottom: block.rule ? `${pt(block.rule.weight)}px solid ${resolveColor(block.rule.color, brand)}` : undefined }}
         onPointerDown={interactive ? (e) => { if (e.target === e.currentTarget) { e.stopPropagation(); interactive.onSelect({ blockId: block.id }) } } : undefined}>
      {block.elements.map((el) => <Element key={el.id} el={el} block={block} ctx={ctx} width={width} />)}
    </div>
  )
}
