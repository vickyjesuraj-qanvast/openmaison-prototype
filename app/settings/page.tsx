import type { Metadata } from 'next'
import { fetchQuoteApproval, fetchStageMovement, fetchTemplateApproval } from '@/lib/settings/queries'
import { SettingsView } from './settings-view'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/** Account setup — studio-level configuration. Only the Leads section is live in this build. */
export default async function SettingsPage() {
  const [stageMovement, quoteApproval, templateApproval] = await Promise.all([fetchStageMovement(), fetchQuoteApproval(), fetchTemplateApproval()])
  return <SettingsView stageMovement={stageMovement} quoteApproval={quoteApproval} templateApproval={templateApproval} />
}
