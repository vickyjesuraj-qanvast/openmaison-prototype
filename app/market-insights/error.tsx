'use client'

import { RouteError } from '@/components/shell/route-error'

/** (pending modules S25) A Market Insights page that failed: the shell stays, the notice says so, Try again and the way back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Market Insights" back="/market-insights" />
}
