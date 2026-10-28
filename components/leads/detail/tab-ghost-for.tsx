'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useFirstRunShape, useSeedFlag, useViewerShape } from '@/lib/ghost-shape'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { FIRST_RUN_TABS, tabGhost } from './tab-ghosts'

/** (UX audit build) The lead-tab page's key for its remembered shape (lib/ghost-shape.tsx) — per lead, per tab. */
export const leadTabShape = (leadId: string, tab: string) => `lead.${leadId}.${tab}`

/** A lead tab's ghost body in the shape the tab opens on — its first run (REG-737's bare bar and empty card) or its list — read from the
    address (`/leads/<id>/<tab>`) and the shape this browser saw last on that lead's tab. */
export function TabGhostFor({ tab }: { tab: string | undefined }) {
  const leadId = usePathname()?.split('/')[2] ?? ''
  const first = useFirstRunShape(tab && leadId && FIRST_RUN_TABS.includes(tab) ? leadTabShape(leadId, tab) : null)
  return tabGhost(tab, first)
}

/**
 * (REG-708 · one-home N-10 · parity P-07) What the lead page draws, for its ghost — the project ghost's own rule (`om.shape.project.<id>.*`):
 *   · `onProject` — the lead is on its live project: the short strip (Overview · Quotes · Contracts), the Overview without MY TASKS, FILES and
 *     QUESTIONNAIRE (P-04), and the header's pair (the Stage pill and Open project);
 *   · `locked` — Convert to Project sits outlined with its lock between the pill and the primary (≥1025, UX audit L6), as most leads show.
 * The page's reveal is told; a loader, before the lead is read, draws what this browser saw last on this lead — a first visit, the common shape.
 */
export type LeadGhostShape = { onProject: boolean; locked: boolean
  /** (S44O — call C6) no filled primary in the header — Marketing's lead past Met, the designer's to move on */ noPrimary?: boolean }
const COMMON: LeadGhostShape = { onProject: false, locked: false }   // (the calm UI build 2026-10-27 — 2-05) no lead page draws the locked Convert any more
const shapeKey = (leadId: string, k: keyof LeadGhostShape) => `om.shape.lead.${leadId || '_'}.${k === 'onProject' ? 'project' : k === 'noPrimary' ? 'noprimary' : k}`

/** The lead page, once it has drawn: its shape remembered for the loaders' next time (per browser). */
export function useRememberLeadShape(leadId: string, s: LeadGhostShape) {
  const { onProject, locked } = s, noPrimary = !!s.noPrimary
  useEffect(() => { setFlagPref(shapeKey(leadId, 'onProject'), onProject); setFlagPref(shapeKey(leadId, 'locked'), locked); setFlagPref(shapeKey(leadId, 'noPrimary'), noPrimary) }, [leadId, onProject, locked, noPrimary])
}

/** The shape a ghost draws: the one it is handed (the page's reveal), else the one this browser saw last on the lead in the address. */
export function useLeadShape(given?: LeadGhostShape): LeadGhostShape {
  const leadId = usePathname()?.split('/')[2] ?? ''
  /* (S44Z — S44O's ghost note) a lead this browser hasn't seen: what the server knows now (the app shell's seed, lib/ghost-shapes.server.ts) —
     on its project or not, and Marketing's header without a filled button past Met — the stored flags' fallback, as every first-run ghost */
  const seededProject = useSeedFlag(`lead.${leadId || '_'}.project`, COMMON.onProject)
  const seededNoPrimary = useSeedFlag(`lead.${leadId || '_'}.noprimary`, false)
  const [onProject] = useFlagPref(shapeKey(leadId, 'onProject'), seededProject)
  const [locked] = useFlagPref(shapeKey(leadId, 'locked'), COMMON.locked)
  const [noPrimary] = useFlagPref(shapeKey(leadId, 'noPrimary'), seededNoPrimary)
  const desk = useViewerShape('role.marketing')   // (S44O — call C6) Marketing's header never carries the locked Convert
  return given ?? { onProject, locked: locked && !desk, noPrimary }
}
