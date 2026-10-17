import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'
import { GlobalSearch } from '@/components/shell/global-search'
import { NotificationsPanel } from '@/components/shell/notifications-panel'
import { ShortcutsLayer } from '@/components/shell/shortcuts/shortcuts-layer'
import { CreditsHost } from '@/components/credits/credits-host'
import { fetchCreditsChrome } from '@/lib/credits/chrome'
import { fetchSessionTeam } from '@/lib/db/session'
import { runsStudio } from '@/lib/leads/assign-policy'
import { AccessGuard } from '@/components/shell/access-gate'
import { isAccounting, isMarketing } from '@/lib/settings/roles'
import { GhostSeed } from '@/lib/ghost-shape'
import { creditsSeed } from '@/lib/credits/model'
import { requireStudioSignIn } from '@/lib/auth/session'
import styles from './layout.module.css'
import { fetchViewer } from '@/lib/leads/visibility'
import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1) the editors' ghosts draw cost only for who sees it

/** The editor surface (`/quotes/[quoteId]`, route group `(editor)`): no rail, no page header — see layout.module.css.
 *  The studio-wide list at `/quotes` lives in the shell (app/quotes, REG-422).
 *  (REG-701) The credits' host rides here too: the AI Visualizer charges from inside this group, and its out-of-credits moments, the
 *  top-up and Plans open over the design without leaving it.
 *  (REG-714, Q-23) The editors get what every other page has: ⌘K's search, the bell (G then N) and the keyboard with its ? panel —
 *  ⌘S says the editor has saved. Nothing here draws until a key or a press opens it. */
export default async function EditorLayout({ children }: { children: ReactNode }) {
  await requireStudioSignIn()   // (pending modules S30) the editors are the studio's, as the shell's pages are
  const [credits, team, viewer] = await Promise.all([fetchCreditsChrome().catch(() => null), fetchSessionTeam().catch(() => []), fetchViewer().catch(() => null)])
  return (
    <SnackbarProvider>
      {/* (parity map, PR-022) Accounting opens a quote's Preview and the money papers here — every editor else is the house gate */}
      {/* (pending modules S19 — REG-708) the plan's locks, for the editors' loaders: the template editor's ghost on Free is its lock */}
      <div className={styles.surface}><GhostSeed shapes={{ ...creditsSeed(credits?.summary), 'role.costs': viewer ? seesCost(viewer) : true }}><AccessGuard role={team.find((m) => m.isYou)?.role ?? null}>{children}</AccessGuard></GhostSeed></div>
      <CreditsHost chrome={credits} />
      <NotificationsPanel />
      <GlobalSearch member={!runsStudio(team.find((m) => m.isYou)?.role ?? '')} accounting={isAccounting(team.find((m) => m.isYou)?.role)} marketing={isMarketing(team.find((m) => m.isYou)?.role)} owner={team.find((m) => m.isYou)?.role === 'Owner'} />
      <ShortcutsLayer editor />
    </SnackbarProvider>
  )
}
