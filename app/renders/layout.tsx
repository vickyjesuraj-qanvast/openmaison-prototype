import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from '@/app/(editor)/layout.module.css'
import share from '@/components/visualizer/share/render-share-page.module.css'

/* (pending modules S41b-2) a client's page: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

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
