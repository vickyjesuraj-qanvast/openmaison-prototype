import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from '@/app/(editor)/layout.module.css'

/** `/join/[token]` (pending modules S09): an invitation to the studio's team — no rail, no studio chrome (no one is signed in yet); the client
    links' surface, with its own snackbar host. */
export default function JoinLayout({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.surface}>{children}</div>
    </SnackbarProvider>
  )
}
