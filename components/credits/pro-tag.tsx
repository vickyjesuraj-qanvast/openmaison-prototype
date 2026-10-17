'use client'

import { useState, useTransition } from 'react'
import { Icon } from '@/components/om/icon'
import { EmptyState } from '@/components/om/empty-state'
import { useSnackbar } from '@/components/om/snackbar'
import { askToUpgrade } from '@/app/credits/actions'
import { comesWithPro, FEATURE_WORDS, type ProFeature } from '@/lib/credits/features'
import { suggestedPlan } from '@/lib/credits/plans'
import { dayMonth } from '@/lib/credits/model'
import { openPlans, refreshCredits, useCredits } from './credits-client'
import styles from './pro-tag.module.css'

/**
 * (pending modules S19 — 1.0's `<ProBadge />`, ruling R32: "every locked opener gets a Pro badge") The tag a locked opener wears while the
 * studio's plan lacks its feature: the house tag (the Company panel's "Soon", REG-729 — r4, caption-s, a hairline) with a small lock,
 * "Pro". Shown only while it applies (render it from `usePlanLock(f).locked`). The opener stays pressable; its press opens the lock card.
 */
export function ProTag({ className }: { className?: string }) {
  return <span className={className ? `${styles.tag} ${className}` : styles.tag} aria-label="Pro feature"><Icon name="lock" size={12} weight={300} />Pro</span>
}

/** The lock's help — what the feature does, what is kept, the one way on — said once, for the lock and its ghost. */
export function lockedHelp(feature: ProFeature, o: { kept?: string | null; may: boolean; trialOpen: boolean; owner: string; asked: boolean | number }): string {
  return [FEATURE_WORDS[feature].what, o.kept ? `${o.kept} — it all comes back with Pro.` : 'What the studio made with it is kept and comes back with Pro.',
    o.may ? (o.trialOpen ? 'Pro starts with 14 days free.' : null) : typeof o.asked === 'number' ? `You asked ${o.owner} on ${dayMonth(o.asked)}.` : o.asked ? `Asked ${o.owner}.` : `Only ${o.owner} changes the plan.`].filter(Boolean).join(' ')
}

/**
 * (pending modules S19 — 1.0's `ProLockedPanel`) A place that is the feature itself — X-Ray's reading, My Sections, the expenses — on a
 * Free studio: the house empty state in its plain tone, saying what the feature does, that what was made with it is kept (it all comes back
 * with Pro — 1.0's rule, nothing is deleted), and the one way on: Plans for the Owner (the trial named while the studio can still take it),
 * an ask for everyone else ("Asked Dane" once sent). Not the page's C (`kb={false}`): making one isn't the way on here.
 */
export function ProLocked({ feature, kept, testId = 'pro-locked' }: { feature: ProFeature; /** what is kept, e.g. "Your 3 readings are kept" */ kept?: string | null; testId?: string }) {
  const s = useCredits(null)
  const snackbar = useSnackbar()
  const [asked, setAsked] = useState(false)
  const [pending, start] = useTransition()
  const owner = s?.owner.name ?? 'the Owner'
  const may = !!s?.viewer.canChangePlan
  const ask = () => start(async () => {
    const r = await askToUpgrade(suggestedPlan(s?.activeMembers ?? 1), feature)
    if ('error' in r) { snackbar({ message: r.error }); return }
    setAsked(true); snackbar({ message: r.again ? `You asked ${r.owner} on ${dayMonth(r.askedAt)} — it’s in their bell` : `Asked ${r.owner} to move the studio to Pro` })
    void refreshCredits()
  })
  /* (S42 D-07) an earlier ask is said with its day, and not asked twice */
  const earlier = !asked && s?.upgradeAsk ? s.upgradeAsk.at : null
  const help = lockedHelp(feature, { kept, may, trialOpen: !!s?.trialOpen, owner, asked: earlier ?? asked })
  return (
    <EmptyState icon="lock" tone="plain" kb={false} title={comesWithPro(feature)} help={help} testId={testId}
                primary={may ? { label: 'See plans', onPress: openPlans, testId: `${testId}-plans` } : asked || earlier ? null : { label: `Ask ${owner} to upgrade`, onPress: () => { if (!pending) ask() }, testId: `${testId}-ask` }} />
  )
}
