'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { withFrom } from '@/lib/nav'
import { permissionRows, REACH_LABEL, ROLE_COLUMNS, type StudioRules } from '@/lib/settings/permissions'
import { settingsHref } from '@/lib/settings/modules'
import { ModuleHead } from './module-head'
import { leaveThen } from '@/components/company/leave-guard'
import { HelpLink } from '@/components/company/help-link'
import styles from './settings.module.css'

export type TeamMember = { id: string; name: string; role: string; color: string; isYou: boolean; managerId: string | null; isActive: boolean }
export type EntityLine = { name: string; uen: string; gstRegistered: boolean; bank: string; /** (sweep S4 #13) kept for the quotes that print through it, offered to no new one */ retired?: boolean }

/**
 * (REG-645, settings parity Q-03 · Q-04) Settings › Studio — 1.0's Accounts › Studio group on 2.0's pieces: the team by role and the
 * issuing entities (their records stay on Company › Members and Company › Profile), and *Who may do what* — the four roles against
 * every action the app checks, computed from the rules themselves (`permissionRows`). Nothing here is edited; Studio Health stays out
 * (the platform's telemetry, Q-16).
 */
export function StudioSettings({ studioName, team, entities, rules, backupName }: {
  studioName: string
  team: TeamMember[]
  entities: EntityLine[]
  rules: StudioRules
  backupName: string | null
}) {
  const router = useRouter()
  const from = settingsHref('studio')
  const membersHref = withFrom('/company/members', from)
  const profileHref = withFrom('/company/profile', from)
  const nameOf = (id: string | null) => team.find((m) => m.id === id)?.name ?? null
  const rows = permissionRows(rules)
  const active = team.filter((m) => m.isActive)
  const inactive = team.filter((m) => !m.isActive)   // (REG-646) deactivated: named apart, counted nowhere
  const counts = Object.fromEntries(ROLE_COLUMNS.map((r) => [r, active.filter((m) => m.role === r).length])) as Record<string, number>
  return (
    <section className={styles.panel} aria-labelledby="settings-studio-title" data-testid="settings-studio">
      <ModuleHead id="settings-studio-title" title="Studio" help={`Who works in ${studioName}, the companies it issues quotes and contracts under, and what each role may do.`}
                  links={[{ label: 'Members', icon: 'group', href: membersHref }, { label: 'Profile', icon: 'store', href: profileHref }]} />

      <div className={styles.setting} data-testid="studio-team">
        <div className={styles.settingHeadRow}>
          <div className={styles.settingHead}>
            <span className={styles.settingTitle}>Team</span>
            <span className={styles.settingHelp}>{active.length} {active.length === 1 ? 'member' : 'members'}, by role. Roles, who reports to whom and who is added or deactivated are set under <HelpLink href="/company/members">Company › Members</HelpLink>.</span>
          </div>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="group" size={20} />} onPress={() => leaveThen(() => router.push(membersHref))}>Manage members</Button>
        </div>
        <div className={styles.roleList}>
          {ROLE_COLUMNS.map((role) => {
            const people = active.filter((m) => m.role === role)
            return (
              <div key={role} className={styles.roleRow} data-testid={`team-${role.toLowerCase()}`}>
                <span className={styles.reasonLabel}>{role}</span>
                {people.length ? (
                  <ul className={styles.people} aria-label={`${role}s`}>
                    {people.map((m) => (
                      <li key={m.id} className={styles.person}>
                        <Avatar name={m.name} color={m.color} size={24} tooltip={false} />
                        <span>{m.name}</span>
                        {m.isYou ? <MetaChip>You</MetaChip> : null}
                        {m.managerId && nameOf(m.managerId) ? <span className={styles.settingHelp}>· reports to {nameOf(m.managerId)}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : <span className={styles.settingHelp}>No one yet</span>}
              </div>
            )
          })}
          {inactive.length ? (
            <div className={styles.roleRow} data-testid="team-deactivated">
              <span className={styles.reasonLabel}>Deactivated</span>
              <span className={styles.settingHelp}>{inactive.map((m) => m.name).join(', ')} — kept with their records, out of every picker</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.setting} data-testid="studio-entities">
        <div className={styles.settingHeadRow}>
          <div className={styles.settingHead}>
            <span className={styles.settingTitle}>Issuing entities</span>
            <span className={styles.settingHelp}>The companies a quote or a contract can be issued under — the first is the studio itself. Their bank details, PayNow and letterheads are kept under <HelpLink href="/company/profile#entities">Company › Profile</HelpLink>.</span>
          </div>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="store" size={20} />} onPress={() => leaveThen(() => router.push(`${profileHref}#entities`))}>Manage entities</Button>
        </div>
        <div className={`${styles.eventTable} ${styles.entityTable}`} role="table" aria-label="Issuing entities" data-card-table="">
          <div className={styles.eventHead} role="row">
            <span role="columnheader">Entity</span><span role="columnheader">UEN</span><span role="columnheader">GST</span><span role="columnheader">Bank</span>
          </div>
          {entities.map((e, i) => (
            <div key={`${e.name}-${i}`} className={styles.eventRow} role="row" data-testid="studio-entity">
              <span role="cell" className={styles.eventName}><Icon name={i === 0 ? 'store' : 'account_balance'} size={20} weight={300} /><span><span>{e.name}{e.retired ? <> <MetaChip>Retired</MetaChip></> : null}</span>{i === 0 ? <span className={styles.eventHelp}>The studio</span> : e.retired ? <span className={styles.eventHelp}>Kept for the quotes and contracts issued under it — not offered on new ones</span> : null}</span></span>
              <span role="cell" className={styles.eventWho} data-label="UEN">{e.uen || '—'}</span>
              <span role="cell" className={styles.eventWho} data-label="GST">{e.gstRegistered ? 'Registered' : 'Not registered'}</span>
              <span role="cell" className={styles.eventWho} data-label="Bank">{e.bank || 'No bank details yet'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.setting} data-testid="studio-roles">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Who may do what</span>
          <span className={styles.settingHelp}>What each role may do, as the app checks it. The rows follow this studio’s settings — quote and template approval, the payment schedule and who sees leads. Roles are fixed; a member’s role is set under <HelpLink href="/company/members">Company › Members</HelpLink>.</span>
        </div>
        <div className={`${styles.eventTable} ${styles.roleTable}`} role="table" aria-label="Who may do what" data-card-table="">
          <div className={styles.eventHead} role="row">
            <span role="columnheader">Action</span>
            {ROLE_COLUMNS.map((r) => <span key={r} role="columnheader" className={styles.eventCol}>{r}{counts[r] ? ` · ${counts[r]}` : ''}</span>)}
          </div>
          {rows.map((row) => (
            <div key={row.key} className={styles.eventRow} role="row" data-testid={`may-${row.key}`}>
              <span role="cell" className={styles.eventName}><span>{row.action}</span></span>
              {ROLE_COLUMNS.map((r) => {
                const reach = row.reach[r]
                return (
                  <span key={r} role="cell" className={styles.eventCol} data-label={r} data-reach={reach}>
                    {reach === 'yes' ? <><Icon name="check" size={20} weight={400} className={styles.reachYes} /><span className={styles.srOnly}>{REACH_LABEL.yes}</span></>
                      : reach === 'no' ? <><span aria-hidden className={styles.reachNo}>—</span><span className={styles.srOnly}>{REACH_LABEL.no}</span></>
                      : <span className={styles.reachText}>{REACH_LABEL[reach]}</span>}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
        {backupName ? <span className={styles.settingHelp} data-testid="backup-line">{backupName} is the backup approver: approves quotes and publishes templates as an Owner or an Admin does (<HelpLink href="/settings?section=quotes#backup-approver">Settings › Quotes & pricing</HelpLink>).</span> : null}
      </div>
    </section>
  )
}
