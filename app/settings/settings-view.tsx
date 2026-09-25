'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { SettingsSkeleton } from '@/components/shell/skeleton'
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
import type { CustomFieldDef } from '@/lib/leads/custom-fields-model'
import { editLeadReason, renameLeadSource, renameTrade, setLeadReasons, setLeadSources, setLeadVisibility, setNumbering, setQuoteApproval, setQuoteRules, setStageMovement, setStudioGst, setTemplateApproval, setTradeNote, setTrades } from './actions'
import { ListEntryDialog, type EntryEdit } from './list-entry-dialog'
import { LOST_COMPETITOR, LOST_POSTPONED, LEAD_VISIBILITY_OPTIONS, intakeAddress, type LeadCapture, type LeadSourceEntry, type LeadVisibility, type LeadReason, type LeadReasons } from '@/lib/settings/types'
import { simulateArrival } from '@/app/leads/capture-actions'
import { NotificationsSettings } from './notifications-settings'
import type { MessageTemplate, NotificationRules } from '@/lib/notifications/model'
import { useCopy } from '@/components/om/use-copy'
import { useRouter } from 'next/navigation'
import { decimalTyped, displayDateTimeDot } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import { SETTINGS_MODULES, settingsHref, type SettingsModule } from '@/lib/settings/modules'
import { ModuleHead } from './module-head'
import { MSG } from '@/lib/forms'
import { StudioSettings, type EntityLine, type TeamMember } from './studio-settings'
import styles from './settings.module.css'

export function SettingsView({ stageMovement, quoteApproval, templateApproval, numbering, trades, tradesManaged, tradeNotes = {}, meName, section = 'studio', from, rules, team, leadSources, sourcesManaged, sourceCounts, leadVisibility, leadCapture, studioName, arrivals, notificationRules, messageTemplates, leadReasons, reasonsManaged, reasonCounts, canManage, customFields, studio, entities, quoteNumbers }: {
  /** (REG-645, settings parity Q-01 · Q-02) The open module (`?section=`) and where the page was opened from (`?from=`, Back). */
  section?: SettingsModule; from?: string
  /** (REG-645, Q-04 · Q-05) The studio record (GST), its issuing entities as Settings › Studio lists them, and every quote number given (the real next number, Q-15). */
  studio: Studio; entities: EntityLine[]; quoteNumbers: string[]
  /** (REG-607) Settings › Leads › Reasons: the two lists, whether they were ever saved, how many leads each reason has carried; and whether this member may change the Leads cards (Owners and Admins, parity Q-41). */
  leadReasons: LeadReasons; reasonsManaged: boolean; reasonCounts: { lost: Record<string, number>; hold: Record<string, number> }; canManage: boolean
  /** (REG-612, parity Q-25) The studio's custom lead fields, every one (inactive included) for the card. */
  customFields: CustomFieldDef[]
  /** (REG-599) Settings › Leads › Lead sources: the list, whether it was ever saved, and how many live leads each source has. */
  leadSources: LeadSourceEntry[]; sourcesManaged: boolean; sourceCounts: Record<string, number>
  /** (REG-601) Who sees which leads. */
  leadVisibility: LeadVisibility
  /** (REG-602) Lead capture: the intake address, the Meta connection and what arrived through them. */
  leadCapture: LeadCapture; studioName: string; arrivals: { fileName: string; at: number; rows: number }[]
  /** (REG-604) Settings › Notifications. */
  notificationRules: NotificationRules; messageTemplates: MessageTemplate[]
  stageMovement: StageMovement; quoteApproval: QuoteApproval; templateApproval: TemplateApproval
  /** (REG-561) Settings › Quotes: the number pattern and the trades list (`tradesManaged` false = the list is what the quotes use, not yet saved). */
  numbering: Numbering; trades: string[]; tradesManaged: boolean; meName: string
  /** (REG-617, parity Q-08) A note per trade, keyed by the trade's name in lower case. */
  tradeNotes?: Record<string, string>
  /** (REG-584 · 589 · 590) The studio's quote rules and the members the backup approver is picked from. */
  rules: QuoteRules; team: TeamMember[]
}) {
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const short = shortStudioName(studioName)
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
  /* (REG-645, E-99) An unsaved pattern is not lost to a tab or a reload without a word — Profile's rule. */
  useEffect(() => {
    if (!numDirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [numDirty])
  /* (REG-645, settings parity Q-05) GST: the studio's registration writes at once; the rate has its own Save. */
  const [gst, setGst] = useState<Studio>(studio)
  const [gstRate, setGstRate] = useState(String(studio.gstPct))
  const rateValue = Number(gstRate)
  const rateValid = gstRate.trim() !== '' && Number.isFinite(rateValue) && rateValue >= 0 && rateValue <= 30
  const rateDirty = rateValid && Math.round(rateValue * 10) / 10 !== gst.gstPct
  const writeGst = async (patch: { gstRegistered?: boolean; gstPct?: number }, done: string) => {
    const prev = gst
    setGst((g) => ({ ...g, ...patch }))
    try { const next = await setStudioGst(patch); setGst(next); if (patch.gstPct !== undefined) setGstRate(String(next.gstPct)); snackbar({ message: done }) }   // a rate being typed is not overwritten by the switch's answer
    catch { setGst(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  /* (REG-584 · 589 · 590) The studio's rules write at once, each with its own word. */
  const [rulesState, setRulesState] = useState<QuoteRules>(rules)
  const writeRules = async (patch: Partial<QuoteRules>, done: string) => {
    const prev = rulesState
    setRulesState((r) => ({ ...r, ...patch }))
    try { const clean = await setQuoteRules(patch); setRulesState(clean); snackbar({ message: done }) }
    catch { setRulesState(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  const saveNumbering = async () => {
    setNumBusy(true)
    try { const clean = await setNumbering(num); setNum(clean); setSavedNum(clean); snackbar({ message: `The next quote will be ${isDefaultNumbering(clean) ? defaultNextNumber(quoteNumbers) : formatQuoteNumber(clean, nextSequence(quoteNumbers, clean.prefix, clean.next), { initials: initialsOf(meName || 'Dane Tan'), date: new Date() })}` }) }   /* (sweep S4 #12) the real next number, as the example shows it — never OM-0001 while the studio is past it */
    catch { snackbar({ message: 'Couldn’t save the numbering — please try again' }) }
    finally { setNumBusy(false) }
  }

  /* (REG-602) Lead capture: the address to copy, the arrivals, the demo's simulated lead. */
  const router = useRouter()
  const address = intakeAddress(studioName, leadCapture.emailSlug)
  const { copied, copy } = useCopy(address, { done: 'Intake address copied' })
  const [simulating, setSimulating] = useState(false)
  const simulate = async () => {
    if (simulating) return
    setSimulating(true)
    try {
      const r = await simulateArrival('email')
      snackbar({ message: r.flagged ? `${r.name} wrote in — a lead with that number exists, so it waits in Review imported leads` : `${r.name} wrote in from the website — a new lead`, actionLabel: 'Open leads', onAction: () => router.push('/leads') })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t simulate the lead — please try again' }) } finally { setSimulating(false) }
  }
  const arrivedLine = (xs: { at: number }[]) => (xs.length ? `${xs.length} ${xs.length === 1 ? 'arrival' : 'arrivals'} · last ${displayDateTimeDot(new Date(Math.max(...xs.map((a) => a.at))))}` : 'Nothing yet')
  /* (REG-601) Who sees leads: two choice cards, optimistic like Stage movement. */
  const [vis, setVis] = useState<LeadVisibility>(leadVisibility)
  const chooseVis = async (next: LeadVisibility) => {
    if (next === vis) return
    const prev = vis
    setVis(next)
    try { await setLeadVisibility(next); snackbar({ message: next === 'assigned' ? 'Designers now see only their own leads, and Managers their own and their team’s' : 'Everyone sees every lead again' }) }
    catch { setVis(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
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
    if (sources.some((s) => s.name.toLowerCase() === name.toLowerCase())) { snackbar({ message: `${name} is already a source` }); return }
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
  const taken = (names: string[], typed: string) => { const t = typed.trim().toLowerCase(); return t && names.some((n) => n.toLowerCase() === t) ? `${typed.trim()} is already in the list` : undefined }
  const moveTo = <T,>(xs: T[], from: number, to: number): T[] => { const n = [...xs]; const [x] = n.splice(from, 1); n.splice(Math.max(0, Math.min(n.length, to)), 0, x as T); return n }
  const saveEntry = async (e: EntryEdit) => {
    const cur = entryEdit; if (!cur) return
    const from = cur.entry.name
    const names = cur.kind === 'source' ? sources.map((x) => x.name) : reasons[cur.kind].map((x) => x.name)
    if (e.name !== from && names.some((x) => x !== from && x.toLowerCase() === e.name.toLowerCase())) { setEntryTaken(e.name); return }   // (sweep S4 #23) said on the Name field
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
    if (list.some((r) => r.name.toLowerCase() === name.toLowerCase())) { snackbar({ message: `${name} is already a reason` }); return }
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
  const [noteFor, setNoteFor] = useState<{ trade: string; text: string; name: string; position: number } | null>(null)
  const [tradeError, setTradeError] = useState<string | null>(null)   /* (sweep S4 #7 · #23) the name's refusal inline, the dialog kept */
  const [tradeBusy, setTradeBusy] = useState(false)
  const saveNote = async (trade: string, text: string) => {
    const prev = notes
    const key = tradeKey(trade)
    setNotes((n) => { const next = { ...n }; if (text.trim()) next[key] = text.trim(); else delete next[key]; return next })
    try { setNotes(await setTradeNote(trade, text)); snackbar({ message: text.trim() ? `Note saved for ${trade}` : `Note removed from ${trade}` }) }
    catch { setNotes(prev); snackbar({ message: 'Couldn’t save the note — please try again' }) }
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
  /* (REG-647, settings parity Q-09) The trade's dialog saves its name (the quote lines, the price book and the note follow), its place and its note. */
  const saveTrade = async (n: { trade: string; text: string; name: string; position: number }) => {
    const name = n.name.trim().replace(/\s+/g, ' ')
    if (!name) { setTradeError(MSG.required); return }
    if (name !== n.trade && list.some((x) => x !== n.trade && x.toLowerCase() === name.toLowerCase())) { setTradeError(`${name} is already in the list`); return }
    if (tradeBusy) return
    setTradeBusy(true)
    try {
      let cur = list, curNotes = notes
      if (name !== n.trade) { const r = await renameTrade(n.trade, name); cur = r.trades; curNotes = r.notes }
      const idx = cur.indexOf(name)
      if (idx >= 0 && idx !== n.position - 1) cur = await setTrades(moveTo(cur, idx, n.position - 1))
      setList(cur); setManaged(true); setNotes(curNotes)
      setNoteFor(null); setTradeError(null)
      if ((curNotes[tradeKey(name)] ?? '') !== n.text.trim()) await saveNote(name, n.text)
      else snackbar({ message: name !== n.trade ? `${n.trade} is now ${name} — its quote lines and price book items follow` : 'Trades saved' })
    } catch { snackbar({ message: `Couldn’t save ${n.trade} — please try again` }) }   // the dialog stays open with what was typed
    finally { setTradeBusy(false) }
  }
  const addTrade = () => {
    const t = newTrade.trim()
    if (!t) return
    if (list.some((x) => x.toLowerCase() === t.toLowerCase())) { snackbar({ message: `${t} is already in the list` }); return }
    setNewTrade('')
    void writeTrades([...list, t], `${t} added to the trades`)
  }

  const fromHere = (key: string) => withFrom(settingsHref(key), from)   // a Company page opened from a module comes back to it
  const tabs = SETTINGS_MODULES.map((m) => ({ label: m.label, href: settingsHref(m.key), soon: !m.live }))
  return (
    <CompanyShell title="Settings" tabs={tabs} activeHref={settingsHref(section)} from={from} crumb="Settings" skeleton={<SettingsSkeleton />} onSoon={comingSoon}>
          {section === 'studio' ? (
            <StudioSettings studioName={short} team={team} entities={entities} backupName={team.find((m) => m.id === rulesState.backupApproverId)?.name ?? null}
                            rules={{ visibility: vis, quoteApproval: approval, templateApproval: tApproval, paymentLock: rulesState.paymentLock }} />
          ) : section === 'notifications' ? (
            <NotificationsSettings rules={notificationRules} templates={messageTemplates} canManage={canManage} />
          ) : section === 'leads' ? (
            <section className={styles.panel} aria-labelledby="settings-leads-title" data-testid="settings-leads">
              <ModuleHead id="settings-leads-title" title="Lead management" help={`Applies to every lead in ${short} — the table, the kanban board and imports.`} readOnly={readOnly}
                          links={[{ label: 'Integrations', icon: 'link', href: withFrom('/company/integrations', fromHere('leads')) }, { label: 'Questionnaire', icon: 'quiz', href: withFrom('/company/questionnaire', fromHere('leads')) }, { label: 'Members', icon: 'group', href: withFrom('/company/members', fromHere('leads')) }]} />
              <ReadOnlyScope readOnly={readOnly}>
              <div className={styles.setting}>
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Stage movement</span>
                  <span className={styles.settingHelp}>How leads move from one stage to the next. The stages are New, Contacted, Met, Quote Sent and Won, with On Hold and Lost beside them; On Hold and Lost always ask for a reason.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Stage movement">
                  {STAGE_MOVEMENT_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={mode === o.key} onSelect={guard(() => { void choose(o.key) })} />
                  ))}
                </div>
              </div>
              {/* (REG-599) Lead sources — Flipstone's "add TikTok etc.": the list the lead form, the import mapping, the filters and the Source column read. */}
              <div className={styles.setting} data-testid="lead-sources">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Lead sources</span>
                  <span className={styles.settingHelp}>Where a lead can come from — the Lead source field, the import mapping and the Source filter offer these. Retire a source to keep its leads and stop offering it; a source with no leads can be removed. {!sourcesManaged ? 'Not set yet — these are the defaults.' : JSON.stringify(sources) === JSON.stringify(DEFAULT_LEAD_SOURCES) ? 'These are the defaults.' : ''}</span>
                </div>
                <ul className={styles.trades} aria-label="Lead sources">
                  {sources.map((s, i) => {
                    const n = sourceCounts[s.name] ?? 0
                    return (
                      <li key={s.name} className={styles.trade} data-retired={s.retired || undefined} data-testid="lead-source">
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
                  <span className={styles.settingTitle}>Reasons</span>
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
                            <li key={r.name} className={styles.trade} data-retired={r.retired || undefined} data-testid="lead-reason">
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
                          {kind === 'lost' ? <TextField label="Needs logged contacts" value={newGate} onChange={(v) => setNewGate(v.slice(0, 2))} numeric="digits" maxLength={2} trailingIcon={null} className={styles.gateField} /> : null}
                          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => addReason(kind)} isDisabled={!newReason[kind].trim() || !!taken(reasons[kind].map((x) => x.name), newReason[kind])}>Add</Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              {/* (REG-602) Lead capture — Dyel's "website leads appear in the dashboard", Cove's Meta Ads: the intake address the website form emails, the Meta connection under Company › Integrations, and what arrived. */}
              <div className={styles.setting} data-testid="lead-capture" id="lead-capture">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Lead capture</span>
                  <span className={styles.settingHelp}>Point your website form at this address and every enquiry becomes a lead here — source Website, unread until someone opens it. A known phone number goes to Review imported leads instead of a second lead. Meta Lead Ads, webhooks and email lead sources connect under Company › Integrations; a webhook’s label is the source its leads carry.</span>
                </div>
                <div className={styles.captureRow}>
                  <code className={styles.captureAddress} data-testid="intake-address">{address}</code>
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy'}</Button>
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="link" size={20} />} onPress={() => router.push(withFrom('/company/integrations', fromHere('leads')))}>Integrations</Button>
                </div>
                {/* (REG-647, settings parity Q-12 · E-101) Every way in — the website form, Meta, each webhook, the email lead sources — with what arrived. */}
                <div className={`${styles.eventTable} ${styles.captureTable}`} role="table" aria-label="Ways in" data-testid="ways-in">
                  <div className={styles.eventHead} role="row"><span role="columnheader">Way in</span><span role="columnheader">Status</span><span role="columnheader">Arrived</span></div>
                  {[
                    { key: 'website', icon: 'input', name: 'Website form', status: 'Ready — the address above', arrived: arrivedLine(arrivals.filter((a) => a.fileName.startsWith('Website form'))) },
                    { key: 'meta', icon: 'storefront', name: 'Meta Lead Ads', status: leadCapture.meta.connected ? `Connected to ${leadCapture.meta.page || 'your page'}` : 'Not connected', arrived: arrivedLine(arrivals.filter((a) => a.fileName.startsWith('Meta Lead Ads'))) },
                    ...leadCapture.webhooks.map((w) => ({ key: w.id, icon: 'link', name: `Webhook · ${w.label}`, status: w.active ? 'Active' : 'Revoked', arrived: w.received ? `${w.received} received · ${w.created} new${w.lastAt ? ` · last ${displayDateTimeDot(new Date(w.lastAt))}` : ''}` : 'Nothing yet' })),
                    { key: 'email', icon: 'mail', name: 'Email lead sources', status: leadCapture.email.connected ? `Connected — ${leadCapture.email.address}` : 'Not connected', arrived: leadCapture.email.stats.found ? `${leadCapture.email.stats.found} found · ${leadCapture.email.stats.created} new` : 'Nothing yet' },
                  ].map((w) => (
                    <div key={w.key} className={styles.eventRow} role="row" data-testid={`way-in-${w.key}`}>
                      <span role="cell" className={styles.eventName}><Icon name={w.icon} size={20} weight={300} /><span>{w.name}</span></span>
                      <span role="cell" className={styles.eventWho} data-label="Status">{w.status}</span>
                      <span role="cell" className={styles.eventWho} data-label="Arrived">{w.arrived}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.captureMeta}>
                  {/* The demo's stand-in for an email arriving: an invented enquiry, marked as such. */}
                  {readOnly ? null : <Button appearance="text" iconStart={<Icon name="mail" size={18} />} onPress={() => { void simulate() }} isDisabled={simulating}>{simulating ? 'Arriving…' : 'Simulate an enquiry arriving (demo)'}</Button>}
                </div>
              </div>
              {/* (REG-601) Who sees leads — Dyel's hierarchy: the owner assigns, a manager assigns within their team, a designer keeps their own. Roles and teams live under Company › Members. */}
              <div className={styles.setting} data-testid="lead-visibility">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Who sees leads</span>
                  <span className={styles.settingHelp}>Owners and Admins always see every lead and assign anyone. Roles and who reports to whom are set under Company › Members.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Who sees leads">
                  {LEAD_VISIBILITY_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={vis === o.key} onSelect={guard(() => { void chooseVis(o.key) })} />
                  ))}
                </div>
              </div>
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
              <ModuleHead id="settings-quotes-title" title="Quotes & pricing" help={`Applies to every quote in ${short} — the editor, the lists, the templates and the client’s copy.`} readOnly={readOnly}
                          links={[{ label: 'Templates', icon: 'style', href: withFrom('/company/templates/quotes', fromHere('quotes')) }, { label: 'Price book', icon: 'list_alt', href: withFrom('/company/price-book', fromHere('quotes')) }]} />
              <ReadOnlyScope readOnly={readOnly}>
              {/* Quote approval (user 2026-08-30) and Template approval (REG-501) lived under Leads until this module was built (REG-561). */}
              <div className={styles.setting}>
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Quote approval</span>
                  <span className={styles.settingHelp}>Whether a quote is reviewed inside the studio before it goes to the client. This sets the stages a quote moves through.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Quote approval">
                  {QUOTE_APPROVAL_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={approval === o.key} onSelect={guardQ(() => { void chooseApproval(o.key) })} />
                  ))}
                </div>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Template approval</span>
                  <span className={styles.settingHelp}>Whether a designer’s quote template needs an Owner’s or Admin’s approval before the studio can use it. Applies to Company › Templates.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Template approval">
                  {TEMPLATE_APPROVAL_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={tApproval === o.key} onSelect={guardQ(() => { void chooseTemplateApproval(o.key) })} />
                  ))}
                </div>
              </div>
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
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.initials} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, initials: v }))} aria-label="Designer’s initials" /><span>Designer’s initials <span className={styles.settingHelp}>· who creates the quote</span></span></label>
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.yearMonth} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, yearMonth: v }))} aria-label="Year and month" /><span>Year and month <span className={styles.settingHelp}>· YYYYMM</span></span></label>
                  {/* (REG-586) Commercial work on its own sequence — the lead's property type decides (Commercial — Office / Retail). */}
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.commercial.on} isDisabled={readOnly} onChange={(v: boolean) => setNum((n) => ({ ...n, commercial: { ...n.commercial, on: v } }))} aria-label="A separate sequence for commercial work" /><span>Commercial work on its own sequence <span className={styles.settingHelp}>· offices and shops, by the lead’s property type</span></span></label>
                  {num.commercial.on ? <TextField label="Commercial prefix" value={num.commercial.prefix} maxLength={8} onChange={(v) => setNum((n) => ({ ...n, commercial: { ...n.commercial, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') } }))} helper="Letters and digits, up to 8" /> : null}
                  {num.commercial.on ? <TextField label="Commercial next number" value={num.commercial.next ? String(num.commercial.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setNum((n) => ({ ...n, commercial: { ...n.commercial, next: v ? Number(v) : 0 } }))} helper="Blank continues from the highest given" /> : null}
                </div>
                <div className={styles.example}><span className={styles.settingHelp}>Next quote:</span> <span className={styles.exampleNo} data-testid="number-example">{example}</span>{exampleCom ? <><span className={styles.settingHelp}>· commercial:</span> <span className={styles.exampleNo} data-testid="number-example-commercial">{exampleCom}</span></> : null}</div>
                {readOnly ? null : <div className={styles.settingActions}>
                  <Button variant="secondary" appearance="outlined" onPress={() => setNum(savedNum)} isDisabled={!numDirty || numBusy}>Discard</Button>
                  <Button onPress={guardQ(() => { void saveNumbering() })} isDisabled={!numDirty || numBusy}>{numBusy ? 'Saving…' : 'Save numbering'}</Button>
                </div>}
              </div>
              {/* (REG-561) Trades — the Category column's list and what templates group by; free text on a quote is kept as its own label. */}
              <div className={styles.setting} data-testid="trades">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Trades</span>
                  <span className={styles.settingHelp}>The trades the Category column offers on every quote and the templates group by. Press a trade to rename it, move it or give it a note; the note prints under that trade’s section when a quote writes none of its own. {managed ? '' : 'Not set yet — these are the trades your quotes and My Items already use.'}</span>
                </div>
                <ul className={styles.trades} aria-label="Trades">
                  {list.map((t, i) => (
                    <li key={t} className={styles.trade} data-noted={notes[tradeKey(t)] ? '' : undefined} data-testid="trade">
                      {readOnly ? (
                        /* (REG-645, Q-08) Read-only: the name, and the note as its tooltip — every value shown, nothing to press. */
                        notes[tradeKey(t)] ? <Tooltip label={notes[tradeKey(t)]!}><span className={styles.tradeName} tabIndex={0}><Icon name="sticky_note_2" size={16} weight={300} /><span>{t}</span></span></Tooltip> : <span className={styles.tradeName}><span>{t}</span></span>
                      ) : (
                      <Tooltip label={`Edit ${t} — its name, place or note`}>
                        <button type="button" className={styles.tradeName} onClick={() => { setTradeError(null); setNoteFor({ trade: t, text: notes[tradeKey(t)] ?? '', name: t, position: i + 1 }) }}>
                          {notes[tradeKey(t)] ? <Icon name="sticky_note_2" size={16} weight={300} /> : null}<span>{t}</span>
                        </button>
                      </Tooltip>
                      )}
                      {canManage ? <Tooltip label={`Remove ${t}`}><IconButton icon="close" label={`Remove ${t}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeTrades(list.filter((x) => x !== t), `${t} removed — quotes already using it keep the label`, { trade: t, note: notes[tradeKey(t)] ?? '' }) }} /></Tooltip> : null}
                    </li>
                  ))}
                  {list.length === 0 ? <li className={styles.settingHelp}>No trades yet.</li> : null}
                </ul>
                {canManage ? (
                  <div className={styles.addTrade}>
                    <TextField label="Add a trade" value={newTrade} onChange={setNewTrade} maxLength={40} error={taken(list, newTrade)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrade() } }} />
                    <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={addTrade} isDisabled={!newTrade.trim() || !!taken(list, newTrade)}>Add</Button>
                  </div>
                ) : null}
                <Dialog open={!!noteFor} onClose={() => { setNoteFor(null); setTradeError(null) }} title="Trade" subtitle={noteFor?.trade} size="modal" width={600}
                        footer={readOnly ? <Button variant="secondary" appearance="outlined" onPress={() => setNoteFor(null)}>Close</Button> : <><Button variant="secondary" appearance="outlined" onPress={() => setNoteFor(null)}>Cancel</Button><Button isDisabled={tradeBusy} onPress={guardQ(() => { const n = noteFor; if (n) void saveTrade(n) })}>{tradeBusy ? 'Saving…' : 'Save'}</Button></>}>
                  <div className={styles.entryForm} data-testid="trade-dialog">
                    <TextField label="Name" required value={noteFor?.name ?? ''} maxLength={40} onChange={(v) => { setTradeError(null); setNoteFor((n) => (n ? { ...n, name: v } : n)) }} error={tradeError ?? undefined} helper="A new name carries the quote lines and the price book items filed under it" />
                    <TextField label="Place in the list" mode="select" options={list.map((_, i) => String(i + 1))} value={String(noteFor?.position ?? 1)} onChange={(v) => setNoteFor((n) => (n ? { ...n, position: Number(v) } : n))} />
                    <TextField label="Note" value={noteFor?.text ?? ''} autoFocus={!readOnly} maxLength={300} onChange={(v) => setNoteFor((n) => (n ? { ...n, text: v } : n))}
                               onKeyDown={(e) => { if (e.key === 'Enter' && !readOnly) { e.preventDefault(); const n = noteFor; if (n) void saveTrade(n) } }} />
                    <p className={styles.settingHelp}>The note prints under a section named {noteFor?.name || noteFor?.trade} when the quote writes no note of its own, where the template shows section notes. Leave it empty to remove it.</p>
                  </div>
                </Dialog>
              </div>
              {/* (REG-645, settings parity Q-05) GST — 1.0 took it from the lead's country and the entity; 2.0's studio says it once. */}
              <div className={styles.setting} data-testid="gst">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>GST</span>
                  <span className={styles.settingHelp}>Whether the studio charges GST, and the rate a new line starts with. Quotes already written keep their rates; another issuing entity keeps its own switch under Company › Profile.</span>
                </div>
                <label className={styles.switchRow}><Switch size="sm" isSelected={gst.gstRegistered} isDisabled={readOnly} aria-label="The studio is registered for GST"
                  onChange={guardQV((v: boolean) => { void writeGst({ gstRegistered: v }, v ? `${short} is registered for GST — new quotes carry it` : `${short} is not registered for GST — new quotes start without it`) })} /><span>Registered for GST</span></label>
                <div className={styles.gstRow}>
                  {/* A rate takes one decimal (8.5 %): digits and one point, as typed — the amount filter keeps whole dollars only. */}
                  <TextField label="GST rate (%)" value={gstRate} inputMode="decimal" maxLength={4} onChange={(v) => setGstRate(decimalTyped(v, 1))} disabled={!gst.gstRegistered}
                             error={gstRate.trim() && !rateValid ? 'Between 0 and 30' : undefined} helper="A new line starts at this rate" />
                  {readOnly ? null : <Button variant="secondary" appearance="outlined" onPress={guardQ(() => { void writeGst({ gstPct: rateValue }, `New lines start at ${Math.round(rateValue * 10) / 10}% GST`) })} isDisabled={!rateDirty || !gst.gstRegistered}>Save rate</Button>}
                </div>
              </div>
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
              <div className={styles.setting} data-testid="payment-lock">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Payment schedule</span>
                  <span className={styles.settingHelp}>Who may change a quote’s payment schedule. Locked, everyone but Owners and Admins sees the milestones and cannot edit, reorder, add or replace them.</span>
                </div>
                <label className={styles.switchRow}><Switch size="sm" isSelected={rulesState.paymentLock} isDisabled={readOnly} onChange={guardQV((v: boolean) => { void writeRules({ paymentLock: v }, v ? 'Only Owners and Admins change the payment schedule now' : 'Every member can change the payment schedule') })} aria-label="Only Owners and Admins can change the payment schedule" /><span>Only Owners and Admins can change it</span></label>
              </div>
              {/* (REG-590) A backup approver beside the Owners and Admins — H Design's ask. */}
              <div className={styles.setting} data-testid="backup-approver">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Backup approver</span>
                  <span className={styles.settingHelp}>A member who may approve quotes and publish templates when an Owner or Admin is away. Owners and Admins always can.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Backup approver" mode="select" value={team.find((m) => m.id === rulesState.backupApproverId)?.name ?? 'None'} options={['None', ...team.filter((m) => m.role !== 'Owner' && m.role !== 'Admin' && m.isActive !== false).map((m) => m.name)]}
                             onChange={guardQV((v: string) => { const m = team.find((x) => x.name === v) ?? null; void writeRules({ backupApproverId: m?.id ?? null }, m ? `${m.name} can approve as the backup` : 'No backup approver') })} />
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
              </ReadOnlyScope>
            </section>
          )}
    </CompanyShell>
  )
}
