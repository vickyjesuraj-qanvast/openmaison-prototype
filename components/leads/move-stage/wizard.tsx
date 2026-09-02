'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { modalPanel, overlayFade, duration, ease, spring } from '@/lib/motion'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { displayDateTime } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'
import type { Member } from '@/lib/db/schema'
import type { StageMovement } from '@/lib/settings/types'
import { NewPanel, ContactedPanel, MetPanel, QuoteSentPanel, WonPanel } from './panels'
import { AutoFillDialog, SuggestedTasksDialog } from './dialogs'
import { LinkButton } from './fields'
import { emptyLog, emptyMeeting, emptyWizardData, validateStage, type StageErrors, type WizardData } from './types'
import styles from './wizard.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { ReadOnlyScope } from '@/components/om/read-only'

const SUGGESTED = 'Prepare sample designs and floor plan illustrations for the client'

type RailState = 'done' | 'active' | 'todo' | 'locked'

/**
 * Move stage (780:83579 / 780:91593) under stage-movement policy (user 2026-08-29):
 * one stage is open for capture — the one the lead is moving into. Stages the lead
 * has already passed stay editable (a mistake can be fixed and saved); later stages
 * are locked until the current one is done. Flexible movement only opens this
 * window for Won (it creates the project), with the same rail.
 */
export function MoveStageWizard({
  lead, team, targetStage, mode = 'linear', onClose, onSave, onUpdate,
}: {
  lead: LeadRow
  team: Member[]
  targetStage: Stage
  mode?: StageMovement
  onClose: () => void
  onSave: (payload: { toStage: Stage; data: WizardData; tasks: string[] }) => void
  /** Saving edits to a stage the lead has already completed — no move. */
  onUpdate: (payload: { stage: Stage; data: WizardData }) => void
}) {
  useScrollLock(true)   // the page never scrolls behind this surface
  /* (REG-273) Touch: a locked stage explains itself through a Tooltip, and the DS Tooltip never fires for a
     touch pointer — so below 768 the tap answers with the same sentence in the app's snackbar instead. The
     breakpoint has to be read in render because it decides whether the row has a click handler at all; the
     server snapshot is always the desktop answer, so nothing changes for a mouse. */
  const snackbar = useSnackbar()
  const touch = useMediaQuery(MOBILE)
  // R3: Esc closes the window when it is the topmost surface (an inner dialog / menu / picker owns Esc while open); focus
  // moves in on open and returns to the opener on close (components/om/surface.ts).
  const panelRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  useEscapeLayer(true, panelRef, onClose)
  useDialogFocus(true, panelRef)
  // On Hold / Lost leads resume from the stage they left; a lead with no history starts before New.
  const fromIdx = STAGES.indexOf((STAGES as readonly string[]).includes(lead.stage) ? lead.stage as (typeof STAGES)[number] : lead.resumeStage as (typeof STAGES)[number])
  const [active, setActive] = useState<Stage>(targetStage)
  const [data, setData] = useState<WizardData>(() => ({
    ...emptyWizardData(lead.assignees.map((m) => m.id)),
    ...lead.stageData,                              // what earlier saves recorded, so completed stages open filled in
    assignees: lead.assignees.map((m) => m.id),
  }))
  const [dir, setDir] = useState(1)
  // A completed stage is read-only until Edit (user 2026-08-29). Log stages unlock per log ('logs.0', 'meetings.1'); other stages as a whole ('stage').
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set())
  const unlock = (k: string) => setUnlocked((u) => new Set(u).add(k))
  const [showErrors, setShowErrors] = useState(false)
  // Day-granular today for the date pickers — read once, never Date.now() in render output.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  // Auto Fill targets the log whose button was pressed (index into logs / meetings); null = dialog closed.
  const [autoFillFor, setAutoFillFor] = useState<number | null>(null)
  const autoFillOpen = autoFillFor !== null
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [pickedTasks, setPickedTasks] = useState<Set<string>>(() => new Set([SUGGESTED]))
  const [autoAddedTask, setAutoAddedTask] = useState('')

  // (REG-269) Mobile: the stage rail is a horizontal strip across the top of the sheet, so the open stage has to be
  // scrolled into view. Move the strip's OWN scrollLeft — scrollIntoView would scroll the sheet's ancestors too and
  // break the sticky header / footer. A no-op at desktop, where the vertical rail never overflows sideways.
  useEffect(() => {
    const rail = railRef.current
    if (!rail || rail.scrollWidth <= rail.clientWidth) return
    const item = rail.querySelector<HTMLElement>('[data-state="active"]')
    if (!item) return
    const railBox = rail.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    rail.scrollLeft += itemBox.left - railBox.left - (railBox.width - itemBox.width) / 2   // centred; the browser clamps the range
  }, [active])

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }))
  // Errors only surface after the first Save attempt, then re-compute live so each clears as the user fixes it.
  const errors: StageErrors = showErrors ? validateStage(active, data) : {}

  const activeIdx = STAGES.indexOf(active as (typeof STAGES)[number])
  const editing = activeIdx <= fromIdx           // a completed stage is open
  const logKey = active === 'Contacted' ? 'logs' : active === 'Met' ? 'meetings' : null   // stages that are a list of logs (780:89150 / 780:90234)
  const stageLocked = editing && !logKey && !unlocked.has('stage')   // whole-stage read-only (Quote Sent / Won); New never becomes editable here
  const lockedLog = (i: number) => editing && !unlocked.has(`${logKey}.${i}`)
  // Removing a log shifts the later ones down — their unlock keys move with them.
  const deleteLog = (i: number) => {
    if (!logKey) return
    setData((d) => logKey === 'logs' ? { ...d, logs: d.logs.filter((_, j) => j !== i) } : { ...d, meetings: d.meetings.filter((_, j) => j !== i) })
    setUnlocked((u) => new Set(Array.from(u).flatMap((k) => {
      const m = new RegExp(`^${logKey}\\.(\\d+)$`).exec(k)
      if (!m) return [k]
      const n = Number(m[1])
      return n === i ? [] : n > i ? [`${logKey}.${n - 1}`] : [k]
    })))
  }
  const anyOpen = !editing || unlocked.size > 0
  // Reviewing a completed stage never locks the stage being entered — it stays open ('todo') to come back to.
  const railState = (stage: Stage, i: number): RailState => {
    if (stage === active) return 'active'
    if (i <= fromIdx) return 'done'
    if (stage === targetStage || i === fromIdx + 1) return 'todo'   // the next stage stays reachable even when a done stage was opened for viewing
    return 'locked'
  }
  const isDone = (i: number) => i <= fromIdx
  const railIcon = (state: RailState, done: boolean) => done ? 'check_circle' : state === 'locked' ? 'lock' : 'circle'
  // Same phrase as the listing's blockedReason (workspace.tsx): the lead's next stage is the gate.
  const lockReason = (i: number) =>
    mode === 'linear' ? `Complete ${STAGES[fromIdx + 1]} first` : `Available once the lead reaches ${STAGES[i - 1]}`

  const goTo = (stage: Stage, i: number) => {
    setDir(i > activeIdx ? 1 : -1)
    setActive(stage)
    setShowErrors(false)
    setUnlocked(new Set())
  }

  const handleAutoFillUpload = () => {
    const target = autoFillFor
    if (target === null) return
    // Clock read lives in the event handler (render stays pure).
    setAutoAddedTask(`Schedule a meeting with the client for ${displayDateTime(new Date(Date.now() + 12 * 86400000))}`)
    if (active === 'Met') {
      // Scripted: the site photo fills the meeting log whose Auto Fill was pressed.
      setData((d) => ({ ...d, meetings: d.meetings.map((m, i) => i === target ? { ...m, where: m.where || 'In person', when: m.when || '1/9/2026, 10:40 AM', files: m.files.length ? m.files : ['Site-photos.pdf'] } : m) }))
      setAutoFillFor(null)
      return
    }
    // Scripted magic moment: fills the pressed log with the mock's values; Save then suggests tasks (REG-148).
    setData((d) => ({
      ...d,
      logs: d.logs.map((l, i) => i === target ? {
        ...l,
        channel: 'WhatsApp',
        when: '12/8/2026, 3:00 PM',
        outcome: 'Callback requested',
        nextStepWhen: '24/8/2026, 7:00 PM',
        nextStepMode: 'WhatsApp',
        files: l.files.length ? l.files : ['Q-101'],
      } : l),
    }))
    setAutoFillFor(null)
  }

  const save = () => {
    const errs = validateStage(active, data)
    if (Object.keys(errs).length) {
      setShowErrors(true)
      // Never hide an error inside a collapsed log (REG-124) — for both log-list stages.
      if (logKey) {
        const errored = (i: number) => Object.keys(errs).some((k) => k.startsWith(`${logKey}.${i}.`))
        setData((d) => logKey === 'logs'
          ? { ...d, logs: d.logs.map((l, i) => l.collapsed && errored(i) ? { ...l, collapsed: false } : l) }
          : { ...d, meetings: d.meetings.map((m, i) => m.collapsed && errored(i) ? { ...m, collapsed: false } : m) })
      }
      return
    }
    if (editing) { onUpdate({ stage: active, data }); return }
    if (active === 'Contacted') {
      // Journey (user 2026-08-29): fields (manual or Auto Fill) → Save → Suggested tasks → Save there completes the stage.
      // Logs append oldest → newest (Add Log), so the operative commitment is the last one with a next step —
      // the first match dated the task from a superseded log.
      const next = [...data.logs].reverse().find((l) => l.nextStepWhen)?.nextStepWhen
      setAutoAddedTask(`Schedule a meeting with the client for ${next ?? displayDateTime(new Date(Date.now() + 12 * 86400000))}`)   // clock read in the handler
      setSuggestOpen(true)
      return
    }
    onSave({ toStage: active, data, tasks: [] })
  }
  const finishWithTasks = (tasks: string[]) => { setSuggestOpen(false); onSave({ toStage: active, data, tasks }) }

  const panelTitle = editing ? `${active} details` : `Moving to ${active}`
  const editLink = stageLocked && active !== 'New' ? (
    <LinkButton icon="edit" onClick={() => unlock('stage')}>Edit</LinkButton>
  ) : null
  // Title row lives outside the read-only scope so Edit (and Add Log) stay clickable while the fields are disabled.
  const head = active === 'New' ? null : (
    <div className={styles.titleRow}>
      <p className={styles.panelTitle}>{panelTitle}</p>
      {logKey ? (
        <LinkButton icon="add"
                    onClick={() => {
                      // The new log opens for capture; existing logs keep their own lock (user 2026-08-29).
                      unlock(`${logKey}.${logKey === 'logs' ? data.logs.length : data.meetings.length}`)
                      setData((d) => logKey === 'logs'
                        ? { ...d, logs: [...d.logs.map((l) => ({ ...l, collapsed: true })), emptyLog()] }
                        : { ...d, meetings: [...d.meetings.map((x) => ({ ...x, collapsed: true })), emptyMeeting()] })
                    }}>
          Add Log
        </LinkButton>
      ) : editLink}
    </div>
  )
  const panel = () => {
    switch (active) {
      case 'New': return <NewPanel team={team} data={data} update={update} />
      case 'Contacted': return <ContactedPanel data={data} update={update} errors={errors} today={today} onAutoFill={setAutoFillFor} lockedLog={lockedLog} onEditLog={editing ? (i) => unlock(`logs.${i}`) : undefined} onDeleteLog={deleteLog} />
      case 'Met': return <MetPanel data={data} update={update} errors={errors} today={today} onAutoFill={setAutoFillFor} lockedLog={lockedLog} onEditLog={editing ? (i) => unlock(`meetings.${i}`) : undefined} onDeleteLog={deleteLog} />
      case 'Quote Sent': return <QuoteSentPanel data={data} update={update} errors={errors} leadBudgetMinor={lead.budgetMinor} />
      case 'Won': return <WonPanel data={data} update={update} errors={errors} leadBudgetMinor={lead.budgetMinor} leadName={lead.name} />
      default: return null
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="ov" className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                  onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div ref={panelRef} className={styles.modal} variants={modalPanel} initial="initial" animate="animate" exit="exit"
                    role="dialog" aria-modal="true" aria-label="Move stage" tabIndex={-1}>
          <div className={styles.head}>
            <div className={styles.headText}>
              <span className={styles.title}>Move stage</span>
              <span className={styles.subtitle}>
                <span>{lead.name}</span><span>·</span><span>Current stage: {lead.stage}</span>
              </span>
            </div>
            <Tooltip label="Close">
              <IconButton icon="close" label="Close" size={24} variant="bare" iconSize={24} iconFamily="outlined" onClick={onClose} />
            </Tooltip>
          </div>
          <div className={styles.body}>
            <div ref={railRef} className={styles.rail} role="tablist" aria-label="Stages">
              {STAGES.map((s, i) => {
                const st = railState(s, i)
                const done = isDone(i)          // a completed stage keeps its check even while it is the open tab
                const locked = st === 'locked'
                return (
                  /* aria-disabled, not `disabled`: a disabled button swallows the pointer, and the tooltip explains the lock.
                     On touch (REG-273) the tooltip cannot fire, so the locked row answers the tap with the same sentence
                     in the snackbar — the second channel the strip needs at ≤767. */
                  <Tooltip key={s} label={locked ? lockReason(i) : ''} side="right" disabled={!locked}>
                    <button type="button" role="tab" aria-selected={s === active} aria-disabled={locked || undefined}
                            className={styles.railItem} data-state={st}
                            onClick={locked
                              ? (touch ? () => snackbar({ message: lockReason(i) }) : undefined)
                              : () => goTo(s, i)}>
                      <motion.span className={styles.railIcon} data-kind={done ? 'done' : st}
                                   initial={false}
                                   animate={done ? { scale: [0.6, 1] } : { scale: 1 }}   /* springs take 2 keyframes max — the overshoot is the pop */
                                   transition={spring.pop}>
                        <Icon name={railIcon(st, done)} size={20}
                              weight={done ? 300 : 400}
                              fill={done} />
                      </motion.span>
                      <span className={styles.railLabel}>{s}</span>
                    </button>
                  </Tooltip>
                )
              })}
            </div>
            {/* .panelWrap carries what this used to hold inline (flex:1 · min-width:0 · relative · overflow hidden);
                it is a class so the ≤767 sheet can add min-height:0 in the column layout (REG-269). */}
            <div className={styles.panelWrap}>
              <AnimatePresence mode="popLayout" custom={dir}>
                <motion.div
                  key={active}
                  className={styles.panel}
                  style={{ height: '100%' }}
                  initial={{ opacity: 0, x: dir * 16 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: duration.step, ease: ease.decelerate } }}
                  exit={{ opacity: 0, x: dir * -16, transition: { duration: duration.modalExit, ease: ease.standard } }}
                >
                  {head}
                  <ReadOnlyScope readOnly={stageLocked}>{panel()}</ReadOnlyScope>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className={styles.foot}>
            {showErrors && Object.keys(errors).length ? (
              <motion.span className={styles.footError}
                           initial={{ x: 0 }}
                           animate={{ x: [0, -4, 4, -4, 0], transition: { duration: duration.sheet } }}   /* the 280ms shake — no dedicated shake token in lib/motion yet */
              >
                <Icon name="error" size={16} />
                {editing ? 'Unable to save. Please fill in the required fields.' : 'Unable to move. Please fill in the required fields.'}
              </motion.span>
            ) : <span className={styles.footSpacer} />}
            <div className={styles.footBtns}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              {!anyOpen ? null : (
                <Button onPress={save}>
                  {editing ? 'Save changes' : active === 'Won' ? 'Save & Convert to Project' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <AutoFillDialog open={autoFillOpen} onClose={() => setAutoFillFor(null)} onUpload={handleAutoFillUpload} />
        <SuggestedTasksDialog
          open={suggestOpen}
          onClose={() => finishWithTasks([])}   /* Cancel / ✕: the stage details are already valid — complete the move without tasks */
          onSave={() => finishWithTasks([autoAddedTask, ...Array.from(pickedTasks)])}
          autoAdded={autoAddedTask}
          suggestions={[SUGGESTED]}
          picked={pickedTasks}
          onToggle={(s) => setPickedTasks((p) => { const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n })}
        />
      </motion.div>
    </AnimatePresence>
  )
}
