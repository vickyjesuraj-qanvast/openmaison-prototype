import type { Metadata } from 'next'
import { Ld } from '@/components/site/ld'
import { TrialVisualizer } from '@/components/visualizer/trial/trial-visualizer'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'
import { TRIAL_SEO } from '@/lib/visualizer/trial/content'
import { trialHref } from '@/lib/visualizer/trial/policy'
import { botCheck, trialLeft } from '@/lib/visualizer/trial/server'
import { OtherTools } from '@/components/trial/trial-frame'
import { openTrials } from '@/lib/trial/pages'

/* (pending modules S36 — 1.0's /try-visualizer) Try the AI Visualizer without an account: the start, then the editor over the whole screen. */
export const metadata: Metadata = siteMetadata({ title: TRIAL_SEO.home.title, description: TRIAL_SEO.home.description, path: trialHref(), card: 'try' })

export default async function TryPage() {
  const left = await trialLeft()
  return (
    <>
      <Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Platform', path: '/site/platform' }, { name: 'AI Visualizer', path: '/site/platform/visualizer' }, { name: 'Try it', path: trialHref() }])} />
      <TrialVisualizer tool={null} left={left} botSiteKey={botCheck().siteKey} />
      {/* (pending modules S41b-3) the trial's home: the other tools to try without an account, while they are on */}
      <OtherTools current="visualizer" open={openTrials()} />
    </>
  )
}
