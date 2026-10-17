'use client'

import { RouteError } from '@/components/shell/route-error'

/** (pending modules S01) Your profile failed: the shell stays, the notice says so, with Try again and the way back. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} />
}
