import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from '@/app/(editor)/layout.module.css'

/** `/sign/[id]` (REG-534): the client's signing page — no rail, no page header; the editor group's surface. */
export default function SignLayout({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.surface}>{children}</div>
    </SnackbarProvider>
  )
}
