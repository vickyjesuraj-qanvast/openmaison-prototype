'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { StatTile } from '@/components/om/stat-tile'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem } from '@/components/leads/dropdown'
import { Timeline, TimelineItem } from '@/components/om/timeline'
import type { MaisonAnswer, MaisonDoor } from '@/lib/maison-ai'
import styles from './answer-cards.module.css'

/**
 * (the Dashboard redesigned 2026-10-26 — his marks P-10 · lane D4; 1.0's answer components A-5 · A-6 · A-8 · A-11 · A-12 · A-14,
 * D-1.0-home-and-chat.md §3.A and §4 ·2) **Answers as cards you can use**, drawn on the house pieces wherever Maison AI answers — the docked field
 * on the Dashboard and the sheet on every other page (components/shell/maison-answer.tsx `AnswerBody`):
 *   · a **record** — the client as one card: who, their home and budget, what is known, what to focus on;
 *   · **figures** — the house number tiles (StatTile), each a door (it opens or asks);
 *   · a small **chart** — bars over a few weeks, each bar's figure in words above it (the figure is the words; the bar only shows it);
 *   · a **comparison** — this beside that, row by row;
 *   · a **timeline** — the record's newest lines on the house timeline, their own glyphs and days.
 * The doors after them are `AnswerDoors`. Nothing here is a second figure: every value is the answer's own, from the records.
 */
export function AnswerCards({ answer: a, onAsk, onOpen }: { answer: MaisonAnswer; onAsk?: (q: string) => void; onOpen: (href: string) => void }) {
  if (!a.record && !a.figures?.length && !a.chart && !a.compare && !a.timeline?.length) return null
  return (
    <div className={styles.cards} data-testid="maison-cards">
      {a.record ? (
        <section className={styles.record} aria-label={a.record.name} data-testid="maison-record">
          <div className={styles.recordHead}>
            <Avatar name={a.record.name} color="var(--om-color-on-surface-secondary)" size={36} tooltip={false} />
            <div className={styles.recordWho}>
              <span className={styles.recordName}>{a.record.name}</span>
              {a.record.line ? <span className={styles.recordLine}>{a.record.line}</span> : null}
            </div>
          </div>
          {a.record.facts?.length ? (
            <dl className={styles.facts}>
              {a.record.facts.map((f) => <div key={f.label} className={styles.fact}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
            </dl>
          ) : null}
          {a.record.points?.length ? <ul className={styles.points}>{a.record.points.map((p, i) => <li key={i}>{p}</li>)}</ul> : null}
          {a.record.note ? <p className={styles.note}>{a.record.note}</p> : null}
        </section>
      ) : null}
      {a.figures?.length ? (
        <div className={styles.figures} data-testid="maison-figures">
          {a.figures.map((f) => (
            <StatTile key={f.key} label={f.label} value={f.value} help={f.help} grade={f.grade} testId={`maison-figure-${f.key}`}
                      press={f.ask && onAsk ? { label: `${f.label}: ${f.value} — ${f.ask}`, onPress: () => onAsk(f.ask!) } : f.href ? { label: `${f.label}: ${f.value} — open it`, onPress: () => onOpen(f.href!) } : undefined} />
          ))}
        </div>
      ) : null}
      {a.chart ? (
        <figure className={styles.chart} data-testid="maison-chart">
          <figcaption className={styles.chartLabel}>{a.chart.label}</figcaption>
          <ol className={styles.bars} aria-label={a.chart.label}>
            {a.chart.bars.map((b) => (
              <li key={b.key} className={styles.barCol} aria-label={`${b.label}: ${b.value}`}>
                <span className={styles.barValue} aria-hidden>{b.value}</span>
                <span className={styles.barTrack} aria-hidden><span className={styles.bar} style={{ height: `${Math.max(b.share > 0 ? 4 : 0, Math.round(b.share * 100))}%` }} /></span>
                <span className={styles.barLabel} aria-hidden>{b.label}</span>
              </li>
            ))}
          </ol>
        </figure>
      ) : null}
      {a.compare ? (
        <section className={styles.compare} aria-label={`${a.compare.left} beside ${a.compare.right}`} data-testid="maison-compare">
          <div className={styles.compareRow} data-head="">
            <span />
            <span className={styles.compareHead}>{a.compare.left}</span>
            <span className={styles.compareHead}>{a.compare.right}</span>
          </div>
          {a.compare.rows.map((r) => (
            <div key={r.label} className={styles.compareRow}>
              <span className={styles.compareLabel}>{r.label}</span>
              <span className={styles.compareValue}>{r.left}</span>
              <span className={styles.compareValue}>{r.right}</span>
            </div>
          ))}
          {a.compare.note ? <p className={styles.note}>{a.compare.note}</p> : null}
        </section>
      ) : null}
      {a.timeline?.length ? (
        <div className={styles.timeline} data-testid="maison-timeline">
          <Timeline label={`${a.title} — what happened lately`}>
            {a.timeline.map((t, i) => (
              <TimelineItem key={t.id} day={i === 0 || a.timeline![i - 1]!.day !== t.day ? t.day : null} dayAs="h4" icon={t.icon} time={t.time} bodyClassName={styles.timelineText}>{t.text}</TimelineItem>
            ))}
          </Timeline>
        </div>
      ) : null}
    </div>
  )
}

/** Doors that share a group fold into one ("Remind · 2 ▾" — 1.0's grouped doors, A-11); the rest stand alone, in their order. */
export function groupDoors(doors: MaisonDoor[]): ({ kind: 'one'; door: MaisonDoor } | { kind: 'group'; label: string; doors: MaisonDoor[] })[] {
  const out: ({ kind: 'one'; door: MaisonDoor } | { kind: 'group'; label: string; doors: MaisonDoor[] })[] = []
  for (const d of doors) {
    if (!d.group) { out.push({ kind: 'one', door: d }); continue }
    const many = doors.filter((x) => x.group === d.group)
    if (many.length < 2) { out.push({ kind: 'one', door: d }); continue }
    if (!out.some((x) => x.kind === 'group' && x.label === d.group)) out.push({ kind: 'group', label: d.group, doors: many })
  }
  return out
}

/**
 * An answer's doors — his § 2: quiet buttons, the first outlined, the rest text, a glyph only on a channel (Call · WhatsApp); a group folds
 * into one with its list in the house menu. A door opens (`href`, with the way back), asks (`ask`) or calls (`tel:` / `wa.me`, on the press).
 */
export function AnswerDoors({ doors, onAsk, onOpen, className }: { doors: MaisonDoor[]; onAsk?: (q: string) => void; onOpen: (href: string) => void; className?: string }) {
  const press = (d: MaisonDoor) => {
    if (d.ask && onAsk) { onAsk(d.ask); return }
    if (!d.href) return
    if (d.href.startsWith('tel:')) { window.location.assign(d.href); return }
    if (/^https?:\/\//.test(d.href)) { window.open(d.href, '_blank', 'noopener'); return }
    onOpen(d.href)
  }
  const items = groupDoors(doors)
  if (!items.length) return null
  return (
    <div className={className ? `${styles.doors} ${className}` : styles.doors} data-testid="maison-doors">
      {items.map((it, i) => (it.kind === 'one'
        ? <Button key={`${it.door.label}-${i}`} variant="secondary" appearance={i === 0 ? 'outlined' : 'text'} onPress={() => press(it.door)} data-testid={it.door.testId ?? 'maison-door'}
                  iconStart={it.door.channel ? <Icon name={it.door.channel === 'call' ? 'call' : 'chat'} size={18} /> : undefined}>{it.door.label}</Button>
        : <DoorGroup key={`g-${it.label}`} label={it.label} doors={it.doors} first={i === 0} onPick={press} />))}
    </div>
  )
}

function DoorGroup({ label, doors, first, onPick }: { label: string; doors: MaisonDoor[]; first: boolean; onPick: (d: MaisonDoor) => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement | null>(null)
  return (
    <span ref={anchor} className={styles.group}>
      <Button variant="secondary" appearance={first ? 'outlined' : 'text'} onPress={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
              iconEnd={<Icon name="arrow_drop_down" size={20} />} data-testid="maison-door-group">{`${label} · ${doors.length}`}</Button>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} role="menu" width={280} sheetTitle={label}>
        {doors.map((d, i) => <DropdownItem key={`${d.label}-${i}`} onSelect={() => { setOpen(false); onPick(d) }}>{d.label}</DropdownItem>)}
      </PortalMenu>
    </span>
  )
}
