import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'
import { SnackbarProvider } from '@/components/om/snackbar'
import styles from '@/app/(editor)/layout.module.css'

/* (pending modules S41b-2) a client's page: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

/** (gaps build F1 — F1-Q9) `/po/[token]`: the vendor's link to a purchase order — no rail, no page header; the invoice link's surface. */
export default function VendorPoLayout({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <div className={styles.surface}>{children}</div>
    </SnackbarProvider>
  )
}
