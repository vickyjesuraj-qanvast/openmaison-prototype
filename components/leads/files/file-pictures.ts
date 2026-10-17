/*
 * (gaps build E, item 1) The picture a file that is not one carries into Files — drawn in the browser, so the server keeps a small JPEG beside
 * the file's own bytes (`lib/leads/file-store.ts`): a PDF's first page (pdf.js, already loaded for the import wizard's lead sheets —
 * lib/pdf-text.ts — its worker served from /pdfjs) and a video's first frame (the update composer's way, REG-951). Null whenever the browser
 * can't draw it: the file then wears its glyph, and nothing else changes.
 */

/** The width every drawn picture is made at — the grid's tile is 291 wide; twice that would only weigh more. */
const WIDTH = 480

/** A PDF's first page as a JPEG data URL, on white. */
export async function pdfFirstPage(source: Blob | ArrayBuffer): Promise<string | null> {
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
    const buf = source instanceof ArrayBuffer ? source : await source.arrayBuffer()
    const task = pdfjs.getDocument({ data: new Uint8Array(buf) })
    const doc = await task.promise
    try {
      const page = await doc.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: WIDTH / Math.max(1, base.width) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height))
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      return canvas.toDataURL('image/jpeg', 0.82)
    } finally { void task.destroy() }
  } catch { return null }
}

/** A video's first frame (half a second in) as a JPEG data URL. */
export function videoFirstFrame(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    let url: string
    try { url = URL.createObjectURL(file) } catch { resolve(null); return }
    const v = document.createElement('video')
    let done = false
    const finish = (r: string | null) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(r) }
    const timer = window.setTimeout(() => finish(null), 5000)
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 2) } catch { finish(null) } }
    v.onseeked = () => {
      window.clearTimeout(timer)
      try {
        const scale = Math.min(1, WIDTH / (v.videoWidth || WIDTH))
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round((v.videoWidth || WIDTH) * scale)); c.height = Math.max(1, Math.round((v.videoHeight || 270) * scale))
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height)
        finish(c.toDataURL('image/jpeg', 0.8))
      } catch { finish(null) }
    }
    v.onerror = () => { window.clearTimeout(timer); finish(null) }
  })
}

/** A file's own bytes as a data URL, read as they are. */
export const readAsDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onerror = () => reject(r.error)
  r.onload = () => resolve(String(r.result))
  r.readAsDataURL(file)
})
