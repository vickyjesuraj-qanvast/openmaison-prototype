'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { withFrom } from '@/lib/nav'
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
  /* a hash stays last: /company/profile?from=…#entities */
  const [base, hash] = href.split('#')
  return <Link className={styles.link} href={`${withFrom(base || href, here)}${hash ? `#${hash}` : ''}`} data-testid={testId}>{children}</Link>
}
