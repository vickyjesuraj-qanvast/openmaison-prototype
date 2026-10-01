/**
 * (REG-897, Dane UAT 12.10 · 12.11) Copy text on every page the prototype is opened on — `navigator.clipboard.writeText`'s drop-in.
 *
 * The Clipboard API exists only in a secure context (https, or localhost). The prototype opened over plain http on a LAN address — a
 * phone on the studio's Wi-Fi — has no `navigator.clipboard` at all, so every Copy link said "Couldn’t copy" or, where the call was
 * `navigator.clipboard?.writeText(…)`, did nothing. The fallback is the one browsers kept for exactly this: a hidden text box holding
 * the text, selected, and `document.execCommand('copy')` — which must run inside the press itself, so it runs synchronously here when
 * the API is missing (call `copyText` straight from the press handler, before any `await`).
 *
 * Resolves once the text is on the clipboard; rejects when no way worked — the caller says so with its failure message, never silence.
 */
export function copyText(text: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const api = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  if (api && typeof api.writeText === 'function') {
    /* a refusal (a denied permission, a page without focus) still gets the old way before the caller hears it failed */
    return api.writeText(text).catch(() => (legacyCopy(text) ? undefined : Promise.reject(new Error('copy refused'))))
  }
  return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error('no clipboard'))
}

/** The pre-Clipboard-API copy: a hidden, read-only text box with the text selected, then the browser's own Copy. True when it copied. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined' || !document.body || typeof document.execCommand !== 'function') return false
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')   // no keyboard rises on a phone
  area.setAttribute('tabindex', '-1')
  /* off-screen but laid out (a `display: none` box can't be selected); 16px so iOS never zooms to it (REG-306) */
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;margin:0;opacity:0;pointer-events:none;font-size:16px;'
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const selection = document.getSelection()
  const kept = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  document.body.appendChild(area)
  let ok = false
  try {
    area.focus({ preventScroll: true })
    area.select()
    area.setSelectionRange(0, text.length)   // iOS selects only through the range
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    area.remove()
    if (kept && selection) { selection.removeAllRanges(); selection.addRange(kept) }
    if (focused && focused.isConnected) focused.focus({ preventScroll: true })
  }
  return ok
}
