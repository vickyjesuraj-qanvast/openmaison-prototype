'use client'

import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import styles from '@/components/shell/record-not-found.module.css'

/** (pending modules S24) A brand's address the Marketplace no longer has — Qanvast withdrew it, or it never was: the shell stays, one sentence
    says so, and the way back is one press (the house record notice, REG-1166). *(invented copy)* */
export function BrandNotFound() {
  const router = useRouter()
  return (
    <div className={styles.page} data-testid="record-not-found">
      <PageHeader title="Marketplace" />
      <div className={styles.body}>
        <EmptyState icon="storefront" tone="plain" testId="brand-not-found" title="This brand isn’t on the Marketplace any more"
                    help="Qanvast may have taken it off, or the link is old. A vendor or a Price book item that came from it stays as it is."
                    primary={{ label: 'Back to the Marketplace', onPress: () => router.push('/marketplace'), testId: 'brand-not-found-back' }} />
      </div>
    </div>
  )
}
