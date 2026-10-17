import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { toolsOpen } from '@/lib/trial/server'

/* (pending modules S41b-3) Off unless switched on — TRIAL_TOOLS_ENABLED, the Visualizer's sibling (lib/trial/policy.ts): closed (or with no store
   to keep a visitor's work), the page is the site's own 404, said here above the page's streamed ghost. */
export default function TryToolLayout({ children }: { children: ReactNode }) {
  if (!toolsOpen()) notFound()
  return children
}
