'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { AiMark } from '@/components/writing/writing-help'
import { useAfterCall } from '@/components/dashboard/after-call'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setTasksDone, undoTasksDone } from '@/app/leads/tasks-actions'
import { askMaisonAi } from '@/lib/maison-ai'
import { dayActOf, dayExtrasOf, dotsOf, leftOf, type AgendaItem, type DayData } from '@/lib/dashboard/cards'
import { CardFrame } from './card-frame'
import styles from './cards.module.css'

/** Rows of a day before its "Show n more" (a phone shows four). */
const DAY_SHOWN = 6
const DAY_SHOWN_PHONE = 4

/**
 * (the Dashboard redesigned, 2026-10-26 — his marks P-06 · P-14; lane D3) **Your day** — "What do I do today?": My tasks and Coming up merged.
 * A day pressed shows its own agenda in place. Today's meetings (Prepare me asks Maison AI; a place has Directions), calls due (Call · WhatsApp
 * — the call remembered, so *Log the call* is offered on return), the member's tasks (late first, red; the tick completes with Undo — the Tasks
 * tab's own `setTasksDone` / `undoTasksDone`), the milestones starting and ending, the Hangouts; Accounting's week is the money due in it.
 *
 * (the calm pass, 2026-10-26 — the Claude Design option with his corrections, brief-calm.md § 1 · § 2; lane C3) The week sits in the card's head
 * (the day shown a tint, never a solid block); the count beside the title is what is still ahead on the day shown; each row reads across a time
 * column ("10:00 AM" · "by 4:30 PM" · "5 days late" in red), a tick circle for a task or a dot for a meeting, the title and one caption, and **one
 * action at most** — Call, the house Row's text button with its glyph (2026-10-27: it was outlined, this page's alone), or Directions as a
 * text link. What he marked Build and the row has no room for (WhatsApp, Prepare me) is in the row's ⋮, shown on the row's hover or focus at a
 * desk and always under a finger.
 */
export function YourDayCard({ data }: { data: DayData | null }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const phone = useSheetLayout()
  const [picked, setPicked] = useState<number | null>(null)
  const [more, setMore] = useState(false)
  /* a tick shows at once; the server's answer replaces it (a refusal puts it back) */
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  /* (P-06 · "the call is remembered so Log the call is offered on return") back on the page after a call or a WhatsApp from a row — the
     Dashboard's one after-call piece, shared with Needs you (components/dashboard/after-call.tsx) */
  const afterCall = useAfterCall()

  const today = data?.today ?? 0
  const day = picked ?? today
  const items = useMemo(() => (data?.items ?? []).map((x) => (x.taskId && x.taskId in ticks ? { ...x, done: ticks[x.taskId]!, late: ticks[x.taskId] ? false : x.late } : x)), [data, ticks])
  if (!data) return null
  const list = items.filter((x) => x.day === day)
  const cap = phone ? DAY_SHOWN_PHONE : DAY_SHOWN
  const shown = more ? list : list.slice(0, cap)
  const hidden = list.length - shown.length
  const left = leftOf(list)
  const weekQuiet = !items.length
  const dayName = data.week.find((w) => w.day === day)
  /* the rows keep one column for a ⋮ when any of them has one, so their actions line up — (dash-d1) `dayExtrasOf`, the rule the ghost is told by */
  const menus = shown.some(dayExtrasOf)

  const tick = async (x: AgendaItem) => {
    if (!x.taskId) return
    const id = x.taskId
    const to = !x.done
    setTicks((t) => ({ ...t, [id]: to }))
    let res: Awaited<ReturnType<typeof setTasksDone>>
    const undoLocal = () => setTicks((t) => { const n = { ...t }; delete n[id]; return n })
    try { res = await setTasksDone([id], to) } catch (e) { undoLocal(); snackbar({ message: couldnt(to ? 'complete the task' : 'reopen the task', refusalOf(e)) }); return }
    /* a refusal answered as `{ error }` (the house rule) puts the tick back and says why */
    const refused = (res as unknown as { error?: unknown }).error
    if (refused) { undoLocal(); snackbar({ message: couldnt(to ? 'complete the task' : 'reopen the task', refusalOf(refused)) }); return }
    if (!res.changed.length) { snackbar({ message: to ? 'The task is already completed' : 'The task is already open' }); router.refresh(); return }
    const back = res
    snackbar({ key: `day-tick-${id}`, message: to ? 'Task completed' : 'Task reopened', actionLabel: 'Undo', onAction: () => {
      setTicks((t) => ({ ...t, [id]: !to }))
      void undoTasksDone({ taskIds: back.changed, done: to, eventIds: back.eventIds, stamps: back.stamps })
        .then(() => router.refresh(), (e: unknown) => { setTicks((t) => ({ ...t, [id]: to })); snackbar({ message: couldnt(to ? 'reopen the task' : 'complete the task', refusalOf(e)) }) })
    } })
    router.refresh()
  }

  const week = (
    <div className={styles.week} data-testid="day-week">
      <ChipRail label="This week" className={styles.weekRail}>
        {data.week.map((w) => {
          const isToday = w.day === today, on = w.day === day
          return (
            <button key={w.day} type="button" className={styles.dayCell} aria-pressed={on} data-today={isToday || undefined} data-testid="day-cell" data-day={w.day}
                    aria-label={`${isToday ? 'Today, ' : ''}${w.full}${w.count ? ` — ${w.count === 1 ? '1 thing' : `${w.count} things`}` : ' — nothing planned'}`}
                    onClick={() => { setPicked(w.day); setMore(false) }}>
              <span className={styles.dayName}>{w.weekday}</span>
              <span className={styles.dayDate}>{w.date}</span>
              <span className={styles.dots} aria-hidden>{Array.from({ length: dotsOf(w.count) }, (_, i) => <i key={i} />)}</span>
            </button>
          )
        })}
      </ChipRail>
    </div>
  )

  return (
    <CardFrame card="day" title="Your day" meta={left || undefined} legend={week} wide testId="your-day">
      <div className={styles.agenda} data-testid="day-agenda" data-menus={menus || undefined} aria-live="polite"
           aria-label={dayName ? (day === today ? `Today, ${dayName.full}` : dayName.full) : undefined}>
        {weekQuiet ? (
          <div className={styles.quiet} data-testid="day-quiet">
            <p className={styles.quietLine}>Nothing planned this week</p>
            <Button appearance="text" onPress={() => router.push(data.addHref)} data-testid="day-add" className={styles.verb}>Add a task</Button>
          </div>
        ) : !list.length ? (
          <p className={styles.quietLine} data-testid="day-empty">{day === today ? 'Nothing planned today' : `Nothing planned on ${dayName?.full.split(' ')[0] ?? 'this day'}`}</p>
        ) : (
          <>
            {shown.map((x) => <AgendaRow key={x.key} x={x} phone={phone} onTick={() => { void tick(x) }}
                                         onCall={(c) => { afterCall.remember({ leadId: x.leadId!, who: x.who ?? 'them', channel: c }) }} />)}
            {hidden > 0 || more ? (
              <button type="button" className={styles.moreLink} onClick={() => setMore((m) => !m)} data-testid="day-more" aria-expanded={more}>
                {more ? 'Show less' : `Show ${hidden} more`}
              </button>
            ) : null}
          </>
        )}
      </div>
      {afterCall.sheet}
    </CardFrame>
  )
}

/** A row's verb beyond its one action: what the ⋮ holds. */
type Extra = { label: string; glyph: ReactNode; run: () => void; testId: string; href?: string }
const open = (href: string) => { window.open(href, '_blank', 'noopener') }
/** What a row offers beyond its one action — WhatsApp on a call, Prepare me on a meeting ahead (his Build, out of sight until wanted). */
function extrasOf(x: AgendaItem, onCall?: (channel: 'Call' | 'WhatsApp') => void): Extra[] {
  const out: Extra[] = []
  if (x.kind === 'call' && !x.done && x.wa) out.push({ label: `WhatsApp ${x.who ?? ''}`.trim(), glyph: <WaMark />, run: () => { onCall?.('WhatsApp'); open(x.wa!) }, testId: 'day-whatsapp', href: x.wa })
  if (x.prepare) out.push({ label: 'Prepare me for this meeting', glyph: <AiMark />, run: () => askMaisonAi({ text: x.prepare! }), testId: 'day-prepare' })
  return out
}

/** One agenda row: the time column · a tick or a dot · its words, opening the record · one action · its ⋮. */
function AgendaRow({ x, phone, onTick, onCall }: { x: AgendaItem; phone: boolean; onTick: () => void; onCall: (channel: 'Call' | 'WhatsApp') => void }) {
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const when = x.when ?? x.time ?? ''
  const extras = extrasOf(x, onCall)
  /* (the close-out round 2026-10-31, dash-d1) the row's one action by the rule the page tells its ghost (`dayActOf`) */
  const act = dayActOf(x)
  const call = act === 'call' ? x.tel ?? null : null
  const maps = act === 'link' ? x.maps ?? null : null
  const whenWords = when ? <span className={styles.whenInline} data-late={x.late || undefined}>{when}<span aria-hidden> · </span></span> : null
  return (
    <div className={styles.agendaRow} data-kind={x.kind} data-late={x.late || undefined} data-done={x.done || undefined} data-ended={x.ended || undefined} data-testid="day-row" data-key={x.key}>
      <span className={styles.when} data-late={x.late || undefined} data-testid="day-when">{when}</span>
      <span className={styles.mark}>
        {x.taskId ? (
          <Tooltip label={x.done ? 'Mark not done' : 'Mark done'}>
            <IconButton variant="bare" icon={x.done ? 'check_circle' : 'radio_button_unchecked'} iconWeight={300} label={x.done ? `Mark “${x.title}” not done` : `Mark “${x.title}” done`} onClick={onTick} className={styles.tick} data-testid="day-tick" aria-pressed={!!x.done} />
          </Tooltip>
        ) : <span className={styles.dot} data-kind={x.kind} aria-hidden />}
      </span>
      <Link href={x.href} className={styles.words} data-testid="day-open">
        <span className={styles.title}>{x.title}</span>
        {x.caption || whenWords ? <span className={styles.caption}>{whenWords}{x.caption}</span> : null}
      </Link>
      <span className={styles.act}>
        {call ? (phone ? (
          <Tooltip label="Call"><IconButton icon="call" label={`Call ${x.who ?? ''}`.trim()} onClick={() => { onCall('Call'); window.location.assign(call) }} variant="secondary" data-testid="day-call" data-href={call} /></Tooltip>
        ) : (
          <Button appearance="text" iconStart={<Icon name="call" size={20} weight={300} />} onPress={() => { onCall('Call'); window.location.assign(call) }} data-testid="day-call" data-href={call} className={styles.verb}>Call</Button>
        )) : maps ? (
          <a href={maps} target="_blank" rel="noopener noreferrer" className={styles.textLink} data-testid="day-directions" data-href={maps}>Directions</a>
        ) : null}
      </span>
      {extras.length ? (
        <span ref={anchor} className={styles.rowMore} data-open={menu || undefined}>
          <IconButton icon="more_vert" label={`More on “${x.title}”`} variant="bare" size={24} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} data-testid="day-row-menu" />
          <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={x.title}>
            {extras.map((e) => (
              <span key={e.testId} className={styles.menuRow} data-testid={e.testId} data-href={e.href}>
                <DropdownItem onSelect={() => { setMenu(false); e.run() }}><span className={styles.menuGlyph}>{e.glyph}{e.label}</span></DropdownItem>
              </span>
            ))}
          </PortalMenu>
        </span>
      ) : <span className={styles.rowMore} aria-hidden />}
    </div>
  )
}

/** WhatsApp's own mark, as the lead card draws it (components/leads/lead-cards.tsx). */
function WaMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/figma-assets/whatsapp-grey.svg" width={18} height={18} alt="" className={styles.wa} />
}
