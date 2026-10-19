import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { StudioSignUp } from '@/components/auth/studio-sign-up'
import { isStandInProvider } from '@/lib/auth/provider'
import { readStudioSession } from '@/lib/auth/session'
import { homeOf } from '@/lib/company/invitations-server'
import { signUpsPaused } from '@/lib/studios/create'
import { studiosHome } from '@/lib/studios/registry'
import { workNow } from '@/lib/trial/server'
import { anyWork, countOf } from '@/lib/trial/policy'
import { readPlanIntent, withPlanIntent } from '@/lib/credits/plan-intent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Start your studio', robots: { index: false, follow: false } }

/**
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up; 1.0's /onboarding) A new studio signs itself up.
 * Signed in already, it is never shown — you have a studio; you go home (proxy.ts did it for a cookie that says so; this is for what only
 * the record knows). Paused sign-ups (the platform's switch) and a server that can't make a studio say so on the first step.
 */
export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  /* (S46D — D4) the plan picked on the website's Pricing (`?plan=…&period=…`): the new studio opens Plans on it; someone signed in goes home with it */
  const sp = await searchParams
  const intent = readPlanIntent({ get: (k) => { const v = sp[k]; return typeof v === 'string' ? v : null } })
  const s = await readStudioSession()
  if (s.in) redirect(withPlanIntent(homeOf(s.role), intent))
  /* (pending modules S41b-3) what this browser made in the website's free trial — sign-up says it comes along */
  const trial = countOf(await workNow())
  return <StudioSignUp paused={signUpsPaused()} demo={isStandInProvider()} canStart={studiosHome() !== null} trial={anyWork(trial) ? trial : null} intent={intent} />
}
