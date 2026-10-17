'use client'

import { Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostField, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { EMAIL_MODES, EMAIL_MODE_HELP, NOTHING_MUTED, NOTICES_CARD, NO_EMAIL_LINE, type EmailMode } from '@/lib/notifications/personal'   // (pending modules S18)
import kit from '@/components/shell/ghost-kit.module.css'
import field from '@/components/om/text-field.module.css'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { detailsHelp, emailHelp, phoneHelp } from '@/lib/company/member-words'   // (S42 audit A-02 · A-15) the page's own words
import { useSeedStudio, useViewerShape } from '@/lib/ghost-shape'   // (pending modules S14) Accounting's page: no signature, no door to Members
import profile from '@/components/company/profile-view.module.css'
import photo from '@/components/company/member-photo-field.module.css'
import styles from './your-profile.module.css'

/** (pending modules S14) Your PayNow's line and the way to Members — said once for the page and its ghost. *(invented copy)* */
export const PAYNOW_HELP = 'Where the studio pays you — a claim paid back, your commission. Finance shows it, with a copy button, when it pays you.'
export const MEMBERS_LINK_HELP = 'Whether you take new leads and the leads you prefer are on your row in Company › Members.'
/** (pending modules S27) the way to the member's Public profile *(invented copy)* */
export const PUBLIC_LINK_HELP = 'What clients read about you — your card and your work — on their portal and your studio’s Hangout pages.'

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
  const studio = useSeedStudio()   // (pending modules S31) the open studio's name
  return (
    <CompanyGhostFrame title={112} actions={[92, 126]} label="Loading your profile">
      <div className={profile.layout}>
        <div className={profile.form}>
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Your details</Words><Words as="p" className={profile.cardHelp}>{detailsHelp(leads, desk)}</Words></div>
            <div className={photo.photoRow}><Slot kind="avatar40" /><Slot kind="btn" w={140} /></div>
            <div className={profile.details}>
              <div className={profile.detailWide}><GhostField /></div>
              {/* the helpers in their own words, so they wrap where the page's do */}
              <div><span className={kit.fieldCol}><Slot kind="field" w="100%" /><span className={field.support}><Words>{emailHelp(true, leads, desk)}</Words></span></span></div>
              <div><span className={kit.fieldCol}><Slot kind="field" w="100%" /><span className={field.support}><Words>{phoneHelp(true, leads)}</Words></span></span></div>
            </div>
            <Words as="p" className={styles.role}>{keeper ? `You’re in Accounting at ${studio}. An Owner or an Admin sets roles.` : `You’re an Owner at ${studio}. An Owner or an Admin sets roles on Company › Members.`}</Words>
          </section>
          {keeper ? null : <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Your signature</Words><Words as="p" className={profile.cardHelp}>It prints on the quotes and contracts you prepare, once you allow it. Draw it, type your name in the signature face, or upload a picture of it.</Words></div>
            <div className={styles.signature}><Bone w="100%" h={140} r={8} className={styles.faceBone} /></div>
            <span className={profile.markActions}><Line w={96} lh={36} h={12} /><Line w={104} lh={36} h={12} /></span>
            {/* (pending modules S03) the consent switch's row */}
            <div className={styles.consentRow}><span className={styles.consentText}><Words className={styles.consentLabel}>Put it on the quotes and contracts I prepare</Words><Words className={profile.cardHelp}>Off, the studio signature box stays blank and you sign by hand. You can change this any time.</Words></span><Slot kind="switch" /></div>
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
          {keeper ? null : <div className={profile.kitLink}>
            <Bone w={40} h={40} r="var(--om-radius-full)" style={{ flexShrink: 0 }} />
            <span className={profile.kitLinkText}><Words className={profile.kitLinkTitle}>New leads and preferences</Words><Words className={profile.cardHelp}>{MEMBERS_LINK_HELP}</Words></span>
          </div>}
        </div>
      </div>
    </CompanyGhostFrame>
  )
}
