import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'

/** `/sign-up` (pending modules S31): a new studio signs itself up — no rail, no studio chrome (nobody is signed in yet); its own snackbar host,
    as sign-in has. */
export default function SignUpLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>
}
