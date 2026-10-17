'use client'

import { displayDate } from '@/lib/format'
import type { DiaryDay, PointRow } from '@/lib/projects/floor-plan-model'
import card from '@/components/leads/detail/card.module.css'
import styles from './floor-plan.module.css'

/**
 * (gaps build G, G-Q12 — 1.0 F-203 · F-204) The two cards beside the plan, each only when there is something in it: **Points** — the stamps
 * counted per symbol under their group (resolved included: a resolved socket is still a socket to wire), the count of what the filter shows
 * said when it narrows; **Site diary** — the photo pins grouped by the day the photos were taken, three thumbnails and "+n". The lead
 * Overview's card and its rows.
 */
export function PointsCard({ groups, total, narrowed }: { groups: PointRow[]; total: number; narrowed: string | null }) {
  if (!total) return null
  return (
    <section className={card.card} aria-label="Points" data-testid="plan-points">
      <div className={card.head}><div className={card.headText}><span className={card.title}>Points</span></div><span className={card.metaRight}>{`${total} ${total === 1 ? 'point' : 'points'}`}</span></div>
      <div className={styles.cardBody}>
        {narrowed ? <p className={styles.cardNote}>{narrowed}</p> : null}
        {groups.map((g) => (
          <div key={g.group} className={styles.pointGroup}>
            <span className={styles.pointHead}>{g.label}</span>
            {g.rows.map((r) => (
              <span key={r.def.key} className={styles.pointRow}><span>{r.def.label}</span><span className={styles.pointCount}>{r.count}</span></span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function DiaryCard({ days, onOpen }: { days: DiaryDay[]; onOpen: (markId: string) => void }) {
  if (!days.length) return null
  const photos = days.reduce((n, d) => n + d.photos, 0)
  return (
    <section className={card.card} aria-label="Site diary" data-testid="plan-diary">
      <div className={card.head}><div className={card.headText}><span className={card.title}>Site diary</span></div><span className={card.metaRight}>{`${photos} ${photos === 1 ? 'photo' : 'photos'} · ${days.length} ${days.length === 1 ? 'day' : 'days'}`}</span></div>
      <div className={styles.cardBody}>
        {days.map((d) => (
          <div key={d.day} className={styles.pointGroup}>
            <span className={styles.pointHead}>{displayDate(new Date(`${d.day}T12:00:00`))}</span>
            {d.marks.map((m) => (
              <button key={m.id} type="button" className={styles.diaryRow} onClick={() => onOpen(m.id)}>
                <span className={styles.diaryThumbs}>
                  {m.photos.slice(0, 3).map((p) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={p.id} className={styles.diaryThumb} src={p.src} alt="" loading="lazy" />
                  ))}
                  {m.photos.length > 3 ? <span className={styles.diaryMore}>{`+${m.photos.length - 3}`}</span> : null}
                </span>
                <span className={styles.diaryText}>{m.text ?? `${m.author} · ${m.photos.length} ${m.photos.length === 1 ? 'photo' : 'photos'}`}{m.num ? ` · Site photo ${m.num}` : ''}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
