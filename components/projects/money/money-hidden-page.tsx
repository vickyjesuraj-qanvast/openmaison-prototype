'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Crumbs } from '@/components/om/crumbs'
import { EmptyState } from '@/components/om/empty-state'
import { PageReveal } from '@/components/shell/page-reveal'
import { InvoiceGhost } from './invoice-ghost'
import styles from '@/components/quotes/preview/quote-preview.module.css'

/**
 * (fix-D, D-35 · F-17) An invoice's or a receipt's address opened by someone who may see the project but not its money: the page's own frame
 * (the crumb back to the project, Back to the project) and the Money tab's own words — never a bare 404.
 */
export function MoneyHiddenPage({ project, kind }: { project: { id: string; name: string }; kind: 'invoice' | 'receipt' | 'po' | 'credit_note' }) {   // (gaps build F1) + a purchase order · (F2) + a credit note
  const router = useRouter()
  return (
    <PageReveal skeleton={<InvoiceGhost />}>
      <div className={styles.page} data-testid="money-hidden-page">
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <Crumbs className={styles.crumb} items={[{ label: 'Projects', href: '/projects' }, { label: project.name, href: `/projects/${project.id}` }]} />
            <div className={styles.titleRow}><h1 className={styles.title}>{kind === 'invoice' ? 'Invoice' : kind === 'po' ? 'Purchase order' : kind === 'credit_note' ? 'Credit note' : 'Receipt'}</h1></div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" onPress={() => router.push(`/projects/${project.id}`)}>Back to the project</Button>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.column}>
            <EmptyState icon="lock" tone="plain" title="Money is the project’s team’s" testId="money-hidden"
                        help="The contract value, the invoices and what the client has paid are for the project’s team, Owners and Admins. Ask one of them to add you to the team." />
          </div>
        </div>
      </div>
    </PageReveal>
  )
}
