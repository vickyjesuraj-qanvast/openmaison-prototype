'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ago } from '@/lib/templates/ago'
import { displayDate } from '@/lib/format'
import { completedLine, type EndingView } from '@/lib/projects/handover-model'
import s from './ending.module.css'

/**
 * (Projects round 7, Q-24) The project's ending under its tabs — the quote's approval and sent banners (REG-624, template-bar.module.css),
 * on every tab. Waiting: who asked and when; an Owner or an Admin gets Send back · Review, whoever asked can take it back, anyone else reads
 * that it waits. Sent back: the reviewer's note until it is asked again (dismissed for this visit). Completed: when, by whom, why with items
 * open, that the schedule, choices and money are read-only until it is reopened (REG-1069) — and Reopen for an Owner or an Admin.
 * (fix-E, E-32) The bar is a labelled region; only its sentence is a live status, so a tab change no longer re-announces its buttons.
 */
export function HandoverBar({ e, now, onReview, onSendBack, onWithdraw, onReopen, onComplete }: {
  e: EndingView
  now: number
  onReview: () => void
  onSendBack: () => void
  onWithdraw: () => void
  onReopen: () => void
  /** (fix-E, E-14) Whoever asked completes it themselves once the owner's review is switched off. */
  onComplete?: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (e.request) {
    /* (fix-E, E-14) the review was switched off while this request waited: whoever asked now completes it themselves */
    const reviewOff = !e.rules.review
    return (
      <div className={s.banner} role="region" aria-label="Handover" data-tone="await" data-testid="handover-bar" data-state="requested">
        <span className={s.bannerIcon}><Icon name="approval" size={20} weight={300} /></span>
        <span className={s.bannerText} role="status"><b>{e.mine ? 'You' : e.request.by.name}</b> asked to complete the handover {ago(e.request.at, now)}{e.request.note ? <> — <i>“{e.request.note.replace(/[.!?]+$/, '')}”</i></> : null}.</span>
        {e.runs ? (
          <span className={s.bannerActions}>
            <Button appearance="text" onPress={onSendBack} data-testid="handover-bar-send-back">Send back</Button>
            {/* (fix-E, E-12) the header's Review the handover is the page's one filled action — the bar's is outlined, as Reopen is */}
            <Button variant="secondary" appearance="outlined" onPress={onReview} data-testid="handover-bar-review">Review</Button>
          </span>
        ) : e.mine && reviewOff && onComplete ? (
          <span className={s.bannerActions}>
            <span className={s.bannerWait}>The owner’s review is off now</span>
            <Button appearance="text" onPress={onWithdraw} data-testid="handover-bar-withdraw">Take it back</Button>
            <Button variant="secondary" appearance="outlined" onPress={onComplete} data-testid="handover-bar-complete">Complete handover</Button>
          </span>
        ) : e.mine ? (
          <span className={s.bannerActions}><span className={s.bannerWait}>Waiting for an Owner or an Admin</span><Button appearance="text" onPress={onWithdraw} data-testid="handover-bar-withdraw">Take it back</Button></span>
        ) : <span className={s.bannerWait}>Waiting for an Owner or an Admin</span>}
      </div>
    )
  }
  if (e.sentBack && !dismissed) {
    return (
      <div className={s.banner} role="region" aria-label="Handover" data-tone="changes" data-testid="handover-bar" data-state="sent_back">
        <span className={s.bannerIcon}><Icon name="edit" size={20} weight={300} /></span>
        {/* (fix-E, E-23) the note quoted and closed; "Ask again when it's ready" only for whoever asked */}
        <span className={s.bannerText} role="status"><b>Handover sent back</b> by {e.sentBack.by.name} {ago(e.sentBack.at, now)} — <i>“{e.sentBack.note.replace(/[.!?]+$/, '')}”</i>.{e.sentBack.mine ? <> <span className={s.bannerHint}>Ask again when it’s ready.</span></> : null}</span>
        <Tooltip label="Dismiss"><IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={() => setDismissed(true)} /></Tooltip>
      </div>
    )
  }
  if (e.completed) {
    return (
      <div className={s.banner} role="region" aria-label="Handover" data-tone="sent" data-testid="handover-bar" data-state="completed">
        <span className={s.bannerIcon}><Icon name="task_alt" size={20} weight={300} /></span>
        {/* (fix-E, E-24) the note right after who completed it — inside the one sentence (completedLine), never trailing it unlabelled */}
        <span className={s.bannerText} role="status">{completedLine(e.completed, displayDate(new Date(e.completed.at)), { runs: e.runs })}</span>
        {e.runs ? <span className={s.bannerActions}><Button variant="secondary" appearance="outlined" onPress={onReopen} data-testid="handover-bar-reopen">Reopen</Button></span> : null}
      </div>
    )
  }
  return null
}
