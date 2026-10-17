'use client'

import type { RefObject } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { displayDate } from '@/lib/format'
import { HOLD_ENDED, ON_HOLD_START } from '@/lib/projects/hold'
import { STAGE_LABEL, type ProjectStage } from '@/lib/projects/model'
import ddStyles from '@/components/leads/stage-dropdown.module.css'
import styles from './stage-menu.module.css'

/*
 * (parity P-08 · A-04 · D-01 · D-15, the owner's pick 2026-10-08) A project's stage is the lead's control, not a chip: the header's
 * "Stage: In progress ▾" opens the stage menu drawn as the lead's (StageDropdown, 780:86452 — the Active / Inactive groups with their dots,
 * the current row in the Selected fill with "current" at its end, the green check on a stage passed), on the house PortalMenu (a bottom sheet
 * titled "Move stage" on a phone, REG-353). Each row runs its flow — Start the project · Complete handover · Put on hold / Resume · Reopen —
 * and a row that can't be chosen says why in its second line (REG-728). Q-24: each flow's dialog keeps its own title. The Overview's
 * "Project stages" rows open the same flows (the frame's `openStep` beside `runStage`, components/projects/project-frame.tsx); `stageRow` is
 * pure, so any surface that lists the stages can read the same answers and refusals.
 */

/** What a stage row runs. `changeHold`: the current On hold row reopens the hold to change its reason or its date. */
export type ProjectStageMove = 'start' | 'complete' | 'review' | 'reopen' | 'hold' | 'changeHold' | 'resume'
export type ProjectStageRow = ProjectStage | 'on_hold'

/** Where the project stands and who is looking — every row's state is read from these. */
export type ProjectStageFacts = {
  stage: ProjectStage
  held: boolean
  startedAt: number | null
  /** The project's change rule (its team, Owners and Admins): Start the project · Put on hold · Resume. */
  mayChange: boolean
  /** The ending's rules (lib/projects/handover-model.ts): the handover is the team's; Reopen is the Owners' and Admins'. */
  mayHandover: boolean
  runs: boolean
  /** A handover is waiting for an Owner's or an Admin's review — whoever reviews opens it as a review. */
  requested: boolean
}
export type ProjectStageRowState = { label: string; move: ProjectStageMove | null; why: string | null; current: boolean; done: boolean }

/** The refusals' words — the project menu's own (components/projects/project-menu.tsx), so a rule reads the same wherever it is refused. */
export const TEAM_RULE = 'the project’s team, Owners or Admins'
export const RUNS_RULE = 'Owners or Admins'
const ORDER: Record<ProjectStage, number> = { setting_up: 0, in_progress: 1, completed: 2 }
export const PROJECT_STAGE_ROWS: readonly ProjectStageRow[] = ['setting_up', 'in_progress', 'completed', 'on_hold']

/** The header button's word: where the project is — On hold while it waits, as a parked lead's button reads "Stage: On Hold". */
export const stageWord = (f: Pick<ProjectStageFacts, 'stage' | 'held'>): string => (f.held ? 'On hold' : STAGE_LABEL[f.stage])

/** One row of the stage menu from where the project stands. Pure: the Overview's Project stages rows read the same answers. */
export function stageRow(row: ProjectStageRow, f: ProjectStageFacts): ProjectStageRowState {
  if (row === 'on_hold') {
    if (f.held) return { label: 'On hold', move: f.mayChange ? 'changeHold' : null, why: null, current: true, done: false }
    const why = f.stage === 'completed' ? HOLD_ENDED : !f.mayChange ? TEAM_RULE : null
    return { label: 'On hold', move: why ? null : 'hold', why, current: false, done: false }
  }
  const label = STAGE_LABEL[row]
  const at = ORDER[f.stage], me = ORDER[row]
  if (me === at) {
    if (!f.held) return { label, move: null, why: null, current: true, done: false }
    /* on hold: the stage it waits in — pressing it resumes there (a parked lead resumes by picking its stage) */
    return { label, move: f.mayChange ? 'resume' : null, why: f.mayChange ? null : TEAM_RULE, current: false, done: true }
  }
  if (me < at) {
    /* a passed stage keeps its check; In progress is the way back from Completed (Reopen) — Setting up is never gone back to */
    if (row === 'in_progress') return { label, move: f.runs ? 'reopen' : null, why: f.runs ? null : RUNS_RULE, current: false, done: true }
    return { label, move: null, why: f.startedAt ? `Started ${displayDate(new Date(f.startedAt))}` : 'The project has started', current: false, done: true }
  }
  if (row === 'in_progress') {
    const why = f.held ? ON_HOLD_START : !f.mayChange ? TEAM_RULE : null
    return { label, move: why ? null : 'start', why, current: false, done: false }
  }
  /* Completed: the handover — from In progress only (a hold ends with the project) */
  if (f.stage === 'setting_up') return { label, move: null, why: 'Start the project first', current: false, done: false }
  return { label, move: f.mayHandover ? (f.requested && f.runs ? 'review' : 'complete') : null, why: f.mayHandover ? null : TEAM_RULE, current: false, done: false }
}

/** The header's Stage button — the lead's (Button + chevron that turns while open, `data-kb="move-stage"`, key M, the "Move stage" tooltip). */
export function ProjectStageButton({ word, open, anchor, onPress }: { word: string; open: boolean; anchor: RefObject<HTMLSpanElement | null>; onPress: () => void }) {
  return (
    <span className={`${styles.anchor} ${styles.stageAction}`} ref={anchor} data-kb="move-stage" data-testid="project-stage">
      <Tooltip label="Move stage" shortcut="move-stage" disabled={open}>
        <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={open} onPress={onPress}
                iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}>
          Stage: {word}
        </Button>
      </Tooltip>
    </span>
  )
}

/** The stage menu under the button: Active (Setting up · In progress · Completed) and Inactive (On hold). */
export function ProjectStageMenu({ open, anchor, onClose, facts, onPick }: {
  open: boolean
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  facts: ProjectStageFacts
  onPick: (move: ProjectStageMove) => void
}) {
  const item = (r: ProjectStageRow) => {
    const s = stageRow(r, facts)
    return (
      <DropdownItem key={r} disabled={!!s.why} title={s.why ?? undefined} selected={s.current} meta={s.current ? 'current' : undefined}
                    onSelect={() => { onClose(); if (s.move) onPick(s.move) }}>
        <span className={ddStyles.itemText} data-testid={`project-stage-row-${r}`}>{s.label}</span>
        {s.done ? <span className={ddStyles.done} aria-hidden><Icon name="check_circle" size={20} fill /></span> : null}
      </DropdownItem>
    )
  }
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} width={MENU_WIDTH.wide} role="menu" sheetTitle="Move stage">
      <DropdownLabel tone="green" dot>Active</DropdownLabel>
      {item('setting_up')}{item('in_progress')}{item('completed')}
      <DropdownDivider />
      <DropdownLabel tone="orange" dot>Inactive</DropdownLabel>
      {item('on_hold')}
    </PortalMenu>
  )
}
