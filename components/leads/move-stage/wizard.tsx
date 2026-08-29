'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { modalPanel, overlayFade, ease, spring } from '@/lib/motion'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { displayDateTime } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'
import type { Member } from '@/lib/db/schema'
import type { StageMovement } from '@/lib/settings/types'
import { NewPanel, ContactedPanel, MetPanel, QuoteSentPanel, WonPanel } from './panels'
import { AutoFillDialog, SuggestedTasksDialog } from './dialogs'
import { emptyWizardData, stageComplete, type WizardData } from './types'
import styles from './wizard.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'

const SUGGESTED = 'Prepare sample designs and floor plan illustrations for the client'

type RailState = 'done' | 'active' | 'locked'

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
  // On Hold / Lost leads resume from the stage they left; a lead with no history starts before New.
  const fromIdx = STAGES.indexOf((STAGES as readonly string[]).includes(lead.stage) ? lead.stage as (typeof STAGES)[number] : lead.resumeStage as (typeof STAGES)[number])
  const [active, setActive] = useState<Stage>(targetStage)
  const [data, setData] = useState<WizardData>(() => ({
    ...emptyWizardData(lead.assignees.map((m) => m.id)),
    ...lead.stageData,                              // what earlier saves recorded, so completed stages open filled in
    assignees: lead.assignees.map((m) => m.id),
  }))
  const [dir, setDir] = useState(1)
  const [showError, setShowError] = useState(false)
  const [autoFillOpen, setAutoFillOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [pickedTasks, setPickedTasks] = useState<Set<string>>(new Set())
  const [extraTasks, setExtraTasks] = useState<string[]>([])
  const [autoAddedTask, setAutoAddedTask] = useState('')

  // R3: Esc closes the wizard — unless an inner dialog is open (it owns Esc then).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !autoFillOpen && !suggestOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, autoFillOpen, suggestOpen])

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }))

  const activeIdx = STAGES.indexOf(active as (typeof STAGES)[number])
  const editing = activeIdx <= fromIdx           // a completed stage is open for corrections
  const railState = (stage: Stage, i: number): RailState => {
    if (stage === active) return 'active'
    if (i <= fromIdx) return 'done'
    return 'locked'
  }
  const railIcon = (state: RailState) => state === 'done' ? 'check_circle' : state === 'locked' ? 'lock' : 'circle'
  const lockReason = (i: number) => {
    const gate = i === fromIdx + 1 ? targetStage : STAGES[i - 1]
    return mode === 'linear' ? `Complete ${gate} first` : `Available once the lead reaches ${STAGES[i - 1]}`
  }

  const goTo = (stage: Stage, i: number) => {
    setDir(i > activeIdx ? 1 : -1)
    setActive(stage)
    setShowError(false)
  }

  const handleAutoFillUpload = () => {
    // Clock read lives in the event handler (render stays pure).
    setAutoAddedTask(`Schedule a meeting with the client for ${displayDateTime(new Date(Date.now() + 12 * 86400000))}`)
    // Scripted magic moment: fills Log 1 with the mock's values, then suggests tasks.
    setData((d) => ({
      ...d,
      logs: d.logs.map((l, i) => i === 0 ? {
        ...l,
        channel: 'WhatsApp',
        when: '12/8/2026, 3:00PM',
        outcome: 'Callback requested',
        nextStepWhen: '24/8/2026, 7:00PM',
        nextStepMode: 'WhatsApp',
        files: l.files.length ? l.files : ['Q-101'],
      } : l),
    }))
    setAutoFillOpen(false)
    setTimeout(() => setSuggestOpen(true), 250)
  }

  const save = () => {
    if (!stageComplete(active, data)) { setShowError(true); return }
    if (editing) onUpdate({ stage: active, data })
    else onSave({ toStage: active, data, tasks: extraTasks })
  }

  const panelTitle = editing ? `${active} details` : `Moving to ${active}`
  const panel = () => {
    switch (active) {
      case 'New': return <NewPanel team={team} data={data} update={update} />
      case 'Contacted': return (
        <>
          <div className={styles.rowBetween ?? ''} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <p className={styles.panelTitle}>{panelTitle}</p>
            <button type="button" className={styles.autoFill}
                    onClick={() => setData((d) => ({ ...d, logs: [...d.logs.map((l) => ({ ...l, collapsed: true })), ...[{ channel: null, when: '', outcome: '', nextStepWhen: '', nextStepMode: '', files: [], notes: '' }]] }))}>
              <Icon name="add" size={20} />
              Add Log
            </button>
          </div>
          <ContactedPanel data={data} update={update} onAutoFill={() => setAutoFillOpen(true)} />
        </>
      )
      case 'Met': return (<><p className={styles.panelTitle}>{panelTitle}</p><MetPanel data={data} update={update} /></>)
      case 'Quote Sent': return (<><p className={styles.panelTitle}>{panelTitle}</p><QuoteSentPanel data={data} update={update} leadBudgetMinor={lead.budgetMinor} /></>)
      case 'Won': return (<><p className={styles.panelTitle}>{panelTitle}</p><WonPanel data={data} update={update} leadBudgetMinor={lead.budgetMinor} /></>)
      default: return null
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="ov" className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                  onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div className={styles.modal} variants={modalPanel} initial="initial" animate="animate" exit="exit"
                    role="dialog" aria-label="Move stage">
          <div className={styles.head}>
            <div className={styles.headText}>
              <span className={styles.title}>Move stage</span>
              <span className={styles.subtitle}>
                <span>{lead.name}</span><span>·</span><span>Current stage: {lead.stage}</span>
              </span>
            </div>
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <Icon name="close" size={24} family="outlined" />
            </button>
          </div>
          <div className={styles.body}>
            <div className={styles.rail} role="tablist" aria-label="Stages">
              {STAGES.map((s, i) => {
                const st = railState(s, i)
                const locked = st === 'locked'
                return (
                  /* aria-disabled, not `disabled`: a disabled button swallows the pointer, and the tooltip explains the lock. */
                  <Tooltip key={s} label={locked ? lockReason(i) : ''} side="right" disabled={!locked}>
                    <button type="button" role="tab" aria-selected={s === active} aria-disabled={locked || undefined}
                            className={styles.railItem} data-state={st}
                            onClick={locked ? undefined : () => goTo(s, i)}>
                      <motion.span className={styles.railIcon} data-kind={st}
                                   initial={false}
                                   animate={st === 'done' ? { scale: [0.6, 1] } : { scale: 1 }}   /* springs take 2 keyframes max — the overshoot is the pop */
                                   transition={spring.pop}>
                        <Icon name={railIcon(st)} size={20}
                              weight={st === 'done' ? 300 : 400}
                              fill={st === 'done'} />
                      </motion.span>
                      <span className={styles.railLabel}>{s}</span>
                    </button>
                  </Tooltip>
                )
              })}
            </div>
            <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
              <AnimatePresence mode="popLayout" custom={dir}>
                <motion.div
                  key={active}
                  className={styles.panel}
                  style={{ height: '100%' }}
                  initial={{ opacity: 0, x: dir * 16 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: ease.decelerate } }}
                  exit={{ opacity: 0, x: dir * -16, transition: { duration: 0.15, ease: ease.standard } }}
                >
                  {panel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className={styles.foot}>
            {showError ? (
              <motion.span className={styles.footError}
                           initial={{ x: 0 }}
                           animate={{ x: [0, -4, 4, -4, 0], transition: { duration: 0.28 } }}>
                <Icon name="error" size={16} />
                {editing ? 'Unable to save. Please fill in the required fields.' : 'Unable to move. Please fill in the required fields.'}
              </motion.span>
            ) : <span className={styles.footSpacer} />}
            <div className={styles.footBtns}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={save}>
                {editing ? 'Save changes' : active === 'Won' ? 'Save & Convert to Project' : 'Save'}
              </Button>
            </div>
          </div>
        </motion.div>

        <AutoFillDialog open={autoFillOpen} onClose={() => setAutoFillOpen(false)} onUpload={handleAutoFillUpload} />
        <SuggestedTasksDialog
          open={suggestOpen}
          onClose={() => setSuggestOpen(false)}
          onSave={() => {
            setExtraTasks([autoAddedTask, ...Array.from(pickedTasks)])
            setSuggestOpen(false)
          }}
          autoAdded={autoAddedTask}
          suggestions={[SUGGESTED]}
          picked={pickedTasks}
          onToggle={(s) => setPickedTasks((p) => { const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n })}
        />
      </motion.div>
    </AnimatePresence>
  )
}
