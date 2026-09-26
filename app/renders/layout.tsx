import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from '@/app/(editor)/layout.module.css'
import share from '@/components/visualizer/share/render-share-page.module.css'

/** `/renders/[token]` (REG-676): the client's link to shared renders — no rail, no page header; the signing link's surface. (wave E,
    desktop-11) Its snackbars line up with the page's column, not an app rail it doesn't have (`snackFrame`). */
export default function RendersLayout({ children }: { children: ReactNode }) {
  return (
    <div className={share.snackFrame}>
      <SnackbarProvider>
        <div className={styles.surface}>{children}</div>
      </SnackbarProvider>
    </div>
  )
}
