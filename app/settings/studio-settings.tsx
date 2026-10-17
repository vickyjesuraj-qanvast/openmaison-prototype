'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { permissionGroups, permissionRows, REACH_LABEL, ROLE_COLUMNS, RULE_PLACES, type StudioRules } from '@/lib/settings/permissions'
import { moduleLinks, settingsHref } from '@/lib/settings/modules'
import { WHO_MAY_HELP, studioHelp } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import { ModuleHead } from './module-head'
import { HelpLink } from '@/components/company/help-link'
import styles from './settings.module.css'
import own from './studio-settings.module.css'   // (parity P-38) the groups' captions


export type TeamMember = { id: string; name: string; role: string; color: string; isYou: boolean; managerId: string | null; isActive: boolean }

/**
 * (REG-645, settings parity Q-03 · Q-04) Settings › Studio — 1.0's Accounts › Studio group on 2.0's pieces: **Who may do what** — the four
 * roles against every action the app checks, computed from the rules themselves (`permissionRows`). (parity map, FB-114) Five, with Accounting. Nothing here is edited; Studio Health
 * stays out (the platform's telemetry, Q-16).
 * (one-home N-06) The read-only Team and Issuing entities cards are gone — they copied Company › Members and Company › Profile, which hold
 * those records; the module head's *Kept in Company:* links open them, with the way back here.
 * (pending modules S14 — card held:settings-company, as recommended) **Roles & access**: the module is named for what it holds, and **Who sees
 * leads** moved in from Lead management — it decides who sees a lead and everything on it (its project, quotes, contracts, files, X-Ray
 * readings, Qanvast Ops), so it sits beside the table whose rows it changes: a pick shows at once in *See a lead* / *See a project*.
 */
export function StudioSettings({ studioName, team, rules, backupName, setup = null, visibility = null, costs = null, readOnly = false }: {
  studioName: string
  /** (pending modules S08) Set up your studio — above Who may do what while it shows for this member */
  setup?: ReactNode
  /** (pending modules S14) Who sees leads — the card (settings-view.tsx holds its state), above Who may do what */
  visibility?: ReactNode
  /** (pending modules S41b-1) Who sees costs and margins — the card (settings-view.tsx holds its state), after Who sees leads */
  costs?: ReactNode
  /** (REG-645, Q-08) the one read-only look: the line under the title for whoever may only read the module */
  readOnly?: boolean
  team: TeamMember[]
  rules: StudioRules
  backupName: string | null
}) {
  const from = settingsHref('studio')
  const groups = permissionGroups(permissionRows(rules))   // (parity P-38) grouped by area, in Settings' module order
  const active = team.filter((m) => m.isActive)   // (REG-646) deactivated: counted nowhere
  const counts = Object.fromEntries(ROLE_COLUMNS.map((r) => [r, active.filter((m) => m.role === r).length])) as Record<string, number>
  return (
    <section className={styles.panel} aria-labelledby="settings-studio-title" data-testid="settings-studio">
      <ModuleHead id="settings-studio-title" title="Roles & access" help={studioHelp(studioName)} readOnly={readOnly}
                  links={moduleLinks('studio', from)} />   {/* (one-home N-06) · (pending modules S14) */}
      {setup}
      {visibility}
      {costs}

      <div className={styles.setting} id="studio-roles" data-testid="studio-roles">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Who may do what</span>
          <span className={styles.settingHelp}>{WHO_MAY_HELP.lead}<HelpLink href="/company/members">{WHO_MAY_HELP.link}</HelpLink>{WHO_MAY_HELP.end}</span>
        </div>
        <div className={`${styles.eventTable} ${styles.roleTable} ${own.roles}`} role="table" aria-label="Who may do what" data-card-table="">   {/* (parity map, FB-114) five roles */}
          <div className={styles.eventHead} role="row">
            <span role="columnheader">Action</span>
            {ROLE_COLUMNS.map((r) => <span key={r} role="columnheader" className={styles.eventCol}>{r}{counts[r] ? ` · ${counts[r]}` : ''}</span>)}
          </div>
          {groups.map((g) => (
            /* (parity P-38) one group per area, opened by its caption — the card table's head band across the row */
            <div key={g.area} role="rowgroup" aria-label={g.area} data-testid={`may-group-${g.area.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
              <div className={own.group} role="row"><span role="cell" aria-colspan={ROLE_COLUMNS.length + 1}>{g.area}</span></div>
              {g.rows.map((row) => (
                <div key={row.key} className={styles.eventRow} role="row" data-testid={`may-${row.key}`}>
                  {/* (Dane UAT 2.23 · 10.08) A rule the studio can change says where, as a link that lands on it (with Back here, REG-465). */}
                  <span role="cell" className={styles.eventName}><span><span>{row.action}</span>{RULE_PLACES[row.key] ? <span className={styles.eventHelp}>Set under <HelpLink href={RULE_PLACES[row.key]!.href} testId={`may-link-${row.key}`}>{RULE_PLACES[row.key]!.label}</HelpLink></span> : null}</span></span>
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
          ))}
        </div>
        {backupName ? <span className={styles.settingHelp} data-testid="backup-line">{backupName} is the backup approver: approves quotes and publishes templates as an Owner or an Admin does (<HelpLink href="/settings?section=quotes#backup-approver">Settings › Quotes & pricing</HelpLink>).</span> : null}
      </div>
    </section>
  )
}
