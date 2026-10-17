'use client'

import { RouteError } from '@/components/shell/route-error'

/** (gaps build, package A — 11) A page of Quotes that failed: the shell stays, the notice says so, Try again and the way back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Quotes" back="/quotes" />
}
