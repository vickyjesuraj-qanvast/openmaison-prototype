'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Reorder, useDragControls } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { AiSheet } from '@/components/leads/ai-sheet'
import { PageReveal } from '@/components/shell/page-reveal'
import { MaisonFab } from '@/components/shell/maison-fab'
import { useRun } from '@/components/leads/tasks/use-run'
import { applyTemplateDefaults, deleteQuotes, duplicateQuote } from '@/app/leads/quotes-actions'
import { DeleteQuotesDialog } from '@/components/leads/quotes/delete-dialog'
import { RenameQuoteDialog } from './rename-dialog'
import { clientViewFromDesign, parseClientView } from '@/lib/templates/client-view'
import { saveQuoteAsTemplate, setQuoteTemplate, updateQuoteTemplateVersion } from '@/app/company/templates-actions'
import { SaveAsTemplateDialog, TemplateCard, TemplateUpdateBanner } from './template-bar'
import { ClientViewPane } from './client-view-pane'
import { TemplatePicker, defaultPick } from '@/components/templates/template-picker'
import { fallbackDesignClient } from '@/lib/templates/presets'

/** The built-in client design a quote with no template prints through — one instance, so the pane's memo holds. */
const FALLBACK_CLIENT_DESIGN = fallbackDesignClient()
import { Dialog } from '@/components/om/dialog'
import { Drawer } from '@/components/om/drawer'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { docDataFromRecords, type DocData } from '@/lib/templates/data'
import { clientColumnsOf, viewForTemplate } from '@/lib/templates/picker'
import { updateItemsPrefs } from '@/app/quotes/items-actions'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import type { ItemsView } from '@/lib/quotes/items-model'
import { approveQuote, requestQuoteChanges, restoreQuoteVersion, reviseQuote, saveQuoteGeneral, saveQuoteSections, type GeneralPatch } from '@/app/quotes/actions'
import { ApprovalBar, SentBanner } from './quote-bars'
import { LineCommentsDrawer } from './line-comments'
import { addLineComment, deleteLineComment, editLineComment } from '@/app/quotes/comment-actions'
import type { QuoteItemComment } from '@/lib/db/schema'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { readiness } from '@/lib/templates/readiness'
import { canDeleteQuote, DELETE_RULE, offersQuoteSent, STATUS_BLOCK_META, statusBlock, validityPassed } from '@/lib/quotes/policy'
import { confirmLink } from '@/lib/quotes/confirm'
import { useQuoteSend } from '@/components/quotes/send/use-quote-send'
import { useQuoteStatus } from '@/components/leads/quotes/use-quote-status'
import { moveStageHref } from '@/lib/leads/move-link'
import { lineChanges } from './items/line-change'
import { ReviseDialog } from './revise-dialog'
import { VersionHistoryDrawer } from './version-history'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import { duration } from '@/lib/motion'
import { quoteStatuses, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteEditorData } from '@/lib/quotes/editor'
import type { QuoteItem, QuotePayment } from '@/lib/db/schema'
import { SECTION_LABELS, isFixedSection, parseSections, pinFixed, type QuoteSectionState, type SectionKey } from '@/lib/quotes/sections'
import { EditorHeader, type HeaderMenuAction } from './editor-header'
import { EditorTabs } from './editor-tabs'
import { CreateStrip, useStripExpanded } from './create-strip'
import { SectionCard } from './section-card'
import { GeneralInfo, type GeneralState } from './general-info'
import { ItemsCard, type ItemsSeed } from './items/items-section'
import { PaymentsCard, type PaymentsSeed } from './payments/payments-section'
import { FilesCard, type FilesSeed } from './files/files-section'
import { TextCard, type TextSeed } from './text/text-section'
import { SignatureCard, type SignatureSeed } from './signature/signature-section'
import { ActivityBody } from './activity/activity-section'
import { countedLines, flattenItems, money2, parseDiscounts } from '@/lib/quotes/math'
import type { TextContext, TokenValues } from '@/lib/quotes/text'
import { toRows } from '@/lib/quotes/payments'
import { scheduleAnchors } from '@/lib/quotes/payments'
import { EditorSkeleton } from './editor-skeleton'
import styles from './quote-editor.module.css'

/** Header 76 + tab strip 48: what a section scrolls under when a tab selects it. */
const STICKY = 76 + 48
const AUTOSAVE_MS = 600

/** "Saved 2 mins ago" (1201:33811) — the header's own wording, from the last write's stamp. */
function savedLabel(updatedAt: number, now: number): string {
  const s = Math.max(0, Math.floor((now - updatedAt) / 1000))
  if (s < 60) return 'Saved just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `Saved ${m} ${m === 1 ? 'min' : 'mins'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `Saved ${h} ${h === 1 ? 'hour' : 'hours'} ago`
  return `Saved ${displayDate(new Date(updatedAt))}`
}

/**
 * Quote editor (Figma 1271:40301, page 1260:31139) — phase 1: the page shell, General Info and the section frame.
 * Specs: design-source/context/quote-editor/. The editor owns its state: every General Info change lands in the local
 * copy at once and is written 600 ms after the last keystroke (autosave — the header's "Saved n mins ago" is the
 * last write's stamp); the server never re-renders under a half-typed field. Sections collapse and — the five movable
 * ones — reorder, remembered per quote (owner 2026-09-11); General Info and Items open by default, the rest collapsed. The
 * status pill sits in the header (REG-404, the page's own frame 1260:31139 draws it there and General Info's slot empty).
 * Every section is live: Items (REG-415), the Payment Schedule (REG-418), Files (REG-419), Terms and Conditions / Additional
 * Notes (REG-420), Signature and Activity (REG-421).
 */
export function QuoteEditor({ data, from, section, apply, restored }: { data: QuoteEditorData; /** (REG-625) back from Bring back: the version that returned, said once */ restored?: number; from?: string; /** (REG-490) the preview's Open links land on a section */ section?: string; /** (REG-579) the template whose new version this quote just moved to — the "Apply defaults · Keep mine" question opens on arrival */ apply?: string }) {
  const { contract, quote, lead, siblings, members, quoteApproval, items, priceBook, priceBookSections, trades, teamIds, versions, studio, files, me, payments, quoteFiles, textTemplates, paymentSplits, activity, now, brand, studioDetails, rules, canApprove, changes } = data
  const paymentsLocked = rules.paymentLock && !(me?.role === 'Owner' || me?.role === 'Admin')   /* (REG-589) */
  const router = useRouter()
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const { run, fail } = useRun()
  /* (REG-489) The template the quote prints through, pinned to a version; the banner offers the newer one. */
  const [templateState, setTemplateState] = useState(data.templateState)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [bannerKept, setBannerKept] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  /* (REG-496) Change / the strip's Templates open the picker; a change on a grouped table asks whether to regroup the template's way. */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [regroup, setRegroup] = useState<{ view: ItemsView; label: string } | null>(null)
  const [forceView, setForceView] = useState<{ key: ItemsView; nonce: number } | null>(null)
  /* (REG-497) The live client view beside the sections (a drawer on a tablet). */
  const [clientView, setClientView] = useState(false)
  const [gstOn, setGstOn] = useState(true)   /* the Items card reports its GST switch on mount and on change; the text context prints "inclusive of GST" only when on */
  const [bookTick, setBookTick] = useState(0)   /* (REG-662) the Create strip's My Items opens the Price book modal (it opened Add Item's dropdown, REG-522) */
  /* (REG-538) The kebab's own dialogs — Rename · Duplicate · Delete · Export — and the contract template picker. */
  const [exportTick, setExportTick] = useState(0)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  /* (REG-565) Version History and Revise: the drawer, the confirm, the version the header prints. */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [reviseOpen, setReviseOpen] = useState(false)
  const [version, setVersion] = useState(quote.version)
  /* (REG-538) Change template on a Draft asks whether the template's defaults land too; the REG-497 regroup question waits behind it. */
  const [applyTpl, setApplyTpl] = useState<{ id: string; name: string; regroup: { view: ItemsView; label: string } | null } | null>(() => (apply && data.templateState.current && data.templateState.current.id === apply && data.quote.status === 'Draft' ? { id: data.templateState.current.id, name: data.templateState.current.name, regroup: null } : null))
  /* (REG-579) The `apply` flag is one-shot: it leaves the address once read, so a reload never asks again. */
  /* (REG-625, parity Q-25) Back from Bring back: say so once, then the flag leaves the address, as `apply` does. */
  useEffect(() => {
    if (!restored) return
    snackbar({ message: `Version ${restored} is back — the draft holds its lines again` })
    const u = new URL(window.location.href); u.searchParams.delete('restored'); router.replace(`${u.pathname}${u.search}`, { scroll: false })
  }, [restored, router, snackbar])
  useEffect(() => { if (!apply) return; const u = new URL(window.location.href); if (!u.searchParams.has('apply')) return; u.searchParams.delete('apply'); router.replace(`${u.pathname}${u.search}`, { scroll: false }) }, [apply, router])
  const [seedNonce, setSeedNonce] = useState(0)   /* bumps when defaults land: the seeded cards remount on their new seeds */
  const [textVisible, setTextVisible] = useState({ terms: quote.termsVisible, notes: quote.notesVisible })   /* the two "Show in client view" switches, for the live pane */
  const tabletDown = useMediaQuery(TABLET_DOWN)

  /* ── state ── */
  const [status, setStatus] = useState(quote.status)
  /* (REG-624, parity Q-22 · Q-04) The approval on the record — who sent it, the approver's last note — and when the client got it. */
  const [record, setRecord] = useState(() => ({
    submittedBy: quote.submittedBy, submittedAt: quote.submittedAt?.getTime() ?? null, sentAt: quote.sentAt?.getTime() ?? null,
    reviewNote: quote.reviewNote, reviewedBy: quote.reviewedBy, reviewedAt: quote.reviewedAt?.getTime() ?? null,
    clientSentAt: quote.clientSentAt?.getTime() ?? null, confirmedAt: quote.confirmedAt?.getTime() ?? null, confirmedBy: quote.confirmedBy,
  }))
  const [changesDismissed, setChangesDismissed] = useState(false)
  const [bringBack, setBringBack] = useState<number | null>(null)   /* (REG-625) the version waiting on its confirm */
  /* (REG-627, parity Q-30) The team's comments on the lines: the drawer, which thread it shows, and the threads themselves. */
  const [comments, setComments] = useState<QuoteItemComment[]>(data.lineComments)
  const [commentsView, setCommentsView] = useState<{ open: boolean; focus: string | null }>({ open: false, focus: null })
  const commentCounts = useMemo(() => { const m: Record<string, number> = {}; for (const c of comments) m[c.itemId] = (m[c.itemId] ?? 0) + 1; return m }, [comments])
  const [changesOpen, setChangesOpen] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const nameOf = (id: string | null | undefined) => (id ? members.find((m) => m.id === id)?.name ?? null : null)
  const [general, setGeneral] = useState<GeneralState>(() => ({
    title: quote.title,
    preparedBy: quote.preparedBy,
    validUntil: quote.validUntil ? inputDate(quote.validUntil) : '',
    projectRef: quote.projectRef ?? '',
    nric: quote.nric ?? '',
    customerId: quote.customerId ?? '',
    propertyType: quote.propertyType ?? lead.propertyType,
    siteAddress: quote.siteAddress ?? lead.propertyAddress ?? '',
    client2Name: quote.client2Name ?? '', client2Nric: quote.client2Nric ?? '',   // (REG-588)
  }))
  const [sections, setSections] = useState<QuoteSectionState[]>(() => parseSections(quote.sections))
  const [updatedAt, setUpdatedAt] = useState((quote.updatedAt ?? quote.createdAt).getTime())
  const [clock, setClock] = useState(now)
  const stamp = (t: number) => { setUpdatedAt(t); setClock(Date.now()) }
  const [active, setActive] = useState<SectionKey>('general')
  const [statusOpen, setStatusOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const fabRef = useRef<HTMLSpanElement>(null)
  const [itemCount, setItemCount] = useState(items.filter((i) => i.kind === 'item').length)
  // The quote's live total and lines (the Items section reports them): the Payment Schedule's amounts and its AI schedule follow.
  const [amountMinor, setAmountMinor] = useState(quote.amountMinor)
  const [fileCount, setFileCount] = useState(quoteFiles.length)
  const [lines, setLines] = useState<QuoteItem[]>(items)
  const [scheduleRows, setScheduleRows] = useState<QuotePayment[]>(payments)

  // The saved label ages on its own clock (30 s), the only place time is read on the client (no Date.now() in render).
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  // (REG-490) Arriving from the preview's "Open" lands on the section that needs work.
  useEffect(() => { if (!section) return; const t = setTimeout(() => { document.getElementById(`section-${section}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, 350); return () => clearTimeout(t) }, [section])

  /* ── autosave: merge every change into one pending patch, write 600 ms after the last one, flush on leave ── */
  const pending = useRef<GeneralPatch>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = async () => {
    const patch = pending.current
    pending.current = {}
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (Object.keys(patch).length === 0) return
    try {
      const r = await saveQuoteGeneral(quote.id, patch)
      setUpdatedAt(r.updatedAt); setClock(Date.now())
    } catch { fail('save the quote') }
  }
  const flushRef = useRef(flush)
  useEffect(() => { flushRef.current = flush })
  useEffect(() => {
    const onHide = () => { void flushRef.current() }
    window.addEventListener('pagehide', onHide)
    return () => { window.removeEventListener('pagehide', onHide); void flushRef.current() }
  }, [])
  const queue = (patch: GeneralPatch) => {
    Object.assign(pending.current, patch)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS)
  }
  const changeGeneral = (patch: Partial<GeneralState>) => {
    setGeneral((g) => ({ ...g, ...patch }))
    const out: GeneralPatch = {}
    if (patch.title !== undefined) out.title = patch.title
    if (patch.preparedBy !== undefined) out.preparedBy = patch.preparedBy
    if (patch.validUntil !== undefined) out.validUntil = patch.validUntil ? (parseInputDate(patch.validUntil)?.getTime() ?? null) : null
    if (patch.projectRef !== undefined) out.projectRef = patch.projectRef
    if (patch.nric !== undefined) out.nric = patch.nric
    if (patch.customerId !== undefined) out.customerId = patch.customerId
    if (patch.propertyType !== undefined) out.propertyType = patch.propertyType
    if (patch.siteAddress !== undefined) out.siteAddress = patch.siteAddress
    if (patch.client2Name !== undefined) out.client2Name = patch.client2Name   // (REG-588)
    if (patch.client2Nric !== undefined) out.client2Nric = patch.client2Nric
    queue(out)
  }

  /* ── sections: collapse / reorder, persisted per quote ── */
  const sectionsRef = useRef(sections)
  useEffect(() => { sectionsRef.current = sections })
  const persistSections = (next: QuoteSectionState[]) => { void run('save the layout', () => saveQuoteSections(quote.id, next)) }
  const toggle = (key: SectionKey) => {
    const next = sections.map((s) => (s.key === key ? { ...s, collapsed: !s.collapsed } : s))
    setSections(next); persistSections(next)
  }
  const reorder = (keys: SectionKey[]) => {
    setSections((cur) => pinFixed(keys.map((k) => cur.find((s) => s.key === k)!).concat(cur.filter((s) => isFixedSection(s.key)))))
  }

  /* ── tabs: the strip follows the scroll; selecting a tab scrolls its section under the sticky block ── */
  // A chosen tab stays selected while its smooth scroll runs (a section near the page's end never reaches the line).
  const pinned = useRef<{ key: SectionKey; until: number } | null>(null)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (pinned.current && performance.now() < pinned.current.until) { const k = pinned.current.key; setActive((a) => (a === k ? a : k)); return }
        pinned.current = null
        const line = STICKY + 25   // the first section's top edge sits 24 under the strip
        const list = sectionsRef.current
        const rects = list.map((s) => ({ key: s.key, rect: document.getElementById(`section-${s.key}`)?.getBoundingClientRect() ?? null }))
        let current: SectionKey = list[0]?.key ?? 'general'
        for (const r of rects) if (r.rect && r.rect.top <= line) current = r.key
        // At the very end of the page the sections below the line cannot scroll up to it: the one showing most wins.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
          let best = 0
          for (const r of rects) {
            if (!r.rect) continue
            const visible = Math.min(r.rect.bottom, window.innerHeight) - Math.max(r.rect.top, STICKY)
            if (visible > best) { best = visible; current = r.key }
          }
        }
        setActive((a) => (a === current ? a : current))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])
  const selectTab = (key: string) => {
    const k = key as SectionKey
    // A collapsed section opens when its tab is chosen — there is nothing to scroll to otherwise.
    const wasCollapsed = !!sections.find((s) => s.key === k)?.collapsed
    if (wasCollapsed) { const next = sections.map((s) => (s.key === k ? { ...s, collapsed: false } : s)); setSections(next); persistSections(next) }
    const el = document.getElementById(`section-${k}`)
    if (!el) return
    const scroll = () => { const top = el.getBoundingClientRect().top + window.scrollY - STICKY - 24; window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }) }
    pinned.current = { key: k, until: performance.now() + 1500 }
    scroll()
    /* A section near the page's end opens as a height animation (section-card.tsx): its target sits past the page's scrollable
       height until it has grown, and a smooth scroll asked for a place the page cannot reach yet goes nowhere. Ask again once
       the body has settled (REG-429). */
    if (wasCollapsed) setTimeout(scroll, duration.step * 1000 + 40)
    setActive(k)
  }

  /* ── header actions ── */
  const steps = quoteStatuses(quoteApproval)
  /* (REG-624, parity Q-22) The approval bar's two answers. */
  const approve = () => {
    setApprovalBusy(true)
    void run('approve the quote', async () => { await flushRef.current(); const r = await approveQuote(quote.id); setStatus(r.status); stamp(r.updatedAt) }, record.submittedBy && record.submittedBy !== me?.id ? `Quote approved — ${nameOf(record.submittedBy) ?? 'the sender'} can send it to the client` : 'Quote approved').finally(() => setApprovalBusy(false))
  }
  const requestChanges = (note: string) => {
    setChangesOpen(false)
    setApprovalBusy(true)
    void run('send the quote back', async () => {
      await flushRef.current()
      const r = await requestQuoteChanges(quote.id, note)
      setStatus(r.status); stamp(r.updatedAt)
      setRecord((x) => ({ ...x, reviewNote: note, reviewedBy: me?.id ?? null, reviewedAt: r.updatedAt })); setChangesDismissed(false)
    }, `Sent back to ${nameOf(record.submittedBy) ?? 'the sender'} with your note`).finally(() => setApprovalBusy(false))
  }
  /* (UX audit Q3) The pill's statuses go through the house status change: Sent for Approval tells the approvers, the client's statuses ask
     first, every mark answers with Undo (components/leads/quotes/use-quote-status.tsx). */
  const statusChange = useQuoteStatus(({ status: s, undo, undone }) => {
    setStatus(s); stamp(Date.now())
    if (undone) setRecord((x) => ({ ...x, sentAt: undo.sentAt, clientSentAt: undo.clientSentAt, submittedAt: undo.submittedAt, submittedBy: undo.submittedBy, confirmedAt: undo.confirmedAt, confirmedBy: undo.confirmedBy }))
    else setRecord((x) => ({ ...x, sentAt: x.sentAt ?? Date.now(), ...(s === 'Sent for Approval' ? { submittedBy: me?.id ?? null, submittedAt: Date.now() } : {}), ...(s === 'Sent to Client' || s === 'Confirmed' || s === 'Signed' ? { clientSentAt: x.clientSentAt ?? Date.now() } : {}), ...(s === 'Confirmed' ? { confirmedAt: x.confirmedAt ?? Date.now() } : {}) }))
  })
  const changeStatus = (s: QuoteStatus) => { setStatusOpen(false); statusChange.change({ id: quote.id, number: quote.number, status }, s) }
  /* Preview, Download as PDF and Print open the quote through its template (REG-490); Save as Template makes a draft template
     (REG-489); Rename, Duplicate and Edit, Export and Delete are live (REG-538); Version History and Comments still answer coming soon (owner 2026-09-11). */
  const onMenu = (action: HeaderMenuAction) => {
    if (action === 'preview') { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview`, from)); return }
    if (action === 'pdf' || action === 'print') { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview?print=1`, from)); return }
    if (action === 'template') { setSaveAsOpen(true); return }
    if (action === 'contract') { quoteSend.openContract(); return }   /* (REG-534 → REG-538) the contract template picker first; the contract reads this quote */
    if (action === 'confirmLink') { const open = status === 'Approved' || status === 'Sent to Client' || status === 'Confirmed' || status === 'Signed'; void navigator.clipboard?.writeText(confirmLink(quote.id)).then(() => snackbar({ message: open ? 'Confirmation link copied' : 'Confirmation link copied — it opens for the client once the quote is sent' }), () => snackbar({ message: 'Couldn’t copy the link — please try again' })); return }   /* (REG-587; REG-626: the link confirms only a sent quote) */
    if (action === 'xray') { void flushRef.current(); router.push(`/quote-x-ray?lead=${lead.id}&quote=${quote.id}&from=${encodeURIComponent(withFrom(`/quotes/${quote.id}`, from))}`); return }   /* (REG-529) Quote X-Ray on this quote; (REG-639) the editor keeps its own origin for the way back */
    if (action === 'rename') { setRenameOpen(true); return }
    if (action === 'duplicate') { void flushRef.current(); void run('duplicate the quote', async () => { const id = await duplicateQuote(quote.id); router.push(withFrom(`/quotes/${id}`, from)) }, 'Quote duplicated — this is the copy'); return }
    if (action === 'delete') { if (!canDeleteQuote({ id: me?.id ?? null, role: me?.role }, quote)) { snackbar({ message: DELETE_RULE }); return } setDeleteOpen(true); return }   /* (REG-625, parity Q-28) */
    if (action === 'export') { if (!openOf('items')) toggle('items'); setExportTick((t) => t + 1); return }   /* the Items export (REG-478) */
    if (action === 'history') { void flushRef.current(); setHistoryOpen(true); return }   /* (REG-565) */
    if (action === 'revise') { void flushRef.current(); if (canRevise) setReviseOpen(true); else snackbar({ message: reviseHint }); return }
    if (action === 'comments') { setCommentsView({ open: true, focus: null }); return }   /* (REG-627, parity Q-30) every line's thread */
    comingSoon()
  }
  /* (REG-565) Revise is for a quote the client has seen (or the studio approved): a Draft never sent is simply edited. */
  const canRevise = status !== 'Draft' || !!quote.sentAt
  const reviseHint = 'A draft that was never sent is edited, not revised — Revise once it has gone out.'
  const doRevise = (note: string) => {
    setReviseOpen(false)
    void run('start the new version', async () => {
      await flushRef.current()
      const r = await reviseQuote(quote.id, note || undefined)   /* (UX audit Q10) the client's request, kept with the version it answers */
      setVersion(r.version); setStatus('Draft'); stamp(r.updatedAt); setHistoryOpen(false)
      setRecord({ submittedBy: null, submittedAt: null, sentAt: null, reviewNote: null, reviewedBy: null, reviewedAt: null, clientSentAt: null, confirmedAt: null, confirmedBy: null })   // (REG-624) the new version starts clean
      router.refresh()
    }, `Version ${version + 1} started — version ${version} is kept in Version History`)
  }
  const VIEW_WORD: Record<ItemsView, string> = { none: 'your own sections', category: 'Trade', room: 'Room', section: 'Section label' }   /* (REG-567) */
  const pickTemplate = (templateId: string) => {
    setPickerOpen(false)
    setPickedTpl(null)
    if (templateId === templateState.current?.id) return
    setTemplateBusy(true)
    void run('change the template', async () => {
      await setQuoteTemplate(quote.id, templateId)
      const t = templateState.picker.templates.find((x) => x.id === templateId) ?? null
      setTemplateState((st) => ({ ...st, current: t ? { id: t.id, name: t.name, pinned: t.version, latest: t.version, note: '', design: t.design, defaults: t.defaults, deleted: false } : null }))
      setBannerKept(false); stamp(Date.now())
      // (REG-497) A grouped table on a template that groups another way: offer to regroup the way it prints.
      const regroupAsk = t ? (() => { const v = viewForTemplate(t.design); return v !== 'none' && lines.some((l) => l.kind === 'group') ? { view: v, label: `${t.name} prints by ${VIEW_WORD[v]}` } : null })() : null
      // (REG-538) On a Draft the template's Defaults can land too — asked, never silent; the regroup question follows it.
      if (t && status === 'Draft') setApplyTpl({ id: t.id, name: t.name, regroup: regroupAsk })
      else if (regroupAsk) setRegroup(regroupAsk)
    }, 'Template changed').finally(() => setTemplateBusy(false))
  }
  const closeApply = () => { const pending = applyTpl?.regroup ?? null; setApplyTpl(null); if (pending) setRegroup(pending) }
  const doApplyDefaults = () => {
    const tpl = applyTpl; closeApply(); if (!tpl) return
    setTemplateBusy(true)
    void run('apply the template’s defaults', async () => {
      await flushRef.current()
      const r = await applyTemplateDefaults(quote.id, tpl.id)
      setGeneral((g) => ({ ...g, validUntil: r.validUntil ? inputDate(new Date(r.validUntil)) : '' }))
      setItemsSeed((sd) => ({ ...sd, items: r.items, pricing: { ...sd.pricing, gstEnabled: r.gstEnabled }, columnsJson: r.itemsColumns, view: r.itemsView as ItemsSeed['view'] }))
      setPaymentsSeed((sd) => ({ ...sd, rows: r.payments }))
      setTermsSeed((sd) => ({ ...sd, html: r.termsHtml ?? '' })); setNotesSeed((sd) => ({ ...sd, html: r.notesHtml ?? '' }))
      setSignatureSeed((sd) => ({ ...sd, required: r.signatureRequired }))
      setSeedNonce((n) => n + 1); stamp(r.updatedAt)
    }, `${tpl.name}’s defaults applied`).finally(() => setTemplateBusy(false))
  }
  const doRegroup = (view: ItemsView) => {
    setRegroup(null)
    void run('regroup the items', async () => { await updateItemsPrefs(quote.id, { itemsView: view }); setForceView({ key: view, nonce: Date.now() }) }, `Items grouped by ${VIEW_WORD[view]}`)
  }
  /* (REG-496) Edit template opens the template editor in this tab with this quote as its origin: Back returns here, Preview with is this quote, Publish can update it. */
  const editTemplate = () => {
    const cur = templateState.current
    if (!cur) return
    void flushRef.current()
    const here = from ? withFrom(`/quotes/${quote.id}`, from) : `/quotes/${quote.id}`
    router.push(`/templates/${cur.id}?from=${encodeURIComponent(here)}&quote=${quote.id}`)
  }
  /* (REG-497) The client's pages from the editor's own state: the lines as the table holds them, General Info as typed, the schedule as it stands. */
  const clientData: DocData = useMemo(() => docDataFromRecords({
    quote: { ...quote, title: general.title, preparedBy: general.preparedBy, validUntil: general.validUntil ? parseInputDate(general.validUntil) : null, projectRef: general.projectRef || null, nric: general.nric || null, customerId: general.customerId || null, propertyType: general.propertyType || null, siteAddress: general.siteAddress || null, status },
    lead: { name: lead.name, phone: lead.phone, email: lead.email }, studio: studioDetails, members, items: lines, payments: scheduleRows, totalMinor: amountMinor, teamIds, signer: contract?.signer ?? null,   // (REG-632, contracts parity Q-09)
  }), [quote, general, status, lead, studioDetails, members, lines, scheduleRows, amountMinor, teamIds, contract])
  /* The pane's design: the quote's template, else the studio default, else the first published, else the built-in client design — one chain for the aside and the tablet drawer. */
  const clientPaneDesign = templateState.current?.design ?? templateState.picker.templates.find((t) => t.isDefault)?.design ?? templateState.picker.templates[0]?.design ?? FALLBACK_CLIENT_DESIGN
  /* (REG-538) The pane's view: the quote's own client view over the design, with the editor's Terms / Notes switches on top — Preview draws the same. */
  const clientPaneView = useMemo(() => ({ ...parseClientView(quote.clientViewJson, clientViewFromDesign(clientPaneDesign)), terms: textVisible.terms, notes: textVisible.notes }), [quote.clientViewJson, clientPaneDesign, textVisible])
  const sendReadiness = useMemo(() => readiness(clientData, clientPaneDesign, clientPaneView), [clientData, clientPaneDesign, clientPaneView])   /* (REG-626) Preview's own rules */
  /* (UX audit Q1 · Q2 · Q11) Send — every path through the quote's one Send (components/quotes/send/use-quote-send.tsx), Preview's too. */
  const quoteSend = useQuoteSend({
    quote: { id: quote.id, number: quote.number, leadId: lead.id, version }, status: status as QuoteStatus, lead: { name: lead.name, phone: lead.phone }, studioName: studio.name,
    approval: quoteApproval, canApprove, readiness: sendReadiness, flush: () => flushRef.current(),
    onShowIssue: (block) => selectTab(block.section === 'payments' ? 'payment' : block.section),
    onChange: (c) => { setStatus(c.status); stamp(c.updatedAt); setRecord((x) => ({ ...x, sentAt: x.sentAt ?? c.sentAt ?? null, clientSentAt: c.clientSentAt !== undefined ? c.clientSentAt ?? null : x.clientSentAt, ...(c.submittedAt ? { submittedBy: me?.id ?? null, submittedAt: c.submittedAt } : {}) })) },
    contractFrom: from ? withFrom(`/quotes/${quote.id}`, from) : `/quotes/${quote.id}`,
  })
  const clientDesign = templateState.current?.design ?? null
  const clientColumns = useMemo(() => (clientDesign ? clientColumnsOf(clientDesign) : null), [clientDesign])
  const updateTemplate = () => {
    setTemplateBusy(true)
    void run('update the template version', async () => {
      const r = await updateQuoteTemplateVersion(quote.id)
      setTemplateState((st) => (st.current ? { ...st, current: { ...st.current, pinned: r.version } } : st)); stamp(Date.now())
      /* (REG-579) The version moved; the new defaults land only when the quote says so. */
      const cur = templateState.current
      if (cur) setApplyTpl({ id: cur.id, name: cur.name, regroup: null })
    }, `Quote moved to v${templateState.current?.latest ?? ''}`).finally(() => setTemplateBusy(false))
  }
  const saveAsTemplate = (name: string, opts: { includeText: boolean; includeSections: boolean }) => {
    setTemplateBusy(true)
    void (async () => {
      try {
        await flushRef.current()
        const id = await saveQuoteAsTemplate(quote.id, name, opts)
        setSaveAsOpen(false)
        snackbar({ message: `${name.trim()} saved as a draft template`, actionLabel: 'Open', onAction: () => { router.push(`/templates/${id}?from=${encodeURIComponent(`/quotes/${quote.id}`)}&quote=${quote.id}`) } })
      } catch { fail('save the template') } finally { setTemplateBusy(false) }
    })()
  }
  /* (REG-465) Close returns where the editor was opened from — the Quotes tab, Tools › Quotes, a Qanvast-origin tab — the lead's tab when nothing says. */
  const backHref = from ?? `/leads/${lead.id}/quotes`
  const close = () => router.push(backHref)

  const tabs = sections.map((s) => ({ key: s.key, label: s.key === 'items' ? `Items (${itemCount})` : s.key === 'files' ? `Files (${fileCount})` : SECTION_LABELS[s.key] }))
  const titleOf = (k: SectionKey) => (k === 'items' ? `Items (${itemCount})` : k === 'files' ? `Files (${fileCount})` : SECTION_LABELS[k])
  const openOf = (k: SectionKey) => !(sections.find((s) => s.key === k)?.collapsed ?? true)

  const bodyOf = (k: SectionKey) => {
    if (k === 'general') return <GeneralInfo value={general} lead={lead} members={members} today={new Date(now)} onChange={changeGeneral} extra={<TemplateCard state={templateState} busy={templateBusy} onChange={() => setPickerOpen(true)} onEdit={editTemplate} onSaveAs={() => setSaveAsOpen(true)} />} />
    if (k === 'activity') return <ActivityBody events={activity} />
    return (
      <div className={styles.soon} role="status">
        <span className={styles.soonTitle}>{SECTION_LABELS[k]}</span>
        <span>Coming soon in OpenMaison 2.0</span>
      </div>
    )
  }
  // The status pill (1271:41470, first in the header's action row — REG-404, moved 2026-09-15): outlined "Draft ▾" → the
  // studio's lifecycle (quoteStatuses), the current one marked as the tab's status menu marks it (910:36673).
  const statusPill = (
    <span className={styles.anchor}>
      <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={statusOpen}
              iconEnd={<span className={styles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              onPress={() => setStatusOpen((o) => !o)}>
        {status}
      </Button>
      {/* (REG-728) A status list: the 240 width; "current" is the row's meta — the tab's mark (910:36673), so no Selected fill.
          (REG-590) "approvers only" on Approved while the studio asks for an approver. */}
      <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} sheetTitle="Status">
        {steps.map((s) => {
          /* (REG-590) Approved is an approver's; (UX audit Q3) the client's statuses wait for an approver's OK — the row says so. */
          const approverOnly = s === 'Approved' && quoteApproval === 'required' && !canApprove
          const waits = s !== status && !!statusBlock({ target: s, current: status, approval: quoteApproval, approver: canApprove })
          return (
            <DropdownItem key={s} role="menuitemradio" checked={s === status} selected={false} disabled={approverOnly || waits} onSelect={() => changeStatus(s)}
                          meta={s === status ? 'current' : approverOnly ? 'approvers only' : waits ? STATUS_BLOCK_META : undefined}>
              {s}
            </DropdownItem>
          )
        })}
      </Dropdown>
    </span>
  )

  const movable = sections.filter((s) => !isFixedSection(s.key))
  // The Items section's seed never changes for a mounted editor (its own state takes over from the first render).
  const [itemsSeed, setItemsSeed] = useState<ItemsSeed>(() => ({
    quoteId: quote.id, number: quote.number, items, priceBook, priceBookSections, bookFolders: { items: data.libraryFolders.bookItems, sections: data.libraryFolders.bookSections }, runsBook: data.runsBook, trades, tradeNotes: studioDetails.tradeNotes, brandColors: brand.colors, entities: studioDetails.entities.map((e, i) => ({ name: e.name, gstRegistered: i === 0 ? studio.gstRegistered : e.gstRegistered, retired: e.retired })), roundStep: rules.roundStep, studio, files, me,
    pricing: { additionalDiscountMode: quote.additionalDiscountMode === 'amount' ? 'amount' : 'pct', additionalDiscountValue: quote.additionalDiscountValue, gstEnabled: quote.gstEnabled, issuingEntity: quote.issuingEntity, discounts: parseDiscounts(quote.discountsJson) },
    view: quote.itemsView, density: quote.itemsDensity, columnsJson: quote.itemsColumns, labelsJson: quote.itemsLabels,
  }))
  const [paymentsSeed, setPaymentsSeed] = useState<PaymentsSeed>(() => {
    const a = scheduleAnchors({ estimatedStart: lead.estimatedStartDate, quoteCreated: quote.createdAt, propertyType: quote.propertyType ?? lead.propertyType })
    return { quoteId: quote.id, rows: payments, anchors: { start: a.start.getTime(), weeks: a.weeks }, splits: paymentSplits, folders: data.libraryFolders.payments }
  })
  const [filesSeed] = useState<FilesSeed>(() => ({ quoteId: quote.id, leadId: lead.id, files: quoteFiles, leadFiles: files, visible: quote.filesVisible }))
  const [termsSeed, setTermsSeed] = useState<TextSeed>(() => ({ quoteId: quote.id, kind: 'terms', html: quote.termsHtml ?? '', visible: quote.termsVisible, templates: textTemplates.filter((t) => t.kind === 'terms'), folders: data.libraryFolders.texts }))
  const [notesSeed, setNotesSeed] = useState<TextSeed>(() => ({ quoteId: quote.id, kind: 'notes', html: quote.notesHtml ?? '', visible: quote.notesVisible, templates: textTemplates.filter((t) => t.kind === 'notes'), folders: data.libraryFolders.texts }))
  // What a template's tokens and Write with AI resolve to — the quote's records (REG-403 / REG-420), live where the editor changes them.
  const tokens: TokenValues = useMemo(() => ({
    client: lead.name, studio: studio.name, studioPhone: studio.phone,
    member: members.find((m) => m.id === general.preparedBy)?.name ?? me?.name ?? '',
  }), [lead.name, studio.name, studio.phone, members, general.preparedBy, me])
  const textContext: TextContext = useMemo(() => {
    const counted = countedLines(flattenItems(lines))
    const works: string[] = []
    for (const l of counted) { const w = (l.section ?? l.category ?? 'Works').trim() || 'Works'; if (!works.some((x) => x.toLowerCase() === w.toLowerCase())) works.push(w) }
    return {
      studio: studio.name, client: lead.name, member: tokens.member, number: quote.number,
      propertyType: general.propertyType || null, siteAddress: general.siteAddress || null,
      validUntil: general.validUntil ? parseInputDate(general.validUntil) : null, createdAt: quote.createdAt,
      totalMinor: amountMinor, gstEnabled: gstOn, gstPct: counted[0]?.gstPct ?? studio.gstPct, works, itemCount: counted.length,
      schedule: toRows(scheduleRows), start: new Date(paymentsSeed.anchors.start), weeks: paymentsSeed.anchors.weeks,
    }
  }, [lines, studio.name, studio.gstPct, lead.name, tokens.member, quote.number, quote.createdAt, general.propertyType, general.siteAddress, general.validUntil, amountMinor, scheduleRows, paymentsSeed.anchors.start, paymentsSeed.anchors.weeks, gstOn])
  const [signatureSeed, setSignatureSeed] = useState<SignatureSeed>(() => ({
    quoteId: quote.id, required: quote.clientSignatureRequired, memberName: me?.name ?? '', studioName: studio.name, clientName: lead.name, nric: quote.nric,
    signature: me?.signatureKind === 'draw' || me?.signatureKind === 'type' ? { kind: me.signatureKind, name: me.signatureName ?? me.name, data: me.signatureData ?? null } : null,
  }))
  /* (UX audit Q10) On a revision the Items table tints what changed since the kept version — live, as the lines change. */
  const lineChangeMap = useMemo(() => lineChanges(data.prevLines, lines, version), [data.prevLines, lines, version])
  const stripExpanded = useStripExpanded()   // the Items bulk bar centres on the section column, not the viewport (quote-editor.module.css)

  /* (REG-518) The picker's selection lives here; the dialog footer acts on it. */
  const [pickedTpl, setPickedTpl] = useState<string | null>(null)
  const pickerSel = defaultPick(templateState.picker, pickedTpl, templateState.current?.id ?? null)

  return (
    <PageReveal skeleton={<EditorSkeleton />}>
      <div className={styles.page} data-testid="quote-editor" data-strip={stripExpanded ? 'expanded' : 'collapsed'}>
        <EditorHeader
          deleteBlock={canDeleteQuote({ id: me?.id ?? null, role: me?.role }, quote) ? null : DELETE_RULE}
          lead={lead} quoteId={quote.id} title={general.title} number={quote.number} version={version} status={status} siblings={siblings}
          savedLabel={savedLabel(updatedAt, clock)}
          canSend={quoteSend.canSend} sendKind={quoteSend.kind} sendHint={quoteSend.hint} statusSlot={statusPill}
          onSwitch={(id) => router.push(withFrom(`/quotes/${id}`, from))}
          onSend={quoteSend.send} onMenu={onMenu} onClose={close}
          clientViewOn={clientView} onClientView={() => setClientView((o) => !o)}
          contract={contract} contractHref={contract ? withFrom(`/contracts/${contract.id}`, from ? withFrom(`/quotes/${quote.id}`, from) : `/quotes/${quote.id}`) : undefined}
        />
        <EditorTabs items={tabs} active={active} onSelect={selectTab} className={styles.stickyTabs} />
        {/* (REG-579) Only a Draft is offered the newer version — a sent quote keeps the version it was sent with; its card still says "v1 · v2 published". */}
        {templateState.current && templateState.current.latest > templateState.current.pinned && !bannerKept && status === 'Draft' ? (
          <TemplateUpdateBanner current={templateState.current} busy={templateBusy} onUpdate={updateTemplate} onKeep={() => setBannerKept(true)} />
        ) : null}
        {/* (REG-624, parity Q-22) Waiting for approval — or sent back with a note, until the next send. */}
        <ApprovalBar canApprove={canApprove} now={clock} busy={approvalBusy} onApprove={approve} onRequestChanges={() => setChangesOpen(true)} onDismiss={() => setChangesDismissed(true)}
                     waiting={status === 'Sent for Approval' ? { by: nameOf(record.submittedBy), at: record.submittedAt ?? record.sentAt } : null}
                     changes={status === 'Draft' && record.reviewNote && record.reviewedAt && (!record.submittedAt || record.reviewedAt > record.submittedAt) && !changesDismissed ? { by: nameOf(record.reviewedBy), at: record.reviewedAt, note: record.reviewNote } : null} />
        {/* (REG-624, parity Q-04) No hard lock: a quote the client has says so and offers Revise. */}
        {status === 'Sent to Client' || status === 'Confirmed' || status === 'Signed' ? (
          <SentBanner status={status} version={version} now={clock} confirmedBy={record.confirmedBy} onRevise={() => { void flushRef.current(); setReviseOpen(true) }}
                      onMove={offersQuoteSent(lead.stage, status) ? () => { void flushRef.current(); router.push(moveStageHref(lead.id, 'quote-sent', { quote: quote.id })) } : null}
                      validityEnded={(() => { const d = general.validUntil ? parseInputDate(general.validUntil) : null; return d && validityPassed({ status, validUntil: d }, clock) ? displayDate(d) : null })()}
                      at={status === 'Sent to Client' ? record.clientSentAt ?? record.sentAt : status === 'Confirmed' ? record.confirmedAt : null} />
        ) : null}
        <NoteDialog open={changesOpen} title="Request changes" label="What should change?" help={`Goes back to ${nameOf(record.submittedBy) ?? 'whoever sent it'} at the top of the quote; the quote returns to Draft.`} action="Send back"
                    busy={approvalBusy} required maxLength={300} onClose={() => setChangesOpen(false)} onSubmit={requestChanges} />
        <div className={styles.body}>
          <div className={styles.main}>
            <SectionCard id="section-general" title={titleOf('general')} open={openOf('general')} onToggle={() => toggle('general')}>
              {bodyOf('general')}
            </SectionCard>
            <ItemsCard key={`items-${seedNonce}`} seed={itemsSeed} open={openOf('items')} onToggle={() => toggle('items')} exportTick={exportTick}
                       onSaved={(t, _amount) => stamp(t)} onOpenAi={() => setAiOpen(true)} onCount={setItemCount}
                       onTotal={setAmountMinor} onLines={setLines} onPricing={(p) => setGstOn(p.gstEnabled)} clientColumns={clientColumns} forceView={forceView} bookTick={bookTick} propertyType={general.propertyType || null}
                       commentCounts={commentCounts} onOpenComments={(itemId) => setCommentsView({ open: true, focus: itemId })} changes={lineChangeMap} />
            <Reorder.Group as="div" axis="y" values={movable.map((s) => s.key)} onReorder={reorder} className={styles.group}>
              {movable.map((s) => (
                <MovableSection key={s.key} section={s} title={titleOf(s.key)} onToggle={() => toggle(s.key)}
                                onDrop={() => persistSections(sectionsRef.current)}
                                render={s.key === 'payment' ? (onHandle) => (
                                  <PaymentsCard key={`pay-${seedNonce}`} seed={paymentsSeed} open={!s.collapsed} onToggle={() => toggle('payment')} onHandlePointerDown={onHandle}
                                                totalMinor={amountMinor} today={new Date(now)} onSaved={stamp} onRows={setScheduleRows} locked={paymentsLocked} />
                                ) : s.key === 'files' ? (onHandle) => (
                                  <FilesCard seed={filesSeed} open={!s.collapsed} onToggle={() => toggle('files')} onHandlePointerDown={onHandle} onSaved={stamp} onCount={setFileCount} />
                                ) : s.key === 'terms' || s.key === 'notes' ? (onHandle) => (
                                  <TextCard key={`${s.key}-${seedNonce}`} seed={s.key === 'terms' ? termsSeed : notesSeed} open={!s.collapsed} onToggle={() => toggle(s.key)} onHandlePointerDown={onHandle} onSaved={stamp} tokens={tokens} context={textContext}
                                            onVisible={(v) => setTextVisible((x) => ({ ...x, [s.key]: v }))} />
                                ) : s.key === 'signature' ? (onHandle) => (
                                  <SignatureCard key={`sig-${seedNonce}`} seed={signatureSeed} open={!s.collapsed} onToggle={() => toggle('signature')} onHandlePointerDown={onHandle} onSaved={stamp} nric={general.nric} />
                                ) : undefined}>
                  {bodyOf(s.key)}
                </MovableSection>
              ))}
            </Reorder.Group>
            <SectionCard id="section-activity" title={titleOf('activity')} open={openOf('activity')} onToggle={() => toggle('activity')}>
              {bodyOf('activity')}
            </SectionCard>
          </div>
          {clientView && !tabletDown ? (
            <aside className={styles.clientPane} aria-label="Client view">
              <ClientViewPane data={clientData} design={clientPaneDesign} brand={brand} view={clientPaneView}
                              templateName={templateState.current?.name ?? 'Studio default'} version={templateState.current?.pinned ?? null} onOpenPreview={() => onMenu('preview')} onClose={() => setClientView(false)} />
            </aside>
          ) : null}
          <CreateStrip onOpen={(link) => { if (link === 'ai') setAiOpen(true); else if (link === 'templates') setPickerOpen(true); else if (link === 'items') { if (!openOf('items')) toggle('items'); setBookTick((t) => t + 1); } else comingSoon() }} />
        </div>
        {tabletDown ? (
          <Drawer open={clientView} onClose={() => setClientView(false)} title="Client view" label="Client view" width={420}>
            <ClientViewPane bare data={clientData} design={clientPaneDesign} brand={brand} view={clientPaneView}
                            templateName={templateState.current?.name ?? 'Studio default'} version={templateState.current?.pinned ?? null} onOpenPreview={() => onMenu('preview')} onClose={() => setClientView(false)} />
          </Drawer>
        ) : null}
        <Dialog open={pickerOpen} onClose={() => { setPickerOpen(false); setPickedTpl(null) }} title="Choose a template" size="modal" width={1200} portal
                subtitle="The quote keeps its lines; the template decides how they print and what the client sees."
                footer={<><Button variant="secondary" appearance="outlined" onPress={() => { setPickerOpen(false); setPickedTpl(null) }}>Cancel</Button><Button onPress={() => { if (pickerSel) pickTemplate(pickerSel) }} isDisabled={!pickerSel || pickerSel === (templateState.current?.id ?? null)}>{pickerSel && pickerSel === templateState.current?.id ? 'On this quote' : 'Use this template'}</Button></>}>
          <TemplatePicker data={templateState.picker} picked={pickerSel} onPick={setPickedTpl} currentId={templateState.current?.id ?? null} now={now} onUse={pickTemplate} />
        </Dialog>
        <ConfirmDialog open={regroup !== null} title="Regroup the items the way the template prints?" tone="primary" confirmLabel={regroup ? `Group by ${VIEW_WORD[regroup.view]}` : 'Regroup'} cancelLabel="Keep my sections"
                       message={regroup ? `${regroup.label}. Your lines stay as they are; only View by changes, and you can change it back.` : ''}
                       onCancel={() => setRegroup(null)} onConfirm={() => { if (regroup) doRegroup(regroup.view) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (sweep S2 #30) the FAB's own press toggles it */}
        <SaveAsTemplateDialog open={saveAsOpen} defaultName={`${general.title || quote.number} template`} busy={templateBusy} onClose={() => setSaveAsOpen(false)} onSave={saveAsTemplate} />
        {/* (REG-538) Change template on a Draft: apply its defaults? — then the regroup question, if any. */}
        <ConfirmDialog open={applyTpl !== null} title={applyTpl ? `Apply ${applyTpl.name}’s defaults to this quote?` : ''} tone="primary" confirmLabel="Apply defaults" cancelLabel="Keep mine"
                       message="Its payment schedule, validity, GST and signature settings, Terms and Notes templates and working columns replace what this quote has. Your lines stay as they are."
                       onCancel={closeApply} onConfirm={doApplyDefaults} />
        <RenameQuoteDialog open={renameOpen} title={general.title} onClose={() => setRenameOpen(false)} onSave={(title) => changeGeneral({ title })} />
        {/* (REG-565) Version History and the Revise confirm. */}
        <VersionHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} current={{ version, status, amountMinor, updatedAt }} versions={versions} members={members} changes={changes}
                              canRevise={canRevise} reviseHint={reviseHint} onRevise={() => setReviseOpen(true)} onOpen={(v) => { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview?version=${v}`, `/quotes/${quote.id}`)) }}
                              canBringBack={status === 'Draft'} onBringBack={(v) => setBringBack(v)} />
        {/* (REG-625, parity Q-25) Bring an older version back into the Draft — its lines, schedule, pricing and texts; the page reloads on them. */}
        <ConfirmDialog open={bringBack !== null} title={`Bring back version ${bringBack ?? ''}?`} tone="primary" confirmLabel={`Bring back version ${bringBack ?? ''}`} cancelLabel="Not now"
                       message={`The draft’s lines, payment schedule, discounts, texts and title are replaced with version ${bringBack ?? ''}’s. Version ${bringBack ?? ''} stays in the history as it is; the draft’s own changes are not kept.`}
                       onCancel={() => setBringBack(null)} onConfirm={() => {
                         const v = bringBack; setBringBack(null); if (v === null) return
                         void run('bring the version back', async () => { await flushRef.current(); await restoreQuoteVersion(quote.id, v); const u = new URL(window.location.href); u.searchParams.set('restored', String(v)); window.location.assign(u.toString()) })
                       }} />
        {/* (UX audit Q10) Revise asks what the client asked for — optional, kept with the version it answers (Version History, the kept preview). */}
        <ReviseDialog open={reviseOpen} version={version} number={quote.number}
                      message={`Version ${version} is kept as it stands — ${status}, ${money2(amountMinor)} — and opens read-only from Version History. The quote becomes a Draft again under ${quote.number} with the same lines, ready for the changes.`}
                      onClose={() => setReviseOpen(false)} onRevise={doRevise} />
        <DeleteQuotesDialog open={deleteOpen} count={1} onNo={() => setDeleteOpen(false)}
                            onYes={() => { setDeleteOpen(false); void run('delete the quote', async () => { const r = await deleteQuotes([quote.id]); if (!r.deleted) { snackbar({ message: DELETE_RULE }); return } snackbar({ message: 'Quote deleted — find it under Deleted Quotes' }); router.push(backHref) }) }} />
        {quoteSend.dialogs}
        {statusChange.dialog}
        {/* (REG-627, parity Q-30) Comments on the lines — the Tasks comments panel for a line. */}
        <LineCommentsDrawer open={commentsView.open} focus={commentsView.focus} lines={lines.filter((l) => l.kind === 'item').map((l) => ({ id: l.id, name: l.name }))} comments={comments} me={me} members={members} now={clock}
                            onFocus={(focus) => setCommentsView((v) => ({ ...v, focus }))} onClose={() => setCommentsView({ open: false, focus: null })}
                            onAdd={(itemId, body) => { void run('add the comment', async () => { const row = await addLineComment(quote.id, itemId, body); setComments((c) => [...c, row]); setClock(Date.now()) }) }}
                            onEdit={(id, body) => { const was = comments.find((x) => x.id === id); setComments((c) => c.map((x) => (x.id === id ? { ...x, body, updatedAt: new Date() } : x))); void run('edit the comment', () => editLineComment(id, body)).then((ok) => { if (!ok && was) setComments((c) => c.map((x) => (x.id === id ? was : x))) }) }}   /* (sweep S1 #10) a refused edit puts the words back */
                            onDelete={(id) => { const before = comments; setComments((c) => c.filter((x) => x.id !== id)); void run('delete the comment', () => deleteLineComment(id), 'Comment deleted').then((ok) => { if (!ok) setComments(before) }) }} />
        <span ref={fabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}

/**
 * One of the five reorderable sections: the drag starts from the card's handle only (dragListener off). A section that owns
 * its card (the Payment Schedule's toolbar lives in the section-top) renders through `render`, receiving the handle's start.
 */
function MovableSection({ section, title, onToggle, onDrop, render, children }: {
  section: QuoteSectionState
  title: string
  onToggle: () => void
  onDrop: () => void
  render?: (onHandlePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void) => React.ReactNode
  children: React.ReactNode
}) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item as="div" value={section.key} dragListener={false} dragControls={controls} className={styles.item}
                  data-dragging={dragging || undefined}
                  onDragStart={() => setDragging(true)} onDragEnd={() => { setDragging(false); onDrop() }}>
      {render ? render((e) => controls.start(e)) : (
        <SectionCard id={`section-${section.key}`} title={title} open={!section.collapsed} onToggle={onToggle}
                     onHandlePointerDown={(e) => controls.start(e)}>
          {children}
        </SectionCard>
      )}
    </Reorder.Item>
  )
}
