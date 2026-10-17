'use client'

import { useState, type CSSProperties } from 'react'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { CAPACITY_MAX, CAPACITY_MIN, capacityOf, clampCapacity, workloadOf, type WorkloadLine, type WorkloadPerson } from '@/lib/projects/workload'
import { MSG } from '@/lib/forms'
import type { ProjectRow } from '@/lib/projects/model'
import styles from './workload.module.css'

const TONE = { room: 'green', full: 'yellow', over: 'red' } as const
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * (gaps build I, I-Q1…I-Q5 — 1.0's workload view, A-145…A-174, without its faults) Who carries how many running projects, against the
 * capacity the studio sets for each person. It reads the rows the list shows — its scope, Filters and search — so the two views always agree;
 * completed projects never count. One row per person (busiest first), their projects as blocks that open the project, a free slot for each
 * project they still have room for, a block past their capacity in red; the projects with no one on the team on a row of their own.
 */
export function WorkloadView({ rows, people, viewer, studioDefault, sets, onOpen, onSetCapacity, onInsights }: {
  rows: ProjectRow[]
  people: WorkloadPerson[]
  viewer: { id: string; role: string; teamIds: string[] }
  studioDefault: number
  sets: boolean
  onOpen: (r: ProjectRow) => void
  onSetCapacity: () => void
  onInsights: () => void
}) {
  const { lines, counted, completed } = workloadOf(rows, people, viewer, studioDefault)
  return (
    <div className={styles.view} data-testid="workload-view">
      <p className={styles.caption} data-testid="workload-caption">
        <span>{`Counting ${plural(counted, 'running project')} the list shows${completed ? ` · ${plural(completed, 'completed one')} left out` : ''} · a person can run ${studioDefault} unless set otherwise`}</span>
        <span className={styles.captionActions}>
          {sets ? <Button variant="primary" appearance="text" iconStart={<Icon name="tune" size={20} />} onPress={onSetCapacity} data-testid="workload-set">Set capacity</Button> : null}
          <Button variant="primary" appearance="text" iconStart={<Icon name="bar_chart_4_bars" size={20} />} onPress={onInsights} data-testid="workload-insights">Insights</Button>   {/* (parity P-21) the Leads listing's Insights glyph */}
        </span>
      </p>
      <div className={styles.card} role="list" aria-label="Workload">
        {lines.length === 0 ? <div className={styles.empty}>No one to show — the people who run projects appear here.</div> : null}
        {lines.map((l) => <Line key={l.person?.id ?? 'nobody'} line={l} onOpen={onOpen} />)}
      </div>
    </div>
  )
}

function Line({ line: l, onOpen }: { line: WorkloadLine<ProjectRow>; onOpen: (r: ProjectRow) => void }) {
  const slots = l.person ? Math.max(l.capacity, l.count) : Math.max(1, l.count)
  return (
    <div className={styles.row} role="listitem" data-testid="workload-row" data-person={l.person?.id ?? 'nobody'} data-state={l.person ? l.state : undefined}>
      <span className={styles.who}>
        {l.person ? <Avatar name={l.person.name} color={l.person.color} size={36} tooltip={false} /> : <span className={styles.nobody}><Icon name="person_add" size={20} /></span>}
        <span className={styles.whoText}>
          <span className={styles.name}>{l.person ? l.person.name : 'No one yet'}</span>
          <span className={styles.role}>{l.person ? `${l.person.role} · ${plural(l.count, 'project')}` : 'Projects with no one on the team'}</span>
        </span>
      </span>
      <span className={styles.bar} style={{ '--slots': slots } as CSSProperties} aria-label={l.person ? `${l.person.name}: ${l.count} of ${l.capacity}` : 'Projects with no one on the team'}>
        {Array.from({ length: slots }, (_, i) => {
          const p = l.projects[i]
          if (!p) return <span key={`free-${i}`} className={styles.slot} aria-hidden />
          const over = !!l.person && i >= l.capacity
          const why = [p.number, p.hold ? 'On hold' : null, p.attention[0] ?? null, over ? 'Past capacity' : null].filter(Boolean).join(' · ')
          return (
            <Tooltip key={p.id} label={`${p.name} · ${why}`}>
              <button type="button" className={styles.block} data-over={over ? '' : undefined} data-hold={p.hold ? '' : undefined} onClick={() => onOpen(p)} aria-label={`${p.name} · ${why}`} data-testid="workload-block">
                {p.attention.length ? <span className={styles.dot} aria-hidden /> : null}
                <span className={styles.blockName}>{p.name}</span>
              </button>
            </Tooltip>
          )
        })}
      </span>
      <span className={styles.state}>
        {l.person ? <MetaChip color={TONE[l.state]}>{l.words}</MetaChip> : <MetaChip color="yellow">Assign someone</MetaChip>}
        {l.person ? <span className={styles.count}>{`${l.count} of ${l.capacity}${l.own ? '' : ' · studio default'}`}</span> : null}
      </span>
    </div>
  )
}

/** (I-Q3) Set capacity: each listed person's number — blank keeps the studio's default. Saves through `onSave`; closes only once it lands.
    (one-home N-17) A member's number lives on Company › Members (the Projects at once field); this dialog writes the same column, for the
    whole team at once while looking at the load. */
export function CapacityDialog({ open, people, studioDefault, onClose, onSave, onSettings }: {
  open: boolean
  people: WorkloadPerson[]
  studioDefault: number
  onClose: () => void
  onSave: (caps: Record<string, number | null>) => Promise<boolean>
  onSettings: () => void
}) {
  const [was, setWas] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  if (open !== was) { setWas(open); if (open) setValues(Object.fromEntries(people.map((p) => [p.id, clampCapacity(p.projectCapacity) === null ? '' : String(capacityOf(p, studioDefault))]))) }
  const valid = (v: string | undefined) => !v || (Number(v) >= CAPACITY_MIN && Number(v) <= CAPACITY_MAX)
  const bad = Object.values(values).some((v) => !valid(v))
  const save = async () => {
    if (bad) return
    setBusy(true)
    const ok = await onSave(Object.fromEntries(people.map((p) => [p.id, values[p.id] ? clampCapacity(values[p.id]) : null])))
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Set capacity" width={600} size="form" closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy || bad} data-testid="capacity-save">{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={styles.capList} data-testid="capacity-dialog">
        <p className={styles.note}>How many running projects each person can carry at once. Leave it blank for the studio’s default — {studioDefault}, set in <button type="button" className={styles.link} onClick={onSettings}>Settings › Projects</button>.</p>
        {people.map((p) => (
          <div key={p.id} className={styles.capRow}>
            <span className={styles.who}><Avatar name={p.name} color={p.color} size={36} tooltip={false} /><span className={styles.whoText}><span className={styles.name}>{p.name}</span><span className={styles.role}>{p.role}</span></span></span>
            <TextField label="Projects at once" value={values[p.id] ?? ''} numeric="digits" maxLength={2} placeholder={String(studioDefault)}
                       onChange={(v) => setValues((x) => ({ ...x, [p.id]: v }))} error={valid(values[p.id]) ? undefined : MSG.capacity}
                       inputProps={{ 'data-testid': `capacity-${p.id}` } as never} />
          </div>
        ))}
      </div>
    </Dialog>
  )
}
