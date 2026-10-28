'use client'

import { Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostField, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { EMAIL_MODES, EMAIL_MODE_HELP, NOTHING_MUTED, NOTICES_CARD, NO_EMAIL_LINE, type EmailMode } from '@/lib/notifications/personal'   // (pending modules S18)
import kit from '@/components/shell/ghost-kit.module.css'
import field from '@/components/om/text-field.module.css'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { emailHelp, phoneHelp } from '@/lib/company/member-words'   // (S42 audit A-02 · A-15) the page's own words
import { useViewerShape } from '@/lib/ghost-shape'   // (pending modules S14) Accounting's page: no signature, no door to Members
import { CONSENT_HELP, CONSENT_LABEL } from '@/lib/quotes/signature'   // (calm-build regression fix F, R1) the consent row's words, as the page has them
import profile from '@/components/company/profile-view.module.css'
import photo from '@/components/company/member-photo-field.module.css'
import styles from './your-profile.module.css'

/** (pending modules S14) Your PayNow's line and the way to Members — said once for the page and its ghost. *(invented copy)* */
/* (the calm UI build 2026-10-27 — the audit's 1-29, T-05 · W-058 · W-059) one short line a card, only where it changes a decision; the titles
   carry the rest (was "Where the studio pays you — a claim paid back, your commission. Finance shows it, with a copy button, when it pays you.",
   "What clients read about you — your card and your work — on their portal and your studio’s Hangout pages.") */
export const PAYNOW_HELP = 'For claims and commission'
export const MEMBERS_LINK_HELP = 'The leads you prefer — on your row in Company › Members'
/** (pending modules S27) the way to the member's Public profile *(invented copy)* */
export const PUBLIC_LINK_HELP = 'What clients see about you'
/** (the calm UI build 2026-10-27 — the audit's 1-29 · 1-39, W-009 · W-032) the signature card's line, and Take new leads' words *(invented copy)* */
export const SIGNATURE_HELP = 'Printed on your quotes and contracts'
export const TAKE_LEADS = { title: 'New leads', label: 'Take new leads', help: 'New leads can be assigned to you' } as const

/**
 * (REG-708 · pending modules S01) Your profile's ghost — the route's loading.tsx and the page's PageReveal draw it: Discard · Save changes; Your
 * details (the photo row, the name across, email and phone with their helpers, the role line); Your signature (the 140 face, Change · Remove);
 * the way to the member's row on Members. On the page's own classes, so it wraps as the page wraps at every width.
 */
/** (pending modules S18) Your notifications as the page is about to draw it — the reveal knows it (the view passes it); the route's loader, which
    streams before the data, draws the card as most members have it: As they happen, nothing muted. */
export type NoticesShape = { mode: EmailMode; noEmail: boolean; summary: string | null; read: boolean; muted: string }
const NOTICES_AT_REST: NoticesShape = { mode: 'each', noEmail: false, summary: null, read: false, muted: NOTHING_MUTED }

export function YourProfileGhost({ notices = NOTICES_AT_REST }: { notices?: NoticesShape } = {}) {
  /* (pending modules S14) the page as this member gets it: Accounting prepares no quote (no signature card) and opens no Members (no door) */
  const keeper = useViewerShape('role.accounting')
  const desk = useViewerShape('role.marketing')   // (S43E W6-01) Marketing's own words, as the page says them
  const leads = !keeper && !desk
  return (
    <CompanyGhostFrame title={112} actions={[92, 126]} label="Loading your profile">
      <div className={profile.layout}>
        <div className={profile.form}>
          <section className={profile.card}>
            {/* (the calm UI build 2026-10-27 — the audit's 1-29) the title and the role's chip; the card's two-line help went */}
            <div className={profile.cardHead}><span className={styles.titleRow}><Words as="h2" className={profile.cardTitle}>Your details</Words><Line w={48} lh={20} h={12} /><Slot kind="icon" /></span></div>   {/* (calm-build regression fix F) + the info tip's 36 */}
            <div className={photo.photoRow}><Slot kind="avatar40" /><Slot kind="btn" w={140} /></div>
            <div className={profile.details}>
              <div className={profile.detailWide}><GhostField /></div>
              {/* the helpers in their own words, so they wrap where the page's do */}
              <div><span className={kit.fieldCol}><Slot kind="field" w="100%" /><span className={field.support}><Words>{emailHelp(true, leads, desk)}</Words></span></span></div>
              <div><span className={kit.fieldCol}><Slot kind="field" w="100%" /><span className={field.support}><Words>{phoneHelp(true, leads)}</Words></span></span></div>
            </div>
          </section>
          {keeper ? null : <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Your signature</Words><Words as="p" className={profile.cardHelp}>{SIGNATURE_HELP}</Words></div>
            <div className={styles.signature}><Bone w="100%" h={140} r={8} className={styles.faceBone} /></div>
            <span className={profile.markActions}><Line w={96} lh={36} h={12} /><Line w={104} lh={36} h={12} /></span>
            {/* (pending modules S03) the consent switch's row — (calm-build regression fix F, R1) in the page's own words (lib/quotes/signature.ts), so
                the ghost draws what the page lands with (the calm UI build's 1-29 shortened the helper; the ghost had kept the old sentence) */}
            <div className={styles.consentRow}><span className={styles.consentText}><Words className={styles.consentLabel}>{CONSENT_LABEL}</Words><Words className={profile.cardHelp}>{CONSENT_HELP}</Words></span><Slot kind="switch" /></div>
          </section>}
          {/* (pending modules S14) Your PayNow: the value, then its Change */}
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Your PayNow</Words><Words as="p" className={profile.cardHelp}>{PAYNOW_HELP}</Words></div>
            <span className={styles.paynow}><Line w={88} lh={20} h={12} /><Line w={96} lh={36} h={12} /></span>
          </section>
          {/* (pending modules S18) Your notifications: Emails — the two chips, their line (and the summary's line with Read it · Send one now);
              Muted — its sentence and Choose what reaches you */}
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>{NOTICES_CARD.title}</Words><Words as="p" className={profile.cardHelp}>{keeper ? NOTICES_CARD.helpBooks : NOTICES_CARD.help}</Words></div>
            <div className={styles.noticeBlock}>
              <Words as="h3" className={styles.noticeHead}>{NOTICES_CARD.emails}</Words>
              <GhostChips labels={EMAIL_MODES.map((o) => o.label)} />
              <Words as="p" className={profile.cardHelp}>{EMAIL_MODE_HELP[notices.mode]}</Words>
              {notices.noEmail ? <Words as="p" className={profile.cardHelp}>{NO_EMAIL_LINE}</Words> : null}
              {notices.summary ? (
                <span className={styles.summaryLine}>
                  <Words className={styles.summaryText}>{notices.summary}</Words>
                  <span className={styles.summaryActions}>{notices.read ? <Line w={88} lh={36} h={12} /> : null}<Line w={128} lh={36} h={12} /></span>
                </span>
              ) : null}
            </div>
            <div className={styles.noticeBlock}>
              <Words as="h3" className={styles.noticeHead}>{NOTICES_CARD.muted}</Words>
              <Words as="p" className={styles.mutedLine}>{notices.muted}</Words>
              <span className={styles.chooseWrap}><Line w={208} lh={36} h={12} /></span>
            </div>
          </section>
          {keeper ? null : <div className={profile.kitLink}>
            <Bone w={40} h={40} r="var(--om-radius-full)" style={{ flexShrink: 0 }} />
            <span className={profile.kitLinkText}><Words className={profile.kitLinkTitle}>Your public profile</Words><Words className={profile.cardHelp}>{PUBLIC_LINK_HELP}</Words></span>
          </div>}
          {/* (the calm UI build 2026-10-27 — the audit's 1-39) New leads: the switch itself, then the way to your lead preferences on Members */}
          {keeper || desk ? null : <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>{TAKE_LEADS.title}</Words></div>
            <div className={styles.consentRow}><span className={styles.consentText}><Words className={styles.consentLabel}>{TAKE_LEADS.label}</Words><Words className={profile.cardHelp}>{TAKE_LEADS.help}</Words></span><Slot kind="switch" /></div>
            <div className={profile.kitLink}>
              <Bone w={40} h={40} r="var(--om-radius-full)" style={{ flexShrink: 0 }} />
              <span className={profile.kitLinkText}><Words className={profile.kitLinkTitle}>Lead preferences</Words><Words className={profile.cardHelp}>{MEMBERS_LINK_HELP}</Words></span>
            </div>
          </section>}
        </div>
      </div>
    </CompanyGhostFrame>
  )
}
