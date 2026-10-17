'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { COMPANY, COMPANY_LINKS, FOOTER_BOTTOM, FOOTER_LINE, FOOTER_SECURITY, LEGAL_LINKS, site, type NavLink } from '@/lib/site/model'
import { MODULES } from '@/lib/site/platform'
import { checkNewsletter } from '@/lib/site/forms'
import { subscribeNewsletter } from '@/app/site/actions'
import s from './site-footer.module.css'

/*
 * (pending modules S35 — 1.0's marketing-footer.tsx) The website's footer: the wordmark, its line and the security line, the newsletter sign-up
 * ("Occasional studio notes"), the Platform · Company · Legal columns, and the bottom rule — © OpenMaison · Built by the team behind Qanvast, the
 * market it serves and the social links. 1.0's market flags named four countries; 2.0 serves Singapore (her hold, 2026-10-12).
 */

const PLATFORM_LINKS: NavLink[] = [...MODULES.map((m) => ({ label: m.name, href: m.href })), { label: 'Platform overview', href: site('/platform') }]

function Column({ title, links }: { title: string; links: readonly NavLink[] }) {
  return (
    <div>
      <p className={s.colHead}>{title}</p>
      <ul className={s.colList}>{links.map((l) => <li key={l.href}><Link href={l.href} className={s.colLink}>{l.label}</Link></li>)}</ul>
    </div>
  )
}

export function SiteFooter({ year }: { year?: number }) {
  return (
    <footer className={s.footer} data-testid="site-footer">
      <div className={s.inner}>
        <div className={s.top}>
          <div>
            <Link href={site('/')} className={s.logo} aria-label="OpenMaison, home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.mark} src="/figma-assets/logo.svg" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
            </Link>
            <p className={s.line}>{FOOTER_LINE}</p>
            <p className={s.secure}><Icon name="verified_user" size={16} />{FOOTER_SECURITY}</p>
            <Newsletter />
          </div>
          <div className={s.cols}>
            <Column title="Platform" links={PLATFORM_LINKS} />
            <Column title="Company" links={COMPANY_LINKS} />
            <Column title="Legal" links={LEGAL_LINKS} />
          </div>
        </div>
        <div className={s.bottom}>
          <div className={s.bottomStart}>
            <p className={s.copy}>© {year ?? 2026} OpenMaison<span className={s.dotSep}> · </span><br className={s.phoneBreak} />{FOOTER_BOTTOM}</p>
            <span className={s.market} role="img" aria-label="Available in Singapore"><span aria-hidden>🇸🇬</span></span>
          </div>
          <ul className={s.social} aria-label="Social media">
            {COMPANY.socials.map((l) => (
              <li key={l.platform}><a href={l.url} target="_blank" rel="noopener noreferrer" className={s.socialLink} aria-label={l.platform}><SocialIcon name={l.platform} /></a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

/** The footer's sign-up (1.0's): an email, kept once — signing up again answers the same, so nobody learns who is on the list. */
function Newsletter() {
  const path = usePathname()
  const snackbar = useSnackbar()
  const [email, setEmail] = useState('')
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const error = server ?? (tried ? checkNewsletter(email) : null)
  const submit = async () => {
    setTried(true)
    if (checkNewsletter(email) || busy) return
    setBusy(true)
    try {
      const r = await subscribeNewsletter({ email, sourcePage: path })
      if ('error' in r) { if (/^Enter|required/i.test(r.error)) setServer(r.error); else snackbar({ message: couldnt('add you to the list', refusalOf(r.error)) }); return }
      setDone(true)
    } catch { snackbar({ message: couldnt('add you to the list') }) } finally { setBusy(false) }
  }
  if (done) return <p className={s.thanks} role="status" data-testid="newsletter-done">Thanks, you’re on the list.</p>
  return (
    <form className={s.news} noValidate onSubmit={(e) => { e.preventDefault(); void submit() }} data-testid="newsletter-form">
      <TextField label="Occasional studio notes" type="email" inputMode="email" autoComplete="email" name="email" value={email}
                 onChange={(v) => { setEmail(v.slice(0, 200)); setServer(null) }} error={error ?? undefined} className={s.newsField} />
      <Button size="lg" onPress={() => { void submit() }} isDisabled={busy} data-testid="newsletter-submit" iconEnd={<Icon name="arrow_forward" size={16} />}>{busy ? 'Subscribing…' : 'Subscribe'}</Button>
    </form>
  )
}

/** 1.0's two social marks (lucide's stroke style) — the platforms' own shapes, which no icon font carries. */
function SocialIcon({ name }: { name: string }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (name === 'Instagram') return <svg {...p}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
  return <svg {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
}
