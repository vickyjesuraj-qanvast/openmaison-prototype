'use client'

import { CompanyShell } from '@/components/company/company-shell'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { ProLocked } from '@/components/credits/pro-tag'
import { ProLockedGhost, useLockedNow } from '@/components/credits/pro-locked-ghost'
import { PriceBookGhost } from '@/components/company/company-ghosts'
import { PRICE_BOOK_TABS } from '@/lib/company/sections'

/**
 * (pending modules S19 — 1.0's plan gating: Packages are Pro — "the Accounts → Packages tab" locked) Price book › My Sections on a Free
 * studio: the Price book frame and its tabs (My Items is every plan's), and the lock in place of the sections — kept, and back with Pro.
 */
export function SectionsLocked({ count, from }: { count: number; from?: string }) {
  return (
    <CompanyShell title="Price book" tabs={[...PRICE_BOOK_TABS]} from={from} skeleton={<ProLockedGhost feature="package_creation" />}>
      <ProLocked feature="package_creation" kept={count ? `Your ${count} ${count === 1 ? 'section is' : 'sections are'} kept` : null} testId="sections-locked" />
    </CompanyShell>
  )
}

/** My Sections' ghost (REG-708) — the lock's while the studio is on Free. */
export function SectionsLoading() {
  return useLockedNow('package_creation')
    ? <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label="Loading My Sections"><ProLockedGhost feature="package_creation" /></CompanyGhostFrame>
    : <PriceBookGhost sections />
}
