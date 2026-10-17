import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

/** (pending modules S41b-5) A Lead credits view 2.0 doesn't have is no page: the app-wide "page not found" with its 404 status — checked here,
    above the view's loader, so the answer is not a streamed 200 (S41b-2's rule, app/company/finance/[tab]/layout.tsx). */
export default async function LeadCreditsViewLayout({ children, params }: { children: ReactNode; params: Promise<{ view?: string[] }> }) {
  const v = (await params).view
  if (v?.length && (v.length > 1 || !['transactions', 'contracts'].includes(v[0]!))) notFound()
  return children
}
