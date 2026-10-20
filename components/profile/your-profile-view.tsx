'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from '@/components/company/company-shell'
import { LeaveGuard } from '@/components/company/leave-guard'
import { useHashLanding } from '@/components/company/use-hash-landing'
import { detailsHelp } from '@/lib/company/member-words'
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
import { YourProfileGhost, MEMBERS_LINK_HELP, PAYNOW_HELP, PUBLIC_LINK_HELP } from './your-profile-ghost'
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
export function YourProfileView({ data, from }: { data: YourProfile; from?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
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
            <div className={profile.cardHead}>
              <h2 id="you-details" className={profile.cardTitle}>Your details</h2>
              <p className={profile.cardHelp}>{detailsHelp(data.signs, me.role === 'Marketing')}</p>   {/* (S42 audit A-15) Accounting's own words */}
            </div>
            <MemberDetailsFields member={me} draft={shown} onChange={edit} tried={tried} own onLeads={data.signs} marketing={me.role === 'Marketing'} layout="page" />
            <p className={styles.role} data-testid="profile-role">You’re {asRole(me.role)} at {data.studio}. {data.opensMembers ? 'An Owner or an Admin sets roles on Company › Members.' : 'An Owner or an Admin sets roles.'}</p>
          </section>
          {/* (pending modules S01 — 1.0's My Signature card; contracts Q-30 "later") a new designer sets it up here, before any quote */}
          {data.signs ? (
            <section id="signature" className={profile.card} aria-labelledby="you-signature" data-testid="profile-signature">
              <div className={profile.cardHead}>
                <h2 id="you-signature" className={profile.cardTitle}>Your signature</h2>
                <p className={profile.cardHelp}>It prints on the quotes and contracts you prepare, once you allow it. Draw it, type your name in the signature face, or upload a picture of it.</p>
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
          {/* Open to new leads and the lead preferences stay where an Owner or an Admin sets them too — the member's row on Members */}
          {data.signs && data.opensMembers ? (
            <Link href={withFrom('/company/members', '/profile')} className={profile.kitLink} data-testid="profile-members-link">
              <span className={profile.kitLinkIcon}><Icon name="group" size={24} weight={300} /></span>
              <span className={profile.kitLinkText}><span className={profile.kitLinkTitle}>New leads and preferences</span><span className={profile.cardHelp}>{MEMBERS_LINK_HELP}</span></span>
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
