import type { Metadata } from 'next'
import { fetchDashboard } from '@/lib/dashboard/queries'
import { afterShell } from '@/lib/dashboard/shell-gate'
import { DashboardView } from '@/components/dashboard/dashboard-view'

/**
 * (pending modules S22; the Dashboard redesigned 2026-10-26 — his marks on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY) The Dashboard:
 * the studio's front door, opened every morning — what needs you, how the studio is doing, what changed and what is coming, with Maison AI
 * docked at its foot. Every role lands here, Accounting's money page included (his Q-08). `?scope=mine` = an Owner's or Admin's own work (Q-07).
 * (P-14 — "the first answer under 0.15 s") The page and its ghost live in a route group of their own (REG-708's rule for a parent page), and
 * the page reads only once its shell has drawn (lib/dashboard/shell-gate.ts): the shell and the ghost reach the browser at once, and the page
 * streams in after its reads — never a blank wait for every card.
 */
export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const scope = typeof sp.scope === 'string' ? sp.scope : null
  await afterShell()
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  return <DashboardView data={await fetchDashboard(scope)} />
}
