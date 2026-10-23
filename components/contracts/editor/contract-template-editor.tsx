'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { MetaChip } from '@/components/om/meta-chip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { useRememberContractPdf } from './contract-route-ghost'   // (S42 B-17)
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useFlagPref } from '@/lib/prefs'
import { TABLET_DOWN, TABLET_LANDSCAPE, useMediaQuery } from '@/lib/breakpoint'
import { Drawer } from '@/components/om/drawer'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { backLabel as backLabelOf } from '@/lib/nav'
import { savedLabel } from '@/lib/contracts/model'
import { insertSignFieldAfter, isBlankDoc, outlineOf, placeWords, SIGN_LABEL, signFieldsIn, signFieldsSummary, tokensIn, TOKEN_LABEL, type SignKey, type SignPlaceRow } from '@/lib/contracts/tokens'
import { Icon } from '@/components/om/icon'
import bannerStyles from '@/components/quotes/editor/template-bar.module.css'
import type { ContractTemplateEditorData } from '@/lib/contracts/queries'
import { deleteContractTemplate, duplicateContractTemplate, replacePdfTemplate, saveContractTemplate, setDefaultContractTemplate, setHandoverContractTemplate } from '@/app/company/contract-templates-actions'
import { useRun } from '@/components/leads/tasks/use-run'
import { SectionScreen } from '@/components/contracts/screen/section-screen'
import { DocumentFrame } from '@/components/contracts/screen/document-frame'
import { SignatureFieldsPanel } from '@/components/contracts/document/signature-fields-panel'
import { BeforeSigningPanel } from '@/components/contracts/document/before-signing-panel'
import { TemplateReadingScreen, type TemplateMenuAction } from '@/components/contracts/template-screen/template-screen'
import { TemplateGhost } from '@/components/contracts/template-screen/template-ghost'
import { clauseRows, gatesWords, statusWords, type ClauseRow } from '@/components/contracts/template-screen/template-words'
import moveStyles from '@/components/contracts/template-screen/template-screen.module.css'
import docStyles from '@/components/contracts/document/document.module.css'
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import { isPdfRefusal, readPickedPdf } from '@/components/contracts/read-pdf'
import { PDF_ACCEPT } from '@/lib/contracts/pdf'
import { isRefusal } from '@/lib/company/template-rules'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ContractHeader } from './contract-header'
import { DocEditor, IDLE_STATE, type DocEditorHandle, type DocState } from './doc-editor'
import { DocToolbar } from './doc-toolbar'
import { useWritingHelp } from '@/components/writing/writing-help'
import { docParts } from '@/lib/writing/propose'
import { OutlinePane } from './outline-pane'
import { ESignPanel } from './esign-panel'
import { TitleInput } from './title-input'
import styles from './contract-editor.module.css'

const AUTOSAVE_MS = 600
/** (Contracts on the move, P-10) The template's screens on the move, by the address: the paper on a heading, its signature fields, its rules. */
const MOVE_KEYS = ['document', 'fields', 'gates'] as const
type MoveKey = (typeof MOVE_KEYS)[number]
const isMoveKey = (k: string | null): k is MoveKey => !!k && (MOVE_KEYS as readonly string[]).includes(k)

/**
 * The contract template editor (REG-534): the contract editor with no recipient, date, status or Send — the document and
 * its inserted fields, saved to the library. Header: "Company / Templates / Contracts" over the title · "Used by n" ·
 * Saved · Done (back) · kebab (Duplicate · Delete) · ✕.
 * (Contracts on the move, P-10 · C-09 · C-12 · C-18 — his "please check and built accordingly" 2026-10-22) On a phone and a touch tablet
 * (≤1024) the template opens as its READING SCREEN (components/contracts/template-screen): the status row, the clauses as rows, Signature
 * fields and Before the client signs as rows. A clause row opens the paper full-screen on that heading in C1's Document frame (`?edit=document&at=<i>`)
 * with C2's one tool row; the two signing rows open their screens (`?edit=fields` · `?edit=gates`) with C2's panels. The address moves by the
 * browser's own history, so Back works (REG-465); every change autosaves as on the desk. The desk (≥1025) is untouched.
 */
export function ContractTemplateEditor({ data, from, defaultBlock = null }: { data: ContractTemplateEditorData; from?: string
  /** (P-10) Why this viewer may not set the default or the handover letter (an Owner or an Admin may), else null — the gallery's rule. */
  defaultBlock?: string | null }) {
  const { template, usedBy, now, values, changeBlock } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const editor = useRef<DocEditorHandle>(null)
  const [title, setTitle] = useState(template.title)
  const [body, setBody] = useState(template.body)
  const [updatedAt, setUpdatedAt] = useState(template.updatedAt.getTime())
  const [clock, setClock] = useState(now)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const [docState, setDocState] = useState<DocState>(IDLE_STATE)
  const [outlinePref, setOutlinePref] = useFlagPref('om.contracts.outline', true)
  const narrow = useMediaQuery(TABLET_DOWN)   // (sweep S2 #19) ≤1024 the Outline is a drawer, as in the contract editor (REG-634, E-114) — the pane toggled and showed nothing
  const [outlineDrawer, setOutlineDrawer] = useState(false)
  const [esign, setEsign] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const fabRef = useRef<HTMLSpanElement>(null)
  const [gates, setGates] = useState({ requiresScroll: template.requiresScroll, requiresAccept: template.requiresAccept, acceptLabel: template.acceptLabel })   // (REG-633, parity Q-15)
  /* (pending modules S03 — 1.0's signing library) a standard PDF: its file in the paper's place, Replace, and the tick before the client signs */
  const pdf = template.kind === 'pdf'
  useRememberContractPdf(template.id, pdf)   // (S42 B-17) the loader's shape next time
  /* (pending modules S29) Write with AI on the template's words — Improve · Shorten · Plain English (a template has no template of its own to
     add from), on your selection, the clause at the caret or the whole template; a proposal first, Undo after */
  const writing = useWritingHelp({
    label: 'Template', subject: title.trim() || undefined, kind: 'contract', trigger: 'text', compact: true, disabled: pdf, testId: 'contract-writing', sources: {},
    read: () => { const at = editor.current?.partAt(); return at && at.blocks.length ? { html: at.blocks.join(''), parts: docParts(at.blocks, at).map((x) => (x.key === 'whole' ? { ...x, label: 'The whole template' } : x)) } : { html: body } },
    apply: (h, part) => { if (part && part.key !== 'whole') editor.current?.replaceBlocks(part.from, part.to, h); else editor.current?.replaceAll(h) },
    restore: (h) => editor.current?.replaceAll(h),
  })
  const [fileName, setFileName] = useState(template.fileName ?? template.title)
  const [version, setVersion] = useState(template.updatedAt.getTime())
  const pdfInput = useRef<HTMLInputElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const replace = async (f: File) => {
    setPdfBusy(true)
    try {
      const r = await readPickedPdf(f)
      if (isPdfRefusal(r)) { snackbar({ message: r.error }); return }
      const a = await replacePdfTemplate(template.id, { file: r })
      if (isRefusal(a)) { snackbar({ message: couldnt('replace the PDF', refusalOf(a.error)) }); return }
      setFileName(a.fileName); const t = Date.now(); setVersion(t); setUpdatedAt(t); snackbar({ message: `${a.fileName} replaces the PDF — leads that already have it keep their copy` })
    } catch { snackbar({ message: 'Couldn’t replace the PDF — please try again' }) } finally { setPdfBusy(false) }
  }

  type Patch = { title?: string; body?: string; requiresScroll?: boolean; requiresAccept?: boolean; acceptLabel?: string | null }
  const dirty = useRef<Patch>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const patch = dirty.current
    if (!Object.keys(patch).length) return
    dirty.current = {}
    /* (audit 2026-09-26, E7) a refusal answers with its rule — say it whole */
    try { const r = await saveContractTemplate(template.id, patch); if (isRefusal(r)) snackbar({ message: couldnt('save the template', refusalOf(r.error)) }); else setUpdatedAt(r) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback((patch: Patch) => {
    dirty.current = { ...dirty.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS)
  }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  /* (REG-634, contracts parity E-132) Closing the tab within the autosave's wait still saves — the contract editor's flush. */
  useEffect(() => {
    const onHide = () => { void flushRef.current() }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])
  const outline = useMemo(() => outlineOf(body), [body])
  /* (UX audit C4) A template with nowhere for the client to sign starts contracts that can never be sent — said while it is being written. */
  const noClientSign = useMemo(() => !pdf && !isBlankDoc(body) && !signFieldsIn(body).includes('client-signature'), [body, pdf])
  const backHref = from ?? '/company/templates/contracts'
  const close = () => { void flushRef.current(); router.push(backHref) }

  /* ── (Contracts on the move, P-10) ≤1024: the reading screen, and the screen the address opens over it ── */
  const searchParams = useSearchParams()
  const editParam = searchParams.get('edit')
  const atParam = searchParams.get('at')
  const split = useMediaQuery(TABLET_LANDSCAPE)
  /* a PDF has no paper and no fields: only its rules open a screen */
  const openKey: MoveKey | null = narrow && isMoveKey(editParam) && (!pdf || editParam === 'gates') ? editParam : null
  const mode: 'desk' | 'read' | 'section' = !narrow ? 'desk' : openKey ? 'section' : 'read'
  const setEdit = useCallback((v: MoveKey | null, how: 'push' | 'replace', at: number | null = null) => {
    const u = new URL(window.location.href)
    if (v === null) u.searchParams.delete('edit'); else u.searchParams.set('edit', v)
    if (v === 'document' && at !== null) u.searchParams.set('at', String(at)); else u.searchParams.delete('at')
    /* our own mark on the entry (C1's rule): Back knows the screen it undoes */
    const st = { omEdit: v === null ? null : 'section' }
    if (how === 'push') window.history.pushState(st, '', `${u.pathname}${u.search}`); else window.history.replaceState(st, '', `${u.pathname}${u.search}`)
  }, [])
  const openSection = useCallback((k: MoveKey, at: number | null = null) => { void flushRef.current(); setEdit(k, 'push', at) }, [setEdit])
  const backToRead = useCallback(() => { void flushRef.current(); setOutlineDrawer(false); if (window.history.state?.omEdit === 'section') window.history.back(); else setEdit(null, 'replace') }, [setEdit])
  useScrollLock(mode === 'section')   // the reading screen behind keeps its place
  const [outlinePane, setOutlinePane] = useState(false)   // a landscape tablet's Outline: a pane at the paper's left (P-02), never a drawer over it
  /* the paper lands on the clause its row named — once per opening */
  useEffect(() => {
    if (openKey !== 'document' || atParam === null) return
    const i = Number(atParam)
    if (!Number.isInteger(i) || i < 0) return
    const t = setTimeout(() => editor.current?.scrollToHeading(i), 120)
    return () => clearTimeout(t)
  }, [openKey, atParam])
  /* the Document frame's sub-line: the clause the caret is in (C1's) */
  const [caretClause, setCaretClause] = useState<number | null>(null)
  const onDocState = useCallback((s: DocState) => {
    setDocState(s)
    const at = editor.current?.partAt()
    if (!at || at.caret === null) { setCaretClause(null); return }
    let k = 0
    for (let i = 0; i <= at.caret && i < at.blocks.length; i++) if (/^<h[123][\s>]/i.test(at.blocks[i]!)) k++
    setCaretClause(k)
  }, [])
  const saved = savedLabel(updatedAt, clock)
  const docSub = `${caretClause ? `clause ${caretClause} of ${outline.length}` : `${outline.length} ${outline.length === 1 ? 'clause' : 'clauses'}`} · ${saved.replace(/^Saved/, 'saved')}`
  const rows = useMemo(() => (pdf ? [] : clauseRows(body)), [body, pdf])
  const fieldsLine = useMemo(() => signFieldsSummary(body), [body])
  const gatesLine = gatesWords(gates, pdf)
  const status = statusWords({ isDefault: template.isDefault, useAtHandover: template.useAtHandover, kind: template.kind, usedBy, body })
  /* (P-04 on a template) a signature field placed by choosing where — its own block after that clause — and shown landing, as the contract's
     Signature fields screen does (C4's integration): the Document screen opens on it at mid-screen with the fresh pulse, "… added under
     Signatures" with Undo; ← returns to Signature fields */
  const pendingPlace = useRef<{ key: SignKey; row: SignPlaceRow } | null>(null)
  /* the paper settles after the screen opens (the letterhead's picture lands, the boxes' ✕ are placed): once it has, the new block is brought back
     to mid-screen if it drifted — the landing the person is shown */
  const recentre = () => window.setTimeout(() => { const n = document.querySelector<HTMLElement>('[data-document-frame] [data-fresh]'); if (!n) return; const r = n.getBoundingClientRect(); if (r.top < innerHeight * 0.2 || r.bottom > innerHeight * 0.8) n.scrollIntoView({ block: 'center' }) }, 650)
  const placeField = (key: SignKey, row: SignPlaceRow) => { pendingPlace.current = { key, row }; openSection('document') }
  useEffect(() => {
    if (openKey !== 'document' || !pendingPlace.current) return
    const t = setTimeout(() => {
      const p = pendingPlace.current; pendingPlace.current = null
      if (!p) return
      const r = editor.current?.insertSignFieldAt(p.row.place, p.key)
      if (r) recentre()
      if (r) { snackbar({ message: `${SIGN_LABEL[p.key]} added ${placeWords(p.row)}`, actionLabel: 'Undo', onAction: () => editor.current?.replaceAll(r.prev) }); return }
      const prev = body; const { html } = insertSignFieldAfter(body, p.row.place, p.key)
      setBody(html); queue({ body: html })
      snackbar({ message: `${SIGN_LABEL[p.key]} added ${placeWords(p.row)}`, actionLabel: 'Undo', onAction: () => { setBody(prev); queue({ body: prev }) } })
    }, 240)
    return () => clearTimeout(t)
  }, [openKey])   // eslint-disable-line react-hooks/exhaustive-deps -- once, when the Document screen opens on a field being placed
  const [renaming, setRenaming] = useState<string | null>(null)
  const doRename = () => {
    const name = renaming?.trim(); if (!name) return
    setRenaming(null); setTitle(name); queue({ title: name })
    void flushRef.current().then(() => snackbar({ message: 'Template renamed' }))
  }
  const name = title.trim() || 'Untitled template'
  const onMoveMenu = (a: TemplateMenuAction) => {
    if (a === 'rename') setRenaming(title)
    else if (a === 'default') void run('set the default', () => setDefaultContractTemplate(template.id), `${name} is the default contract template`, { refresh: true })
    else if (a === 'handover') void run(template.useAtHandover ? 'change the handover letter' : 'use it at handover', () => setHandoverContractTemplate(template.id, !template.useAtHandover), template.useAtHandover ? `${name} is no longer sent at handover` : `${name} is the completion letter at handover`, { refresh: true })
    else if (a === 'duplicate') void flushRef.current().then(() => duplicateContractTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/contracts/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' }))
    else if (a === 'replace') pdfInput.current?.click()
    else setDeleteOpen(true)
  }
  /* Maison AI's rows and the warning's fix reach the same screens on the move as the desk's drawer */
  const showSigning = () => (narrow ? openSection(pdf ? 'gates' : 'fields') : setEsign(true))
  const pdfHelp = 'Ticked in Send together, it joins the lead as a document of its own and goes out with the agreement. The client reads it and ticks to accept; one signature covers the set.'

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The template's Maison AI, by rule from the page:
     whether a contract started from it can go out (a place for the client to sign — Send's own rule), the fields it fills in and where each
     comes from, and its outline. *(invented copy: the answers' titles and lines)* */
  const used = useMemo(() => (pdf ? [] : tokensIn(body)), [body, pdf])
  const fromWhere = (k: string) => (k.startsWith('client.') || k.startsWith('lead.') ? 'From the lead' : k.startsWith('quote.') ? 'From the quote it names' : k.startsWith('studio.') ? 'From Company › Profile' : k.startsWith('date.') ? 'The contract’s date' : k.startsWith('project.') ? 'From the project, at its handover' : 'Filled in when it starts')   // (S44R, C9)
  const maison: MaisonSuggestion[] = pdf ? [
    { label: 'What does the client do with it?', answer: { title: 'Read, tick, sign once', text: `Ticked in Send together, it joins the lead as a document of its own and goes out with the agreement. ${gates.requiresAccept ? `The client ticks “${gates.acceptLabel || 'I have read and accept'}” before signing` : 'The client reads it'}${gates.requiresScroll ? ', after scrolling to its end' : ''}; one signature covers the set.`,
      rows: [{ id: 'gates', label: 'Change what comes before signing', meta: 'Before the client signs', run: showSigning }] } },
  ] : [
    { label: 'Can contracts start from it?', answer: () => Promise.resolve(isBlankDoc(body)
      ? { title: 'Not yet — it is empty', text: 'Write the agreement, or insert a field — a contract started from an empty template can’t be sent.' }
      : noClientSign
        ? { title: 'Not yet — nowhere to sign', text: 'A contract started from it can’t be sent until it has a Client signature.', rows: [{ id: 'esign', label: 'Insert a Client signature', meta: 'eSignatures', run: showSigning }] }
        : { title: 'Ready to start contracts', text: `It has a place for the client to sign${used.length ? ` and fills in ${used.length === 1 ? '1 field' : `${used.length} fields`} from the lead, the quote and the studio` : ''}. ${usedBy ? `${usedBy === 1 ? '1 contract has' : `${usedBy} contracts have`} started from it.` : 'No contract has started from it yet.'}` }) },
    { label: 'Which fields does it fill in?', answer: () => Promise.resolve(used.length
      ? { title: `${used.length === 1 ? '1 field' : `${used.length} fields`} fill in`, text: 'Each prints the lead’s, the quote’s or the studio’s own words when a contract starts from it.', rows: used.map((k) => ({ id: k, label: TOKEN_LABEL[k] ?? k, meta: fromWhere(k) })) }
      : { title: 'No fields yet', text: 'Insert a field from the formatting bar and it fills in from the lead, the quote or the studio.' }) },
    { label: 'What’s in it?', answer: () => Promise.resolve(outline.length
      ? { title: `${outline.length === 1 ? '1 heading' : `${outline.length} headings`}`, text: 'Its outline — open one to go to it.', rows: outline.map((h, i) => ({ id: `h-${i}`, label: h.text, run: () => { if (editor.current) editor.current.scrollToHeading(i); else if (narrow) openSection('document', h.index) } })) }
      : { title: 'No headings yet', text: 'Add a heading from the formatting bar and it shows here.' }) },
  ]

  return (
    <PageReveal skeleton={<TemplateGhost pdf={template.kind === 'pdf'} />}>
      <div className={styles.page} data-testid="contract-template-editor" data-mode={mode}>
        {mode === 'desk' ? (
          <>
        <ContractHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Contracts', href: '/company/templates/contracts' }]} title={title.trim() || 'Untitled template'}
                        chips={<><MetaChip>{pdf ? 'Standard PDF' : 'Template'}</MetaChip>{template.useAtHandover ? <MetaChip>At handover</MetaChip> : null}<MetaChip>{usedBy === 0 ? 'Not used yet' : `Used by ${usedBy} ${usedBy === 1 ? 'contract' : 'contracts'}`}</MetaChip></>}   /* (S44R, C9) the completion letter the Hand over sheet sends */
                        savedLabel={savedLabel(updatedAt, clock)}
                        primary={{ label: 'Done', onPress: close }}
                        menu={<>
                          <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateContractTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/contracts/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                          {pdf ? <DropdownItem onSelect={() => pdfInput.current?.click()} disabled={!!changeBlock} title={changeBlock ?? undefined}>Replace the PDF…</DropdownItem> : null}
                          <DropdownDivider />
                          {/* (sweep S2 #16) Delete is Rename's rule: its author, an Owner or an Admin — (round 3) the whole rule under the row, not a fragment with a native tooltip.
                              (REG-728) The house row prints a disabled row's rule under its label. */}
                          <DropdownItem tone="danger" disabled={!!changeBlock} title={changeBlock ?? undefined} onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                        </>}
                        onClose={close} />
        <div className={styles.meta} data-testid="contract-meta">
          <TitleInput value={title} placeholder="Template name" aria-label="Template name" maxLength={120} readOnly={!!changeBlock} title={changeBlock ?? undefined}
                      onChange={(e) => { if (changeBlock) return; setTitle(e.target.value); queue({ title: e.target.value }) }} onBlur={() => { void flushRef.current() }} />
          <div className={styles.metaEnd}>
            {/* (Dane UAT 3.19) one name for the inserted pieces — fields, as the Insert a field ▾ menu that makes them */}
            {pdf ? null : <Button variant="secondary" appearance="text" onPress={() => snackbar({ message: 'Fields fill in from the lead, the quote and your studio when a contract starts from this template' })}>How fields fill in</Button>}
          </div>
        </div>
        {noClientSign ? (
          <div className={bannerStyles.banner} role="status" data-tone="changes" data-testid="template-no-client-sign">
            <span className={bannerStyles.bannerIcon}><Icon name="warning" size={20} weight={300} /></span>
            <span className={bannerStyles.bannerText}>There’s nowhere for the client to sign — a contract started from this template can’t be sent until it has a Client signature.</span>
            <span className={bannerStyles.bannerActions}><Button variant="secondary" appearance="outlined" onPress={() => setEsign(true)}>Insert a Client signature</Button></span>
          </div>
        ) : null}
        {pdf ? null : <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign} onOutline={() => (narrow ? setOutlineDrawer((o) => !o) : setOutlinePref(!outlinePref))} outlineOpen={narrow ? outlineDrawer : outlinePref} writing={writing.trigger} />}
        <div className={styles.body}>
          {outlinePref && !narrow && !pdf ? <OutlinePane items={outline} onPick={(i) => editor.current?.scrollToHeading(i)} onClose={() => setOutlinePref(false)} /> : null}
          <div className={styles.stage}>
            {pdf ? (
              <>
                <input ref={pdfInput} type="file" accept={PDF_ACCEPT} hidden aria-hidden tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void replace(f) }} />
                <ContractPdf name={fileName} src={`/files/contract-template/${template.id}?v=${version}`} thumb={`/files/contract-template/${template.id}?thumb=1&v=${version}`}
                             help="Ticked in Send together, it joins the lead as a document of its own and goes out with the agreement. The client reads it and ticks to accept; one signature covers the set."
                             actions={<>
                               <Button variant="secondary" appearance="outlined" iconStart={<Icon name="draw" size={20} />} onPress={() => setEsign(true)}>Before the client signs</Button>
                               {changeBlock ? null : <Button variant="secondary" appearance="text" onPress={() => pdfInput.current?.click()} isDisabled={pdfBusy}>{pdfBusy ? 'Keeping…' : 'Replace'}</Button>}
                             </>} />
              </>
            ) : (
            <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
              <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={setDocState} label="Template document" placeholder="Start writing the template, or insert a field…" />
            </div>
            )}
          </div>
        </div>
          </>
        ) : (
          <>
            {/* (Contracts on the move, P-10) the reading screen — read first; a clause, the fields or the rules open over it */}
            {pdf ? <input ref={pdfInput} type="file" accept={PDF_ACCEPT} hidden aria-hidden tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void replace(f) }} /> : null}
            <TemplateReadingScreen inert={mode === 'section'} title={name} subtitle={saved} status={status} onFixSigning={() => openSection('fields')}
                                   pdf={pdf ? { src: `/files/contract-template/${template.id}?v=${version}`, thumb: `/files/contract-template/${template.id}?thumb=1&v=${version}`, name: fileName, help: pdfHelp } : null}
                                   clauses={rows} signatures={pdf ? null : fieldsLine} gates={gatesLine}
                                   onBack={close} backLabel={backLabelOf(from, { fallback: 'Back to Templates' })}
                                   onOpenClause={(r: ClauseRow) => openSection('document', r.index)} onOpenFields={() => openSection('fields')} onOpenGates={() => openSection('gates')}
                                   menu={{ isDefault: template.isDefault, useAtHandover: template.useAtHandover, pdf, changeBlock, defaultBlock }} onMenu={onMoveMenu} />
            {openKey === 'document' ? (
              /* (P-03 · C-12) the paper full-screen in C1's frame, landed on the clause its row named; C2's one tool row and the paper are its content */
              <DocumentFrame subtitle={docSub} onBack={backToRead} onDone={backToRead} backLabel="Back to the template" testId="template-document-screen"
                             outlineOpen={split ? outlinePane : outlineDrawer} onOutline={() => (split ? setOutlinePane((o) => !o) : setOutlineDrawer((o) => !o))}
                             pane={split && outlinePane ? <OutlinePane inDrawer items={outline} onClose={() => setOutlinePane(false)} onPick={(i) => editor.current?.scrollToHeading(i)} /> : undefined}>
                <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign} writing={writing.trigger} />
                <div className={styles.body}>
                  <div className={styles.stage}>
                    <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
                      <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={onDocState} label="Template document" placeholder="Start writing the template, or insert a field…" />
                    </div>
                  </div>
                </div>
              </DocumentFrame>
            ) : null}
            {openKey === 'fields' ? (
              /* (P-04 on a template) C2's Signature fields: which, then where — its own block after that clause, with Undo */
              <SectionScreen title="Signature fields" subtitle={fieldsLine} onBack={backToRead} backLabel="Back to the template" testId="template-fields-screen">
                <div className={docStyles.panelCard}><SignatureFieldsPanel html={body} hasStudioSignature onPlace={placeField} /></div>
                <p className={moveStyles.note}>A field sits on its own line after the clause you pick. Every contract started from this template carries it; the client signs online in theirs.</p>
              </SectionScreen>
            ) : null}
            {openKey === 'gates' ? (
              /* (C-13 on a template) C2's Before the client signs: the two switches as full-width label rows, the words they tick */
              <SectionScreen title="Before the client signs" subtitle={gatesLine} onBack={backToRead} backLabel="Back to the template" testId="template-gates-screen">
                <div className={docStyles.panelCard}><BeforeSigningPanel bare gates={gates} onGates={(p) => { setGates((g) => ({ ...g, ...p })); queue(p) }} uploaded={pdf} /></div>
                <p className={moveStyles.note}>Every contract started from this template carries these rules to its signing page.</p>
              </SectionScreen>
            ) : null}
            <Dialog open={renaming !== null} onClose={() => setRenaming(null)} title="Rename template" size="form" width={400}
                    footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRenaming(null)}>Cancel</Button><Button isDisabled={!renaming?.trim()} onPress={doRename}>Rename</Button></>}>
              <TextField label="Template name" required value={renaming ?? ''} maxLength={120} autoFocus onChange={(v) => setRenaming(v)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doRename() } }} />
            </Dialog>
          </>
        )}
        <Drawer open={narrow && outlineDrawer} onClose={() => setOutlineDrawer(false)} title="Outline" label="Outline" width="narrow">
          <OutlinePane inDrawer items={outline} onClose={() => setOutlineDrawer(false)} onPick={(i) => { setOutlineDrawer(false); editor.current?.scrollToHeading(i) }} />
        </Drawer>
        <ESignPanel open={esign} onClose={() => setEsign(false)} hasStudioSignature onInsert={(html) => editor.current?.insertHtml(html)} uploaded={pdf}
                    gates={gates} onGates={(p) => { setGates((g) => ({ ...g, ...p })); queue(p) }} />
        <ConfirmDialog open={deleteOpen} title={`Delete ${title.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={usedBy ? `${usedBy} ${usedBy === 1 ? 'contract keeps its' : 'contracts keep their'} own copy of the document. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void flushRef.current().then(() => deleteContractTemplate(template.id)).then((r) => {
                         if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return }
                         /* (REG-634, E-132) the gallery's Undo, and back where the editor was opened from */
                         /* the gallery says it, with Undo — a snackbar here would go with the editor's layout — and its Back keeps `from` */
                         router.push(`/company/templates/contracts?deleted=${encodeURIComponent(template.id)}${from ? `&from=${encodeURIComponent(from)}` : ''}`)
                       }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        {writing.dialog}
        <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (sweep S2 #30) the FAB's own press toggles it · (pending modules S10) the shell's one sheet */}
        {mode === 'section' ? null : <span ref={fabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>}   {/* (P-03) never over the paper or a section screen */}
      </div>
    </PageReveal>
  )
}
