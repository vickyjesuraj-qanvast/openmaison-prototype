'use client'

/**
 * (Contracts on the move, C3 — A-24, Q-06 "page") "Save a copy" on a phone: the signed page ITSELF is the copy. Where the browser offers a
 * share sheet (`navigator.share` — iOS and Android browsers, WhatsApp's in-app browser included), it opens with this page's address and a
 * line that says what it is — the client keeps it in Files, Notes, a chat, wherever they choose. Where there is none (a desktop browser),
 * the address is copied and the page says it stays at this link, with the signing record and its fingerprint. `window.print()` is never
 * the answer on a phone — inside WhatsApp's browser it does nothing (A-24); the desk keeps Download a copy. The PDF file itself comes when
 * the developers plug the renderer in (lib/paper-print.ts, S34) — then this press hands it over. *(invented copy)*
 */
export async function saveCopy(o: { title: string; studio: string; signedLine: string }): Promise<'shared' | 'cancelled' | 'copied' | 'kept'> {
  const url = window.location.href
  const text = `${o.title} from ${o.studio} — ${o.signedLine}. The signed copy and its signing record stay at this link.`
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title: `${o.title} · ${o.studio}`, text, url }); return 'shared' } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled'
      /* refused (not a user gesture any more, or the type isn't shareable): fall through to the copy */
    }
  }
  try { await navigator.clipboard.writeText(url); return 'copied' } catch { return 'kept' }
}

/** What the page says after Save a copy, where the share sheet didn't take it. */
export function saveCopyLine(result: 'copied' | 'kept', hash: string | null): string {
  const print = hash ? ` and fingerprint ${hash.slice(0, 8)}…` : ''
  return result === 'copied' ? `Link copied — this signed page stays at it, with the signing record${print}` : `This signed page stays at this link, with the signing record${print} — keep the link`
}
