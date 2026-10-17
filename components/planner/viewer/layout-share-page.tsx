'use client'

import { useCallback } from 'react'
import { Letterhead } from '@/components/visualizer/share/render-share-page'
import type { PublicLayout } from '@/lib/planner/queries'
import { stampLayoutLinkView } from '@/app/planner/actions'
import { LayoutViewer } from './layout-viewer'
import styles from './layout-share-page.module.css'

/**
 * (gaps build J, J-Q15) The client's 3D link, no sign-in: the studio's letterhead (the AI Visualizer's link page's own), then the layout to
 * walk through. The first open is stamped from the client's browser — it tells the studio (the bell's *A client opens a shared 3D layout*).
 */
export function LayoutSharePage({ data }: { data: PublicLayout }) {
  const opened = useCallback(() => { void stampLayoutLinkView(data.token).catch(() => {}) }, [data.token])
  return (
    <div className={styles.page} data-testid="layout-share">
      <Letterhead data={{ studio: data.studio, expiresAt: 0 }} state="closed" />
      <main className={styles.main}>
        <span className={styles.kicker}>Shared 3D layout · read only</span>
        <LayoutViewer plan={data.plan} library={data.library} name={data.name} sender={data.sender} sharedAt={data.sharedAt} message={data.message} onOpened={opened} />
      </main>
    </div>
  )
}
