'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/om/avatar'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from './company-shell'
import { MembersGhost } from './company-ghosts'
import { ROLES, isRole, type Role } from '@/lib/leads/enums'
import { runsStudio } from '@/lib/leads/assign-policy'
import { addBlock, deactivateBlock, reactivateBlock, roleChangeBlock } from '@/lib/company/member-rules'
import { displayDate, isSgPhone, phoneDigits, phoneTyped, titleCaseName } from '@/lib/format'
import type { MembersData, MemberRow } from '@/lib/company/members'
import { addMember, deactivateMember, reactivateMember, setMemberAccepting, setMemberManager, setMemberPreferences, setMemberRole, type Released } from '@/app/company/members-actions'
import { ReadOnlyNote } from './read-only-note'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { Button, Switch } from '@/components/ds'
import { PreferencesDialog } from './preferences-dialog'
import { HelpLink } from './help-link'
import { SignatureSettings, type SignatureDraft } from '@/components/quotes/editor/signature/signature-section'
import { saveMemberSignature } from '@/app/quotes/signature-actions'
import { couldnt } from '@/components/leads/tasks/use-run'
import { parsePreferences, summarisePreferences, type LeadPreferences } from '@/lib/company/preferences'
import styles from './members-view.module.css'

const NOBODY = 'Nobody'
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
      snackbar({ message: `${m.name} is now ${role === 'Owner' || role === 'Admin' ? 'an' : 'a'} ${role}` }); router.refresh()
    } catch { setRows(prev); snackbar({ message: 'Couldn’t change the role — please try again' }) }
  }
  /* Add member — name, phone, email, role; the rules decide the roles offered. */
  const [adding, setAdding] = useState<{ name: string; phone: string; email: string; role: Role; managerId: string | null; tried: boolean } | null>(null)
  /* (UX audit S6) The member just added: their row comes into view and pulses once (REG-575's attention look), and the snackbar's action
     opens their Reports to — the next step a Designer needs. */
  const [fresh, setFresh] = useState<string | null>(null)
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
    phone: adding.phone && !isSgPhone(phoneDigits(adding.phone)) ? MSG.phone : undefined,
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
      const added = `${name} added as ${adding.role === 'Owner' || adding.role === 'Admin' ? 'an' : 'a'} ${adding.role}`
      /* (UX audit S6) the next step rides the snackbar: a Designer who reports to nobody yet is one press from their Reports to */
      snackbar(mgr ? { message: `${added}, reporting to ${mgr.name}` }
        : designer && id && managers.length ? { message: `${name} added`, actionLabel: 'Set who they report to', onAction: () => openReportsTo(id) }   // the role is the dialog's; the line keeps to the 344 bar
        : { message: added })
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
        {canEdit ? null : <ReadOnlyNote text="Only Owners and Admins add members and change roles or reporting lines." />}   {/* (sweep S4 #16) */}
        <section className={styles.card} aria-labelledby="members-title">
          <div className={styles.cardHead}>
            <h2 id="members-title" className={styles.cardTitle}>People and roles</h2>
            <p className={styles.cardHelp}>Owners and Admins run the studio and assign any lead; only an Owner makes another Owner, and nobody changes their own role. A Manager assigns within their team — the Designers who report to them. A Designer keeps the leads assigned to them. Who sees which leads is set under <HelpLink href="/settings?section=leads#lead-visibility" testId="members-visibility-link">Settings › Lead management</HelpLink>.</p>
          </div>
          <ul className={styles.list} aria-label="Members">
            {active.map((m) => {
              const teamOf = m.role === 'Manager' ? active.filter((x) => x.managerId === m.id) : []
              const block = roleBlock(m)
              const leaveBlock = deactivateBlock(viewer, m, activeOwners)
              return (
                <li key={m.id} className={styles.row} data-testid="member-row" data-role={m.role} data-member-id={m.id} data-fresh={fresh === m.id || undefined}>
                  <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                  <span className={styles.who}>
                    <span className={styles.name}>{m.name}{m.isYou ? <MetaChip>you</MetaChip> : null}</span>
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
                    ) : <span className={styles.team}>Runs the studio</span>}
                  </span>
                  <span className={styles.count}>{m.leadCount} {m.leadCount === 1 ? 'lead' : 'leads'}</span>
                  {/* (REG-612) The second line: open to new leads, the preferences summary, the editor. */}
                  <div className={styles.prefRow} data-testid="member-prefs">
                    <label className={styles.switchLabel}>
                      <Switch size="sm" isSelected={m.acceptingLeads} isDisabled={!mayPrefs(m)} aria-label={`${m.name} open to new leads`} onChange={(on: boolean) => { void toggleAccepting(m, on) }} />
                      <span>Open to new leads</span>
                    </label>
                    {!m.acceptingLeads ? <MetaChip color="yellow">Closed to new leads</MetaChip> : null}
                    <span className={styles.prefSummary}>{[m.specialty, summarisePreferences(parsePreferences(m.leadPreferences))].filter(Boolean).join(' · ') || 'No preferences set'}</span>
                    {/* (UX audit S11, REG-421) A signature is set by its member, inside a quote — the row says when it isn't, and the way: your own
                        opens Signature Settings here; anyone else's names where they add it. */}
                    {m.signatureKind ? null : m.isYou ? (
                      <span className={styles.sigState} data-testid="member-signature">Signature: not set<Button appearance="text" onPress={() => setSigning({ kind: 'type', name: m.name, data: '' })}>Set it up</Button></span>
                    ) : (
                      <Tooltip label={`${m.name} adds it from Signature on any quote they prepare`}><span className={styles.sigState} tabIndex={0} data-testid="member-signature">Signature: not set</span></Tooltip>
                    )}
                    {mayPrefs(m) ? <Button appearance="text" onPress={() => setPrefsFor(m)}>Preferences</Button> : null}
                    {canEdit && !m.isYou ? (leaveBlock ? <Tooltip label={leaveBlock}><span><Button appearance="text" isDisabled>Deactivate</Button></span></Tooltip>
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
                return (
                  <li key={m.id} className={`${styles.row} ${styles.inactiveRow}`} data-testid="member-inactive">
                    <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                    <span className={styles.who}>
                      <span className={styles.name}>{m.name}</span>
                      <span className={styles.email}>{m.role}{m.deactivatedAt ? ` · deactivated ${displayDate(new Date(m.deactivatedAt))}` : ''}</span>
                    </span>
                    <span className={styles.count}>{m.leadCount} {m.leadCount === 1 ? 'lead' : 'leads'}</span>
                    {canEdit ? (back ? <Tooltip label={back}><span><Button variant="secondary" appearance="outlined" isDisabled>Reactivate</Button></span></Tooltip>
                      : <Button variant="secondary" appearance="outlined" onPress={() => { void reactivate(m) }}>Reactivate</Button>) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
      <PreferencesDialog open={!!prefsFor} member={prefsFor} onClose={() => setPrefsFor(null)} onSave={savePrefs} />
      <SignatureSettings open={!!signing} value={signing} onChange={setSigning} onClose={() => setSigning(null)} onSave={() => { void saveSignature() }} />
      <ConfirmDialog open={!!leaving} title={leaving ? `Deactivate ${leaving.name}?` : ''} message={leaving ? leaveMessage(leaving) : ''} confirmLabel="Deactivate" tone="danger"
                     onConfirm={() => { void deactivate() }} onCancel={() => setLeaving(null)} />
      <Dialog open={!!adding} onClose={() => setAdding(null)} title="Add member" size="modal" width={600}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setAdding(null)}>Cancel</Button><Button onPress={() => { void submitAdd() }} isDisabled={busy}>{busy ? 'Adding…' : 'Add member'}</Button></>}>
        {adding ? (
          <div className={styles.addForm} data-testid="add-member">
            <TextField label="Name" required value={adding.name} maxLength={60} autoFocus onChange={(v) => setAdding({ ...adding, name: v })} error={adding.tried ? addErrors.name : undefined} />
            <TextField label="Role" mode="select" options={roleOptions} value={adding.role} onChange={(v) => { if (isRole(v) && !addBlock(viewer, v)) setAdding({ ...adding, role: v }) }} />
            {/* (Dane UAT 2.07) No "Optional" — the required field wears its star, as on the lead form (REG-451) */}
            <TextField label="Phone" value={phoneTyped(adding.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => setAdding({ ...adding, phone: phoneDigits(v) })} error={adding.tried ? addErrors.phone : undefined} />
            <TextField label="Email" value={adding.email} maxLength={120} inputMode="email" onChange={(v) => setAdding({ ...adding, email: v })} error={adding.tried ? addErrors.email : undefined} helper="Printed as their email on the quotes they prepare" />
            {/* (UX audit S6) A Designer's manager, picked as they are added — who they report to decides who assigns their leads */}
            {adding.role === 'Designer' && managers.length ? (
              <TextField label="Reports to" mode="select" options={[NOBODY, ...managers.map((x) => x.name)]} value={managers.find((x) => x.id === adding.managerId)?.name ?? NOBODY}
                         onChange={(v) => setAdding({ ...adding, managerId: managers.find((x) => x.name === v)?.id ?? null })} helper="Their Manager assigns them leads and sees their team’s" />
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </CompanyShell>
  )
}
