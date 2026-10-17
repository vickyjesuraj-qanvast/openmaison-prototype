import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'

/** `/sign-in` (pending modules S30): signing in to the studio's app — no rail, no studio chrome (nobody is signed in yet); its own snackbar
    host, as the invitation's page and the client portal have. */
export default function SignInLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>
}
