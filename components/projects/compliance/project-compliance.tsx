'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { EmptyState } from '@/components/om/empty-state'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import { COMPLIANCE_PHASES, groupByCategory, isCompliancePhase, tallyOf, type ComplianceAnswer, type ComplianceItem, type CompliancePhase, type ComplianceState } from '@/lib/compliance/model'
import type { ComplianceData } from '@/lib/compliance/queries'
import { setComplianceItem, undoComplianceItem } from '@/app/projects/compliance-actions'
import { ItemHead, ItemRow } from './item-row'
import { ProjectViews } from '../project-views'
import styles from './compliance.module.css'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * (gaps build I, I-Q9 · I-Q10 — 1.0's F-272…F-302: the checklist 1.0 built and never mounted) A project's Compliance tab: Singapore's checklist
 * for its kind of home, phase by phase (Design · Execution · Handover — the project's own phase first, every phase one press away), each phase's
 * items under their category on the card table. An item is To do, Done or Not needed, with who and when; pressing its title opens what to do,
 * the steps, the rule it comes from, the penalty and the official source in place. A starter task (Settings › Projects › Compliance) follows its
 * item. Every answer offers Undo; whoever may not change the project reads the list.
 * (simplify S-06 · S-03, the owner's "build everything" 2026-10-09) Compliance is Tasks' second view (`grouped`): its title is the Tasks group's
 * view switch, and — off the strip's count now — the switch says in grey what is still to do in the phase the project is in. An item and its
 * starter task stay one record with one tick, and one Activity line (lib/leads/activity.ts folds the task's twin line into the item's).
 */
export function ProjectCompliance({ data, grouped = false }: { data: ComplianceData; /** (simplify S-06) on a project page: the Tasks group's view switch in the title's place */ grouped?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const landed = params.get('item')
  const landedItem = landed ? data.items.find((i) => i.id === landed) ?? null : null
  const [phase, setPhase] = useState<CompliancePhase>(() => landedItem?.phase ?? (isCompliancePhase(params.get('phase')) ? params.get('phase') as CompliancePhase : data.phase))
  const [open, setOpen] = useState<string | null>(landedItem?.id ?? null)
  const [fresh, setFresh] = useState<string | null>(landedItem?.id ?? null)
  /* the answers as last read, with what this page changed since — a refusal puts the answer back */
  const [answers, setAnswers] = useState<Record<string, ComplianceAnswer>>(data.answers)
  const [seen, setSeen] = useState(data.answers)
  if (seen !== data.answers) { setSeen(data.answers); setAnswers(data.answers) }
  const [busy, setBusy] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const menuAnchor = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!landedItem) return
    const t = setTimeout(() => document.querySelector(`[data-item="${CSS.escape(landedItem.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400)
    const u = setTimeout(() => setFresh(null), 1800)
    return () => { clearTimeout(t); clearTimeout(u) }
  }, [landedItem])

  const tallies = useMemo(() => Object.fromEntries(COMPLIANCE_PHASES.map((p) => [p.key, tallyOf(data.items.filter((i) => i.phase === p.key), answers)])) as Record<CompliancePhase, ReturnType<typeof tallyOf>>, [data.items, answers])
  const items = data.items.filter((i) => i.phase === phase)
  const groups = groupByCategory(items)
  const t = tallies[phase]
  const toDoNow = tallies[data.phase].open   // (simplify S-06) the phase the project is in — the phase chip's own "n to do"

  const answer = (item: ComplianceItem, state: ComplianceState) => {
    if (busy) return
    const was = answers[item.id]
    setAnswers((a) => { const n = { ...a }; if (state === 'todo') delete n[item.id]; else n[item.id] = { state, by: 'You', at: Date.now() }; return n })
    setBusy(item.id)
    void setComplianceItem(data.projectId, item.id, state).then((r) => {
      setBusy(null)
      if ('error' in r) {
        setAnswers((a) => { const n = { ...a }; if (was) n[item.id] = was; else delete n[item.id]; return n })
        snackbar({ message: couldnt(state === 'done' ? 'mark it done' : state === 'not_needed' ? 'mark it not needed' : 'put it back to do', refusalOf(r.error)) })
        return
      }
      const undo = r.undo
      snackbar({ key: 'compliance', message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('put it back', () => undoComplianceItem(undo), 'Put back as it was', { refresh: true }) } })
      router.refresh()
    }, () => {
      setBusy(null)
      setAnswers((a) => { const n = { ...a }; if (was) n[item.id] = was; else delete n[item.id]; return n })
      snackbar({ message: couldnt('save the answer') })
    })
  }

  if (!data.kind) {
    return (
      <div className={styles.tab} data-testid="project-compliance">
        {grouped ? <div className={styles.bar}><ProjectViews slug="compliance" /></div> : null}
        <EmptyState icon="verified_user" title="No checklist for this property" tone="plain" testId="compliance-empty"
                    help={`Singapore’s renovation checklists cover HDB flats, condos and landed homes. ${data.propertyType === 'Others' ? 'This project’s property type is Others' : `A ${data.propertyType.toLowerCase()} isn’t one of them`} — the Compliance Navigator in Tools has the studio’s own steps.`}
                    secondary={{ label: 'Open the Compliance Navigator', icon: 'verified_user', onPress: () => router.push(withFrom('/compliance', pathname)) }} />
      </div>
    )
  }

  const menuItem = menu ? data.items.find((i) => i.id === menu) ?? null : null
  const menuState: ComplianceState = menuItem ? answers[menuItem.id]?.state ?? 'todo' : 'todo'
  const task = menuItem ? data.tasks[menuItem.id] ?? null : null

  return (
    <div className={styles.tab} data-testid="project-compliance">
      <div className={styles.bar}>
        {grouped ? <ProjectViews slug="compliance" note={`${data.kindLabel} · ${toDoNow ? `${plural(toDoNow, 'item')} to do this phase` : 'nothing to do this phase'}`} />
          : <h2 className={styles.title}>{`Compliance · ${data.kindLabel}`}</h2>}
        <div className={styles.actions}>
          <Button variant="secondary" appearance="text" iconStart={<Icon name="open_in_new" size={20} />} onPress={() => router.push(withFrom('/compliance', `${pathname}?phase=${phase}`))} data-testid="compliance-navigator">Compliance Navigator</Button>
        </div>
      </div>
      <div className={styles.lead}>
        <ChipRail label="Phase">
          <Chips label="Phase" testId="compliance-phases" value={phase} onChange={(v) => { setPhase(v as CompliancePhase); setOpen(null) }}
                 options={COMPLIANCE_PHASES.map((p) => ({ value: p.key, label: `${p.label} · ${tallies[p.key].open ? `${tallies[p.key].open} to do` : 'all answered'}` }))} />
        </ChipRail>
        <p className={styles.progress} data-testid="compliance-progress">
          <b>{`${t.answered} of ${plural(t.total, 'item')} answered`}</b>
          {` · ${t.mandatoryOpen ? `${plural(t.mandatoryOpen, 'mandatory item')} still to do` : 'every mandatory item answered'} · ${COMPLIANCE_PHASES.find((p) => p.key === phase)?.help ?? ''}`}
          {phase === data.phase ? ' · the phase this project is in' : ''}
        </p>
      </div>
      <div className={styles.groups} data-kb-list="compliance items">
        {groups.map((g) => (
          <section key={g.key} className={styles.group} aria-label={g.label} data-testid="compliance-group">
            <h3 className={styles.groupHead}>{g.label}<span className={styles.groupHelp}>{g.help}</span></h3>
            {/* (simplify round 2) the card table with its head (REG-727): the item · Mark done · ⋮, so it reads — and measures — as every card table */}
            <div className={styles.table} role="table" aria-label={g.label} data-card-table="">
              <ItemHead />
              {g.items.map((item) => (
                <ItemRow key={item.id} item={item} answer={answers[item.id] ?? null} task={data.tasks[item.id] ?? null} open={open === item.id} fresh={fresh === item.id}
                         onToggle={() => setOpen(open === item.id ? null : item.id)} onDone={() => answer(item, 'done')} busy={busy === item.id} mayChange={data.mayChange}
                         menuOpen={menu === item.id} onMenu={(e) => { menuAnchor.current = e.currentTarget; setMenu(menu === item.id ? null : item.id) }} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <PortalMenu open={!!menuItem} anchor={menuAnchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={menuItem?.title ?? 'Item'}>
        {menuItem ? (
          <>
            {data.mayChange ? (
              <>
                <DropdownItem disabled={menuState === 'done'} onSelect={() => { setMenu(null); answer(menuItem, 'done') }}>Mark done</DropdownItem>
                <DropdownItem disabled={menuState === 'not_needed'} help="It doesn’t apply to this job" onSelect={() => { setMenu(null); answer(menuItem, 'not_needed') }}>Not needed</DropdownItem>
                <DropdownItem disabled={menuState === 'todo'} onSelect={() => { setMenu(null); answer(menuItem, 'todo') }}>Back to to do</DropdownItem>
                <DropdownDivider />
              </>
            ) : null}
            {task ? <DropdownItem onSelect={() => { setMenu(null); router.push(withFrom(`${pathname.replace(/\/compliance$/, '/tasks')}?open=${encodeURIComponent(task.id)}`, pathname)) }}>Open its task</DropdownItem> : null}
            <DropdownItem onSelect={() => { setMenu(null); setOpen(menuItem.id) }}>Show details</DropdownItem>
            <DropdownItem onSelect={() => { setMenu(null); window.open(menuItem.source, '_blank', 'noopener') }}>{`Open ${menuItem.authority}’s page`}</DropdownItem>
          </>
        ) : null}
      </PortalMenu>
    </div>
  )
}
