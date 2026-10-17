'use client'

import type { MouseEvent, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { bringCardIntoView } from './use-hash-landing'
import styles from './help-link.module.css'

/**
 * (UX audit 2026-09-30, S3) "Where do I change X?" — a help line that names another page ("set under Company › Members") names it as a
 * link to that page, and the page it opens has the way back here (`?from=`, REG-465: the L2 header's Back and crumb). Inline in the
 * sentence, at the sentence's own size, in the house link's ink.
 */
export function HelpLink({ href, children, testId }: { href: string; children: ReactNode; testId?: string }) {
  const path = usePathname()
  const q = useSearchParams().toString()
  const here = q ? `${path}?${q}` : path
  /* (pending modules S14) `#card` alone names a card on this same page (Who may do what's rows → Who sees leads, above): no navigation and no
     `?from=` — the card is brought into view as every card link lands (`bringCardIntoView`), the address keeps its hash, and focus moves to
     the card so the keyboard follows the eye. */
  if (href.startsWith('#')) {
    const id = href.slice(1)
    const land = (e: MouseEvent<HTMLAnchorElement>) => {
      const el = document.getElementById(id)
      if (!el) return
      e.preventDefault()
      bringCardIntoView(el, !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`)
      /* the card's chosen option (a radio card), else its first control, else the card itself */
      const to = el.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]:not(:disabled)') ?? el.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')
      if (to) to.focus({ preventScroll: true })
      else { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }) }
    }
    return <a className={styles.link} href={href} onClick={land} data-testid={testId}>{children}</a>
  }
  /* a hash stays last: /company/profile?from=…#entities */
  const [base, hash] = href.split('#')
  return <Link className={styles.link} href={`${withFrom(base || href, here)}${hash ? `#${hash}` : ''}`} data-testid={testId}>{children}</Link>
}
