'use client'

import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import styles from './page-not-found.module.css'

/**
 * (pending modules S41b-2 — the S41b pages sweep's M2; 1.0's src/app/not-found.tsx) An address no page answers, inside the shell: the rail
 * and the bell stay, the header names the part of OpenMaison the address was in (else "Page not found"), and a plain notice with one way on —
 * back to where the member was (the page that linked here), else the Dashboard. The house's record-not-found look (REG-1166). Never Next's
 * bare 404 page; the answer's status stays 404. It is also what a record the member may not open answers (Who sees leads — a contract, a
 * quote, a reading), so the line says that too, for every address alike: nothing tells a record that exists from one that doesn't.
 * *(invented copy, for Vicky — 1.0's own line kept: "The link may be old, or the page may have moved.")*
 */
export function PageNotFound({ section, way }: {
  /** the part of OpenMaison the address names (`fromLabel`), when it names one */ section?: string
  /** the one way on: the page that linked here, else the Dashboard */ way: { label: string; href: string }
}) {
  const router = useRouter()
  return (
    <div className={styles.page} data-testid="page-not-found">
      <PageHeader title={section ?? 'Page not found'} />
      <div className={styles.body}>
        <EmptyState icon="link_off" tone="plain" testId="page-not-found-notice" title="This page isn’t here" kb={false}
                    help="The link may be old, or the page may have moved — or it may be one you can’t open."
                    primary={{ label: way.label, onPress: () => router.push(way.href), testId: 'page-not-found-way' }} />
      </div>
    </div>
  )
}
