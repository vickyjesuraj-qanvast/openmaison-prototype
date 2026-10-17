import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { trialEnabled } from '@/lib/visualizer/trial/policy'

/* (pending modules S36 — 1.0's try-visualizer pages: "In an unflagged production deploy this page must not be publicly routable … a real 404")
   Off unless switched on (lib/visualizer/trial/policy.ts `trialEnabled`): closed, the trial's start is the site's own 404 — said here, above
   the page's streamed ghost, so the answer is a real 404. (S41b-3) Moved down from app/site/try/layout.tsx, so the no-account tools beside it
   keep their own switch. */
export default function TryHomeLayout({ children }: { children: ReactNode }) {
  if (!trialEnabled()) notFound()
  return children
}
