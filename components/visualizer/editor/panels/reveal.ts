/**
 * (F062 · surfaces-13 · surfaces-18) Brings a stretch of a panel into view inside the panel's own scroller (`[data-viz-panel-body]`,
 * the rail's and the tray's): from the top of `from` to the bottom of `to` when the stretch fits, else `from` at the top — never `from`
 * past the top, so what was picked stays in sight above its options. `tight` — where the stretch may start instead when it doesn't fit
 * from `from` (the action chips a press opened, rather than the row above them). Already in view: nothing moves. Reduced motion jumps.
 * Call it from an effect or a handler (it reads layout), never in render.
 */
export function revealInPanel(from: Element | null | undefined, to: Element | null | undefined = from, tight?: Element | null): void {
  const box = from?.closest<HTMLElement>('[data-viz-panel-body]')
  if (!from || !to || !box) return
  const TOP = 8, FOOT = 16
  const b = box.getBoundingClientRect(), cur = box.scrollTop, view = box.clientHeight
  const at = (el: Element) => el.getBoundingClientRect().top - b.top + cur
  const bottom = to.getBoundingClientRect().bottom - b.top + cur
  let top = at(from)
  if (tight && bottom - top + TOP + FOOT > view) top = Math.max(top, at(tight))
  let next = cur
  if (top - TOP < cur) next = top - TOP
  else if (bottom + FOOT > cur + view) next = Math.min(bottom + FOOT - view, top - TOP)
  next = Math.max(0, Math.min(next, box.scrollHeight - view))
  if (Math.abs(next - cur) < 1) return
  box.scrollTo({ top: next, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}
