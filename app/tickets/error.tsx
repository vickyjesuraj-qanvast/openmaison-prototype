'use client'

import { RouteError } from '@/components/shell/route-error'

/** (S46 — REG-2524) Tickets failed: the shell stays, the notice says so, Try again and the way back (RouteError, the house's). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Tickets" back="/tickets" />
}
