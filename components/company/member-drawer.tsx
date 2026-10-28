'use client'

import type { ReactNode } from 'react'
import { Button, Switch } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { TextField } from '@/components/om/text-field'
import { payNowShown } from '@/lib/finance/model'
import { parsePreferences, summarisePreferences } from '@/lib/company/preferences'
import type { MemberRow } from '@/lib/company/members'
import { MEMBER_DRAWER } from '@/lib/company/copy'
import styles from './members-view.module.css'

/**
 * (the calm UI build 2026-10-27 — 5-01, the owner's own example: "each row becomes avatar · name / email · Role select · leads · ⋮, every other
 * control moved into the ⋮ or a member drawer and still one press away") Everything about one member that is not their role, in the house
 * side panel (a bottom sheet on a phone): Details (email, the signature's state, Edit details), Leads (open to new leads, their lead
 * preferences, the most projects they run, who they report to / their team), Pay (their PayNow) and their Public profile — each control the
 * row used to draw, with its own saves (a switch or a select saves as it changes; the preferences, PayNow and details keep their dialogs).
 * The member's name on their row opens it. Presentational: the page keeps every rule, save and Undo (members-view.tsx).
 */
export function MemberDrawer({ member: m, onClose, canEdit, onLeads, mayPrefs, mayPayNow, setsCap, mayProfile, capOptions, capLabel, managers, noManager, team,
  edit, onPrefs, onAccepting, onCapacity, onManager, onPayNow, onProfile, onSignature }: {
  member: MemberRow | null
  onClose: () => void
  canEdit: boolean
  onLeads: boolean
  mayPrefs: boolean
  mayPayNow: boolean
  setsCap: boolean
  mayProfile: boolean
  capOptions: string[]
  capLabel: string
  managers: string[]
  noManager: string
  /** a Manager's team, as the row said it: "Michelle and Sarah report to them" — null for any other role */
  team: string | null
  /** Edit details: the press (opens the dialog, or Your profile for your own row), or why it is refused */
  edit: { label: string; run: () => void } | { refused: string } | null
  onPrefs: () => void
  onAccepting: (on: boolean) => void
  onCapacity: (label: string) => void
  onManager: (name: string) => void
  onPayNow: () => void
  onProfile: () => void
  onSignature: () => void
}) {
  const summary = m ? [m.specialty, summarisePreferences(parsePreferences(m.leadPreferences))].filter(Boolean).join(' · ') : ''
  return (
    <Drawer open={!!m} title={m?.name ?? ''} label={m ? MEMBER_DRAWER.label(m.name) : undefined} width="wide" onClose={onClose}>
      {m ? (
        <div className={styles.drawer} data-testid="member-drawer" data-member-id={m.id}>
          <Section title={MEMBER_DRAWER.details} action={edit && !('refused' in edit) ? <Button appearance="text" onPress={edit.run}>{edit.label}</Button> : null}>
            <dl className={styles.facts}>
              <dt>Role</dt><dd>{m.role}</dd>
              {m.email ? <><dt>Email</dt><dd className={styles.wrap}>{m.email}</dd></> : null}
            </dl>
            {/* (UX audit S11, REG-421) a signature is set by its member — the drawer says when it isn't, and the way */}
            {m.signatureKind || !onLeads ? null : (
              <p className={styles.dLine} data-testid="member-drawer-signature">
                <span>{m.isYou ? MEMBER_DRAWER.yourSignature : MEMBER_DRAWER.signatureOf(m.name)}</span>
                {m.isYou ? <Button appearance="text" onPress={onSignature}>{MEMBER_DRAWER.addSignature}</Button> : null}
              </p>
            )}
            {edit && 'refused' in edit ? <p className={styles.dNote}>{edit.refused}</p> : null}
          </Section>
          {onLeads ? (
            <Section title={MEMBER_DRAWER.leads}>
              <label className={styles.switchLabel}>
                <Switch size="sm" isSelected={m.acceptingLeads} isDisabled={!mayPrefs} aria-label={`${m.name} open to new leads`} onChange={(on: boolean) => onAccepting(on)} />
                <span>Open to new leads</span>
              </label>
              <div className={styles.dBlock} data-testid="member-prefs">
                <span className={styles.dHead}>
                  <span className={styles.dLabel}>{MEMBER_DRAWER.preferences}</span>
                  {mayPrefs ? <Button appearance="text" onPress={onPrefs} data-testid="member-prefs-edit">{summary ? 'Change' : MEMBER_DRAWER.setPreferences}</Button> : null}
                </span>
                {summary ? <span className={styles.dValue}>{summary}</span> : null}
              </div>
              {/* (one-home N-17) the most projects they run at once — the Workload view measures them against it */}
              <span className={styles.dField} data-testid="member-capacity">
                <TextField label={MEMBER_DRAWER.capacity} mode="select" size="s" options={capOptions} value={capLabel} disabled={!setsCap} onChange={onCapacity} />
              </span>
              {m.role === 'Designer' ? (
                <span className={styles.dField} data-reports-to={m.id}>
                  <TextField label="Reports to" mode="select" size="s" options={[noManager, ...managers]} value={m.reportsTo ?? noManager} disabled={!canEdit} onChange={onManager} />
                </span>
              ) : team !== null ? <p className={styles.dNote} data-testid="member-team">{team}</p> : null}
            </Section>
          ) : null}
          {mayPayNow ? (
            <Section title={MEMBER_DRAWER.pay} action={<Button appearance="text" onPress={onPayNow} data-testid="member-paynow-edit">{m.paynow ? 'Change' : 'Add PayNow'}</Button>}>
              <p className={styles.dLine} data-testid="member-paynow">
                <span className={styles.dLabel}>PayNow</span>
                <span className={styles.dValue}>{m.paynow ? payNowShown(m.paynow) : MEMBER_DRAWER.noPayNow}</span>
              </p>
            </Section>
          ) : null}
          {mayProfile ? (
            <Section title={MEMBER_DRAWER.profile} action={<Button appearance="text" onPress={onProfile}>{MEMBER_DRAWER.openProfile}</Button>}>
              <p className={styles.dLine}>{m.portalShown ? MEMBER_DRAWER.shown : MEMBER_DRAWER.notShown}</p>
            </Section>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}

function Section({ title, action, children }: { title: string; /** a text button at the title row's end (Edit details) */ action?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.dSection}>
      <span className={styles.dHead}><h3 className={styles.dTitle}>{title}</h3>{action}</span>
      {children}
    </section>
  )
}
