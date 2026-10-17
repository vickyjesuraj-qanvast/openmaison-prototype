import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (pending modules S25) `/market-insights` = Tools › Market Insights (the articles OpenMaison's editors publish) and `/market-insights/[articleId]`
    = an article — both in the shell. */
export default async function MarketInsightsLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
