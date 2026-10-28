'use client'

import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { ProLocked } from '@/components/credits/pro-tag'
import { displayDate } from '@/lib/format'
import { recordFrame } from './xray-result'
import { XrayLockedRecordSkeleton } from './xray-skeletons'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './xray-result.module.css'

/**
 * (pending modules S19 — 1.0's plan gating: "opening a report" is Pro) A comparison opened while the studio is on Free: the record's own
 * frame (its title, its date, the crumbs and Back of the reading) and, in place of the reading, the lock — the reading is kept and comes
 * back with Pro. The page sends nothing of the reading to the browser (the server is the lock).
 */
export function XrayLockedRecord({ record, from }: { record: { leadId: string | null; leadName: string | null; yourLabel: string; otherStudio: string; createdAt: number }; from: string | undefined }) {
  const { title, scopedSetup, crumbs } = recordFrame(record, from)
  return (
    <PageReveal skeleton={<XrayLockedRecordSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeaderL2 backHref={from ?? scopedSetup} crumbs={crumbs} title={title} chips={<span className={styles.headMeta}>{displayDate(new Date(record.createdAt))}</span>} />   {/* (the calm UI build, 6-08) the day as plain meta */}
        <div className={styles.column}>
          <div data-testid="xray-record-locked"><ProLocked feature="quote_xray" kept="This comparison is kept" testId="xray-locked" /></div>
        </div>
      </div>
    </PageReveal>
  )
}
