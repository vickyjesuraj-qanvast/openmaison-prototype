'use client'

import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import styles from './record-not-found.module.css'

/**
 * (fix-G, G-38) A record's address the viewer can't open — Who sees leads leaves it out, or it is gone for good: the shell stays (the rail,
 * the header), a plain notice says so and the way back is one press. Never Next's bare 404. Rendered by the segment's `not-found.tsx`.
 */
export function RecordNotFound({ section, noun, back }: { section: string; noun: 'project' | 'lead'; back: string }) {
  const router = useRouter()
  return (
    <div className={styles.page} data-testid="record-not-found">
      <PageHeader title={section} />
      <div className={styles.body}>
        <EmptyState icon="lock" tone="plain" testId="record-not-found-notice" title={`This ${noun} isn’t one you can open`}
                    help={`It may be on a team you aren’t on (Settings › Roles & access › Who sees leads), or it was deleted for good. An Owner or an Admin can add you to its team.`}
                    primary={{ label: `Back to ${section}`, onPress: () => router.push(back), testId: 'record-not-found-back' }} />
      </div>
    </div>
  )
}
