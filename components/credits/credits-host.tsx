'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readPlanIntent, withoutPlanIntent, type PlanIntent } from '@/lib/credits/plan-intent'
import { useSnackbar } from '@/components/om/snackbar'
import type { CreditsChrome } from '@/lib/credits/chrome'
import { CreditBlockDialog, ManageBillingDialog, TalkToUsDialog, TopUpDialog } from './credit-dialogs'
import { PlansDialog } from './plans-dialog'
import { SeatsDialog } from './seats-dialog'
import { PlanLockDialog } from './plan-lock-dialog'
import type { ProFeature } from '@/lib/credits/features'
import { topupFor } from '@/lib/credits/plans'
import { CREDITS_EVENT, TIP_EVENT, useCredits, useSeedCredits, type CreditsOpen } from './credits-client'

type Block = Extract<CreditsOpen, { kind: 'block' }>

/**
 * (REG-701 · 702) The one host for the credits' surfaces, the bell's pattern: AppShell and the editors' layout mount it once, and any press
 * anywhere opens Plans, a top-up, Manage billing or a moment through `openPlans()` / `chargeAI()` (credits-client.ts). It seeds the
 * client store from the server's summary on every render, so every surface reads one number.
 *
 * The moments chain in place (§5.6): the Owner's "Buy 1,000 and render" opens the top-up over the refusal (the lighter scrim), and a paid
 * top-up closes both and runs the press again — the render the Owner asked for starts by itself.
 */
export function CreditsHost({ chrome }: { chrome: CreditsChrome | null }) {
  useSeedCredits(chrome?.summary ?? null, chrome?.gstLine)
  const live = useCredits(chrome?.summary ?? null)
  const snackbar = useSnackbar()
  const [plans, setPlans] = useState(false)
  const [talk, setTalk] = useState(false)
  const [billing, setBilling] = useState(false)
  const [seats, setSeats] = useState<{ nested: boolean } | null>(null)
  const [lock, setLock] = useState<{ feature: ProFeature; nested: boolean } | null>(null)
  const [topUp, setTopUp] = useState<{ then: (() => void) | null; nested: boolean; credits?: number } | null>(null)
  const [block, setBlock] = useState<Block | null>(null)

  const [intent, setIntent] = useState<PlanIntent | null>(null)   // (S46D — D4) the plan Plans opens on, when one was picked before
  /* (S46D — D4) Plans on a picked plan: Max is arranged with the team, so Talk to us opens over it */
  const openOn = useCallback((i: PlanIntent | null) => { setIntent(i); setPlans(true); if (i?.plan === 'max') setTalk(true) }, [])

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<CreditsOpen>).detail
      if (!d) return
      if (d.kind === 'plans') openOn(d.intent ?? null)
      else if (d.kind === 'topup') setTopUp({ then: null, nested: false, credits: d.credits })
      else if (d.kind === 'billing') setBilling(true)
      else if (d.kind === 'seats') setSeats({ nested: !!d.nested })
      else if (d.kind === 'lock') setLock({ feature: d.feature, nested: !!d.nested })
      else if (d.kind === 'block') setBlock(d)
    }
    window.addEventListener(CREDITS_EVENT, on)
    return () => window.removeEventListener(CREDITS_EVENT, on)
  }, [openOn])

  /* the one-time tip after a member's first charge (E-17) */
  useEffect(() => {
    const on = (e: Event) => {
      const what = (e as CustomEvent<{ what: 'render' | 'quote' }>).detail?.what
      snackbar({
        key: 'credits-tip',
        message: what === 'quote' ? 'Reading a quote uses 5 AI credits. A file that can’t be read costs nothing.' : 'Renders use AI credits — 10 for Fast, 20 for High. A render that fails costs nothing.',
        actionLabel: 'Got it',
      })
    }
    window.addEventListener(TIP_EVENT, on)
    return () => window.removeEventListener(TIP_EVENT, on)
  }, [snackbar])

  if (!chrome || !live) return null
  return (
    <>
      <Suspense fallback={null}><PlanIntentLanding onIntent={openOn} /></Suspense>
      <PlansDialog open={plans} onClose={() => setPlans(false)} chrome={chrome} summary={live} onTalk={() => setTalk(true)} initial={intent} />
      <TalkToUsDialog open={talk} onClose={() => setTalk(false)} summary={live} nested={plans} />
      <ManageBillingDialog open={billing} onClose={() => setBilling(false)} summary={live} />
      <SeatsDialog open={!!seats} nested={seats?.nested ?? false} onClose={() => setSeats(null)} summary={live} />
      <PlanLockDialog open={!!lock} feature={lock?.feature ?? null} nested={lock?.nested ?? false} summary={live} onClose={() => setLock(null)} />
      <CreditBlockDialog open={!!block} onClose={() => setBlock(null)} summary={live} refusal={block?.refusal ?? null} what={block?.what ?? 'render'} needed={block?.needed ?? 0}
                         smaller={block?.smaller ?? null}
                         onBuy={() => { const retry = block?.retry ?? null; setTopUp({ nested: true, credits: topupFor(block?.refusal && 'needed' in block.refusal ? block.refusal.needed : 0), then: () => { setBlock(null); retry?.() } }) }} />
      <TopUpDialog open={!!topUp} onClose={() => setTopUp(null)} chrome={chrome} then={topUp?.then ?? null} nested={topUp?.nested ?? false} credits={topUp?.credits} />
    </>
  )
}

/**
 * (S46D — D4, his "fix everything" 2026-10-19; finding D4) An address that carries a plan picked before — the website's Pricing through sign-up
 * (`?plan=…&period=…`), 1.0's `/upgrade?plan=` landing on Plan & billing — opens Plans on it once, on whichever studio page it lands, and the
 * address is tidied (the plan keys out, the rest kept). Free carries none.
 */
function PlanIntentLanding({ onIntent }: { onIntent: (i: PlanIntent) => void }) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const intent = readPlanIntent(params)
  const key = intent ? `${pathname}?${params.toString()}` : null
  useEffect(() => {
    if (!intent || !key) return
    onIntent(intent)
    router.replace(withoutPlanIntent(pathname, params.toString()), { scroll: false })
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  return null
}
