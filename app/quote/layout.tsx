import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'
import { SnackbarProvider } from '@/components/om/snackbar'

/* (pending modules S41b-2) a client's page: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

/** `/quote/[token]` (pending modules S02): the quote's view-only link — no rail, no studio chrome; the confirmation link's surface, with its own
    snackbar host as every client link has. */
export default function QuoteViewLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>
}
