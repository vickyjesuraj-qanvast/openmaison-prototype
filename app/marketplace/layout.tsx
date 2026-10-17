import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (pending modules S24) `/marketplace` = the rail's Marketplace (Qanvast's partner brands and their deals) and `/marketplace/[brandId]` = a brand's page — both in the shell. */
export default async function MarketplaceLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
