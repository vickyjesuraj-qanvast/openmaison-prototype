'use client'

import { RouteError } from '@/components/shell/route-error'

/** (gaps build, package A — 11) An editor (a quote, a contract, a template, a design) that failed: the notice with Try again and Go back — never Next's bare error page (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} />
}
