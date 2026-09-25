'use client'

import { useCallback, useRef, useState } from 'react'
import { defaultBlock, isCanvas, newId, type Block, type BlockKind, type CanvasElement, type TemplateDefaults, type TemplateDesign } from '@/lib/templates/model'

/* The template editor's document state (REG-486): one undo history over { design, defaults }. A transient set (a drag in
   progress) replaces the present without a step; a coalesced set (typing in one field) folds into the previous step for a
   short while, so Cmd+Z takes a word back, not a letter. */

export type EditorDoc = { design: TemplateDesign; defaults: TemplateDefaults }
type Hist = { past: EditorDoc[]; present: EditorDoc; future: EditorDoc[] }
const LIMIT = 100
const COALESCE_MS = 900

export function useHistory(initial: EditorDoc) {
  const [h, setH] = useState<Hist>({ past: [], present: initial, future: [] })
  const last = useRef<{ key: string; at: number } | null>(null)
  const set = useCallback((updater: (d: EditorDoc) => EditorDoc, opts: { transient?: boolean; coalesce?: string } = {}) => {
    const now = performance.now()
    const fold = !!opts.coalesce && last.current?.key === opts.coalesce && now - last.current.at < COALESCE_MS
    last.current = opts.coalesce ? { key: opts.coalesce, at: now } : null
    setH((s) => {
      const next = updater(s.present)
      if (next === s.present) return s
      if (opts.transient || fold) return { ...s, present: next }
      return { past: [...s.past.slice(-(LIMIT - 1)), s.present], present: next, future: [] }
    })
  }, [])
  /** After a transient run (a drag), the step lands once with the state as it is. */
  const commit = useCallback((before: EditorDoc) => {
    setH((s) => (s.present === before ? s : { past: [...s.past.slice(-(LIMIT - 1)), before], present: s.present, future: [] }))
  }, [])
  const undo = useCallback(() => { last.current = null; setH((s) => { const p = s.past[s.past.length - 1]; return p ? { past: s.past.slice(0, -1), present: p, future: [s.present, ...s.future] } : s }) }, [])
  const redo = useCallback(() => { last.current = null; setH((s) => { const f = s.future[0]; return f ? { past: [...s.past, s.present], present: f, future: s.future.slice(1) } : s }) }, [])
  return { doc: h.present, set, commit, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 }
}

/* ── design helpers ── */
export const patchBlock = (design: TemplateDesign, id: string, patch: Partial<Block> | ((b: Block) => Block)): TemplateDesign =>
  ({ ...design, blocks: design.blocks.map((b) => (b.id === id ? (typeof patch === 'function' ? patch(b) : ({ ...b, ...patch } as Block)) : b)) })

export const patchElement = (design: TemplateDesign, blockId: string, elId: string, patch: Partial<CanvasElement> | ((e: CanvasElement) => CanvasElement)): TemplateDesign =>
  patchBlock(design, blockId, (b) => (isCanvas(b) ? { ...b, elements: b.elements.map((e) => (e.id === elId ? (typeof patch === 'function' ? patch(e) : ({ ...e, ...patch } as CanvasElement)) : e)) } : b))

/** Canvases keep their places: cover, then header, the flow, footer last. */
export function normalizeBlocks(blocks: Block[]): Block[] {
  const cover = blocks.filter((b) => b.kind === 'cover'), header = blocks.filter((b) => b.kind === 'header'), footer = blocks.filter((b) => b.kind === 'footer')
  return [...cover, ...header, ...blocks.filter((b) => !isCanvas(b)), ...footer]
}
export const flowBlocks = (design: TemplateDesign) => design.blocks.filter((b) => !isCanvas(b))

export function addBlock(design: TemplateDesign, kind: BlockKind, afterId: string | null): { design: TemplateDesign; id: string } {
  const b = defaultBlock(kind)
  const blocks = [...design.blocks]
  const at = afterId ? blocks.findIndex((x) => x.id === afterId) : -1
  if (at >= 0 && !isCanvas(b)) blocks.splice(at + 1, 0, b); else blocks.push(b)
  return { design: { ...design, blocks: normalizeBlocks(blocks) }, id: b.id }
}
export const removeBlock = (design: TemplateDesign, id: string): TemplateDesign => ({ ...design, blocks: design.blocks.filter((b) => b.id !== id) })
export function duplicateBlock(design: TemplateDesign, id: string): { design: TemplateDesign; id: string } {
  const i = design.blocks.findIndex((b) => b.id === id)
  const src = design.blocks[i]
  if (!src) return { design, id }
  const copy = JSON.parse(JSON.stringify(src)) as Block
  copy.id = newId()
  if (isCanvas(copy)) copy.elements = copy.elements.map((e) => ({ ...e, id: newId('e') }))
  const blocks = [...design.blocks]; blocks.splice(i + 1, 0, copy)
  return { design: { ...design, blocks: normalizeBlocks(blocks) }, id: copy.id }
}
export function moveBlock(design: TemplateDesign, id: string, dir: -1 | 1): TemplateDesign {
  const flow = flowBlocks(design)
  const i = flow.findIndex((b) => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= flow.length) return design
  const next = [...flow]; const [b] = next.splice(i, 1); next.splice(j, 0, b!)
  return { ...design, blocks: normalizeBlocks([...design.blocks.filter(isCanvas), ...next]) }
}
export const reorderFlow = (design: TemplateDesign, ids: string[]): TemplateDesign => {
  const byId = new Map(design.blocks.map((b) => [b.id, b]))
  const flow = ids.map((id) => byId.get(id)).filter((b): b is Block => !!b && !isCanvas(b))
  return { ...design, blocks: normalizeBlocks([...design.blocks.filter(isCanvas), ...flow]) }
}

/** A fresh canvas element of a kind, placed near the top left. */
export function defaultElement(kind: CanvasElement['kind']): CanvasElement {
  const id = newId('e')
  switch (kind) {
    case 'text': return { id, kind, x: 4, y: 4, w: 80, text: 'Text', style: { role: 'body' } }
    case 'image': return { id, kind, x: 4, y: 4, w: 40, h: 14, src: 'logo', fit: 'contain' }
    case 'kv': return { id, kind, x: 4, y: 4, w: 90, rows: [{ id: newId('r'), label: 'Date', value: '{date}' }, { id: newId('r'), label: 'Attn', value: '{client_name}' }], labelWidth: 18, style: { role: 'body' }, labelStyle: { role: 'body', weight: 700 }, lines: 'none', gap: 1 }
    case 'rule': return { id, kind, x: 0, y: 20, w: 174, weight: 0.5, color: 'ink' }
    case 'box': return { id, kind, x: 4, y: 4, w: 60, h: 20, fill: 'band' }
    case 'signature': return { id, kind, x: 0, y: 2, w: 174, columns: [{ id: newId('c'), heading: '{prepared_by}', lines: ['{studio_name}'], image: 'member' }, { id: newId('c'), heading: '{client_name}', lines: ['Client'], image: 'client' }], style: { role: 'body' }, headingStyle: { role: 'body', weight: 700 }, lineWeight: 0.5, lineColor: 'ink' }
    case 'badges': return { id, kind, x: 0, y: 2, w: 174, h: 10, items: [], gap: 2, align: 'left' }
    case 'pageno': return { id, kind, x: 140, y: 2, w: 34, format: 'Page {page} of {pages}', style: { role: 'small', align: 'right' } }
    case 'social': return { id, kind, x: 0, y: 2, w: 174, networks: ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp', 'linkedin'], layout: 'row', gap: 4, style: { role: 'small', color: 'grey' } }   // (REG-618, parity Q-20)
  }
}
