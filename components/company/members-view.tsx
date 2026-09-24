'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/om/avatar'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from './company-shell'
import { ROLES, isRole, type Role } from '@/lib/leads/enums'
import { runsStudio } from '@/lib/leads/assign-policy'
import type { MembersData, MemberRow } from '@/lib/company/members'
import { setMemberAccepting, setMemberManager, setMemberPreferences, setMemberRole } from '@/app/company/members-actions'
import { Button, Switch } from '@/components/ds'
import { PreferencesDialog } from './preferences-dialog'
import { parsePreferences, summarisePreferences, type LeadPreferences } from '@/lib/company/preferences'
import styles from './members-view.module.css'

const NOBODY = 'Nobody'

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
  const canEdit = runsStudio(data.viewer.role)
  /* (REG-612, parity Q-27) Open to new leads + preferences: Owners and Admins for anyone, a member for themself. */
  const [prefsFor, setPrefsFor] = useState<MemberRow | null>(null)
  const mayPrefs = (m: MemberRow) => canEdit || m.isYou
  const toggleAccepting = async (m: MemberRow, on: boolean) => {
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, acceptingLeads: on } : x)))
    try { await setMemberAccepting(m.id, on); snackbar({ message: on ? `${m.name} is open to new leads` : `${m.name} is closed to new leads` }); router.refresh() }
    catch { setRows(prev); snackbar({ message: 'Couldn’t save — please try again' }) }
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
  const managers = rows.filter((m) => m.role === 'Manager')
  const owners = rows.filter((m) => m.role === 'Owner').length
  const changeRole = async (m: MemberRow, role: string) => {
    if (!isRole(role) || role === m.role) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, role, managerId: role === 'Designer' ? x.managerId : null, reportsTo: role === 'Designer' ? x.reportsTo : null } : x.managerId === m.id && role !== 'Manager' ? { ...x, managerId: null, reportsTo: null } : x)))
    try { await setMemberRole(m.id, role as Role); snackbar({ message: `${m.name} is now ${role === 'Owner' || role === 'Admin' ? 'an' : 'a'} ${role}` }); router.refresh() }
    catch (e) { setRows(prev); snackbar({ message: String(e).includes('owner') ? 'The studio needs at least one Owner' : 'Couldn’t change the role — please try again' }) }
  }
  const changeManager = async (m: MemberRow, name: string) => {
    const mgr = name === NOBODY ? null : managers.find((x) => x.name === name) ?? null
    if ((mgr?.id ?? null) === (m.managerId ?? null)) return
    const prev = rows
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, managerId: mgr?.id ?? null, reportsTo: mgr?.name ?? null } : x)))
    try { await setMemberManager(m.id, mgr?.id ?? null); snackbar({ message: mgr ? `${m.name} now reports to ${mgr.name}` : `${m.name} reports to nobody` }); router.refresh() }
    catch { setRows(prev); snackbar({ message: 'Couldn’t save — please try again' }) }
  }
  return (
    <CompanyShell title="Members" from={from}>
      <div className={styles.layout} data-testid="members">
        <section className={styles.card} aria-labelledby="members-title">
          <div className={styles.cardHead}>
            <h2 id="members-title" className={styles.cardTitle}>People and roles</h2>
            <p className={styles.cardHelp}>Owners and Admins run the studio and assign any lead. A Manager assigns within their team — the Designers who report to them. A Designer keeps the leads assigned to them. Who sees which leads is set under Settings › Leads.</p>
          </div>
          <ul className={styles.list} aria-label="Members">
            {rows.map((m) => {
              const teamOf = m.role === 'Manager' ? rows.filter((x) => x.managerId === m.id) : []
              return (
                <li key={m.id} className={styles.row} data-testid="member-row" data-role={m.role}>
                  <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                  <span className={styles.who}>
                    <span className={styles.name}>{m.name}{m.isYou ? <MetaChip>you</MetaChip> : null}</span>
                    <span className={styles.email}>{m.email ?? '—'}</span>
                  </span>
                  <span className={styles.field}>
                    <TextField label="Role" mode="select" size="s" options={[...ROLES]} value={m.role} disabled={!canEdit || (m.role === 'Owner' && owners <= 1)} onChange={(v) => { void changeRole(m, v) }} />
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
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
      <PreferencesDialog open={!!prefsFor} member={prefsFor} onClose={() => setPrefsFor(null)} onSave={savePrefs} />
    </CompanyShell>
  )
}
