'use client'

import { Icon } from '@/components/om/icon'
import { clientRowLabel, clientRowTone, dayOfIso, rangeLabel, type ClientRow } from '@/lib/projects/schedule-model'
import { PAUSED_LABEL } from '@/lib/portal/schedule-model'   // (simplify S-25 (1)) the portal's own word for a Blocked stage
import pj from '@/components/portal/project/project.module.css'
import styles from './schedule.module.css'

/**
 * (Projects round 2, Q-15 · Share.dc.html "What Benjamin will see") The client's schedule as the portal draws it: the studio, "Your renovation
 * schedule", the news line of the last share with its note, then each milestone the client is shown — its name, its dates, and Done ·
 * Under way · Coming up (REG-1051: the portal's words and rows). The share dialog previews the next copy with it; the Schedule tab's pane shows the copy the client has now; round
 * 4b's portal reads the same snapshot rows.
 */
export function ClientSchedule({ studio, rows, news, empty, paused, pausedLines }: {
  studio: string
  rows: ClientRow[]
  /** (simplify S-25 (1)) The stages the client reads as Paused — Blocked live (`isPausedStage`), as their page says: never "Under way". */
  paused?: ReadonlySet<string>
  /** (parity map, CP-064 — P-F's words) what a paused stage says under its dates, as the portal says it: "Paused — {the studio's words} ·
      Resuming around {day}" (`pausedLine`), by row id */
  pausedLines?: Readonly<Record<string, string>>
  /** "Updated 5 Oct · Handover is now Fri 20 Nov" and the studio's note, when there is something new. */
  news?: { head: string; note?: string | null } | null
  empty?: string
}) {
  return (
    <div className={styles.client} data-testid="client-schedule">
      <span className={styles.clientStudio}>{studio}</span>
      <span className={styles.clientTitle}>Schedule</span>
      {news ? (
        <div className={styles.clientNews}>
          <span className={styles.clientNewsHead}>{news.head}</span>
          {news.note ? <span className={styles.clientNewsBody}>{news.note}</span> : null}
        </div>
      ) : null}
      {rows.length ? (
        /* (REG-1051) the portal's own rows (project.module.css: the dot, the name and dates, the word at the right in its tone) with the
           portal's words — Under way, Please confirm, With your designer — so the pane is what the client sees */
        <div className={`${pj.stages} ${styles.clientList}`}>
          <ol className={pj.stageList}>
            {rows.map((r) => {
              const stop = !!paused?.has(r.id)
              const tone = stop ? 'paused' : clientRowTone(r)
              return (
                <li key={r.id} className={pj.stage} data-tone={tone}>
                  <span className={pj.dot} data-tone={tone} aria-hidden>{tone === 'done' || tone === 'ask' || tone === 'changes' ? <Icon name="check" size={16} /> : null}</span>
                  <span className={pj.stageText}>
                    <span className={pj.stageName}>{r.title}</span>
                    <span className={pj.stageDates}>{rangeLabel(dayOfIso(r.start) ?? 0, dayOfIso(r.end) ?? 0)}</span>
                    {stop && pausedLines?.[r.id] ? <span className={pj.stageDates} data-testid="client-paused-line">{pausedLines[r.id]}</span> : null}
                  </span>
                  <span className={pj.state} data-tone={tone}>{stop ? PAUSED_LABEL : clientRowLabel(r)}</span>
                </li>
              )
            })}
          </ol>
        </div>
      ) : <div className={styles.clientEmpty}>{empty ?? 'Nothing on the schedule yet.'}</div>}
    </div>
  )
}
