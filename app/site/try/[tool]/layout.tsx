import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { isTrialTool, trialEnabled } from '@/lib/visualizer/trial/policy'

/* (pending modules S36) An address that is none of the six tools is the site's own 404 — said here, above the page's streamed ghost
   (loading.tsx), so the answer is a real 404 and not a page that says it isn't one (S35's lesson). */
export default async function TryToolLayout({ children, params }: { children: ReactNode; params: Promise<{ tool: string }> }) {
  /* (pending modules S41b-3) the Visualizer's switch, moved down from app/site/try/layout.tsx with the tools beside it */
  if (!trialEnabled() || !isTrialTool((await params).tool)) notFound()
  return children
}
