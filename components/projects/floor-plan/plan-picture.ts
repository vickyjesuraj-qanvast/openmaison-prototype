'use client'

import { PLAN_EDGE } from '@/lib/projects/floor-plan-model'

/*
 * (gaps build G, G-Q2 — 1.0 F-207) The picture a plan is marked up on, drawn in the browser: a PDF's first page at a 2400px long edge (pdf.js,
 * already loaded for Files' first pages — components/leads/files/file-pictures.ts — its worker served from /pdfjs), a big photo shrunk to the
 * same edge; a JPEG on white. The original stays as it was, in Files. A photo for a mark or a comment is shrunk to 1600 (it is a phone photo).
 */
export type DrawnPicture = { data: string; width: number; height: number }

function toJpeg(src: CanvasImageSource, w: number, h: number, edge: number): DrawnPicture | null {
  const k = Math.min(1, edge / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k))
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(src, 0, 0, cw, ch)
  return { data: canvas.toDataURL('image/jpeg', 0.86), width: cw, height: ch }
}

async function pdfPicture(buf: ArrayBuffer): Promise<DrawnPicture | null> {
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
    const task = pdfjs.getDocument({ data: new Uint8Array(buf) })
    const doc = await task.promise
    try {
      const page = await doc.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: PLAN_EDGE / Math.max(1, base.width, base.height) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height))
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      return { data: canvas.toDataURL('image/jpeg', 0.86), width: canvas.width, height: canvas.height }
    } finally { void task.destroy() }
  } catch { return null }
}

function imageOf(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let url: string
    try { url = URL.createObjectURL(blob) } catch { resolve(null); return }
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

const isPdf = (b: Blob, name = '') => b.type === 'application/pdf' || /\.pdf$/i.test(name)

/** The plan's picture from a picked file or a file fetched from Files; null when it can't be drawn. */
export async function planPictureOf(blob: Blob, name = ''): Promise<DrawnPicture | null> {
  if (isPdf(blob, name)) return pdfPicture(await blob.arrayBuffer())
  const img = await imageOf(blob)
  return img && img.naturalWidth ? toJpeg(img, img.naturalWidth, img.naturalHeight, PLAN_EDGE) : null
}
/** A photo for a mark or a comment, at a 1600px long edge. */
export async function photoOf(blob: Blob): Promise<string | null> {
  const img = await imageOf(blob)
  return img && img.naturalWidth ? toJpeg(img, img.naturalWidth, img.naturalHeight, 1600)?.data ?? null : null
}
/** The file as a data URL, as it is (the client's plan travels with its picture). */
export function dataUrlOf(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
    r.onerror = () => resolve(null)
    r.readAsDataURL(blob)
  })
}
/** A plan file a picker accepts — a picture or a PDF (1.0 F-207). */
export const PLAN_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf'
export const isPlanFile = (f: File) => /^image\/(png|jpeg|webp)$/.test(f.type) || isPdf(f, f.name)
