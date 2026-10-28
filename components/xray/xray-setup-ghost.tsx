'use client'

import { useSearchParams } from 'next/navigation'
import { useCountPref, useFlagPref } from '@/lib/prefs'
import { XraySetupSkeleton } from './xray-skeletons'
import { useLockedNow } from '@/components/credits/pro-locked-ghost'
import { XRAY_COUNT_KEY } from './intro-copy'

/** (REG-708) X-Ray's setup ghost as the page will draw it — scoped to a lead (`?lead=`, the L2 header) and the intro as the member left it —
    so the route's `loading.tsx` and the workspace's PageReveal draw the same one (the loader used to draw the unscoped page with the intro).
    (the calm UI build 2026-10-27, 6-10) the intro box only on a first run — no comparison when the page was last seen — else the one line. */
export function XraySetupGhost() {
  const scoped = !!useSearchParams().get('lead')
  const [introHidden] = useFlagPref('om.xray.introHidden', false)
  const compared = useCountPref(XRAY_COUNT_KEY, 1)
  const locked = useLockedNow('quote_xray')   // (pending modules S19) on Free the setup is the lock
  return <XraySetupSkeleton scoped={scoped} intro={!introHidden && compared === 0} locked={locked} />
}
