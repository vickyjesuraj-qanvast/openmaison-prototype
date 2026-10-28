'use client'

import { Fragment, useState } from 'react'
import { Card, CardRule } from '@/components/leads/detail/card'
import { useSheetLayout } from '@/components/om/sheet'
import { moneyCard } from '@/lib/format'
import { NEEDS_SHOWN, NEEDS_SHOWN_PHONE, holdSplit, type NeedAction, type NeedRow } from '@/lib/projects/needs-you'
import type { Hold } from '@/lib/projects/hold'
import { Row, RowMore, type RowButton, type RowMoreItem } from './row'
import { backLabelOf } from './use-need-actions'
import { needIcon } from '@/lib/projects/need-icon'
import styles from '../project-overview.module.css'

/** (pending modules S22) A Needs you row's glyph by its kind and view — the Dashboard's rows draw the same one (lib/projects/need-icon.ts). */
export { needIcon }
const iconOf = (r: NeedRow) => needIcon(r.kind, r.tab)

export type NeedHandlers = {
  act: (a: NeedAction, el?: HTMLElement, row?: NeedRow) => void
  approve: (row: NeedRow) => void
  /** (simplify round 2, S-20 · P2 §6.7) Send back / Decline: the tab's own dialog here, or Money's send back on the record */
  sendBack: (row: NeedRow) => void
  busy: string | null
  /** An address with the way back here (REG-465). */
  link: (to: string) => string
}

/** An approval's words open its record to read before answering — the record itself, never the step its button runs (Money's `&do=approve`
    · `&send=1` stay with the button). */
const recordOf = (href: string) => href.replace(/&(?:do=[^&#]*|send=1)/g, '')

/** One Needs you row: its words open the record when it is an approval (read it before you approve), its buttons act — the inline approval
    first, then the row's second step: (simplify round 2) an approval's Send back / Decline, answered here (`h.sendBack`); else the row's own
    (Change · Remind · Open). */
export function NeedRowView({ r, h, red = r.tone === 'late' }: { r: NeedRow; h: NeedHandlers; /** (3-07) the card's one red row — the worst late one */ red?: boolean }) {
  const buttons: RowButton[] = []
  /* (the calm UI build 2026-10-27, 1-09 · 5-13) an approval's verb is "Approve" — one that also sends opens its send, which says so */
  if (r.inline) {
    buttons.push({ label: r.inline === 'review-handover' ? 'Review' : 'Approve', onPress: () => h.approve(r), busy: h.busy === r.key, testId: 'need-approve' })
  } else {
    buttons.push({ label: r.action.label, onPress: (el) => h.act(r.action, el, r), busy: h.busy === r.key, testId: 'need-action' })
  }
  /* (the calm UI build 2026-10-27, T-02 · 3-05 · 3-06 · 3-22) ONE verb on the row; its second step — Send back / Decline, Change, Remind, Call,
     and a merged row's other step (`also`) — in the row's ⋮, each with the mark it had */
  const more: RowMoreItem[] = []
  const back = backLabelOf(r)
  const second = r.secondary
  if (back) more.push({ label: back, onPress: () => h.sendBack(r), disabled: h.busy === r.key, testId: 'need-send-back' })   // the words open the record — its old "Open" is theirs
  else if (second && (second.href || second.run || r.kind === 'hold')) more.push({ label: second.label, onPress: () => h.act(second, undefined, r), testId: 'need-secondary' })
  for (const a of r.also ?? []) more.push({ label: a.label, onPress: () => h.act(a, undefined, r), testId: 'need-also' })
  return (
    <Row two icon={iconOf(r)} name={r.title} caption={r.meta} meta={r.amountMinor ? moneyCard(r.amountMinor) : undefined}
         state={red ? 'alert' : undefined} tone={r.tone === 'approve' ? 'approve' : undefined}
         href={r.inline && r.action.href ? h.link(recordOf(r.action.href)) : undefined}
         actions={buttons} testId={`need-${r.kind}`}
         menu={more.length ? <RowMore items={more} label={`More for ${r.title}`} title={r.title} testId="need-more" /> : undefined} />
  )
}

/**
 * (the calm UI build 2026-10-27, 3-07 · 1-02 · T-01 · T-14) **Needs your attention** — three rows before "Show n more", the approvals' group
 * "Approvals · n", red on the one worst late row only, "You’re all caught up" when nothing waits, and Before work starts without its days.
 * (simplify S-01 · S-20 · Q-03 · Q-14) NEEDS YOU — the Overview's first card: LEAD STAGES rows, each with its one text button, worst first in
 * Q-03's order; the first is also the header's filled button (S-02). It opens with **Needs your OK** (approve in the row); more than six fold
 * under "Show n more" — (simplify round 2, P1 §6.4) more than four on a phone, where the rest of the page waits under it. On hold, the hold row leads and everything the hold pauses rests under one quiet "Paused while on hold · n". While the
 * project is set up the card is **Before work starts** — what the Start step does not ask for, then Start — and "Setting up for n days" is its
 * head's meta, never a red row. Nothing waiting: "Nothing waits on you".
 */
export function NeedsCard({ rows, hold, settingUp, setupDays, h }: { rows: NeedRow[]; hold: Hold | null; settingUp: boolean; setupDays: number | null; h: NeedHandlers }) {
  const [more, setMore] = useState(false)
  const [pausedOpen, setPausedOpen] = useState(false)
  const phone = useSheetLayout()
  const { kept, paused } = holdSplit(rows, hold)
  /* Before work starts: its set-up rows, then Start, then whatever else waits */
  const ordered = settingUp ? [...kept.filter((r) => r.kind === 'hold'), ...kept.filter((r) => r.group === 'setup'), ...kept.filter((r) => r.kind === 'start'),
    ...kept.filter((r) => r.group !== 'setup' && r.kind !== 'start' && r.kind !== 'hold')] : kept
  const shown = more ? ordered : ordered.slice(0, phone ? NEEDS_SHOWN_PHONE : NEEDS_SHOWN)
  const hidden = ordered.length - shown.length
  const okCount = ordered.filter((r) => r.group === 'ok').length
  const firstOk = shown.findIndex((r) => r.group === 'ok')
  /* (3-07) red is for the one row most past its day and ours — the first late one in Q-03's order */
  const redKey = ordered.find((r) => r.tone === 'late')?.key ?? null
  void setupDays
  const lastOk = shown.length - 1 - [...shown].reverse().findIndex((r) => r.group === 'ok')
  return (
    <div data-card="needs">
      {/* (W-490) Before work starts keeps its name; how long it has been setting up is the brief's sentence, said once */}
      <Card title={settingUp ? 'Before work starts' : 'Needs your attention'} headGap={8} meta={ordered.length ? `· ${ordered.length}` : undefined} testId="needs">
        <div className={styles.body}>
          {!ordered.length ? <p className={styles.line} data-testid="needs-empty">You’re all caught up</p> : (
            <div className={styles.group}>
              {shown.map((r, i) => (
                <Fragment key={r.key}>
                  {i === firstOk && !settingUp ? <div className={styles.groupLabel} data-tone="approve" data-testid="needs-ok"><span className={styles.groupText}><span>Approvals</span><span>·</span><span>{okCount}</span></span></div> : null}
                  <NeedRowView r={r} h={h} red={r.key === redKey} />
                  {i === lastOk && firstOk >= 0 && i < shown.length - 1 && !settingUp ? <CardRule inset={0} /> : null}
                </Fragment>
              ))}
              {hidden > 0 || more ? (
                <Row icon={more ? 'keyboard_arrow_up' : 'expand_more'} name={more ? 'Show less' : `Show ${hidden} more`} onPress={() => setMore((m) => !m)} testId="needs-more" toggle />
              ) : null}
            </div>
          )}
          {paused.length ? (
            <>
              <CardRule inset={0} />
              <div className={styles.group} data-testid="needs-paused">
                <Row icon={pausedOpen ? 'keyboard_arrow_up' : 'expand_more'} name={`Paused while on hold · ${paused.length}`} onPress={() => setPausedOpen((o) => !o)} testId="needs-paused-toggle" toggle />
                {pausedOpen ? paused.map((r) => <NeedRowView key={r.key} r={r} h={h} red={false} />) : null}
              </div>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
