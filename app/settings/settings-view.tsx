'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { SettingsGhost } from './settings-ghost'
import { CompanyShell } from '@/components/company/company-shell'
import { ChoiceCard } from '@/components/om/choice-card'
import { ReadOnlyScope } from '@/components/om/read-only'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Switch } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { defaultNextNumber, DEFAULT_LEAD_REASONS, DEFAULT_LEAD_SOURCES, formatQuoteNumber, initialsOf, isDefaultNumbering, nextSequence, shortStudioName, type Studio, PREPARED_BY_OPTIONS, QUOTE_APPROVAL_OPTIONS, ROUND_STEP_OPTIONS, STAGE_MOVEMENT_OPTIONS, TEMPLATE_APPROVAL_OPTIONS, tradeKey, type Numbering, type QuoteApproval, type QuoteRules, type StageMovement, type TemplateApproval } from '@/lib/settings/types'
import { CustomFieldsCard } from './custom-fields-card'
import { LeadStagesCard } from './lead-stages-card'   // (pending modules S05)
import { DEFAULT_LEAD_STAGE_RULES, type LeadStageRules } from '@/lib/settings/types'
import type { CustomFieldDef } from '@/lib/leads/custom-fields-model'
import { setCostVisibility } from './actions'   // (pending modules S41b-1)
import { editLeadReason, renameLeadSource, renameTrade, setLeadReasons, setLeadSources, setLeadVisibility, setNumbering, setQuoteApproval, setQuoteRules, setStageMovement, setStudioGst, setTemplateApproval, setTradeNote, setTrades } from './actions'
import { GATE_HELP, GATE_LABEL, ListEntryDialog, type EntryEdit } from './list-entry-dialog'
import { LOST_COMPETITOR, LOST_POSTPONED, LEAD_VISIBILITY_OPTIONS, VISIBILITY_HELP, VISIBILITY_HREF, VISIBILITY_POINTER, type LeadSourceEntry, type LeadVisibility, type LeadReason, type LeadReasons } from '@/lib/settings/types'
import { NotificationsSettings } from './notifications-settings'
import { UNTOUCHED_OPTIONS, type MessageTemplate, type NotificationRules } from '@/lib/notifications/model'
import { setNotificationRules } from '@/app/notifications/actions'
import type { NewQuoteDefaults } from '@/lib/settings/queries'
import { HelpLink } from '@/components/company/help-link'
import { ContractsSettingsCard } from './contracts-settings-card'
import { DEFAULT_CONTRACT_RULES, type ContractRules } from '@/lib/contracts/link'
import { LeaveGuard, leaveThen } from '@/components/company/leave-guard'
import { useHashLanding } from '@/components/company/use-hash-landing'
import { useRouter } from 'next/navigation'
import { decimalTyped } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import { SETTINGS_MODULES, moduleLinks, settingsHref, type SettingsModule } from '@/lib/settings/modules'
import { LEAD_SOURCES_HELP, UNTOUCHED_HELP, WHO_SEES_LEADS_MORE, leadsModuleHelp, quotesModuleHelp } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import type { ExpenseCategoriesData } from '@/components/finance/expense-categories-settings'
import { ACCOUNTING, MARKETING, opensPath } from '@/lib/settings/roles'   // (pending modules S06) Accounting's Settings is Finance alone
import { ModuleHead } from './module-head'
import { UnitsCard } from './units-card'   // (S44I — M9)
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TRADES_FULL, TRADES_MAX, listedAs, listedMatch, mergeMessage, mergeTitle, mergedLine, type TradeMergeUndo, type TradeUsage } from '@/lib/settings/trades'   // (S44P, M14)
import { mergeTrade, tradeUsage, undoMergeTrade } from './trades-actions'   // (S44P, row 340)
import { ProjectsSettings } from './projects-settings'
import type { TicketCategoriesData } from '@/components/projects/tickets/ticket-categories-setting'   // (gaps build H)
import type { ClientMessageRules } from '@/lib/portal/client-messages'
import type { CostRules } from '@/lib/finance/rules'   // (gaps build F1)
import { FinanceSettings } from '@/components/finance/finance-settings'
import type { BooksSettings } from '@/lib/finance/books'   // (gaps build F2)
import type { ScheduleRules, TypeDefaults } from '@/lib/projects/schedule-rules'   // (gaps build, package C)
import type { InvoiceRules } from '@/lib/projects/invoices-model'
import type { EntityNumbering, PaperSettings } from '@/lib/projects/invoices-paper'   // (gaps build B)
import type { PaymentSettingsData } from '@/components/projects/money/payments-settings'
import type { ProjectNumbering } from '@/lib/projects/model'
import { nextDocNumber, type DocumentNumbersData } from '@/lib/settings/document-numbers'   // (simplify S-15) · (pending modules S08) the next invoice number the set-up list names
import type { StudioSetupData } from '@/lib/studio-setup/model'
import { StudioSetupCard } from './studio-setup-card'
import { DEFAULT_RECEIPT_NUMBERING } from '@/lib/projects/payments-model'
import { DEFAULT_CREDIT_NUMBERING } from '@/lib/finance/credit-model'
import { MSG } from '@/lib/forms'
import { StudioSettings, type TeamMember } from './studio-settings'
import { CostVisibilityCard } from './cost-visibility-card'   // (pending modules S41b-1)
import { COST_VISIBILITY_RULE, DEFAULT_COST_VISIBILITY, costSwitchSentence, type CostRole, type CostVisibility } from '@/lib/settings/cost-visibility'
import { MeetingsSettings } from './meetings-settings'   // (pending modules S23)
import type { MeetingsSettingsData } from './meetings-actions'
import styles from './settings.module.css'

export function SettingsView({ leadStages, stageMovement, quoteApproval, templateApproval, numbering, trades, tradesManaged, tradeNotes = {}, units = [], unitsManaged = false, meName, section = 'studio', from, rules, team, leadSources, sourcesManaged, sourceCounts, leadVisibility, studioName, notificationRules, messageTemplates, leadReasons, reasonsManaged, reasonCounts, canManage, customFields, studio, quoteNumbers, newQuoteDefaults, projectNumbering, projectNumbers, projectUpdateReview = true, projectInvoices, projectEnding, projectStart = 'quote', projectUpdateReviewers = [], projectCosts, booksSettings, projectTickets, clientMessages, projectsI, contractRules, onlyBooks = false, onlyLeads = false, setup = null, meetings = null, costVisibility = DEFAULT_COST_VISIBILITY }: {
  /** (REG-645, settings parity Q-01 · Q-02) The open module (`?section=`) and where the page was opened from (`?from=`, Back). */
  section?: SettingsModule; from?: string
  /** (pending modules S08) Settings › Studio's Set up your studio list for this member — null when it does not show for them */
  setup?: StudioSetupData | null
  /** (pending modules S06 — the Accounting role's open question 5, as recommended) Accounting reads Settings › Finance alone: no module strip,
      and only the *Kept in Company* links they open */
  onlyBooks?: boolean
  /** (S44O — call C6) Marketing's Settings: Lead management alone, no module strip — theirs to change */ onlyLeads?: boolean
  /** (REG-645, Q-05) The studio record (GST) and every quote number given (the real next number, Q-15). (one-home N-06) The issuing entities
      are no longer listed in Settings › Studio — Company › Profile holds them. */
  studio: Studio; quoteNumbers: string[]
  /** (REG-607) Settings › Leads › Reasons: the two lists, whether they were ever saved, how many leads each reason has carried; and whether this member may change the Leads cards (Owners and Admins, parity Q-41). */
  leadReasons: LeadReasons; reasonsManaged: boolean; reasonCounts: { lost: Record<string, number>; hold: Record<string, number> }; canManage: boolean
  /** (REG-612, parity Q-25) The studio's custom lead fields, every one (inactive included) for the card. */
  customFields: CustomFieldDef[]
  /** (REG-599) Settings › Leads › Lead sources: the list, whether it was ever saved, and how many live leads each source has. */
  leadSources: LeadSourceEntry[]; sourcesManaged: boolean; sourceCounts: Record<string, number>
  /** (REG-601) Who sees which leads. */
  leadVisibility: LeadVisibility
  /** (pending modules S41b-1) Roles & access › Who sees costs and margins */
  costVisibility?: CostVisibility
  /** The studio's name, as its record holds it. (one-home N-03) Lead capture — the intake address, Meta, the webhooks, what arrived — is
      Company › Integrations' alone now; Lead management links there. */
  studioName: string
  /** (REG-604) Settings › Notifications. */
  notificationRules: NotificationRules; messageTemplates: MessageTemplate[]
  stageMovement: StageMovement; quoteApproval: QuoteApproval; templateApproval: TemplateApproval
  /** (REG-561) Settings › Quotes: the number pattern and the trades list (`tradesManaged` false = the list is what the quotes use, not yet saved). */
  numbering: Numbering; trades: string[]; tradesManaged: boolean; meName: string
  /** (S44I — M9) the studio's units (`unitsManaged` false = the seven a quote always offered, not yet saved) */
  units?: string[]; unitsManaged?: boolean
  /** (REG-617, parity Q-08) A note per trade, keyed by the trade's name in lower case. */
  tradeNotes?: Record<string, string>
  /** (REG-584 · 589 · 590) The studio's quote rules and the members the backup approver is picked from. */
  rules: QuoteRules; team: TeamMember[]
  /** (UX audit S4) What a new quote starts with — the default template's New quotes settings, shown here read-only. */
  newQuoteDefaults: NewQuoteDefaults
  /** (REG-921) Settings › Projects: the project numbers' pattern and every number given. */
  projectNumbering: ProjectNumbering; projectNumbers: string[]
  /** (REG-949) Settings › Projects › Updates: whether a designer's update waits for an Owner or an Admin. */
  projectUpdateReview?: boolean
  /** (gaps build D, item 10) the members named as update reviewers */
  projectUpdateReviewers?: string[]
  /** (Projects round 5) Invoices — approval, payment terms, the number pattern; (simplify S-15) shown on Settings › Finance (the approval on
      Projects' What waits for an Owner or an Admin, S-20; the numbers on Finance's Document numbers) */
  projectInvoices?: { rules: InvoiceRules; numbering: ProjectNumbering; numbers: string[]; /** (Projects round 6) */ payments?: PaymentSettingsData
    /** (gaps build B) */ paper?: PaperSettings; entityNumbering?: EntityNumbering; entities?: { id: string; name: string }[] }
  /** (Projects round 7) Settings › Projects › Stages and handover · the studio's default schedule start — (one-home N-11) the Schedule card's Studio default row. */
  projectEnding?: { handoverReview: boolean; scheduleTemplate: string | null; templates: { id: string; name: string }[]; /** (gaps build, package C) */ schedule?: { rules: ScheduleRules; typeDefaults: TypeDefaults } }
  /** (S44R — UAT row 358, call C7) Settings › Projects › When a project starts */ projectStart?: 'quote' | 'agreement'
  /** (gaps build F1) Settings › Finance › Costs: the approvals, the limit, the terms, the PO numbers — (pending modules S06) and the expense categories */ projectCosts?: { rules: CostRules; numbers: string[]; categories?: ExpenseCategoriesData }
  /** (gaps build F2) Settings › Finance › Commission; (simplify S-15) the credit notes' numbering is on Finance's Document numbers */ booksSettings?: BooksSettings | null
  /** (gaps build H) Settings › Projects › Ticket categories (with how many tickets hold each) · Notifications › Messages to clients */ projectTickets?: TicketCategoriesData; clientMessages?: ClientMessageRules
  /** (gaps build I) Settings › Projects › Workload · Compliance */ projectsI?: { capacity: number; starterTasks: boolean }
  /** (pending modules S03) Settings › Quotes & pricing › Contracts — the signing links' window */ contractRules?: ContractRules
  /** (pending modules S05) Settings › Lead management › Lead stages — what a step asks for, and the live leads in each stage */ leadStages?: { rules: LeadStageRules; counts: Record<string, number> }
  /** (pending modules S23) Settings › Meetings — the co-pilot's parts and weights, the checklists, the objection answers and the competitors (read only when it is open) */ meetings?: MeetingsSettingsData | null
}) {
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const approvalsLock = usePlanLock('internal_approvals')   // (pending modules S19 — 1.0's plan gating) approvals are Pro: off on Free, a change opens the lock
  useHashLanding(section)   // (UX audit S3) a help link to a card (#lead-visibility, #untouched-leads, #backup-approver) lands on it
  useMovedCards(section, from)   // (simplify S-15) an old link to a money card on Settings › Projects lands on Settings › Finance
  const short = shortStudioName(studioName)
  const [today] = useState(() => new Date())   // (pending modules S08) the year in the next invoice number the set-up list names
  const readOnly = !canManage   // (REG-645, settings parity Q-08) one read-only look: every value shown, the controls disabled, one line under the title
  const [mode, setMode] = useState<StageMovement>(stageMovement)
  // The server value changed under us (another tab saved): follow it (render-phase adjust).
  const [seen, setSeen] = useState(stageMovement)
  if (seen !== stageMovement) { setSeen(stageMovement); setMode(stageMovement) }

  const [approval, setApproval] = useState<QuoteApproval>(quoteApproval)
  const [seenApproval, setSeenApproval] = useState(quoteApproval)
  if (seenApproval !== quoteApproval) { setSeenApproval(quoteApproval); setApproval(quoteApproval) }

  /* (REG-501) Template approval — the Quote approval pattern, applied to Company › Templates. */
  const [tApproval, setTApproval] = useState<TemplateApproval>(templateApproval)
  const [seenT, setSeenT] = useState(templateApproval)
  if (seenT !== templateApproval) { setSeenT(templateApproval); setTApproval(templateApproval) }
  const chooseTemplateApproval = async (next: TemplateApproval) => {
    if (next === tApproval) return
    const prev = tApproval
    setTApproval(next)
    try {
      await setTemplateApproval(next)
      snackbar({ message: `Template approval set to ${TEMPLATE_APPROVAL_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setTApproval(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }
  const chooseApproval = async (next: QuoteApproval) => {
    if (next === approval) return
    const prev = approval
    setApproval(next)   // optimistic, as Stage movement
    try {
      await setQuoteApproval(next)
      snackbar({ message: `Quote approval set to ${QUOTE_APPROVAL_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setApproval(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }

  const choose = async (next: StageMovement) => {
    if (next === mode) return
    const prev = mode
    setMode(next)   // optimistic — the cards answer at once, the studio setting follows
    try {
      await setStageMovement(next)
      snackbar({ message: `Stage movement set to ${STAGE_MOVEMENT_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setMode(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }

  /* (REG-561) Quote numbers: the pattern's parts edit in place with a live example; Save writes them. */
  const [num, setNum] = useState<Numbering>(numbering)
  const [savedNum, setSavedNum] = useState<Numbering>(numbering)
  const [numBusy, setNumBusy] = useState(false)
  const numDirty = JSON.stringify(num) !== JSON.stringify(savedNum)
  /* (REG-645, settings parity Q-15) The example is the number the next quote would really get — the creation rule over every number given. */
  const example = isDefaultNumbering(num) ? defaultNextNumber(quoteNumbers) : formatQuoteNumber(num, nextSequence(quoteNumbers, num.prefix, num.next), { initials: initialsOf(meName || 'Dane Tan'), date: new Date() })
  const exampleCom = num.commercial.on ? formatQuoteNumber(num, nextSequence(quoteNumbers, num.commercial.prefix, num.commercial.next), { initials: initialsOf(meName || 'Dane Tan'), date: new Date(), commercial: true }) : null   /* (REG-586) */
  /* (REG-645, settings parity Q-05) GST: the studio's registration writes at once; the rate has its own Save. */
  const [gst, setGst] = useState<Studio>(studio)
  const [gstRate, setGstRate] = useState(String(studio.gstPct))
  const rateValue = Number(gstRate)
  const rateValid = gstRate.trim() !== '' && Number.isFinite(rateValue) && rateValue >= 0 && rateValue <= 30
  const rateDirty = rateValid && Math.round(rateValue * 10) / 10 !== gst.gstPct
  const writeGst = async (patch: { gstRegistered?: boolean; gstPct?: number }, done: string): Promise<boolean> => {
    const prev = gst
    setGst((g) => ({ ...g, ...patch }))
    try { const next = await setStudioGst(patch); setGst(next); if (patch.gstPct !== undefined) setGstRate(String(next.gstPct)); snackbar({ message: done }); return true }   // a rate being typed is not overwritten by the switch's answer
    catch { setGst(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }); return false }
  }
  /* (REG-584 · 589 · 590) The studio's rules write at once, each with its own word. */
  const [rulesState, setRulesState] = useState<QuoteRules>(rules)
  const writeRules = async (patch: Partial<QuoteRules>, done: string) => {
    const prev = rulesState
    setRulesState((r) => ({ ...r, ...patch }))
    try { const clean = await setQuoteRules(patch); setRulesState(clean); snackbar({ message: done }) }
    catch { setRulesState(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  const saveNumbering = async (): Promise<boolean> => {
    setNumBusy(true)
    try { const clean = await setNumbering(num); setNum(clean); setSavedNum(clean); snackbar({ message: `The next quote will be ${isDefaultNumbering(clean) ? defaultNextNumber(quoteNumbers) : formatQuoteNumber(clean, nextSequence(quoteNumbers, clean.prefix, clean.next), { initials: initialsOf(meName || 'Dane Tan'), date: new Date() })}` }); return true }   /* (sweep S4 #12) the real next number, as the example shows it — never OM-0001 while the studio is past it */
    catch { snackbar({ message: 'Couldn’t save the numbering — please try again' }); return false }
    finally { setNumBusy(false) }
  }
  /* (UX audit S2) The page's unsaved edits — the quote-number pattern and a GST rate typed but not saved — ask before any move inside the
     app (and a tab or a reload): Save writes both, Discard puts both back. */
  const rateEdited = gst.gstRegistered && gstRate.trim() !== String(gst.gstPct)
  const leaveWhat = [numDirty ? 'the quote numbers' : null, rateEdited ? 'the GST rate' : null].filter(Boolean).join(' and ')
  const saveBeforeLeaving = async (): Promise<boolean> => {
    let ok = true
    if (numDirty) ok = (await saveNumbering()) && ok
    if (rateEdited) ok = (rateValid ? await writeGst({ gstPct: rateValue }, `New lines start at ${Math.round(rateValue * 10) / 10}% GST`) : false) && ok   // a rate out of range keeps its error and the page
    return ok
  }
  const discardBeforeLeaving = () => { setNum(savedNum); setGstRate(String(gst.gstPct)) }

  /* (one-home N-03) Lead capture's address, Copy, Simulate and ways in left with its card — Company › Integrations is their one home. */
  const router = useRouter()
  /* (REG-601) Who sees leads: two choice cards, optimistic like Stage movement. */
  const [vis, setVis] = useState<LeadVisibility>(leadVisibility)
  const chooseVis = async (next: LeadVisibility) => {
    if (next === vis) return
    const prev = vis
    setVis(next)
    try { await setLeadVisibility(next); snackbar({ message: next === 'assigned' ? 'Designers now see only their own leads, and Managers their own and their team’s' : 'Everyone sees every lead again' }) }
    catch { setVis(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  /* (pending modules S41b-1) Who sees costs and margins: a switch per role, the Owner's alone — optimistic, put back when refused, one sentence
     with Undo; Who may do what's three cost rows read the same state at once. */
  const [costVis, setCostVis] = useState<CostVisibility>(costVisibility)
  const costOwner = team.find((m) => m.isYou)?.role === 'Owner'
  const chooseCost = async (role: CostRole, on: boolean, undoing = false) => {
    if (!costOwner) { snackbar({ message: `${COST_VISIBILITY_RULE}.` }); return }
    setCostVis((c) => ({ ...c, [role]: on }))
    const putBack = (why: string) => { setCostVis((c) => ({ ...c, [role]: !on })); snackbar({ message: `Couldn’t change who sees costs — ${why}` }) }
    try {
      const r = await setCostVisibility({ role, on })
      if ('error' in r) { putBack(r.error); return }
      setCostVis(r.visibility)
      snackbar({ message: costSwitchSentence(role, on), ...(undoing ? {} : { actionLabel: 'Undo', onAction: () => { void chooseCost(role, !on, true) } }) })
    } catch { putBack('please try again') }
  }
  /* (UX audit S9) The untouched-lead delay is a response rule: it lives with the leads, not under the notification rows. It writes the same
     notification rule the bell reads (setNotificationRules), optimistic and put back when refused. */
  const [untouched, setUntouched] = useState(notificationRules.untouchedMinutes)
  const chooseUntouched = async (label: string) => {
    const o = UNTOUCHED_OPTIONS.find((x) => x.label === label)
    if (!o || o.minutes === untouched) return
    const prev = untouched
    setUntouched(o.minutes)
    try { const next = await setNotificationRules({ untouchedMinutes: o.minutes }); setUntouched(next.untouchedMinutes); snackbar({ message: `Untouched leads raised after ${o.label}` }) }
    catch { setUntouched(prev); snackbar({ message: 'Couldn’t save the untouched-lead delay — please try again' }) }
  }
  /* (REG-599) Lead sources: add · retire · restore · remove — the whole list written at once, as the trades are. */
  const [sources, setSources] = useState<LeadSourceEntry[]>(leadSources)
  const [newSource, setNewSource] = useState('')
  const writeSources = async (next: LeadSourceEntry[], done: string, undoable = false) => {
    const prev = sources
    setSources(next)
    try { const clean = await setLeadSources(next); setSources(clean); snackbar({ message: done, ...(undoable ? { actionLabel: 'Undo', onAction: () => { void writeSources(prev, 'Lead sources put back') } } : {}) }) }   // (REG-647) every remove answers with Undo
    catch { setSources(prev); snackbar({ message: 'Couldn’t save the lead sources — please try again' }) }
  }
  const addSource = () => {
    const name = newSource.trim().slice(0, 40)
    if (!name) return
    { const said = listedAs(sources.map((s) => s.name), name); if (said) { snackbar({ message: said }); return } }   // (S44Z) Enter says what the field says — the entry it matches (S44P's M14)
    setNewSource('')
    void writeSources([...sources.filter((s) => s.name !== 'Others'), { name, retired: false }, ...sources.filter((s) => s.name === 'Others')], `${name} added to the lead sources`)   // Others stays last
  }
  /* (REG-607) Reasons: the Lost and On Hold lists — add · retire · restore · remove, a contact gate on a Lost reason — written at once, as the sources are. */
  const [reasons, setReasons] = useState<LeadReasons>(leadReasons)
  const [newReason, setNewReason] = useState<{ lost: string; hold: string }>({ lost: '', hold: '' })
  const [newGate, setNewGate] = useState('')
  const writeReasons = async (next: LeadReasons, done: string, undoable = false) => {
    const prev = reasons
    setReasons(next)
    try { const clean = await setLeadReasons(next); setReasons(clean); snackbar({ message: done, ...(undoable ? { actionLabel: 'Undo', onAction: () => { void writeReasons(prev, 'Reasons put back') } } : {}) }) }
    catch { setReasons(prev); snackbar({ message: 'Couldn’t save the reasons — please try again' }) }
  }
  /* (REG-647, settings parity Q-09) A source's or a reason's name opens its dialog: rename (what carries it follows), its place, a Lost reason's gate. */
  const [entryEdit, setEntryEdit] = useState<{ kind: 'source' | 'lost' | 'hold'; entry: EntryEdit } | null>(null)
  const [entryTaken, setEntryTaken] = useState<string | null>(null)
  /* (sweep S4 #23) A name already in a list says so on its field as it is typed, and Add waits — never a snackbar refusal after the press. */
  /* (S44P, row 264) …and names the entry it matches when typed in another case — "Already in the list as “Carpentry Works”" — while that entry lights up in the list. */
  const taken = (names: string[], typed: string) => listedAs(names, typed)
  const moveTo = <T,>(xs: T[], from: number, to: number): T[] => { const n = [...xs]; const [x] = n.splice(from, 1); n.splice(Math.max(0, Math.min(n.length, to)), 0, x as T); return n }
  const saveEntry = async (e: EntryEdit) => {
    const cur = entryEdit; if (!cur) return
    const from = cur.entry.name
    const names = cur.kind === 'source' ? sources.map((x) => x.name) : reasons[cur.kind].map((x) => x.name)
    { const hit = e.name !== from ? listedMatch(names, e.name, from) : null; if (hit) { setEntryTaken(hit); return } }   // (sweep S4 #23) said on the Name field · (S44P, row 264) naming the entry it matches
    try {
      if (cur.kind === 'source') {
        let next = sources
        if (e.name !== from) next = await renameLeadSource(from, e.name)
        const idx = next.findIndex((x) => x.name === e.name)
        if (idx >= 0 && idx !== e.position - 1) next = await setLeadSources(moveTo(next, idx, e.position - 1))
        setSources(next)
        snackbar({ message: e.name !== from ? `${from} is now ${e.name} — its leads follow` : 'Lead sources saved' })
      } else {
        const kind = cur.kind
        let next = reasons
        if (e.name !== from || (kind === 'lost' && (e.gate ?? 0) !== (cur.entry.gate ?? 0))) next = await editLeadReason(kind, from, { name: e.name, ...(kind === 'lost' ? { minContacts: e.gate ?? 0 } : {}) })
        const idx = next[kind].findIndex((x) => x.name === e.name)
        if (idx >= 0 && idx !== e.position - 1) next = await setLeadReasons({ ...next, [kind]: moveTo(next[kind], idx, e.position - 1) })
        setReasons(next)
        snackbar({ message: e.name !== from ? `${from} is now ${e.name} — the leads that carry it follow` : 'Reasons saved' })
      }
      setEntryEdit(null)   // (sweep S4 #28) closed on success only — a refusal keeps what was typed
      router.refresh()
    } catch { snackbar({ message: `Couldn’t save ${from} — please try again` }) }
  }
  const addReason = (kind: 'lost' | 'hold') => {
    const name = newReason[kind].trim().slice(0, 40)
    if (!name) return
    const list = reasons[kind]
    { const said = listedAs(list.map((r) => r.name), name); if (said) { snackbar({ message: said }); return } }   // (S44Z) Enter says what the field says — the entry it matches (S44P's M14)
    const gate = kind === 'lost' ? Number(newGate) : 0
    const entry: LeadReason = gate > 0 ? { name, retired: false, minContacts: gate } : { name, retired: false }
    setNewReason((x) => ({ ...x, [kind]: '' })); setNewGate('')
    void writeReasons({ ...reasons, [kind]: [...list.filter((r) => r.name !== 'Others'), entry, ...list.filter((r) => r.name === 'Others')] }, `${name} added to the ${kind === 'lost' ? 'Lost' : 'On Hold'} reasons`)   // Others stays last
  }
  /* (REG-607, parity Q-41) Only Owners and Admins change the Leads cards; anyone else reads them. */
  const LOCKED = 'Only Owners and Admins change the lead settings'
  const guard = (fn: () => void) => () => { if (!canManage) { snackbar({ message: LOCKED }); return } fn() }
  /* (REG-624, quote editor parity §8.2 · E-135) The Quotes module is the Owners' and Admins' too — read-only for everyone else. */
  const LOCKED_Q = 'Only Owners and Admins change the quote settings'
  const guardQ = (fn: () => void) => () => { if (!canManage) { snackbar({ message: LOCKED_Q }); return } fn() }
  const guardQV = <T,>(fn: (v: T) => void) => (v: T) => { if (!canManage) { snackbar({ message: LOCKED_Q }); return } fn(v) }
  /* (REG-561) Trades: a managed list — add one, remove one — written at once. */
  const [list, setList] = useState<string[]>(trades)
  const [managed, setManaged] = useState(tradesManaged)
  const [newTrade, setNewTrade] = useState('')
  /* (REG-617, parity Q-08) A trade's note: it prints under a section of that name when the quote writes none of its own. */
  const [notes, setNotes] = useState<Record<string, string>>(tradeNotes)
  /* The notes as last written, for the handlers: a remove pressed right after a save must take the saved note along for its Undo, before React re-renders. */
  const notesRef = useRef(tradeNotes)
  const putNotes = (next: Record<string, string>) => { notesRef.current = next; setNotes(next) }
  const [noteFor, setNoteFor] = useState<{ trade: string; text: string; name: string; position: number } | null>(null)
  const [tradeError, setTradeError] = useState<string | null>(null)   /* (sweep S4 #7 · #23) the name's refusal inline, the dialog kept */
  /* (S44P, row 340) a rename onto a trade already in the list asks to merge the two — what moves, said first; Undo puts every record back */
  const [merging, setMerging] = useState<{ from: string; into: string; usage: TradeUsage; note: string | null } | null>(null)
  const [tradeBusy, setTradeBusy] = useState(false)
  const saveNote = async (trade: string, text: string) => {
    const prev = notesRef.current
    const key = tradeKey(trade)
    const next = { ...prev }; if (text.trim()) next[key] = text.trim(); else delete next[key]
    putNotes(next)
    try { putNotes(await setTradeNote(trade, text)); snackbar({ message: text.trim() ? `Note saved for ${trade}` : `Note removed from ${trade}` }) }
    catch { putNotes(prev); snackbar({ message: 'Couldn’t save the note — please try again' }) }
  }
  const writeTrades = async (next: string[], done: string, undo?: { note: string; trade: string }) => {
    const prev = list
    setList(next)
    try {
      const clean = await setTrades(next); setList(clean); setManaged(true)
      /* (REG-647) Undo puts the trade back where it was — with its note, which a remove takes along. */
      snackbar({ message: done, ...(undo ? { actionLabel: 'Undo', onAction: () => { void (async () => { await writeTrades(prev, `${undo.trade} is back`); if (undo.note) await saveNote(undo.trade, undo.note) })() } } : {}) })
    } catch { setList(prev); snackbar({ message: 'Couldn’t save the trades — please try again' }) }
  }
  const removeTrade = (t: string) => { void writeTrades(list.filter((x) => x !== t), `${t} removed — quotes already using it keep the label`, { trade: t, note: notesRef.current[tradeKey(t)] ?? '' }) }
  /* (REG-647, settings parity Q-09) The trade's dialog saves its name (the quote lines, the price book and the note follow), its place and its note. */
  const saveTrade = async (n: { trade: string; text: string; name: string; position: number }) => {
    const name = n.name.trim().replace(/\s+/g, ' ')
    if (!name) { setTradeError(MSG.required); return }
    const into = name !== n.trade ? listedMatch(list, name, n.trade) : null
    if (into) {
      /* (S44P, row 340 — was "{name} is already in the list") the name is another trade's: ask to merge, saying what moves */
      if (tradeBusy) return
      setTradeBusy(true)
      try {
        const u = await tradeUsage(n.trade, into)
        if ('error' in u) { setTradeError(u.error); return }
        /* the note box: untouched → the notes' own rule (null); typed → the merged trade takes it; emptied → no note comes across ('' — or
           null when the trade it joins keeps its own) */
        const text = n.text.trim()
        const note = text === (notesRef.current[tradeKey(n.trade)] ?? '') ? null : text || (u.intoNote ? null : '')
        setMerging({ from: n.trade, into, usage: u, note })
      } catch { snackbar({ message: `Couldn’t read what ${n.trade} carries — please try again` }) }
      finally { setTradeBusy(false) }
      return
    }
    if (tradeBusy) return
    setTradeBusy(true)
    try {
      let cur = list, curNotes = notesRef.current
      if (name !== n.trade) { const r = await renameTrade(n.trade, name); cur = r.trades; curNotes = r.notes }
      const idx = cur.indexOf(name)
      if (idx >= 0 && idx !== n.position - 1) cur = await setTrades(moveTo(cur, idx, n.position - 1))
      setList(cur); setManaged(true); putNotes(curNotes)
      setNoteFor(null); setTradeError(null)
      if ((curNotes[tradeKey(name)] ?? '') !== n.text.trim()) await saveNote(name, n.text)
      else snackbar({ message: name !== n.trade ? `${n.trade} is now ${name} — its quote lines and price book items follow` : 'Trades saved' })
    } catch { snackbar({ message: `Couldn’t save ${n.trade} — please try again` }) }   // the dialog stays open with what was typed
    finally { setTradeBusy(false) }
  }
  const doMerge = async () => {
    const m = merging; if (!m || tradeBusy) return
    setTradeBusy(true)
    try {
      const r = await mergeTrade({ from: m.from, into: m.into, note: m.note })
      if ('error' in r) { setMerging(null); setTradeError(r.error); return }   // the rule, on the trade's Name field
      setList(r.trades); setManaged(true); putNotes(r.notes)
      setMerging(null); setNoteFor(null); setTradeError(null)   // both close once the merge has landed
      snackbar({ message: mergedLine(m.from, m.into, r.moved), actionLabel: 'Undo', onAction: () => { void undoMerge(r.undo) } })
    } catch { snackbar({ message: `Couldn’t merge ${m.from} into ${m.into} — please try again` }) }   // the question stays, with what was typed under it
    finally { setTradeBusy(false) }
  }
  const undoMerge = async (u: TradeMergeUndo) => {
    try {
      const r = await undoMergeTrade(u)
      if ('error' in r) { snackbar({ message: `Couldn’t undo the merge — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return }
      setList(r.trades); putNotes(r.notes)
      snackbar({ message: `${u.from} is back` })   // the remove's Undo words (REG-647)
    } catch { snackbar({ message: 'Couldn’t undo the merge — please try again' }) }
  }
  /* (S44P) a name the list can't take, said on the field as it is typed: already there (naming the entry), or the list is full */
  const tradeBlock = taken(list, newTrade) ?? (newTrade.trim() && list.length >= TRADES_MAX ? TRADES_FULL : undefined)
  const tradeMatch = listedMatch(list, newTrade)
  const addTrade = () => {
    const t = newTrade.trim()
    if (!t) return
    if (tradeBlock) { snackbar({ message: tradeBlock }); return }
    setNewTrade('')
    void writeTrades([...list, t], `${t} added to the trades`)
  }

  const fromHere = (key: string) => withFrom(settingsHref(key), from)   // a Company page opened from a module comes back to it
  /* (simplify S-20) the team the approvals card names reviewers from */
  const teamForRules = team.map((m) => ({ id: m.id, name: m.name, role: m.role, active: m.isActive !== false }))
  /* (simplify S-15) the one Document numbers card: the four patterns and the numbers each has given, read from the blocks' own data */
  const documentNumbers: DocumentNumbersData | null = projectInvoices && projectCosts ? {
    numbering: { invoice: projectInvoices.numbering, receipt: projectInvoices.payments?.numbering ?? DEFAULT_RECEIPT_NUMBERING, credit: booksSettings?.credit.rules.numbering ?? DEFAULT_CREDIT_NUMBERING, po: projectCosts.rules.numbering },
    numbers: { invoice: projectInvoices.numbers, receipt: projectInvoices.payments?.numbers ?? [], credit: booksSettings?.credit.numbers ?? [], po: projectCosts.numbers },
    entities: (projectInvoices.entities ?? []).map((e) => ({ id: e.id, name: e.name, prefix: projectInvoices.entityNumbering?.[e.id]?.prefix ?? '' })),
  } : null
  /* (REG-601) Who sees leads — Dyel's hierarchy: the owner assigns, a manager assigns within their team, a designer keeps their own. Roles and
     teams live under Company › Members. (pending modules S14 — card held:settings-company, "Who sees leads sits in Lead management though it
     also governs projects, quotes and contracts", as recommended) Its one home is Roles & access now, above Who may do what, whose rows follow
     the pick at once; the help says everything it decides. */
  const whoSeesLeads = (
    <ReadOnlyScope readOnly={readOnly}>
      <div className={styles.setting} data-testid="lead-visibility" id="lead-visibility">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Who sees leads</span>
          <span className={styles.settingHelp}>{VISIBILITY_HELP}{WHO_SEES_LEADS_MORE.lead}<HelpLink href="/company/members">{WHO_SEES_LEADS_MORE.link}</HelpLink>{WHO_SEES_LEADS_MORE.end}</span>
        </div>
        <div className={styles.choices} role="radiogroup" aria-label="Who sees leads">
          {LEAD_VISIBILITY_OPTIONS.map((o) => (
            <ChoiceCard key={o.key} title={o.title} help={o.help} selected={vis === o.key} onSelect={guard(() => { void chooseVis(o.key) })} />
          ))}
        </div>
      </div>
    </ReadOnlyScope>
  )
  const costCard = (
    <ReadOnlyScope readOnly={readOnly}>
      <CostVisibilityCard value={costVis} owner={costOwner} onChange={(r, on) => { void chooseCost(r, on) }}
                          counts={Object.fromEntries(['Owner', 'Admin', 'Manager', 'Designer', 'Marketing', 'Accounting'].map((r) => [r, team.filter((m) => m.isActive !== false && m.role === r).length]))} />
    </ReadOnlyScope>
  )
  const tabs = SETTINGS_MODULES.map((m) => ({ label: m.label, href: settingsHref(m.key), soon: !m.live }))
  return (
    <CompanyShell title="Settings" tabs={onlyBooks || onlyLeads ? undefined : tabs} activeHref={settingsHref(section)} from={from} crumb="Settings" skeleton={<SettingsGhost />} onSoon={comingSoon}>
          <LeaveGuard dirty={!readOnly && (numDirty || rateEdited)} what={leaveWhat} onSave={saveBeforeLeaving} onDiscard={discardBeforeLeaving} />
          {section === 'studio' ? (
            <StudioSettings studioName={short} team={team} backupName={team.find((m) => m.id === rulesState.backupApproverId)?.name ?? null} visibility={whoSeesLeads} costs={costCard} readOnly={readOnly}
                            setup={setup ? <StudioSetupCard data={setup} setFor={{ invoice: documentNumbers ? nextDocNumber(documentNumbers.numbering.invoice, documentNumbers.numbers.invoice, today) : null, stages: mode, approval }} /> : null}
                            rules={{ visibility: vis, quoteApproval: approval, templateApproval: tApproval, paymentLock: rulesState.paymentLock, invoiceApproval: projectInvoices?.rules.approval, updateReview: projectUpdateReview, handoverReview: projectEnding?.handoverReview, paymentConfirmer: projectInvoices?.payments?.rules.confirmer, completionApproval: projectEnding?.schedule?.rules.completionApproval, shareApproval: projectEnding?.schedule?.rules.shareApproval, poApproval: projectCosts?.rules.poApproval, expenseApproval: projectCosts?.rules.expenseApproval, costVisibility: costVis }} />
          ) : section === 'projects' ? (
            /* (simplify S-20) the module opens on every approval together; (S-15) its money cards went to Finance */
            <ProjectsSettings numbering={projectNumbering} numbers={projectNumbers} studio={short} canManage={canManage} ending={projectEnding} tickets={projectTickets} gapsI={projectsI} startsWhen={projectStart}
                              approvals={{ updateReview: projectUpdateReview, reviewers: projectUpdateReviewers, team: teamForRules, invoiceApproval: projectInvoices?.rules.approval ?? true,
                                completionApproval: projectEnding?.schedule?.rules.completionApproval ?? false, shareApproval: projectEnding?.schedule?.rules.shareApproval ?? false,
                                handoverReview: projectEnding?.handoverReview ?? false, costs: projectCosts ? { poApproval: projectCosts.rules.poApproval, expenseApproval: projectCosts.rules.expenseApproval, poLimitMinor: projectCosts.rules.poLimitMinor, billApproval: projectCosts.rules.billApproval } : null }} />
          ) : section === 'finance' ? (   /* (gaps build F1) money out's rules — (simplify S-15) every money rule: Document numbers · Money in · Money out · Commission */
            <FinanceSettings costs={projectCosts ?? null} books={booksSettings ?? null} studio={short} canManage={canManage} from={fromHere('finance')} linksOpen={onlyBooks ? (href) => !href.startsWith('/settings') && opensPath(ACCOUNTING, href) : undefined}
                             money={projectInvoices ? { invoices: projectInvoices.rules, paper: projectInvoices.paper ?? null, entities: projectInvoices.entities ?? [], payments: projectInvoices.payments ? { rules: projectInvoices.payments.rules, team: projectInvoices.payments.team } : null } : null}
                             numbers={documentNumbers} />
          ) : section === 'meetings' && meetings ? (   /* (pending modules S23) the co-pilot's playbook — 1.0's Accounts › AI & Copilot */
            <MeetingsSettings data={meetings} studio={short} canManage={canManage} from={fromHere('meetings')} />
          ) : section === 'notifications' ? (
            <NotificationsSettings rules={notificationRules} templates={messageTemplates} canManage={canManage} clientMessages={clientMessages} studio={short} />
          ) : section === 'leads' ? (
            <section className={styles.panel} aria-labelledby="settings-leads-title" data-testid="settings-leads">
              {/* (pending modules S14) the head, then one line under it, as Projects' — who sees which leads is kept under Roles & access */}
              <div className={styles.sectionHead}>
                <ModuleHead id="settings-leads-title" title="Lead management" help={leadsModuleHelp(short)} readOnly={readOnly}
                            links={moduleLinks('leads', fromHere('leads')).filter((l) => !onlyLeads || opensPath(MARKETING, l.href))} />   {/* (S44O — C6) Marketing's Kept in Company: Integrations */}
                <span className={styles.settingHelp} data-testid="leads-visibility-pointer">{VISIBILITY_POINTER} {onlyLeads ? 'Roles & access › Who sees leads' : <HelpLink href={VISIBILITY_HREF} testId="leads-visibility-link">Roles &amp; access › Who sees leads</HelpLink>}.</span>   {/* (S44O — C6) Marketing's Settings is this module alone: the place is named, not linked */}
              </div>
              <ReadOnlyScope readOnly={readOnly}>
              {/* (pending modules S05 — Manage Stages) The stages, what each step asks for, the leads in each, and how leads move — the card the
                  listing's stage menu › Manage Stages opens (#lead-stages). It absorbed the Stage movement card. */}
              <LeadStagesCard counts={leadStages?.counts ?? {}} rules={leadStages?.rules ?? DEFAULT_LEAD_STAGE_RULES} canManage={canManage} from={fromHere('leads')}
                              mode={mode} onMode={(m) => { void choose(m) }} locked={LOCKED} />
              {/* (UX audit S9) The untouched-lead delay — moved here from Notifications › Follow-ups, which now points here. */}
              <div className={styles.setting} data-testid="untouched-leads" id="untouched-leads">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Untouched leads</span>
                  <span className={styles.settingHelp}>{UNTOUCHED_HELP}</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Raise an untouched lead after" mode="select" options={UNTOUCHED_OPTIONS.map((o) => o.label)} value={UNTOUCHED_OPTIONS.find((o) => o.minutes === untouched)?.label ?? '30 minutes'}
                             onChange={(v) => { if (!canManage) { snackbar({ message: LOCKED }); return } void chooseUntouched(v) }} />
                </div>
              </div>
              {/* (REG-599) Lead sources — Flipstone's "add TikTok etc.": the list the lead form, the import mapping, the filters and the Source column read. */}
              <div className={styles.setting} id="lead-sources" data-testid="lead-sources">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Lead sources</span>
                  <span className={styles.settingHelp}>{LEAD_SOURCES_HELP} {!sourcesManaged ? 'Not set yet — these are the defaults.' : JSON.stringify(sources) === JSON.stringify(DEFAULT_LEAD_SOURCES) ? 'These are the defaults.' : ''}</span>
                </div>
                <ul className={styles.trades} aria-label="Lead sources">
                  {sources.map((s, i) => {
                    const n = sourceCounts[s.name] ?? 0
                    return (
                      <li key={s.name} className={styles.trade} data-retired={s.retired || undefined} data-match={listedMatch(sources.map((x) => x.name), newSource) === s.name || undefined} data-testid="lead-source">
                        {canManage ? <button type="button" className={styles.chipName} onClick={() => { setEntryTaken(null); setEntryEdit({ kind: 'source', entry: { name: s.name, position: i + 1 } }) }}>{s.name}</button> : <span>{s.name}</span>}
                        <span className={styles.sourceCount} aria-label={`${n} ${n === 1 ? 'lead' : 'leads'}`}>{n}</span>
                        {!canManage ? null : s.retired ? (
                          <Tooltip label={`Restore ${s.name}`}><IconButton icon="undo" label={`Restore ${s.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeSources(sources.map((x) => (x.name === s.name ? { ...x, retired: false } : x)), `${s.name} restored`) }} /></Tooltip>
                        ) : n > 0 ? (
                          <Tooltip label={`Retire ${s.name} — its ${n} ${n === 1 ? 'lead keeps' : 'leads keep'} it`}><IconButton icon="visibility_off" label={`Retire ${s.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeSources(sources.map((x) => (x.name === s.name ? { ...x, retired: true } : x)), `${s.name} retired — its leads keep it`) }} /></Tooltip>
                        ) : (
                          <Tooltip label={`Remove ${s.name}`}><IconButton icon="close" label={`Remove ${s.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeSources(sources.filter((x) => x.name !== s.name), `${s.name} removed`, true) }} /></Tooltip>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {canManage ? <div className={styles.addTrade}>
                  <TextField label="Add a source" value={newSource} onChange={setNewSource} maxLength={40} error={taken(sources.map((x) => x.name), newSource)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSource() } }} />
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={addSource} isDisabled={!newSource.trim() || !!taken(sources.map((x) => x.name), newSource)}>Add</Button>
                </div> : null}
              </div>
              {/* (REG-607, parity Q-05 · Q-07 · Q-38) Reasons — 1.0 lets a studio shape its close reasons and gate one behind logged contacts; the On Hold and Lost dialogs read these two lists. */}
              <CustomFieldsCard fields={customFields} canManage={canManage} />   {/* (REG-612) */}
              <div className={styles.setting} data-testid="lead-reasons">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Lost and On Hold reasons</span>   {/* (Dane UAT 2.21) the card names both lists */}
                  <span className={styles.settingHelp}>What the Lost and On Hold dialogs offer. Retire a reason to keep the leads that carry it and stop offering it; a reason no lead carries can be removed. A Lost reason can expect logged contacts — the dialog then says how many there are. {!reasonsManaged ? 'Not set yet — these are the defaults.' : JSON.stringify(reasons) === JSON.stringify(DEFAULT_LEAD_REASONS) ? 'These are the defaults.' : ''}</span>
                </div>
                {(['lost', 'hold'] as const).map((kind) => {
                  const list = reasons[kind]
                  const counts = reasonCounts[kind]
                  const label = kind === 'lost' ? 'Lost' : 'On Hold'
                  return (
                    <div key={kind} className={styles.reasonGroup} data-testid={`reasons-${kind}`}>
                      <span className={styles.reasonLabel}>{label}</span>
                      <ul className={styles.trades} aria-label={`${label} reasons`}>
                        {list.map((r, i) => {
                          const n = counts[r.name] ?? 0
                          const label = <>{r.name}{r.minContacts ? <span className={styles.reasonGate}> · after {r.minContacts} contacts</span> : null}</>
                          return (
                            <li key={r.name} className={styles.trade} data-retired={r.retired || undefined} data-match={listedMatch(list.map((x) => x.name), newReason[kind]) === r.name || undefined} data-testid="lead-reason">
                              {canManage ? <button type="button" className={styles.chipName} onClick={() => { setEntryTaken(null); setEntryEdit({ kind, entry: { name: r.name, position: i + 1, gate: r.minContacts ?? 0 } }) }}>{label}</button> : <span>{label}</span>}
                              <span className={styles.sourceCount} aria-label={`${n} ${n === 1 ? 'lead' : 'leads'}`}>{n}</span>
                              {!canManage ? null : r.retired ? (
                                <Tooltip label={`Restore ${r.name}`}><IconButton icon="undo" label={`Restore ${r.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeReasons({ ...reasons, [kind]: list.map((x) => (x.name === r.name ? { ...x, retired: false } : x)) }, `${r.name} restored`) }} /></Tooltip>
                              ) : n > 0 ? (
                                <Tooltip label={`Retire ${r.name} — its ${n} ${n === 1 ? 'lead keeps' : 'leads keep'} it`}><IconButton icon="visibility_off" label={`Retire ${r.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeReasons({ ...reasons, [kind]: list.map((x) => (x.name === r.name ? { ...x, retired: true } : x)) }, `${r.name} retired — its leads keep it`) }} /></Tooltip>
                              ) : (
                                <Tooltip label={`Remove ${r.name}`}><IconButton icon="close" label={`Remove ${r.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeReasons({ ...reasons, [kind]: list.filter((x) => x.name !== r.name) }, `${r.name} removed`, true) }} /></Tooltip>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {canManage ? (
                        <div className={styles.addTrade} data-testid={`add-reason-${kind}`}>
                          <TextField label={kind === 'lost' ? 'Add a Lost reason' : 'Add an On Hold reason'} value={newReason[kind]} onChange={(v) => setNewReason((x) => ({ ...x, [kind]: v }))} maxLength={40} error={taken(reasons[kind].map((x) => x.name), newReason[kind])} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReason(kind) } }} />
                          {/* (Dane UAT 2.21) the field says what it is — a hint in the Lost dialog, never a block — with the edit dialog's help line */}
                          {kind === 'lost' ? <TextField label={GATE_LABEL} value={newGate} onChange={(v) => setNewGate(v.slice(0, 2))} numeric="digits" maxLength={2} trailingIcon={null} className={styles.gateField} helper={GATE_HELP} /> : null}
                          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => addReason(kind)} isDisabled={!newReason[kind].trim() || !!taken(reasons[kind].map((x) => x.name), newReason[kind])}>Add</Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              {/* (one-home N-03) Lead capture — the intake address, Copy, Simulate and every way in — lives on Company › Integrations alone;
                  the module head's Kept in Company: Integrations link opens it. (pending modules S14) Who sees leads moved to Roles & access —
                  the module head's pointer opens it, and an old link to #lead-visibility here lands there (useMovedCards). */}
              </ReadOnlyScope>
              <ListEntryDialog open={!!entryEdit} entry={entryEdit?.entry ?? null} onClose={() => { setEntryEdit(null); setEntryTaken(null) }} onSave={(e) => { void saveEntry(e) }} taken={entryTaken}
                               title={entryEdit?.kind === 'source' ? 'Lead source' : entryEdit?.kind === 'lost' ? 'Lost reason' : 'On Hold reason'}
                               total={entryEdit ? (entryEdit.kind === 'source' ? sources.length : reasons[entryEdit.kind].length) : 1} withGate={entryEdit?.kind === 'lost'}
                               note={entryEdit?.kind === 'source' ? 'A new name carries every lead with this source, and a webhook labelled with it.'
                                 : entryEdit?.entry.name === LOST_COMPETITOR ? 'Under this name the Lost dialog asks which firm the client went with; renamed, it no longer asks. A new name carries the leads that carry it.'
                                 : entryEdit?.entry.name === LOST_POSTPONED ? 'Under this name the Lost dialog asks when the project may restart; renamed, it no longer asks. A new name carries the leads that carry it.'
                                 : 'A new name carries the leads that carry it.'} />
            </section>
          ) : (
            <section className={styles.panel} aria-labelledby="settings-quotes-title" data-testid="settings-quotes">
              <ModuleHead id="settings-quotes-title" title="Quotes & pricing" help={quotesModuleHelp(short)} readOnly={readOnly}
                          links={moduleLinks('quotes', fromHere('quotes'))} />
              <ReadOnlyScope readOnly={readOnly}>
              {/* Quote approval (user 2026-08-30) and Template approval (REG-501) lived under Leads until this module was built (REG-561). */}
              <div className={styles.setting} id="quote-approval">   {/* (Dane UAT 2.23) Who may do what's rows land here */}
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Quote approval{approvalsLock.locked ? <> <ProTag /></> : null}</span>
                  <span className={styles.settingHelp}>Whether a quote is reviewed inside the studio before it goes to the client. This sets the stages a quote moves through.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Quote approval">
                  {QUOTE_APPROVAL_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={approval === o.key} onSelect={guardQ(() => { if (approvalsLock.locked) { approvalsLock.open(); return } void chooseApproval(o.key) })} />
                  ))}
                </div>
              </div>
              <div className={styles.setting} id="template-approval">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Template approval{approvalsLock.locked ? <> <ProTag /></> : null}</span>
                  <span className={styles.settingHelp}>Whether a designer’s quote template needs an Owner’s or Admin’s approval before the studio can use it. Applies to <HelpLink href="/company/templates/quotes">Company › Templates</HelpLink>.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Template approval">
                  {TEMPLATE_APPROVAL_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={tApproval === o.key} onSelect={guardQ(() => { if (approvalsLock.locked) { approvalsLock.open(); return } void chooseTemplateApproval(o.key) })} />
                  ))}
                </div>
              </div>
              {/* (UX audit S4, REG-578…583) What a new quote starts with — the default template's New quotes settings, read-only here where the
                  studio looks for them, with the way to change them on the template itself. */}
              <NewQuoteDefaultsCard d={newQuoteDefaults} gst={gst} from={fromHere('quotes')} />
              {/* (pending modules S03) the Contracts list's "Contracts Settings" lands here (#contracts) */}
              <ContractsSettingsCard rules={contractRules ?? DEFAULT_CONTRACT_RULES} readOnly={readOnly} />
              {/* (REG-561) Quote numbers — the testers' "our numbering convention": prefix · designer initials · year-month · running number. */}
              <div className={styles.setting} data-testid="numbering">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Quote numbers</span>
                  <span className={styles.settingHelp}>The pattern new quotes are numbered with. Quotes already numbered keep their numbers.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Prefix" value={num.prefix} maxLength={8} onChange={(v) => setNum((n) => ({ ...n, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} helper="Letters and digits, up to 8" />
                  <TextField label="Next number" value={num.next ? String(num.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setNum((n) => ({ ...n, next: v ? Number(v) : 0 }))} helper="Blank continues from the highest number given" />
                  <TextField label="Digits" value={num.digits ? String(num.digits) : ''} numeric="digits" maxLength={1} onChange={(v) => setNum((n) => ({ ...n, digits: v ? Math.min(6, Number(v)) : 0 }))} helper="Pads the number: 4 prints 0012" />
                </div>
                {/* (Dane UAT 2.25) The switches are their own group under the fields, one under another — in the fields' grid each fell under a
                    field and read as that field's own. */}
                <div className={styles.switchGroup} role="group" aria-labelledby="numbering-also" data-testid="numbering-switches">
                  <span id="numbering-also" className={styles.reasonLabel}>Also in the number</span>
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.initials} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, initials: v }))} aria-label="Designer’s initials" /><span>Designer’s initials <span className={styles.settingHelp}>· who creates the quote</span></span></label>
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.yearMonth} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, yearMonth: v }))} aria-label="Year and month" /><span>Year and month <span className={styles.settingHelp}>· YYYYMM</span></span></label>
                  {/* (REG-586) Commercial work on its own sequence — the lead's property type decides (Commercial — Office / Retail). */}
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.commercial.on} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, commercial: { ...n.commercial, on: v } }))} aria-label="A separate sequence for commercial work" /><span>Commercial work on its own sequence <span className={styles.settingHelp}>· offices and shops, by the lead’s property type</span></span></label>
                </div>
                {num.commercial.on ? (
                  <div className={styles.numGrid}>
                    <TextField label="Commercial prefix" value={num.commercial.prefix} maxLength={8} onChange={(v) => setNum((n) => ({ ...n, commercial: { ...n.commercial, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') } }))} helper="Letters and digits, up to 8" />
                    <TextField label="Commercial next number" value={num.commercial.next ? String(num.commercial.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setNum((n) => ({ ...n, commercial: { ...n.commercial, next: v ? Number(v) : 0 } }))} helper="Blank continues from the highest given" />
                  </div>
                ) : null}
                <div className={styles.example}><span className={styles.settingHelp}>Next quote:</span> <span className={styles.exampleNo} data-testid="number-example">{example}</span>{exampleCom ? <><span className={styles.settingHelp}>· commercial:</span> <span className={styles.exampleNo} data-testid="number-example-commercial">{exampleCom}</span></> : null}</div>
                {readOnly ? null : <div className={styles.settingActions}>
                  <Button variant="secondary" appearance="outlined" onPress={() => setNum(savedNum)} isDisabled={!numDirty || numBusy}>Discard</Button>
                  <Button onPress={guardQ(() => { void saveNumbering() })} isDisabled={!numDirty || numBusy}>{numBusy ? 'Saving…' : 'Save numbering'}</Button>
                </div>}
              </div>
              {/* (REG-561) Trades — the Category column's list and what templates group by; free text on a quote is kept as its own label. */}
              <div className={styles.setting} id="trades" data-testid="trades">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Trades</span>
                  <span className={styles.settingHelp}>The trades the Category column offers on every quote and the templates group by. Press a trade to rename it, move it or give it a note; the note prints under that trade’s section when a quote writes none of its own. {managed ? '' : 'Not set yet — these are the trades your quotes and My Items already use.'}</span>
                </div>
                <ul className={styles.trades} aria-label="Trades">
                  {list.map((t, i) => (
                    <li key={t} className={styles.trade} data-noted={notes[tradeKey(t)] ? '' : undefined} data-match={tradeMatch === t || undefined} data-testid="trade">
                      {readOnly ? (
                        /* (REG-645, Q-08) Read-only: the name, and the note as its tooltip — every value shown, nothing to press. */
                        notes[tradeKey(t)] ? <Tooltip label={notes[tradeKey(t)]!}><span className={styles.tradeName} tabIndex={0}><Icon name="sticky_note_2" size={16} weight={300} /><span>{t}</span></span></Tooltip> : <span>{t}</span>   /* (S42 audit C-10, its sibling) a reader's plain token: no pointer, no underline */
                      ) : (
                      <Tooltip label={`Edit ${t} — its name, place or note`}>
                        <button type="button" className={styles.tradeName} onClick={() => { setTradeError(null); setNoteFor({ trade: t, text: notes[tradeKey(t)] ?? '', name: t, position: i + 1 }) }}>
                          {notes[tradeKey(t)] ? <Icon name="sticky_note_2" size={16} weight={300} /> : null}<span>{t}</span>
                        </button>
                      </Tooltip>
                      )}
                      {canManage ? <Tooltip label={`Remove ${t}`}><IconButton icon="close" label={`Remove ${t}`} size={24} variant="bare" iconSize={16} onClick={() => removeTrade(t)} /></Tooltip> : null}
                    </li>
                  ))}
                  {list.length === 0 ? <li className={styles.settingHelp}>No trades yet.</li> : null}
                </ul>
                {canManage ? (
                  <div className={styles.addTrade}>
                    <TextField label="Add a trade" value={newTrade} onChange={setNewTrade} maxLength={40} error={tradeBlock} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrade() } }} />
                    <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={addTrade} isDisabled={!newTrade.trim() || !!tradeBlock}>Add</Button>
                  </div>
                ) : null}
                <Dialog open={!!noteFor} onClose={() => { setNoteFor(null); setTradeError(null) }} title="Trade" subtitle={noteFor?.trade} size="modal" width={600}
                        footer={readOnly ? <Button variant="secondary" appearance="outlined" onPress={() => setNoteFor(null)}>Close</Button> : <><Button variant="secondary" appearance="outlined" onPress={() => setNoteFor(null)}>Cancel</Button><Button isDisabled={tradeBusy} onPress={() => { if (!canManage) { snackbar({ message: LOCKED_Q }); return } const n = noteFor; if (n) void saveTrade(n) }}>{tradeBusy ? 'Saving…' : 'Save'}</Button></>}>
                  <div className={styles.entryForm} data-testid="trade-dialog">
                    <TextField label="Name" required value={noteFor?.name ?? ''} maxLength={40} onChange={(v) => { setTradeError(null); setNoteFor((n) => (n ? { ...n, name: v } : n)) }} error={tradeError ?? undefined} helper="A new name carries the quote lines and the price book items filed under it — a name already in the list merges the two" />
                    <TextField label="Place in the list" mode="select" options={list.map((_, i) => String(i + 1))} value={String(noteFor?.position ?? 1)} onChange={(v) => setNoteFor((n) => (n ? { ...n, position: Number(v) } : n))} />
                    <TextField label="Note" value={noteFor?.text ?? ''} autoFocus={!readOnly} maxLength={300} onChange={(v) => setNoteFor((n) => (n ? { ...n, text: v } : n))}
                               onKeyDown={(e) => { if (e.key === 'Enter' && !readOnly) { e.preventDefault(); const n = noteFor; if (n) void saveTrade(n) } }} />
                    <p className={styles.settingHelp}>The note prints under a section named {noteFor?.name || noteFor?.trade} when the quote writes no note of its own, where the template shows section notes. Leave it empty to remove it.</p>
                  </div>
                </Dialog>
                {/* (S44P, row 340) the merge's question, over the trade's dialog — what moves, then Merge; the snackbar's Undo puts it all back */}
                <ConfirmDialog open={!!merging} nested tone="primary" confirmLabel="Merge" title={merging ? mergeTitle(merging.from, merging.into) : ''}
                               message={merging ? mergeMessage(merging.from, merging.into, merging.usage, merging.note) : undefined}
                               onConfirm={() => { void doMerge() }} onCancel={() => setMerging(null)} />
              </div>
              {/* (S44I — M9) Units — the Trades card's twin: every unit picker's list */}
              <UnitsCard units={units} managed={unitsManaged} canManage={canManage} />
              {/* (REG-645, settings parity Q-05) GST — 1.0 took it from the lead's country and the entity; 2.0's studio says it once.
                  (one-home N-13) Only the rate is here now: whether the studio is registered is its own issuing entity's switch on Company ›
                  Profile, beside every other entity's — the same record (settings `studio`), so the rate still rests while it is off. */}
              <div className={styles.setting} data-testid="gst">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>GST</span>
                  <span className={styles.settingHelp}>The rate a new line starts with. Quotes already written keep their rates. Whether the studio — or any other issuing entity — is registered for GST is set under <HelpLink href="/company/profile#entities">Company › Profile</HelpLink>.</span>
                </div>
                <div className={styles.gstRow}>
                  {/* A rate takes one decimal (8.5 %): digits and one point, as typed — the amount filter keeps whole dollars only. */}
                  <TextField label="GST rate (%)" value={gstRate} inputMode="decimal" maxLength={4} onChange={(v) => setGstRate(decimalTyped(v, 1))} disabled={!gst.gstRegistered}
                             error={gstRate.trim() && !rateValid ? 'Between 0 and 30' : undefined} helper="A new line starts at this rate" />
                  {readOnly ? null : <Button variant="secondary" appearance="outlined" onPress={guardQ(() => { void writeGst({ gstPct: rateValue }, `New lines start at ${Math.round(rateValue * 10) / 10}% GST`) })} isDisabled={!rateDirty || !gst.gstRegistered}>Save rate</Button>}
                </div>
              </div>
              {/* (one-home N-07) CaseTrust left this module: it is recorded once, with the studio's other registrations, on Company › Profile */}
              {/* (REG-584) Selling prices rounded as they are entered — Cloud Creation's "multiples of 5". */}
              <div className={styles.setting} data-testid="rounding">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Selling prices</span>
                  <span className={styles.settingHelp}>Round every selling price to a step as it is typed or added from My Items. The cost never moves; the markup takes the difference. Round Prices on a quote still rounds the whole quote at once.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Round selling prices to" mode="select" value={ROUND_STEP_OPTIONS.find((o) => o.key === rulesState.roundStep)?.label ?? 'Not rounded'} options={ROUND_STEP_OPTIONS.map((o) => o.label)}
                             onChange={guardQV((v: string) => { const o = ROUND_STEP_OPTIONS.find((x) => x.label === v); if (o) void writeRules({ roundStep: o.key }, o.key ? `Selling prices round to ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)}` : 'Selling prices are not rounded') })} />
                </div>
              </div>
              {/* (REG-589) The payment schedule kept to Owners and Admins — Mavid's "the owner fixes it; IDs cannot change it". */}
              <div className={styles.setting} data-testid="payment-lock" id="payment-lock">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Who may change the payment schedule</span>
                  <span className={styles.settingHelp}>Locked, everyone but Owners and Admins sees a quote’s milestones and cannot edit, reorder, add or replace them. The split a new quote starts with is under New quotes start with.</span>
                </div>
                <label className={styles.switchRow}><Switch size="sm" isSelected={rulesState.paymentLock} isDisabled={readOnly} onChange={guardQV((v: boolean) => { void writeRules({ paymentLock: v }, v ? 'Only Owners and Admins change the payment schedule now' : 'Every member can change the payment schedule') })} aria-label="Only Owners and Admins can change the payment schedule" /><span>Only Owners and Admins can change it</span></label>
              </div>
              {/* (REG-590) A backup approver beside the Owners and Admins — H Design's ask. */}
              <div className={styles.setting} data-testid="backup-approver" id="backup-approver">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Backup approver{approvalsLock.locked ? <> <ProTag /></> : null}</span>
                  <span className={styles.settingHelp}>A member who may approve quotes and publish templates when an Owner or Admin is away. Owners and Admins always can.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Backup approver" mode="select" value={team.find((m) => m.id === rulesState.backupApproverId)?.name ?? 'None'} options={['None', ...team.filter((m) => m.role !== 'Owner' && m.role !== 'Admin' && m.isActive !== false).map((m) => m.name)]}
                             onChange={guardQV((v: string) => { if (approvalsLock.locked) { approvalsLock.open(); return } const m = team.find((x) => x.name === v) ?? null; void writeRules({ backupApproverId: m?.id ?? null }, m ? `${m.name} can approve as the backup` : 'No backup approver') })} />
                </div>
              </div>
              {/* (REG-618, parity Q-25) What a template's {prepared_by} prints — 1.0's team list · studio only · first member. */}
              <div className={styles.setting} data-testid="prepared-by">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Prepared by</span>
                  <span className={styles.settingHelp}>What a template’s {'{prepared_by}'} field prints on every quote: the member who prepared it, every member on the lead, or the studio’s name.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Prepared by prints" mode="select" value={PREPARED_BY_OPTIONS.find((o) => o.key === rulesState.preparedBy)?.label ?? PREPARED_BY_OPTIONS[0]!.label} options={PREPARED_BY_OPTIONS.map((o) => o.label)}
                             onChange={guardQV((v: string) => { const o = PREPARED_BY_OPTIONS.find((x) => x.label === v); if (o) void writeRules({ preparedBy: o.key }, `Prepared by prints ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)}`) })} />
                </div>
              </div>
              {/* (S44Q — row 357, his UAT ask 2026-10-15; Spaces Studio: "no picking") Whether the confirmation link lets the client tick optional works.
                  On, as it always has; off, the link lists them with their prices and the client asks the designer to add one. *(invented copy)* */}
              <div className={styles.setting} data-testid="optional-picks" id="optional-picks">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Optional works on the confirmation link</span>
                  <span className={styles.settingHelp}>On, your client ticks the optional works they want as they confirm, and you add them to the quote after. Off, the link lists them with their prices and your client asks the designer to add one.</span>
                </div>
                <label className={styles.switchRow}><Switch size="sm" isSelected={rulesState.clientPicksOptional} isDisabled={readOnly} onChange={guardQV((v: boolean) => { void writeRules({ clientPicksOptional: v }, v ? 'Clients can pick optional works as they confirm' : 'Clients see optional works and ask to add them') })} aria-label="Clients may pick optional items on the confirmation link" /><span>Clients may pick optional items on the confirmation link</span></label>
              </div>
              </ReadOnlyScope>
            </section>
          )}
    </CompanyShell>
  )
}

/** (UX audit S4) "New quotes start with": the studio's default template's New quotes settings, as a new quote takes them (read the way
    createQuote reads them), and the way to change them — the template editor on its New quotes tab, with Back to here. */
function NewQuoteDefaultsCard({ d, gst, from }: { d: NewQuoteDefaults; gst: Studio; from: string }) {
  const router = useRouter()
  const split = d.split ? `${d.split.name} — ${d.split.rows.map((r) => `${r.name} ${r.pct}%`).join(' · ')}` : 'None'
  const gstLine = !gst.gstRegistered ? 'Off — the studio isn’t registered for GST' : d.gstEnabled ? `On, at ${gst.gstPct}%` : 'Off'
  const open = () => { const t = d.template; if (t) leaveThen(() => router.push(withFrom(`/templates/${t.id}?tab=new-quotes`, from))) }
  return (
    <div className={styles.setting} data-testid="new-quote-defaults" id="new-quote-defaults">
      <div className={styles.settingHeadRow}>
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>New quotes start with</span>
          <span className={styles.settingHelp}>{d.template
            ? `What every new quote takes from the studio’s default template, ${d.template.name}. They are set on the template’s New quotes tab and reach new quotes once it is published; quotes you already have keep their own.`
            : <>No default quote template yet — a new quote starts with the house settings below. Pick a default under <HelpLink href="/company/templates/quotes">Company › Templates</HelpLink>.</>}</span>
        </div>
        {d.template ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="edit" size={20} />} onPress={open} data-testid="new-quote-defaults-change">{`Change in ${d.template.name} › New quotes`}</Button> : null}
      </div>
      <dl className={styles.defaults}>
        <dt>Valid for</dt><dd>{d.validityDays} {d.validityDays === 1 ? 'day' : 'days'}</dd>
        <dt>Payment schedule</dt><dd>{split}</dd>
        <dt>Terms and Conditions</dt><dd>{d.terms ?? 'None — written on the quote'}</dd>
        <dt>Additional Notes</dt><dd>{d.notes ?? 'None'}</dd>
        <dt>GST</dt><dd>{gstLine}</dd>
        <dt>Client signs online</dt><dd>{d.signatureRequired ? 'Yes' : 'No — the client signs the printed quote'}</dd>
        <dt>Starts with sections</dt><dd>{d.starterGroups.length ? d.starterGroups.join(' · ') : 'None — the Items table starts empty'}</dd>
      </dl>
    </div>
  )
}

/** (simplify S-15) The money cards that moved from Settings › Projects to Settings › Finance, by their anchors (Invoice numbers by issuing
    entity folded into Finance's Document numbers). */
const MOVED_TO_FINANCE: Record<string, string> = {
  'invoice-settings': 'invoice-settings', 'invoice-paper': 'invoice-paper', 'payment-settings': 'payment-settings', 'credit-settings': 'credit-settings',
  'invoice-entity-numbers': 'document-numbers', 'document-numbers': 'document-numbers',
}
/** (pending modules S14) The card that moved from Lead management to Roles & access. */
const MOVED_TO_STUDIO: Record<string, string> = { 'lead-visibility': 'lead-visibility' }
/** An old address — `/settings?section=projects#invoice-settings` (a bookmark, a bell row, an older help line) — lands on the card's new
    place, Settings › Finance, keeping its way back (`?from=`). Replaces the address, so Back never returns to the empty anchor.
    (pending modules S14) And `/settings?section=leads#lead-visibility` lands on Roles & access › Who sees leads. */
function useMovedCards(section: SettingsModule, from: string | undefined) {
  const router = useRouter()
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1))
    /* (pending modules S41b-2) 1.0's `/settings` was the member's own settings — a bookmark with its anchor (`/settings#my-signature`) lands
       on Your profile's card. Only an address with no module of its own: a 2.0 link always names one. An anchor never reaches the server,
       so this is the one place it can be read. */
    const personal = !new URLSearchParams(window.location.search).has('section') ? OLD_PERSONAL_ANCHORS[hash] : undefined
    if (personal) { router.replace(personal); return }
    const to = section === 'projects' ? MOVED_TO_FINANCE[hash] : section === 'leads' ? MOVED_TO_STUDIO[hash] : undefined
    if (to) router.replace(`${withFrom(settingsHref(section === 'projects' ? 'finance' : 'studio'), from)}#${to}`)
  }, [section, from, router])
}
/** (pending modules S41b-2) 1.0's personal Settings sections (its ALL_SECTIONS) → where each lives in 2.0: Your profile's cards; Email Lead
    Sources → Company › Integrations › Gmail. Its parked and retired sections (Studio Region, Ads & Promotions, ID Buddy AI, Home Screen,
    Appearance, Theme Skins, Guided Tours) land on Your profile. */
const OLD_PERSONAL_ANCHORS: Record<string, string> = {
  profile: '/profile#details', 'lead-preferences': '/profile', 'my-signature': '/profile#signature', notifications: '/profile#notifications',
  email: '/company/integrations#gmail',
  region: '/profile', ads: '/profile', 'ai-buddy': '/profile', 'home-layout': '/profile', appearance: '/profile', skins: '/profile', 'guided-tours': '/profile',
}
