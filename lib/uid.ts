/**
 * (REG-897, Dane UAT 12.10 · 12.11) A random id in the browser — `crypto.randomUUID()`'s drop-in.
 *
 * `crypto.randomUUID` exists only in a secure context (https, or localhost): over plain http on a LAN address it is undefined and the
 * press that called it threw (Upload a quote, the Visualizer's Generate, Add an entity). `crypto.getRandomValues` is there in every
 * context, so the fallback builds the same RFC 4122 version-4 id from it — lower-case, dashed, the shape the server actions check.
 */
export function newId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40   // version 4
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80   // the RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
