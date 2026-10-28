'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useMemo, useState } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { HelpLink } from '@/components/company/help-link'
import { setScheduleRules, setTypeDefault } from '@/app/projects/schedule-actions'
import { setScheduleDefaults } from '@/app/projects/ending-actions'   // (one-home N-11) the studio default, Schedule defaults' own action
import { PROJECT_TYPES } from '@/lib/projects/model'
import { ALERT_DAYS_MAX, ALERT_DAYS_MIN, leadWords, type ScheduleRules, type TypeDefaults } from '@/lib/projects/schedule-rules'
import s from '@/app/settings/settings.module.css'
import u from './schedule-settings.module.css'

const QUOTE = 'The signed quote’s stages'
const PROPERTY = 'The property type’s ready-made schedule'
const FOLLOWS = 'Same as the studio default'   // (one-home N-11) a type with no pick of its own — stored 'auto', or a template since deleted
const DAYS = Array.from({ length: ALERT_DAYS_MAX - ALERT_DAYS_MIN + 1 }, (_, i) => leadWords(i + ALERT_DAYS_MIN))

/**
 * (gaps build, package C — 3 · 8 · 15; the report 26-… §3 · §5, 1.0's Workflow rules and Proactive Alerts) Settings › Projects › Schedule —
 * the event table of Updates' card (the card table, REG-727) for the two approvals, both off until the studio turns them on: *Milestone
 * completion needs approval* and *Schedule changes need approval before the client sees them*; then the alerts' lead time (1–30 days, three by
 * default) and where a schedule starts for each project type (the Won step's three). Each saves as it is changed, with Undo; a refusal puts
 * it back and says why. Owners and Admins change it; everyone else reads it in the module's read-only scope.
 * (one-home N-11) "Where does a schedule start?" is asked once: the Schedule defaults card (Projects round 7, Q-12) is folded in here as the
 * **Studio default** row, above the project types. A type with no pick of its own shows the studio default's answer, "Same as the studio
 * default" under it, and follows it when it changes — the stored 'auto' still resolves as it did (`startPick`); picking the studio default's
 * answer on a type puts it back on the default. No "As Schedule defaults says" option any more.
 */
export function ScheduleSettings({ rules, typeDefaults, templates, studioTemplate, canManage, approvals = true }: { rules: ScheduleRules; typeDefaults: TypeDefaults; templates: { id: string; name: string }[]
  /** (one-home N-11) the studio default — a schedule template's id, or null for the signed quote's stages (`setScheduleDefaults`) */ studioTemplate: string | null; canManage: boolean
  /** (simplify S-20) false on Settings › Projects: the two approvals sit in What waits for an Owner or an Admin */ approvals?: boolean }) {
  const snackbar = useSnackbar()
  const [value, setValue] = useState<ScheduleRules>(rules)
  const [seen, setSeen] = useState(rules)
  if (seen !== rules) { setSeen(rules); setValue(rules) }
  const [types, setTypes] = useState<TypeDefaults>(typeDefaults)
  const [studio, setStudio] = useState<string | null>(studioTemplate)
  const [seenStudio, setSeenStudio] = useState(studioTemplate)
  if (seenStudio !== studioTemplate) { setSeenStudio(studioTemplate); setStudio(studioTemplate) }
  const [busy, setBusy] = useState(false)
  /* one label per template, in the library's order; a repeated name takes its count (Schedule defaults' rule, E-30) */
  const labels = useMemo(() => {
    const n = new Map<string, number>()
    return templates.map((t) => { const k = (n.get(t.name) ?? 0) + 1; n.set(t.name, k); return { id: t.id, label: k === 1 ? t.name : `${t.name} (${k})` } })
  }, [templates])
  /** The studio default as its select names it; a template since deleted reads as the signed quote's stages, as `startPick` resolves it. */
  const studioLabel = (studio && labels.find((t) => t.id === studio)?.label) || QUOTE
  /** A type's own pick as its select names it — null while it follows the studio default. */
  const ownLabel = (c: string | undefined): string | null => (!c || c === 'auto' ? null : c === 'quote' ? QUOTE : c === 'property' ? PROPERTY : labels.find((t) => t.id === c)?.label ?? null)
  /** A type's pick: the studio default's answer puts it back on the default ('auto'). */
  const choiceOf = (label: string) => (label === studioLabel ? 'auto' : label === QUOTE ? 'quote' : label === PROPERTY ? 'property' : labels.find((t) => t.label === label)?.id ?? 'auto')
  const startWords = (label: string) => (label === PROPERTY ? 'its property type’s ready-made schedule' : label === QUOTE ? 'the signed quote’s stages' : label)

  const save = async (patch: Partial<ScheduleRules>, prev: ScheduleRules, words: string, undo = false) => {
    if (busy) return
    setValue((v) => ({ ...v, ...patch })); setBusy(true)
    try {
      const r = await setScheduleRules(patch)
      if ('error' in r) { setValue(prev); snackbar({ message: couldnt('change the rule', refusalOf(r.error)) }); return }
      setValue(r)
      if (!undo) snackbar({ key: 'schedule-rules', message: words, actionLabel: 'Undo', onAction: () => { void save(prev, r, '', true) } })
    } catch (e) { setValue(prev); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const saveType = async (type: string, next: string, prev: string, undo = false) => {
    if (next === prev || busy) return
    setTypes((t) => ({ ...t, [type]: next })); setBusy(true)
    try {
      const r = await setTypeDefault({ type, choice: next })
      if ('error' in r) { setTypes((t) => ({ ...t, [type]: prev })); snackbar({ message: couldnt('change where schedules start', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: `schedule-type-${type}`, message: next === 'auto' ? `A ${type.toLowerCase()} starts from the studio default — ${startWords(studioLabel)}` : `A ${type.toLowerCase()} starts from ${startWords(ownLabel(next) ?? studioLabel)}`, actionLabel: 'Undo', onAction: () => { void saveType(type, prev, next, true) } })
    } catch (e) { setTypes((t) => ({ ...t, [type]: prev })); snackbar({ message: couldnt('change where schedules start', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  /** (one-home N-11, was Schedule defaults — fix-E E-30 · E-15) The studio default saves as it is picked, by the template's id, with Undo; a
      refusal puts it back and says why. */
  const saveStudio = async (next: string | null, prev: string | null, undo = false) => {
    if (next === prev || busy) return
    setStudio(next); setBusy(true)
    try {
      const r = await setScheduleDefaults({ templateId: next })
      if ('error' in r) { setStudio(prev); snackbar({ message: couldnt('change the studio default', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: 'schedule-defaults', message: `The studio default is now ${startWords((next && labels.find((t) => t.id === next)?.label) || QUOTE)}`, actionLabel: 'Undo', onAction: () => { void saveStudio(prev, next, true) } })
    } catch (e) { setStudio(prev); snackbar({ message: couldnt('change the studio default', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const approvalsLock = usePlanLock('internal_approvals')   // (pending modules S19) approvals are Pro: off on Free, a change opens the lock
  const row = (key: 'completionApproval' | 'shareApproval', label: string, help: string, on: string, off: string) => (
    <div className={s.eventRow} role="row" data-testid={`schedule-rule-${key}`}>
      <span role="cell" className={s.eventName}>
        <Icon name="approval" size={20} weight={300} />
        <span><span>{label}</span><span className={s.eventHelp}>{help}</span></span>
      </span>
      <span role="cell" className={s.eventWho} data-label="Who approves">Owners and Admins</span>
      <span role="cell" className={s.eventCol} data-label="On">
        <Switch size="sm" isSelected={value[key]} isDisabled={!canManage || busy} onChange={(v: boolean) => { if (approvalsLock.locked) { approvalsLock.open(); return } void save({ [key]: v }, value, v ? on : off) }} aria-label={label} />
      </span>
    </div>
  )
  return (
    <div className={s.setting} id="schedule-settings" data-testid="schedule-settings">
      <div className={s.settingHead}>
        <span className={s.settingTitle}>Schedule</span>
        <span className={s.settingHelp}>{approvals ? 'Who approves a schedule’s changes, how far ahead the team hears of what is due, and where each kind of job’s schedule starts.' : 'How far ahead the team hears of what is due, and where each kind of job’s schedule starts.'}</span>
      </div>
      {!approvals ? <span className={s.settingHelp} data-testid="schedule-approvals-pointer">Switched under Approvals, above.</span>   /* (the calm UI build 2026-10-27, 5-33 · W-645 — B5's request) the card above is "Approvals"; whether Done and schedule changes wait is a row of it */ : (
      <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="Schedule approvals" data-card-table="">
        <div className={s.eventHead} role="row">
          <span role="columnheader">Rule</span><span role="columnheader">Who approves</span><span role="columnheader" className={s.eventCol}>On</span>
        </div>
        {row('completionApproval', 'Milestone completion needs approval', 'A Designer’s or a Manager’s Done waits for an Owner or an Admin; theirs is done at once. Off, anyone on the team marks a milestone done.',
             'A Designer’s or a Manager’s Done now waits for an Owner or an Admin', 'Anyone on the team now marks a milestone done')}
        {row('shareApproval', 'Schedule changes need approval before the client sees them', 'A Designer’s or a Manager’s Share changes asks an Owner or an Admin, who shares it or sends it back. Off, the team shares at once.',
             'A Designer’s or a Manager’s schedule changes now wait for an Owner or an Admin', 'The team now shares schedule changes at once')}
      </div>
      )}
      <div className={u.grid}>
        <TextField label="Alerts lead time" mode="select" value={leadWords(value.alertDays)} options={DAYS} disabled={!canManage || busy}
                   onChange={(v) => { const d = Number(v.split(' ')[0]); if (d && d !== value.alertDays) void save({ alertDays: d }, value, `The team now hears ${leadWords(d)} before a milestone ends or a project task is due`) }}
                   helper="How far ahead the bell says a milestone ends or a project’s task is due." />
      </div>
      {/* (one-home N-11) One place for "where does a schedule start?": the studio default, then each project type. */}
      <div className={s.settingHead} id="schedule-start">
        <span className={s.reasonLabel}>Where a schedule starts, by project type</span>
        <span className={s.settingHelp}>Where Set up the schedule starts on a project: the studio default, unless the project’s type picks its own. Every milestone can be changed afterwards. Templates live in <HelpLink href="/company/templates/schedules" testId="schedule-templates-link">Company › Templates › Project schedules</HelpLink>, the ready-made ones (HDB BTO, HDB resale, Condo, Landed, Commercial fit-out) among them, to change like your own.</span>
      </div>
      <div className={u.grid} data-testid="schedule-studio-default">
        <TextField label="Studio default" mode="select" value={studioLabel} options={[QUOTE, ...labels.map((t) => t.label)]} disabled={!canManage || busy}
                   onChange={(v) => { void saveStudio(v === QUOTE ? null : labels.find((t) => t.label === v)?.id ?? null, studio) }}
                   helper={studioLabel !== QUOTE ? 'A project with no signed quote starts here too' : 'A project with no signed quote starts from the ready-made schedule for its property type, else the first template'} />
      </div>
      <div className={u.grid} data-testid="schedule-type-defaults">
        {PROJECT_TYPES.map((t) => {
          const own = ownLabel(types[t])
          return (
            <TextField key={t} label={t} mode="select" value={own ?? studioLabel} options={[QUOTE, PROPERTY, ...labels.map((x) => x.label)]} disabled={!canManage || busy}
                       helper={own ? undefined : FOLLOWS} onChange={(v) => { void saveType(t, choiceOf(v), types[t] ?? 'auto') }} />
          )
        })}
      </div>
    </div>
  )
}
