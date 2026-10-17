'use client'

/**
 * (fix-G, G-06) WhatsApp opens on the press (a window opened later is a blocked pop-up — the signing link's rule), but a message may only go
 * once the server has said yes. So the press opens the tab, and the answer either points it at the drafted message or closes it: nothing
 * reaches WhatsApp for an add the server refused or a question still to answer.
 */
export function pendingWindow(): { go: (url: string) => void; cancel: () => void } {
  const w = typeof window === 'undefined' ? null : window.open('', '_blank')
  if (w) { try { w.opener = null } catch { /* a browser that refuses is already safe */ } }
  return {
    go: (url) => { if (w && !w.closed) w.location.href = url; else window.open(url, '_blank', 'noopener') },
    cancel: () => { try { w?.close() } catch { /* already gone */ } },
  }
}
