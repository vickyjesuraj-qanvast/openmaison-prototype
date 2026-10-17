'use client'

import { useEffect, useState } from 'react'
import { signingCodeIsDemoAction } from '@/app/contracts/read-actions'

/* (S42 B-03 · call B·2) Whether the client's signing code is the prototype's stand-in — asked once per page load, by the dialogs that say how
   the client confirms it's them (the Send dialogs). Until it answers they say what a real build says. */
let asked: Promise<boolean> | null = null
export function useSignCodeDemo(on = true): boolean {
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    if (!on) return
    let live = true
    void (asked ??= signingCodeIsDemoAction().catch(() => false)).then((d) => { if (live) setDemo(d) })
    return () => { live = false }
  }, [on])
  return demo
}
