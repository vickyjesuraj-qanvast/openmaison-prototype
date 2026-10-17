'use client'

import { RouteError } from '@/components/shell/route-error'

/** (pending modules S41) The AI bench broke on the way: the shell stays, the notice says so, Try again and the way back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="AI benches" back="/dev/ai-bench" />
}
