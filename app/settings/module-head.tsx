'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useHere } from '@/components/om/use-here'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { leaveThen } from '@/components/company/leave-guard'
import { withFrom } from '@/lib/nav'
import styles from './settings.module.css'

/**
 * (pending modules S46C · M2 — his "fix everything" 2026-10-19 after the findability audit, findings N-3 · L-6) 1.0's Settings was each
 * member's own page (profile, signature, notifications); 2.0's Settings is the studio's rules and 1.0's page is Your profile. Every module's head
 * says where a member's own settings are, in the *Kept in Company:* grammar — the words, then the door — for every role, with the way back here.
 * INVENTED COPY (logged REG-S46C.1): "Your own details, signature and notifications:".
 */
export const YOURS_LINE = { words: 'Your own details, signature and notifications:', label: 'Your profile', icon: 'person' } as const

/**
 * (REG-645, settings parity Q-01 · Q-08) A Settings module's head: its title, what it applies to, one line when the viewer may only
 * read it, and the Company pages that hold the module's records — the rules live here, the records there, nothing kept twice.
 * (S46C · M2) …and the line that points a member to their own settings, Your profile.
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
  const here = useHere(usePathname(), [])   // the module as it is open (`?section=`, its own `?from=`) — Your profile's Back returns here
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
      <div className={styles.moduleLinks} data-testid="module-yours">
        <span className={styles.settingHelp}>{YOURS_LINE.words}</span>
        <Button appearance="text" iconStart={<Icon name={YOURS_LINE.icon} size={18} />} onPress={() => leaveThen(() => router.push(withFrom('/profile', here)))}>{YOURS_LINE.label}</Button>
      </div>
    </div>
  )
}
