'use client'

import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import styles from '@/components/shell/record-not-found.module.css'

/** (pending modules S25 — 1.0's "Article not found · This article may have been removed or unpublished.") An article's address Market
    Insights no longer has — its editors took it down, or the link is old: the shell stays, one sentence says so, and the way back is one press
    (the house record notice, REG-1166). *(invented copy)* */
export function ArticleNotFound() {
  const router = useRouter()
  return (
    <div className={styles.page} data-testid="record-not-found">
      <PageHeader title="Market Insights" />
      <div className={styles.body}>
        <EmptyState icon="article" tone="plain" testId="article-not-found" title="This article isn’t in Market Insights any more"
                    help="OpenMaison’s editors may have taken it down, or the link is old."
                    primary={{ label: 'Back to Market Insights', onPress: () => router.push('/market-insights'), testId: 'article-not-found-back' }} />
      </div>
    </div>
  )
}
