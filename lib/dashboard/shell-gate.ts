import 'server-only'
import { cache } from 'react'

/**
 * (the Dashboard redesigned, 2026-10-26 — his P-14, "the first answer under 0.15 s"; lane D1) **The page waits for its shell.** Next renders a
 * route's layout and its page side by side, and the database's reads are its own synchronous work on one thread: the Dashboard's many reads
 * (every project's Needs you, Coming up, the books) ran interleaved with the shell's few, so the shell — the rail, the header, the page's ghost
 * — reached the browser only once every card had been read (0.30 s on the demo, the Leads listing 0.08 s). The layout opens this gate once
 * the shell has drawn (app/dashboard/layout.tsx); the page waits on it, gives the stream a moment to carry the shell and the ghost out, then
 * reads. Per request (React's `cache`); never longer than `SHELL_WAIT_MS`, so a shell that fails can't hold the page — and only when the
 * layout is drawing in this request at all (a Studio / Mine switch or a refresh of the page alone keeps its layout and waits for nothing).
 */
export const SHELL_WAIT_MS = 400
/** How long the stream is given to carry the drawn shell out before the page's reads take the thread (the shell's HTML is ~100 KB to render). */
export const SHELL_FLUSH_MS = 30
const gate = cache(() => {
  let open: () => void = () => {}
  const opened = new Promise<void>((resolve) => { open = resolve })
  return { opened, open, coming: false }
})
/** The layout, as it starts (it starts before the page does): its shell is drawing in this request. */
export const shellComing = () => { gate().coming = true }
/** The layout: the shell has drawn. */
export const openShellGate = () => gate().open()
/** The page: once the shell has drawn (or the wait is over), and a task later so the stream carries it out first. */
export async function afterShell(): Promise<void> {
  const g = gate()
  if (!g.coming) return
  await Promise.race([g.opened, new Promise<void>((r) => setTimeout(r, SHELL_WAIT_MS))])
  await new Promise<void>((r) => setTimeout(r, SHELL_FLUSH_MS))
}
