import type { ReactNode } from 'react'
import { AppRail } from '@/components/shell/app-rail'
import { MobileChrome } from '@/components/shell/mobile-nav'
import { SnackbarProvider } from '@/components/om/snackbar'
import { MaisonAi } from '@/components/shell/maison-ai'
import { NotificationsPanel } from '@/components/shell/notifications-panel'
import { GlobalSearch } from '@/components/shell/global-search'
import { ShortcutsLayer } from '@/components/shell/shortcuts/shortcuts-layer'
import { fetchSessionTeam } from '@/lib/db/session'
import { fetchFirstRunShapes } from '@/lib/ghost-shapes.server'
import { GhostSeed } from '@/lib/ghost-shape'
import { fetchCreditsChrome } from '@/lib/credits/chrome'
import { CreditsHost } from '@/components/credits/credits-host'
import styles from './app-shell.module.css'

/**
 * Shared frame for every page: canvas, side rail and snackbar host live here so
 * they persist across navigations and stay put while a route's `loading.tsx`
 * ghost is on screen. Each route group's layout renders this once.
 * ≤767 (REG-298, mock 1082:23305) the rail hides and MobileChrome's top bar, bottom dock and More drawer take over.
 */
export async function AppShell({ children, railBadges }: { children: ReactNode; railBadges?: Record<string, number> }) {
  const [team, credits, shapes] = await Promise.all([
    fetchSessionTeam(),   // (REG-667) Demo Studio › View as — the rail's block and the phone's More sheet
    fetchCreditsChrome().catch(() => null),   // (REG-701) the plan and the AI credits — the rail's slot, More's first row, Plans and the moments
    fetchFirstRunShapes().catch(() => ({})),   // (REG-817) which pages open on their first run — the ghosts' seed
  ])
  return (
    <SnackbarProvider>
      <div className={styles.page}>
        {/* (REG-286, a11y audit "no main landmark and no skip link"): the first focusable element in the
            document, so a keyboard or screen-reader visitor can jump the rail's ten nav items, the search tile
            and the page header that repeat ahead of the content on every route. Off screen until it is focused
            (the .visually-hidden technique from globals.css) and out of flow in both states — nothing is drawn. */}
        <a className={styles.skip} href="#om-main">Skip to content</a>
        <MobileChrome team={team} credits={credits} badges={railBadges} />
        <div className={styles.main}>
          <AppRail badges={railBadges} team={team} credits={credits} />
          {/* (REG-286) The `main` landmark every route's content lives in — and the skip link's target, hence
              tabIndex -1 (Safari will not move focus to a plain fragment target). A transparent flex
              pass-through: it takes exactly the box the route's own root already had as a child of .main
              (the same `flex: 1; min-width: 0; display: flex` as page-reveal's .reveal), so no pixel moves. */}
          <main id="om-main" className={styles.content} tabIndex={-1}>
            <GhostSeed shapes={shapes}>{children}</GhostSeed>
          </main>
        </div>
        {/* (REG-507) Maison AI's FAB and sheet, once, for every page in the shell. */}
        <MaisonAi />
        {/* (REG-604) The bell's feed, once, opened by the rail's and the phone bar's bell. */}
        <NotificationsPanel />
        {/* (REG-709) The studio-wide search, once, opened by the rail's Search tile, the phone bar's search glyph and ⌘K. */}
        <GlobalSearch />
        {/* (REG-711) The keyboard, once: every shortcut, the ? panel beside the page, the G then … hint, tips. */}
        <ShortcutsLayer />
        {/* (REG-701 · 702) Plans, top-ups, Manage billing and the out-of-credits moments, once — opened from anywhere (credits-client.ts). */}
        <CreditsHost chrome={credits} />
      </div>
    </SnackbarProvider>
  )
}
