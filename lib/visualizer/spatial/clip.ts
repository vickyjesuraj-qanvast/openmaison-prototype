'use client'

/*
 * (pending modules S41 — card studio:ai-sandboxes, 1.0's Spatial View › Orbit video) A SHORT CLIP OF A MOVING 3D VIEW, RECORDED IN THE
 * BROWSER. 1.0 sent a render to a video model (fal.ai's Kling, FAL_KEY) for a cinematic orbit — the model invented the hidden room. 2.0 records
 * what its own three.js views draw (the photo's room mesh turning slowly, or a 3D layout on a turntable) with the browser's MediaRecorder:
 * the same pixels, a real video file, nothing invented. A browser that can't record says so (`clipType()` is null). A video model plugs in
 * at `orbitYaw` / this recorder's caller (lib/services/registry.ts `orbit-video`) and answers a clip of the same shape.
 */

/** The first container this browser records, best first — WebM (Chrome, Edge, Firefox), else MP4 (Safari). */
export function clipType(): string | null {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null
  for (const t of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']) if (MediaRecorder.isTypeSupported(t)) return t
  return null
}
export const clipExtension = (type: string) => (type.startsWith('video/mp4') ? 'mp4' : 'webm')

export type Clip = { url: string; type: string; bytes: number; seconds: number }

/** Records `canvas` for `seconds`, calling `frame(t)` on every animation frame meanwhile (t in seconds from the start) so the caller moves
    the view. Resolves with the clip (an object URL — the caller revokes it); rejects with the reason a person can read. */
export function recordCanvas(canvas: HTMLCanvasElement, seconds: number, frame?: (t: number) => void, fps = 30): Promise<Clip> {
  const type = clipType()
  if (!type) return Promise.reject(new Error('This browser can’t record a clip.'))
  if (typeof canvas.captureStream !== 'function') return Promise.reject(new Error('This browser can’t record from a 3D view.'))   // (S42 audit A-18) "3D" everywhere (REG-1841)
  return new Promise<Clip>((resolve, reject) => {
    let raf = 0, guard = 0
    const stream = canvas.captureStream(fps)
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 })
    const parts: Blob[] = []
    rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data) }
    rec.onerror = () => { cancelAnimationFrame(raf); window.clearTimeout(guard); stream.getTracks().forEach((t) => t.stop()); reject(new Error('The clip couldn’t be recorded.')) }
    rec.onstop = () => {
      cancelAnimationFrame(raf); window.clearTimeout(guard)
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(parts, { type: type.split(';')[0] })
      if (!blob.size) { reject(new Error('The clip came out empty — try again.')); return }
      resolve({ url: URL.createObjectURL(blob), type: blob.type, bytes: blob.size, seconds })
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = (now - t0) / 1000
      frame?.(Math.min(seconds, t))
      if (t >= seconds) { if (rec.state === 'recording') rec.stop(); return }
      raf = requestAnimationFrame(tick)
    }
    rec.start(250)
    raf = requestAnimationFrame(tick)
    /* a hidden tab stops animation frames — the clip still ends on time */
    guard = window.setTimeout(() => { if (rec.state === 'recording') rec.stop() }, seconds * 1000 + 1500)
  })
}
