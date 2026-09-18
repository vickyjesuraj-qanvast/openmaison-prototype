'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { createContractDoc } from '@/app/contracts/actions'
import { Reorder, useDragControls } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { AiSheet } from '@/components/leads/ai-sheet'
import { PageReveal } from '@/components/shell/page-reveal'
import { MaisonFab } from '@/components/shell/maison-fab'
import { useRun } from '@/components/leads/tasks/use-run'
import { setQuoteStatus } from '@/app/leads/quotes-actions'
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
import { saveQuoteGeneral, saveQuoteSections, sendQuote, type GeneralPatch } from '@/app/quotes/actions'
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
import { countedLines, flattenItems } from '@/lib/quotes/math'
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
export function QuoteEditor({ data, from, section }: { data: QuoteEditorData; from?: string; /** (REG-490) the preview's Open links land on a section */ section?: string }) {
  const { quote, lead, siblings, members, quoteApproval, items, priceBook, studio, files, me, payments, quoteFiles, textTemplates, activity, now, brand, studioDetails } = data
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
  const [addTick, setAddTick] = useState(0)   /* (REG-522) the Create strip's My Items */
  const tabletDown = useMediaQuery(TABLET_DOWN)

  /* ── state ── */
  const [status, setStatus] = useState(quote.status)
  const [general, setGeneral] = useState<GeneralState>(() => ({
    title: quote.title,
    preparedBy: quote.preparedBy,
    validUntil: quote.validUntil ? inputDate(quote.validUntil) : '',
    projectRef: quote.projectRef ?? '',
    nric: quote.nric ?? '',
    customerId: quote.customerId ?? '',
    propertyType: quote.propertyType ?? lead.propertyType,
    siteAddress: quote.siteAddress ?? lead.propertyAddress ?? '',
  }))
  const [sections, setSections] = useState<QuoteSectionState[]>(() => parseSections(quote.sections))
  const [updatedAt, setUpdatedAt] = useState((quote.updatedAt ?? quote.createdAt).getTime())
  const [clock, setClock] = useState(now)
  const [active, setActive] = useState<SectionKey>('general')
  const [statusOpen, setStatusOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
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
  const nextStep: QuoteStatus | null = status === 'Draft' ? (steps[1] ?? null) : status === 'Approved' ? 'Sent to Client' : null
  const send = () => {
    if (!nextStep) return
    void run('send the quote', async () => { const r = await sendQuote(quote.id); setStatus(r.status); setUpdatedAt(r.updatedAt); setClock(Date.now()) }, `Quote marked ${nextStep}`, { guard: 'send' })
  }
  const changeStatus = (s: QuoteStatus) => {
    setStatusOpen(false)
    if (s === status) return
    void run('change the status', async () => { await setQuoteStatus(quote.id, s); setStatus(s); setUpdatedAt(Date.now()); setClock(Date.now()) }, `Quote marked ${s}`)
  }
  /* Preview, Download as PDF and Print open the quote through its template (REG-490); Save as Template makes a draft template
     (REG-489); Rename, Duplicate, Export, Version History, Comments and Delete still answer coming soon (owner 2026-09-11). */
  const onMenu = (action: HeaderMenuAction) => {
    if (action === 'preview') { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview`, from)); return }
    if (action === 'pdf' || action === 'print') { void flushRef.current(); router.push(withFrom(`/quotes/${quote.id}/preview?print=1`, from)); return }
    if (action === 'template') { setSaveAsOpen(true); return }
    if (action === 'contract') { void flushRef.current(); void createContractDoc({ leadId: lead.id, fromQuoteId: quote.id }).then((id) => router.push(`/contracts/${id}?from=${encodeURIComponent(`/quotes/${quote.id}`)}`), () => snackbar({ message: 'Couldn’t create the contract — please try again' })); return }   /* (REG-534) the agreement's Quote chips read this quote */
    if (action === 'xray') { void flushRef.current(); router.push(`/quote-x-ray?lead=${lead.id}&quote=${quote.id}&from=${encodeURIComponent(`/quotes/${quote.id}`)}`); return }   /* (REG-529) Quote X-Ray on this quote */
    comingSoon()
  }
  const VIEW_WORD: Record<ItemsView, string> = { none: 'your own groups', category: 'Trade', room: 'Room', section: 'Section' }
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
      if (t) { const v = viewForTemplate(t.design); if (v !== 'none' && lines.some((l) => l.kind === 'group')) setRegroup({ view: v, label: `${t.name} prints by ${VIEW_WORD[v]}` }) }
    }, 'Template changed').finally(() => setTemplateBusy(false))
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
    lead: { name: lead.name, phone: lead.phone, email: lead.email }, studio: studioDetails, members, items: lines, payments: scheduleRows, totalMinor: amountMinor,
  }), [quote, general, status, lead, studioDetails, members, lines, scheduleRows, amountMinor])
  /* The pane's design: the quote's template, else the studio default, else the first published, else the built-in client design — one chain for the aside and the tablet drawer. */
  const clientPaneDesign = templateState.current?.design ?? templateState.picker.templates.find((t) => t.isDefault)?.design ?? templateState.picker.templates[0]?.design ?? FALLBACK_CLIENT_DESIGN
  const clientDesign = templateState.current?.design ?? null
  const clientColumns = useMemo(() => (clientDesign ? clientColumnsOf(clientDesign) : null), [clientDesign])
  const updateTemplate = () => {
    setTemplateBusy(true)
    void run('update the template version', async () => {
      const r = await updateQuoteTemplateVersion(quote.id)
      setTemplateState((st) => (st.current ? { ...st, current: { ...st.current, pinned: r.version } } : st)); stamp(Date.now())
    }, 'Quote moved to the latest template version').finally(() => setTemplateBusy(false))
  }
  const saveAsTemplate = (name: string) => {
    setTemplateBusy(true)
    void (async () => {
      try {
        await flushRef.current()
        const id = await saveQuoteAsTemplate(quote.id, name)
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
      <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} align="left" sheetTitle="Status">
        {steps.map((s) => (
          <DropdownItem key={s} role="menuitemradio" checked={s === status} onSelect={() => changeStatus(s)}>
            <span className={styles.menuText}>{s}</span>
            {s === status ? <span className={styles.menuCurrent}>current</span> : null}
          </DropdownItem>
        ))}
      </Dropdown>
    </span>
  )

  const movable = sections.filter((s) => !isFixedSection(s.key))
  // The Items section's seed never changes for a mounted editor (its own state takes over from the first render).
  const [itemsSeed] = useState<ItemsSeed>(() => ({
    quoteId: quote.id, number: quote.number, items, priceBook, studio, files, me,
    pricing: { additionalDiscountMode: quote.additionalDiscountMode === 'amount' ? 'amount' : 'pct', additionalDiscountValue: quote.additionalDiscountValue, gstEnabled: quote.gstEnabled, issuingEntity: quote.issuingEntity },
    view: quote.itemsView, density: quote.itemsDensity, columnsJson: quote.itemsColumns, labelsJson: quote.itemsLabels,
  }))
  const [paymentsSeed] = useState<PaymentsSeed>(() => {
    const a = scheduleAnchors({ estimatedStart: lead.estimatedStartDate, quoteCreated: quote.createdAt, propertyType: quote.propertyType ?? lead.propertyType })
    return { quoteId: quote.id, rows: payments, anchors: { start: a.start.getTime(), weeks: a.weeks } }
  })
  const [filesSeed] = useState<FilesSeed>(() => ({ quoteId: quote.id, leadId: lead.id, files: quoteFiles, leadFiles: files, visible: quote.filesVisible }))
  const [termsSeed] = useState<TextSeed>(() => ({ quoteId: quote.id, kind: 'terms', html: quote.termsHtml ?? '', visible: quote.termsVisible, templates: textTemplates.filter((t) => t.kind === 'terms') }))
  const [notesSeed] = useState<TextSeed>(() => ({ quoteId: quote.id, kind: 'notes', html: quote.notesHtml ?? '', visible: quote.notesVisible, templates: textTemplates.filter((t) => t.kind === 'notes') }))
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
      totalMinor: amountMinor, gstEnabled: gstOn, works, itemCount: counted.length,
      schedule: toRows(scheduleRows), start: new Date(paymentsSeed.anchors.start), weeks: paymentsSeed.anchors.weeks,
    }
  }, [lines, studio.name, lead.name, tokens.member, quote.number, quote.createdAt, general.propertyType, general.siteAddress, general.validUntil, amountMinor, scheduleRows, paymentsSeed.anchors.start, paymentsSeed.anchors.weeks, gstOn])
  const [signatureSeed] = useState<SignatureSeed>(() => ({
    quoteId: quote.id, required: quote.clientSignatureRequired, memberName: me?.name ?? '', studioName: studio.name, clientName: lead.name, nric: quote.nric,
    signature: me?.signatureKind === 'draw' || me?.signatureKind === 'type' ? { kind: me.signatureKind, name: me.signatureName ?? me.name, data: me.signatureData ?? null } : null,
  }))
  const stamp = (t: number) => { setUpdatedAt(t); setClock(Date.now()) }
  const stripExpanded = useStripExpanded()   // the Items bulk bar centres on the section column, not the viewport (quote-editor.module.css)

  /* (REG-518) The picker's selection lives here; the dialog footer acts on it. */
  const [pickedTpl, setPickedTpl] = useState<string | null>(null)
  const pickerSel = defaultPick(templateState.picker, pickedTpl, templateState.current?.id ?? null)

  return (
    <PageReveal skeleton={<EditorSkeleton />}>
      <div className={styles.page} data-testid="quote-editor" data-strip={stripExpanded ? 'expanded' : 'collapsed'}>
        <EditorHeader
          lead={lead} quoteId={quote.id} title={general.title} number={quote.number} version={quote.version} status={status} siblings={siblings}
          savedLabel={savedLabel(updatedAt, clock)}
          canSend={!!nextStep} sendHint={`Quote is ${status}`} statusSlot={statusPill}
          onSwitch={(id) => router.push(withFrom(`/quotes/${id}`, from))}
          onSend={send} onMenu={onMenu} onClose={close}
          clientViewOn={clientView} onClientView={() => setClientView((o) => !o)}
        />
        <EditorTabs items={tabs} active={active} onSelect={selectTab} className={styles.stickyTabs} />
        {templateState.current && templateState.current.latest > templateState.current.pinned && !bannerKept ? (
          <TemplateUpdateBanner current={templateState.current} busy={templateBusy} onUpdate={updateTemplate} onKeep={() => setBannerKept(true)} />
        ) : null}
        <div className={styles.body}>
          <div className={styles.main}>
            <SectionCard id="section-general" title={titleOf('general')} open={openOf('general')} onToggle={() => toggle('general')}>
              {bodyOf('general')}
            </SectionCard>
            <ItemsCard seed={itemsSeed} open={openOf('items')} onToggle={() => toggle('items')}
                       onSaved={(t, _amount) => stamp(t)} onOpenAi={() => setAiOpen(true)} onCount={setItemCount}
                       onTotal={setAmountMinor} onLines={setLines} onPricing={(p) => setGstOn(p.gstEnabled)} clientColumns={clientColumns} forceView={forceView} addTick={addTick} />
            <Reorder.Group as="div" axis="y" values={movable.map((s) => s.key)} onReorder={reorder} className={styles.group}>
              {movable.map((s) => (
                <MovableSection key={s.key} section={s} title={titleOf(s.key)} onToggle={() => toggle(s.key)}
                                onDrop={() => persistSections(sectionsRef.current)}
                                render={s.key === 'payment' ? (onHandle) => (
                                  <PaymentsCard seed={paymentsSeed} open={!s.collapsed} onToggle={() => toggle('payment')} onHandlePointerDown={onHandle}
                                                totalMinor={amountMinor} today={new Date(now)} onSaved={stamp} onRows={setScheduleRows} />
                                ) : s.key === 'files' ? (onHandle) => (
                                  <FilesCard seed={filesSeed} open={!s.collapsed} onToggle={() => toggle('files')} onHandlePointerDown={onHandle} onSaved={stamp} onCount={setFileCount} />
                                ) : s.key === 'terms' || s.key === 'notes' ? (onHandle) => (
                                  <TextCard seed={s.key === 'terms' ? termsSeed : notesSeed} open={!s.collapsed} onToggle={() => toggle(s.key)} onHandlePointerDown={onHandle} onSaved={stamp} tokens={tokens} context={textContext} />
                                ) : s.key === 'signature' ? (onHandle) => (
                                  <SignatureCard seed={signatureSeed} open={!s.collapsed} onToggle={() => toggle('signature')} onHandlePointerDown={onHandle} onSaved={stamp} nric={general.nric} />
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
              <ClientViewPane data={clientData} design={clientPaneDesign} brand={brand}
                              templateName={templateState.current?.name ?? 'Studio default'} version={templateState.current?.pinned ?? null} onOpenPreview={() => onMenu('preview')} onClose={() => setClientView(false)} />
            </aside>
          ) : null}
          <CreateStrip onOpen={(link) => { if (link === 'ai') setAiOpen(true); else if (link === 'templates') setPickerOpen(true); else if (link === 'items') { if (!openOf('items')) toggle('items'); setAddTick((t) => t + 1); } else comingSoon() }} />
        </div>
        {tabletDown ? (
          <Drawer open={clientView} onClose={() => setClientView(false)} title="Client view" label="Client view" width={420}>
            <ClientViewPane data={clientData} design={clientPaneDesign} brand={brand}
                            templateName={templateState.current?.name ?? 'Studio default'} version={templateState.current?.pinned ?? null} onOpenPreview={() => onMenu('preview')} onClose={() => setClientView(false)} />
          </Drawer>
        ) : null}
        <Dialog open={pickerOpen} onClose={() => { setPickerOpen(false); setPickedTpl(null) }} title="Choose a template" size="modal" width={1200} portal
                subtitle="The quote keeps its lines; the template decides how they print and what the client sees."
                footer={<><Button variant="secondary" appearance="outlined" onPress={() => { setPickerOpen(false); setPickedTpl(null) }}>Cancel</Button><Button onPress={() => { if (pickerSel) pickTemplate(pickerSel) }} isDisabled={!pickerSel || pickerSel === (templateState.current?.id ?? null)}>{pickerSel && pickerSel === templateState.current?.id ? 'On this quote' : 'Use this template'}</Button></>}>
          <TemplatePicker data={templateState.picker} picked={pickerSel} onPick={setPickedTpl} currentId={templateState.current?.id ?? null} now={now} onUse={pickTemplate} />
        </Dialog>
        <ConfirmDialog open={regroup !== null} title="Regroup the items the way the template prints?" tone="primary" confirmLabel={regroup ? `Group by ${VIEW_WORD[regroup.view]}` : 'Regroup'} cancelLabel="Keep my groups"
                       message={regroup ? `${regroup.label}. Your lines stay as they are; only View by changes, and you can change it back.` : ''}
                       onCancel={() => setRegroup(null)} onConfirm={() => { if (regroup) doRegroup(regroup.view) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
        <SaveAsTemplateDialog open={saveAsOpen} defaultName={`${general.title || quote.number} template`} busy={templateBusy} onClose={() => setSaveAsOpen(false)} onSave={saveAsTemplate} />
        <MaisonFab onPress={() => setAiOpen((o) => !o)} />
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
