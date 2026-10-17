import { Suspense, type ReactNode } from 'react'
import { AppRail } from '@/components/shell/app-rail'
import { MobileChrome } from '@/components/shell/mobile-nav'
import { SnackbarProvider } from '@/components/om/snackbar'
import { MaisonAi } from '@/components/shell/maison-ai'
import { NotificationsPanel } from '@/components/shell/notifications-panel'
import { GlobalSearch } from '@/components/shell/global-search'
import { ShortcutsLayer } from '@/components/shell/shortcuts/shortcuts-layer'
import { fetchSessionTeam } from '@/lib/db/session'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchFirstRunShapes } from '@/lib/ghost-shapes.server'
import { GhostSeed } from '@/lib/ghost-shape'
import { fetchCreditsChrome } from '@/lib/credits/chrome'
import { creditsSeed } from '@/lib/credits/model'
import { CreditsHost } from '@/components/credits/credits-host'
import { UpgradeOffers } from '@/components/credits/upgrade-offers'
import { AccessGuard } from '@/components/shell/access-gate'
import { isAccounting, isMarketing } from '@/lib/settings/roles'
import { fetchWelcome } from '@/lib/studio-setup/queries'
import { FirstVisitWelcome } from '@/components/shell/first-visit-welcome'
import { requireStudioSignIn } from '@/lib/auth/session'
import { fetchStudioChrome } from '@/lib/studios/chrome'
import { DEMO_CHROME } from '@/lib/studios/model'
import styles from './app-shell.module.css'

/**
 * Shared frame for every page: canvas, side rail and snackbar host live here so
 * they persist across navigations and stay put while a route's `loading.tsx`
 * ghost is on screen. Each route group's layout renders this once.
 * ≤767 (REG-298, mock 1082:23305) the rail hides and MobileChrome's top bar, bottom dock and More drawer take over.
 */
export async function AppShell({ children, railBadges, ungated = false }: { children: ReactNode; railBadges?: Record<string, number>
  /** (pending modules S41b-2) the page answers every role alike — the app-wide "page not found" (app/not-found.tsx): no role's gate over it */
  ungated?: boolean }) {
  /* (pending modules S30) signed out — a session ended elsewhere or ran out, an account deactivated: sign-in, then back here (proxy.ts sends a
     browser whose cookies already say "signed out" before this runs) */
  await requireStudioSignIn()
  const [team, credits, shapes, welcome, studio] = await Promise.all([
    fetchSessionTeam(),   // (REG-667) Demo Studio › View as — the rail's block and the phone's More sheet
    fetchCreditsChrome().catch(() => null),   // (REG-701) the plan and the AI credits — the rail's slot, More's first row, Plans and the moments
    fetchFirstRunShapes().catch(() => ({})),   // (REG-817) which pages open on their first run — the ghosts' seed
    fetchWelcome().catch(() => null),   // (pending modules S08) a member's first visit — their one welcome, while they are owed it
    fetchStudioChrome().catch(() => DEMO_CHROME),   // (pending modules S31) the studio this prototype has open — the block's name, owner, picture, Studios
  ])
  const me = team.find((m) => m.isYou)
  return (
    <SnackbarProvider>
      <div className={styles.page}>
        {/* (REG-286, a11y audit "no main landmark and no skip link"): the first focusable element in the
            document, so a keyboard or screen-reader visitor can jump the rail's ten nav items, the search tile
            and the page header that repeat ahead of the content on every route. Off screen until it is focused
            (the .visually-hidden technique from globals.css) and out of flow in both states — nothing is drawn. */}
        <a className={styles.skip} href="#om-main">Skip to content</a>
        <MobileChrome team={team} credits={credits} badges={railBadges} studio={studio} />
        <div className={styles.main}>
          <AppRail badges={railBadges} team={team} credits={credits} studio={studio} />
          {/* (REG-286) The `main` landmark every route's content lives in — and the skip link's target, hence
              tabIndex -1 (Safari will not move focus to a plain fragment target). A transparent flex
              pass-through: it takes exactly the box the route's own root already had as a child of .main
              (the same `flex: 1; min-width: 0; display: flex` as page-reveal's .reveal), so no pixel moves. */}
          <main id="om-main" className={styles.content} tabIndex={-1}>
            {/* (parity map, PR-022) an address the member's role does not open shows the house gate — Accounting opens the books only */}
            <GhostSeed shapes={{ ...shapes, ...creditsSeed(credits?.summary), 'studio.solo': studio.solo }} studio={studio.name}><AccessGuard role={me?.role ?? null} open={ungated}>{children}</AccessGuard></GhostSeed>
          </main>
        </div>
        {/* (REG-507) Maison AI's FAB and sheet, once, for every page in the shell. */}
        <MaisonAi />
        {/* (REG-604) The bell's feed, once, opened by the rail's and the phone bar's bell. */}
        <NotificationsPanel />
        {/* (REG-709) The studio-wide search, once, opened by the rail's Search tile, the phone bar's search glyph and ⌘K. */}
        <GlobalSearch member={!runsStudio(me?.role ?? '')} accounting={isAccounting(me?.role)} marketing={isMarketing(me?.role)} owner={me?.role === 'Owner'} />   {/* (simplify S-14) a member's empty search offers their Create rows · (parity map, FB-114) Accounting's finds the books only */}
        {/* (REG-711) The keyboard, once: every shortcut, the ? panel beside the page, the G then … hint, tips. */}
        <ShortcutsLayer />
        {/* (REG-701 · 702) Plans, top-ups, Manage billing and the out-of-credits moments, once — opened from anywhere (credits-client.ts). */}
        <CreditsHost chrome={credits} />
        {/* (pending modules S41b-4) The Free plan's upgrade offers, for the Owner: a look at each quiet moment, an offer as one row in the bell. */}
        <UpgradeOffers />
        {/* (pending modules S08) A member's first visit: one short welcome, once — never a tour over the page. */}
        {welcome && me ? <Suspense fallback={null}><FirstVisitWelcome welcome={welcome} memberId={me.id} /></Suspense> : null}
      </div>
    </SnackbarProvider>
  )
}
