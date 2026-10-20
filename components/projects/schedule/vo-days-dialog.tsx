'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { dayLabel, daysWord, followersOf, plural, rangeLabel, type Milestone } from '@/lib/projects/schedule-model'
import { asksPastEnd } from '@/lib/projects/schedule-rules'
import type { VoDayAsk } from '@/lib/projects/schedule'
import m from './moment.module.css'

/**
 * (parity map, SC-094 — his "build everything that's in 1.0" 2026-10-10; 1.0's VO "timeline impact days", E-253) An approved variation order's
 * extra days — "VO-3 adds 3 days — move what follows?": the house Dialog over one choice, the milestone the days go on (the running one first,
 * then a paused one, else the next to start), with what the move does said before the press. **Move the schedule** makes it that many days longer and the move
 * carries what follows (the Schedule's own rule); a Designer's or a Manager's press on a stage under way asks an Owner or an Admin for the days
 * instead (simplify Q-18, kept) and the button says so. **Not now** leaves the dates as they are. Closes only once its answer lands.
 * INVENTED COPY: the title, the lede, the preview line, "Ask for the days", "Not now".
 */
export function VoDaysDialog({ open, vo, list, today, role, onClose, onMove, onNotNow }: {
  open: boolean
  vo: VoDayAsk | null
  list: Milestone[]
  today: number
  /** The viewer's role — whether a stage under way asks for the days instead. */
  role: string
  onClose: () => void
  /** Resolves true once the move (or the ask) lands. */
  onMove: (milestoneId: string) => Promise<boolean>
  onNotNow: () => Promise<boolean>
}) {
  const open_ = list.filter((x) => x.status !== 'done')
  /* the running one first (under way), then a paused one, then the next to start */
  const first = open_.find((x) => x.status === 'in_progress') ?? open_.find((x) => x.status === 'blocked') ?? open_.find((x) => x.status === 'not_started') ?? null
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setPick(first?.id ?? null); setBusy(false) } }
  if (!vo) return null
  /* two milestones of one name read apart by their dates (the panel's B-51) */
  const label = (x: Milestone) => (open_.filter((o) => o.title === x.title).length > 1 ? `${x.title} (${rangeLabel(x.start, x.end)})` : x.title)
  const chosen = open_.find((x) => x.id === pick) ?? null
  const asks = chosen ? asksPastEnd(role, chosen, today, chosen.end + vo.days) : false
  const follow = chosen ? followersOf(list, chosen.id).length : 0
  const run = async (f: () => Promise<boolean>) => { if (busy) return; setBusy(true); const ok = await f(); setBusy(false); if (ok) onClose() }
  return (
    <Dialog open={open} onClose={onClose} title={`${vo.number} adds ${daysWord(vo.days)}`} subtitle={vo.title} width={600} size="form"
            footer={<>
              <FootStart><Button appearance="text" onPress={() => { void run(onNotNow) }} isDisabled={busy} data-testid="vo-days-not-now">Not now</Button></FootStart>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { if (chosen) void run(() => onMove(chosen.id)) }} isDisabled={busy || !chosen} data-testid="vo-days-move">{busy ? 'Saving…' : asks ? 'Ask for the days' : 'Move the schedule'}</Button>
            </>}>
      <div className={m.sheet} data-testid="vo-days-dialog">
        <p className={m.line} data-tone="strong">{`The client approved ${vo.number} — move what follows? Pick the milestone the extra days go on: it runs ${daysWord(vo.days)} longer, and every milestone that moves with it follows.`}</p>
        {open_.length ? (
          <>
            <TextField label="Milestone" mode="select" value={chosen ? label(chosen) : ''} options={open_.map(label)} onChange={(v) => setPick(open_.find((x) => label(x) === v)?.id ?? null)} name="vo-days-milestone" />
            {chosen ? (
              <p className={m.line} data-testid="vo-days-preview">
                {asks
                  ? `${chosen.title} is under way — an Owner or an Admin approves its new last day, ${dayLabel(chosen.end + vo.days)}.`
                  : `${chosen.title} ends ${dayLabel(chosen.end + vo.days)} instead of ${dayLabel(chosen.end)}${follow ? `; ${plural(follow, 'milestone')} move${follow === 1 ? 's' : ''} with it` : ''}.`}
              </p>
            ) : null}
          </>
        ) : <p className={m.line}>Every milestone is done — the dates stay as they are.</p>}
      </div>
    </Dialog>
  )
}
