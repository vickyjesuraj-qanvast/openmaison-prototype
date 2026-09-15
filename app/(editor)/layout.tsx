import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from './layout.module.css'

/** The editor surface (`/quotes/[quoteId]`, route group `(editor)`): no rail, no page header — see layout.module.css.
 *  The studio-wide list at `/quotes` lives in the shell (app/quotes, REG-422). */
export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.surface}>{children}</div>
    </SnackbarProvider>
  )
}
