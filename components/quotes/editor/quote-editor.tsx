'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Reorder, useDragControls } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { AiSheet } from '@/components/leads/ai-sheet'
import { PageReveal } from '@/components/shell/page-reveal'
import { MaisonFab } from '@/components/shell/maison-fab'
import { useRun } from '@/components/leads/tasks/use-run'
import { setQuoteStatus } from '@/app/leads/quotes-actions'
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
export function QuoteEditor({ data, from }: { data: QuoteEditorData; from?: string }) {
  const { quote, lead, siblings, members, quoteApproval, items, priceBook, studio, files, me, payments, quoteFiles, textTemplates, activity, now } = data
  const router = useRouter()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

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
  const onMenu = (_action: HeaderMenuAction) => { comingSoon() }   // every kebab item, Preview and Comments: coming soon (owner 2026-09-11)
  /* (REG-465) Close returns where the editor was opened from — the Quotes tab, Tools › Quotes, a Qanvast-origin tab — the lead's tab when nothing says. */
  const backHref = from ?? `/leads/${lead.id}/quotes`
  const close = () => router.push(backHref)

  const tabs = sections.map((s) => ({ key: s.key, label: s.key === 'items' ? `Items (${itemCount})` : s.key === 'files' ? `Files (${fileCount})` : SECTION_LABELS[s.key] }))
  const titleOf = (k: SectionKey) => (k === 'items' ? `Items (${itemCount})` : k === 'files' ? `Files (${fileCount})` : SECTION_LABELS[k])
  const openOf = (k: SectionKey) => !(sections.find((s) => s.key === k)?.collapsed ?? true)

  const bodyOf = (k: SectionKey) => {
    if (k === 'general') return <GeneralInfo value={general} lead={lead} members={members} today={new Date(now)} onChange={changeGeneral} />
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
    quoteId: quote.id, items, priceBook, studio, files, me,
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
      totalMinor: amountMinor, gstEnabled: true, works, itemCount: counted.length,
      schedule: toRows(scheduleRows), start: new Date(paymentsSeed.anchors.start), weeks: paymentsSeed.anchors.weeks,
    }
  }, [lines, studio.name, lead.name, tokens.member, quote.number, quote.createdAt, general.propertyType, general.siteAddress, general.validUntil, amountMinor, scheduleRows, paymentsSeed.anchors.start, paymentsSeed.anchors.weeks])
  const [signatureSeed] = useState<SignatureSeed>(() => ({
    quoteId: quote.id, required: quote.clientSignatureRequired, memberName: me?.name ?? '', studioName: studio.name, clientName: lead.name, nric: quote.nric,
    signature: me?.signatureKind === 'draw' || me?.signatureKind === 'type' ? { kind: me.signatureKind, name: me.signatureName ?? me.name, data: me.signatureData ?? null } : null,
  }))
  const stamp = (t: number) => { setUpdatedAt(t); setClock(Date.now()) }
  const stripExpanded = useStripExpanded()   // the Items bulk bar centres on the section column, not the viewport (quote-editor.module.css)

  return (
    <PageReveal skeleton={<EditorSkeleton />}>
      <div className={styles.page} data-testid="quote-editor" data-strip={stripExpanded ? 'expanded' : 'collapsed'}>
        <EditorHeader
          lead={lead} quoteId={quote.id} title={general.title} number={quote.number} version={quote.version} status={status} siblings={siblings}
          savedLabel={savedLabel(updatedAt, clock)}
          canSend={!!nextStep} sendHint={`Quote is ${status}`} statusSlot={statusPill}
          onSwitch={(id) => router.push(withFrom(`/quotes/${id}`, from))}
          onSend={send} onMenu={onMenu} onClose={close}
        />
        <EditorTabs items={tabs} active={active} onSelect={selectTab} className={styles.stickyTabs} />
        <div className={styles.body}>
          <div className={styles.main}>
            <SectionCard id="section-general" title={titleOf('general')} open={openOf('general')} onToggle={() => toggle('general')}>
              {bodyOf('general')}
            </SectionCard>
            <ItemsCard seed={itemsSeed} open={openOf('items')} onToggle={() => toggle('items')}
                       onSaved={(t, _amount) => stamp(t)} onOpenAi={() => setAiOpen(true)} onCount={setItemCount}
                       onTotal={setAmountMinor} onLines={setLines} />
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
          <CreateStrip onOpen={(link) => { if (link === 'ai') setAiOpen(true); else comingSoon() }} />
        </div>
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
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
