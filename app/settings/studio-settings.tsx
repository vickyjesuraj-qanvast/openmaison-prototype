'use client'

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { Drawer } from '@/components/om/drawer'
import { AREA_LABEL, permissionGroups, permissionRows, REACH_LABEL, ROLE_COLUMNS, RULE_PLACES, type RoleColumn, type StudioRules } from '@/lib/settings/permissions'
import { ROLES_ROW, WHO_MAY_HELP, studioHelp } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import { ModuleHead, ModuleRelated } from './module-head'
import { HelpLink } from '@/components/company/help-link'
import styles from './settings.module.css'
import own from './studio-settings.module.css'   // (parity P-38) the groups' captions


export type TeamMember = { id: string; name: string; role: string; color: string; isYou: boolean; managerId: string | null; isActive: boolean }

/** (the calm UI build 2026-10-27, 5-04) The role the list opens on — the one a studio owner most often asks about. */
export const ROLES_FIRST: RoleColumn = 'Designer'

/**
 * (REG-645, settings parity Q-03 · Q-04) Settings › Studio — 1.0's Accounts › Studio group on 2.0's pieces: **Who may do what** — the four
 * roles against every action the app checks, computed from the rules themselves (`permissionRows`). (parity map, FB-114) Five, with Accounting. Nothing here is edited; Studio Health
 * stays out (the platform's telemetry, Q-16).
 * (one-home N-06) The read-only Team and Issuing entities cards are gone — they copied Company › Members and Company › Profile, which hold
 * those records; the module's Related line opens them, with the way back here.
 * (pending modules S14 — card held:settings-company, as recommended) **Roles & access**: the module is named for what it holds, and **Who sees
 * leads** moved in from Lead management — it decides who sees a lead and everything on it (its project, quotes, contracts, files, X-Ray
 * readings, Qanvast Ops), so it sits beside the table whose rows it changes: a pick shows at once in *See a lead* / *See a project*.
 * (the calm UI build 2026-10-27, 5-04 · T-14 — "Who may do what draws a ~120-row × 6-role matrix on the page (8,123 px tall)") The module
 * keeps its two decisions on the page; the table is ONE row — *What each role can do*, the six roles named, *See the list* — which opens it
 * in the house Drawer (`widest`, a bottom sheet on a phone): the roles as Chips with their active counts ("Designer · 3"), one role at a time — and All roles, side by side as the page drew them —
 * the rows grouped by area as before, each *Set under …* a link (a press on one closes the list). Every row and every answer is kept, with its
 * test id and `data-reach`; the table keeps its name ("Who may do what"). `#studio-roles` (⌘K, 1.0's Roles & Permissions address) opens it.
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
  const groups = permissionGroups(permissionRows(rules))   // (parity P-38) grouped by area, in Settings' module order
  const active = team.filter((m) => m.isActive)   // (REG-646) deactivated: counted nowhere
  const counts = Object.fromEntries(ROLE_COLUMNS.map((r) => [r, active.filter((m) => m.role === r).length])) as Record<string, number>
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<RoleColumn | 'all'>(ROLES_FIRST)
  const shown: readonly RoleColumn[] = role === 'all' ? ROLE_COLUMNS : [role]
  /* an address that names the list (#studio-roles — ⌘K's card, 1.0's Roles & Permissions) opens it once the card is in view */
  useEffect(() => {
    if (window.location.hash !== '#studio-roles') return
    const t = setTimeout(() => setOpen(true), 0)
    return () => clearTimeout(t)
  }, [])
  /* a *Set under …* link inside the list lands on its card: the list steps aside for it */
  const closeOnLink = (e: MouseEvent) => { if ((e.target as Element | null)?.closest?.('a[href]')) setOpen(false) }
  const roleLabel = (r: string) => `${r}${counts[r] ? ` · ${counts[r]}` : ''}`
  return (
    <section className={styles.panel} aria-labelledby="settings-studio-title" data-testid="settings-studio">
      <ModuleHead id="settings-studio-title" title="Roles & access" help={studioHelp(studioName)} readOnly={readOnly} />
      {setup}
      {visibility}
      {costs}

      <div className={styles.setting} id="studio-roles" data-testid="studio-roles">
        <div className={styles.settingHeadRow}>
          <div className={styles.settingHead}>
            <span className={styles.settingTitle}>{ROLES_ROW.title}</span>
            <span className={styles.settingHelp}>{ROLE_COLUMNS.join(', ')}</span>
          </div>
          <Button appearance="text" onPress={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} data-testid="studio-roles-open">{ROLES_ROW.open}</Button>
        </div>
        {backupName ? <span className={styles.settingHelp} data-testid="backup-line">{backupName} is the backup approver: approves quotes and publishes templates as an Owner or an Admin does (<HelpLink href="/settings?section=quotes#backup-approver">Settings › Quotes & pricing</HelpLink>).</span> : null}
      </div>

      <ModuleRelated section="studio" />

      <Drawer open={open} onClose={() => setOpen(false)} title={ROLES_ROW.drawer} width="widest" label={ROLES_ROW.drawer}>
        <div className={own.list} onClickCapture={closeOnLink} data-testid="studio-roles-list">
          <p className={styles.settingHelp}>{WHO_MAY_HELP.lead}<HelpLink href="/company/members">{WHO_MAY_HELP.link}</HelpLink>{WHO_MAY_HELP.end}</p>
          {/* one role at a time — and every role side by side (All roles), as the page's table drew them */}
          <Chips label={ROLES_ROW.roles} options={[...ROLE_COLUMNS.map((r) => ({ value: r, label: roleLabel(r) })), { value: 'all', label: ROLES_ROW.all }]} value={role} onChange={(v) => setRole(v as RoleColumn | 'all')} testId="studio-roles-role" />
          <div className={role === 'all' ? own.allScroll : undefined}>
          <div className={role === 'all' ? `${styles.eventTable} ${styles.roleTable} ${own.all}` : `${styles.eventTable} ${own.one}`} role="table" aria-label="Who may do what" data-card-table="">   {/* (parity map, FB-114) · (the calm UI build) */}
            <div className={styles.eventHead} role="row">
              <span role="columnheader">Action</span>
              {shown.map((r) => <span key={r} role="columnheader" className={styles.eventCol}>{roleLabel(r)}</span>)}
            </div>
            {groups.map((g) => (
              /* (parity P-38) one group per area, opened by its caption — the card table's head band across the row */
              <div key={g.area} role="rowgroup" aria-label={AREA_LABEL[g.area]} data-testid={`may-group-${g.area.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                <div className={own.group} role="row"><span role="cell" aria-colspan={shown.length + 1}>{AREA_LABEL[g.area]}</span></div>
                {g.rows.map((row) => {
                  return (
                    <div key={row.key} className={styles.eventRow} role="row" data-testid={`may-${row.key}`}>
                      {/* (Dane UAT 2.23 · 10.08) A rule the studio can change says where, as a link that lands on it (with Back here, REG-465). */}
                      <span role="cell" className={styles.eventName}><span><span>{row.action}</span>{RULE_PLACES[row.key] ? <span className={styles.eventHelp}>Set under <HelpLink href={RULE_PLACES[row.key]!.href} testId={`may-link-${row.key}`}>{RULE_PLACES[row.key]!.label}</HelpLink></span> : null}</span></span>
                      {shown.map((r) => {
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
                  )
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      </Drawer>
    </section>
  )
}
