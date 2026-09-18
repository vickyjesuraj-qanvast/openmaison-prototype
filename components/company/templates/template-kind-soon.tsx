'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import type { TemplateKind } from '@/lib/company/sections'
import styles from './template-kind-soon.module.css'

/** A template kind that is not built yet (REG-484): its page exists so the sidebar always lands somewhere, and it says what it will hold. */
export function TemplateKindSoon({ kind }: { kind: TemplateKind }) {
  const router = useRouter()
  return (
    <CompanyShell title="Templates" tabs={templateTabs()}>
      <div className={styles.empty} role="status">
        <span className={styles.glyph}><Icon name={kind.icon} size={40} weight={300} /></span>
        <span className={styles.title}>Coming soon in OpenMaison 2.0</span>
        <span className={styles.help}>{kind.title} — {kind.help.charAt(0).toLowerCase() + kind.help.slice(1)} Quote templates are live today.</span>
        <div className={styles.actions}><Button appearance="outlined" variant="secondary" onPress={() => router.push('/company/templates/quotes')}>Open Quote templates</Button></div>
      </div>
    </CompanyShell>
  )
}
