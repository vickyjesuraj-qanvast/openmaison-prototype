/*
 * (pending modules S36 — 1.0's src/lib/render/trial-gate.ts `watermarkTrialImage`) Every picture the trial makes carries OpenMaison's mark, so a
 * trial render is plainly one wherever it is shared: 1.0's white logo (the mark and the wordmark, 1.0's public/logo-full-mono.svg), bottom
 * right, ~13 % of the picture's width (110–260 px, never more than 40 % of a small one), over a soft dark shadow so it reads on a pale wall
 * and a dark corner, at 92 % — 1.0's geometry, number for number. 1.0 stamped on its server because its model drew there; here the curated
 * engine draws in the visitor's browser, so the stamp is drawn there too, before the picture is ever shown or saved (an image model on the
 * server stamps it there instead — lib/services/registry.ts `image-model`). A picture that can't be stamped is never shown: the render isn't
 * kept and nothing counts (1.0 sent an unmarked one — never here).
 */

/** The mark, drawn at 1040 px wide from 1.0's SVG (scripts/viz/trial-cards.mts). */
export const MARK_SRC = '/site/try/watermark.png'
/** 1.0's OPENMAISON_MARK_VIEWBOX: 885 × 173. */
export const MARK_RATIO = 173 / 885

/** Where the mark sits on a W × H picture — 1.0's sums (the box the probe reads in the downloaded pixels). */
export function markBox(W: number, H: number): { x: number; y: number; w: number; h: number; blur: number } {
  const w = Math.min(Math.round(W * 0.4), Math.max(110, Math.min(260, Math.round(W * 0.13))))
  const h = Math.round(w * MARK_RATIO)
  const pad = Math.max(12, Math.round(W * 0.018))
  const blur = Math.max(1.5, h * 0.08)
  return { x: W - w - pad, y: H - h - pad, w, h, blur }
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => no(new Error('image')); i.src = src })
let markP: Promise<HTMLImageElement> | null = null
const mark = () => (markP ??= loadImage(MARK_SRC).catch((e) => { markP = null; throw e }))

/** The picture with the mark on it, as a JPEG (1.0's quality 88). Throws when it can't be drawn. */
export async function stampTrial(dataUrl: string): Promise<string> {
  const [img, m] = await Promise.all([loadImage(dataUrl), mark()])
  const W = img.naturalWidth, H = img.naturalHeight
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx || !W || !H) throw new Error('canvas')
  ctx.drawImage(img, 0, 0, W, H)
  const b = markBox(W, H)
  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = b.blur * 2
  ctx.shadowOffsetY = b.blur * 0.5
  ctx.drawImage(m, b.x, b.y, b.w, b.h)
  ctx.restore()
  return c.toDataURL('image/jpeg', 0.88)
}
