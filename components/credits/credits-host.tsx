'use client'

import { useEffect, useState } from 'react'
import { useSnackbar } from '@/components/om/snackbar'
import type { CreditsChrome } from '@/lib/credits/chrome'
import { CreditBlockDialog, ManageBillingDialog, TalkToUsDialog, TopUpDialog } from './credit-dialogs'
import { PlansDialog } from './plans-dialog'
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
  const [topUp, setTopUp] = useState<{ then: (() => void) | null; nested: boolean } | null>(null)
  const [block, setBlock] = useState<Block | null>(null)

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<CreditsOpen>).detail
      if (!d) return
      if (d.kind === 'plans') setPlans(true)
      else if (d.kind === 'topup') setTopUp({ then: null, nested: false })
      else if (d.kind === 'billing') setBilling(true)
      else if (d.kind === 'block') setBlock(d)
    }
    window.addEventListener(CREDITS_EVENT, on)
    return () => window.removeEventListener(CREDITS_EVENT, on)
  }, [])

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
      <PlansDialog open={plans} onClose={() => setPlans(false)} chrome={chrome} summary={live} onTalk={() => setTalk(true)} />
      <TalkToUsDialog open={talk} onClose={() => setTalk(false)} summary={live} nested={plans} />
      <ManageBillingDialog open={billing} onClose={() => setBilling(false)} summary={live} />
      <CreditBlockDialog open={!!block} onClose={() => setBlock(null)} summary={live} refusal={block?.refusal ?? null} what={block?.what ?? 'render'} needed={block?.needed ?? 0}
                         smaller={block?.smaller ?? null}
                         onBuy={() => { const retry = block?.retry ?? null; setTopUp({ nested: true, then: () => { setBlock(null); retry?.() } }) }} />
      <TopUpDialog open={!!topUp} onClose={() => setTopUp(null)} chrome={chrome} then={topUp?.then ?? null} nested={topUp?.nested ?? false} />
    </>
  )
}
