'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tabs } from '@/components/om/tabs'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { DetailSkeleton } from '@/components/shell/detail-skeleton'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { AssignPopover } from '@/components/leads/assign-popover'
import { DeleteLeadDialog } from '@/components/leads/delete-dialog'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { LeadFormModal } from '@/components/leads/lead-form'
import { LostDialog, OnHoldDialog } from '@/components/leads/move-stage/dialogs'
import { AskClientDialog } from '@/components/leads/questionnaire/ask-client-dialog'
import { MoveStageWizard } from '@/components/leads/move-stage/wizard'
import { StageDropdown } from '@/components/leads/stage-dropdown'
import { TasksPopover, type TasksPos } from '@/components/leads/tasks-popover'
import { AiBrief } from '@/components/leads/detail/ai-brief'
import { ActivityCard } from '@/components/leads/detail/activity-card'
import { FilesCard } from '@/components/leads/detail/files-card'
import { InfoColumn } from '@/components/leads/detail/info-column'
import { LeadStagesCard } from '@/components/leads/detail/stages-card'
import { MyWorkCard } from '@/components/leads/detail/my-work-card'
import { QuestionnaireCard } from '@/components/leads/detail/questionnaire-card'
import { QuickLinks } from '@/components/leads/detail/quick-links'
import { QuoteCard } from '@/components/leads/detail/quote-card'
import { LeadReturnedCard } from '@/components/leads/detail/returned-card'
import { InvitePortalModal } from '@/components/leads/return/invite-portal-modal'
import { ReturnDetailsModal } from '@/components/leads/return/return-details-modal'
import { ReturnLeadWizard } from '@/components/leads/return/return-lead-wizard'
import { assignMembers, addTask, completeTask, deleteLead, moveStage, quickMoveStage, setTaskDue, undoStageMove, updateLead, updateStageDetails } from '@/app/leads/actions'
import { returnLead, undoReturn, type ReturnInput } from '@/app/leads/return-actions'
import type { LeadFile } from '@/lib/db/schema'
import type { LeadDetail } from '@/lib/leads/detail'
import { returnTags } from '@/lib/leads/return-tags'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { briefsFor } from '@/lib/leads/briefs'
import { displayDate, moneyCompact } from '@/lib/format'
import { DETAIL_TABS, blockedReason, canReturnLead, detailHref, isActiveStage, journeyIdx, type DetailTabSlug } from '@/lib/leads/stage-policy'
import styles from './overview.module.css'

type Anchored = { el: HTMLElement; top: number; left: number } | null
/* Anchored popovers are fixed-position; these derive their spot from the anchor so they can follow it while the page scrolls. */
const stagePos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { top: Math.min(r.bottom + 4, window.innerHeight - 360), left: r.left } }
const anchorRect = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { el, top: Math.min(r.bottom + 4, window.innerHeight - 460), left: Math.min(r.left, window.innerWidth - 420) } }
const tasksPos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { top: Math.min(r.bottom + 4, window.innerHeight - 520), left: Math.min(r.left, window.innerWidth - 420) } }
const offscreen = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > window.innerHeight }

/**
 * Lead Details › Overview (858-24770): the lead's home. Every rule the listing already settled applies here unchanged —
 * stage movement policy (REG-111…132) behind the header pill, tasks/assign flows, the Lead form as the editor,
 * Qanvast-only returns (REG-139), tooltips + coming-soon on every inert affordance. Spec dumps: design-source/context/lead-overview/.
 */
/**
 * `body` renders a tab's own content inside the lead frame (Tasks tab); `wide` drops the info column (the Tasks mock 902-26362
 * has none). Without either, the frame shows the coming-soon body for tabs that have no mocks yet.
 * `origin="qanvast"` (931:49680, `?from=qanvast`): the L2 crumb reads "Qanvast Ops / Leads" and back goes to /qanvast-ops.
 */
export function LeadOverview({ detail, tab, body, wide = false, origin }: { detail: LeadDetail; tab: DetailTabSlug; body?: ReactNode; wide?: boolean; origin?: 'qanvast' }) {
  const { lead, team, now, stageMovement, timeline, parked, daysInPipeline, activity, quote, files, questionnaire, ret } = detail
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const refresh = () => router.refresh()
  /** Server actions awaited after their dialog has closed: a failure lands in the snackbar instead of vanishing (audit 2026-08-30). */
  const run = async (work: () => Promise<void>, failure: string) => { try { await work() } catch { snackbar({ message: failure }) } }

  /* ── stage movement (shared policy helpers) ── */
  const [stageMenu, setStageMenu] = useState<{ top: number; left: number; el: HTMLElement } | null>(null)
  const [wizard, setWizard] = useState<Stage | null>(null)
  const [onHold, setOnHold] = useState(false)
  const [lost, setLost] = useState(false)
  const [confirmMove, setConfirmMove] = useState<Stage | null>(null)
  const [holdOpenedAt, setHoldOpenedAt] = useState(0)
  const [holdReason, setHoldReason] = useState('Property delay')
  const [holdDuration, setHoldDuration] = useState('3 months')
  const [lostReason, setLostReason] = useState('Property too far')
  const holdFollowUp = useMemo(() => {
    const days = holdDuration.startsWith('1') ? 30 : holdDuration.startsWith('3') ? 90 : 180
    return displayDate(new Date((holdOpenedAt || 0) + days * 86400000))
  }, [holdDuration, holdOpenedAt])

  const quickMove = async (stage: Stage) => {
    const { logId } = await quickMoveStage({ leadId: lead.id, fromStage: lead.stage, toStage: stage })
    snackbar({ message: `Moved to ${stage}`, actionLabel: 'Undo', onAction: () => { void undoStageMove({ leadId: lead.id, logId, toStage: lead.stage }).then(refresh) } })
    refresh()
  }
  /** Every stage change on this page — pill, stages card, quick links — comes through here (same branches as the listing). */
  const requestStageChange = (stage: Stage) => {
    if (lead.stage === stage) return
    if (stage === 'On Hold') { setHoldReason('Property delay'); setHoldDuration('3 months'); setHoldOpenedAt(Date.now()); setOnHold(true); return }
    if (stage === 'Lost') { setLostReason('Property too far'); setLost(true); return }
    const from = journeyIdx(lead), to = STAGES.indexOf(stage as (typeof STAGES)[number])
    if (!isActiveStage(lead.stage)) { setConfirmMove(stage); return }          // parked lead resumes: one confirm, any stage
    if (to <= from) { setWizard(stage); return }                                // completed stages open for viewing / Edit (REG-132)
    if (stageMovement === 'linear') {
      if (to === from + 1) { setWizard(stage); return }
      snackbar({ message: blockedReason(lead, stage, stageMovement) ?? `Complete ${STAGES[from + 1]} first` })
      return
    }
    if (stage === 'Won') { setWizard(stage); return }
    void quickMove(stage)
  }

  /* ── popovers, dialogs ── */
  const [kebabOpen, setKebabOpen] = useState(false)
  const [assign, setAssign] = useState<Anchored>(null)
  const [tasksFor, setTasksFor] = useState<({ el: HTMLElement } & TasksPos) | null>(null)
  const [leadForm, setLeadForm] = useState<{ mode: 'edit'; lead: typeof lead } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteReason, setDeleteReason] = useState('Spam')
  const [aiOpen, setAiOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)   // QUESTIONNAIRE card › Ask Client → the Ask the client dialog (931:46853)
  /* Qanvast lead return (931:48236, spec design-source/context/lead-return/): kebab › Return Lead → wizard; LEAD RETURNED › View Details → details; kebab › Invite to Portal (931:48844). */
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnDetailsOpen, setReturnDetailsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  // Return Lead is offered to Qanvast leads only (REG-139) and not while a return is in processing or already approved; a rejected one may be returned again.
  const canReturn = canReturnLead({ source: lead.source, returnStatus: ret?.status })
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); snackbar({ message: 'Link copied' }) }
    catch { snackbar({ message: 'Couldn’t copy — please try again' }) }
  }
  const myWorkRef = useRef<HTMLDivElement>(null)
  const stagePillRef = useRef<HTMLSpanElement>(null)

  const openTasks = (anchor: HTMLElement) => {
    if (tasksFor && tasksFor.el === anchor) { setTasksFor(null); return }   // the open popover's own trigger closes it (REG-153)
    setAssign(null); setStageMenu(null)
    setTasksFor({ el: anchor, seq: Date.now(), ...tasksPos(anchor) })
  }
  const openAssign = (anchor: HTMLElement) => {
    setAssign((a) => (a?.el === anchor ? null : anchorRect(anchor)))
    setTasksFor(null); setStageMenu(null)
  }
  // Popovers follow their anchor while the page scrolls and close once it leaves the viewport (REG-129).
  const anyAnchored = !!(stageMenu || assign || tasksFor)
  useEffect(() => {
    if (!anyAnchored) return
    const follow = () => {
      setStageMenu((s) => (s ? (offscreen(s.el) ? null : { ...s, ...stagePos(s.el) }) : s))
      setAssign((s) => (s ? (offscreen(s.el) ? null : { ...s, ...anchorRect(s.el) }) : s))
      setTasksFor((s) => (s ? (offscreen(s.el) ? null : { ...s, ...tasksPos(s.el) }) : s))
    }
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [anyAnchored])

  /** Tab / quick-link hrefs keep the Qanvast origin (931:49680): `?from=qanvast` rides along so the crumb and Back stay "Qanvast Ops / Leads". */
  const href = (slug: DetailTabSlug, query?: string) => {
    const parts = [query, origin === 'qanvast' ? 'from=qanvast' : undefined].filter(Boolean)
    return parts.length ? `${detailHref(lead.id, slug)}?${parts.join('&')}` : detailHref(lead.id, slug)
  }
  const goTab = (slug: DetailTabSlug) => router.push(href(slug))
  /** New quote (QUOTES card › From Scratch, Create quick links › Quote): the Quotes tab handles it in place, elsewhere it opens with `?new=1`. */
  const onNewQuote = () => { if (tab === 'quotes') window.dispatchEvent(new CustomEvent('om:quotes:new')); else router.push(href('quotes', 'new=1')) }
  /** New note (Create quick links › Note, 931-44865): the Notes tab starts the draft in place, elsewhere it opens with `?new=note`. */
  const onNewNote = () => { if (tab === 'notes') window.dispatchEvent(new CustomEvent('om:notes:new', { detail: { kind: 'note' } })); else router.push(href('notes', 'new=note')) }
  /** New question (QUESTIONNAIRE card › Add Question, 931-46769): the Questionnaire tab opens its add card in place, elsewhere it lands with `?new=1`. */
  const onNewQuestion = () => { if (tab === 'questionnaire') window.dispatchEvent(new CustomEvent('om:questionnaire:add')); else router.push(href('questionnaire', 'new=1')) }
  const tabItems = DETAIL_TABS.map((t) => ({ label: t.label, href: href(t.slug) }))
  const activeTab = DETAIL_TABS.find((t) => t.slug === tab) ?? DETAIL_TABS[0]
  const returnedBy = ret ? team.find((m) => m.id === ret.returnedById) ?? null : null
  const aiSuggestions = useMemo(() => Array.from(new Set(briefsFor(lead.stage, lead).flatMap((b) => b.actions))).slice(0, 3), [lead])

  return (
    <PageReveal skeleton={<DetailSkeleton wide={wide} />}>
      <div className={styles.body}>
        <PageHeaderL2
          backHref={origin === 'qanvast' ? '/qanvast-ops' : '/leads'}
          crumb={origin === 'qanvast' ? 'Qanvast Ops / Leads' : 'Leads'}
          title={lead.name}
          chips={
            <>
              <MetaChip icon="call">{lead.phone}</MetaChip>
              <MetaChip icon="money_bag">{moneyCompact(lead.budgetMinor)}</MetaChip>
              <MetaChip icon="home">{lead.propertyType}</MetaChip>
              <MetaChip color="green">{lead.source}</MetaChip>
              {/* return + refund state chips (931:48553 · 931:49138): Return Processing yellow · Return Rejected red · Return Approved green + Refund Processing / Credited */}
              {returnTags(ret).map((t) => <MetaChip key={t.label} color={t.color}>{t.label}</MetaChip>)}
            </>
          }
          actions={
            <>
              <span className={styles.anchor} ref={stagePillRef}>
                <Button variant="secondary" appearance="outlined" iconEnd={<Icon name="keyboard_arrow_down" size={20} />} aria-haspopup="menu" aria-expanded={!!stageMenu}
                        onPress={() => { const el = stagePillRef.current; if (!el) return; setStageMenu((s) => (s ? null : { el, ...stagePos(el) })) }}>
                  Stage: {lead.stage}
                </Button>
              </span>
              {/* The lock glyph is the locked-until-Won cue (REG-168); a Won lead's button is actionable and drops it (REG-204). */}
              <Tooltip label={lead.stage === 'Won' ? 'Convert to Project' : 'Available once the lead is Won'}>
                <span className={styles.anchor}>
                  <Button variant="primary" iconStart={lead.stage === 'Won' ? undefined : <Icon name="lock" size={20} />} onPress={() => (lead.stage === 'Won' ? comingSoon() : snackbar({ message: 'Win the lead first — Won creates the project' }))}>
                    Convert to Project
                  </Button>
                </span>
              </Tooltip>
              <span className={styles.anchor}>
                <Tooltip label="More options" disabled={kebabOpen}>
                  <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} />
                </Tooltip>
                {/* Kebab menu per 931:49039 (Qanvast: Invite to Portal · Return Lead · Copy Link · Delete) / 931:49047 (others, no Return Lead).
                    The mock menus carry no Edit; the built overview keeps it first (its only editor entry besides the info column). */}
                <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right">
                  <DropdownItem onSelect={() => { setKebabOpen(false); setLeadForm({ mode: 'edit', lead }) }}>Edit</DropdownItem>
                  <DropdownItem onSelect={() => { setKebabOpen(false); setInviteOpen(true) }}>Invite to Portal</DropdownItem>
                  {canReturn ? (
                    <DropdownItem onSelect={() => { setKebabOpen(false); setReturnOpen(true) }}>Return Lead</DropdownItem>
                  ) : null}
                  <DropdownItem onSelect={() => { setKebabOpen(false); void copyLink() }}>Copy Link</DropdownItem>
                  <DropdownItem onSelect={() => { setKebabOpen(false); setDeleteReason('Spam'); setDeleting(true) }}>
                    <span style={{ color: 'var(--om-color-tertiary-red-default)' }}>Delete</span>
                  </DropdownItem>
                </Dropdown>
              </span>
            </>
          }
        />
        <Tabs items={tabItems} activeHref={href(tab)} aria-label="Lead sections" />

        <div className={styles.row}>
          {wide ? null : (
          <InfoColumn
            lead={lead}
            team={team}
            onEdit={() => setLeadForm({ mode: 'edit', lead })}
            onAssign={openAssign}
            onAssigneeMenu={(anchor) => openAssign(anchor)}
            onCopy={async (what, value) => {
              try { await navigator.clipboard.writeText(what === 'phone' ? `+65 ${value}` : value); snackbar({ message: 'Copied to clipboard' }) }
              catch { snackbar({ message: 'Couldn’t copy — please try again' }) }
            }}
            onWhatsApp={() => window.open(`https://wa.me/65${lead.phone}`, '_blank', 'noopener')}
            onDirections={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(lead.leadAddress ?? '')}`, '_blank', 'noopener')}
            onAddAddress={() => setLeadForm({ mode: 'edit', lead })}
            onAddNotes={() => setLeadForm({ mode: 'edit', lead })}
          />
          )}

          <div className={styles.centre} data-tab={tab || 'overview'}>
            {tab === '' ? (
              <>
                <AiBrief stage={lead.stage} lead={lead} onAction={() => comingSoon()} />
                <div className={styles.grid}>
                  <div className={styles.column}>
                    {ret ? (
                      <LeadReturnedCard ret={ret} returnedBy={returnedBy} onView={() => setReturnDetailsOpen(true)} onAppeal={comingSoon} onOpenTab={() => goTab('activity')} />
                    ) : null}
                    <LeadStagesCard
                      timeline={timeline} parked={parked} daysInPipeline={daysInPipeline}
                      onOpenStage={(stage) => {
                        if (stage === 'On Hold' || stage === 'Lost') { setWizard(lead.resumeStage ?? 'New'); return }
                        const step = timeline.find((s) => s.stage === stage)
                        if (step && step.state !== 'future') { setWizard(stage as Stage); return }
                        requestStageChange(stage as Stage)
                      }}
                      onOpenTab={() => goTab('activity')}
                    />
                    <FilesCard files={files} onOpenTab={() => goTab('files')} onCreateFolder={comingSoon} onUpload={comingSoon} />
                    <ActivityCard items={activity} now={now} onOpenTab={() => goTab('activity')} />
                  </div>
                  <div className={styles.column}>
                    <div ref={myWorkRef}>
                      <MyWorkCard
                        tasks={lead.tasks} now={now}
                        onCreate={(anchor) => openTasks(anchor)}
                        onComplete={async (task) => { try { await completeTask(task.id); refresh() } catch { snackbar({ message: 'Couldn’t complete the task — please try again' }) } }}
                        onOpenTask={(task) => router.push(href('tasks', `open=${task.id}`))}
                        onOpenTab={() => goTab('tasks')}
                      />
                    </div>
                    <QuoteCard quote={quote} onOpenTab={() => goTab('quotes')} onFromScratch={onNewQuote} onFromTemplate={comingSoon} />
                    <QuestionnaireCard q={questionnaire} onAsk={() => setAskOpen(true)} onAdd={onNewQuestion} onOpenTab={() => goTab('questionnaire')} />
                  </div>
                </div>
              </>
            ) : body ? body : (
              <div className={styles.soon} role="status">
                <span className={styles.soonTitle}>{activeTab.label}</span>
                <span>Coming soon in OpenMaison 2.0</span>
              </div>
            )}
          </div>

          <QuickLinks
            onTask={() => { if (tab === 'tasks') window.dispatchEvent(new CustomEvent('om:tasks:add')); else if (myWorkRef.current) openTasks(myWorkRef.current) }}
            onQuote={onNewQuote}
            onCallLog={() => setWizard('Contacted')}
            onNote={onNewNote}
            onMeeting={() => setWizard('Met')}
            onOther={() => comingSoon()}
          />
        </div>
      </div>

      <StageDropdown
        open={!!stageMenu}
        position={stageMenu}
        onClose={() => setStageMenu(null)}
        blocked={(stage) => blockedReason(lead, stage, stageMovement)}
        current={lead.stage as Stage}
        doneThrough={journeyIdx(lead)}
        onSelect={(stage) => { setStageMenu(null); requestStageChange(stage) }}
      />
      <ConfirmDialog
        open={!!confirmMove}
        tone="primary"
        title={`Resume at ${confirmMove ?? ''}?`}
        message={`${lead.stage} ends and the lead continues from ${confirmMove ?? ''}. Details already recorded stay on its journey.`}
        confirmLabel="Resume"
        onCancel={() => setConfirmMove(null)}
        onConfirm={() => { const stage = confirmMove; setConfirmMove(null); if (stage) void run(() => quickMove(stage), 'Couldn’t move the lead — please try again') }}
      />
      {wizard ? (
        <MoveStageWizard
          lead={lead}
          team={team}
          targetStage={wizard}
          mode={stageMovement}
          onClose={() => setWizard(null)}
          onUpdate={({ stage, data }) => {
            setWizard(null)
            void run(async () => {
              await updateStageDetails({ leadId: lead.id, stage, data })
              snackbar({ message: `${stage} details updated` })
              refresh()
            }, 'Couldn’t save the stage details — please try again')
          }}
          onSave={({ toStage, data, tasks }) => {
            setWizard(null)
            void run(async () => {
              await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage, payload: data, tasks })
              if (toStage === 'Won') snackbar({ message: `Project created for ${lead.name} · OM-10001`, actionLabel: 'View', onAction: comingSoon })
              else snackbar({ message: `Moved to ${toStage}` })
              refresh()
            }, 'Couldn’t move the lead — please try again')
          }}
        />
      ) : null}
      <OnHoldDialog
        open={onHold}
        onClose={() => setOnHold(false)}
        reason={holdReason} setReason={setHoldReason}
        duration={holdDuration} setDuration={setHoldDuration}
        followUp={holdFollowUp}
        onSave={(otherReason) => {
          setOnHold(false)
          const days = holdDuration.startsWith('1') ? 30 : holdDuration.startsWith('3') ? 90 : 180
          void run(async () => {
            await moveStage({
              leadId: lead.id, fromStage: lead.stage, toStage: 'On Hold',
              payload: { reason: otherReason ? `Others: ${otherReason}` : holdReason, duration: holdDuration, followUpAt: new Date(Date.now() + days * 86400000).toISOString() },
              tasks: [],
            })
            snackbar({ message: 'Moved to On Hold' })
            refresh()
          }, 'Couldn’t move the lead — please try again')
        }}
      />
      <LostDialog
        open={lost}
        onClose={() => setLost(false)}
        reason={lostReason} setReason={setLostReason}
        onSave={(otherReason) => {
          setLost(false)
          void run(async () => {
            await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage: 'Lost', payload: { reason: otherReason ? `Others: ${otherReason}` : lostReason }, tasks: [] })
            snackbar({ message: 'Moved to Lost' })
            refresh()
          }, 'Couldn’t move the lead — please try again')
        }}
      />
      <AssignPopover
        open={!!assign}
        team={team}
        value={lead.assignees.map((m) => m.id)}
        anchor={assign?.el}
        onClose={() => setAssign(null)}
        onApply={(memberIds) => { setAssign(null); void run(async () => { await assignMembers(lead.id, memberIds); snackbar({ message: 'Assignees updated' }); refresh() }, 'Couldn’t update the assignees — please try again') }}
        requireOne={lead.stage !== 'New'}
        position={assign}
      />
      <TasksPopover
        lead={tasksFor ? lead : null}
        pos={tasksFor}
        anchor={tasksFor?.el}
        now={now}
        onClose={() => setTasksFor(null)}
        onAddTask={async (_lead, title) => {
          try { await addTask(lead.id, title); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t add the task — please try again' }); return false }
        }}
        onCompleteTask={async (_lead, task) => {
          try { await completeTask(task.id); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t complete the task — please try again' }); return false }
        }}
        onSetDue={async (_lead, task, due) => {
          try { await setTaskDue(task.id, due); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t set the due date — please try again' }); return false }
        }}
        onOpenTask={(task) => router.push(href('tasks', `open=${task.id}`))}
      />
      <LeadFormModal
        now={now}
        form={leadForm}
        onClose={() => setLeadForm(null)}
        onSubmit={async (_mode, data, leadId) => {
          try { await updateLead(leadId ?? lead.id, data); setLeadForm(null); snackbar({ message: 'Successfully Updated' }); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t save the lead — please try again' }); return false }
        }}
      />
      <DeleteLeadDialog
        leads={deleting ? [lead] : null}
        onClose={() => setDeleting(false)}
        reason={deleteReason}
        setReason={setDeleteReason}
        onDelete={() => {
          setDeleting(false)
          // Leave the page only once the delete has succeeded.
          void run(async () => {
            await deleteLead(lead.id, deleteReason)
            snackbar({ message: 'Lead deleted' })
            router.push('/leads')
          }, 'Couldn’t delete the lead — please try again')
        }}
      />
      <AskClientDialog
        open={askOpen} leadName={lead.name}
        onClose={() => setAskOpen(false)}
        onSend={() => { setAskOpen(false); snackbar({ message: `Notification sent to ${lead.name}` }) }}
      />
      <ReturnLeadWizard
        open={returnOpen}
        lead={{ id: lead.id, name: lead.name, createdAt: lead.createdAt }}
        files={files.filter((f) => f.kind !== 'folder')}
        now={now}
        onClose={() => setReturnOpen(false)}
        onConfirm={(input: ReturnInput) => run(async () => {
          // 931:49009 → 931:48553: the return opens in processing; Undo lives as long as the snackbar (user 2026-08-30).
          const { returnId } = await returnLead(lead.id, input)
          snackbar({ message: 'Lead returned successfully', actionLabel: 'Undo', onAction: () => { void undoReturn(returnId).then(refresh) } })
          refresh()
        }, 'Couldn’t return the lead — please try again')}
      />
      {ret ? (
        <ReturnDetailsModal
          open={returnDetailsOpen}
          leadName={lead.name}
          ret={ret}
          onClose={() => setReturnDetailsOpen(false)}
          onOpenFile={(file: LeadFile) => { setReturnDetailsOpen(false); router.push(`/leads/${lead.id}/files/${file.id}`) }}
        />
      ) : null}
      <InvitePortalModal
        open={inviteOpen}
        lead={{ name: lead.name, phone: lead.phone }}
        onClose={() => setInviteOpen(false)}
        onSend={(phone: string) => {
          // Send via WhatsApp (931:48844): the ready-to-send message with the mock's portal link — invented behaviour, REG-192.
          setInviteOpen(false)
          window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(`Hi ${lead.name}, track your project on OpenMaison: http://openmaison.ai/my/portalexample/login`)}`, '_blank')
          snackbar({ message: 'WhatsApp opened with the invite' })
        }}
      />
      <AiSheet open={aiOpen} suggestions={aiSuggestions} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
      <MaisonFab onPress={() => setAiOpen((o) => !o)} />
    </PageReveal>
  )
}
