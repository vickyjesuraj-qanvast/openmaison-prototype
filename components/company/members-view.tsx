'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { readInviteParams } from '@/lib/leads/task-links'   // (parity map, TD-019)
import { Avatar } from '@/components/om/avatar'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from './company-shell'
import { MembersGhost } from './company-ghosts'
import { ROLES, isRole, type Role } from '@/lib/leads/enums'
import { onLeads } from '@/lib/settings/roles'   // (parity map, FB-114)
import { runsStudio } from '@/lib/leads/assign-policy'
import { addBlock, deactivateBlock, detailsBlock, reactivateBlock, roleChangeBlock } from '@/lib/company/member-rules'
import { displayDate, isSgPhone, phoneDigits, phoneTyped, titleCaseName } from '@/lib/format'
import type { MembersData, MemberRow } from '@/lib/company/members'
import { addMember, cancelMemberInvitation, deactivateMember, inviteMemberAgain, reactivateMember, saveMemberDetails, sendMemberInvitation, setMemberAccepting, setMemberCapacity, setMemberManager, setMemberPreferences, setMemberRole, type Released } from '@/app/company/members-actions'
import { INVITE_DAYS, channelWords, channelsFor, inviteLine, inviteStateOf, joinPath, waitingOn, type InviteState } from '@/lib/company/invitations'   // (pending modules S09)
import { copyText } from '@/lib/clipboard'
import { openPlans, openSeats, useCredits } from '@/components/credits/credits-client'
import { planRow } from '@/lib/credits/plans'
import { opensWorkspace } from '@/lib/settings/roles'
import { MemberDetailsFields, detailsErrors, draftChanged, draftOf, hasErrors, type DetailsDraft } from './member-details-fields'   // (pending modules S01)
import { withFrom } from '@/lib/nav'
import { payNowShown } from '@/lib/finance/model'   // (simplify round 2)
import { PayNowDialog } from './paynow-dialog'   // (pending modules S14) one dialog, two doors
import { VISIBILITY_HREF } from '@/lib/settings/types'   // (pending modules S14) Who sees leads' one home
import { CAPACITY_MAX, CAPACITY_MIN, clampCapacity, setsCapacity } from '@/lib/projects/workload'   // (one-home N-17)
import { ReadOnlyNote } from './read-only-note'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { Button, Switch } from '@/components/ds'
import { PreferencesDialog } from './preferences-dialog'
import { HelpLink } from './help-link'
import { SignatureSettings, type SignatureDraft } from '@/components/quotes/editor/signature/signature-section'
import { saveMemberSignature } from '@/app/quotes/signature-actions'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { parsePreferences, summarisePreferences, type LeadPreferences } from '@/lib/company/preferences'
import { MEMBERS_HELP, MEMBERS_READ_ONLY } from '@/lib/company/copy'   // (pending modules S17) the words the ghost reads too
import { landlineOnlyKey } from '@/lib/auth/model'   // (S44O — row 344) a member's only sign-in key is a mobile
import styles from './members-view.module.css'

const NOBODY = 'Nobody'
/* (one-home N-17) A member's project capacity, as Settings › Projects › Workload counts it: 1 to 20, or the studio's default. */
const CAPACITY_COUNTS = Array.from({ length: CAPACITY_MAX - CAPACITY_MIN + 1 }, (_, i) => `${i + CAPACITY_MIN} ${i + CAPACITY_MIN === 1 ? 'project' : 'projects'}`)
const listNames = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

/**
 * Company › Members (REG-601, no mock — Profile's card shell on the DS): one row per member — avatar, name and email, the Role
 * select (Owner · Admin · Manager · Designer), "Reports to" for a Designer (one of the Managers), the leads they hold. Owners
 * and Admins change roles and reporting lines; everyone else reads. The last Owner cannot be demoted. What a Manager may
 * assign and who sees which leads follow from here (Settings › Leads › Who sees leads).
 */
export function MembersView({ data, from }: { data: MembersData; from?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<MemberRow[]>(data.members)
  /* (sweep S4 #1) the server's answer is the list: Add member, Deactivate and Reactivate show their result as the page refreshes */
  const [seed, setSeed] = useState(data.members)
  if (data.members !== seed) { setSeed(data.members); setRows(data.members) }
  const canEdit = runsStudio(data.viewer.role)
  /* (REG-612, parity Q-27) Open to new leads + preferences: Owners and Admins for anyone, a member for themself. */
  const [prefsFor, setPrefsFor] = useState<MemberRow | null>(null)
  /* (pending modules S27 — api:designer-portfolio-profiles) a member's public card — the About page's entry (gaps build H) with their years and
     their work — is one page of its own, their Public profile: Owners and Admins open anyone's, a member their own */
  const openProfile = (m: MemberRow) => router.push(withFrom(`/company/members/${m.id}/profile`, '/company/members'))
  const mayPrefs = (m: MemberRow) => canEdit || m.isYou
  const toggleAccepting = async (m: MemberRow, on: boolean) => {
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, acceptingLeads: on } : x)))
    try { await setMemberAccepting(m.id, on); snackbar({ message: on ? `${m.name} is open to new leads` : `${m.name} is closed to new leads` }); router.refresh() }
    catch { setRows(prev); snackbar({ message: `Couldn’t change whether ${m.name} takes new leads — please try again` }) }
  }
  const savePrefs = async (prefs: LeadPreferences, specialty: string) => {
    const m = prefsFor; if (!m) return
    const cleared = Object.keys(prefs).length === 0 && !specialty.trim()
    setPrefsFor(null)
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, leadPreferences: Object.keys(prefs).length ? JSON.stringify(prefs) : null, specialty: specialty.trim() || null } : x)))
    try { await setMemberPreferences(m.id, { preferences: prefs, specialty }); snackbar({ message: cleared ? 'Lead preferences cleared' : 'Lead preferences saved' }); router.refresh() }
    catch { setRows(prev); snackbar({ message: 'Couldn’t save the preferences — please try again' }) }
  }
  const active = rows.filter((m) => m.isActive)
  const inactive = rows.filter((m) => !m.isActive)
  const managers = active.filter((m) => m.role === 'Manager')
  const activeOwners = active.filter((m) => m.role === 'Owner').length
  const viewer = data.viewer
  /* (REG-646, settings parity Q-06) The Owner rules: an Admin never offers Owner; a row the viewer may not change says why. */
  const roleOptions = viewer.role === 'Owner' ? [...ROLES] : ROLES.filter((r) => r !== 'Owner')
  /* (Dane UAT 2.11) An Owner's own row says how ownership passes — the rule is unchanged: another member is made an Owner first, then they
     change this one's role. Every other refusal keeps the rule's own words. */
  const OWN_OWNER = 'You’re the studio’s Owner — make another member an Owner, then they can change your role.'
  const roleBlock = (m: MemberRow) => (canEdit ? (m.id === viewer.id && viewer.role === 'Owner' ? OWN_OWNER : null) ?? roleChangeBlock(viewer, m, m.role as Role, activeOwners) ?? (m.role === 'Owner' && viewer.role !== 'Owner' ? 'Only an Owner makes or unmakes an Owner' : null) : 'Only Owners and Admins set roles')
  const changeRole = async (m: MemberRow, role: string) => {
    if (!isRole(role) || role === m.role) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, role, managerId: role === 'Designer' ? x.managerId : null, reportsTo: role === 'Designer' ? x.reportsTo : null } : x.managerId === m.id && role !== 'Manager' ? { ...x, managerId: null, reportsTo: null } : x)))
    try {
      const r = await setMemberRole(m.id, role as Role)
      if ('error' in r) { setRows(prev); snackbar({ message: r.error }); return }
      snackbar({ message: role === 'Accounting' || role === 'Marketing' ? `${m.name} is now in ${role}` : `${m.name} is now ${role === 'Owner' || role === 'Admin' ? 'an' : 'a'} ${role}` }); router.refresh()   // (parity map, FB-114) invented copy · (S44O — C6) in Marketing
    } catch { setRows(prev); snackbar({ message: 'Couldn’t change the role — please try again' }) }
  }
  /* Add member — name, phone, email, role; the rules decide the roles offered. */
  const [adding, setAdding] = useState<{ name: string; phone: string; email: string; role: Role; managerId: string | null; tried: boolean } | null>(null)
  /* (parity map, TD-019 — 1.0's Member Invite task) An ask to add someone outside the studio (the bell's `invite_requested`, the Owners' task)
     lands here with `?add=<name>&phone=<8 digits>`: Add member opens filled in, for whoever may add members, once the page shows; the
     address drops the ask so a refresh doesn't open it again. */
  const params = useSearchParams()
  /* (S42 audit A-08) ⌘K's Create › Add a member lands with `?new=1`: Add member opens empty, the same way */
  const [landing] = useState(() => (canEdit ? readInviteParams(params) ?? (params.get('new') === '1' ? { name: '', phone: '' } : null) : null))
  useEffect(() => {
    if (!landing) return
    try { const u = new URL(window.location.href); u.searchParams.delete('add'); u.searchParams.delete('phone'); u.searchParams.delete('new'); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
    const t = window.setTimeout(() => setAdding({ name: landing.name, phone: landing.phone, email: '', role: 'Designer', managerId: null, tried: false }), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landing])
  /* (UX audit S6) The member just added: their row comes into view and pulses once (REG-575's attention look), and the snackbar's action
     opens their Reports to — the next step a Designer needs. */
  const [fresh, setFresh] = useState<string | null>(() => { const o = params.get('open'); return o === 'me' ? data.members.find((x) => x.isYou)?.id ?? null : o })   // (pending modules S09) the bell's "joined the studio" lands on their row · (S42 audit A-08) ⌘K's "Open to new leads" lands on your own (`me`)
  useEffect(() => {
    if (!params.get('open')) return
    try { const u = new URL(window.location.href); u.searchParams.delete('open'); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
  }, [params])
  /* (pending modules S40 — api:designer-portfolio-profiles) A member's Public profile opens their lead preferences here (`?prefs=<id>`): their
     specialty is what clients read as Known for. The dialog opens once the page shows, for whoever may set them (Owners and Admins for anyone,
     a member for themself — REG-612), and the address drops the ask so a refresh doesn't open it again; Back returns to the profile. */
  const [prefsLanding] = useState(() => { const id = params.get('prefs'); const m = id ? data.members.find((x) => x.id === id) : undefined; return m && (canEdit || m.isYou) && onLeads(m.role) && m.isActive ? m : null })
  useEffect(() => {
    if (!params.get('prefs')) return
    try { const u = new URL(window.location.href); u.searchParams.delete('prefs'); window.history.replaceState(window.history.state, '', u.toString()) } catch { /* the address is a convenience */ }
  }, [params])
  useEffect(() => {
    if (!prefsLanding) return
    const t = window.setTimeout(() => setPrefsFor(prefsLanding), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [prefsLanding])
  useEffect(() => {
    if (!fresh || !rows.some((m) => m.id === fresh)) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.querySelector(`[data-member-id="${CSS.escape(fresh)}"]`)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    const t = window.setTimeout(() => setFresh(null), 1600)
    return () => window.clearTimeout(t)
  }, [fresh, rows])
  const openReportsTo = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-reports-to="${CSS.escape(id)}"] [role="combobox"]`)
    if (!el) return
    /* the select's menu closes on a scroll (PortalMenu) — bring the row into view first, then open its list once the page has settled,
       the keyboard's way (the field opens on ↓ as it does on a press) */
    const r = el.getBoundingClientRect(), away = r.top < 0 || r.bottom > window.innerHeight
    if (away) el.scrollIntoView({ block: 'center' })
    el.focus({ preventScroll: true })
    window.setTimeout(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })), away ? 300 : 0)
  }
  const [busy, setBusy] = useState(false)
  /* (sweep S4 #23) the house messages (lib/forms.ts) — the lead form's words for a name, a phone and an email */
  const addErrors = adding ? {
    name: adding.name.trim() ? undefined : MSG.required,
    phone: adding.phone && !isSgPhone(phoneDigits(adding.phone)) ? MSG.phone : landlineOnlyKey(adding) ?? undefined,   // (S44O — row 344) their only sign-in key is a mobile
    email: adding.email && !EMAIL_RE.test(adding.email.trim()) ? MSG.email : undefined,
  } : {}
  const submitAdd = async () => {
    if (!adding || busy) return
    if (addErrors.name || addErrors.phone || addErrors.email) { setAdding({ ...adding, tried: true }); return }
    setBusy(true)
    try {
      const designer = adding.role === 'Designer'
      const mgr = designer && adding.managerId ? managers.find((x) => x.id === adding.managerId) ?? null : null
      const r = await addMember({ name: adding.name, phone: adding.phone, email: adding.email, role: adding.role, managerId: mgr?.id ?? null })
      if ('error' in r) { snackbar({ message: r.error }); return }
      const name = titleCaseName(adding.name), id = r.id ?? null   // (Dane UAT 2.07) as the server saved it
      setAdding(null); if (id) setFresh(id); router.refresh()
      const added = adding.role === 'Accounting' || adding.role === 'Marketing' ? `${name} added in ${adding.role}` : `${name} added as ${adding.role === 'Owner' || adding.role === 'Admin' ? 'an' : 'a'} ${adding.role}`   // (pending modules S09, a bug fix) it read “added as a Accounting”
      /* (pending modules S09) and invited — the snackbar says how it went; the row keeps saying it until they come in */
      const via = r.invited?.length ? ` — invitation sent by ${channelWords(r.invited)}` : r.invited ? ' — invitation not sent: no mobile or email' : ''
      /* (UX audit S6) the next step rides the snackbar: a Designer who reports to nobody yet is one press from their Reports to */
      snackbar(mgr ? { message: `${added}, reporting to ${mgr.name}${via}` }
        : designer && id && managers.length ? { message: `${name} added${r.invited?.length ? ' and invited' : ''}`, actionLabel: 'Set who they report to', onAction: () => openReportsTo(id) }   // the role is the dialog's; the line keeps to the 344 bar
        : { message: `${added}${via}` })
    } catch { snackbar({ message: 'Couldn’t add the member — please try again' }) } finally { setBusy(false) }
  }
  /* Deactivate — the member's open work named first; Undo brings them straight back. */
  const [leaving, setLeaving] = useState<MemberRow | null>(null)
  const reactivate = async (m: MemberRow, undo?: Released) => {
    try {
      const r = await reactivateMember(m.id, undo)
      if ('error' in r) { snackbar({ message: r.error }); return }
      snackbar({ message: undo ? `${m.name} is back` : `${m.name} reactivated — back in every picker` }); router.refresh()
    } catch { snackbar({ message: `Couldn’t reactivate ${m.name} — please try again` }) }
  }
  const deactivate = async () => {
    const m = leaving; if (!m) return
    setLeaving(null)
    try {
      const r = await deactivateMember(m.id)
      if ('error' in r) { snackbar({ message: r.error }); return }
      snackbar({ message: `${m.name} deactivated`, actionLabel: 'Undo', onAction: () => { void reactivate(m, r.released) } }); router.refresh()
    } catch { snackbar({ message: `Couldn’t deactivate ${m.name} — please try again` }) }
  }
  const leaveMessage = (m: MemberRow) => {
    const work = [m.openLeads ? `${m.openLeads} open ${m.openLeads === 1 ? 'lead' : 'leads'}` : '', m.openQuotes ? `${m.openQuotes} ${m.openQuotes === 1 ? 'quote' : 'quotes'} in progress` : ''].filter(Boolean).join(' and ')
    const one = m.openLeads + m.openQuotes === 1
    /* (sweep S4 #6) what the deactivation lets go is named before it is confirmed — their team, the backup approver's seat */
    const team = m.role === 'Manager' ? active.filter((x) => x.managerId === m.id).map((x) => x.name) : []
    const lets = [team.length ? `${listNames(team)} will report to nobody` : '', data.backupApproverId === m.id ? 'they stop being the backup approver for quotes' : ''].filter(Boolean).join(', and ')
    return `${m.name} leaves every picker and stops getting new leads. ${work ? `Their ${work} ${one ? 'stays' : 'stay'} with them — reassign ${one ? 'it' : 'them'} from the listing.` : 'Nothing open is on their name.'}${lets ? ` ${lets.charAt(0).toUpperCase()}${lets.slice(1)}; Undo gives ${team.length + (data.backupApproverId === m.id ? 1 : 0) === 1 ? 'it' : 'them'} back.` : ''} Their notes, tasks and history stay as they are; Reactivate brings them back.`
  }
  /* (pending modules S01 — her "build all of them" 2026-10-11) Edit details: an Owner or an Admin fixes another member's name, email, phone and
     photo (an Owner's, only an Owner) — Add member's fields and checks, and (1.0) never another member's name, email or phone. Your own are on
     Your profile. The dialog closes once the save lands; Undo saves the details back as they were. */
  const [editing, setEditing] = useState<{ m: MemberRow; draft: DetailsDraft; tried: boolean } | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const saveDetails = async () => {
    const e = editing
    if (!e || editBusy) return
    if (hasErrors(detailsErrors(e.draft))) { setEditing({ ...e, tried: true }); return }
    if (!draftChanged(e.draft, e.m)) { setEditing(null); return }
    setEditBusy(true)
    try {
      const r = await saveMemberDetails(e.m.id, { name: e.draft.name, email: e.draft.email, phone: e.draft.phone, ...(e.draft.photo !== undefined ? { photo: e.draft.photo } : {}) })
      if ('error' in r) { snackbar({ message: couldnt('save the details', refusalOf(r.error)) }); return }   // the dialog keeps what was typed
      setEditing(null); router.refresh()
      snackbar({ message: `${r.after.name}’s details are saved`, actionLabel: 'Undo', onAction: () => {
        void saveMemberDetails(e.m.id, { name: r.before.name, email: r.before.email, phone: r.before.phone, photoId: r.before.photoId }).then((u) => {
          if ('error' in u) snackbar({ message: couldnt('put the details back', refusalOf(u.error)) }); else router.refresh()
        }, () => snackbar({ message: couldnt('put the details back') }))
      } })
    } catch { snackbar({ message: couldnt('save the details') }) } finally { setEditBusy(false) }
  }
  /* The press beside a name (a pencil keeps the row's line as it was): your own opens Your profile; an Owner's or an Admin's opens Edit details;
     a row they may not change says why in its tooltip */
  const editPress = (m: MemberRow) => {
    if (m.isYou) return <Tooltip label="Edit your details on Your profile"><IconButton icon="edit" label="Edit your details on Your profile" size={24} variant="bare" iconSize={18} className={styles.pencil} onClick={() => router.push(withFrom('/profile', '/company/members'))} data-testid="member-your-profile" /></Tooltip>
    if (!canEdit) return null
    const why = detailsBlock(viewer, m)
    return why ? <Tooltip label={why}><IconButton icon="edit" label={`Edit ${m.name}’s details — ${why}`} size={24} variant="bare" iconSize={18} className={styles.pencil} aria-disabled="true" data-testid="member-edit" /></Tooltip>
      : <Tooltip label="Edit details"><IconButton icon="edit" label={`Edit ${m.name}’s details`} size={24} variant="bare" iconSize={18} className={styles.pencil} onClick={() => setEditing({ m, draft: draftOf(m), tried: false })} data-testid="member-edit" /></Tooltip>
  }
  /* (UX audit S11) Your own signature, set here as in a quote's Signature section — the same dialog and the same save. */
  const [signing, setSigning] = useState<SignatureDraft | null>(null)
  const saveSignature = async () => {
    const v = signing
    if (!v || !v.name.trim() || (v.kind !== 'type' && !v.data)) return   // (Dane UAT 6.23) a drawing or an uploaded picture
    try {
      const r = await saveMemberSignature({ kind: v.kind, name: v.name.trim(), data: v.kind === 'type' ? null : v.data })
      if ('error' in r) { snackbar({ message: couldnt('save the signature', r.error) }); return }   // the dialog stays with the picture
      setSigning(null); snackbar({ message: 'Signature saved — it prints on the quotes you prepare' }); router.refresh()
    }
    catch { snackbar({ message: 'Couldn’t save the signature — please try again' }) }   // the dialog stays with what was drawn or typed
  }
  /* (one-home N-17) How many running projects a member can carry at once — the Workload view measures them against it, and its Set capacity
     writes the same column. Owners and Admins set it (I-Q3); everyone else reads it. */
  const setsCap = setsCapacity(viewer.role)
  const defaultCap = `Studio default · ${data.defaultCapacity}`
  const capLabel = (m: MemberRow) => { const n = clampCapacity(m.projectCapacity); return n === null ? defaultCap : CAPACITY_COUNTS[n - CAPACITY_MIN] ?? defaultCap }
  const changeCapacity = async (m: MemberRow, label: string) => {
    const n = label === defaultCap ? null : Number(label.split(' ')[0]) || null
    if ((clampCapacity(m.projectCapacity) ?? null) === n) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, projectCapacity: n } : x)))
    try {
      const r = await setMemberCapacity(m.id, n)
      if ('error' in r) { setRows(prev); snackbar({ message: couldnt('change the capacity', refusalOf(r.error)) }); return }
      snackbar({ message: n === null ? `${m.name} now runs the studio default — ${data.defaultCapacity} ${data.defaultCapacity === 1 ? 'project' : 'projects'} at once` : `${m.name} now runs up to ${n} ${n === 1 ? 'project' : 'projects'} at once` })
    } catch { setRows(prev); snackbar({ message: `Couldn’t change how many projects ${m.name} runs — please try again` }) }
  }
  /* (simplify round 2 · F1 §6.9.3) A member's PayNow — what the studio pays their claims and commission to: Finance's pay dialogs show it with
     its copy. Owners and Admins see and set anyone's, a member their own (the server hands no one else's number to the page). Blank takes it
     off; a saved change answers with Undo. */
  const mayPayNow = (m: MemberRow) => canEdit || m.isYou
  /* (pending modules S14) the dialog is the house piece Your profile opens too (components/company/paynow-dialog.tsx) */
  const [payNowFor, setPayNowFor] = useState<MemberRow | null>(null)
  const openPayNow = (m: MemberRow) => setPayNowFor(m)
  /* ── (pending modules S09 — her "build all of them" 2026-10-11; 1.0's Pending Invitations: Resend · Cancel) A member still to come in: their
     row says who invited them, how it went and how long the link stays open; Send again · Copy link · Cancel the invitation (Undo). ── */
  const inviteOf = (m: MemberRow) => data.invites[m.id] ?? null
  const stateOf = (m: MemberRow): InviteState | null => inviteStateOf(inviteOf(m), m, data.now)
  const mayInvite = (m: MemberRow) => canEdit && !(m.role === 'Owner' && viewer.role !== 'Owner')   // an Owner's invitation, only an Owner's to send or cancel
  const [inviteBusy, setInviteBusy] = useState<string | null>(null)
  const sendInvite = async (m: MemberRow) => {
    if (inviteBusy) return
    const again = stateOf(m) === 'pending' || stateOf(m) === 'expired'
    setInviteBusy(m.id)
    try {
      const r = await sendMemberInvitation(m.id)
      if ('error' in r) { snackbar({ message: couldnt('send the invitation', refusalOf(r.error)) }); return }
      snackbar({ message: `Invitation sent ${again ? 'again ' : ''}to ${m.name} — by ${channelWords(r.channels)}` }); router.refresh()
    } catch { snackbar({ message: couldnt('send the invitation') }) } finally { setInviteBusy(null) }
  }
  const copyInvite = (token: string) => {
    void copyText(`${window.location.origin}${joinPath(token)}`).then(() => snackbar({ message: 'Invitation link copied' }), () => snackbar({ message: couldnt('copy the link') }))
  }
  const cancelInvite = async (m: MemberRow) => {
    if (inviteBusy) return
    setInviteBusy(m.id)
    try {
      const r = await cancelMemberInvitation(m.id)
      if ('error' in r) { snackbar({ message: couldnt('cancel the invitation', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ message: `Invitation to ${m.name} cancelled`, actionLabel: 'Undo', onAction: () => {
        void reactivateMember(m.id, r.released).then((u) => {
          if ('error' in u) snackbar({ message: couldnt('bring the invitation back', refusalOf(u.error)) })
          else { snackbar({ message: `${m.name}’s invitation is back` }); router.refresh() }
        }, () => snackbar({ message: couldnt('bring the invitation back') }))
      } })
    } catch { snackbar({ message: couldnt('cancel the invitation') }) } finally { setInviteBusy(null) }
  }
  const inviteAgain = async (m: MemberRow) => {
    if (inviteBusy) return
    setInviteBusy(m.id)
    try {
      const r = await inviteMemberAgain(m.id)
      if ('error' in r) { snackbar({ message: couldnt('invite them again', refusalOf(r.error)) }); return }
      setFresh(m.id); router.refresh()
      snackbar({ message: r.channels.length ? `${m.name} is invited again — by ${channelWords(r.channels)}` : `${m.name} is back — add a mobile number or an email to send the invitation` })
    } catch { snackbar({ message: couldnt('invite them again') }) } finally { setInviteBusy(null) }
  }
  /* (pending modules S09 · AI credits Q-13, kept as 1.0 has it) Seats are never checked — the plan's seats and the members who use the AI tools
     (Accounting takes none, REG-1669) are said where the team is changed, with the way to Plans; nothing is refused. */
  const credits = useCredits(null)
  const seatLimit = (() => { if (!credits) return null; const p = planRow(credits.planId); return p.maxMembers ?? (p.id === 'pro_studio' || p.id === 'max' ? credits.seats : null) })()
  const seatTakers = active.filter((m) => opensWorkspace(m.role)).length
  const seatWords = (n: number) => `${n} ${n === 1 ? 'seat' : 'seats'}`
  const seatWho = credits?.viewer.canChangePlan ? null : credits?.owner.name ?? 'The Owner'
  /* (pending modules S19 — 1.0's Add-a-seat dialog) the Owner on an active Pro — Studio changes the seats here; any other plan, in Plans */
  const seatsHere = !!credits && credits.planId === 'pro_studio' && credits.status === 'active' && !seatWho
  const changeManager = async (m: MemberRow, name: string) => {
    const mgr = name === NOBODY ? null : managers.find((x) => x.name === name) ?? null
    if ((mgr?.id ?? null) === (m.managerId ?? null)) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, managerId: mgr?.id ?? null, reportsTo: mgr?.name ?? null } : x)))
    try { await setMemberManager(m.id, mgr?.id ?? null); snackbar({ message: mgr ? `${m.name} now reports to ${mgr.name}` : `${m.name} reports to nobody` }); router.refresh() }
    catch { setRows(prev); snackbar({ message: `Couldn’t change who ${m.name} reports to — please try again` }) }
  }
  return (
    <CompanyShell title="Members" from={from} skeleton={<MembersGhost />}
                  actions={canEdit ? <Button iconStart={<Icon name="person_add" size={20} />} onPress={() => setAdding({ name: '', phone: '', email: '', role: 'Designer', managerId: null, tried: false })}>Add member</Button> : null}>
      <div className={styles.layout} data-testid="members">
        {canEdit ? null : <ReadOnlyNote text={MEMBERS_READ_ONLY} />}   {/* (sweep S4 #16) · (pending modules S01) details */}
        <section className={styles.card} aria-labelledby="members-title">
          <div className={styles.cardHead}>
            <h2 id="members-title" className={styles.cardTitle}>People and roles</h2>
            <p className={styles.cardHelp}>{MEMBERS_HELP.lead}<HelpLink href={VISIBILITY_HREF} testId="members-visibility-link">{MEMBERS_HELP.link}</HelpLink>{MEMBERS_HELP.end}</p>
            {/* (pending modules S09) more members use the AI tools than the plan has seats: said, with the way to Plans — never a refusal */}
            {canEdit && seatLimit != null && seatTakers > seatLimit ? (
              <p className={styles.seats} data-testid="members-seats">
                <Icon name="info" size={18} weight={300} className={styles.seatsIcon} />
                <span>{`${seatTakers} members use the AI tools and your plan has ${seatWords(seatLimit)}.`}{seatWho ? ` ${seatWho} changes the plan’s seats.` : ''}</span>
                {seatWho ? null : seatsHere ? <Button appearance="text" onPress={() => openSeats()} data-testid="members-seats-change">Change seats</Button> : <Button appearance="text" onPress={() => openPlans()} data-testid="members-seats-plans">See plans</Button>}
              </p>
            ) : null}
          </div>
          <ul className={styles.list} aria-label="Members">
            {active.map((m) => {
              const teamOf = m.role === 'Manager' ? active.filter((x) => x.managerId === m.id) : []
              const block = roleBlock(m)
              const leaveBlock = deactivateBlock(viewer, m, activeOwners)
              const ist = stateOf(m), inv = inviteOf(m)
              const invited = ist === 'pending' || ist === 'unsent' || ist === 'expired'   // an invitation waits: Cancel the invitation is their remove
              return (
                <li key={m.id} className={styles.row} data-testid="member-row" data-role={m.role} data-member-id={m.id} data-fresh={fresh === m.id || undefined}>
                  <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                  <span className={styles.who}>
                    <span className={styles.name}>{m.name}{m.isYou ? <MetaChip>you</MetaChip> : null}{invited ? <MetaChip color={ist === 'expired' ? 'default' : 'yellow'}>{ist === 'expired' ? 'Invitation expired' : 'Invited'}</MetaChip> : null}{editPress(m)}</span>
                    <span className={styles.email}>{m.email ?? '—'}</span>
                  </span>
                  <span className={styles.field} data-testid="member-role">
                    {block ? (
                      <Tooltip label={block}><span><TextField label="Role" mode="select" size="s" options={[...ROLES]} value={m.role} disabled onChange={() => {}} /></span></Tooltip>
                    ) : <TextField label="Role" mode="select" size="s" options={roleOptions} value={m.role} onChange={(v) => { void changeRole(m, v) }} />}
                  </span>
                  <span className={styles.field} data-reports-to={m.id}>
                    {m.role === 'Designer' ? (
                      <TextField label="Reports to" mode="select" size="s" options={[NOBODY, ...managers.map((x) => x.name)]} value={m.reportsTo ?? NOBODY} disabled={!canEdit} onChange={(v) => { void changeManager(m, v) }} />
                    ) : m.role === 'Manager' ? (
                      <span className={styles.team}>{teamOf.length ? `Team: ${teamOf.map((x) => x.name).join(', ')}` : 'No designers report to them yet'}</span>
                    ) : m.role === 'Accounting' ? <span className={styles.team}>Keeps the books</span>   /* (parity map, FB-114) invented copy */
                    : m.role === 'Marketing' ? <span className={styles.team}>Looks after the leads</span>   /* (S44O — C6) invented copy */
                    : <span className={styles.team}>Runs the studio</span>}
                  </span>
                  <span className={styles.count}>{m.leadCount} {m.leadCount === 1 ? 'lead' : 'leads'}</span>
                  {/* (pending modules S09) A member still to come in: who invited them and when, how it went, how long the link stays open */}
                  {waitingOn(ist) && ist ? (
                    <div className={styles.inviteRow} data-testid="member-invite" data-state={ist}>
                      <Icon name={ist === 'expired' ? 'schedule' : 'mail'} size={18} weight={300} className={styles.inviteIcon} />
                      <span className={styles.inviteText}>{inviteLine(inv, ist, data.now)}</span>
                      {mayInvite(m) ? <>
                        <Button appearance="text" isDisabled={inviteBusy === m.id} onPress={() => { void sendInvite(m) }} data-testid="member-invite-send">{ist === 'pending' || ist === 'expired' ? 'Send again' : 'Send invitation'}</Button>
                        {inv?.token && ist !== 'expired' ? <Button appearance="text" onPress={() => copyInvite(inv.token!)} data-testid="member-invite-copy">Copy link</Button> : null}
                        {invited ? <Button appearance="text" isDisabled={inviteBusy === m.id} onPress={() => { void cancelInvite(m) }} data-testid="member-invite-cancel">Cancel invitation</Button> : null}
                      </> : null}
                    </div>
                  ) : null}
                  {/* (REG-612) The second line: open to new leads, the preferences summary, the editor. */}
                  <div className={styles.prefRow} data-testid="member-prefs">
                    {/* (parity map, FB-114) Accounting is on no lead and no project: no new leads to take, no projects to carry, no preferences, no
                        quote to sign — their line keeps their PayNow and Deactivate */}
                    {onLeads(m.role) ? <>
                    <label className={styles.switchLabel}>
                      <Switch size="sm" isSelected={m.acceptingLeads} isDisabled={!mayPrefs(m)} aria-label={`${m.name} open to new leads`} onChange={(on: boolean) => { void toggleAccepting(m, on) }} />
                      <span>Open to new leads</span>
                    </label>
                    {!m.acceptingLeads ? <MetaChip color="yellow">Closed to new leads</MetaChip> : null}
                    {/* (one-home N-17) the member's project capacity, here with their role and preferences */}
                    <span className={styles.capacity} data-testid="member-capacity">
                      <TextField label="Projects at once" mode="select" size="s" options={[defaultCap, ...CAPACITY_COUNTS]} value={capLabel(m)} disabled={!setsCap} onChange={(v) => { void changeCapacity(m, v) }} />
                    </span>
                    <span className={styles.prefSummary}>{[m.specialty, summarisePreferences(parsePreferences(m.leadPreferences))].filter(Boolean).join(' · ') || 'No preferences set'}</span>
                    </> : null}
                    {/* (UX audit S11, REG-421) A signature is set by its member, inside a quote — the row says when it isn't, and the way: your own
                        opens Signature Settings here; anyone else's names where they add it. */}
                    {m.signatureKind || !onLeads(m.role) ? null : m.isYou ? (
                      <span className={styles.sigState} data-testid="member-signature">Signature: not set<Button appearance="text" onPress={() => setSigning({ kind: 'type', name: m.name, data: '' })}>Set it up</Button></span>
                    ) : (
                      <Tooltip label={`${m.name} adds it from Signature on any quote they prepare`}><span className={styles.sigState} tabIndex={0} data-testid="member-signature">Signature: not set</span></Tooltip>
                    )}
                    {/* (simplify round 2 · F1 §6.9.3) their PayNow, beside the signature's state and in its words — for whoever may set it */}
                    {mayPayNow(m) ? (
                      <span className={styles.sigState} data-testid="member-paynow">{m.paynow ? `PayNow: ${payNowShown(m.paynow)}` : null}<Button appearance="text" onPress={() => openPayNow(m)} data-testid="member-paynow-edit">{m.paynow ? 'Change' : 'Add PayNow'}</Button></span>
                    ) : null}
                    {m.portalShown ? <MetaChip>On the About page</MetaChip> : null}   {/* (gaps build H, H-Q22) */}
                    {mayPrefs(m) && onLeads(m.role) ? <Button appearance="text" onPress={() => setPrefsFor(m)}>Preferences</Button> : null}
                    {canEdit || (m.isYou && onLeads(m.role)) ? <Button appearance="text" onPress={() => openProfile(m)} data-testid="member-about">Public profile</Button> : null}
                    {canEdit && !m.isYou && !invited ? (leaveBlock ? <Tooltip label={leaveBlock}><span><Button appearance="text" isDisabled>Deactivate</Button></span></Tooltip>
                      : <Button appearance="text" onPress={() => setLeaving(m)}>Deactivate</Button>) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
        {/* (REG-646) Deactivated members: kept with their records, out of every picker; Reactivate brings them back with their role. */}
        {inactive.length ? (
          <section className={styles.card} aria-labelledby="members-inactive" data-testid="members-inactive">
            <div className={styles.cardHead}>
              <h2 id="members-inactive" className={styles.cardTitle}>Deactivated</h2>
              <p className={styles.cardHelp}>Out of every picker and every team. Their leads, quotes, notes and tasks still carry their name.</p>
            </div>
            <ul className={styles.list} aria-label="Deactivated members">
              {inactive.map((m) => {
                const back = reactivateBlock(viewer, m)
                /* (pending modules S09) an invitation cancelled before they ever came in: Invite again sends a new link (the old one stays dead) */
                const inv = inviteOf(m), cancelled = stateOf(m) === 'cancelled'
                const label = cancelled ? 'Invite again' : 'Reactivate'
                return (
                  <li key={m.id} className={`${styles.row} ${styles.inactiveRow}`} data-testid="member-inactive" data-member-id={m.id}>
                    <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                    <span className={styles.who}>
                      <span className={styles.name}>{m.name}</span>
                      <span className={styles.email}>{m.role}{cancelled && inv?.cancelledAt ? ` · invitation cancelled ${displayDate(new Date(inv.cancelledAt))}` : m.deactivatedAt ? ` · deactivated ${displayDate(new Date(m.deactivatedAt))}` : ''}</span>
                    </span>
                    <span className={styles.count}>{m.leadCount} {m.leadCount === 1 ? 'lead' : 'leads'}</span>
                    {canEdit ? (back ? <Tooltip label={back}><span><Button variant="secondary" appearance="outlined" isDisabled>{label}</Button></span></Tooltip>
                      : <Button variant="secondary" appearance="outlined" isDisabled={inviteBusy === m.id} onPress={() => { void (cancelled ? inviteAgain(m) : reactivate(m)) }} data-testid={cancelled ? 'member-invite-again' : undefined}>{label}</Button>) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
      <PreferencesDialog open={!!prefsFor} member={prefsFor} onClose={() => setPrefsFor(null)} onSave={savePrefs} />
      <SignatureSettings open={!!signing} value={signing} onChange={setSigning} onClose={() => setSigning(null)} onSave={() => { void saveSignature() }} />
      <PayNowDialog owner={payNowFor ? { id: payNowFor.id, name: payNowFor.name, isYou: payNowFor.isYou, paynow: payNowFor.paynow ?? null } : null} onClose={() => setPayNowFor(null)} />
      <ConfirmDialog open={!!leaving} title={leaving ? `Deactivate ${leaving.name}?` : ''} message={leaving ? leaveMessage(leaving) : ''} confirmLabel="Deactivate" tone="danger"
                     onConfirm={() => { void deactivate() }} onCancel={() => setLeaving(null)} />
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.m.name}’s details` : 'Edit details'} size="modal" width={600}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setEditing(null)} isDisabled={editBusy}>Cancel</Button><Button onPress={() => { void saveDetails() }} isDisabled={editBusy} data-testid="member-edit-save">{editBusy ? 'Saving…' : 'Save'}</Button></>}>
        {editing ? (
          <div className={styles.editForm} data-testid="member-edit-dialog">
            <MemberDetailsFields member={editing.m} draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} tried={editing.tried} own={false} onLeads={onLeads(editing.m.role)} marketing={editing.m.role === 'Marketing'} layout="dialog" />
          </div>
        ) : null}
      </Dialog>
      <Dialog open={!!adding} onClose={() => setAdding(null)} title="Add member" size="modal" width={600}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setAdding(null)}>Cancel</Button><Button onPress={() => { void submitAdd() }} isDisabled={busy}>{busy ? 'Adding…' : 'Add member'}</Button></>}>
        {adding ? (
          <div className={styles.addForm} data-testid="add-member">
            <TextField label="Name" required value={adding.name} maxLength={60} autoFocus onChange={(v) => setAdding({ ...adding, name: v })} error={adding.tried ? addErrors.name : undefined} />
            <TextField label="Role" mode="select" options={roleOptions} value={adding.role} onChange={(v) => { if (isRole(v) && !addBlock(viewer, v)) setAdding({ ...adding, role: v }) }} />
            {/* (Dane UAT 2.07) No "Optional" — the required field wears its star, as on the lead form (REG-451) */}
            <TextField label="Phone" value={phoneTyped(adding.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => setAdding({ ...adding, phone: phoneDigits(v) })} error={adding.tried ? addErrors.phone : undefined} helper="A mobile signs them in and gets the invitation" />
            <TextField label="Email" value={adding.email} maxLength={120} inputMode="email" onChange={(v) => setAdding({ ...adding, email: v })} error={adding.tried ? addErrors.email : undefined} helper="Printed as their email on the quotes they prepare" />
            {/* (UX audit S6) A Designer's manager, picked as they are added — who they report to decides who assigns their leads */}
            {adding.role === 'Designer' && managers.length ? (
              <TextField label="Reports to" mode="select" options={[NOBODY, ...managers.map((x) => x.name)]} value={managers.find((x) => x.id === adding.managerId)?.name ?? NOBODY}
                         onChange={(v) => setAdding({ ...adding, managerId: managers.find((x) => x.name === v)?.id ?? null })} helper="Their Manager assigns them leads and sees their team’s" />
            ) : null}
            {/* (pending modules S09) what Add member sends, read live from what is typed — and, when it applies, the plan's seats */}
            {(() => {
              const first = adding.name.trim().split(/\s+/)[0] || 'them'
              const reach = channelsFor({ phone: phoneDigits(adding.phone), email: EMAIL_RE.test(adding.email.trim()) ? adding.email : '' })
              const seat = opensWorkspace(adding.role) && seatLimit != null && seatTakers + 1 > seatLimit
              return (
                <div className={styles.addNotes}>
                  <p className={styles.addNote} data-testid="add-member-invite"><Icon name="mail" size={18} weight={300} className={styles.inviteIcon} /><span>{reach.length ? `We’ll send ${first} an invitation by ${channelWords(reach)} — a link to join, open for ${INVITE_DAYS} days.` : `Add a mobile number or an email to send ${first} an invitation — or add them now and send it later.`}</span></p>
                  {seat ? <p className={styles.addNote} data-testid="add-member-seats"><Icon name="info" size={18} weight={300} className={styles.inviteIcon} /><span>{`Your plan has ${seatWords(seatLimit)} and ${seatTakers} ${seatTakers === 1 ? 'member uses' : 'members use'} the AI tools — ${first === 'them' ? 'they make' : `${first} makes`} ${seatTakers + 1}. ${seatWho ? `${seatWho} changes the plan’s seats.` : seatsHere ? 'A seat more is S$35 a month.' : 'Seats are changed in Plans.'}`}{seatsHere ? <> <Button appearance="text" onPress={() => openSeats({ nested: true })} data-testid="add-member-seats-change">Change seats</Button></> : null}</span></p> : null}
                </div>
              )
            })()}
          </div>
        ) : null}
      </Dialog>
    </CompanyShell>
  )
}
