'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { leaveThen } from '@/components/company/leave-guard'
import styles from './settings.module.css'

/**
 * (REG-645, settings parity Q-01 · Q-08) A Settings module's head: its title, what it applies to, one line when the viewer may only
 * read it, and the Company pages that hold the module's records — the rules live here, the records there, nothing kept twice.
 */
export function ModuleHead({ id, title, help, readOnly = false, links = [], kept = 'Company' }: {
  id: string
  title: string
  help: string
  readOnly?: boolean
  links?: { label: string; icon: string; href: string }[]
  /** (gaps build F1) where the links' records are kept — Company, or Finance for Settings › Finance */
  kept?: string
}) {
  const router = useRouter()
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionHelp}>{help}</p>
      {readOnly ? <ReadOnlyNote /> : null}
      {links.length ? (
        <div className={styles.moduleLinks} data-testid="module-links">
          <span className={styles.settingHelp}>Kept in {kept}:</span>
          {links.map((l) => <Button key={l.href} appearance="text" iconStart={<Icon name={l.icon} size={18} />} onPress={() => leaveThen(() => router.push(l.href))}>{l.label}</Button>)}
        </div>
      ) : null}
    </div>
  )
}
