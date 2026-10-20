'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { moduleLinks, settingsHref } from '@/lib/settings/modules'
import { PROJECTS_MONEY_POINTER, PROJECTS_VISIBILITY_POINTER, PROJECT_NUMBERS_HELP, PROJECT_NUMBER_HELPERS, projectsModuleHelp } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import { VISIBILITY_HREF } from '@/lib/settings/types'   // (pending modules S14)
import { HelpLink } from '@/components/company/help-link'
import { Button, Switch } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { ReadOnlyScope } from '@/components/om/read-only'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { LeaveGuard } from '@/components/company/leave-guard'
import { formatProjectNumber, nextProjectSeq, type ProjectNumbering } from '@/lib/projects/model'
import { setProjectNumbering } from './actions'
import { HandoverSetting } from '@/components/projects/ending/handover-setting'   // (Projects round 7)
import { ScheduleSettings } from '@/components/projects/schedule/schedule-settings'   // (gaps build, package C)
import type { ScheduleRules, TypeDefaults } from '@/lib/projects/schedule-rules'
import { ModuleHead } from './module-head'
import { TicketCategoriesSetting, type TicketCategoriesData } from '@/components/projects/tickets/ticket-categories-setting'   // (gaps build H)
import { WorkloadComplianceSettings } from '@/components/projects/workload/workload-settings'   // (gaps build I)
import { OwnerApprovals, type OwnerApprovalsData } from './owner-approvals'   // (simplify S-20)
import { StartRuleSetting } from '@/components/projects/start-rule-setting'   // (S44R, C7)
import type { ProjectStartsWhen } from '@/lib/projects/start-rule'
import styles from './settings.module.css'

/**
 * (REG-921, Projects round 1) Settings › Projects — live with one card: Project numbers, on the Quote numbers card's grammar (REG-561): the
 * prefix, the next number and the digits, the year switch under them, the live example of the next project's number, Discard · Save.
 * (Projects round 7) The module in full, in the house order: Numbers · Stages and handover · Updates · Invoices and payments · Schedule
 * defaults — every card on the module's two grammars (the event table for a rule, the numbering card for a pattern). Owners and Admins change
 * it (each action checks `runsStudio`); everyone else reads it in the read-only scope.
 * (one-home N-11) Schedule defaults is no longer a card of its own: the studio default is the first row of the Schedule card's "Where a
 * schedule starts, by project type". (one-home N-12) The Credit notes card came here from Settings › Finance, after the invoice cards — the
 * money-in paperwork's numbers in one module.
 * (simplify S-15 · S-20 — his "build everything" 2026-10-09, a deliberate change) The module opens on **What waits for an Owner or an Admin**
 * (owner-approvals.tsx): updates (and who reviews them), invoices, a milestone's Done, schedule changes, the handover, and the link to
 * Finance's PO and expense rules — every approval together, each switch set there only (the Updates card, whose one rule it was, is gone).
 * The money cards — Invoices · Invoice paper · Client payments · Credit notes — moved to Settings › Finance beside Costs and Commission (an
 * old address to one of them lands there); a line under the head points there. Settings › Projects keeps project numbers, the handover,
 * the schedule, tickets, workload and compliance.
 */
export function ProjectsSettings({ numbering, numbers, studio, canManage, approvals, ending, tickets, gapsI, startsWhen = 'quote' }: { numbering: ProjectNumbering; numbers: string[]; studio: string; canManage: boolean
  /** (S44R — UAT row 358, call C7) when a project starts: the quote is signed (today's) · the agreement is signed */ startsWhen?: ProjectStartsWhen
  /** (simplify S-20) the studio's approvals, together: updates (+ reviewers), invoices, Done, shares, handover, and money out's two (read) */ approvals: OwnerApprovalsData
  /** (gaps build H, H-Q8) the ticket categories and how many tickets hold each */ tickets?: TicketCategoriesData
  /** (Projects round 7) Stages and handover's review rule; the studio default's template (one-home N-11: the Schedule card's first row) and the library to pick from */ ending?: { handoverReview: boolean; scheduleTemplate: string | null; templates: { id: string; name: string }[]; /** (gaps build, package C) */ schedule?: { rules: ScheduleRules; typeDefaults: TypeDefaults } }
  /** (gaps build I, I-Q3 · I-Q11) Workload's default capacity and Compliance's starter tasks */ gapsI?: { capacity: number; starterTasks: boolean } }) {
  const snackbar = useSnackbar()
  const readOnly = !canManage
  /* (parity P-38, D-17) the module says where its records live, as Lead management's does — each opens with the way back here (REG-465) */
  const here = withFrom(settingsHref('projects'), useSearchParams().get('from') ?? undefined)
  const [num, setNum] = useState<ProjectNumbering>(numbering)
  const [saved, setSaved] = useState<ProjectNumbering>(numbering)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(num) !== JSON.stringify(saved)
  const [today] = useState(() => new Date())
  const example = formatProjectNumber(num, nextProjectSeq(numbers, num), today)
  const save = async (): Promise<boolean> => {
    if (readOnly) { snackbar({ message: 'Only Owners and Admins change the project settings' }); return false }
    setBusy(true)
    try {
      const clean = await setProjectNumbering(num)
      if ('error' in clean) { snackbar({ message: couldnt('save the project numbers', refusalOf(clean.error)) }); return false }   // (fix-E, E-30) the rule, named
      setNum(clean); setSaved(clean); snackbar({ message: `The next project will be ${formatProjectNumber(clean, nextProjectSeq(numbers, clean), today)}` }); return true
    }
    catch { snackbar({ message: 'Couldn’t save the project numbers — please try again' }); return false }
    finally { setBusy(false) }
  }
  return (
    <section className={styles.panel} aria-labelledby="settings-projects-title" data-testid="settings-projects">
      <LeaveGuard dirty={!readOnly && dirty} what="the project numbers" onSave={save} onDiscard={() => setNum(saved)} />
      {/* (parity P-38 · Q-23) the head, then one line under it: who sees a project is who sees its lead — one rule, kept under (pending modules S14) Roles & access */}
      <div className={styles.sectionHead}>
        <ModuleHead id="settings-projects-title" title="Projects" help={projectsModuleHelp(studio)} readOnly={readOnly}
                    links={moduleLinks('projects', here)} />
        <span className={styles.settingHelp} data-testid="projects-visibility-pointer">{PROJECTS_VISIBILITY_POINTER.lead}<HelpLink href={VISIBILITY_HREF} testId="projects-visibility-link">{PROJECTS_VISIBILITY_POINTER.link}</HelpLink>{PROJECTS_VISIBILITY_POINTER.end}</span>   {/* (pending modules S14) its one home moved */}
        {/* (simplify S-15) the money rules' one home — a door for whoever still looks for them here */}
        <span className={styles.settingHelp} data-testid="projects-money-pointer">{PROJECTS_MONEY_POINTER.lead}<HelpLink href="/settings?section=finance" testId="projects-money-link">{PROJECTS_MONEY_POINTER.link}</HelpLink>{PROJECTS_MONEY_POINTER.end}</span>
      </div>
      <ReadOnlyScope readOnly={readOnly}>
        <OwnerApprovals data={approvals} canManage={canManage} />   {/* (simplify S-20) at the top: every approval together */}
        <div className={styles.setting} data-testid="project-numbering">
          <div className={styles.settingHead}>
            <span className={styles.settingTitle}>Project numbers</span>
            <span className={styles.settingHelp}>{PROJECT_NUMBERS_HELP}</span>
          </div>
          <div className={styles.numGrid}>
            <TextField label="Prefix" value={num.prefix} maxLength={8} onChange={(v) => setNum((n) => ({ ...n, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} helper={PROJECT_NUMBER_HELPERS.prefix} />
            <TextField label="Next number" value={num.next ? String(num.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setNum((n) => ({ ...n, next: v ? Number(v) : 0 }))} helper={PROJECT_NUMBER_HELPERS.next} />
            <TextField label="Digits" value={num.digits ? String(num.digits) : ''} numeric="digits" maxLength={1} onChange={(v) => setNum((n) => ({ ...n, digits: v ? Math.min(6, Number(v)) : 0 }))} helper={PROJECT_NUMBER_HELPERS.digits} />
          </div>
          <div className={styles.switchGroup} role="group" aria-labelledby="project-numbering-also">
            <span id="project-numbering-also" className={styles.reasonLabel}>Also in the number</span>
            <label className={styles.switchRow}><Switch size="sm" isSelected={num.year} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, year: v }))} aria-label="The year" /><span>The year <span className={styles.settingHelp}>· YYYY, the year the project is created</span></span></label>
          </div>
          <div className={styles.example}><span className={styles.settingHelp}>Next project:</span> <span className={styles.exampleNo} data-testid="project-number-example">{example}</span></div>
          {readOnly ? null : <div className={styles.settingActions}>
            <Button variant="secondary" appearance="outlined" onPress={() => setNum(saved)} isDisabled={!dirty || busy}>Discard</Button>
            <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save numbering'}</Button>
          </div>}
        </div>
        <StartRuleSetting startsWhen={startsWhen} canManage={canManage} />   {/* (S44R, C7) which signature starts a project — before its stages */}
        <HandoverSetting on={ending?.handoverReview ?? false} canManage={canManage} rule={false} />   {/* (Projects round 7) Stages and handover */}
        {ending?.schedule ? <ScheduleSettings rules={ending.schedule.rules} typeDefaults={ending.schedule.typeDefaults} templates={ending.templates} studioTemplate={ending.scheduleTemplate} canManage={canManage} approvals={false} /> : null}   {/* (gaps build, package C) the schedule's lead time, where it starts — (one-home N-11) the studio default first, then by project type */}
        {tickets ? <TicketCategoriesSetting data={tickets} canManage={canManage} /> : null}   {/* (gaps build H, H-Q8) */}
        {gapsI ? <WorkloadComplianceSettings capacity={gapsI.capacity} starterTasks={gapsI.starterTasks} canManage={canManage} /> : null}   {/* (gaps build I) Workload · Compliance */}
      </ReadOnlyScope>
    </section>
  )
}
