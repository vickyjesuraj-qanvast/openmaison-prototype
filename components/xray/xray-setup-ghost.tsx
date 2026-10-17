'use client'

import { useSearchParams } from 'next/navigation'
import { useFlagPref } from '@/lib/prefs'
import { XraySetupSkeleton } from './xray-skeletons'
import { useLockedNow } from '@/components/credits/pro-locked-ghost'

/** (REG-708) X-Ray's setup ghost as the page will draw it — scoped to a lead (`?lead=`, the L2 header) and the intro as the member left it —
    so the route's `loading.tsx` and the workspace's PageReveal draw the same one (the loader used to draw the unscoped page with the intro). */
export function XraySetupGhost() {
  const scoped = !!useSearchParams().get('lead')
  const [introHidden] = useFlagPref('om.xray.introHidden', false)
  const locked = useLockedNow('quote_xray')   // (pending modules S19) on Free the setup is the lock
  return <XraySetupSkeleton scoped={scoped} intro={!introHidden} locked={locked} />
}
