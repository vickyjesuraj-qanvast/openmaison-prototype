'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { addQuoteTasks, readQuoteTaskSuggestions, undoSuggestedTasks, type SuggestedUndo } from '@/app/projects/schedule-actions'
import { dayLabel } from '@/lib/projects/schedule-model'
import type { QuoteTaskGroup, TaskSuggestion } from '@/lib/projects/task-suggestions'
import m from './moment.module.css'
import s from './suggest-tasks.module.css'

/**
 * (parity map, SC-056 · TD-023 — her "build everything that's in 1.0" 2026-10-10; 1.0's "Suggest from quote", E-188) A milestone's suggested
 * tasks: the house Dialog (nested over the milestone panel) with a tick list — the signed quote's lines for its phase first, then what the
 * phase usually needs on a Singapore home (lib/projects/task-suggestions.ts, BY RULE — a stand-in for 1.0's AI, no credits). Nothing is ticked
 * until you tick it (1.0 added its suggestions unticked); **Add n tasks** makes them ordinary tasks inside the milestone, one sentence and one
 * Undo. Closes only once they are added. INVENTED COPY: the lede, the empty line, "Add n tasks".
 */
export function SuggestTasksDialog({ open, title, suggestions, nested = false, onClose, onAdd }: {
  open: boolean
  /** The milestone's name. */
  title: string
  suggestions: TaskSuggestion[]
  nested?: boolean
  onClose: () => void
  /** Resolves true once the ticked tasks are added. */
  onAdd: (titles: string[]) => Promise<boolean>
}) {
  const [ticked, setTicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setTicked([]); setBusy(false) } }
  const toggle = (key: string, on: boolean) => setTicked((xs) => (on ? [...xs, key] : xs.filter((x) => x !== key)))
  const add = async () => {
    const titles = suggestions.filter((x) => ticked.includes(x.key)).map((x) => x.title)
    if (!titles.length || busy) return
    setBusy(true)
    const ok = await onAdd(titles)
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Suggest tasks" subtitle={title} width={600} size="form" nested={nested}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
                     <Button onPress={() => { void add() }} isDisabled={busy || !ticked.length} data-testid="suggest-add">{busy ? 'Adding…' : ticked.length ? `Add ${ticked.length} ${ticked.length === 1 ? 'task' : 'tasks'}` : 'Add tasks'}</Button></>}>
      <div className={m.sheet} data-testid="suggest-dialog">
        {suggestions.length ? (
          <>
            <p className={m.line}>From the signed quote’s lines for this stage, then what it usually needs. Tick the ones to add — each becomes a task in this milestone, due on its last day.</p>
            <ul className={s.list} aria-label="Suggested tasks">
              {suggestions.map((x) => (
                <li key={x.key} className={s.item} data-testid="suggest-row" data-source={x.source}>
                  <Checkbox isSelected={ticked.includes(x.key)} onChange={(on: boolean) => toggle(x.key, on)}>{x.title}</Checkbox>
                  <span className={m.help}>{x.why}</span>
                </li>
              ))}
            </ul>
          </>
        ) : <p className={m.line} data-testid="suggest-empty">{`Nothing to suggest for ${title} — its name says no stage of the work, and its tasks already cover what it needs. Add a task by hand instead.`}</p>}
      </div>
    </Dialog>
  )
}

/**
 * (parity map, TD-022 — 1.0's "Suggest from quote") The project's Tasks › Add Task › **Suggest tasks from the quote**: the signed quote's
 * sections in order, each line as a task (lib/projects/task-suggestions.ts `suggestFromQuote`, by rule — a stand-in, no credits), each going
 * into the milestone its trade belongs to (due on its last day) or onto the project; a section's lines past six are counted, never listed.
 * Nothing is ticked until you tick it; **Add n tasks** makes them ordinary tasks, one sentence and one Undo. Loads on open.
 * INVENTED COPY: the lede, the rows' second line, "Tick all", the empty line.
 */
export function QuoteTasksDialog({ open, projectId, onClose }: { open: boolean; projectId: string | null; onClose: () => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [data, setData] = useState<{ quote: { id: string; number: string } | null; groups: QuoteTaskGroup[] } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [ticked, setTicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setData(null); setFailed(null); setTicked([]); setBusy(false) } }
  useEffect(() => {
    if (!open || !projectId) return
    let live = true
    void readQuoteTaskSuggestions(projectId).then((r) => { if (!live) return; if ('error' in r) setFailed(r.error); else setData(r) }, () => { if (live) setFailed('') })
    return () => { live = false }
  }, [open, projectId, tick])
  const rows = (data?.groups ?? []).flatMap((g) => g.rows)
  const toggle = (key: string, on: boolean) => setTicked((xs) => (on ? [...new Set([...xs, key])] : xs.filter((x) => x !== key)))
  const add = async () => {
    const tasks = rows.filter((r) => ticked.includes(r.key)).map((r) => ({ title: r.title, milestoneId: r.milestoneId }))
    if (!projectId || !tasks.length || busy) return
    setBusy(true)
    let undo: SuggestedUndo | null = null
    let sentence = ''
    const ok = await run('add the tasks', async () => { const r = await addQuoteTasks(projectId, { tasks }); if ('error' in r) return r; undo = r.undo; sentence = r.sentence })
    setBusy(false)
    const u = undo as SuggestedUndo | null
    if (!ok || !u) return
    onClose()
    router.refresh()
    snackbar({ message: sentence, actionLabel: 'Undo', onAction: () => { void run('take the tasks back', () => undoSuggestedTasks(u), 'The tasks are taken back', { refresh: true }) } })
  }
  const due = (day: number | null) => (day === null ? '' : ` · due ${dayLabel(day)}`)
  return (
    <Dialog open={open} onClose={onClose} title="Suggest tasks from the quote" subtitle={data?.quote?.number} width={600} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
                     <Button onPress={() => { void add() }} isDisabled={busy || !ticked.length} data-testid="quote-tasks-add">{busy ? 'Adding…' : ticked.length ? `Add ${ticked.length} ${ticked.length === 1 ? 'task' : 'tasks'}` : 'Add tasks'}</Button></>}>
      <div className={m.sheet} data-testid="quote-tasks-dialog">
        {failed !== null ? <p className={m.line} role="status">{failed || 'Couldn’t read the quote'} — <button type="button" className={m.inline} onClick={() => { setFailed(null); setTick((t) => t + 1) }}>try again</button></p>
          : !data ? <div aria-hidden className={m.region}><Line w="80%" lh={20} h={12} />{[200, 240, 180, 220].map((w, i) => <span key={i} className={s.item}><Slot kind="check" /><Line w={w} lh={18} h={12} /></span>)}</div>
          : !data.quote ? <p className={m.line} data-testid="quote-tasks-empty">This project has no signed quote to suggest from — add tasks by hand, or from a template.</p>
          : !rows.length ? <p className={m.line} data-testid="quote-tasks-empty">{`Every line of ${data.quote.number} is a task already.`}</p>
          : (
            <>
              <p className={m.line}>{`${data.quote.number}’s lines, by its sections. Tick the ones to add — each goes into the milestone its trade belongs to, due on its last day.`}</p>
              {data.groups.map((g) => {
                const keys = g.rows.map((r) => r.key)
                const all = keys.every((k) => ticked.includes(k))
                return (
                  <section key={g.section} className={s.section} aria-label={g.section} data-testid="quote-tasks-section">
                    <div className={s.sectionHead}><span>{g.section}</span><button type="button" className={m.inline} onClick={() => setTicked((xs) => (all ? xs.filter((x) => !keys.includes(x)) : [...new Set([...xs, ...keys])]))}>{all ? 'Untick all' : 'Tick all'}</button></div>
                    <ul className={s.list}>
                      {g.rows.map((r) => (
                        <li key={r.key} className={s.item} data-testid="quote-tasks-row">
                          <Checkbox isSelected={ticked.includes(r.key)} onChange={(on: boolean) => toggle(r.key, on)}>{r.title}</Checkbox>
                          <span className={m.help}>{r.milestoneTitle ? `In ${r.milestoneTitle}${due(r.dueDay)}` : 'On the project — no milestone takes it'}</span>
                        </li>
                      ))}
                    </ul>
                    {g.more ? <span className={m.help}>{`and ${g.more} more ${g.more === 1 ? 'line' : 'lines'} in this section`}</span> : null}
                  </section>
                )
              })}
            </>
          )}
      </div>
    </Dialog>
  )
}
