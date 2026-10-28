'use client'

import type { MouseEvent } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { displayDate } from '@/lib/format'
import type { ComplianceAnswer, ComplianceItem, ComplianceState, ComplianceTask } from '@/lib/compliance/model'
import styles from './compliance.module.css'

export const TIMING: Record<ComplianceItem['timing'], string> = { before_permit: 'Before the permit is applied for', before_start: 'Before works start', during_works: 'While the works run', on_completion: 'When the works are done' }

/**
 * (gaps build I, I-Q9 · I-Q10 · I-Q12) One checklist item on the card table — the project's Compliance tab and the Navigator's Rules by home
 * draw the same row: the mark (to do · done · not needed), the title over its chips (Mandatory / Recommended while to do, else the answer)
 * with the authority and who answered and when, Details opening in place under it — what to do, the steps, the rule it comes from, the
 * penalty in the warning tone and the official source. A project's row adds Mark done and ⋮; the Navigator's reads only.
 */
export function ItemRow({ item, answer, task, open, fresh, onToggle, onDone, onMenu, menuOpen, busy, mayChange }: {
  item: ComplianceItem
  /** The project's answer — none on the Navigator, none while to do. */
  answer?: ComplianceAnswer | null
  task?: ComplianceTask | null
  open: boolean
  fresh?: boolean
  onToggle: () => void
  /** A project's Mark done; absent on the Navigator. */
  onDone?: () => void
  onMenu?: (e: MouseEvent<HTMLButtonElement>) => void
  menuOpen?: boolean
  busy?: boolean
  mayChange?: boolean
}) {
  const state: ComplianceState = answer?.state ?? 'todo'
  const project = !!onMenu
  /* (simplify round 2) a project's row is a row of its group's card table, under `ItemHead` — the item · Mark done · ⋮ (its detail a cell
     spanning them); the Navigator's row, one column that only reads, stays an item of its list */
  const cell = 'cell'   // (simplify round 2) the Navigator's rule list is a card table with its head too — rows and cells on both
  return (
    <div className={styles.row} role="row" data-item={item.id} data-state={state} data-fresh={fresh ? '' : undefined} data-kb-row="" data-kb-id={item.id} data-testid="compliance-item" data-read={project ? undefined : ''}>
      <div className={styles.item} role={cell}>
        <span className={styles.mark} data-state={state} aria-hidden>
          <Icon name={project ? (state === 'todo' ? 'radio_button_unchecked' : 'check_circle') : 'verified_user'} size={20} fill={state === 'done'} weight={state === 'not_needed' || !project ? 300 : 400} />
        </span>
        <span className={styles.itemText}>
          {/* (the calm UI build 2026-10-27, 3-29 · W-513) the title opens the item's detail in place — the "Details ▾" link on every row is gone */}
          <button type="button" className={styles.itemOpen} aria-expanded={open} onClick={onToggle} data-kb-open="" data-testid="compliance-details">
            <span className={styles.itemTitle}>{item.title}</span><Icon name={open ? 'expand_less' : 'expand_more'} size={16} className={styles.itemChev} />
          </button>
          <span className={styles.meta}>
            {/* (the calm UI build 2026-10-27, 3-29 · T-06) capitals only for a state: Done / Not needed keep their tag; a to-do's level is words —
                "Required" (the line's own word for Mandatory) or "Recommended" */}
            {state === 'todo' ? <span className={styles.level} data-level={item.level}>{item.level === 'mandatory' ? 'Required' : 'Recommended'}</span>
              : <MetaChip color={state === 'done' ? 'green' : 'default'}>{state === 'done' ? 'Done' : 'Not needed'}</MetaChip>}
            <span>{item.authority}</span>
            {answer ? <span data-testid="compliance-who">{`${answer.by ? `${answer.by} · ` : ''}${displayDate(new Date(answer.at))}`}</span> : null}
            {task ? <span>{task.done ? 'Its task is done' : 'Has a task'}</span> : null}
          </span>
        </span>
      </div>
      {project ? (
        <>
          <span className={styles.press} role="cell">
            {mayChange && state === 'todo' && onDone ? (
              /* (the calm UI build 2026-10-27, 3-19 · W-253) one Mark done look in every list — the Schedule's outlined "Mark done" */
              <Button size="sm" variant="primary" appearance="outlined" isDisabled={busy} onPress={onDone} data-testid="compliance-done">Mark done</Button>
            ) : null}
          </span>
          <span className={styles.menuWrap} role="cell">
            <Tooltip label="More actions" disabled={menuOpen}>
              <IconButton icon="more_vert" label={`More actions for ${item.title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenu} data-testid="compliance-menu" />
            </Tooltip>
          </span>
        </>
      ) : null}
      {open ? (
        <div className={styles.detail} role={cell} data-testid="compliance-detail">
          <p className={styles.about}>{item.about}</p>
          {item.steps.length ? <ul className={styles.steps}>{item.steps.map((s, i) => <li key={i}>{s}</li>)}</ul> : null}
          <div className={styles.facts}>
            <span className={styles.fact}><span className={styles.factLabel}>Authority</span><span className={styles.factValue}>{item.authority}</span></span>
            <span className={styles.fact}><span className={styles.factLabel}>When</span><span className={styles.factValue}>{TIMING[item.timing]}</span></span>
            {item.reference ? <span className={styles.fact}><span className={styles.factLabel}>Reference</span><span className={styles.factValue}>{item.reference}</span></span> : null}
          </div>
          {item.penalty ? <div className={styles.penalty}><Icon name="warning" size={18} /><span>{item.penalty}</span></div> : null}
          <a className={styles.source} href={item.source} target="_blank" rel="noreferrer">{`Source: ${item.authority}`}<Icon name="open_in_new" size={16} /></a>
        </div>
      ) : null}
    </div>
  )
}

/**
 * (simplify round 2 — his "fix all the pending things" 2026-10-09; the card table's anatomy, REG-727) The head of a project's group of items:
 * the card table's 40 head on the grey fill, naming its columns — the item, then its two action columns (Mark done · ⋮) named for a screen
 * reader and drawn as nothing (Settings' rule, the handover checklist's). Gone on a phone, where the row stacks (compliance.module.css).
 */
export function ItemHead({ label = 'Item', actions = true }: { label?: string
  /** (simplify round 2) the Navigator's read-only rule list has no action columns — its head names the rule alone */ actions?: boolean } = {}) {
  return (
    <div className={styles.head} role="row" data-testid="compliance-head">
      <span role="columnheader">{label}</span>
      {actions ? <span role="columnheader" className={styles.actionsHead}><span className={styles.srOnly}>Mark done</span></span> : null}
      {actions ? <span role="columnheader" className={styles.actionsHead}><span className={styles.srOnly}>More actions</span></span> : null}
    </div>
  )
}
