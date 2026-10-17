'use client'

import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Slot, Words } from '@/components/shell/ghost-kit'
import { comesWithPro, type ProFeature } from '@/lib/credits/features'
import { useSeedFlag } from '@/lib/ghost-shape'
import { lockedHelp } from './pro-tag'
import { useCredits } from './credits-client'
import e from '@/components/om/empty-state.module.css'

/**
 * (pending modules S19 — REG-708: a loader and its reveal draw the page as it now looks) The ghost of a Pro feature's lock (`ProLocked`):
 * the house empty state's own card (its stylesheet), the 72 well, the title and the help in the lock's own words — so they wrap where the
 * page's wrap, at every width — and the one button (a phone's full width). What it says comes from the credits once the browser holds
 * them, else from the layout's seed (`creditsSeed`); the Owner's name is the one thing a cold loader can't know.
 */
export function ProLockedGhost({ feature, kept, label }: { feature: ProFeature; /** what the page says is kept, when the ghost knows it */ kept?: string | null; label?: string }) {
  const live = useCredits(null)
  const seedMay = useSeedFlag('credits.mayChange', true)
  const seedTrial = useSeedFlag('credits.trialOpen', false)
  const may = live ? live.viewer.canChangePlan : seedMay
  const asked = live?.upgradeAsk?.at ?? false   // (S42 D-07) an earlier ask: the page says its day and offers no button
  const help = lockedHelp(feature, { kept, may, trialOpen: live ? live.trialOpen : seedTrial, owner: live?.owner.name ?? 'the Owner', asked })
  return (
    <section className={e.empty} data-tone="plain" aria-label={label ?? `Loading — ${comesWithPro(feature)}`} aria-busy>
      <span className={e.glyph} aria-hidden><Bone w={40} h={40} r="var(--om-radius-2)" /></span>
      <Words as="h3" className={e.title}>{comesWithPro(feature)}</Words>
      <Words as="p" className={e.help}>{help}</Words>
      {may || !asked ? <span className={e.actions} aria-hidden><Slot kind="btn" w={may ? 98 : 196} fill /></span> : null}
    </section>
  )
}

/** The studio's plan locks `feature` — the live credits once the browser holds them, else what the layout's ghost seed says (a loader streams
    before the page and before the credits store is seeded, so the server's frame and the browser's agree). */
export function useLockedNow(feature: ProFeature): boolean {
  const seeded = useSeedFlag(`locked.${feature}`, false)
  const live = useCredits(null)?.locked
  return live ? live.includes(feature) : seeded
}

/** A page's ghost, or the lock's ghost while the studio's plan locks its feature. */
export function LockAware({ feature, locked, children }: { feature: ProFeature; locked: ReactNode; children: ReactNode }) {
  return useLockedNow(feature) ? <>{locked}</> : <>{children}</>
}
