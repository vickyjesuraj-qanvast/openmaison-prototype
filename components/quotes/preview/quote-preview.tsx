'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { PDF_DOWNLOADS, paperPath, printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { TextField } from '@/components/om/text-field'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { withFrom } from '@/lib/nav'
import { mm, PAPER_MM } from '@/lib/templates/model'
import { docTotals } from '@/lib/templates/data'
import { money2, pct } from '@/lib/quotes/math'
import { displayDate } from '@/lib/format'
import { readiness, type ReadinessIssue, type ReadinessSection } from '@/lib/templates/readiness'
import { clientViewDiff, type ClientView } from '@/lib/templates/client-view'
import { fallbackDesignClient } from '@/lib/templates/presets'
import type { QuotePreviewData } from '@/lib/templates/queries'
import { saveQuoteClientView, setQuoteTemplate } from '@/app/company/templates-actions'
import { Dialog } from '@/components/om/dialog'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Drawer } from '@/components/om/drawer'
import { useSheetLayout } from '@/components/om/sheet'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { TemplatePicker, defaultPick } from '@/components/templates/template-picker'
import { SendButton } from '@/components/quotes/send/send-button'
import { useQuoteSend } from '@/components/quotes/send/use-quote-send'
import { ReadingCards } from '@/components/quotes/confirm/reading-cards'
import { PaperViewer } from '@/components/quotes/confirm/paper-viewer'   // (K3) the house "As printed" viewer — the client's page's (K4), shared
import { readingSections } from '@/components/templates/render/slices'
import type { QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import header from '@/components/quotes/editor/editor-header.module.css'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import { PageReveal } from '@/components/shell/page-reveal'
import { PreviewSkeleton } from './preview-skeleton'
import { ClientViewPanel } from './client-view-panel'
import { signedMoney } from '@/lib/projects/money'
import styles from './quote-preview.module.css'

/** (S44F — NB-01) The client view's Changes: since the last version (REG-595, as always) · every version since the first. */
const CHANGES_SINCE: Record<ClientView['changesSince'], string> = { last: 'Since the last version', all: 'Every version' }
const SECTION_ANCHOR: Record<ReadinessSection, string> = { general: 'general', items: 'items', payments: 'payment', terms: 'terms', notes: 'notes', signature: 'signature', bank: 'general' }
/* true once hydrated: the viewer is a portal that only the client can mount — `?paper=1` opens it on the first client render, never on the server's */
const noop = () => () => {}
const useMounted = () => useSyncExternalStore(noop, () => true, () => false)

/**
 * Preview (REG-490): the quote exactly as its client will see it — through its template at the pinned version, with the
 * quote's own "What your client sees" switches — plus what is still missing before it is sent, an internal copy with the
 * cost and margin the client never sees, Copy link, Download PDF (the same pages, printed) and Send. `?print=1` prints.
 *
 * (Quotes on the move, K3 — P-05 · Q-06, absorbing C-16 C-17 C-18 C-20 C-21 B-08; his "please go ahead" 2026-10-22) On a phone the page is the
 * client's reflowed quote (the confirmation page's `ReadingCards`, from the print's own sections) under one 56px bar — back · Preview · ⋮ — with
 * "As printed" over the cards: it opens the house paper viewer (the client's page's, `components/quotes/confirm/paper-viewer.tsx`) — the A4 fit to
 * the width, one page per swipe, pinch to zoom, Download in its bar — and `?paper=1` lands on it (the Quote screen's "As printed"); Send ▾ is the
 * foot's one filled button. A touch tablet keeps the same bar with Download and Send in it and draws the A4 at 1:1, the margins scrolling (its text
 * was 8.5–10px at zoom 0.85). Copy link ("for the team"), Share PDF, Internal copy, What your client sees and Change template live under ⋮ at
 * those widths. The desk (≥1025) is as it was.
 */
export function QuotePreview({ data, from, print, send: sendCtx, readOnly = false, costs = true, openPanel = false, paper: paperAsked = false }: { data: QuotePreviewData; from?: string; print: boolean;
  /** (S44I — row 352) `?panel=client`: arrive with What your client sees open (the Items' Column settings link here) */ openPanel?: boolean;
  /** (K3 — P-05) `?paper=1`: a phone arrives on the paper viewer (the Quote screen's "As printed") */ paper?: boolean;
  /** (pending modules S41b-1) the member sees costs — else no Internal copy (its cost and margin): the lines came without them */ costs?: boolean; /** (UX audit Q2) what the quote's Send needs: the studio's approval rule and whether this member approves */ send: { approval: QuoteApproval; canApprove: boolean }
  /** (pending modules S06 — the Accounting role's open question 9, as recommended) a viewer who reads it only (Accounting, from a project's
      Money): Back returns to Money, the crumbs lead only where they open, and nothing changes or sends the quote — Copy link and Download PDF stay */
  readOnly?: boolean }) {
  const { quote, template, brand, baseView, kept } = data   /* (REG-565) `kept` = an earlier version, read-only */
  const compare = data.compare ?? null   /* (S44F — NB-02 (c)) a version compared with an earlier one: read-only, the marks always on */
  const fixed = !!kept || !!compare   // nothing here changes the quote or sends it
  const router = useRouter()
  const tplLock = usePlanLock('template_editor')   // (pending modules S19) picking a template is Pro
  const snackbar = useSnackbar()
  const design = useMemo(() => template?.design ?? fallbackDesignClient(), [template])
  const [view, setView] = useState<ClientView>(data.view)
  /* (S44Q — row 352) a template changed or moved (the picker here, or elsewhere): the view the server carried over is the one to show */
  const tplKey = `${quote.templateId ?? ''}:${quote.templateVersion ?? ''}`
  const [seenTpl, setSeenTpl] = useState(tplKey)
  if (tplKey !== seenTpl) { setSeenTpl(tplKey); setView(data.view) }
  const [internal, setInternal] = useState(false)
  const [panel, setPanel] = useState(openPanel && !data.kept && !readOnly)
  const tabletDown = useMediaQuery(TABLET_DOWN)
  const sheet = useSheetLayout()
  /* (K3 — P-05) the phone's reading layout and the touch widths' one-line bar; printing always draws the paper as the desk does */
  const phone = sheet && !print
  const touch = tabletDown && !print
  const [paper, setPaper] = useState(paperAsked)
  const mounted = useMounted()
  /* the house viewer fits the pages to its own body and asks for the zoom the fingers want (K4 · K3): the width to draw at → the document's zoom */
  const [fitW, setFitW] = useState(0)
  const onFit = useCallback((w: number) => setFitW(w), [])
  const [pickerOpen, setPickerOpen] = useState(false)   /* (REG-496) the template chip opens the picker; a change re-pins and re-renders */
  const [status, setStatus] = useState(quote.status)
  const [busy, setBusy] = useState(false)
  const ready = useMemo(() => readiness(data.data, design, view), [data.data, design, view])
  const totals = useMemo(() => docTotals(data.data), [data.data])
  const versionQuery = [kept ? `version=${kept.version}` : '', compare ? `against=${compare.against}` : ''].filter(Boolean).join('&')
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/quotes/${quote.id}/preview${versionQuery ? `?${versionQuery}` : ''}`
  /* (S44F — NB-02 (c)) the comparison draws the marks against its version whatever the quote's own client view says */
  const shownView = useMemo<ClientView>(() => (compare ? { ...view, changes: true, changesSince: 'last' } : view), [compare, view])
  const compareHref = (against: number | null) => { const q = [kept ? `version=${kept.version}` : '', against ? `against=${against}` : ''].filter(Boolean).join('&'); return withFrom(`/quotes/${quote.id}/preview${q ? `?${q}` : ''}`, from) }
  const { copied, copy } = useCopy(link, { done: 'Preview link copied' })
  /* (K3 — P-05) the phone's reading cards: the print's own sections (as the confirmation page reads them); null = the template prints no Items block */
  const reading = useMemo(() => (phone ? readingSections(design, data.data, shownView) : null), [phone, design, data.data, shownView])
  const lineCount = reading ? reading.sections.reduce((n, s) => n + s.lines.length, 0) : 0
  /* the phone's viewer: over the cards, after hydration (a portal); a template with no Items block to read draws its paper in the column instead */
  const viewerOpen = phone && !!reading && paper && mounted
  /* "As printed" writes `?paper=1` into the address without a round trip, so a reload lands where the person was (REG-465); closing a viewer
     the person ARRIVED on (the Quote screen's "As printed") goes back to the quote — the viewer's arrow says so — never to a page they never saw */
  const [openedHere, setOpenedHere] = useState(false)
  const togglePaper = (on: boolean) => {
    setPaper(on)
    if (on) setOpenedHere(true)
    const u = new URL(window.location.href)
    if (on) u.searchParams.set('paper', '1'); else u.searchParams.delete('paper')
    window.history.replaceState(window.history.state, '', u.toString())
  }

  /* The quote's switches autosave 600ms after the last change, as the difference from the template's own view.
     (S44Q — row 352) …and a change still waiting when the page is left (Back, a crumb, the editor, closing the tab) is written then — it was
     dropped with the timer. The tab's own close asks only while one is waiting. */
  const saved = useRef(JSON.stringify(data.view))
  useEffect(() => { saved.current = JSON.stringify(data.view) }, [data.view])   // what the server holds now (before the autosave below reads it)
  const pendingView = useRef<ClientView | null>(null)
  const flushView = useCallback(() => {
    const v = pendingView.current
    if (!v) return
    pendingView.current = null
    const json = JSON.stringify(v)
    void saveQuoteClientView(quote.id, v).then(() => { saved.current = json }, () => snackbar({ message: 'Couldn’t save the client view — please try again' }))
  }, [quote.id, snackbar])
  useEffect(() => {
    const json = JSON.stringify(view)
    if (json === saved.current) { pendingView.current = null; return }
    pendingView.current = view
    const t = setTimeout(flushView, 600)
    return () => clearTimeout(t)
  }, [view, flushView])
  useEffect(() => {
    const ask = (e: BeforeUnloadEvent) => { if (pendingView.current) { flushView(); e.preventDefault() } }
    window.addEventListener('beforeunload', ask)
    return () => { window.removeEventListener('beforeunload', ask); flushView() }   // leaving inside the app: write what waits
  }, [flushView])

  /* Fit the page to the column, never above 1:1. (K3 — C-18) A touch tablet draws it at 1:1 and the stage scrolls its margins, centred. */
  const areaRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pageW = mm(PAPER_MM[design.page.paper].w)
  const zoom = print ? 1 : touch ? 1 : areaW ? Math.min(1, Math.max(0.3, (areaW - 48) / pageW)) : 0.9
  const [pages, setPages] = useState(0)
  const onPaginated = useCallback((p: Paginated) => setPages(p.pages), [])
  /* centred as it lays out (the stage can still be hidden under the ghost when the pages land, so a size change recentres it) — until the
     person scrolls it themselves */
  const scrolledByHand = useRef(false)
  useEffect(() => {
    const el = stageRef.current
    if (!touch || phone || !el) return
    scrolledByHand.current = false
    const centre = () => { if (!scrolledByHand.current) el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2) }   // the text in the middle, the two margins cut evenly
    const byHand = () => { scrolledByHand.current = true }
    const ro = new ResizeObserver(centre)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    el.addEventListener('touchstart', byHand, { passive: true }); el.addEventListener('wheel', byHand, { passive: true }); el.addEventListener('pointerdown', byHand, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('touchstart', byHand); el.removeEventListener('wheel', byHand); el.removeEventListener('pointerdown', byHand) }
  }, [touch, phone])
  const printed = useRef(false)
  /* (pending modules S11) the document fonts load when first used: the print waits for them, so the PDF is set in the template's face */
  const printTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { if (print && pages > 0 && !printed.current) { printed.current = true; printTimer.current = setTimeout(() => { void (document.fonts?.ready ?? Promise.resolve()).then(() => printPaper()) }, 300) } }, [print, pages])   // a re-measure (a font landing) never cancels the print once asked
  useEffect(() => () => { if (printTimer.current) clearTimeout(printTimer.current) }, [])

  const moneyHref = quote.project ? `/projects/${quote.project.id}/money` : null
  const back = readOnly ? (from ?? moneyHref ?? '/company/finance') : withFrom(`/quotes/${quote.id}`, from)
  const here = withFrom(`/quotes/${quote.id}/preview`, from)
  const closeViewer = () => { if (paperAsked && !openedHere) router.push(back); else togglePaper(false) }
  /* (UX audit S1) An issue fixed outside the quote opens its own page (Company › Profile), with the way back here; the rest open the editor at the section. */
  const openIssue = (i: ReadinessIssue) => router.push(i.href ? withFrom(i.href, here) : `${back}${back.includes('?') ? '&' : '?'}section=${SECTION_ANCHOR[i.section]}`)
  /* (UX audit Q2, extends REG-657) Preview's main button is the editor's Send ▾ — the same menu, the same dialogs; "Mark as sent" is its
     last row now, "Sent it another way". */
  const quoteSend = useQuoteSend({
    quote: { id: quote.id, number: quote.number, leadId: quote.leadId, version: quote.version, confirmToken: quote.confirmToken }, status: status as QuoteStatus,
    lead: { name: data.data.client.name, phone: data.data.client.phone }, studioName: data.data.studio.name,
    approval: sendCtx.approval, canApprove: sendCtx.canApprove, readiness: ready, onShowIssue: openIssue,
    onChange: (c) => { setStatus(c.status); router.refresh() },
    contractFrom: here,
    variation: quote.kind === 'variation' ? { change: signedMoney(quote.amountMinor ?? 0) } : null,   // (Projects round 5)
    changes: data.summary ?? null,   // (S44F — NB-02 (b)) the revised quote's message says what changed, in the client's words
  })
  const changed = clientViewDiff(view, baseView).length
  /* (REG-595) On a revision: what changed since the kept version — on by default, off for a clean copy.
     (S44F — NB-01) Past version 2: since the last version (as always) or every version since the first, each in its colour with a key. */
  const all = view.changesSince === 'all' && quote.version > 2
  const counts = all ? data.chain ?? null : data.changes
  const changesRows = quote.version > 1 ? (
    <>
      <label className={styles.row}><span className={styles.rowText}><span>Show changes from version {all ? 1 : quote.version - 1}</span><span className={styles.rowHelp}>{counts ? `${counts.added} added · ${counts.removed} removed · ${counts.changed} changed` : 'Removed lines struck through, new lines marked'}</span></span><Switch size="sm" isSelected={view.changes} onChange={(v: boolean) => setView((x) => ({ ...x, changes: v }))} aria-label="Show changes from the last version" /></label>
      {quote.version > 2 && view.changes ? (
        <div className={styles.hidden}>
          <TextField label="Changes" mode="select" value={CHANGES_SINCE[view.changesSince === 'all' ? 'all' : 'last']} options={Object.values(CHANGES_SINCE)} helper="Every version: each version’s marks in its own colour, with a key"
                     onChange={(v) => setView((x) => ({ ...x, changesSince: v === CHANGES_SINCE.all ? 'all' : 'last' }))} />
        </div>
      ) : null}
    </>
  ) : null

  /* (REG-518) The picker's selection lives here; the dialog footer acts on it. */
  const [pickedTpl, setPickedTpl] = useState<string | null>(null)
  const pickerSel = defaultPick(data.picker, pickedTpl, template?.id ?? null)
  const applyTemplate = (id: string) => { setPickerOpen(false); setPickedTpl(null); setBusy(true); void setQuoteTemplate(quote.id, id).then(() => { snackbar({ message: 'Template changed' }); router.refresh() }).catch(() => snackbar({ message: 'Couldn’t change the template — please try again' })).finally(() => setBusy(false)) }
  const openPicker = () => { if (tplLock.locked) { tplLock.open(); return } setPickerOpen(true) }

  /* (K3 — C-20) Share PDF on a phone: the file through the system share sheet once a PDF renderer is plugged in (lib/services/pdf.ts, the S34
     registry); until then the print sheet, which shares the PDF on iOS and saves it on Android — the same stand-in as Download. */
  const sharePdf = async () => {
    if (PDF_DOWNLOADS && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const path = paperPath(`${window.location.pathname}${window.location.search}`)
      if (path) {
        try {
          const blob = await (await fetch(`/papers/pdf?path=${encodeURIComponent(path)}`)).blob()
          const file = new File([blob], `${quote.number}.pdf`, { type: 'application/pdf' })
          if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: quote.number }); return }
        } catch { /* the sheet was closed, or the file could not be made — the print sheet below still can */ }
      }
    }
    printPaper()
  }
  /* (K3 — C-17 · C-20) the touch widths' ⋮: what the desk's bar lays out as four buttons and a switch */
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = (
    <span className={header.anchor}>
      <Tooltip label="More"><IconButton icon="more_vert" label="More" size={36} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} data-testid="preview-more" /></Tooltip>
      <Dropdown open={menuOpen} onClose={() => setMenuOpen(false)} align="right" width={MENU_WIDTH.detail} sheetTitle="Preview" sheetSubtitle={quote.number}>
        <DropdownItem onSelect={() => { setMenuOpen(false); void copy() }} help="For the team — it opens with a sign-in, never for the client">Copy preview link</DropdownItem>
        <DropdownItem onSelect={() => { setMenuOpen(false); void sharePdf() }} help="Through WhatsApp, mail or AirDrop">Share PDF</DropdownItem>
        {(costs || (!fixed && !readOnly)) ? <DropdownDivider /> : null}
        {costs ? <DropdownItem role="menuitemcheckbox" checked={internal} onSelect={() => { setMenuOpen(false); setInternal((v) => !v) }} help="Cost and margin on the page — never printed for the client">Internal copy</DropdownItem> : null}
        {!fixed && !readOnly ? <DropdownItem onSelect={() => { setMenuOpen(false); setPanel(true) }} help={changed ? `${changed} setting${changed === 1 ? '' : 's'} differ from the template` : 'Columns, descriptions, the schedule, the terms'}>What your client sees</DropdownItem> : null}
        {!fixed && !readOnly ? <DropdownItem onSelect={() => { setMenuOpen(false); openPicker() }} help={template ? `${template.name} · v${template.version}` : 'Studio default'}>Change template</DropdownItem> : null}
        {fixed && !readOnly && !(compare && !kept) ? <DropdownItem onSelect={() => { setMenuOpen(false); router.push(withFrom(`/quotes/${quote.id}/preview`, from)) }} help={kept ? `This is version ${kept.version} of ${kept.current}` : undefined}>Open the current version</DropdownItem> : null}
      </Dropdown>
    </span>
  )
  const backLabel = readOnly ? 'Back' : 'Back to the quote'
  const barTitle = kept ? `Version ${kept.version}` : compare ? `Version ${compare.version}` : 'Preview'
  const barSub = kept ? `Read-only · ${quote.number}` : compare ? `Compared with version ${compare.against}` : [quote.number, status, pages ? `${pages} page${pages === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')
  /* the quote's Send ▾ — in the bar on a tablet, in the foot on a phone (the thumb's reach, as the Quote screen's) */
  const sendSlot = readOnly || (compare && !kept) ? null /* (S44F) comparing the current version: the card's Stop comparing is the way back */ : fixed ? <Button onPress={() => router.push(withFrom(`/quotes/${quote.id}/preview`, from))}>Current version</Button>
    /* (sweep S1) this press sends nothing — no link, no WhatsApp — it records that the quote went out; the editor's Send ▾ sends */
    : <SendButton kind={quoteSend.kind} canSend={quoteSend.canSend && !busy} hint={quoteSend.hint} status={status} onSend={quoteSend.send} variation={quote.kind === 'variation'} />
  const touchBar = (
    <header className={styles.touchBar} data-testid="preview-bar">
      <Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} size={36} variant="bare" iconSize={24} iconWeight={300} onClick={() => router.push(back)} data-kb="back" /></Tooltip>
      <div className={styles.touchTitle}>
        <h1 className={styles.touchH}>{barTitle}</h1>
        <span className={styles.touchSub} data-testid="preview-sub">{barSub}</span>
      </div>
      {!phone ? <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={() => printPaper()} data-testid="preview-download" /></Tooltip> : null}   {/* a phone downloads from the viewer's own bar */}
      {menu}
      {!phone && sendSlot ? <span className={`${header.anchor} ${styles.barSend}`}>{sendSlot}</span> : null}
    </header>
  )
  const cards = (
    <>
      {kept ? (
        /* (REG-565) A kept version: what it was when Revise moved the quote on, and the way to the current one. */
        <section className={styles.readiness} aria-label="Kept version" data-testid="kept-version">
          <div className={styles.readyHead}>
            <Icon name="history" size={20} weight={300} />
            <span className={styles.readyTitle}>Version {kept.version} of {kept.current} — read-only</span>
          </div>
          <ul className={styles.issues}>
            <li className={styles.issue}>
              <span className={styles.issueText}><b>Kept on {displayDate(kept.at)}{kept.by ? ` by ${kept.by.name}` : ''}</b> <span className={styles.issueDetail}>It was {kept.status} at {money2(kept.amountMinor)}{kept.note ? ` · the client’s request: ${kept.note}` : ''}. Version {kept.current} is the one being worked on.</span></span>
              <Button appearance="text" onPress={() => router.push(withFrom(`/quotes/${quote.id}/preview`, from))}>Open version {kept.current}</Button>
            </li>
          </ul>
        </section>
      ) : null}
      {compare ? (
        /* (S44F — NB-02 (c)) one version against an earlier one: what moved, which version to compare with, and the way out */
        <section className={styles.readiness} aria-label="Comparison" data-testid="compare-version">
          <div className={styles.readyHead}>
            <Icon name="compare" size={20} weight={300} />
            <span className={styles.readyTitle}>Version {compare.version} compared with version {compare.against}</span>
          </div>
          <ul className={styles.issues}>
            <li className={`${styles.issue} ${styles.compareRow}`}>
              <span className={styles.issueText}><b data-testid="compare-counts">{compare.counts.added} added · {compare.counts.removed} removed · {compare.counts.changed} changed{compare.counts.schedule ? ` · ${compare.counts.schedule} in the payment schedule` : ''}</b> <span className={styles.issueDetail}>Removed lines are struck through, new and changed ones marked — here only. Your client sees the quote as What your client sees says.</span></span>
              {compare.options.length > 1 ? (
                <span className={styles.compareWith}>
                  <TextField label="Compare with" mode="select" value={`Version ${compare.against}`} options={compare.options.map((v) => `Version ${v}`)}
                             onChange={(v) => { const n = Number(v.replace(/\D+/g, '')); if (n && n !== compare.against) router.push(compareHref(n)) }} />
                </span>
              ) : null}
              <Button appearance="text" onPress={() => router.push(compareHref(null))} data-testid="stop-comparing">Stop comparing</Button>
            </li>
          </ul>
        </section>
      ) : null}
      {ready.issues.length && !fixed && !readOnly ? (   /* (pending modules S06) "before you send" is for whoever sends it */
        <section className={styles.readiness} data-blocking={!ready.ready || undefined} aria-label="Before you send">
          <div className={styles.readyHead}>
            <Icon name={ready.ready ? 'warning' : 'error'} size={20} weight={300} />
            <span className={styles.readyTitle}>{ready.ready ? 'Worth a look before you send' : 'Not ready to send yet'}</span>
          </div>
          <ul className={styles.issues}>
            {ready.issues.map((i) => (
              <li key={i.key} className={styles.issue} data-blocking={i.blocking || undefined}>
                <span className={styles.issueText}><b>{i.label}</b> <span className={styles.issueDetail}>{i.detail}</span></span>
                <Button appearance="text" onPress={() => openIssue(i)}>Open</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {internal && costs ? (
        <section className={styles.internalCard} aria-label="Internal summary">
          <span className={styles.internalEyebrow}>Internal — never printed for the client</span>
          <div className={styles.internalGrid}>
            <span><span className={styles.internalLabel}>Cost</span><span className={styles.internalValue}>{money2(totals.costMinor)}</span></span>
            <span><span className={styles.internalLabel}>Selling</span><span className={styles.internalValue}>{money2(totals.subtotalMinor - totals.additionalMinor)}</span></span>
            <span><span className={styles.internalLabel}>Margin</span><span className={styles.internalValue}>{money2(totals.marginMinor)} · {pct(Math.round(totals.marginPct))}</span></span>
            <span><span className={styles.internalLabel}>Lines</span><span className={styles.internalValue}>{totals.itemCount}</span></span>
          </div>
        </section>
      ) : null}
    </>
  )
  const overlays = (
    <>
      {quoteSend.dialogs}
      <Dialog open={pickerOpen} onClose={() => { setPickerOpen(false); setPickedTpl(null) }} title="Choose a template" size="modal" width={1200} portal subtitle="The quote keeps its lines; the template decides how they print."
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => { setPickerOpen(false); setPickedTpl(null) }}>Cancel</Button><Button onPress={() => { if (pickerSel) applyTemplate(pickerSel) }} isDisabled={!pickerSel || pickerSel === (template?.id ?? null)}>{pickerSel && pickerSel === template?.id ? 'On this quote' : 'Use this template'}</Button></>}>
        <TemplatePicker data={data.picker} picked={pickerSel} onPick={setPickedTpl} currentId={template?.id ?? null} now={data.now} onUse={applyTemplate} />
      </Dialog>
      {tabletDown ? (
        /* (REG-525) ≤1024 the panel is the house Drawer (scrim, Esc, focus), as the template editor's panes are — not a hand-rolled fixed column. */
        <Drawer open={panel} onClose={() => setPanel(false)} title="What your client sees" label="What your client sees">
          <div className={styles.drawerBody}>
            <ClientViewPanel quoteId={quote.id} view={view} setView={setView} baseView={baseView} changed={changed} changesRows={changesRows} chips />   {/* (K3 — C-19) the Columns as chips, the rows at 48 */}
          </div>
        </Drawer>
      ) : null}
    </>
  )

  /* (sweep S1 #27) The page's own ghost holds the first beat, like every page (PageReveal); printing skips it — a ghost is never printed. */
  const page = touch ? (
    /* (K3 — P-05) the touch widths: the one-line bar; a phone reads the cards or the viewer and sends from the foot; a tablet reads the A4 at 1:1 */
    <div className={styles.page} data-touch="" data-testid="quote-preview">
      <style>{`@page { size: ${design.page.paper}; margin: 0 }`}</style>
      {touchBar}
      {overlays}
      <div className={styles.body}>
        <div ref={areaRef} className={styles.column}>
          {cards}
          {phone && reading ? (
            <div className={styles.reading}>
              {/* the cards' head: the count, and the way to the paper — the confirmation page's own row (quote-stage.tsx) and the Quote screen's */}
              <div className={styles.readHead}>
                <span className={styles.readCount}>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                <Button appearance="text" iconStart={<Icon name="description" size={20} />} onPress={() => togglePaper(true)} data-testid="view-as-printed">As printed</Button>
              </div>
              <ReadingCards sections={reading.sections} optional={reading.optional} amounts={reading.amounts} totalMinor={totals.totalMinor} after={reading.after} afterTitle={reading.afterTitle} schedule={reading.schedule} />
            </div>
          ) : (
            <div ref={stageRef} className={styles.stage}>
              <TemplateDocument design={design} brand={brand} data={data.data} view={shownView} zoom={zoom} onPaginated={onPaginated} watermark={internal && costs ? 'Internal copy' : null} print={print} />
            </div>
          )}
        </div>
      </div>
      {phone && sendSlot ? <div className={styles.foot} data-testid="preview-foot"><span className={header.anchor}>{sendSlot}</span></div> : null}
      {/* (K3 — P-05 · Q-06) the house "As printed" viewer over the cards: the A4 fit to the width, one page per swipe, pinch to zoom, Download in its bar */}
      {phone && reading ? (
        <PaperViewer open={viewerOpen} onClose={closeViewer} title="As printed" subtitle={`${quote.number}${pages ? ` · ${pages} ${pages === 1 ? 'page' : 'pages'}` : ''}`} onDownload={() => printPaper()} onFit={onFit}>
          <div className={styles.viewerDoc}><TemplateDocument design={design} brand={brand} data={data.data} view={shownView} zoom={fitW ? Math.max(0.3, fitW / pageW) : 0.45} onPaginated={onPaginated} watermark={internal && costs ? 'Internal copy' : null} /></div>
        </PaperViewer>
      ) : null}
    </div>
  ) : (
    <div className={styles.page} data-print={print || undefined} data-testid="quote-preview">
      <style>{`@page { size: ${design.page.paper}; margin: 0 }`}</style>
      <header className={styles.bar}>
        <Tooltip label={readOnly ? 'Back' : 'Back to the editor'}><IconButton icon="arrow_back" label={readOnly ? 'Back' : 'Back to the editor'} size={36} variant="bare" iconSize={24} iconWeight={300} onClick={() => router.push(back)} /></Tooltip>
        <div className={styles.titleBlock}>
          <Crumbs className={styles.crumb} items={readOnly ? (quote.project ? [{ label: quote.project.name, href: moneyHref ?? undefined }, { label: 'Money', href: moneyHref ?? undefined }, { label: quote.number }] : [{ label: quote.number }])   /* (pending modules S06) only where they open */
            : quote.project ? [{ label: 'Projects', href: '/projects' }, { label: quote.project.name, href: `/projects/${quote.project.id}` }, { label: 'Money', href: `/projects/${quote.project.id}/money` }, { label: quote.number, href: back }] : [{ label: quote.leadName, href: `/leads/${quote.leadId}/quotes` }, { label: quote.number, href: back }]} />   {/* (REG-536); (fix-D, D-44) a variation order's trail is its project's, as in the editor */}
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{kept ? `Version ${kept.version}` : compare ? `Version ${compare.version}` : 'Preview'}</h1>
            <span className={styles.chips}>
              {fixed ? <MetaChip>Read-only</MetaChip> : null}
              {/* (REG-729) The template as the house tag (MetaChip), a press that opens the picker — the editor header's contract chip. */}
              {readOnly ? <MetaChip icon="style" className={styles.templateChip}>{template ? `${template.name} · v${template.version}` : 'Studio default'}</MetaChip> : <Tooltip label="Change template">
                <button type="button" className={styles.chipBtn} onClick={openPicker} aria-haspopup="dialog" aria-label={tplLock.locked ? 'Change template, Pro feature' : 'Change template'}><MetaChip icon="style" className={styles.templateChip}>{template ? `${template.name} · v${template.version}` : 'Studio default'}</MetaChip></button>
              </Tooltip>}
              <MetaChip>{status}</MetaChip>
              {pages ? <MetaChip>{pages} page{pages === 1 ? '' : 's'}</MetaChip> : null}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          {costs ? <label className={styles.internal}><Switch size="sm" isSelected={internal} onChange={(v: boolean) => setInternal(v)} aria-label="Internal copy" /> Internal copy</label> : null}
          {fixed || readOnly ? null : <Button appearance="outlined" variant="secondary" iconStart={<Icon name="visibility" size={20} />} onPress={() => setPanel((o) => !o)} aria-pressed={panel}>What your client sees{changed ? ` · ${changed}` : ''}</Button>}
          <Button appearance="outlined" variant="secondary" iconStart={<Icon name={copied ? 'check' : 'link'} size={20} />} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy link'}</Button>
          <Button appearance="outlined" variant="secondary" iconStart={<Icon name="download" size={20} />} onPress={() => printPaper()}>Download PDF</Button>
          {readOnly || (compare && !kept) ? null /* (S44F) comparing the current version: the bar's Stop comparing is the way back */ : fixed ? <Button onPress={() => router.push(withFrom(`/quotes/${quote.id}/preview`, from))}>Current version</Button>
            /* (sweep S1) this press sends nothing — no link, no WhatsApp — it records that the quote went out; the editor's Send ▾ sends */
            : <span className={header.anchor}><SendButton kind={quoteSend.kind} canSend={quoteSend.canSend && !busy} hint={quoteSend.hint} status={status} onSend={quoteSend.send} variation={quote.kind === 'variation'} /></span>}
        </div>
      </header>
      {overlays}
      <div className={styles.body}>
        <div ref={areaRef} className={styles.column}>
          {cards}
          <div className={styles.stage}>
            <TemplateDocument design={design} brand={brand} data={data.data} view={shownView} zoom={zoom} onPaginated={onPaginated} watermark={internal && costs ? 'Internal copy' : null} print={print} />
          </div>
        </div>
        {panel && !tabletDown ? (
          <aside className={styles.panel} aria-label="What your client sees">
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>What your client sees</span>
              <Tooltip label="Close"><IconButton icon="close" label="Close" size={24} variant="bare" iconSize={24} iconFamily="outlined" onClick={() => setPanel(false)} /></Tooltip>   {/* (REG-729) the house close: the 24 outlined glyph (the Drawer's) */}
            </div>
            <ClientViewPanel quoteId={quote.id} view={view} setView={setView} baseView={baseView} changed={changed} changesRows={changesRows} />
          </aside>
        ) : null}
      </div>
    </div>
  )
  return print ? page : <PageReveal skeleton={<PreviewSkeleton />}>{page}</PageReveal>
}
