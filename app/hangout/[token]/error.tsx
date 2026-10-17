'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import sign from '@/components/contracts/sign/signing-page.module.css'
import styles from '@/components/meetings/client/meeting-link-page.module.css'

/** (pending modules S27) The Hangout page failed on the way: the client links' notice with Try again — never Next's bare error page. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className={sign.page} data-testid="hangout-public-error">
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
