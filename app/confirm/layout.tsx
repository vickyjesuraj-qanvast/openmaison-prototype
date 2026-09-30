import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'

/** `/confirm/[quoteId]` (REG-587): the client's confirmation link. (UX audit Q6) Its own snackbar host, as `/sign` has — the page's answers
    ("Couldn’t confirm", Ask for a change's "… has your request") had no host here and never showed. Nothing else wraps the page. */
export default function ConfirmLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>
}
