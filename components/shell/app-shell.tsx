import type { ReactNode } from 'react'
import { AppRail } from '@/components/shell/app-rail'
import { MobileChrome } from '@/components/shell/mobile-nav'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from './app-shell.module.css'

/**
 * Shared frame for every page: canvas, side rail and snackbar host live here so
 * they persist across navigations and stay put while a route's `loading.tsx`
 * ghost is on screen. Each route group's layout renders this once.
 * ≤767 (REG-298, mock 1082:23305) the rail hides and MobileChrome's top bar, bottom dock and More drawer take over.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.page}>
        {/* (REG-286, a11y audit "no main landmark and no skip link"): the first focusable element in the
            document, so a keyboard or screen-reader visitor can jump the rail's ten nav items, the search tile
            and the page header that repeat ahead of the content on every route. Off screen until it is focused
            (the .visually-hidden technique from globals.css) and out of flow in both states — nothing is drawn. */}
        <a className={styles.skip} href="#om-main">Skip to content</a>
        <MobileChrome />
        <div className={styles.main}>
          <AppRail />
          {/* (REG-286) The `main` landmark every route's content lives in — and the skip link's target, hence
              tabIndex -1 (Safari will not move focus to a plain fragment target). A transparent flex
              pass-through: it takes exactly the box the route's own root already had as a child of .main
              (the same `flex: 1; min-width: 0; display: flex` as page-reveal's .reveal), so no pixel moves. */}
          <main id="om-main" className={styles.content} tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </SnackbarProvider>
  )
}
