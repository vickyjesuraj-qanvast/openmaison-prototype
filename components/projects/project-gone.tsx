'use client'

import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * (fix-A, A-23) A project's address that leads nowhere — deleted forever, or a project this member may not open (Who sees leads) — answers
 * inside the shell with the house EmptyState and the way back to the listing, never Next's bare 404. Invented copy (no mock).
 */
export function ProjectGone() {
  const router = useRouter()
  return (
    <div className={pageStyles.body} data-testid="project-gone">
      <PageHeader title="Projects" />
      <div className={pageStyles.content}>
        <EmptyState icon="business_center" tone="plain" title="This project isn’t there any more" testId="project-gone-empty"
                    help="It may have been deleted, or it belongs to a client you can’t open."
                    secondary={{ label: 'Back to Projects', icon: 'arrow_back', onPress: () => router.push('/projects'), testId: 'project-gone-back' }} />   {/* not the filled one: C creates, it doesn't go back */}
      </div>
    </div>
  )
}
