'use client'

import { RouteError } from '@/components/shell/route-error'

/** (gaps build F1) A page of Finance that failed: the shell stays, the notice says so, Try again and the way back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Finance" back="/company/finance" />
}
