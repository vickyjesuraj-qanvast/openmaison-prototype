import type { ProjectDetail } from '@/lib/projects/queries'
import type { OverviewGhostShape } from './overview-ghost'
import { projectDocumentRows } from './documents'

/**
 * (simplify S-01 · REG-708 · fix-A A-22) The Overview's own shape, for the ghost that stands in for it — the frame tells the reveal and
 * remembers it for the loader (`useRememberProjectShape`): Before work starts while set up (no longer "Getting started while anything is
 * open"), Coming up when the schedule has something next, the Money card or a completed project's closing summary, one brief card.
 */
export function overviewShapeOf(d: ProjectDetail): OverviewGhostShape {
  return { setup: d.project.stage === 'setting_up', schedule: d.comingUp.length > 0, money: !!d.money, closing: !!d.closing, briefMore: false,
    documents: projectDocumentRows(d, { from: '', fileHref: () => '' }).length > 0 }   // (Contracts on the move, C4 — C-23) the Documents card, ≤1024
}
