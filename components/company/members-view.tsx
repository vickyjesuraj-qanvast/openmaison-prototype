'use client'

import { useEffect, useRef, useState } from 'react'
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
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { useSnackbar } from '@/components/om/snackbar'
import { MemberDrawer } from './member-drawer'
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
import { PayNowDialog } from './paynow-dialog'   // (pending modules S14) one dialog, two doors
import { VISIBILITY_HREF } from '@/lib/settings/types'   // (pending modules S14) Who sees leads' one home
import { CAPACITY_MAX, CAPACITY_MIN, clampCapacity, setsCapacity } from '@/lib/projects/workload'   // (one-home N-17)
import { ReadOnlyNote } from './read-only-note'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { Button } from '@/components/ds'
import { PreferencesDialog } from './preferences-dialog'
import { HelpLink } from './help-link'
import { SignatureSettings, type SignatureDraft } from '@/components/quotes/editor/signature/signature-section'
import { saveMemberSignature } from '@/app/quotes/signature-actions'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { type LeadPreferences } from '@/lib/company/preferences'
import { MEMBER_DRAWER, MEMBERS_LINKS, MEMBERS_READ_ONLY } from '@/lib/company/copy'   // (pending modules S17) the words the ghost reads too
import { landlineOnlyKey } from '@/lib/auth/model'   // (S44O — row 344) a member's only sign-in key is a mobile
import styles from './members-view.module.css'

/* (the calm UI build 2026-10-27 — W-057) a Designer with no Manager: the select's value, said as a studio says it (the stored value is null) */
const NOBODY = MEMBER_DRAWER.noManager
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
    try { await setMemberAccepting(m.id, on); snackbar({ message: on ? `${m.name} is open to new leads` : `${m.name} isn’t taking new leads` }); router.refresh() }   // (the calm UI build 2026-10-27 — W-142) the row's own words
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
  /* (the calm UI build 2026-10-27 — 5-01) a member's drawer: everything about them but their role — the row's name opens it */
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const openReportsTo = (id: string) => {
    /* (5-01) Reports to lives in the member's drawer now: the snackbar's step opens it, then the select's list once it has slid in, the
       keyboard's way (the field opens on ↓ as it does on a press) */
    setDrawerId(id)
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-reports-to="${CSS.escape(id)}"] [role="combobox"]`)
      if (!el) return
      el.focus({ preventScroll: true })
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    }, 320)
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
  /* (pending modules S01 — his "build all of them" 2026-10-11) Edit details: an Owner or an Admin fixes another member's name, email, phone and
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
  /* Edit details (the calm UI build 2026-10-27 — 5-01: the pencil beside a name moved into the row's ⋮ and the member's drawer): your own opens
     Your profile; an Owner's or an Admin's opens Edit details; a row they may not change says why. */
  const yourProfile = () => router.push(withFrom('/profile', '/company/members'))
  const editOf = (m: MemberRow): { label: string; run: () => void } | { refused: string } | null => {
    if (m.isYou) return { label: 'Edit your details', run: yourProfile }
    if (!canEdit) return null
    const why = detailsBlock(viewer, m)
    return why ? { refused: why } : { label: 'Edit details', run: () => setEditing({ m, draft: draftOf(m), tried: false }) }
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
  const defaultCap = MEMBER_DRAWER.usual(data.defaultCapacity)   // (the calm UI build 2026-10-27 — W-389) "4 (studio usual)", was "Studio default · 4"
  const capLabel = (m: MemberRow) => { const n = clampCapacity(m.projectCapacity); return n === null ? defaultCap : CAPACITY_COUNTS[n - CAPACITY_MIN] ?? defaultCap }
  const changeCapacity = async (m: MemberRow, label: string) => {
    const n = label === defaultCap ? null : Number(label.split(' ')[0]) || null
    if ((clampCapacity(m.projectCapacity) ?? null) === n) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, projectCapacity: n } : x)))
    try {
      const r = await setMemberCapacity(m.id, n)
      if ('error' in r) { setRows(prev); snackbar({ message: couldnt('change the capacity', refusalOf(r.error)) }); return }
      /* (W-350) plain words: "Sarah takes up to 4 projects (the studio usual)" */
      snackbar({ message: n === null ? `${m.name} takes up to ${data.defaultCapacity} ${data.defaultCapacity === 1 ? 'project' : 'projects'} (the studio usual)` : `${m.name} takes up to ${n} ${n === 1 ? 'project' : 'projects'}` })
    } catch { setRows(prev); snackbar({ message: `Couldn’t change how many projects ${m.name} runs — please try again` }) }
  }
  /* (simplify round 2 · F1 §6.9.3) A member's PayNow — what the studio pays their claims and commission to: Finance's pay dialogs show it with
     its copy. Owners and Admins see and set anyone's, a member their own (the server hands no one else's number to the page). Blank takes it
     off; a saved change answers with Undo. */
  const mayPayNow = (m: MemberRow) => canEdit || m.isYou
  /* (pending modules S14) the dialog is the house piece Your profile opens too (components/company/paynow-dialog.tsx) */
  const [payNowFor, setPayNowFor] = useState<MemberRow | null>(null)
  const openPayNow = (m: MemberRow) => setPayNowFor(m)
  /* ── (pending modules S09 — his "build all of them" 2026-10-11; 1.0's Pending Invitations: Resend · Cancel) A member still to come in: their
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
    try { await setMemberManager(m.id, mgr?.id ?? null); snackbar({ message: mgr ? `${m.name} now reports to ${mgr.name}` : `${m.name} has no manager now` }); router.refresh() }   // (W-057)
    catch { setRows(prev); snackbar({ message: `Couldn’t change who ${m.name} reports to — please try again` }) }
  }
  return (
    <CompanyShell title="Members" from={from} skeleton={<MembersGhost />}
                  actions={canEdit ? <Button iconStart={<Icon name="person_add" size={20} />} onPress={() => setAdding({ name: '', phone: '', email: '', role: 'Designer', managerId: null, tried: false })}>Add member</Button> : null}>
      <div className={styles.layout} data-testid="members">
        {canEdit ? null : <ReadOnlyNote text={MEMBERS_READ_ONLY} />}   {/* (sweep S4 #16) · (pending modules S01) details */}
        {/* (the calm UI build 2026-10-27 — 5-02) no card title ("People and roles" repeated the page) and no rules paragraph — the list ends with
            the two doors to them; the seats note (a state, S09) stays at the list's head */}
        <section className={styles.card} aria-label="Members">
          {canEdit && seatLimit != null && seatTakers > seatLimit ? (
            <p className={styles.seats} data-testid="members-seats">
              <Icon name="info" size={18} weight={300} className={styles.seatsIcon} />
              <span>{`${seatTakers} members use the AI tools and your plan has ${seatWords(seatLimit)}.`}{seatWho ? ` ${seatWho} changes the plan’s seats.` : ''}</span>
              {seatWho ? null : seatsHere ? <Button appearance="text" onPress={() => openSeats()} data-testid="members-seats-change">Change seats</Button> : <Button appearance="text" onPress={() => openPlans()} data-testid="members-seats-plans">See plans</Button>}
            </p>
          ) : null}
          <ul className={styles.list} aria-label="Members">
            {active.map((m) => {
              const block = roleBlock(m)
              const leaveBlock = deactivateBlock(viewer, m, activeOwners)
              const ist = stateOf(m), inv = inviteOf(m)
              const invited = ist === 'pending' || ist === 'unsent' || ist === 'expired'   // an invitation waits: Cancel the invitation is their remove
              const edit = editOf(m)
              /* (5-01) the row's ⋮ — every control the row drew that is not its Role, one press away (the rest is in the member's drawer) */
              const editRow: MenuRow[] = !edit ? [] : 'refused' in edit ? [{ label: 'Edit details', run: () => {}, disabled: true, help: edit.refused, testId: 'member-edit' }]
                : m.isYou ? [{ label: edit.label, run: edit.run, testId: 'member-your-profile' }] : [{ label: edit.label, run: edit.run, testId: 'member-edit' }]
              const menu: MenuRow[] = [
                ...editRow,
                ...(canEdit || (m.isYou && onLeads(m.role)) ? [{ label: 'Public profile', run: () => openProfile(m), testId: 'member-about' }] : []),
                ...(waitingOn(ist) && ist && mayInvite(m) && inv?.token && ist !== 'expired' ? [{ label: 'Copy invitation link', run: () => copyInvite(inv.token!), testId: 'member-invite-copy' }] : []),
                ...(waitingOn(ist) && ist && mayInvite(m) && invited ? [{ label: 'Cancel invitation', run: () => { void cancelInvite(m) }, disabled: inviteBusy === m.id, testId: 'member-invite-cancel' }] : []),
                ...(canEdit && !m.isYou && !invited ? [leaveBlock ? { label: 'Deactivate', run: () => {}, disabled: true, help: leaveBlock } : { label: 'Deactivate', run: () => setLeaving(m), tone: 'danger' as const }] : []),
              ]
              const closed = onLeads(m.role) && !m.acceptingLeads
              const ownSig = m.isYou && onLeads(m.role) && !m.signatureKind
              return (
                <li key={m.id} className={styles.row} data-testid="member-row" data-role={m.role} data-member-id={m.id} data-fresh={fresh === m.id || undefined}>
                  <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                  {/* the member's words open their drawer (the listing's grammar: the row's name opens the record) */}
                  <button type="button" className={styles.who} onClick={() => setDrawerId(m.id)} aria-haspopup="dialog" data-testid="member-open">
                    <span className={styles.name}>{m.name}{m.isYou ? <span className={styles.you}>(you)</span> : null}{invited ? <MetaChip color={ist === 'expired' ? 'default' : 'yellow'}>{ist === 'expired' ? 'Invitation expired' : 'Invited'}</MetaChip> : null}</span>
                    {m.email ? <span className={styles.email}>{m.email}</span> : null}
                  </button>
                  <span className={styles.field} data-testid="member-role">
                    {block ? (
                      <Tooltip label={block}><span><TextField label="Role" mode="select" size="s" options={[...ROLES]} value={m.role} disabled onChange={() => {}} /></span></Tooltip>
                    ) : <TextField label="Role" mode="select" size="s" options={roleOptions} value={m.role} onChange={(v) => { void changeRole(m, v) }} />}
                  </span>
                  <span className={styles.count}>{m.leadCount} {m.leadCount === 1 ? 'lead' : 'leads'}</span>
                  <span className={styles.more}><MemberMenu title={m.name} label={`More for ${m.name}`} items={menu} /></span>
                  {/* (pending modules S09) A member still to come in: who invited them and when, how it went, how long the link stays open — and
                      the one verb it needs (Copy link and Cancel invitation are in the ⋮) */}
                  {waitingOn(ist) && ist ? (
                    <div className={styles.inviteRow} data-testid="member-invite" data-state={ist}>
                      <Icon name={ist === 'expired' ? 'schedule' : 'mail'} size={18} weight={300} className={styles.inviteIcon} />
                      <span className={styles.inviteText}>{inviteLine(inv, ist, data.now)}</span>
                      {mayInvite(m) ? <Button appearance="text" isDisabled={inviteBusy === m.id} onPress={() => { void sendInvite(m) }} data-testid="member-invite-send">{ist === 'pending' || ist === 'expired' ? 'Send again' : 'Send invitation'}</Button> : null}
                    </div>
                  ) : null}
                  {/* (5-01) a second line only for what is off the usual: not taking new leads; your own signature still to add */}
                  {closed || ownSig ? (
                    <div className={styles.metaRow}>
                      {closed ? <span className={styles.metaText} data-testid="member-closed">{MEMBER_DRAWER.closed}</span> : null}
                      {ownSig ? <span className={styles.sigState} data-testid="member-signature"><Button appearance="text" onPress={() => setSigning({ kind: 'type', name: m.name, data: '' })}>{MEMBER_DRAWER.addSignature}</Button></span> : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {/* (5-02) the rules, one press away: what each role can do, and who sees which leads — both in Settings › Roles & access */}
          <p className={styles.listFoot}>
            <HelpLink href={MEMBERS_LINKS.rolesHref} testId="members-roles-link" standalone>{MEMBERS_LINKS.roles}</HelpLink>
            <span aria-hidden className={styles.dot}>·</span>
            <HelpLink href={VISIBILITY_HREF} testId="members-visibility-link" standalone>{MEMBERS_LINKS.visibility}</HelpLink>
          </p>
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
                    {/* (the calm UI build 2026-10-27 — T-02) the row's one verb is the house Row's text button */}
                    {canEdit ? <span className={styles.act}>{back ? <Tooltip label={back}><span><Button appearance="text" isDisabled>{label}</Button></span></Tooltip>
                      : <Button appearance="text" isDisabled={inviteBusy === m.id} onPress={() => { void (cancelled ? inviteAgain(m) : reactivate(m)) }} data-testid={cancelled ? 'member-invite-again' : undefined}>{label}</Button>}</span> : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
      {(() => {
        const m = drawerId ? rows.find((x) => x.id === drawerId && x.isActive) ?? null : null
        const team = m && m.role === 'Manager' ? MEMBER_DRAWER.team(active.filter((x) => x.managerId === m.id).map((x) => x.name)) : null
        return (
          <MemberDrawer member={m} onClose={() => setDrawerId(null)} canEdit={canEdit} onLeads={!!m && onLeads(m.role)} mayPrefs={!!m && mayPrefs(m)} mayPayNow={!!m && mayPayNow(m)}
                        setsCap={setsCap} mayProfile={!!m && (canEdit || (m.isYou && onLeads(m.role)))} capOptions={[defaultCap, ...CAPACITY_COUNTS]} capLabel={m ? capLabel(m) : defaultCap}
                        managers={managers.map((x) => x.name)} noManager={NOBODY} team={team} edit={m ? editOf(m) : null}
                        onPrefs={() => { if (m) setPrefsFor(m) }} onAccepting={(on) => { if (m) void toggleAccepting(m, on) }} onCapacity={(v) => { if (m) void changeCapacity(m, v) }}
                        onManager={(v) => { if (m) void changeManager(m, v) }} onPayNow={() => { if (m) openPayNow(m) }} onProfile={() => { if (m) openProfile(m) }}
                        onSignature={() => { if (m) setSigning({ kind: 'type', name: m.name, data: '' }) }} />
        )
      })()}
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

type MenuRow = { label: string; run: () => void; disabled?: boolean; help?: string; tone?: 'danger'; testId?: string }

/** (the calm UI build 2026-10-27 — 5-01, T-02) A member row's ⋮ — the house PortalMenu anchored to a bare icon button, a sheet on a phone with
    the member's name. A refused row stays in the menu, disabled, with its rule as the row's second line (REG-728). Each row keeps the test id
    its old button carried (a span round the house menu row, as the Dashboard's Needs you rows do). */
function MemberMenu({ title, label, items }: { title: string; label: string; items: MenuRow[] }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <span ref={anchor}>
      <Tooltip label="More" disabled={open}>
        <IconButton icon="more_vert" label={label} variant="bare" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="member-more" />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle={title}>
        {items.map((a) => (
          <span key={a.label} className={styles.menuRow} data-testid={a.testId}>
            <DropdownItem onSelect={() => { setOpen(false); a.run() }} tone={a.tone} disabled={a.disabled} help={a.help}>{a.label}</DropdownItem>
          </span>
        ))}
      </PortalMenu>
    </span>
  )
}
