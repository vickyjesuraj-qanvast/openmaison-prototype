import { useEffect, type RefObject } from 'react'

/** (surfaces-25 · tablet-13) A scroller with more above or below says so with a soft fade at that edge — a cut line reads as more to scroll,
    not as clipping. DOM-only: the attributes are the CSS mask's switches, read on scroll and on resize. */
export function useEdgeFade(ref: RefObject<HTMLElement | null>, on: boolean, key: unknown) {
  useEffect(() => {
    const el = ref.current
    if (!on || !el) return
    const read = () => {
      const up = el.scrollTop > 1, down = el.scrollTop + el.clientHeight < el.scrollHeight - 1
      el.toggleAttribute('data-more-up', up); el.toggleAttribute('data-more-down', down)
    }
    read()
    el.addEventListener('scroll', read, { passive: true })
    const ro = new ResizeObserver(read); ro.observe(el)
    for (const c of el.children) ro.observe(c)
    return () => { el.removeEventListener('scroll', read); ro.disconnect() }
  }, [ref, on, key])
}
