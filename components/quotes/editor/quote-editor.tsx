'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { copyText } from '@/lib/clipboard'
import { Reorder, useDragControls } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import { GHOST_MIN_MS, PageReveal } from '@/components/shell/page-reveal'
import { MaisonFab } from '@/components/shell/maison-fab'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
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
import { docDataFromRecords, quoteGstRate, type DocData } from '@/lib/templates/data'
import { clientColumnsOf, viewForTemplate } from '@/lib/templates/picker'
import { updateItemsPrefs } from '@/app/quotes/items-actions'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import type { ItemsView } from '@/lib/quotes/items-model'
import { approveQuote, requestQuoteChanges, restoreQuoteVersion, reviseQuote, saveQuoteGeneral, saveQuoteSections, undoReviseQuote, type GeneralPatch } from '@/app/quotes/actions'
import { ApprovalBar, SentBanner } from './quote-bars'
import { LineCommentsDrawer } from './line-comments'
import { addLineComment, deleteLineComment, editLineComment } from '@/app/quotes/comment-actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) an action's refusal into the caller's own failure line
import type { QuoteItemComment } from '@/lib/db/schema'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { readiness } from '@/lib/templates/readiness'
import { canDeleteQuote, DELETE_RULE, offersQuoteSent, STATUS_BLOCK_META, statusBlock, validityPassed } from '@/lib/quotes/policy'
import { confirmKeyOf, confirmLink } from '@/lib/quotes/confirm'
import { useQuoteSend } from '@/components/quotes/send/use-quote-send'
import { useViewLink } from '@/components/quotes/send/view-link'
import { useQuoteStatus } from '@/components/leads/quotes/use-quote-status'
import { moveStageHref } from '@/lib/leads/move-link'
import { lineChanges } from './items/line-change'
import { ReviseDialog } from './revise-dialog'
import { VersionHistoryDrawer } from './version-history'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import { duration } from '@/lib/motion'
import { quoteStatuses, viewedSince, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteEditorData } from '@/lib/quotes/editor'
import type { QuoteItem, QuotePayment } from '@/lib/db/schema'
import { SECTION_LABELS, isFixedSection, parseSections, pinFixed, type QuoteSectionState, type SectionKey } from '@/lib/quotes/sections'
import { EditorHeader, type HeaderMenuAction } from './editor-header'
import { EditorTabs } from './editor-tabs'
import { CreateStrip, useStripExpanded } from './create-strip'
import { useQuoteMaison } from './use-quote-maison'
import { useTextMaison } from './use-text-maison'
import type { WritingCommand } from '@/components/writing/writing-help'
import type { WritingAction } from '@/lib/writing/propose'
import { SectionCard } from './section-card'
import { GeneralInfo, type GeneralState } from './general-info'
import { ItemsCard, type ItemsSeed } from './items/items-section'
import { PaymentsCard, type PaymentsSeed } from './payments/payments-section'
import { FilesCard, type FilesSeed } from './files/files-section'
import { TextCard, type TextSeed } from './text/text-section'
import { SignatureCard, type SignatureSeed } from './signature/signature-section'
import { ActivityBody } from './activity/activity-section'
import { countedLines, flattenItems, money2, parseDiscounts } from '@/lib/quotes/math'
import { changeSummary, snapshotState, summaryText, versionState } from '@/lib/quotes/diff'   // (S44F — NB-02 (b))
import { LIVE_STUDIO_TOKENS, quoteTokenValues, type TextContext, type TextKind, type TokenValues } from '@/lib/quotes/text'
import { toRows } from '@/lib/quotes/payments'
import { scheduleAnchors } from '@/lib/quotes/payments'
import { EditorSkeleton } from './editor-skeleton'
import { VariationContext } from './items/variation-context'
import { VariationBar, VariationReasonField } from './variation-bar'
import { isApprovedVariation, signedMoney, variationDeleteBlock, variationLabel } from '@/lib/projects/money'
import { MARK_RULE, REVISE_VO_RULE } from '@/lib/projects/invoices-model'
import { markVariationApproved, undoVariationApproval } from '@/app/projects/money-actions'
import { MarkApprovedDialog } from '@/components/projects/money/money-dialogs'
import { memberSignatureOf } from '@/lib/quotes/signature'
import { movedSinceSigning } from '@/lib/quotes/contract-value'
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
export function QuoteEditor({ data, from, section, apply, restored, drafted = false, send: sendOnArrival }: { data: QuoteEditorData; /** (simplify round 2, R2-A) `?send=confirm` — Money's *Send VO-n*: Send ▾ › Send for confirmation opens on arrival */ send?: string; /** (REG-625) back from Bring back: the version that returned, said once */ restored?: number; /** (fix-C, C-13) a variation order drafted from a pick on Choices — its confirmation said here, once */ drafted?: boolean; from?: string; /** (REG-490) the preview's Open links land on a section */ section?: string; /** (REG-579) the template whose new version this quote just moved to — the "Apply defaults · Keep mine" question opens on arrival */ apply?: string }) {
  const { contract, quote, lead, siblings, members, quoteApproval, items, priceBook, priceBookSections, trades, teamIds, versions, studio, files, me, payments, quoteFiles, textTemplates, paymentSplits, activity, now, brand, studioDetails, rules, canApprove, changes } = data
  const paymentsLocked = rules.paymentLock && !(me?.role === 'Owner' || me?.role === 'Admin')   /* (REG-589) */
  const router = useRouter()
  const xrayLock = usePlanLock('quote_xray')   // (pending modules S19 — 1.0's plan gating) Quote X-Ray is Pro
  /* (pending modules S19 — 1.0's plan gating: the template editor is Pro — making templates and picking one for a quote) a press on a Free
     studio opens the lock card; the quote keeps printing as it does (its template, or the studio's default) — nothing sent changes */
  const tplLock = usePlanLock('template_editor')
  const openPicker = () => { if (tplLock.locked) { tplLock.open(); return } setPickerOpen(true) }
  const openSaveAs = () => { if (tplLock.locked) { tplLock.open(); return } setSaveAsOpen(true) }
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
  /* (fix-C, C-13) Drafted from a pick on Choices: the confirmation arrives with the order (a snackbar raised before the move died with the tab) */
  useEffect(() => {
    if (!drafted) return
    snackbar({ message: `${data.quote.number} drafted from the pick — check its line, then send it for approval` })
    const u = new URL(window.location.href); u.searchParams.delete('drafted'); router.replace(`${u.pathname}${u.search}`, { scroll: false })
  }, [drafted, data.quote.number, router, snackbar])
  useEffect(() => { if (!apply) return; const u = new URL(window.location.href); if (!u.searchParams.has('apply')) return; u.searchParams.delete('apply'); router.replace(`${u.pathname}${u.search}`, { scroll: false }) }, [apply, router])
  const [seedNonce, setSeedNonce] = useState(0)   /* bumps when defaults land: the seeded cards remount on their new seeds */
  const [textVisible, setTextVisible] = useState({ terms: quote.termsVisible, notes: quote.notesVisible })   /* the two "Show in client view" switches, for the live pane */
  /* (pending modules S29) the Terms and Notes as they are typed (Maison AI's writing suggestions read them) and the sheet's way into each one's
     writing help */
  const [texts, setTexts] = useState<Record<TextKind, string>>({ terms: quote.termsHtml ?? '', notes: quote.notesHtml ?? '' })
  const [writeCmd, setWriteCmd] = useState<Record<TextKind, WritingCommand | null>>({ terms: null, notes: null })
  const tabletDown = useMediaQuery(TABLET_DOWN)

  /* ── state ── */
  const [status, setStatus] = useState(quote.status)
  /* (REG-624, parity Q-22 · Q-04) The approval on the record — who sent it, the approver's last note — and when the client got it. */
  const [record, setRecord] = useState(() => ({
    submittedBy: quote.submittedBy, submittedAt: quote.submittedAt?.getTime() ?? null, sentAt: quote.sentAt?.getTime() ?? null,
    reviewNote: quote.reviewNote, reviewedBy: quote.reviewedBy, reviewedAt: quote.reviewedAt?.getTime() ?? null,
    clientSentAt: quote.clientSentAt?.getTime() ?? null, confirmedAt: quote.confirmedAt?.getTime() ?? null, confirmedBy: quote.confirmedBy,
    confirmedVia: quote.confirmedVia, confirmedMarkedBy: quote.confirmedMarkedBy,   // (S44F — NB-04) marked by hand, by whom
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
    remarks: quote.remarks ?? '',   // (S44T — row 321)
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
  /* (pending modules S04) Maison AI's hints, by rule from the lines on screen: a row takes the grid to its line; the markup opens Set a value */
  const [itemsCommand, setItemsCommand] = useState<{ kind: 'focus' | 'setMarkup' | 'match'; ids: string[]; n: number } | null>(null)
  const [scheduleRows, setScheduleRows] = useState<QuotePayment[]>(payments)
  /* (S44F — NB-02 (b)) the quote's own pricing as the Items card holds it — Version History's "what changed" reads the live quote */
  const [livePricing, setLivePricing] = useState(() => ({ additionalDiscountMode: quote.additionalDiscountMode, additionalDiscountValue: quote.additionalDiscountValue, gstEnabled: quote.gstEnabled, discounts: parseDiscounts(quote.discountsJson) }))

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
      const r = await orThrow(saveQuoteGeneral(quote.id, patch))
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
    if (patch.remarks !== undefined) out.remarks = patch.remarks   // (S44T — row 321)
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
  /* (REG-1066) a variation order is approved on its link, never signed — its pill has no Signed */
  const steps = quoteStatuses(quoteApproval).filter((s) => !(data.variation && s === 'Signed'))
  /* (REG-624, parity Q-22) The approval bar's two answers. */
  const approve = () => {
    setApprovalBusy(true)
    void run('approve the quote', async () => { await flushRef.current(); const r = await approveQuote(quote.id); if ('error' in r) return r; setStatus(r.status); stamp(r.updatedAt) },   /* (S44Q — row 334) a refusal says its rule */ record.submittedBy && record.submittedBy !== me?.id ? `Quote approved — ${nameOf(record.submittedBy) ?? 'the sender'} can send it to the client` : 'Quote approved').finally(() => setApprovalBusy(false))
  }
  const requestChanges = (note: string) => {
    setChangesOpen(false)
    setApprovalBusy(true)
    void run('send the quote back', async () => {
      await flushRef.current()
      const r = await requestQuoteChanges(quote.id, note)
      if ('error' in r) return r   // (S44Q — row 334)
      setStatus(r.status); stamp(r.updatedAt)
      setRecord((x) => ({ ...x, reviewNote: note, reviewedBy: me?.id ?? null, reviewedAt: r.updatedAt })); setChangesDismissed(false)
    }, `Sent back to ${nameOf(record.submittedBy) ?? 'the sender'} with your note`).finally(() => setApprovalBusy(false))
  }
  /* (UX audit Q3) The pill's statuses go through the house status change: Sent for Approval tells the approvers, the client's statuses ask
     first, every mark answers with Undo (components/leads/quotes/use-quote-status.tsx). */
  const statusChange = useQuoteStatus(({ status: s, undo, undone }) => {
    setStatus(s); stamp(Date.now())
    if (undone) setRecord((x) => ({ ...x, sentAt: undo.sentAt, clientSentAt: undo.clientSentAt, submittedAt: undo.submittedAt, submittedBy: undo.submittedBy, confirmedAt: undo.confirmedAt, confirmedBy: undo.confirmedBy, confirmedVia: undo.confirmedVia ?? x.confirmedVia, confirmedMarkedBy: undo.confirmedMarkedBy ?? (undo.confirmedVia !== undefined ? null : x.confirmedMarkedBy) }))
    else setRecord((x) => ({ ...x, sentAt: x.sentAt ?? Date.now(), ...(s === 'Sent for Approval' ? { submittedBy: me?.id ?? null, submittedAt: Date.now() } : {}), ...(s === 'Sent to Client' || s === 'Confirmed' || s === 'Signed' ? { clientSentAt: x.clientSentAt ?? Date.now() } : {}), ...(s === 'Confirmed' && !x.confirmedAt ? { confirmedAt: Date.now(), confirmedVia: 'marked', confirmedMarkedBy: me?.id ?? null } : {}) }))   // (S44F — NB-04) a mark is the studio's
  })
  const changeStatus = (s: QuoteStatus) => { setStatusOpen(false); statusChange.change({ id: quote.id, number: quote.number, status }, s) }
  /* (REG-1066, F-07) Mark as approved by the client, from the pill — the Money tab's own dialog and action: when and how the client approved
     it, the contract moves and the unsent invoices follow; one sentence with Undo. Written after the editor's last change has saved. */
  const [marking, setMarking] = useState(false)
  const [markBusy, setMarkBusy] = useState(false)
  const markApproved = (o: { on: number; via: string }) => {
    setMarkBusy(true)
    void (async () => {
      try {
        await flushRef.current()
        const r = await markVariationApproved(quote.id, o)
        if ('error' in r) { snackbar({ message: couldnt(`mark ${quote.number} approved`, refusalOf(r.error)) }); return }
        setMarking(false); setStatus('Confirmed'); stamp(Date.now())
        setRecord((x) => ({ ...x, sentAt: x.sentAt ?? o.on, clientSentAt: x.clientSentAt ?? o.on, confirmedAt: o.on }))
        snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => {
          void run('undo the approval', async () => {
            const u = await undoVariationApproval(r.undo); if ('error' in u) return u
            setStatus(r.undo.status as QuoteStatus); stamp(Date.now())
            setRecord((x) => ({ ...x, sentAt: r.undo.sentAt, clientSentAt: r.undo.clientSentAt, confirmedAt: r.undo.confirmedAt }))
          }, `${quote.number} is no longer approved`)
        } })
      } catch { snackbar({ message: couldnt(`mark ${quote.number} approved`) }) } finally { setMarkBusy(false) }
    })()
  }
  /* Preview, Download as PDF and Print open the quote through its template (REG-490); Save as Template makes a draft template
     (REG-489); Rename, Duplicate and Edit, Export and Delete are live (REG-538); Version History and Comments still answer coming soon (owner 2026-09-11). */
  const onMenu = (action: HeaderMenuAction) => {
    if (action === 'preview') { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview`, from)); return }
    if (action === 'pdf' || action === 'print') { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview?print=1`, from)); return }
    if (action === 'template') { openSaveAs(); return }
    if (action === 'contract') { quoteSend.openContract(); return }   /* (REG-534 → REG-538) the contract template picker first; the contract reads this quote */
    if (action === 'viewLink') { viewLinkUi.open(); return }   /* (pending modules S02) */
    if (action === 'confirmLink') { const open = status === 'Approved' || status === 'Sent to Client' || status === 'Confirmed' || status === 'Signed'; void copyText(confirmLink(confirmKeyOf(quote))).then(() => snackbar({ message: open ? 'Confirmation link copied' : 'Confirmation link copied — it opens for the client once the quote is sent' }), () => snackbar({ message: 'Couldn’t copy the link — please try again' })); return }   /* (REG-587; REG-626: the link confirms only a sent quote) */
    if (action === 'xray') { if (xrayLock.locked) { xrayLock.open(); return } void flushRef.current(); router.push(`/quote-x-ray?lead=${lead.id}&quote=${quote.id}&from=${encodeURIComponent(withFrom(`/quotes/${quote.id}`, from))}`); return }   /* (REG-529) Quote X-Ray on this quote; (REG-639) the editor keeps its own origin for the way back */
    if (action === 'rename') { setRenameOpen(true); return }
    if (action === 'duplicate') { void flushRef.current(); void run('duplicate the quote', async () => { const id = await duplicateQuote(quote.id); router.push(withFrom(`/quotes/${id}`, from)) }, 'Quote duplicated — this is the copy'); return }
    if (action === 'delete') { if (deleteWhy) { snackbar({ message: deleteWhy }); return } setDeleteOpen(true); return }   /* (REG-625, parity Q-28) */
    if (action === 'export') { if (!openOf('items')) toggle('items'); setExportTick((t) => t + 1); return }   /* the Items export (REG-478) */
    if (action === 'history') { void flushRef.current(); setHistoryOpen(true); return }   /* (REG-565) */
    if (action === 'revise') { void flushRef.current(); if (!canRevise) snackbar({ message: reviseHint }); else if (voReviseBlock) snackbar({ message: couldnt(`revise ${quote.number}`, voReviseBlock) }); else setReviseOpen(true); return }
    if (action === 'comments') { setCommentsView({ open: true, focus: null }); return }   /* (REG-627, parity Q-30) every line's thread */
    comingSoon()
  }
  /* (REG-565) Revise is for a quote the client has seen (or the studio approved): a Draft never sent is simply edited. */
  const canRevise = status !== 'Draft' || !!quote.sentAt
  const reviseHint = 'A draft that was never sent is edited, not revised — Revise once it has gone out.'
  /* (fix-D, D-01 — REG-1066) An approved variation order's Revise takes the client's approval back and moves the contract: an Owner's or an
     Admin's, never on a completed project (the server's rule, said here before the dialog opens) */
  const voApproved = !!data.variation && isApprovedVariation(status)
  /* (parity map, MI-104) an approved variation order stays on the contract — its Delete reads the rule, as Money's VO row does */
  const deleteWhy = (data.variation ? variationDeleteBlock(status) : null) ?? (canDeleteQuote({ id: me?.id ?? null, role: me?.role }, quote) ? null : DELETE_RULE)
  const voReviseBlock = voApproved && data.variation ? data.variation.locked ?? (data.variation.marks ? null : REVISE_VO_RULE) : null
  const clientFirst = lead.name.trim().split(/\s+/)[0] ?? lead.name
  const doRevise = (note: string) => {
    setReviseOpen(false)
    const was = { version, status, record }
    void run('start the new version', async () => {
      await flushRef.current()
      const r = await reviseQuote(quote.id, note || undefined)   /* (UX audit Q10) the client's request, kept with the version it answers */
      if ('error' in r) return r
      setVersion(r.version); setStatus('Draft'); stamp(r.updatedAt); setHistoryOpen(false)
      setRecord({ submittedBy: null, submittedAt: null, sentAt: null, reviewNote: null, reviewedBy: null, reviewedAt: null, clientSentAt: null, confirmedAt: null, confirmedBy: null, confirmedVia: null, confirmedMarkedBy: null })   // (REG-624) the new version starts clean
      router.refresh()
      const moved = r.contract
      snackbar(moved
        ? { message: `Version ${r.version} started — ${quote.number}’s approval no longer counts: the contract is ${money2(moved.minor)} until ${clientFirst} approves version ${r.version}`, actionLabel: 'Undo', onAction: () => {
            void run('undo the new version', async () => {
              const u = await undoReviseQuote(moved.undo); if ('error' in u) return u
              setVersion(was.version); setStatus(was.status); setRecord(was.record); stamp(Date.now()); router.refresh()
            }, `Version ${was.version} is back — ${quote.number} is approved by the client again`)
          } }
        : { message: `Version ${version + 1} started — version ${version} is kept in Version History` })
    })
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
      const r = await orThrow(applyTemplateDefaults(quote.id, tpl.id))
      setGeneral((g) => ({ ...g, validUntil: r.validUntil ? inputDate(new Date(r.validUntil)) : '' }))
      setItemsSeed((sd) => ({ ...sd, items: r.items, pricing: { ...sd.pricing, gstEnabled: r.gstEnabled }, columnsJson: r.itemsColumns, view: r.itemsView as ItemsSeed['view'] }))
      setPaymentsSeed((sd) => ({ ...sd, rows: r.payments }))
      setTermsSeed((sd) => ({ ...sd, html: r.termsHtml ?? '' })); setNotesSeed((sd) => ({ ...sd, html: r.notesHtml ?? '' }))
      setTexts({ terms: r.termsHtml ?? '', notes: r.notesHtml ?? '' })   // (pending modules S29)
      setSignatureSeed((sd) => ({ ...sd, required: r.signatureRequired }))
      setSeedNonce((n) => n + 1); stamp(r.updatedAt)
    }, `${tpl.name}’s defaults applied`).finally(() => setTemplateBusy(false))
  }
  const doRegroup = (view: ItemsView) => {
    setRegroup(null)
    void run('regroup the items', async () => { await orThrow(updateItemsPrefs(quote.id, { itemsView: view })); setForceView({ key: view, nonce: Date.now() }) }, `Items grouped by ${VIEW_WORD[view]}`)
  }
  /* (REG-496) Edit template opens the template editor in this tab with this quote as its origin: Back returns here, Preview with is this quote, Publish can update it. */
  const editTemplate = () => {
    if (tplLock.locked) { tplLock.open(); return }
    const cur = templateState.current
    if (!cur) return
    void flushRef.current()
    const here = from ? withFrom(`/quotes/${quote.id}`, from) : `/quotes/${quote.id}`
    router.push(`/templates/${cur.id}?from=${encodeURIComponent(here)}&quote=${quote.id}`)
  }
  /* (REG-497) The client's pages from the editor's own state: the lines as the table holds them, General Info as typed, the schedule as it stands. */
  const clientData: DocData = useMemo(() => docDataFromRecords({
    quote: { ...quote, title: general.title, preparedBy: general.preparedBy, validUntil: general.validUntil ? parseInputDate(general.validUntil) : null, projectRef: general.projectRef || null, nric: general.nric || null, customerId: general.customerId || null, propertyType: general.propertyType || null, siteAddress: general.siteAddress || null, status,
      client2Name: general.client2Name.trim() || null, client2Nric: general.client2Nric.trim() || null },   // (S44Q — triage §12.8) the pane names the second client as typed, not after a reload
    lead: { name: lead.name, phone: lead.phone, email: lead.email, companyName: lead.companyName, companyUen: lead.companyUen, propertyType: lead.propertyType /* (S42 B-05) */ }, studio: studioDetails, members, items: lines, payments: scheduleRows, totalMinor: amountMinor, teamIds, signer: contract?.signer ?? null, variationOf: data.variation?.contractNumber ?? null, variationPaper: data.variation?.paper ?? null,   // (REG-632, contracts parity Q-09); (fix-D, D-08)
    remarks: general.remarks,   // (S44T — row 321) the pane prints the Remarks as typed
  }), [quote, general, status, lead, studioDetails, members, lines, scheduleRows, amountMinor, teamIds, contract, data.variation?.contractNumber, data.variation?.paper])
  /* The pane's design: the quote's template, else the studio default, else the first published, else the built-in client design — one chain for the aside and the tablet drawer. */
  const clientPaneDesign = templateState.current?.design ?? templateState.picker.templates.find((t) => t.isDefault)?.design ?? templateState.picker.templates[0]?.design ?? FALLBACK_CLIENT_DESIGN
  /* (REG-538) The pane's view: the quote's own client view over the design, with the editor's Terms / Notes switches on top — Preview draws the same. */
  const clientPaneView = useMemo(() => ({ ...parseClientView(quote.clientViewJson, clientViewFromDesign(clientPaneDesign)), terms: textVisible.terms, notes: textVisible.notes }), [quote.clientViewJson, clientPaneDesign, textVisible])
  const sendReadiness = useMemo(() => readiness(clientData, clientPaneDesign, clientPaneView), [clientData, clientPaneDesign, clientPaneView])   /* (REG-626) Preview's own rules */
  /* (Dane UAT 6.11, g-sections-trade) The template the quote prints through (its own, else the studio default — Preview's chain) and how it
     files the lines: a label view means the quote's own sections never print, and the Items card says so. */
  const printView = viewForTemplate(clientPaneDesign)
  const printTemplate = templateState.current?.name ?? templateState.picker.templates.find((t) => t.isDefault)?.name ?? null
  const printsBy = printView !== 'none' && printTemplate ? { template: printTemplate, view: printView } : null
  /* (UX audit Q1 · Q2 · Q11) Send — every path through the quote's one Send (components/quotes/send/use-quote-send.tsx), Preview's too. */
  /* (S44F — NB-02 (b)) A revision's message says what changed since the last version — in the client's words: no line hidden from them, no
     line's money unless the client view prints a price on every line, the schedule only while it prints */
  const sendChanges = useMemo(() => {
    if (version < 2) return null
    const kept = versions.find((v) => v.version === version - 1)
    const prev = kept ? snapshotState(kept.version, kept.snapshotJson) : null
    if (!prev) return null
    const cur = versionState(version, lines, scheduleRows, { ...livePricing, totalMinor: amountMinor })
    return summaryText(changeSummary(prev, cur, { client: { prices: clientPaneView.amounts === 'lines', schedule: clientPaneView.paymentSchedule } }), { limit: 6 })
  }, [version, versions, lines, scheduleRows, livePricing, amountMinor, clientPaneView.amounts, clientPaneView.paymentSchedule])
  const quoteSend = useQuoteSend({
    changes: sendChanges,
    quote: { id: quote.id, number: quote.number, leadId: lead.id, version, confirmToken: quote.confirmToken }, status: status as QuoteStatus, lead: { name: lead.name, phone: lead.phone }, studioName: studio.name,
    approval: quoteApproval, canApprove, readiness: sendReadiness, flush: () => flushRef.current(),
    onShowIssue: (block) => selectTab(block.section === 'payments' ? 'payment' : block.section),
    onChange: (c) => { setStatus(c.status); stamp(c.updatedAt); setRecord((x) => ({ ...x, sentAt: x.sentAt ?? c.sentAt ?? null, clientSentAt: c.clientSentAt !== undefined ? c.clientSentAt ?? null : x.clientSentAt, ...(c.submittedAt ? { submittedBy: me?.id ?? null, submittedAt: c.submittedAt } : {}) })) },
    contractFrom: from ? withFrom(`/quotes/${quote.id}`, from) : `/quotes/${quote.id}`,
    variation: data.variation ? { change: signedMoney(amountMinor) } : null,   // (Projects round 5)
  })
  /* (pending modules S02 — 1.0's live preview link) ⋮ › Share a view-only link: the client looks, live; nothing is sent or confirmed */
  const viewLinkUi = useViewLink({ quote: { id: quote.id, number: quote.number, kind: quote.kind, archivedAt: quote.archivedAt, viewToken: quote.viewToken }, status, lead: { name: lead.name, phone: lead.phone },
    studioName: studio.name, approval: quoteApproval, canApprove, flush: () => flushRef.current() })
  /* (simplify round 2, R2-A — S-21's *Send VO-n* in one press) `?send=confirm`, from Money's Needs you: Send ▾ › Send for confirmation opens as
     the page reveals (GHOST_MIN_MS, never under the ghost), through the menu's own press — the readiness check first — and only where the menu
     offers it (a quote waiting for approval, or one already confirmed, lands as it is). The flag is read once (a lazy initialiser): the address
     dropping it re-renders the page but never re-runs, so never cancels, the timer that opens the dialog. */
  const [landSend] = useState(() => sendOnArrival === 'confirm')
  const sendLatest = useRef(quoteSend)
  useEffect(() => { sendLatest.current = quoteSend })
  useEffect(() => {
    if (!landSend) return
    const t = window.setTimeout(() => { const qs = sendLatest.current; if (qs.canSend && qs.kind === 'client') qs.send('confirmation') }, GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landSend])
  useEffect(() => {
    if (!landSend) return
    const u = new URL(window.location.href); if (!u.searchParams.has('send')) return
    u.searchParams.delete('send'); router.replace(`${u.pathname}${u.search}`, { scroll: false })
  }, [landSend, router])
  const clientDesign = templateState.current?.design ?? null
  const clientColumns = useMemo(() => (clientDesign ? clientColumnsOf(clientDesign) : null), [clientDesign])
  const updateTemplate = () => {
    if (tplLock.locked) { tplLock.open(); return }
    setTemplateBusy(true)
    void run('update the template version', async () => {
      const r = await orThrow(updateQuoteTemplateVersion(quote.id))
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
        /* (Dane UAT 6.26, g-snackbar) where it went, not its name — "{name} saved as a draft template" wrapped to three lines in the 344 snackbar */
        snackbar({ message: 'Saved as a draft in Company › Templates › Quotes', actionLabel: 'Open', onAction: () => { router.push(`/templates/${id}?from=${encodeURIComponent(`/quotes/${quote.id}`)}&quote=${quote.id}`) } })
      } catch { fail('save the template') } finally { setTemplateBusy(false) }
    })()
  }
  /* (REG-465) Close returns where the editor was opened from — the Quotes tab, Tools › Quotes, a Qanvast-origin tab — the lead's tab when nothing says. */
  const backHref = from ?? `/leads/${lead.id}/quotes`
  const close = () => router.push(backHref)

  const tabs = sections.filter((s) => !(data.variation && s.key === 'payment')).map((s) => ({ key: s.key, label: s.key === 'items' ? `Items (${itemCount})` : s.key === 'files' ? `Files (${fileCount})` : SECTION_LABELS[s.key] }))
  const titleOf = (k: SectionKey) => (k === 'items' ? `Items (${itemCount})` : k === 'files' ? `Files (${fileCount})` : SECTION_LABELS[k])
  const openOf = (k: SectionKey) => !(sections.find((s) => s.key === k)?.collapsed ?? true)
  const maison = useQuoteMaison({
    lines,
    onGoTo: (ids) => { if (!openOf('items')) toggle('items'); setItemsCommand((c) => ({ kind: 'focus', ids, n: (c?.n ?? 0) + 1 })) },
    onSetMarkup: (ids) => { if (!openOf('items')) toggle('items'); setItemsCommand((c) => ({ kind: 'setMarkup', ids, n: (c?.n ?? 0) + 1 })) },
    book: data.priceBook,   // (pending modules S12) the lines that match My Items — the review opens from the sheet
    costs: data.costs,   // (pending modules S41b-1) no cost or margin hint for a member who doesn't see costs
    onMatch: () => { if (!openOf('items')) toggle('items'); setItemsCommand((c) => ({ kind: 'match', ids: [], n: (c?.n ?? 0) + 1 })) },
  })

  const bodyOf = (k: SectionKey) => {
    if (k === 'general') return <GeneralInfo value={general} lead={lead} members={members} today={new Date(now)} onChange={changeGeneral} variation={!!data.variation} extra={<>{data.variation ? <VariationReasonField quoteId={quote.id} value={data.variation.reason ?? null} approved={status === 'Confirmed' || status === 'Signed'} /> : null}<TemplateCard state={templateState} busy={templateBusy} locked={tplLock.locked} onChange={openPicker} onEdit={editTemplate} onSaveAs={openSaveAs} /></>} />   // (gaps build B, item 7) a VO’s reason for the change
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
        {data.variation ? variationLabel({ status }) : status}{/* (fix-D, D-24) a variation order reads the Money tab's word for its state */}
      </Button>
      {/* (REG-728) A status list: the 240 width; "current" is the row's meta — the tab's mark (910:36673), so no Selected fill.
          (REG-590) "approvers only" on Approved while the studio asks for an approver. */}
      <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} sheetTitle="Status">
        {steps.map((s) => {
          /* (REG-590) Approved is an approver's; (UX audit Q3) the client's statuses wait for an approver's OK — the row says so. */
          const approverOnly = s === 'Approved' && quoteApproval === 'required' && !canApprove
          const waits = s !== status && !!statusBlock({ target: s, current: status, approval: quoteApproval, approver: canApprove })
          /* (REG-1066, F-07) a variation order's approval moves the contract: into or out of Confirmed is an Owner's or an Admin's, never on a
             completed project — the row says the rule; for them Confirmed opens Mark as approved by the client (when and how) */
          const voMove = !!data.variation && s !== status && isApprovedVariation(s) !== isApprovedVariation(status)
          const voWhy = voMove && data.variation ? data.variation.locked ?? (data.variation.marks ? null : MARK_RULE) : null
          const marksIt = voMove && !voWhy && isApprovedVariation(s)
          return (
            <DropdownItem key={s} role="menuitemradio" checked={s === status} selected={false} disabled={approverOnly || waits || !!voWhy} title={voWhy ?? undefined}
                          onSelect={() => { if (marksIt) { setStatusOpen(false); setMarking(true) } else changeStatus(s) }}
                          help={marksIt ? 'Mark as approved by the client' : undefined}
                          meta={s === status ? 'current' : approverOnly ? 'approvers only' : waits ? STATUS_BLOCK_META : undefined}>
              {data.variation ? variationLabel({ status: s }) : s}
            </DropdownItem>
          )
        })}
      </Dropdown>
    </span>
  )

  /* (Projects round 5, F-06) A variation order has no payment schedule of its own — its money reaches the project's unsent invoices */
  const movable = sections.filter((s) => !isFixedSection(s.key) && !(data.variation && s.key === 'payment'))
  // The Items section's seed never changes for a mounted editor (its own state takes over from the first render).
  const [itemsSeed, setItemsSeed] = useState<ItemsSeed>(() => ({
    quoteId: quote.id, leadId: lead.id, number: quote.number, items, priceBook, priceBookSections, bookFolders: { items: data.libraryFolders.bookItems, sections: data.libraryFolders.bookSections }, runsBook: data.runsBook, trades, units: data.units, billsProject: data.billsProject, tradeNotes: studioDetails.tradeNotes, brandColors: brand.colors, entities: studioDetails.entities.map((e, i) => ({ name: e.name, gstRegistered: i === 0 ? studio.gstRegistered : e.gstRegistered, retired: e.retired })), roundStep: rules.roundStep, studio, files, me,
    /* (S44O — call C3) the quote's GST rounding rides the totals' pricing, so the totals card counts GST as the paper does — the rule stamped when
       it went out (`quotes.gst_rule`), today's for a quote not yet sent. (The Items package may name it in `Pricing`; it travels as it is.) */
    pricing: Object.assign({ additionalDiscountMode: quote.additionalDiscountMode === 'amount' ? 'amount' as const : 'pct' as const, additionalDiscountValue: quote.additionalDiscountValue, gstEnabled: quote.gstEnabled, issuingEntity: quote.issuingEntity, discounts: parseDiscounts(quote.discountsJson) }, { gstRule: quote.gstRule ?? null }),
    view: quote.itemsView, density: quote.itemsDensity, columnsJson: quote.itemsColumns, labelsJson: quote.itemsLabels,
    costs: data.costs,   // (pending modules S41b-1)
  }))
  const [paymentsSeed, setPaymentsSeed] = useState<PaymentsSeed>(() => {
    const a = scheduleAnchors({ estimatedStart: lead.estimatedStartDate, quoteCreated: quote.createdAt, propertyType: quote.propertyType ?? lead.propertyType })
    return { quoteId: quote.id, rows: payments, anchors: { start: a.start.getTime(), weeks: a.weeks }, splits: paymentSplits, folders: data.libraryFolders.payments }
  })
  const [filesSeed] = useState<FilesSeed>(() => ({ quoteId: quote.id, leadId: lead.id, files: quoteFiles, leadFiles: files, visible: quote.filesVisible }))
  const [termsSeed, setTermsSeed] = useState<TextSeed>(() => ({ quoteId: quote.id, kind: 'terms', html: quote.termsHtml ?? '', visible: quote.termsVisible, templates: textTemplates.filter((t) => t.kind === 'terms'), folders: data.libraryFolders.texts }))
  const [notesSeed, setNotesSeed] = useState<TextSeed>(() => ({ quoteId: quote.id, kind: 'notes', html: quote.notesHtml ?? '', visible: quote.notesVisible, templates: textTemplates.filter((t) => t.kind === 'notes'), folders: data.libraryFolders.texts }))
  // What a template's tokens and Write with AI resolve to — the quote's records (REG-403 / REG-420), live where the editor changes them.
  /* (S44Q, row 311) the studio's two tokens land as live fields ({studio_name} · {studio_phone}): the print names the quote's issuing entity */
  const tokens: TokenValues = useMemo(() => quoteTokenValues({
    client: lead.name, studio: studio.name, studioPhone: studio.phone,
    member: members.find((m) => m.id === general.preparedBy)?.name ?? me?.name ?? '',
  }), [lead.name, studio.name, studio.phone, members, general.preparedBy, me])
  const textContext: TextContext = useMemo(() => {
    const counted = countedLines(flattenItems(lines))
    const works: string[] = []
    for (const l of counted) { const w = (l.section ?? l.category ?? 'Works').trim() || 'Works'; if (!works.some((x) => x.toLowerCase() === w.toLowerCase())) works.push(w) }
    return {
      studio: LIVE_STUDIO_TOKENS.studio, client: lead.name, member: tokens.member, number: quote.number,   // (S44Q, row 311) "Write from this quote" names the quote's entity, live
      propertyType: general.propertyType || null, siteAddress: general.siteAddress || null,
      validUntil: general.validUntil ? parseInputDate(general.validUntil) : null, createdAt: quote.createdAt,
      totalMinor: amountMinor, gstEnabled: gstOn, gstPct: quoteGstRate(counted, studio.gstPct), works, itemCount: counted.length,   // (S44Q, row 256) the quote's rate, not its first line's
      schedule: toRows(scheduleRows), start: new Date(paymentsSeed.anchors.start), weeks: paymentsSeed.anchors.weeks,
    }
  }, [lines, studio.gstPct, lead.name, tokens.member, quote.number, quote.createdAt, general.propertyType, general.siteAddress, general.validUntil, amountMinor, scheduleRows, paymentsSeed.anchors.start, paymentsSeed.anchors.weeks, gstOn])
  /* (pending modules S29) Maison AI's writing suggestions for the Terms and Notes — each opens that section's proposal (it opens a folded section) */
  const textTemplates2 = useMemo(() => ({ terms: termsSeed.templates, notes: notesSeed.templates }), [termsSeed.templates, notesSeed.templates])
  const textMaison = useTextMaison({ texts, visible: textVisible, context: textContext, templates: textTemplates2, tokens,
    onWrite: (kind: TextKind, action: WritingAction) => { if (!openOf(kind)) toggle(kind); setWriteCmd((c) => ({ ...c, [kind]: { action, n: (c[kind]?.n ?? 0) + 1 } })) } })
  const [signatureSeed, setSignatureSeed] = useState<SignatureSeed>(() => ({
    quoteId: quote.id, required: quote.clientSignatureRequired, memberName: me?.name ?? '', studioName: studio.name, clientName: lead.name, nric: quote.nric,
    signature: memberSignatureOf(me),   // (Dane UAT 6.23) drawn, typed or uploaded
    consent: me?.signatureConsent ?? null,   // (pending modules S03) whether it goes on their documents
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
          deleteBlock={deleteWhy}
          lead={lead} quoteId={quote.id} title={general.title} number={quote.number} version={version} status={status} siblings={siblings}
          savedLabel={savedLabel(updatedAt, clock)}
          canSend={quoteSend.canSend} sendKind={quoteSend.kind} sendHint={quoteSend.hint} statusSlot={statusPill}
          onSwitch={(id) => router.push(withFrom(`/quotes/${id}`, from))}
          onSend={quoteSend.send} onMenu={onMenu} onClose={close}
          clientViewOn={clientView} onClientView={() => setClientView((o) => !o)}
          contract={contract} contractHref={contract ? withFrom(`/contracts/${contract.id}`, from ? withFrom(`/quotes/${quote.id}`, from) : `/quotes/${quote.id}`) : undefined}
          variation={data.variation ?? null} from={from} viewLink={viewLinkUi.offered}
        />
        {data.variation ? <VariationBar v={data.variation} changeMinor={amountMinor} status={status} quoteId={quote.id} /> : null}
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
          <SentBanner status={status} version={version} now={clock} confirmedBy={record.confirmedBy} markedBy={record.confirmedVia === 'marked' ? nameOf(record.confirmedMarkedBy) ?? 'the studio' : null} variation={!!data.variation} onRevise={() => { void flushRef.current(); if (voReviseBlock) snackbar({ message: couldnt(`revise ${quote.number}`, voReviseBlock) }); else setReviseOpen(true) }}
                      onMove={offersQuoteSent(lead.stage, status) ? () => { void flushRef.current(); router.push(moveStageHref(lead.id, 'quote-sent', { quote: quote.id })) } : null}
                      validityEnded={(() => { const d = general.validUntil ? parseInputDate(general.validUntil) : null; return d && validityPassed({ status, validUntil: d }, clock) ? displayDate(d) : null })()}
                      at={status === 'Sent to Client' ? record.clientSentAt ?? record.sentAt : status === 'Confirmed' ? record.confirmedAt : null}
                      opened={(() => { const seen = viewedSince({ status, sentAt: record.sentAt ? new Date(record.sentAt) : null, clientSentAt: record.clientSentAt ? new Date(record.clientSentAt) : null, clientLastViewedAt: quote.clientLastViewedAt }); return seen ? { at: seen.getTime(), count: quote.clientViewCount } : null })()}   /* (pending modules S04) */
                      signedTotal={status === 'Signed' && !data.variation && movedSinceSigning({ amountMinor, signedAmountMinor: quote.signedAmountMinor }) ? money2(quote.signedAmountMinor!) : null} />
        ) : null}
        <NoteDialog open={changesOpen} title="Request changes" label="What should change?" help={`Goes back to ${nameOf(record.submittedBy) ?? 'whoever sent it'} at the top of the quote; the quote returns to Draft.`} action="Send back"
                    busy={approvalBusy} required maxLength={300} onClose={() => setChangesOpen(false)} onSubmit={requestChanges} />
        <div className={styles.body}>
          <div className={styles.main}>
            <SectionCard id="section-general" title={titleOf('general')} open={openOf('general')} onToggle={() => toggle('general')}>
              {bodyOf('general')}
            </SectionCard>
            <VariationContext.Provider value={!!data.variation}>
            <ItemsCard key={`items-${seedNonce}`} seed={itemsSeed} open={openOf('items')} onToggle={() => toggle('items')} exportTick={exportTick}
                       onSaved={(t, _amount) => stamp(t)} onOpenAi={() => setAiOpen(true)} onCount={setItemCount} command={itemsCommand}
                       onTotal={setAmountMinor} onLines={setLines} onPricing={(p) => { setGstOn(p.gstEnabled); setLivePricing(p) }} clientColumns={clientColumns} forceView={forceView} bookTick={bookTick} propertyType={general.propertyType || null}
                       commentCounts={commentCounts} onOpenComments={(itemId) => setCommentsView({ open: true, focus: itemId })} changes={lineChangeMap}
                       printsBy={printsBy} onChangeTemplate={openPicker} onPreview={() => onMenu('preview')} />
            </VariationContext.Provider>
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
                                            onVisible={(v) => setTextVisible((x) => ({ ...x, [s.key]: v }))}
                                            onHtml={(h) => setTexts((x) => ({ ...x, [s.key]: h }))} command={writeCmd[s.key as TextKind]} />
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
          <CreateStrip onOpen={(link) => { if (link === 'ai') setAiOpen(true); else if (link === 'templates') openPicker(); else { if (!openOf('items')) toggle('items'); setBookTick((t) => t + 1) } }} />
        </div>
        {tabletDown ? (
          <Drawer open={clientView} onClose={() => setClientView(false)} title="Client view" label="Client view">
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
        <MaisonAiSheet open={aiOpen} suggestions={[...maison, ...textMaison]} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (sweep S2 #30) the FAB's own press toggles it · (pending modules S04) its hints · (S10) the shell's one sheet */}
        <SaveAsTemplateDialog open={saveAsOpen} defaultName={`${general.title || quote.number} template`} busy={templateBusy} onClose={() => setSaveAsOpen(false)} onSave={saveAsTemplate} />
        {/* (REG-538) Change template on a Draft: apply its defaults? — then the regroup question, if any. */}
        <ConfirmDialog open={applyTpl !== null} title={applyTpl ? `Apply ${applyTpl.name}’s defaults to this quote?` : ''} tone="primary" confirmLabel="Apply defaults" cancelLabel="Keep mine"
                       message="Its payment schedule, validity, GST and signature settings, Terms and Notes templates and working columns replace what this quote has. Your lines stay as they are."
                       onCancel={closeApply} onConfirm={doApplyDefaults} />
        <RenameQuoteDialog open={renameOpen} title={general.title} onClose={() => setRenameOpen(false)} onSave={(title) => changeGeneral({ title })} />
        {/* (REG-565) Version History and the Revise confirm. */}
        <VersionHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} current={{ version, status, amountMinor, updatedAt }} versions={versions} members={members} changes={changes}
                              live={historyOpen ? { items: lines, payments: scheduleRows, pricing: { ...livePricing, totalMinor: amountMinor } } : null}
                              onCompare={(v) => { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview?${v === version ? '' : `version=${v}&`}against=${v - 1}`, `/quotes/${quote.id}`)) }}   /* (S44F — NB-02 (c)) the version against the one before it; the page picks another */
                              canRevise={canRevise} reviseHint={reviseHint} onRevise={() => setReviseOpen(true)} onOpen={(v) => { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview?version=${v}`, `/quotes/${quote.id}`)) }}
                              canBringBack={status === 'Draft'} onBringBack={(v) => setBringBack(v)} />
        {/* (REG-625, parity Q-25) Bring an older version back into the Draft — its lines, schedule, pricing and texts; the page reloads on them. */}
        <ConfirmDialog open={bringBack !== null} title={`Bring back version ${bringBack ?? ''}?`} tone="primary" confirmLabel={`Bring back version ${bringBack ?? ''}`} cancelLabel="Not now"
                       message={`The draft’s lines, payment schedule, discounts, texts and title are replaced with version ${bringBack ?? ''}’s. Version ${bringBack ?? ''} stays in the history as it is; the draft’s own changes are not kept.`}
                       onCancel={() => setBringBack(null)} onConfirm={() => {
                         const v = bringBack; setBringBack(null); if (v === null) return
                         void run('bring the version back', async () => { await flushRef.current(); await orThrow(restoreQuoteVersion(quote.id, v)); const u = new URL(window.location.href); u.searchParams.set('restored', String(v)); window.location.assign(u.toString()) })
                       }} />
        {/* (UX audit Q10) Revise asks what the client asked for — optional, kept with the version it answers (Version History, the kept preview). */}
        <ReviseDialog open={reviseOpen} version={version} number={quote.number}
                      message={data.variation
                        ? `Version ${version} is kept as it stands — ${variationLabel({ status })}, ${signedMoney(amountMinor)} — and opens read-only from Version History. The variation order becomes a Draft again under ${quote.number} with the same lines, ready for the changes.${voApproved ? ` Its approval stops counting: the contract goes back to ${money2(data.variation.contractMinor)} until ${clientFirst} approves version ${version + 1}, and the unsent invoices follow.` : ''}`
                        : `Version ${version} is kept as it stands — ${status}, ${money2(amountMinor)} — and opens read-only from Version History. The quote becomes a Draft again under ${quote.number} with the same lines, ready for the changes.${data.contract?.status === 'Sent to Client' ? ` ${lead.name.trim().split(/\s+/)[0] || 'The client'}’s signing link for ${data.contract.title} waits until version ${version + 1} is sent.` : ''}`}   /* (S42 B-01) said before the press: the open signing link waits for the new version */
                      onClose={() => setReviseOpen(false)} onRevise={doRevise} />
        <DeleteQuotesDialog open={deleteOpen} count={1} onNo={() => setDeleteOpen(false)}
                            onYes={() => { setDeleteOpen(false); void run('delete the quote', async () => { const r = await deleteQuotes([quote.id]); if (!('deleted' in r) || !r.deleted) { snackbar({ message: r.error ?? DELETE_RULE }); return } snackbar({ message: data.variation ? `${quote.number} deleted — find it under Money › Deleted variation orders` : 'Quote deleted — find it under Deleted Quotes' })   /* (fix-G, G-11) a variation order comes back from its project's Money tab */; router.push(backHref) }) }} />
        {quoteSend.dialogs}
        {viewLinkUi.dialog}
        {statusChange.dialog}
        {data.variation ? (
          <MarkApprovedDialog open={marking} number={quote.number} client={lead.name.trim().split(/\s+/)[0] ?? lead.name} contractAfter={Math.max(0, data.variation.contractMinor + amountMinor)} today={new Date(now)} busy={markBusy}
                              onClose={() => setMarking(false)} onSave={markApproved} />
        ) : null}
        {/* (REG-627, parity Q-30) Comments on the lines — the Tasks comments panel for a line. */}
        <LineCommentsDrawer open={commentsView.open} focus={commentsView.focus} lines={lines.filter((l) => l.kind === 'item').map((l) => ({ id: l.id, name: l.name }))} comments={comments} me={me} members={members} now={clock}
                            onFocus={(focus) => setCommentsView((v) => ({ ...v, focus }))} onClose={() => setCommentsView({ open: false, focus: null })}
                            onAdd={(itemId, body) => { void run('add the comment', async () => { const row = await orThrow(addLineComment(quote.id, itemId, body)); setComments((c) => [...c, row]); setClock(Date.now()) }) }}
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
