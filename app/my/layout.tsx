import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'
import { SnackbarProvider } from '@/components/om/snackbar'

/* (pending modules S41b-2) a client's page: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

/** `/my/*` (Projects round 4a): the client portal — no rail, no studio chrome; the studio's own bar comes with each page. Its own snackbar host. */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>
}
