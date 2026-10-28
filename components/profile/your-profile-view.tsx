'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from '@/components/company/company-shell'
import { LeaveGuard } from '@/components/company/leave-guard'
import { useHashLanding } from '@/components/company/use-hash-landing'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { InfoTip } from '@/components/om/info-tip'   // (calm-build regression fix F) the details card's where-you-show line, off the page
import { detailsHelp } from '@/lib/company/member-words'   // (S42 audit A-15) each role's own words
import { setMyAccepting } from '@/app/company/members-actions'   // (the calm UI build 2026-10-27 — the audit's 1-39) Take new leads, here
import { MemberDetailsFields, detailsErrors, draftChanged, draftOf, hasErrors, type DetailsDraft } from '@/components/company/member-details-fields'
import type { PhotoDraft } from '@/components/company/member-photo-field'
import { SignatureBox, SignatureSettings, type SignatureDraft } from '@/components/quotes/editor/signature/signature-section'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { removeMemberSignature, saveMemberSignature, setSignatureConsent } from '@/app/quotes/signature-actions'
import { CONSENT_HELP, CONSENT_LABEL } from '@/lib/quotes/signature'
import { saveMyDetails, sendMyContactCode } from '@/app/company/members-actions'
import { ConfirmContactDialog } from './confirm-contact-dialog'   // (pending modules S30)
import { SIGN_IN, keyToConfirm } from '@/lib/auth/model'
import { companySectionOf } from '@/lib/company/sections'
import { fromLabel, withFrom } from '@/lib/nav'
import type { SignatureKind } from '@/lib/quotes/signature'
import type { YourProfile } from '@/lib/company/your-profile'
import { YourProfileGhost, MEMBERS_LINK_HELP, PAYNOW_HELP, PUBLIC_LINK_HELP, SIGNATURE_HELP, TAKE_LEADS } from './your-profile-ghost'
import { PayNowDialog } from '@/components/company/paynow-dialog'   // (pending modules S14)
import { payNowShown } from '@/lib/finance/model'
import { YourNotifications } from './your-notifications'   // (pending modules S18)
import { mutedLine, summaryLine } from '@/lib/notifications/personal'
import profile from '@/components/company/profile-view.module.css'
import styles from './your-profile.module.css'

/** "an Owner" · "a Designer" · "in Accounting" (the Members page's words for the role) */
const asRole = (role: string) => (role === 'Accounting' || role === 'Marketing' ? `in ${role}` : `${/^[AEIOU]/.test(role) ? 'an' : 'a'} ${role}`)

/**
 * (pending modules S01 — his "build all of them" 2026-10-11; 1.0's Settings › Your Profile, My Signature) **Your profile**: the signed-in
 * member's own name, email, phone and photo — each checked as Add member checks it, and (1.0) never another member's — and their signature as
 * its own card, so a new designer sets it up without opening a quote. Company › Profile's shape: the L1 header's Discard · Save changes, the
 * house cards, the leave guard. The rail's studio block and the phone's avatar open it (View as's menu); ⌘K finds it. An Owner or an Admin
 * changes anyone else's details on Company › Members.
 */
export function YourProfileView({ data, from, accepting: acceptingIn }: { data: YourProfile; from?: string
  /** (the calm UI build 2026-10-27 — the audit's 1-39, additive) whether you take new leads — the switch itself sits on this page now (it left the
      studio block's menu and the phone's You sheet); omitted, the card isn't drawn */
  accepting?: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  /* (1-39) your own Take new leads — the record Company › Members' switch writes (REG-612): at once on the press, put back if the save is
     refused, with Undo (the studio block's menu's own behaviour, moved) */
  const [, startTransition] = useTransition()
  const [acceptSeen, setAcceptSeen] = useState(acceptingIn)
  const [accepting, setAccepting] = useState(acceptingIn ?? true)
  if (acceptingIn !== acceptSeen) { setAcceptSeen(acceptingIn); setAccepting(acceptingIn ?? true) }
  const applyAccepting = (next: boolean, undoable: boolean) => {
    setAccepting(next)
    startTransition(async () => {
      let r: Awaited<ReturnType<typeof setMyAccepting>>
      try { r = await setMyAccepting(next) } catch (e) { setAccepting(!next); snackbar({ key: 'you-accepting', message: couldnt('change whether you take new leads', refusalOf(e)) }); return }
      if ('error' in r) { setAccepting(!next); snackbar({ key: 'you-accepting', message: couldnt('change whether you take new leads', refusalOf(r.error)) }); return }
      router.refresh()
      const before = r.before
      snackbar({ key: 'you-accepting', message: next ? 'You’re open to new leads' : 'You’re closed to new leads', ...(undoable ? { actionLabel: 'Undo', onAction: () => applyAccepting(before, false) } : {}) })
    })
  }
  useHashLanding()   // ⌘K's Your signature lands on #signature
  const me = data.me
  const [seed, setSeed] = useState(data)
  const [draft, setDraft] = useState<DetailsDraft>(() => draftOf(me))
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sig, setSig] = useState(data.signature)
  /* (pending modules S03 — 1.0's "Auto-apply on approval … Revocable anytime") on the documents they prepare, or not */
  const [consent, setConsent] = useState(data.consent)
  const [consentBusy, setConsentBusy] = useState(false)
  const toggleConsent = async (on: boolean) => {
    const was = consent
    setConsent(on ? 'yes' : 'no'); setConsentBusy(true)   // at once — put back when the server refuses
    try { await setSignatureConsent(on); snackbar({ message: on ? 'Your signature goes on the quotes and contracts you prepare' : 'Your signature stays off your documents — their studio signature box prints blank' }); router.refresh() }
    catch { setConsent(was); snackbar({ message: couldnt('change it') }) }
    finally { setConsentBusy(false) }
  }
  /* (pending modules S14) Your PayNow — shown at once after a save or its Undo, then the page's records follow */
  const [paynow, setPaynow] = useState(data.paynow)
  const [payNowOpen, setPayNowOpen] = useState(false)
  /* a photo just saved shows until the page's records bring it back (no flash of the old one) */
  const [landed, setLanded] = useState<PhotoDraft>(undefined)
  /* the page's records after a save or a View as: the form starts from them again (render-phase adjust) */
  if (data !== seed) { setSeed(data); setSig(data.signature); setPaynow(data.paynow); setConsent(data.consent); setLanded(undefined); if (!draftChanged(draft, seed.me) || seed.me.id !== me.id) { setDraft(draftOf(me)); setTried(false) } }
  const dirty = draftChanged(draft, me)
  const shown: DetailsDraft = draft.photo === undefined && landed !== undefined ? { ...draft, photo: landed } : draft
  const edit = (d: DetailsDraft) => setDraft(landed !== undefined && d.photo === landed ? { ...d, photo: undefined } : d)

  /* (pending modules S30 — S01's note) a save that adds the number (or the email) you sign in with asks for the code sent to it first */
  const [confirming, setConfirming] = useState<{ to: string; kind: 'phone' | 'email'; at: number } | null>(null)
  const askCode = async (): Promise<boolean> => {
    const r = await sendMyContactCode({ name: draft.name, email: draft.email, phone: draft.phone })
    if ('error' in r) { snackbar({ message: couldnt('save your details', refusalOf(r.error)) }); return false }   // the same rules the save keeps
    if ('none' in r) return true
    setConfirming({ to: r.to, kind: keyToConfirm(me, { phone: draft.phone, email: draft.email })?.kind ?? 'phone', at: Date.now() })
    return false
  }
  /** Saves the form — with the code when it confirms a new sign-in key. Answers the refusal (null = saved). */
  const commit = async (code?: string): Promise<string | null> => {
    const r = await saveMyDetails({ name: draft.name, email: draft.email, phone: draft.phone, ...(draft.photo !== undefined ? { photo: draft.photo } : {}), ...(code ? { code } : {}) })
    if ('error' in r) return r.error
    if (draft.photo !== undefined) setLanded(draft.photo)
    setDraft(draftOf({ name: r.after.name, email: r.after.email, phone: r.after.phone })); setTried(false)
    snackbar({ message: 'Your details are saved' })
    router.refresh()
    return null
  }
  const save = async (): Promise<boolean> => {
    if (hasErrors(detailsErrors(draft))) { setTried(true); return false }
    setBusy(true)
    try {
      if (keyToConfirm(me, { phone: draft.phone, email: draft.email }) && !(await askCode())) return false   // the code's dialog saves
      const refused = await commit()
      if (refused) { snackbar({ message: couldnt('save your details', refusalOf(refused)) }); return false }   // the form keeps what was typed
      return true
    } catch { snackbar({ message: couldnt('save your details') }); return false }
    finally { setBusy(false) }
  }
  const confirmCode = async (code: string): Promise<string | null> => {
    try {
      const refused = await commit(code)
      if (!refused) setConfirming(null)
      return refused
    } catch { return couldnt('save your details') }
  }
  const discard = () => { setDraft(draftOf(me)); setTried(false) }

  /* Your signature — Signature Settings (the quote editor's own dialog and save); Remove answers with Undo */
  const [signing, setSigning] = useState<SignatureDraft | null>(null)
  const [sigBusy, setSigBusy] = useState(false)
  const openSigning = (kind: SignatureKind) => setSigning({ kind, name: sig?.name || me.name, data: sig && sig.kind === kind && sig.data ? sig.data : '' })
  const saveSignature = async () => {
    const v = signing
    if (!v || !v.name.trim() || (v.kind !== 'type' && !v.data)) return
    setSigBusy(true)
    try {
      const r = await saveMemberSignature({ kind: v.kind, name: v.name.trim(), data: v.kind === 'type' ? null : v.data })
      if ('error' in r) { snackbar({ message: couldnt('save the signature', r.error) }); return }   // the dialog stays with the picture
      setSig(r); setSigning(null); if (!consent) setConsent('yes')   // (pending modules S03) the save answered it
      snackbar({ message: consent === 'no' ? 'Signature saved — it stays off your documents until you turn it on' : 'Signature saved — it prints on the quotes and contracts you prepare' })
      router.refresh()
    } catch { snackbar({ message: couldnt('save the signature') }) }   // the dialog stays with what was drawn or typed
    finally { setSigBusy(false) }
  }
  const removeSignature = async () => {
    const was = sig
    if (!was) return
    setSig(null)   // at once — put back when the server refuses
    try {
      const r = await removeMemberSignature()
      router.refresh()
      const back = r.previous ?? was
      snackbar({ message: 'Signature removed — your quotes print without it', actionLabel: 'Undo', onAction: () => {
        void saveMemberSignature({ kind: back.kind, name: back.name, data: back.kind === 'type' ? null : back.data }).then((u) => {
          if ('error' in u) { snackbar({ message: couldnt('put the signature back', u.error) }); return }
          setSig(u); router.refresh()
        }, () => snackbar({ message: couldnt('put the signature back') }))
      } })
    } catch { setSig(was); snackbar({ message: couldnt('remove the signature') }) }
  }

  const origin = from ? companySectionOf(from) ?? fromLabel(from) ?? 'Back' : undefined
  /* (pending modules S18) the reveal's ghost draws Your notifications as the records have it */
  const [shownAt] = useState(() => Date.now())
  const n = data.notices, hasEmail = !!me.email?.trim()
  const ghostNotices = { mode: n.email, noEmail: !hasEmail, summary: n.email === 'daily' && hasEmail ? summaryLine(n.lastSummary, shownAt) : null, read: !!n.lastSummary, muted: mutedLine(n.events.filter((e) => n.muted.includes(e.key)).map((e) => e.label)) }
  return (
    <CompanyShell title="Your profile" from={from} crumb="" origin={origin} skeleton={<YourProfileGhost notices={ghostNotices} />} actions={<>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy} data-testid="profile-save">{busy ? 'Saving…' : 'Save changes'}</Button>
    </>}>
      <LeaveGuard dirty={dirty} what="your details" onSave={save} onDiscard={discard} />
      <div className={profile.layout} data-testid="your-profile">
        <div className={profile.form}>
          <section id="details" className={profile.card} aria-labelledby="you-details">
            {/* (the calm UI build 2026-10-27 — the audit's 1-29, T-05 · W-065) the title and your role as a chip beside it — the card's two-line
                help and the role's sentence went; who sets roles is the chip's tooltip */}
            <div className={profile.cardHead}>
              <span className={styles.titleRow}>
                <h2 id="you-details" className={profile.cardTitle}>Your details</h2>
                <Tooltip label={`You’re ${asRole(me.role)} at ${data.studio}. ${data.opensMembers ? 'An Owner or an Admin sets roles on Company › Members.' : 'An Owner or an Admin sets roles.'}`}>
                  <span tabIndex={0} className={styles.roleChip} data-testid="profile-role" aria-label={`You’re ${asRole(me.role)} at ${data.studio}`}><MetaChip kind="fact">{me.role}</MetaChip></span>
                </Tooltip>
                {/* (calm-build regression fix F — T-05: an explanation goes off the page, never away) where your name and photo show — clients
                    included — was the card's help line (1-29 dropped it); it is said nowhere else on the page, so it is the house info tip's */}
                <InfoTip text={detailsHelp(data.signs, me.role === 'Marketing')} label="Where your name and photo show" testId="profile-details-help" />
              </span>
            </div>
            <MemberDetailsFields member={me} draft={shown} onChange={edit} tried={tried} own onLeads={data.signs} marketing={me.role === 'Marketing'} layout="page" />
          </section>
          {/* (pending modules S01 — 1.0's My Signature card; contracts Q-30 "later") a new designer sets it up here, before any quote */}
          {data.signs ? (
            <section id="signature" className={profile.card} aria-labelledby="you-signature" data-testid="profile-signature">
              <div className={profile.cardHead}>
                <h2 id="you-signature" className={profile.cardTitle}>Your signature</h2>
                <p className={profile.cardHelp}>{SIGNATURE_HELP}</p>   {/* (1-29, W-032) */}
              </div>
              <div className={styles.signature}><SignatureBox sig={sig} onChoose={openSigning} /></div>
              {sig ? (
                <span className={profile.markActions}>
                  <Button appearance="text" iconStart={<Icon name="edit" size={20} />} onPress={() => openSigning(sig.kind)} data-testid="signature-change">Change</Button>
                  <Button appearance="text" variant="secondary" iconStart={<Icon name="delete" size={20} />} onPress={() => { void removeSignature() }} data-testid="signature-remove">Remove</Button>
                </span>
              ) : null}
              {/* (pending modules S03) consent before a member's signature is stamped on a document — one switch, the house sm */}
              {sig ? (
                <label className={styles.consentRow} data-testid="signature-consent">
                  <span className={styles.consentText}><span className={styles.consentLabel}>{CONSENT_LABEL}</span><span className={profile.cardHelp}>{CONSENT_HELP}</span></span>
                  <Switch size="sm" isSelected={consent === 'yes'} isDisabled={consentBusy} onChange={(v: boolean) => { void toggleConsent(v) }} aria-label={CONSENT_LABEL} />
                </label>
              ) : null}
            </section>
          ) : null}
          {/* (pending modules S14 — the steps' note after S01: "Accounting can't set their own PayNow … add 'Your PayNow' to Your profile for every
              member, kept on the same record Members writes") — the dialog Members opens (PayNowDialog), the same rule and Undo */}
          <section id="paynow" className={profile.card} aria-labelledby="you-paynow" data-testid="profile-paynow">
            <div className={profile.cardHead}>
              <h2 id="you-paynow" className={profile.cardTitle}>Your PayNow</h2>
              <p className={profile.cardHelp}>{PAYNOW_HELP}</p>
            </div>
            <span className={styles.paynow}>
              <span className={styles.paynowValue} data-empty={paynow ? undefined : ''} data-testid="profile-paynow-value">{paynow ? payNowShown(paynow) : 'Not set yet'}</span>
              <Button appearance="text" iconStart={<Icon name={paynow ? 'edit' : 'add'} size={20} />} onPress={() => setPayNowOpen(true)} data-testid="profile-paynow-edit">{paynow ? 'Change' : 'Add PayNow'}</Button>
            </span>
          </section>
          {/* (pending modules S18 — Leads Q-42 · Q-43) what reaches you and how: a daily summary, a personal mute — every member's own */}
          <YourNotifications data={data.notices} hasEmail={!!me.email?.trim()} />
          {/* (pending modules S27 — api:designer-portfolio-profiles) what clients read about you — your card and your work — is its own page */}
          {data.signs ? (
            <Link id="public" href={withFrom(`/company/members/${me.id}/profile`, '/profile')} className={profile.kitLink} data-testid="profile-public-link">
              <span className={profile.kitLinkIcon}><Icon name="badge" size={24} weight={300} /></span>
              <span className={profile.kitLinkText}><span className={profile.kitLinkTitle}>Your public profile</span><span className={profile.cardHelp}>{PUBLIC_LINK_HELP}</span></span>
              <Icon name="chevron_right" size={24} weight={300} />
            </Link>
          ) : null}
          {/* (the calm UI build 2026-10-27 — the audit's 1-39) New leads: the switch itself — one home for your own Take new leads (it left the studio
              block's menu and the phone's You sheet; an Owner or an Admin still sets it on your row in Members) — then the way to your lead
              preferences, which stay on that row */}
          {data.signs && acceptingIn !== undefined ? (
            <section id="new-leads" className={profile.card} aria-labelledby="you-new-leads" data-testid="profile-new-leads">
              <div className={profile.cardHead}><h2 id="you-new-leads" className={profile.cardTitle}>{TAKE_LEADS.title}</h2></div>
              <label className={styles.consentRow} data-testid="you-accepting">
                <span className={styles.consentText}><span className={styles.consentLabel}>{TAKE_LEADS.label}</span><span className={profile.cardHelp} id="you-accepting-help">{TAKE_LEADS.help}</span></span>
                <Switch size="sm" isSelected={accepting} onChange={(v: boolean) => applyAccepting(v, true)} aria-label={TAKE_LEADS.label} aria-describedby="you-accepting-help" />
              </label>
              {data.opensMembers ? (
                <Link href={withFrom('/company/members', '/profile')} className={profile.kitLink} data-testid="profile-members-link">
                  <span className={profile.kitLinkIcon}><Icon name="group" size={24} weight={300} /></span>
                  <span className={profile.kitLinkText}><span className={profile.kitLinkTitle}>Lead preferences</span><span className={profile.cardHelp}>{MEMBERS_LINK_HELP}</span></span>
                  <Icon name="chevron_right" size={24} weight={300} />
                </Link>
              ) : null}
            </section>
          ) : data.signs && data.opensMembers ? (
            <Link href={withFrom('/company/members', '/profile')} className={profile.kitLink} data-testid="profile-members-link">
              <span className={profile.kitLinkIcon}><Icon name="group" size={24} weight={300} /></span>
              <span className={profile.kitLinkText}><span className={profile.kitLinkTitle}>Lead preferences</span><span className={profile.cardHelp}>{MEMBERS_LINK_HELP}</span></span>
              <Icon name="chevron_right" size={24} weight={300} />
            </Link>
          ) : null}
        </div>
      </div>
      <SignatureSettings open={!!signing} value={signing} busy={sigBusy} onChange={setSigning} onClose={() => setSigning(null)} onSave={() => { void saveSignature() }} consent={consent} />
      <PayNowDialog owner={payNowOpen ? { id: me.id, name: me.name, isYou: true, paynow } : null} onClose={() => setPayNowOpen(false)} onSaved={setPaynow} />
      <ConfirmContactDialog sent={confirming} demo={data.signInStandIn} onClose={() => setConfirming(null)} onConfirm={confirmCode} onResend={async () => { try { await askCode() } catch { snackbar({ message: SIGN_IN.couldntSend }) } }} />
    </CompanyShell>
  )
}
