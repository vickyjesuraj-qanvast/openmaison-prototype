/*
 * (pending modules S30 — 1.0's session-context `logout`, which cleared the AI chat's history "to prevent data leaking between users") What a
 * browser forgets on Sign out: everything this tab kept for the member (sessionStorage's `om.*` — a Create row's page, View as's sentence),
 * and the searches they typed and opened (⌘K's recents). The browser's own preferences stay (column layouts, the keyboard's tips): they are
 * the device's, not the member's. Browser only; every call guarded (a private window may refuse storage).
 */
const PERSONAL = ['om.search.recent', 'om.search.opened']

export function forgetMember(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (k?.startsWith('om.')) keys.push(k) }
    for (const k of keys) sessionStorage.removeItem(k)
  } catch { /* nothing kept to forget */ }
  try { for (const k of PERSONAL) localStorage.removeItem(k) } catch { /* nothing kept to forget */ }
}

/** (pending modules S31) What this browser kept about the studio it had open — the pages' remembered shapes and ghosts' words, the AI
    Visualizer's recent designs and drafts, ⌘K's searches — so another studio never opens on this one's: forgotten, with the member's, when the
    browser moves to another studio (signing up, signing in to another, the studio menu). The device's preferences stay. */
const STUDIO_KEPT = ['om.shape.', 'om.ghost.', 'om.viz.recent', 'om.viz.draft.', 'om.search.', 'om.kb.']

export function forgetStudio(): void {
  forgetMember()
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && STUDIO_KEPT.some((p) => k.startsWith(p))) keys.push(k) }
    for (const k of keys) localStorage.removeItem(k)
  } catch { /* nothing kept to forget */ }
}
