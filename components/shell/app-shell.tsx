import type { ReactNode } from 'react'
import { AppRail } from '@/components/shell/app-rail'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from './app-shell.module.css'

/**
 * Shared frame for every page: canvas, side rail and snackbar host live here so
 * they persist across navigations and stay put while a route's `loading.tsx`
 * ghost is on screen. Each route group's layout renders this once.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.page}>
        <div className={styles.main}>
          <AppRail />
          {children}
        </div>
      </div>
    </SnackbarProvider>
  )
}
