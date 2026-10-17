import { Ld } from '@/components/site/ld'
import { TrialXray } from '@/components/trial/trial-xray'
import { workNow } from '@/lib/trial/server'
import { openTrials, toolCrumbs, toolMetadata } from '@/lib/trial/pages'

/* (pending modules S41b-3) A tool of the studio's, tried without an account — what this browser made comes from its workspace (never a studio). */
export const dynamic = 'force-dynamic'
export const metadata = toolMetadata('xray')

export default async function Page() {
  return (
    <>
      <Ld data={toolCrumbs('xray')} />
      <TrialXray initial={await workNow()} open={openTrials()} />
    </>
  )
}
