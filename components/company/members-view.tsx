'use client'

import { useState } from 'react'
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
import { ROLES, isRole, type Role } from '@/lib/leads/enums'
import { runsStudio } from '@/lib/leads/assign-policy'
import { addBlock, deactivateBlock, reactivateBlock, roleChangeBlock } from '@/lib/company/member-rules'
import { displayDate, isSgPhone, phoneDigits, phoneTyped } from '@/lib/format'
import type { MembersData, MemberRow } from '@/lib/company/members'
import { addMember, deactivateMember, reactivateMember, setMemberAccepting, setMemberManager, setMemberPreferences, setMemberRole, type Released } from '@/app/company/members-actions'
import { ReadOnlyNote } from './read-only-note'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { Button, Switch } from '@/components/ds'
import { PreferencesDialog } from './preferences-dialog'
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
  const roleBlock = (m: MemberRow) => (canEdit ? roleChangeBlock(viewer, m, m.role as Role, activeOwners) ?? (m.role === 'Owner' && viewer.role !== 'Owner' ? 'Only an Owner makes or unmakes an Owner' : null) : 'Only Owners and Admins set roles')
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
  const [adding, setAdding] = useState<{ name: string; phone: string; email: string; role: Role; tried: boolean } | null>(null)
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
      const r = await addMember({ name: adding.name, phone: adding.phone, email: adding.email, role: adding.role })
      if ('error' in r) { snackbar({ message: r.error }); return }
      setAdding(null); snackbar({ message: `${adding.name.trim()} added as ${adding.role === 'Owner' || adding.role === 'Admin' ? 'an' : 'a'} ${adding.role}` }); router.refresh()
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
  const changeManager = async (m: MemberRow, name: string) => {
    const mgr = name === NOBODY ? null : managers.find((x) => x.name === name) ?? null
    if ((mgr?.id ?? null) === (m.managerId ?? null)) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, managerId: mgr?.id ?? null, reportsTo: mgr?.name ?? null } : x)))
    try { await setMemberManager(m.id, mgr?.id ?? null); snackbar({ message: mgr ? `${m.name} now reports to ${mgr.name}` : `${m.name} reports to nobody` }); router.refresh() }
    catch { setRows(prev); snackbar({ message: `Couldn’t change who ${m.name} reports to — please try again` }) }
  }
  return (
    <CompanyShell title="Members" from={from} form
                  actions={canEdit ? <Button iconStart={<Icon name="person_add" size={20} />} onPress={() => setAdding({ name: '', phone: '', email: '', role: 'Designer', tried: false })}>Add member</Button> : null}>
      <div className={styles.layout} data-testid="members">
        {canEdit ? null : <ReadOnlyNote text="Only Owners and Admins add members and change roles or reporting lines." />}   {/* (sweep S4 #16) */}
        <section className={styles.card} aria-labelledby="members-title">
          <div className={styles.cardHead}>
            <h2 id="members-title" className={styles.cardTitle}>People and roles</h2>
            <p className={styles.cardHelp}>Owners and Admins run the studio and assign any lead; only an Owner makes another Owner, and nobody changes their own role. A Manager assigns within their team — the Designers who report to them. A Designer keeps the leads assigned to them. Who sees which leads is set under Settings › Lead management.</p>
          </div>
          <ul className={styles.list} aria-label="Members">
            {active.map((m) => {
              const teamOf = m.role === 'Manager' ? active.filter((x) => x.managerId === m.id) : []
              const block = roleBlock(m)
              const leaveBlock = deactivateBlock(viewer, m, activeOwners)
              return (
                <li key={m.id} className={styles.row} data-testid="member-row" data-role={m.role}>
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
                  <span className={styles.field}>
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
      <ConfirmDialog open={!!leaving} title={leaving ? `Deactivate ${leaving.name}?` : ''} message={leaving ? leaveMessage(leaving) : ''} confirmLabel="Deactivate" tone="danger"
                     onConfirm={() => { void deactivate() }} onCancel={() => setLeaving(null)} />
      <Dialog open={!!adding} onClose={() => setAdding(null)} title="Add member" size="modal" width={600}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setAdding(null)}>Cancel</Button><Button onPress={() => { void submitAdd() }} isDisabled={busy}>{busy ? 'Adding…' : 'Add member'}</Button></>}>
        {adding ? (
          <div className={styles.addForm} data-testid="add-member">
            <TextField label="Name" required value={adding.name} maxLength={60} autoFocus onChange={(v) => setAdding({ ...adding, name: v })} error={adding.tried ? addErrors.name : undefined} />
            <TextField label="Role" mode="select" options={roleOptions} value={adding.role} onChange={(v) => { if (isRole(v) && !addBlock(viewer, v)) setAdding({ ...adding, role: v }) }} />
            <TextField label="Phone" value={phoneTyped(adding.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => setAdding({ ...adding, phone: phoneDigits(v) })} error={adding.tried ? addErrors.phone : undefined} helper="Optional" />
            <TextField label="Email" value={adding.email} maxLength={120} inputMode="email" onChange={(v) => setAdding({ ...adding, email: v })} error={adding.tried ? addErrors.email : undefined} helper="Optional — what {prepared_by_email} prints" />
          </div>
        ) : null}
      </Dialog>
    </CompanyShell>
  )
}
