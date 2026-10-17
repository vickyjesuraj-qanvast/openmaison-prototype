import { Icon } from '@/components/om/icon'
import type { PortalLook } from '@/lib/portal/queries'
import { StudioMark, brandStyle } from './studio-mark'
import { PortalFoot } from './portal-foot'
import styles from './portal.module.css'

/**
 * (Projects round 4a, Q-50) A portal page that does not open: the studio's bar and one notice. Paused says so under the studio's name and
 * points at the links that still work (a quote to confirm, an agreement to sign, designs); an address that names no portal says that. No
 * client data at all — the pause refuses the page on the server, it does not hide it.
 * (pending modules S41b-2) `not-found`: an address no page answers, on a client's link (app/not-found.tsx) — the same calm notice with no
 * studio named (the address names none), the line 1.0's 404 said and whom to ask. *(invented copy, for Vicky)*
 */
export function PortalNotice({ look, kind, back }: { look: PortalLook | null; kind: 'paused' | 'missing' | 'gone' | 'not-found'
  /** (fix-F, F-23) `gone`: the way back to the client's own page (Back to Money · Back to your page) */ back?: { href: string; label: string } }) {
  const studio = look?.studio ?? ''
  /* (parity map, CP-148) OpenMaison closed the portal (Qanvast Ops › Studios): the same calm notice, in its own words — no reason, no blame,
     whom to ask; it outranks the studio's own pause (both can be on) */
  const closed = kind === 'paused' && !!look?.closed
  return (
    <div className={styles.page} style={look ? brandStyle(look) : undefined} data-testid="portal-notice" data-kind={closed ? 'closed' : kind}>
      {look ? (
        <header className={styles.top}>
          <span className={styles.brand}><StudioMark look={look} /><span className={styles.studio}>{studio}</span></span>
        </header>
      ) : null}
      <section className={`${styles.card} ${styles.notice}`}>
        <span className={styles.noticeGlyph}><Icon name={kind === 'paused' ? 'schedule' : 'link_off'} size={28} weight={300} /></span>
        <h1 className={styles.h3}>{closed ? 'This page is closed for now' : kind === 'paused' ? `${studio}’s portal is paused` : kind === 'gone' ? 'This isn’t on your page any more' : kind === 'not-found' ? 'This page isn’t here' : 'This address doesn’t open a portal'}</h1>
        <p className={styles.line}>
          {closed
            ? `Contact ${studio}${look?.phone ? ` on ${look.phone}` : ''} for anything about your home. The links your designer sent you — a quote to confirm, an agreement to sign, your designs — still work.`
            : kind === 'paused'
            ? 'You can’t open your page right now. The links your designer sent you — a quote to confirm, an agreement to sign, your designs — still work.'
            : kind === 'gone' ? `${studio || 'Your studio'} may have taken it back or replaced it. Everything that is yours is on your page.`
            : kind === 'not-found' ? 'The link may be old, or the page may have moved. Ask whoever sent it to you for a new one.'
            : 'Check the link your studio sent you, or ask them for a new one.'}
        </p>
        {back ? <a className={styles.link} href={back.href} data-testid="portal-notice-back">{back.label}</a> : null}
      </section>
      {/* (pending modules S13) the studio's Privacy · Terms · Contact stay readable while its page is paused or a link has gone */}
      {look ? <div className={styles.noticeFoot}><PortalFoot links={look.links} studio={studio} /></div> : null}
    </div>
  )
}
