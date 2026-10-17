'use client'

import { RouteError } from '@/components/shell/route-error'

/** (pending modules S23) A meetings page that failed: the shell stays, the notice says so, Try again and the way back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Meetings" back="/meetings" />
}
