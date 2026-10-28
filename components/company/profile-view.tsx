'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from './read-only-note'
import { MetaChip } from '@/components/om/meta-chip'
import { CompanyShell } from './company-shell'
import { ProfileGhost } from './company-ghosts'
import { LeaveGuard } from './leave-guard'
import { useHashLanding } from './use-hash-landing'
import { saveBrand } from '@/app/company/templates-actions'
import { reasonOf, settle } from './templates/refusal'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { EMPTY_ENTITY, SOCIAL_LABEL, type IssuingEntity, type SocialKey, type StudioDetails } from '@/lib/templates/model'
import { newId } from '@/lib/uid'
import { readFileAsDataUrl } from '@/lib/templates/files'
import type { BrandSetting } from '@/lib/templates/brand'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { QANVAST_REVIEWS_DOOR, REVIEW_LINK_HELP, REVIEW_LINK_LABEL, keptReviewLink, reviewLinkProblem } from '@/lib/company/review-link'   // (pending modules S14)
import { useCopy } from '@/components/om/use-copy'
import { displayDate, isSgPhone, phoneDigits } from '@/lib/format'
import { AboutCard, useAboutForm, type AboutSetup } from './about-card'   // (gaps build H)
import { PROFILE_TABS, profileTabOf, profileTabOfHash } from '@/lib/company/sections'   // (the calm UI build 2026-10-27 — 5-36)
import { AccentField } from '@/components/projects/money/accent-field'   // (parity map, FB-103) the brand kit's colour field
import { ENTITY_FOOTER_MAX, ENTITY_TEXT_MAX } from '@/lib/templates/model'
import { HelpLink } from './help-link'
import { shortStudioName } from '@/lib/settings/types'   // (pending modules S31)
import { setStudioGst } from '@/app/settings/actions'   // (one-home N-13) the studio's own GST registration
import { setStudioAction, undoStudioAction } from '@/app/projects/compliance-actions'   // (one-home N-07)
import { CASETRUST_ID, STUDIO_ACTIONS, type StudioAction, type StudioActionState } from '@/lib/compliance/studio-actions'
import type { RegistrationState } from '@/lib/compliance/queries'
import { CASETRUST_ROW_HELP, ENTITY_GST_WORDS, ENTITY_QR_HELP, PROFILE_DETAILS_HELP, PROFILE_ENTITIES_HELP, PROFILE_REGISTRATIONS_HELP, PROFILE_TAGLINE_HELPER, profileSocialHelp } from '@/lib/company/copy'   // (pending modules S17) the words the ghost reads too
import { QanvastListingCard } from './qanvast-listing-card'   // (pending modules S37)
import type { ListingView } from '@/lib/qanvast-listing/model'
import styles from './profile-view.module.css'

type TextKey = Exclude<keyof StudioDetails, 'entities' | 'tradeNotes' | 'socials' | 'preparedByMode' | 'gstRegistered' | 'reviewLink' | 'gstPct'>   // (S44Q) gstPct is read in, never typed here
const DETAIL_FIELDS: { key: TextKey; label: string; wide?: boolean; helper?: string }[] = [
  { key: 'name', label: 'Company name' }, { key: 'uen', label: 'UEN / Co. Reg. No.' }, { key: 'address', label: 'Address', wide: true }, { key: 'phone', label: 'Phone' }, { key: 'fax', label: 'Fax' },
  /* (one-home N-13) GST Reg. No. sits with the studio's own GST switch under Issuing entities, as every other entity's does */
  { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }, { key: 'licence', label: 'HDB licence' },
  /* (REG-562) The testers' tagline and social links: two fields, two template fields. */
  { key: 'tagline', label: 'Tagline', wide: true, helper: PROFILE_TAGLINE_HELPER },
]
/* (REG-618, parity Q-20) One field per network, as the studio wants it printed; the website is the Website field above. */
const SOCIAL_FIELDS: SocialKey[] = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'linkedin']
const ENTITY_FIELDS: { key: 'bankName' | 'accountName' | 'accountNo' | 'swift' | 'payNow'; label: string }[] = [
  { key: 'bankName', label: 'Bank' }, { key: 'accountName', label: 'Account name' }, { key: 'accountNo', label: 'Account number' }, { key: 'swift', label: 'SWIFT / BIC' }, { key: 'payNow', label: 'PayNow (UEN or mobile)' },   // (REG-618, parity Q-24) SWIFT
]

/**
 * Company › Profile (REG-487 → REG-554): the company details every template prints through its fields — name, UEN,
 * address, phone, GST registration, licence, and (REG-562) a tagline and social links. **Issuing entities & bank details**
 * (REG-562, the testers' ask): the studio itself and any other company it quotes under, each with its bank, account and
 * PayNow plus a PayNow QR; the quote's Issuing Entity picks one and the template's Bank details block prints it. The brand
 * kit (logo, stamp, badges, colours, type) lives beside the templates it serves: Company › Templates › Brand kit (owner
 * 2026-09-23, "inside the template is better"). Both save the one `brand` record. (REG-707) No template preview here — it
 * belongs to the kit, which keeps its own.
 * (one-home N-13) The studio is the first issuing entity, with the same GST switch and GST Reg. No. as every other — the switch writes the
 * studio's own record (settings `studio`), which quotes, invoices and the letterhead have always read; Settings › Quotes & pricing keeps
 * only the rate. (one-home N-07) **Registrations & accreditations** — the studio's one record of them (CaseTrust, HDB, bizSAFE, BCA, ACRA):
 * the Compliance Navigator reads it, and CaseTrust done puts the deposit-protection disclosure on every signing page.
 * (pending modules S37) **Listed on Qanvast** — the studio's application to be listed (1.0's /verify), made from this page's records.
 */
export function ProfileView({ brand, from, canRun = true, usage = {}, about, registrations = {}, listing, qanvastReviews = false }: { brand: BrandSetting; from?: string; /** (REG-646, settings parity Q-07) */ canRun?: boolean
  /** (pending modules S41b-5) the viewer opens Qanvast Ops › Reviews (the Owner, 1.0's rule) — Reviews' door to Request reviews */ qanvastReviews?: boolean
  /** (pending modules S37) the studio's listing on Qanvast — its application, its state, its proof */ listing?: ListingView
  /** (one-home N-07) the studio's registrations, with who recorded each and when */ registrations?: Record<string, RegistrationState>
  /** (gaps build H, H-Q21) the portal's About page: the year, the story, the awards, the photos */ about?: AboutSetup
  /** (REG-647, settings parity Q-10) How many live quotes and contracts name each entity (by its saved name) — an entity in use is retired, not removed. */
  usage?: Record<string, number> }) {
  const snackbar = useSnackbar()
  const router = useRouter()
  /* (the calm UI build 2026-10-27 — 5-36) four tabs on one page (`?tab=`); an old card address (#entities, #registrations, #qanvast, #about)
     opens its card's tab first, then lands on the card as before (useHashLanding, re-run as the tab changes) */
  const tab = profileTabOf(useSearchParams().get('tab'))
  const q = useSearchParams().toString()
  useEffect(() => {
    const t = profileTabOfHash(window.location.hash)
    if (t && t !== tab && !new URLSearchParams(window.location.search).get('tab')) {
      const u = new URL(window.location.href); u.searchParams.set('tab', t)
      router.replace(`${u.pathname}${u.search}${u.hash}`, { scroll: false })
    }
  }, [q, tab, router])
  useHashLanding(tab)   // (UX audit S3) Settings' "kept under Company › Profile" and Manage entities land on #entities
  const [details, setDetails] = useState<StudioDetails>(brand.details)
  const [saved, setSaved] = useState<StudioDetails>(brand.details)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(details) !== JSON.stringify(saved)
  const entities = details.entities.length ? details.entities : [EMPTY_ENTITY(details.name)]
  const setEntity = (i: number, patch: Partial<IssuingEntity>) => setDetails((d) => ({ ...d, entities: entities.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))

  /* (REG-647) An entity keeps its id: its uses are counted under the name it was saved with. */
  const usesOf = (e: IssuingEntity) => usage[saved.entities.find((x) => x.id === e.id)?.name ?? e.name] ?? 0
  /* (sweep S4 #23 · #27) The details check as every other form does: the name is required, a phone or fax is a Singapore number (the
     +65 is allowed and the spacing is kept as typed — it prints as written), an email looks like one. Shown after the first Save, cleared live. */
  const [tried, setTried] = useState(false)
  const val = (k: TextKey) => String(details[k] ?? '').trim()
  const detailErrors: Partial<Record<TextKey, string>> = {
    name: val('name') ? undefined : MSG.required,
    phone: val('phone') && !isSgPhone(phoneDigits(val('phone'))) ? MSG.phone : undefined,
    fax: val('fax') && !isSgPhone(phoneDigits(val('fax'))) ? MSG.phone : undefined,
    email: val('email') && !EMAIL_RE.test(val('email')) ? MSG.email : undefined,
  }
  /* (pending modules S14) the review link: a web address or nothing — checked with the details, shown after the first Save */
  const reviewErr = reviewLinkProblem(details.reviewLink ?? '') ?? undefined
  const reviewKept = keptReviewLink(details.reviewLink)
  const { copy: copyReview } = useCopy(reviewKept, { done: 'Review link copied', failed: 'Couldn’t copy the review link — please try again' })
  /* (UX audit S2) true when the details landed — the leave guard's Save goes on only then */
  /* (parity map, FB-103) an entity's More details check as the company details do: an email that looks like one, a Singapore number */
  const extraErrors = (e: IssuingEntity): { email?: string; phone?: string } => ({
    email: e.email?.trim() && !EMAIL_RE.test(e.email.trim()) ? MSG.email : undefined,
    phone: e.phone?.trim() && !isSgPhone(phoneDigits(e.phone.trim())) ? MSG.phone : undefined,
  })
  const [moreOpen, setMoreOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(brand.details.entities.map((e) => [e.id, !!(e.email || e.phone || e.website || e.tagline || e.accent || e.footer || e.branch)])))
  const save = async (): Promise<boolean> => {
    /* (the calm UI build 2026-10-27 — 5-36) a field to fix on the other tab opens that tab first, then its card comes into view */
    const toTab = (t: 'details' | 'entities', card: string) => {
      if (tab !== t) router.replace(`/company/profile?tab=${t}${from ? `&from=${encodeURIComponent(from)}` : ''}#${card}`, { scroll: false })
      else document.getElementById(card)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
    if (Object.values(detailErrors).some(Boolean) || reviewErr) { setTried(true); toTab('details', Object.values(detailErrors).some(Boolean) ? 'details' : 'reviews'); return false }
    const wrong = entities.find((e) => Object.values(extraErrors(e)).some(Boolean))
    if (wrong) { setTried(true); setMoreOpen((o) => ({ ...o, [wrong.id]: true })); toTab('entities', 'entities'); return false }
    const names = entities.slice(1).map((e) => e.name.trim().toLowerCase())
    if (names.some((n) => !n)) { snackbar({ message: 'Give every entity a name' }); return false }
    if (new Set([details.name.trim().toLowerCase(), ...names]).size !== names.length + 1) { snackbar({ message: 'Two entities can’t share a name' }); return false }
    setBusy(true)
    try {
      /* (one-home N-13) The studio's own GST switch: its entity row keeps in step, and the registration is written where the studio's GST has
         always lived (settings `studio`, `setStudioGst`) — so quotes, invoices and the letterhead read it unchanged. */
      const studioGst = details.gstRegistered !== false
      const next = { ...details, entities: entities.map((e, i) => (i === 0 ? { ...e, name: details.name, gstRegistered: studioGst } : e)), reviewLink: reviewKept }   // (pending modules S14) the link as it is kept
      await settle(saveBrand({ details: next }))   // (REG-646) its own half only
      if (studioGst !== (saved.gstRegistered !== false)) await setStudioGst({ gstRegistered: studioGst })
      setDetails(next); setSaved(next); snackbar({ message: 'Company details saved' })
      return true
    }
    catch (e) { snackbar({ message: couldnt('save the company details', reasonOf(e)) }); return false }   // (wave E, E7) a refusal answers { error: the rule }
    finally { setBusy(false) }
  }
  const discard = () => setDetails(saved)
  /* (5-18) the About page's form lives here so its one Discard · Save is the page header's on its tab, and its leave guard stays up on any tab */
  const aboutForm = useAboutForm(about ?? { about: { year: null, story: '', awards: [] }, photos: [], now: 0 }, canRun && !!about)
  const onAbout = tab === 'about' && !!about
  /* (REG-618, parity Q-26) An entity's logo is kept as the picture itself, downscaled — as the brand kit keeps its logo. */
  const pickLogo = (i: number) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
    input.onchange = async () => { const f = input.files?.[0]; if (f) { setEntity(i, { logo: await readFileAsDataUrl(f, 800) }); snackbar({ message: 'Logo added' }) } }
    input.click()
  }
  /* The PayNow QR: any picked image lands as the sample QR asset (the prototype keeps no uploads, REG-415's rule). */
  const pickQr = (i: number) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => { if (input.files?.length) { setEntity(i, { payNowQr: '/figma-assets/paynow-qr.svg' }); snackbar({ message: 'PayNow QR added' }) } }
    input.click()
  }

  return (
    <CompanyShell title="Profile" from={from} skeleton={<ProfileGhost />} tabs={PROFILE_TABS} activeHref={PROFILE_TABS.find((t) => t.key === tab)!.href}
                  actions={!canRun || tab === 'registrations' ? null : onAbout ? <>
      {/* (the calm UI build 2026-10-27 — 5-18) one Discard · Save in the header for the tab that is open — the About card's own pair moved here */}
      <Button variant="secondary" appearance="outlined" onPress={aboutForm.reset} isDisabled={!aboutForm.dirty || aboutForm.busy}>Discard</Button>
      <Button onPress={() => { void aboutForm.save() }} isDisabled={!aboutForm.dirty || aboutForm.busy} data-testid="about-save">{aboutForm.busy ? 'Saving…' : 'Save'}</Button>
    </> : <>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save'}</Button>
    </>}>
      {canRun ? null : <ReadOnlyNote />}
      {/* (UX audit S2) Unsaved edits are not lost to a move inside the app — nor to a tab or a reload (checklist: discarding edits asks first). */}
      <LeaveGuard dirty={dirty && canRun} what="the company details" onSave={save} onDiscard={discard} />
      <LeaveGuard dirty={aboutForm.dirty} what="the About page" onSave={aboutForm.save} onDiscard={aboutForm.reset} />
      <div className={styles.layout} data-testid="profile" data-tab={tab}>
        <div className={styles.form}>
          {tab === 'details' ? <ReadOnlyScope readOnly={!canRun}>
          <section id="details" className={styles.card} aria-labelledby="profile-details">
            {/* (5-35 · 5-36) the studio's words, and the Brand kit's door (it lives under Templates — this is the way there for whoever comes here for the logo) */}
            <div className={styles.cardHead}><h2 id="profile-details" className={styles.cardTitle}>Company details</h2><p className={styles.cardHelp}>{PROFILE_DETAILS_HELP.lead}<HelpLink href="/company/templates/brand" testId="brand-kit-link">{PROFILE_DETAILS_HELP.link}</HelpLink>{PROFILE_DETAILS_HELP.end}</p></div>
            <div className={styles.details}>
              {DETAIL_FIELDS.map((f) => (
                <div key={f.key} className={f.wide ? styles.detailWide : undefined}>
                  <TextField label={f.label} value={details[f.key]} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} helper={f.helper} required={f.key === 'name'}
                             error={tried ? detailErrors[f.key] : undefined} inputMode={f.key === 'phone' || f.key === 'fax' ? 'tel' : f.key === 'email' ? 'email' : undefined} />
                </div>
              ))}
            </div>
            {/* (REG-618, parity Q-20) Social links: {studio_social} prints them in a line; the templates' Social links element prints each with its mark.
                (Dane UAT 2.02) The help shows what "as you want them printed" means — a handle prints exactly as typed (REG-618). */}
            <div className={styles.cardHead}><h3 className={styles.subTitle}>Social links</h3><p className={styles.cardHelp}>{profileSocialHelp(shortStudioName(details.name))}</p></div>
            <div className={styles.details} data-testid="social-links">
              {SOCIAL_FIELDS.map((k) => (
                <div key={k}><TextField label={SOCIAL_LABEL[k]} value={details.socials?.[k] ?? ''} onChange={(v) => setDetails((d) => ({ ...d, socials: { ...(d.socials ?? {}), [k]: v } }))} /></div>
              ))}
            </div>
            {/* (pending modules S14 — 1.0's Review Link: the address, Copy, kept for the review asks) Where clients review the studio — never
                printed; Maison AI's Ask for a review puts it in the WhatsApp it drafts. ⌘K and the review ask's door land on #reviews. */}
            <div id="reviews" className={styles.subGroup}>
              <div className={styles.cardHead}><h3 className={styles.subTitle}>Reviews</h3><p className={styles.cardHelp}>{REVIEW_LINK_HELP}</p></div>
              <div className={styles.details} data-testid="review-link">
                <div className={styles.detailWide}>
                  <TextField label={REVIEW_LINK_LABEL} value={details.reviewLink ?? ''} onChange={(v) => setDetails((d) => ({ ...d, reviewLink: v }))} maxLength={500}
                             error={tried ? reviewErr : undefined}
                             trailing={reviewKept && !reviewErr ? <Tooltip label="Copy the review link"><IconButton icon="content_copy" label="Copy the review link" variant="bare" onClick={() => { void copyReview() }} data-testid="review-link-copy" /></Tooltip> : undefined} />
                </div>
              </div>
              {/* (pending modules S41b-5) Reviews on Qanvast have their one home on Qanvast Ops › Reviews — this is its door, not a second place
                  (1.0's Request Reviews sent Qanvast's own review page; this link is the studio's other review page) *(invented copy)* */}
              {qanvastReviews ? <p className={styles.cardHelp} data-testid="review-qanvast-door">{QANVAST_REVIEWS_DOOR.lead}<HelpLink href={QANVAST_REVIEWS_DOOR.href} testId="review-qanvast-request">{QANVAST_REVIEWS_DOOR.link}</HelpLink>{QANVAST_REVIEWS_DOOR.end}</p> : null}
            </div>
          </section>
          </ReadOnlyScope> : null}
          {/* (one-home N-07) The studio's registrations, recorded once — the Navigator and the signing pages read them. */}
          {tab === 'registrations' ? <ReadOnlyScope readOnly={!canRun}><RegistrationsCard initial={registrations} canRun={canRun} /></ReadOnlyScope> : null}
          {/* (pending modules S37) Listed on Qanvast — beside the registrations it sends: who vouches for the studio, one card after the other. Outside
              the read-only scope (its fieldset would disable What Qanvast has for those who only read): the card shows its presses to Owners and
              Admins alone and keeps nothing to type on the page. (the calm UI build 2026-10-27 — 5-36) It stays mounted, hidden, on the other tabs:
              an application's words survive a trip to Company details for the UEN (its Add your UEN opens that tab). */}
          {listing ? <div className={styles.pane} hidden={tab !== 'registrations'}><QanvastListingCard data={listing} canRun={canRun} /></div> : null}
          {tab === 'entities' ? <ReadOnlyScope readOnly={!canRun}>
          {/* (REG-562) Issuing entities and where the money goes. */}
          <section id="entities" className={styles.card} aria-labelledby="profile-entities" data-testid="entities">
            <div className={styles.cardHead}><h2 id="profile-entities" className={styles.cardTitle}>Issuing entities &amp; bank details</h2><p className={styles.cardHelp}>{PROFILE_ENTITIES_HELP}</p></div>
            {entities.map((e, i) => (
              <div key={i} className={styles.entity} data-testid="entity">
                <div className={styles.entityHead}>
                  {i === 0 ? <span className={styles.entityName}>{details.name || 'The studio'} <span className={styles.cardHelp}>· the studio itself</span></span>
                    : <div className={styles.entityNameField}><TextField label="Entity name" value={e.name} onChange={(v) => setEntity(i, { name: v })} /></div>}
                  {i > 0 && e.retired ? <span className={styles.entityState} data-testid="entity-retired"><MetaChip>Not offered</MetaChip><Button appearance="text" onPress={() => setEntity(i, { retired: false })}>Restore</Button></span> : null}
                  {i > 0 && !e.retired && usesOf(e) > 0 ? <Tooltip label={`On ${usesOf(e)} ${usesOf(e) === 1 ? 'quote or contract' : 'quotes and contracts'} — it keeps printing there; new quotes stop offering it`}><span><Button appearance="text" onPress={() => setEntity(i, { retired: true })}>Stop offering</Button></span></Tooltip> : null}
                  {i > 0 && !e.retired && usesOf(e) === 0 ? <Tooltip label="Remove this entity"><IconButton icon="delete" label="Remove this entity" size={36} variant="bare" iconSize={20} onClick={() => setDetails((d) => ({ ...d, entities: entities.filter((_, j) => j !== i) }))} /></Tooltip> : null}
                </div>
                <div className={styles.details}>
                  {ENTITY_FIELDS.map((f) => <div key={f.key}><TextField label={f.label} value={e[f.key]} onChange={(v) => setEntity(i, { [f.key]: v })} /></div>)}
                </div>
                {/* (REG-593) Dyel's four companies, one GST-registered: an entity that is not turns GST off on the quotes raised under it.
                    (one-home N-13) The studio's own registration is this same switch now, with its GST Reg. No. — it was Settings' (REG-645 Q-05). */}
                {i > 0 ? <label className={styles.switchRow}><Switch size="sm" isSelected={e.gstRegistered} onChange={(v: boolean) => setEntity(i, { gstRegistered: v })} aria-label={`${e.name || 'This entity'} is GST-registered`} /><span>{ENTITY_GST_WORDS.label} <span className={styles.cardHelp}>{ENTITY_GST_WORDS.help}</span></span></label>
                  : <label className={styles.switchRow} data-testid="studio-gst"><Switch size="sm" isSelected={details.gstRegistered !== false} onChange={(v: boolean) => setDetails((d) => ({ ...d, gstRegistered: v }))} aria-label={`${details.name || 'The studio'} is GST-registered`} /><span>{ENTITY_GST_WORDS.label} <span className={styles.cardHelp}>{ENTITY_GST_WORDS.help}</span></span></label>}
                {i === 0 && details.gstRegistered !== false ? <div className={styles.details}><div><TextField label="GST Reg. No." value={details.gstReg} onChange={(v) => setDetails((d) => ({ ...d, gstReg: v }))} /></div></div> : null}
                <div className={styles.qrRow}>
                  <button type="button" className={styles.qrWell} onClick={() => pickQr(i)} aria-label={e.payNowQr ? 'Replace the PayNow QR' : 'Add a PayNow QR'}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.payNowQr ? <img src={e.payNowQr} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={20} weight={300} /> PayNow QR</span>}
                  </button>
                  <span className={styles.cardHelp}>{e.payNowQr ? ENTITY_QR_HELP.set : ENTITY_QR_HELP.none}</span>
                  {e.payNowQr ? <Button appearance="text" variant="secondary" onPress={() => setEntity(i, { payNowQr: null })}>Remove QR</Button> : null}
                </div>
                {/* (REG-618, parity Q-26) Another entity's own letterhead: quotes raised under it print its name, logo, address and numbers. */}
                {i > 0 ? <>
                  <h3 className={styles.subTitle}>Letterhead</h3>
                  <div className={styles.details} data-testid="entity-letterhead">
                    <div className={styles.detailWide}><TextField label="Registered address" value={e.address} onChange={(v) => setEntity(i, { address: v })} helper="Left blank, the studio's address prints." /></div>
                    <div><TextField label="UEN / Co. Reg. No." value={e.uen} onChange={(v) => setEntity(i, { uen: v })} helper="Prints only this entity's own number." /></div>
                    {e.gstRegistered ? <div><TextField label="GST Reg. No." value={e.gstReg} onChange={(v) => setEntity(i, { gstReg: v })} /></div> : null}
                  </div>
                  <div className={styles.qrRow}>
                    <button type="button" className={styles.qrWell} onClick={() => pickLogo(i)} aria-label={e.logo ? `Replace ${e.name || 'this entity'}'s logo` : `Add ${e.name || 'this entity'}'s logo`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {e.logo ? <img src={e.logo} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={20} weight={300} /> Logo</span>}
                    </button>
                    <span className={styles.cardHelp}>{e.logo ? 'Prints in place of the brand logo on quotes raised under this entity.' : 'Quotes raised under this entity print its logo where a template places the brand logo; without one, the brand kit\'s logo prints.'}</span>
                    {e.logo ? <Button appearance="text" variant="secondary" onPress={() => setEntity(i, { logo: null })}>Remove logo</Button> : null}
                  </div>
                </> : null}
                {/* (parity map, FB-103 — 1.0's Legal Entities: contact, branding, the bank's branch) More details, closed until asked for (open when
                    something is set): another entity's contacts and tagline (blank = the studio's), the accent its papers print in, a footer line,
                    the bank's branch code. The studio's own contacts and tagline are the Company details above. */}
                <EntityMore e={e} first={i === 0} open={!!moreOpen[e.id]} onToggle={() => setMoreOpen((o) => ({ ...o, [e.id]: !o[e.id] }))}
                            fallbackAccent={(i > 0 ? entities[0]?.accent : '') || brand.kit.colors.accent || null} errors={tried ? extraErrors(e) : {}} onChange={(patch) => setEntity(i, patch)} />
              </div>
            ))}
            {entities.length < 6 ? <span className={styles.markActions}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setDetails((d) => ({ ...d, entities: [...entities, EMPTY_ENTITY('', newId())] }))}>Add an entity</Button></span> : null}
          </section>
          </ReadOnlyScope> : null}
          {onAbout && about ? <ReadOnlyScope readOnly={!canRun}><AboutCard data={about} canRun={canRun} form={aboutForm} /></ReadOnlyScope> : null}   {/* (gaps build H, H-Q21) */}
        </div>
      </div>
    </CompanyShell>
  )
}

/** (parity map, FB-103) An issuing entity's More details — the house disclosure (New project's, the PO dialog's): a text button with its
    chevron, then the fields in the card's two columns. */
function EntityMore({ e, first, open, onToggle, fallbackAccent, errors, onChange }: {
  e: IssuingEntity; first: boolean; open: boolean; onToggle: () => void; /** the studio's colour, else the brand kit's accent */ fallbackAccent: string | null
  errors: { email?: string; phone?: string }; onChange: (patch: Partial<IssuingEntity>) => void
}) {
  const v = (x: string | undefined) => x ?? ''
  return (
    <div className={styles.more} data-testid="entity-more">
      <span className={styles.markActions}>
        <Button appearance="text" iconEnd={<Icon name={open ? 'keyboard_arrow_up' : 'expand_more'} size={20} />} onPress={onToggle} aria-expanded={open} data-testid="entity-more-toggle">More details</Button>
      </span>
      {open ? (
        <div className={styles.details} data-testid="entity-more-details">
          {first ? <p className={`${styles.cardHelp} ${styles.detailWide}`}>The studio’s contacts and tagline are its Company details, above.</p> : <>
            <div><TextField label="Contact email" value={v(e.email)} onChange={(x) => onChange({ email: x })} inputMode="email" maxLength={ENTITY_TEXT_MAX} error={errors.email} helper="Left blank, the studio’s prints" /></div>
            <div><TextField label="Contact phone" value={v(e.phone)} onChange={(x) => onChange({ phone: x })} inputMode="tel" maxLength={40} error={errors.phone} helper="Left blank, the studio’s prints" /></div>
            <div><TextField label="Website" value={v(e.website)} onChange={(x) => onChange({ website: x })} maxLength={ENTITY_TEXT_MAX} helper="Left blank, the studio’s prints" /></div>
            <div><TextField label="Tagline" value={v(e.tagline)} onChange={(x) => onChange({ tagline: x })} maxLength={ENTITY_TEXT_MAX} helper="Under its name on its invoices and receipts, and where its quotes print the tagline" /></div>   {/* (pending modules S11) its quotes print it too */}
          </>}
          <div><AccentField label="Accent colour" value={v(e.accent)} fallback={fallbackAccent} onChange={(h) => onChange({ accent: h })} testId="entity-accent"
                            helper={e.accent ? (first ? 'Its invoices, receipts and credit notes print in it' : 'Its quotes, invoices, receipts and credit notes print in it') : first ? 'Left blank, the brand kit’s accent prints' : 'Left blank, the studio’s colour prints'} /></div>   {/* (pending modules S11) another entity's quotes print in its accent; the studio's own quotes keep the brand kit's */}
          <div><TextField label="Bank branch code" value={v(e.branch)} onChange={(x) => onChange({ branch: x })} maxLength={20} helper="Printed with the bank details; the client can copy it on their page" /></div>
          <div className={styles.detailWide}><TextField label="Footer text" value={v(e.footer)} onChange={(x) => onChange({ footer: x })} maxLength={ENTITY_FOOTER_MAX} multiline={2} helper={first ? 'One line at the foot of its invoices, receipts and credit notes, and where its quotes print the footer line — its legal name and registration, a thank-you' : 'One line at the foot of its invoices, receipts and credit notes, and where its quotes print the footer line; left blank, the studio’s prints'} /></div>   {/* (pending modules S11) {studio_footer} */}
        </div>
      ) : null}
    </div>
  )
}

/**
 * (one-home N-07) Company › Profile › **Registrations & accreditations** — the studio's one record of them, on the card table (REG-727): the
 * Compliance Navigator's five, each with who recorded it and when, and a switch (Owners and Admins). It writes as it is pressed, with Undo
 * (the Navigator's Done used to); a refusal puts the switch back and says why. CaseTrust done = every signing page carries the deposit-
 * protection disclosure and its tick (it was Settings › Quotes & pricing's own switch, gaps build D item 6).
 */
function RegistrationsCard({ initial, canRun }: { initial: Record<string, RegistrationState>; canRun: boolean }) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [states, setStates] = useState(initial)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setStates(initial) }
  const [busy, setBusy] = useState<string | null>(null)
  const putBack = (id: string, was: RegistrationState | null) => setStates((x) => { const n = { ...x }; if (was) n[id] = was; else delete n[id]; return n })
  const mark = async (a: StudioAction, done: boolean) => {
    if (busy) return
    const was = states[a.id] ?? null
    setStates((x) => ({ ...x, [a.id]: { done, by: null, byName: 'You', at: Date.now() } }))
    setBusy(a.id)
    try {
      const r = await setStudioAction(a.id, done)
      if ('error' in r) { putBack(a.id, was); snackbar({ message: couldnt(done ? 'mark it done' : 'put it back to do', refusalOf(r.error)) }); return }
      const before: StudioActionState | null = r.before
      const message = a.id === CASETRUST_ID
        ? (done ? 'Signing pages now carry the CaseTrust disclosure and its tick' : 'Signing pages no longer carry the CaseTrust disclosure')
        : done ? `“${a.title}” marked done` : `“${a.title}” is to do again`
      snackbar({ key: 'registration', message, actionLabel: 'Undo', onAction: () => { void run('put it back', () => undoStudioAction(a.id, before), 'Put back as it was') } })
    } catch (e) { putBack(a.id, was); snackbar({ message: couldnt('save it', refusalOf(e)) }) }
    finally { setBusy(null) }
  }
  return (
    <section id="registrations" className={styles.card} aria-labelledby="profile-registrations" data-testid="registrations">
      <div className={styles.cardHead}>
        <h2 id="profile-registrations" className={styles.cardTitle}>Registrations &amp; accreditations</h2>
        <p className={styles.cardHelp}>{PROFILE_REGISTRATIONS_HELP.lead}<HelpLink href="/compliance">{PROFILE_REGISTRATIONS_HELP.link}</HelpLink>{PROFILE_REGISTRATIONS_HELP.end}</p>
      </div>
      <div className={styles.regTable} role="table" aria-label="Registrations and accreditations" data-card-table="">
        <div className={styles.regHead} role="row">
          <span role="columnheader">Registration</span><span role="columnheader">Recorded</span><span role="columnheader" className={styles.regCol}>Done</span>
        </div>
        {STUDIO_ACTIONS.map((a) => {
          const st = states[a.id]
          return (
            <div key={a.id} className={styles.regRow} role="row" data-testid="registration" data-id={a.id} data-done={st?.done ? '' : undefined}>
              <span role="cell" className={styles.regName}>
                <span>{a.title}</span>
                <span className={styles.regHelp}>{a.id === CASETRUST_ID ? CASETRUST_ROW_HELP : a.subtitle}</span>
              </span>
              <span role="cell" className={styles.regWho} data-label="Recorded">{st ? `${st.byName ? `${st.byName} · ` : ''}${displayDate(new Date(st.at))}` : '—'}</span>
              <span role="cell" className={styles.regCol} data-label="Done">
                <Switch size="sm" isSelected={!!st?.done} isDisabled={!canRun || busy === a.id} onChange={(v: boolean) => { void mark(a, v) }} aria-label={`${a.title}: done`} />
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
