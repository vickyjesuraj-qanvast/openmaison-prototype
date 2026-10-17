'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { askToUpgrade } from '@/app/credits/actions'
import { comesWithPro, FEATURE_WORDS, type ProFeature } from '@/lib/credits/features'
import type { CreditSummary } from '@/lib/credits/model'
import { planRow, priceFor, sgd, suggestedPlan } from '@/lib/credits/plans'
import { dayMonth } from '@/lib/credits/model'
import { openPlans, refreshCredits } from './credits-client'
import { noteUpgradeMoment } from '@/app/credits/nudge-actions'   // (pending modules S41b-4) 1.0's T6: the Owner's lock restarts the offers' gap
import styles from './credit-dialogs.module.css'

/**
 * (pending modules S19 — 1.0's T6 / T17 card, the plan branch of its blocked dialog; the audit's §5.6 row "Quote X-Ray comes with Pro")
 * A press on a Pro feature while the studio is on Free. The house Dialog (400, a sheet on a phone): what the feature does, that the studio is
 * on Free, and the one way on — the Owner sees Plans (1.0: only the Owner changes the plan; the 14-day trial is named while it is still the
 * studio's to take), everyone else asks the Owner (2.0's real ask, in the Owner's bell — 1.0's T17 only said "Contact your account owner").
 * Nothing the studio made is lost: it all comes back with Pro.
 */
export function PlanLockDialog({ open, feature, nested = false, summary, onClose }: { open: boolean; feature: ProFeature | null; nested?: boolean; summary: CreditSummary; onClose: () => void }) {
  const snackbar = useSnackbar()
  /* (S42 D-07) the ask this card made — now, or on an earlier day (the server keeps one ask while it waits) */
  const [asked, setAsked] = useState<{ at: number; now: boolean } | null>(null)
  const [pending, start] = useTransition()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setAsked(null) }
  /* (pending modules S41b-4 — 1.0's D4) the lock card IS the Owner's T6 moment: no upgrade offer follows it for ten minutes */
  const t6 = open && !!feature && summary.viewer.canChangePlan && summary.planId === 'free'
  useEffect(() => { if (t6) void noteUpgradeMoment({ trigger: 'T6' }).catch(() => {}) }, [t6, feature])
  if (!feature) return null
  const s = summary, owner = s.owner.name
  const may = s.viewer.canChangePlan
  const pick = suggestedPlan(s.activeMembers)
  const pro = planRow(pick)
  const ask = () => start(async () => {
    const r = await askToUpgrade(pick, feature)
    if ('error' in r) { snackbar({ message: r.error }); return }
    setAsked({ at: r.askedAt, now: !r.again })
    void refreshCredits()
  })
  /* an earlier ask, while the plan is still the one it was asked from: said once, never asked twice */
  const before = asked ?? (s.upgradeAsk ? { at: s.upgradeAsk.at, now: false } : null)
  return (
    <Dialog open={open} onClose={onClose} title={comesWithPro(feature)} size="modal" width={400} nested={nested} portal={nested}
            footer={<div className={styles.foot}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>{may ? 'Not now' : 'Close'}</Button>
              {may ? <Button onPress={() => { onClose(); openPlans() }} data-testid="plan-lock-plans">See plans</Button>
                : before ? null : <Button onPress={ask} isDisabled={pending} data-testid="plan-lock-ask">{`Ask ${owner} to upgrade`}</Button>}
            </div>}>
      <div className={styles.block} data-testid="plan-lock" data-feature={feature}>
        <p className={styles.p}>{FEATURE_WORDS[feature].what}</p>
        <p className={styles.meta}>The studio is on Free. {may
          ? `${pro.name}${pick === 'pro_studio' ? ` for your ${Math.max(pro.minSeats, s.activeMembers)} seats` : ''} is ${sgd(priceFor(pro, Math.max(pro.minSeats, s.activeMembers), 'monthly'))} a month${s.trialOpen ? ', and it starts with 14 days free' : ''}.`
          : `Only ${owner} changes the plan.`} What the studio made with it is kept and comes back with Pro.</p>
        {!may && before ? <p className={styles.asked} data-testid="plan-lock-asked"><Icon name="check_circle" size={18} fill weight={300} />{before.now ? `Asked ${owner} — it’s in their bell` : `You asked ${owner} on ${dayMonth(before.at)} — it’s in their bell`}</p> : null}
      </div>
    </Dialog>
  )
}
