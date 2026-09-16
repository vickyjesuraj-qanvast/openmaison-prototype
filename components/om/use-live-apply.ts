'use client'

import { useEffect, useRef } from 'react'

/**
 * Live apply (REG-464, user feedback 2026-09-16: "on clicking Clear all there seems to be no feedback"): a modal or drawer
 * that edits a draft hands every change to the page as it happens — the list behind it filters, the table's columns move —
 * so its primary button only closes ("Done"). `valid` holds a change back while it cannot be applied (an inverted date
 * range); `equal` says when the draft already matches what the page has (so opening applies nothing).
 */
export function useLiveApply<T>(open: boolean, draft: T, applied: T, valid: boolean, apply: (v: T) => void, equal: (a: T, b: T) => boolean = Object.is) {
  const latest = useRef({ apply, equal })
  useEffect(() => { latest.current = { apply, equal } })
  useEffect(() => {
    if (!open || !valid) return
    if (!latest.current.equal(draft, applied)) latest.current.apply(draft)
  }, [open, valid, draft, applied])
}
