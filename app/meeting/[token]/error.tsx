'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import sign from '@/components/contracts/sign/signing-page.module.css'
import styles from '@/components/meetings/client/meeting-link-page.module.css'

/**
 * (pending modules S23) The meeting link failed on the way: the client links' notice with Try again (Next's `retry` — the page is fetched and
 * drawn again) — never Next's bare error page, and never the studio's own words (the root's notice tells a member to ask an Owner or an
 * Admin; a client has neither). No studio name: the page that failed is what would have read it. (pending modules S23) (invented copy)
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className={sign.page} data-testid="meeting-link-error">
      <main className={styles.body}>
        <div className={sign.notice} role="alert">
          <span className={sign.uploadedGlyph}><Icon name="error" size={32} /></span>
          <h1 className={sign.noticeTitle}>Something went wrong</h1>
          <p className={sign.uploadedHelp}>This page didn’t load. Please try again in a moment.</p>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="refresh" size={20} />} onPress={retry}>Try again</Button>
        </div>
      </main>
    </div>
  )
}
