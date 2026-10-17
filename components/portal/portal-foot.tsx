'use client'

import { Fragment, useEffect } from 'react'
import { Line } from '@/components/shell/ghost-kit'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { footLinksShown, type FootLinks } from '@/lib/portal/links'
import styles from './portal.module.css'

/** (pending modules S13, REG-708) Whether the studio's pages carry the foot — remembered per browser, so a loader's ghost (which can't read the
    studio's settings) draws the foot the page will have; the page's own reveal is told. */
export const PORTAL_FOOT_KEY = 'om.ghost.portal.foot'

/**
 * (pending modules S13 — card held:client-portal; 1.0's `FooterLinksRow`) The foot of every portal page and the sign-in page: the studio's own
 * Privacy · Terms · Contact, each only once the studio has linked it (Company › Client portal), each opening the studio's site in a new tab —
 * the portal stays where it was (fix-F's rule for whatever leaves it). Nothing at all while none is set. Never the platform's name.
 */
export function PortalFoot({ links, studio, inline = false }: { links: FootLinks | null | undefined; studio: string
  /** inside the sign-in page's foot (its rule and spacing are the foot's own) */ inline?: boolean }) {
  const shown = footLinksShown(links)
  const has = shown.length > 0
  useEffect(() => { setFlagPref(PORTAL_FOOT_KEY, has) }, [has])
  if (!has) return null
  return (
    <nav className={inline ? styles.legalInline : styles.legal} aria-label={`${studio}’s privacy and terms`} data-testid="portal-foot">
      {shown.map((l, i) => (
        <Fragment key={l.key}>
          {i > 0 ? <span className={styles.legalDot} aria-hidden>·</span> : null}
          <a className={styles.link} href={l.href} target="_blank" rel="noopener noreferrer" data-key={l.key}>{l.word}</a>
        </Fragment>
      ))}
    </nav>
  )
}

/** The foot in a ghost: three words as bars, where the page draws them — only when this browser last saw the studio's foot. */
export function PortalFootGhost({ inline = false }: { inline?: boolean }) {
  const [has] = useFlagPref(PORTAL_FOOT_KEY, false)
  if (!has) return null
  return (
    <div className={inline ? styles.legalInline : styles.legal} aria-hidden>
      {[48, 40, 54].map((w, i) => <Fragment key={i}>{i > 0 ? <span className={styles.legalDot}>·</span> : null}<Line w={w} lh={20} h={12} /></Fragment>)}
    </div>
  )
}
