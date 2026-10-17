'use client'

import { RouteError } from '@/components/shell/route-error'

/** (pending modules S22) The Dashboard failed to read: the shell stays, the notice says so, Try again and Go back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Dashboard" />
}
