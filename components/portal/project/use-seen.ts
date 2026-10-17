'use client'

import { useEffect, type RefObject } from 'react'
import { markUpdatesSeen } from '@/app/portal/project-actions'
import { BELL_REFRESH } from '../bell'

/**
 * (Projects round 4b) An update counts as opened once its card has been on the client's screen — on the Updates tab or as the home's Latest
 * update, where it is read in full. Watches the cards inside `root` that the client has not opened yet (`[data-update-id][data-fresh-client]`)
 * and stamps each one once (`client_opened_at`, the studio's Withdraw rule), gathered into one request. A studio preview watches nothing:
 * See it as the client records nothing (the server refuses the write too). A card is "on screen" when 40% of it shows, or it fills half the
 * screen (a long one on a phone).
 */
export function useSeenUpdates(slug: string, root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return
    const cards = [...el.querySelectorAll<HTMLElement>('[data-update-id][data-fresh-client]')]
    if (!cards.length) return
    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      timer = null
      const ids = [...pending]
      pending.clear()
      /* (fix-F, F-15) once stamped, the bell reads again — the update's row is read with it (one read for one thing) */
      if (ids.length) void markUpdatesSeen(slug, { ids }).then((r) => { if (!('error' in r) && r.n) window.dispatchEvent(new Event(BELL_REFRESH)) }, () => { /* a stamp that does not land is taken again on the next look */ })
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const tall = e.boundingClientRect.height > window.innerHeight * 1.25
        if (e.intersectionRatio < 0.4 && !(tall && e.intersectionRect.height >= window.innerHeight * 0.5)) continue
        const id = (e.target as HTMLElement).dataset.updateId
        if (id) pending.add(id)
        io.unobserve(e.target)
      }
      if (pending.size && !timer) timer = setTimeout(flush, 500)
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] })
    cards.forEach((c) => io.observe(c))
    return () => { io.disconnect(); if (timer) { clearTimeout(timer); flush() } }
  }, [slug, root, enabled])
}
