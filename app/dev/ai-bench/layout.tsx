import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'
import { devPreviewsOpen } from '@/lib/services/dev-previews'

/** (pending modules S41 — card studio:ai-sandboxes) The developers' AI bench, in the shell like any page (no rail item lights for it; no menu
    links it). Gated here, before anything streams, so a production build without OPENMAISON_DEV_PREVIEWS=1 answers a real 404 — the page, its
    ghost and the shell never reach the browser. */
export const dynamic = 'force-dynamic'

export default async function AiBenchLayout({ children }: { children: ReactNode }) {
  if (!devPreviewsOpen()) notFound()
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
