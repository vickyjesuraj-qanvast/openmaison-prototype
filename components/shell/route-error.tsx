'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import styles from './route-error.module.css'

/**
 * (gaps build, package A — 11; 1.0's "Something went wrong · Try Again", A-68 · A-69) A page that failed to load or broke on the way: inside
 * the shell, the module's own header and a plain notice with Try again (Next's `retry` — the page is fetched and drawn again) and the way back
 * to the module's list; outside it (the editors, the client's pages, the root), the notice alone. Never Next's bare error page. The error's
 * reference (its digest) is said so a developer can find it in the server's log. Invented copy (no mock).
 */
export function RouteError({ error, retry, section, back }: {
  error: Error & { digest?: string }
  retry: () => void
  /** The module the page belongs to — its header, and Back to it. Left out: the notice alone (no shell around it). */
  section?: string
  back?: string
}) {
  const router = useRouter()
  useEffect(() => { console.error(error) }, [error])
  const notice = (
    <EmptyState icon="error" tone="plain" testId="route-error" title="Something went wrong"
                help={<>This page didn’t load. Try again — if it keeps happening, tell an Owner or an Admin.{error.digest ? <span className={styles.ref}>Reference {error.digest}</span> : null}</>}
                secondary={{ label: 'Try again', icon: 'refresh', onPress: retry, testId: 'route-error-retry' }}   /* not the filled one: C creates, it doesn't retry */
                link={section && back ? { label: `Back to ${section}`, onPress: () => router.push(back), testId: 'route-error-back' } : { label: 'Go back', onPress: () => router.back(), testId: 'route-error-back' }} />
  )
  return (
    <div className={styles.page} data-testid="route-error-page">
      {section ? <PageHeader title={section} /> : null}
      <div className={styles.body}>{notice}</div>
    </div>
  )
}
