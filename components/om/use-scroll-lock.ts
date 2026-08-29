'use client'

import { useEffect } from 'react'

/**
 * Locks page scrolling while a modal / sheet / dialog is open (user 2026-08-28: the page
 * behind a modal must never scroll — neither by scroll-chaining at the end of the modal's
 * content nor with the pointer outside it). Reference-counted so nested dialogs stack.
 * Pair with `overscroll-behavior: contain` on the overlay's scroll containers.
 */
let locks = 0
let saved: { overflow: string; paddingRight: string } | null = null

function lock() {
  if (locks++ > 0) return
  const body = document.body
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  const gutter = window.innerWidth - document.documentElement.clientWidth   // classic scrollbar width (0 with overlay scrollbars)
  body.style.overflow = 'hidden'
  if (gutter > 0) body.style.paddingRight = `${gutter}px`
}
function unlock() {
  if (--locks > 0) return
  locks = 0
  const body = document.body
  body.style.overflow = saved?.overflow ?? ''
  body.style.paddingRight = saved?.paddingRight ?? ''
  saved = null
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lock()
    return unlock
  }, [active])
}
