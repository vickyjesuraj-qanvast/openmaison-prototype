'use client'

import { Fragment, type ReactNode } from 'react'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { HelpLink } from '@/components/company/help-link'
import { Tooltip } from '@/components/om/tooltip'
import { MODULE_LINKS, type SettingsModule } from '@/lib/settings/modules'
import { RELATED_WORDS } from '@/lib/settings/copy'
import styles from './settings.module.css'

/**
 * (pending modules S46C · M2 — his "fix everything" 2026-10-19 after the findability audit, findings N-3 · L-6) 1.0's Settings was each
 * member's own page (profile, signature, notifications); 2.0's Settings is the studio's rules and 1.0's page is Your profile. Every module says
 * where a member's own settings are — for every role, with the way back here. (the calm UI build 2026-10-27, W-450) …as the Related line's
 * last door, *Your profile*; "Your own details, signature and notifications" is its tooltip.
 */
export const YOURS_LINE = { words: 'Your own details, signature and notifications', label: 'Your profile', icon: 'person' } as const

/**
 * (REG-645, settings parity Q-01 · Q-08) A Settings module's head: what it applies to, and one line when the viewer may only read it.
 * (the calm UI build 2026-10-27, 5-17 · T-04 · T-05 — "Every Settings module opens with 3–5 lines of signposts before the first setting")
 * The module's tab names it, so its title is for screen readers only (the section's `aria-labelledby` still reads it); ONE help line; the
 * *Kept in Company:* doors and the Your profile line moved to the module's END, as one *Related:* line (`ModuleRelated`). `links` is kept on
 * the props for a caller that still passes them (they are drawn by ModuleRelated now, never here).
 */
export function ModuleHead({ id, title, help, readOnly = false, after }: {
  id: string
  title: string
  help: string
  readOnly?: boolean
  /** (the calm UI build, 5-05) one door that belongs to the head — Notifications' *Sent messages* (its card is the module's last) */
  after?: ReactNode
  /** @deprecated (the calm UI build, 5-17) the module's doors are its Related line's now — `ModuleRelated` at the module's end */
  links?: { label: string; icon: string; href: string }[]
  /** @deprecated (the calm UI build, 5-17) with the links */
  kept?: string
}) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.srOnly}>{title}</h2>
      <p className={styles.sectionHelp}>{help}</p>
      {after}
      {readOnly ? <ReadOnlyNote /> : null}
    </div>
  )
}

/** A door on the Related line that is not one of the module's Company pages: a Settings card a pointer paragraph used to name. Each keeps the
    test ids its sentence and its link had — the sentence's on the door's wrapper, the link's on the door — and says the sentence as its tooltip. */
export type RelatedDoor = { key: string; label: string; /** null: a place this viewer can't open — named, not linked (Marketing's Who sees leads) */ href: string | null; tip: string; testId?: string
  /** the test id the pointer sentence had — on the door's wrapper */ pointer?: { testId: string } }

/**
 * (the calm UI build 2026-10-27, 5-17 · 5-52 · W-043 · W-450) A module's last line: **Related:** · the Company pages that hold its records
 * (MODULE_LINKS — `module-links`) · the doors its pointer paragraphs became · *Your profile* (`module-yours`) — one line of house text links,
 * each opening with the way back here (`?from=`, HelpLink), each 44 under a finger. Read by everyone (outside the read-only scope).
 */
export function ModuleRelated({ section, open = () => true, doors = [], tips = {}, className }: {
  section: SettingsModule
  /** Whether the viewer opens a Company door (Accounting · Marketing see only theirs — lib/settings/roles.ts `opensPath`), by its path */
  open?: (path: string) => boolean
  doors?: RelatedDoor[]
  /** A Company door's tooltip and the test id its old pointer sentence had, by path — Finance's Profile (FINANCE_PROFILE_POINTER) */
  tips?: Record<string, { tip: string; testId?: string }>
  className?: string
}) {
  const links = MODULE_LINKS[section].filter((l) => open(l.path))
  return (
    <nav className={className ? `${styles.related} ${className}` : styles.related} aria-label="Related" data-testid="module-related">
      <span className={styles.relatedWords}>{RELATED_WORDS}</span>
      {links.length ? (
        <span className={styles.relatedGroup} data-testid="module-links">
          {links.map((l) => {
            const href = l.hash ? `${l.path}#${l.hash}` : l.path
            const t = tips[l.path]
            const link = <HelpLink href={href} standalone>{l.label}</HelpLink>
            return <Fragment key={l.path}>{t ? <span data-testid={t.testId}><Tooltip label={t.tip}>{link}</Tooltip></span> : link}</Fragment>
          })}
        </span>
      ) : null}
      {doors.map((d) => (
        <span key={d.key} className={styles.relatedGroup} data-testid={d.pointer?.testId}>
          <Tooltip label={d.tip}>{d.href ? <HelpLink href={d.href} testId={d.testId} standalone>{d.label}</HelpLink> : <span className={styles.relatedWords} tabIndex={0} data-testid={d.testId}>{d.label}</span>}</Tooltip>
        </span>
      ))}
      <span className={styles.relatedGroup} data-testid="module-yours">
        <Tooltip label={YOURS_LINE.words}><HelpLink href="/profile" standalone>{YOURS_LINE.label}</HelpLink></Tooltip>
      </span>
    </nav>
  )
}
