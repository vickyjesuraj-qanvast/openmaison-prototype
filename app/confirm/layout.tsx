import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'
import { SnackbarProvider } from '@/components/om/snackbar'

/* (pending modules S41b-2) a client's page: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

/** `/confirm/[token]` (REG-587; pending modules S04: keyed by its token): the client's confirmation link. (UX audit Q6) Its own snackbar host, as `/sign` has — the page's answers
    ("Couldn’t confirm", Ask for a change's "… has your request") had no host here and never showed. Nothing else wraps the page. */
export default function ConfirmLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>
}
