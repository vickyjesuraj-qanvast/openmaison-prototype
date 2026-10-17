/*
 * (gaps build J, J-Q13 — moved here for the elevations, parity map TD-091) An SVG drawing as a PNG: the drawing's computed look copied onto
 * each node (the CSS modules' strokes and fills, the type tokens), the editor's handles and the studio's floor-plan picture left out, drawn at
 * twice its size on the page's own background. Browser only.
 */
export async function svgToPng(svg: SVGSVGElement | null): Promise<string | null> {
  if (!svg) return null
  const clone = svg.cloneNode(true) as SVGSVGElement
  const src = svg.querySelectorAll('*'), dst = clone.querySelectorAll('*')
  const props = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'font', 'font-size', 'font-family', 'font-weight', 'stroke-dasharray']
  src.forEach((n, i) => {
    const cs = getComputedStyle(n), t = dst[i] as Element | undefined
    if (!t) return
    t.setAttribute('style', props.map((k) => `${k}:${cs.getPropertyValue(k)}`).join(';'))
  })
  clone.querySelectorAll('[data-handle], [data-underlay]').forEach((n) => n.remove())
  const r = svg.getBoundingClientRect()
  const w = Math.round(r.width * 2), h = Math.round(r.height * 2)
  clone.setAttribute('width', String(w)); clone.setAttribute('height', String(h))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('svg')); img.src = url })
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d'); if (!g) return null
    g.fillStyle = getComputedStyle(document.body).backgroundColor || 'white'
    g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h)
    return c.toDataURL('image/png')
  } catch { return null } finally { URL.revokeObjectURL(url) }
}
/** A data URL saved as a file the browser downloads. */
export function downloadDataUrl(url: string, name: string): void {
  const a = document.createElement('a'); a.href = url; a.download = `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Layout'}.png`; a.click()
}
