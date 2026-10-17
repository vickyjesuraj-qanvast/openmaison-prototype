'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { PageReveal } from '@/components/shell/page-reveal'
import { PortalFrame } from '@/components/portal/portal-frame'
import { portalPath } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalLayout } from '@/lib/planner/queries'
import { stampPortalLayoutView } from '@/app/planner/actions'
import { LayoutViewer } from './layout-viewer'
import { LayoutViewerGhost } from '../planner-ghosts'
import portal from '@/components/portal/portal.module.css'
import styles from './portal-layout.module.css'

/**
 * (gaps build J, J-Q16) A 3D layout inside the client's portal — under Designs, in the portal's own frame: the same viewer as the link,
 * session-checked, the snapshot the studio shared (never its underlay). Opening it is the client's first open (never in a studio preview).
 */
export function PortalLayoutView({ data, layout }: { data: PortalData; layout: PortalLayout }) {
  const opened = useCallback(() => { void stampPortalLayoutView(data.slug, layout.id).catch(() => {}) }, [data.slug, layout.id])
  return (
    <PageReveal skeleton={<LayoutViewerGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="designs" visitor={data.visitor} paused={data.paused} needs={data.needs}>
        <Link href={portalPath(data.slug, 'designs')} className={`${portal.link} ${styles.back}`}><Icon name="arrow_back" size={18} weight={300} />Designs</Link>
        <LayoutViewer plan={layout.plan} library={layout.library} name={layout.name} sender={layout.sender} sharedAt={layout.updatedAt} message={layout.message} onOpened={data.visitor.preview ? undefined : opened} />
      </PortalFrame>
    </PageReveal>
  )
}
