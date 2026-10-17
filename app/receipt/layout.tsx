import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from '@/app/(editor)/layout.module.css'

/* (pending modules S41b-2) a client's page: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

/** (gaps build B, item 6) `/receipt/[token]`: the client's link to a receipt — no rail, no page header; the renders link's surface. */
export default function PublicReceiptLayout({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.surface}>{children}</div>
    </SnackbarProvider>
  )
}
