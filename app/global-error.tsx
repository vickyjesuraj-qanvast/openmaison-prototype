'use client'

import { RouteError } from '@/components/shell/route-error'
import '@openmaison/react/styles.css'
import './globals.css'

/**
 * (gaps build, package A — 11) The root layout itself failed: Next replaces the whole document, so this one brings its own <html> and <body>
 * and the app's styles, then the same notice as every other failed page (RouteError) — Try again and Go back.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong · OpenMaison</title>
        <RouteError error={error} retry={retry} />
      </body>
    </html>
  )
}
