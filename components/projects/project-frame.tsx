'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tabs } from '@/components/om/tabs'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { AssignPopover } from '@/components/leads/assign-popover'
import { couldnt, useRun } from '@/components/leads/tasks/use-run'
/* (parity P-03 · P-08 · P-09, package K-A2) the lead's Create strip, the lead's Stage button and stage menu, the lead's form */
import { QuickLinkItems, QuickLinks } from '@/components/leads/detail/quick-links'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { LeadFormModal, type LeadFormData, type LeadFormField, type LeadFormOpen, type ProjectFormField, type ProjectFormValues } from '@/components/leads/lead-form'
import { CREATE_EVENTS } from '@/components/leads/tasks/use-create-intent'
import { useSheetLayout } from '@/components/om/sheet'
import { useShortcut } from '@/lib/keys/store'
import { CHANGE_RULE } from '@/lib/projects/policy'
import type { CustomValues } from '@/lib/leads/custom-fields-model'
import { createVariationOrder } from '@/app/projects/money-actions'
import { ProjectStageButton, ProjectStageMenu, TEAM_RULE, stageWord, type ProjectStageFacts, type ProjectStageMove } from './stage-menu'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { GHOST_MIN_MS, PageReveal } from '@/components/shell/page-reveal'
import { assignMembers, updateLead } from '@/app/leads/actions'
import { openLeadDesign } from '@/app/visualizer/actions'
import { renameProject, setProjectDates, setProjectValue, startProject, undoProjectValue,
  contractFolderFor, editProjectDetails, linkProjectContract, putProjectOnHold, readProjectContracts, resumeProject, undoHoldChange, type HoldUndo } from '@/app/projects/actions'   // (gaps build, package A) + hold · details · contract
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { holdSummary } from '@/lib/projects/hold'
import { HoldProjectDialog, ProjectContractDialog } from './project-record-dialogs'
import { backLabel as backLabelFor, fromLabel, withFrom } from '@/lib/nav'
import { copyText } from '@/lib/clipboard'
import { useMaisonAi } from '@/lib/maison-ai'
import { useProjectMaison } from './use-project-maison'   // (gaps build I)
import { overviewShapeOf } from './overview/shape'   // (simplify S-01) the Overview ghost's shape — K-N's
import { projectInfoDocuments } from './overview/documents'   // (simplify S-01) Key documents → the info column's Project info rows — K-N's
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { STAGE_LABEL, defaultProjectName } from '@/lib/projects/model'
import { PROJECT_TAB_GROUPS, UNCOUNTED_VIEWS, groupOf, projectBase, projectHref, type ProjectTabGroup } from '@/lib/projects/tabs'
import type { ProjectDetail } from '@/lib/projects/queries'
import { tellClientText, waLink } from '@/lib/projects/tell-client'   // (simplify P2 §6.8, contract D) Resume's "Tell {client}"
import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C) Resume's Undo takes the held email back
import { readClientTell } from '@/app/projects/tell-actions'
import { stashSitePhotos } from './updates/site-photos'   // (simplify S-23 · contract C) the site bar's Photos hands its picks to the composer
import { ProjectContextProvider, type ProjectAction, type ProjectContextValue } from './project-context'
import type { SetupAction } from '@/lib/projects/getting-started'
import { ProjectMenuItems, PROJECT_MENU_WIDTH, type ProjectMenuAction } from './project-menu'
import { ProjectLayoutsDialog } from '@/components/planner/project-layouts-dialog'
import { ProjectOverview, type ProjectStep } from './project-overview'
import { InfoColumn } from '@/components/leads/detail/info-column'   // (parity P-01) the lead's column on the project's left
import { suggestMember } from '@/lib/leads/suggest'   // (parity P-17) REG-612's suggestion when nobody is on it
import { phoneDigits, phoneDisplay, titleCaseName } from '@/lib/format'
import { scopeWords } from '@/lib/projects/model'
import type { StatusItem } from '@/lib/projects/queries'
import { ProjectDatesDialog, ProjectValueDialog, StartProjectDialog } from './project-dialogs'
import { ProjectGhost, useRememberProjectShape, useRememberSiteBar, type ProjectShape } from './project-ghost'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { useProjectEnding } from './ending/use-project-ending'   // (Projects round 7)
import { HandoverBar } from './ending/handover-bar'
import { isAccounting, opensPath, opensProjectView, projectsHome } from '@/lib/settings/roles'   // (parity map, PR-022) · (pending modules S07) where its crumb and Back lead
import styles from './project-frame.module.css'

/** (simplify S-03) A group's tab opens its first view this viewer may open — Money only for whoever sees money (F-17), and on its own address
    over its refusal (fix-G, G-37). */
const firstView = (g: ProjectTabGroup, open: (slug: string) => boolean) => g.views.find((v) => open(v.slug))?.slug ?? null

/** The Assign popover's place under the control that opened it, kept inside the viewport (its 400 × 456). */
const assignAt = (el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  return { el, top: Math.max(16, Math.min(r.bottom + 4, window.innerHeight - 472)), left: Math.max(16, Math.min(r.left, window.innerWidth - 416)) }
}

/**
 * (REG-931) A project's page — the lead page's frame (REG-91…: the L2 header whose Back returns where you came from, REG-465; the house
 * tab strip; the cards) carrying the project: its name, number and stage in the header; ONE filled action that follows the stage
 * (`primaryAction`, lib/projects/next-step.ts — round 1: Start the project); everything else in one kebab (the project's menu, the listing's
 * row menu's items). Tabs from lib/projects/tabs.ts: Overview here, Tasks · Files · Activity the lead's own components carried on (`body`).
 * (parity P-03 · P-08 · P-09 · P-11, 2026-10-08) The lead page's pieces: the "Stage: X ▾" button and stage menu (components/projects/stage-menu),
 * the Create strip with the project's set, ONE Edit details (the lead's form, the project's section after it), the ⋮ in the lead's voice.
 */
export function ProjectFrame({ d, tab, body, origin }: { d: ProjectDetail; tab: string; body?: ReactNode; origin?: string }) {
  const { project: p, lead } = d
  /* (parity map, PR-022 · FR-040) Accounting opens a project for its Money and Files: no stage, no Create strip, no ⋮, no Maison AI
     suggestions and no filled button of the team's — the strip holds Money · Files */
  const books = isAccounting(d.viewer.role)
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  /** Every tab's and every in-page link keeps where the project was opened from (REG-465). */
  const href = (slug: string, query?: string) => {
    const parts = [query, origin ? `from=${encodeURIComponent(origin)}` : undefined].filter(Boolean)
    const base = projectHref(p.id, slug)
    return parts.length ? `${base}?${parts.join('&')}` : base
  }
  const here = () => `${window.location.pathname}${window.location.search}`
  const [kebab, setKebab] = useState(false)
  const kebabRef = useRef<HTMLSpanElement>(null)
  /* (parity P-08) the header's Stage ▾ — the lead's button and its stage menu */
  const [stageOpen, setStageOpen] = useState(false)
  const stageRef = useRef<HTMLSpanElement>(null)
  const [starting, setStarting] = useState(false)
  const [dates, setDates] = useState<false | 'start' | 'end'>(false)   // (fix-A, A-28) which field the row named
  const [valueOpen, setValueOpen] = useState(false)
  const [assign, setAssign] = useState<{ el: HTMLElement; top: number; left: number } | null>(null)
  const [access, setAccess] = useState(false)   // (Projects r4a) the Client access panel (board 8)
  /* (gaps build, package A) On hold · the Contract step — (parity P-09) Edit details is the lead's form on the project's lead */
  const [holdOpen, setHoldOpen] = useState(false)
  const [editForm, setEditForm] = useState<LeadFormOpen | null>(null)
  const [contractOpen, setContractOpen] = useState(false)
  const [plannerOpen, setPlannerOpen] = useState(false)   // (gaps build J, J-Q3) the project's layouts in the 3D Space Planner
  const today = useMemo(() => new Date(d.now), [d.now])
  /* (Projects round 7) the ending's dialogs — the header's Complete handover / Review the handover, the bar, the kebab; a delete leaves
     for where the project was opened from (the listing when that was the project itself) */
  const ending = useProjectEnding({ origin, onDeleted: () => router.push(origin && !origin.startsWith(projectHref(p.id)) ? origin : '/projects') })
  const target = { id: p.id, name: p.name }
  /* (fix-A, A-22) the Overview's own shape, for the ghost that stands in for it: told to the reveal, remembered for the loader */
  /* (simplify S-01) K-N's Overview shape (Before work starts while set up, Coming up, Money / Closing, one brief) — the header's type chip and the
     column's Custom fields are the frame's */
  const shape: ProjectShape = { ...overviewShapeOf(d), typeChip: !!p.projectType, customFields: d.record.customFields.length > 0 }
  useRememberProjectShape(p.id, shape)

  /* (parity P-11) the ⋮ in the lead's voice: Edit details · the record links · Invite to Portal · Copy Link · Delete — on a phone also the Create
     strip's AI Visualizer and 3D Space Planner; the stage rows went to the Stage ▾ (P-08) */
  const onMenu = (a: ProjectMenuAction) => {
    setKebab(false)
    if (a === 'edit') editDetails()
    else if (a === 'lead') router.push(withFrom(`/leads/${lead.id}`, here()))
    else if (a === 'quote' && d.quote) router.push(withFrom(`/quotes/${d.quote.id}`, here()))
    else if (a === 'contract' && d.contract) router.push(withFrom(`/contracts/${d.contract.id}`, here()))
    else if (a === 'copy') void copyText(`${window.location.origin}/projects/${p.id}`).then(() => snackbar({ message: 'Link copied' }), () => snackbar({ message: 'Couldn’t copy — please try again' }))
    else if (a === 'access') setAccess(true)
    /* (S46B, M7) the Invite to Portal panel's See it as {client}: the real portal as the client, read-only, in a new tab — on the press */
    else if (a === 'preview' && d.withClient.portal.home) window.open(`${d.withClient.portal.home}/preview?client=${encodeURIComponent(lead.id)}`, '_blank')
    /* (S46B, M6) the Stage menu's Completed row from ⋮: Complete handover — Review the handover while one waits for this Owner or Admin */
    else if (a === 'complete') ending.open(d.ending.request && d.ending.runs ? 'review' : 'complete', target)
    else if (a === 'delete') ending.open('delete', target)   // (Projects round 7) "{name} deleted" with Undo (P-14)
    else if (a === 'visualizer') openVisualizer()   // (fix-A) 1.0's Photo Renders
    else if (a === 'planner') setPlannerOpen(true)   // (gaps build J, J-Q3)
  }
  /* (parity P-08 · Q-24) Every stage row runs its own flow, each dialog with its own title: Start the project · Complete handover (Review the
     handover, while one waits for this viewer) · Reopen · Put on hold (Change the hold, from the current On hold row) · Resume. The Overview's
     Project stages rows run the same flows (`openStep`). */
  /* (S46B, M7) See it as {client} in ⋮ — the panel's own rule: whoever works on the client (its team, their Managers, Owners, Admins), and not
     once their access is withdrawn (the panel offers it then neither); the row says why in its second line (REG-728) */
  const portal = d.withClient.portal
  const clientFirst = titleCaseName(lead.name).split(/\s+/)[0] ?? lead.name
  const seeAs = portal.home ? { first: clientFirst, why: !portal.mayAct ? TEAM_RULE : portal.state === 'withdrawn' ? `${clientFirst} can no longer open the portal` : null } : undefined
  const stageFacts: ProjectStageFacts = { stage: p.stage, held: !!p.hold, startedAt: p.startedAt ? p.startedAt.getTime() : null, mayChange: d.mayChange,
    mayHandover: d.ending.mayHandover, runs: d.ending.runs, requested: !!d.ending.request }
  const runStage = (m: ProjectStageMove) => {
    if (m === 'start') setStarting(true)
    else if (m === 'complete' || m === 'review') ending.open(m, target)
    else if (m === 'reopen') ending.open('reopen', target)
    else if (m === 'hold' || m === 'changeHold') setHoldOpen(true)
    else if (m === 'resume') resume()
  }
  /* (parity P-09 · D-08 · Q-04, the owner's pick 2026-10-08) ONE Edit details: the lead's form on the project's lead — the client's details as
     the lead page edits them (a Won project's client IS its lead's: edited in place, Q-04), NRIC / FIN, Customer ID, Area size and its unit and
     the studio's custom fields included — then the project's own section (its name, type and rooms). The ⋮'s first row, E, the info column's
     pencil (the column's rows stay inert, as the lead's do) and a `?edit=1` landing open it; whoever may not change the project is told why. */
  const editDetails = useCallback((focus?: LeadFormField | ProjectFormField) => {
    if (!d.mayChange) { snackbar({ message: couldnt('edit the details', CHANGE_RULE) }); return }
    setEditForm({ mode: 'edit', lead: d.record.lead, ...(focus ? { focus } : {}) })
  }, [d.mayChange, d.record.lead, snackbar])
  const saveDetails = async (data: LeadFormData, extras?: { customValues?: CustomValues; project?: ProjectFormValues }): Promise<boolean> => {
    const next = extras?.project
    if (!next) return false
    const was = d.record.lead
    const typed = next.name !== p.name
    const ok = await run('save the details', async () => {
      /* a name typed by hand first — a name another project holds refuses before anything else is written */
      if (typed) { const r = await renameProject(p.id, next.name); if ('error' in r) return r }
      /* the client's details as the lead page saves them — its checks, the changed fields in Activity, the portal sign-in moving with the phone */
      await updateLead(lead.id, { ...data, customValues: extras?.customValues })
      const r = await editProjectDetails(p.id, { projectType: next.projectType, scope: next.scope }); if ('error' in r) return r
      /* (Q-05) a default name follows the client and the property type — never a name someone typed (editProjectDetails' own rule) */
      if (!typed) {
        const before = defaultProjectName(was.propertyType, titleCaseName(was.name)), after = defaultProjectName(data.propertyType || 'Others', titleCaseName(data.name))
        if (p.name === before && after !== before) await renameProject(p.id, after)   // a name another project holds: the name stays as it was
      }
    }, 'Details saved', { refresh: true })   // (parity P-14) the one sentence for an edit, on both records
    if (ok) setEditForm(null)
    return ok
  }
  /* (REG-713 · parity P-09 · D-15) E edits the project and A opens Assign on every tab — Assign hangs from the info column's Collaborators link
     when it is on screen, else from the Stage button, the header's nearest control (the lead page's `assignByKey`) */
  useShortcut('edit', editDetails, !books, 'Edit the project')
  /* (parity P-11) a menu elsewhere (the listing's row ⋮) asks for Edit details with `?edit=1`: the form opens once the page has revealed, and the
     address keeps nothing (the `?new=` landings' way, components/leads/tasks/use-create-intent.ts) */
  const params = useSearchParams()
  const [landEdit] = useState(() => params.get('edit') === '1')
  const editLatest = useRef(editDetails)   // the address change re-reads the page — the landing opens with the latest record
  useEffect(() => { editLatest.current = editDetails })
  useEffect(() => {
    if (!landEdit) return
    const q = new URLSearchParams(window.location.search); q.delete('edit')
    router.replace(`${window.location.pathname}${q.size ? `?${q}` : ''}`, { scroll: false })
    const t = window.setTimeout(() => editLatest.current(), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landEdit, router])
  /* (simplify Q-16) Won opens the new project: the lead's page (another layout, so another snackbar host) hands its sentence over with
     `?created=1` — "Project P-… created" is said here, once, and the address keeps nothing */
  const [landCreated] = useState(() => params.get('created') === '1')
  useEffect(() => {
    if (!landCreated) return
    const q = new URLSearchParams(window.location.search); q.delete('created')
    router.replace(`${window.location.pathname}${q.size ? `?${q}` : ''}`, { scroll: false })
    snackbar({ message: `Project ${p.number} created` })
  }, [landCreated, router, snackbar, p.number])
  /* (gaps build, package A — M-01) a hold and a resume answer with one sentence and an Undo that puts the project back as it was */
  const holdUndo = (u: HoldUndo, back: string) => () => { void run('put it back', async () => { const x = await undoHoldChange(u); if (!('error' in x)) snackbar({ message: `${back}${unsentWords(x.unsent)}` }); return x }, undefined, { refresh: true }) }   // (simplify round 2) the Undo says when it kept the client's message from going
  /* (simplify P2 §6.8 · Q-12, contract D) …and a resume offers to tell the client: under its Undo, "Tell {client}" opens the WhatsApp draft
     (K-T's words, lib/projects/tell-client.ts) on the press itself, as every WhatsApp door does (REG-534). Nothing goes without that press. */
  const resume = () => {
    void run('resume the project', async () => {
      const r = await resumeProject(p.id); if ('error' in r) return r
      /* (simplify round 2, R2-C) the client's "running again" email waits out this Undo — the Undo takes it back and says so; its sentence
         replaces the Tell {client} offer below (same key), so nothing is left to tell */
      const u = r.undo
      snackbar({ message: `${p.name} is running again`, actionLabel: 'Undo', onAction: () => {
        void run('put it back', async () => {
          const x = await undoHoldChange(u)
          if (!('error' in x)) snackbar({ key: 'tell-client', message: `${p.name} is on hold again${unsentWords(x.unsent)}` })
          return x
        }, undefined, { refresh: true })
      } })
      const t = await readClientTell(p.id).catch(() => null)   // the words are drafted now, so the press opens WhatsApp at once
      if (t && !('error' in t)) {
        const first = t.client.split(/\s+/)[0] ?? t.client
        const text = tellClientText('resume', { client: t.client, studio: t.studio, url: t.path ? `${window.location.origin}${t.path}` : null })
        snackbar({ key: 'tell-client', message: `Let ${first} know on WhatsApp`, actionLabel: `Tell ${first}`, onAction: () => { window.open(waLink(t.phone, text), '_blank', 'noopener') } })
      }
    }, undefined, { refresh: true })
  }
  const readContracts = useCallback(() => readProjectContracts(p.id), [p.id])
  const openAssign = (el: HTMLElement) => {
    setAssign((cur) => (cur?.el === el ? null : assignAt(el)))
  }
  const assignByKey = useCallback(() => {
    const at = Array.from(document.querySelectorAll<HTMLElement>('[data-kb="assign"]')).find((el) => el.getClientRects().length > 0) ?? stageRef.current
    if (at) setAssign(assignAt(at))
  }, [])
  useShortcut('assign', assignByKey, !books, 'Assign')
  /* (fix-A, the 1.0 parity gap: 1.0's project header had Photo Renders) the project's lead's design in the AI Visualizer — found, or made on
     first open, as the lead page's quick link does (`openLeadDesign`); Back returns here. Nothing metered (Q-30). */
  const [openingDesign, startOpeningDesign] = useTransition()
  const openVisualizer = () => {
    if (openingDesign) return
    const back = here()
    startOpeningDesign(async () => {
      const r = await openLeadDesign(lead.id).catch(() => ({ error: 'Couldn’t open the design — please try again' }))
      if ('error' in r) { snackbar({ message: r.error }); return }
      startOpeningDesign(() => router.push(withFrom(`/visualizer/${r.id}`, back)))
    })
  }
  const onSetup = (s: SetupAction, el?: HTMLElement) => {
    if (s === 'dates:start' || s === 'dates:end') setDates(s === 'dates:end' ? 'end' : 'start')
    else if (s === 'value') setValueOpen(true)
    else if (s === 'quote' && d.quote) router.push(withFrom(`/quotes/${d.quote.id}`, here()))
    else if (s === 'invite') setAccess(true)   // (Projects r4a) Getting started › Invite the client
    else if (s === 'schedule') router.push(href('schedule'))   // (Projects round 2)
    else if (s === 'contract') setContractOpen(true)   // (gaps build, package A — 6)
    /* (fix-A, A-11) the popover anchors to the row that was pressed; (parity P-01) else the info column's Collaborators link, as A finds it */
    else if (s === 'assign') { const at = el ?? Array.from(document.querySelectorAll<HTMLElement>('[data-kb="assign"]')).find((x) => x.getClientRects().length > 0) ?? null; if (at && d.assignable.length) openAssign(at) }
  }
  /* (parity P-02) a Project stages row with no address — and the FAB's "What needs attention?" row — opens one of the page's own dialogs */
  const runItem = (r: NonNullable<StatusItem['run']>) => {
    if (r === 'invite' || r === 'dates:end') onSetup(r)
    else if (r === 'visualizer') openVisualizer()
    else if (r === 'hold') setHoldOpen(true)
    else if (r === 'setup') document.querySelector('[data-card="needs"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })   // (simplify S-01) Getting started's leftovers are Needs you rows ("Before work starts")
  }
  /* (parity P-01 · P-09 · Q-04) the info column's pencil — the frame's Edit details (`editDetails`, package K-A2): the lead's form in place, a
     Won project's client being its lead's, with the project's own section after it */
  const editRecord = () => editDetails()
  /* (parity P-05 · A-07) the step a Project stages row presses into — the flows the kebab and the primary already run */
  const openStep = (step: ProjectStep) => {
    if (step === 'start') setStarting(true)
    else if (step === 'handover') ending.open(d.ending.request && d.ending.runs ? 'review' : 'complete', target)
    else if (step === 'reopen') ending.open('reopen', target)
    else if (step === 'resume') resume()
  }
  /* (simplify S-02, the build's contract B) ONE door for an action — the header's filled button (now always the top Needs you row's action) and
     every Needs you row (through the page's context): a `run` opens the page's own flow — every run of `PrimaryRun` —, an `href` navigates,
     keeping where the project was opened from (REG-465). `el` hangs Assign from the control that was pressed. */
  const keepFrom = (to: string) => (origin && to.startsWith(projectBase(p.id)) && !/[?&]from=/.test(to) ? `${to}${to.includes('?') ? '&' : '?'}from=${encodeURIComponent(origin)}` : to)
  const runAction = (a: ProjectAction, el?: HTMLElement | null) => {
    const r = a.run
    if (r === 'start') setStarting(true)
    else if (r === 'update') router.push(href('updates', 'compose=1'))   // (REG-957) the Updates tab, its composer open
    else if (r === 'schedule') router.push(href('schedule'))   // (Projects round 2) the Start card
    else if (r === 'share') router.push(href('schedule', 'share=1'))   // (Projects round 2) Share changes opens on the Schedule
    else if (r === 'handover') ending.open('complete', target)   // (Projects round 7) Complete handover
    else if (r === 'review') ending.open('review', target)
    else if (r === 'resume') resume()   // (gaps build, package A — M-01)
    else if (r === 'invoice') router.push(href('money', `open=${encodeURIComponent(a.target ?? '')}&send=1`))   // (gaps build B, item 5) Money, the invoice's send open
    /* (simplify S-02) Getting started's leftovers are Needs you rows now ("Before work starts") — the same dialogs Getting started opened */
    else if (r === 'invite' || r === 'assign' || r === 'contract' || r === 'value' || r === 'dates:start' || r === 'dates:end') onSetup(r, el ?? undefined)
    else if (a.href) router.push(keepFrom(a.href))
  }
  const primaryRef = useRef<HTMLSpanElement>(null)
  const pressPrimary = () => { if (d.primary) runAction(d.primary, primaryRef.current) }
  /* (pending modules S22) the Dashboard's Needs you row lands on the step it named (`?run=<its run>`): the page's own flow opens once the page has
     revealed — only a step this viewer's Needs you offers right now, so the address can never open a refused one — and the address keeps
     nothing (the `?edit=1` landing's way). Start opens its sheet, Resume resumes with its Undo, Complete handover its sheet, Invite the panel. */
  const [landRun] = useState(() => params.get('run'))
  const runLatest = useRef<() => void>(() => {})
  useEffect(() => { runLatest.current = () => { const a = landRun ? d.needs.find((r) => r.action.run === landRun)?.action : undefined; if (a) runAction(a, primaryRef.current) } })
  useEffect(() => {
    if (!landRun) return
    const q = new URLSearchParams(window.location.search); q.delete('run')
    router.replace(`${window.location.pathname}${q.size ? `?${q}` : ''}`, { scroll: false })
    const t = window.setTimeout(() => runLatest.current(), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landRun, router])

  /* (parity P-03 · A-03 · D-02 · Q-21) The lead's Create strip with the project's set, on every tab: Task · Note · Contact Log open on their own
     tab as the lead's do (in place there, else the tab with its `?new=`), Update opens the Updates composer, Variation order starts one as
     Money's New ▾ does, AI Visualizer and 3D Space Planner as the ⋮ used to. ≤767 the strip is hidden — (simplify S-14 · Q-04) the ⋮ sheet
     opens with the strip's whole Create group, these same handlers. */
  const phoneSheet = useSheetLayout()
  const [startingVo, startVo] = useTransition()
  const newVariation = () => {
    if (startingVo) return
    const back = here()
    startVo(async () => {
      await run('start the variation order', async () => {
        const r = await createVariationOrder(p.id); if ('error' in r) return r
        startVo(() => router.push(withFrom(`/quotes/${r.id}`, back)))
      })
    })
  }
  const onCreate = (label: string) => {
    if (label === 'Meeting') { if (tab === 'meetings') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.meetings)); else router.push(href('meetings', 'new=1')) }   // (pending modules S23) a site meeting
    else if (label === 'Update') router.push(href('updates', 'compose=1'))   // (REG-957) pressed again while there, it opens at once
    else if (label === 'Variation order') newVariation()
    else if (label === 'AI Visualizer') openVisualizer()
    else if (label === '3D Space Planner') setPlannerOpen(true)   // (gaps build J, J-Q3) the project's layouts
  }
  const onNewTask = () => { if (tab === 'tasks') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.tasks)); else router.push(href('tasks', 'new=1')) }
  const onNewNote = (kind: 'note' | 'contact') => { if (tab === 'notes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.notes, { detail: { kind } })); else router.push(href('notes', `new=${kind}`)) }

  /* (REG-507) Maison AI, scripted from this project's own records — (REG-1061) raised over the Schedule's phone dock (Add milestone), as the
     listing raises it over its review banner, so it never covers the button */
  const phone = useMediaQuery(MOBILE)
  /* (gaps build I, I-Q16 · I-Q17) the suggestions do things now — through the project's own actions and rules (components/projects/use-project-maison.ts) */
  /* (parity P-02 · Q-02) …and the Overview's brief runs through them: its two buttons are the FAB's own */
  const maison = useProjectMaison({ projectId: p.id, name: p.name, client: lead.name.split(' ')[0] ?? lead.name, tab, stage: p.stage, mayChange: d.mayChange, hasSchedule: !!d.schedule,
    d, doors: { onSetup, onRunItem: runItem, onNeed: (r) => runAction(r.action) } })   // (simplify S-01) a row with no address runs the frame's own flow
  useMaisonAi(books ? [] : maison.suggestions, tab === 'schedule' && phone && d.mayChange && p.stage !== 'completed')

  /* (simplify S-03 · S-04 · Q-01) The strip's seven tabs — Overview · Tasks · Schedule · Client · Design · Money · Files & notes —, each opening
     its group's first view; the view on screen lights its group's tab. A tab's count is the sum of its views' (S-04's one rule: what waits on
     YOU there — K-N's `tabCounts`), Compliance's never (S-06: its view says "n to do this phase"). (Projects round 5, F-17) Money is the team's,
     Owners' and Admins' — (fix-G, G-37) on its own address it stays, selected, over its refusal. Keys 1–7 reach the seven (REG-713). */
  const viewOpen = (slug: string) => opensProjectView(d.viewer.role, slug) && (slug !== 'money' || !!d.money || tab === 'money')   // (parity map, PR-022) Accounting: Money · Files
  const counts = d.tabCounts ?? {}
  const groupCount = (g: ProjectTabGroup) => g.views.reduce((n, v) => n + (UNCOUNTED_VIEWS.includes(v.slug) ? 0 : counts[v.slug] ?? 0), 0)
  const tabItems = PROJECT_TAB_GROUPS.flatMap((g) => { const v = firstView(g, viewOpen); return v === null ? [] : [{ label: books && g.key === 'files' ? 'Files' : g.label, href: href(v), count: groupCount(g) }] })   // (parity map, PR-022) its one view's name
  const activeTab = href(firstView(groupOf(tab), viewOpen) ?? tab)
  /* (simplify contract B) what every tab's body may read: the Needs you rows (K-N's), the counts, the viewer, and the page's own doors */
  const context: ProjectContextValue = { projectId: p.id, origin, needs: d.needs, counts, viewer: d.viewer, money: !!d.money, href, run: runAction, openVisualizer, openPlanner: () => setPlannerOpen(true) }
  /* (simplify Q-04 · P2 §6.4) The phone's site bar, while the work runs and this viewer may post and change it: Photos · Done · Note · Message —
     the four on-site jobs one press away, on the house dock frame. Done marks the running milestone done (K-T's Mark done sheet, Schedule
     `?done=`); with several running it asks which first; with none it says why. */
  const siteBarOn = p.stage === 'in_progress' && !p.hold && d.mayChange
  useRememberSiteBar(p.id, siteBarOn)   // the loader's ghost draws it next time
  /* not on the Schedule: its own dock (Add milestone) holds the foot, and every row carries its Done — two bars would take a sixth of the phone */
  const siteBar = siteBarOn && tab !== 'schedule'
  const running = d.schedule?.running ?? []   // (K-N) every milestone in progress, in the schedule's order
  const doneRef = useRef<HTMLButtonElement>(null)
  /* Photos: a browser opens its picker only on a press (iOS refuses one after a navigation), so the bar's own press opens the camera and leaves
     the photos for the composer it then opens — Updates `?compose=1&camera=1` (K-C's composer takes them; nothing picked, nothing opens) */
  const photosInput = useRef<HTMLInputElement>(null)
  const [donePick, setDonePick] = useState(false)
  const markDone = () => {
    if (running.length === 1) router.push(href('schedule', `done=${encodeURIComponent(running[0]!.id)}`))
    else if (running.length > 1) setDonePick((o) => !o)
    else snackbar({ message: d.schedule ? 'No milestone is running — start one on the Schedule first' : 'There’s no schedule yet — set it up first', actionLabel: 'Open Schedule', onAction: () => router.push(href('schedule')) })
  }
  /* (pending modules S07 — the steps' note after S06) the crumb and Back lead where this viewer may go: Accounting opens no Projects listing
     (it is the house gate for them), so their project starts at Finance — or at the Finance page they came from (`?from=`) */
  const home = projectsHome(d.viewer.role)
  const from = origin && opensPath(d.viewer.role, origin) ? origin : undefined
  const crumbs = books
    ? [from && fromLabel(from) && !from.startsWith('/projects') ? { label: fromLabel(from)!, href: from } : home]
    : [...(origin && fromLabel(origin) && !origin.startsWith('/projects') ? [{ label: fromLabel(origin)!, href: origin }] : []), { label: 'Projects', href: '/projects' }]

  return (
    <PageReveal skeleton={<ProjectGhost tab={tab} shape={shape} siteBar={siteBar} />}>
      <div className={styles.body} data-testid="project-page">
        <PageHeaderL2
          scrollShadow={false}
          backHref={from ?? home.href}
          backLabel={backLabelFor(from, { leadName: lead.name, fallback: `Back to ${home.label}` })}
          crumbs={crumbs}
          title={p.name}
          chips={
            <>
              {/* (parity P-08 · A-04) the stage and its On hold mark left the chips: the Stage button names them, as the lead's does */}
              <MetaChip>{p.number}</MetaChip>
              {p.projectType ? <MetaChip icon="business_center">{p.projectType}</MetaChip> : null}
              {/* (fix-A, A-34) the property type rides in the name it defaults to (Q-05) — said once, the name keeps its line */}
              {p.name.includes(lead.propertyType) ? null : <MetaChip icon="home">{lead.propertyType}</MetaChip>}
            </>
          }
          actions={
            <>
              {/* (parity P-08 · A-04 · D-01, the owner's pick 2026-10-08) the lead's "Stage: X ▾" at every width (it replaces fix-A A-25's chip in
                  the ≤1024 action row): the stage menu, key M; the one filled primary stays beside it */}
              {books ? null : <ProjectStageButton word={stageWord(stageFacts)} open={stageOpen} anchor={stageRef} onPress={() => setStageOpen((o) => !o)} />}
              {d.primary && !books && !(tab === 'schedule' && !d.schedule) ? (   /* (parity map, PR-022) Accounting's next steps are the Money tab's own rows */   /* (fix-B, B-16) on the Schedule's Start card (no milestones), Create schedule is the page's one filled button — (simplify S-02) whatever the top row's run */
                <span ref={primaryRef} className={`${styles.anchor} ${styles.primary}`} data-testid="project-primary">
                  <Button variant="primary" onPress={pressPrimary}><span className={styles.primaryLabel}>{d.primary.label}</span></Button>
                </span>
              ) : null}
            </>
          }
          titleActions={books ? undefined :   /* (parity map, PR-022) the project's ⋮ is its team's record — Accounting works from Money */
            <span ref={kebabRef} className={styles.anchor}>
              <Tooltip label="More options" disabled={kebab}>
                <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebab} onClick={() => setKebab((o) => !o)} />
              </Tooltip>
              <PortalMenu open={kebab} anchor={kebabRef} onClose={() => setKebab(false)} align="right" width={PROJECT_MENU_WIDTH} role="menu" sheetTitle={p.name}>
                {/* (simplify S-14 · Q-04) ≤767, where the Create strip is hidden, the sheet opens with its Create group — the strip's own seven, the
                    strip's own handlers — then the record rows (the two it used to carry, AI Visualizer and 3D Space Planner, are in the group) */}
                {phoneSheet ? <QuickLinkItems set="project" busy={openingDesign ? 'AI Visualizer' : startingVo ? 'Variation order' : null} onPicked={() => setKebab(false)}
                                              onTask={onNewTask} onNote={() => onNewNote('note')} onCallLog={() => onNewNote('contact')} onOther={onCreate} /> : null}
                <ProjectMenuItems project={{ direct: lead.direct, quoteId: d.quote?.id ?? null, contractId: d.contract?.id ?? null, stage: p.stage, hold: p.hold ? holdSummary(p.hold, d.now) : null }} canRename={d.mayChange} onPick={onMenu}
                                  edit ends={{ mayHandover: d.ending.mayHandover, runs: d.ending.runs, requested: !!d.ending.request, requestedBy: d.ending.request?.by.name ?? null, requestedAt: d.ending.request?.at ?? null }}
                                  seeAs={seeAs} />
              </PortalMenu>
            </span>
          }
        />
        <Tabs items={tabItems} activeHref={activeTab} aria-label="Project sections" className={styles.stickyTabs} />
        {/* (Projects round 7) the ending under the tabs, on every tab: a handover waiting for review, sent back, or the project completed */}
        <HandoverBar e={d.ending} now={d.now} onReview={() => ending.open('review', target)} onSendBack={() => ending.open('sendBack', target)}
                     onWithdraw={() => ending.open('withdraw', target)} onReopen={() => ending.open('reopen', target)} onComplete={() => ending.open('complete', target)} />
        <div className={styles.row}>
          {/* (parity P-01 · A-01, the owner's pick 2026-10-08) the lead's info column on the Overview's left, as on the lead's own Overview (its
              other tabs are wide): the client's identity block, Collaborators, Project info, Property info, Other info, Custom fields; the strip
              fold (REG-304); on a phone the identity block and View Client Info (REG-366) */}
          {tab === '' ? (
            <InfoColumn
              lead={{ ...d.record.lead, name: lead.name }} team={d.studio} portal={d.record.portal}
              teamChatHref={href('messages', 'channel=team')}   /* (pending modules S26) the Team conversation's door, the lead's twin */
              customFields={d.record.customFields} customValues={d.record.customValues}
              project={{ number: p.number, stage: `${STAGE_LABEL[p.stage]}${p.hold ? ' · On hold' : ''}`, projectType: p.projectType, scope: p.scope?.length ? scopeWords(p.scope) : null, start: p.startDate, end: p.targetEndDate,
                         documents: projectInfoDocuments(d, { from: href(''), fileHref: (id) => href(`files/${id}`) }) }}   /* (simplify S-01) the signed quote, the contract and a direct project's other documents — Key documents' rows, now Project info's */
              onEdit={editRecord}
              onAssign={openAssign} onAssigneeMenu={(anchor) => openAssign(anchor)}
              onCopy={async (what, value) => {   // (REG-287) one copy format — the lead page's
                try { await copyText(what === 'phone' ? phoneDisplay(value) : value); snackbar({ message: 'Copied to clipboard' }) }
                catch { snackbar({ message: 'Couldn’t copy — please try again' }) }
              }}
              onWhatsApp={() => window.open(`https://wa.me/65${phoneDigits(lead.phone)}`, '_blank', 'noopener')}
              onDirections={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(lead.leadAddress ?? '')}`, '_blank', 'noopener')}
            />
          ) : null}
          <div className={styles.centre} data-tab={tab || 'overview'}>
            {/* (simplify contract B) every tab's body — and the Overview — reads the page's Needs you rows, counts and doors from here */}
            <ProjectContextProvider value={context}>
              {tab === '' ? <ProjectOverview d={d} href={href} onSetup={onSetup} onOpenTab={(slug) => router.push(href(slug))} onVisualizer={openVisualizer}
                                             onHold={() => setHoldOpen(true)} onResume={resume} onStep={openStep} onRunItem={runItem} maison={maison} /> : body}
            </ProjectContextProvider>
          </div>
          {/* (parity P-03 · D-02) the Create strip on the row's right, on every tab, as on a lead — the project's set (Q-21) */}
          {books ? null : <QuickLinks set="project" busy={openingDesign ? 'AI Visualizer' : startingVo ? 'Variation order' : null}
                      onTask={onNewTask} onNote={() => onNewNote('note')} onCallLog={() => onNewNote('contact')} onOther={onCreate} />}
        </div>
        {/* (simplify Q-04 · P2 §6.4) the phone's site bar — drawn ≤767 only (the dock frame's own rule); Maison AI and the snackbar ride above it */}
        {siteBar ? (
          <nav className={styles.siteBar} aria-label="On site" data-testid="project-site-bar">
            <button type="button" className={styles.siteItem} onClick={() => photosInput.current?.click()} data-testid="site-photos">
              <span className={styles.siteIcon}><Icon name="photo_camera" size={24} weight={300} /></span><span className={styles.siteLabel}>Photos</span>
            </button>
            <input ref={photosInput} type="file" accept="image/*" capture="environment" multiple hidden data-testid="site-photos-input"
                   onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (!files.length) return; stashSitePhotos(files); router.push(href('updates', 'compose=1&camera=1')) }} />
            <button ref={doneRef} type="button" className={styles.siteItem} onClick={markDone} aria-haspopup={running.length > 1 ? 'menu' : undefined} aria-expanded={running.length > 1 ? donePick : undefined} data-testid="site-done">
              <span className={styles.siteIcon}><Icon name="check_circle" size={24} weight={300} /></span><span className={styles.siteLabel}>Done</span>
            </button>
            <button type="button" className={styles.siteItem} onClick={() => onNewNote('note')} data-testid="site-note">
              <span className={styles.siteIcon}><Icon name="sticky_note_2" size={24} weight={300} /></span><span className={styles.siteLabel}>Note</span>
            </button>
            <button type="button" className={styles.siteItem} onClick={() => router.push(href('messages', 'compose=1'))} data-testid="site-message">
              <span className={styles.siteIcon}><Icon name="chat" size={24} weight={300} /></span><span className={styles.siteLabel}>Message</span>
            </button>
          </nav>
        ) : null}
        {/* several milestones running: which one is done — the house menu, a bottom sheet on a phone */}
        <PortalMenu open={donePick && running.length > 1} anchor={doneRef} onClose={() => setDonePick(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Which one is done?">
          {running.map((m) => (
            <DropdownItem key={m.id} onSelect={() => { setDonePick(false); router.push(href('schedule', `done=${encodeURIComponent(m.id)}`)) }}>{`Mark ${m.title} done`}</DropdownItem>
          ))}
        </PortalMenu>
      </div>
      <ProjectStageMenu open={stageOpen} anchor={stageRef} onClose={() => setStageOpen(false)} facts={stageFacts} onPick={runStage} />

      <ProjectLayoutsDialog project={plannerOpen ? { id: p.id, name: p.name } : null} onClose={() => setPlannerOpen(false)} />
      <StartProjectDialog open={starting} name={p.name} start={p.startDate} end={p.targetEndDate} today={today} projectId={p.id} onClose={() => setStarting(false)}
                          onStart={(startDate) => run('start the project', () => startProject(p.id, { startDate }), `${p.name} is in progress`, { refresh: true })} />
      <ProjectDatesDialog open={!!dates} focus={dates || 'start'} start={p.startDate} end={p.targetEndDate} today={today} onClose={() => setDates(false)}
                          onSave={(v) => run('save the dates', () => setProjectDates(p.id, v), 'Dates saved', { refresh: true })} />
      <ProjectValueDialog open={valueOpen} value={d.money?.valueMinor ?? null} onClose={() => setValueOpen(false)}
                          onSave={(value) => run('save the value', async () => {   /* (fix-D, A-03) the unsent invoices follow in the same press — one sentence, with Undo */
                            const r = await setProjectValue(p.id, { value }); if ('error' in r) return r
                            snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('put the value back', () => undoProjectValue(r.undo), 'The value and the invoices are as they were', { refresh: true }) } })
                          }, undefined, { refresh: true })} />
      {/* (parity P-17 · Q-05) the project's people are its Members (REG-290), as on the lead: REG-612's suggestion while nobody is on it, and
          the lead's sentence */}
      <AssignPopover open={!!assign} team={d.studio} value={d.team.map((m) => m.id)} anchor={assign?.el} position={assign}
                     assignable={d.assignable} hint={d.assignHint} requireOne onClose={() => setAssign(null)}
                     suggestion={d.team.length ? null : suggestMember({ propertyType: d.record.lead.propertyType, budgetMinor: d.record.lead.budgetMinor, style: d.record.lead.style, area: d.record.lead.area }, d.studio, d.record.memberStats)}
                     onApply={(ids) => { setAssign(null); void run('update the members', () => assignMembers(lead.id, ids), 'Members updated', { refresh: true }) }} />
      <ClientAccessPanel open={access} leadId={lead.id} project onClose={() => setAccess(false)} />
      {/* (gaps build, package A) On hold (M-01) · the client and the property, the project type and the scope · the Contract step */}
      <HoldProjectDialog open={holdOpen} name={p.name} client={lead.name} hold={p.hold ?? null} today={today} projectId={p.id} onClose={() => setHoldOpen(false)}
                         onSave={(v) => run('put the project on hold', async () => {
                           const r = await putProjectOnHold(p.id, v); if ('error' in r) return r
                           snackbar({ message: p.hold ? 'Hold changed' : `${p.name} is on hold`, actionLabel: 'Undo', onAction: holdUndo(r.undo, p.hold ? 'The hold is as it was' : `${p.name} is running again`) })
                         }, undefined, { refresh: true })} />
      {/* (parity P-09 · Q-04) Edit details: the lead's form in place on the project's lead, the project's section after it */}
      <LeadFormModal form={editForm} team={d.studio} now={d.now} sources={d.record.sources} assignable={d.assignHint ? [d.viewer.id] : d.assignable}
                     customFields={d.record.customFields} customValues={d.record.customValues}
                     project={{ name: p.name, projectType: p.projectType, scope: p.scope ?? [] }}
                     onClose={() => setEditForm(null)} onSubmit={(_mode, data, _leadId, extras) => saveDetails(data, extras)} />
      <ProjectContractDialog open={contractOpen} name={p.name} read={readContracts} onClose={() => setContractOpen(false)}
                             onLink={(id) => run('link the contract', () => linkProjectContract(p.id, id), 'Contract linked', { refresh: true })}
                             onUpload={(file) => run('upload the contract', async () => {
                               const f = await contractFolderFor(p.id); if ('error' in f) return f
                               const up = await uploadPicked(f.leadId, file, f.folderId)
                               if (!up) return { error: 'The upload didn’t land' }
                               if ('error' in up) return up
                               snackbar({ message: `${up.name} is filed in Files › ${f.folderName}`, actionLabel: 'Open', onAction: () => router.push(href(`files/${up.id}`)) })
                             }, undefined, { refresh: true })}
                             onOpenFile={(id) => { setContractOpen(false); router.push(href(`files/${id}`)) }} />
      {ending.node}
    </PageReveal>
  )
}
