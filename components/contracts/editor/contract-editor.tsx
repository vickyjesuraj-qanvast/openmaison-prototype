'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { DateField } from '@/components/om/date-field'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useCopy } from '@/components/om/use-copy'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { ContractSkeleton } from './contract-skeleton'
import { MSG } from '@/lib/forms'
import { copyText } from '@/lib/clipboard'
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { SelectTrigger } from '@/components/om/select-trigger'
import { useFlagPref } from '@/lib/prefs'
import { TABLET_DOWN, TABLET_LANDSCAPE, useMediaQuery } from '@/lib/breakpoint'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { Drawer } from '@/components/om/drawer'
import { backLabel, withFrom } from '@/lib/nav'
import { displayDate, inputDate, parseInputDate, phoneTyped } from '@/lib/format'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { contractStatusLabel } from '@/lib/contracts/status-words'   // (the calm UI build 2026-10-27, W-363) the display words over the stored status
import { quoteStatusLabel } from '@/lib/quotes/status-words'
import { contractLink, firstName, longDate, reminderMessage, savedLabel, SIGN_SEND_LINE, signCodeLine, signingLink, signingMessage, tokenOf } from '@/lib/contracts/model'
import { contractIssuer, issuerChoices } from '@/lib/contracts/issuer'
import { money2 } from '@/lib/quotes/math'
import bannerStyles from '@/components/quotes/editor/template-bar.module.css'
import { insertSignFieldAfter, isBlankDoc, outlineOf, placeWords, SIGN_FIELDS, SIGN_LABEL, signFieldsIn, TOKEN_LABEL, tokensIn, type SignKey, type SignPlaceRow, type TokenKey, type TokenValues } from '@/lib/contracts/tokens'
import { contractNextStep, contractTimeline, type ContractPrimary } from '@/lib/contracts/next-step'
import { clausesOf, signsLine } from '@/lib/contracts/clauses'
import { ContractScreen, type ContractEditKey, type ContractMenuAction } from '@/components/contracts/screen/contract-screen'
import { ContractDocument } from '@/components/contracts/screen/contract-document'
import { SectionScreen, screenStyles } from '@/components/contracts/screen/section-screen'
import { DocumentFrame } from '@/components/contracts/screen/document-frame'
import { DetailsForm, type DetailsFocus } from '@/components/contracts/screen/details-form'
/* (Contracts on the move, C4 — the integration of C1's screens with C2's content) the two eSign section screens draw C2's panels; C1's interim
   bodies (esign-screens.tsx) left with them */
import { SignatureFieldsPanel } from '@/components/contracts/document/signature-fields-panel'
import { BeforeSigningPanel } from '@/components/contracts/document/before-signing-panel'
import docStyles from '@/components/contracts/document/document.module.css'
import { SectionList, type SectionRow } from '@/components/quotes/screen/section-list'
import { moveStageHref } from '@/lib/leads/move-link'
import type { ContractEditorData } from '@/lib/contracts/queries'
import { attachContractPdf, duplicateContract, markContractSigned, renewSigningLink, reopenSigningLink, saveContractAsTemplate, saveContractDoc, sendContract, setContractAutomation, setContractStatusDoc, shareContractLink, stopSigningLink } from '@/app/contracts/actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) an action's refusal into the caller's own failure line
import { DepositAsk } from './deposit-ask'   // (S44R, C7)
import { letterMessage } from '@/lib/projects/completion-letter-model'   // (S44R, C9)
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import { isPdfRefusal, readPickedPdf } from '@/components/contracts/read-pdf'
import { PDF_ACCEPT } from '@/lib/contracts/pdf'
import { canDeleteContract, CONTRACT_DELETE_RULE, contractsDeletedLine, unsignBlock } from '@/lib/contracts/policy'
import { contractReadiness } from '@/lib/contracts/readiness'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import { ContractBanner } from './contract-banner'
import { UnsignDialog } from '@/components/contracts/unsign-dialog'
import { SigningRecord } from '@/components/contracts/sign/signing-record'
import { Dialog } from '@/components/om/dialog'
import { archiveContract, deleteContracts } from '@/app/leads/contracts-actions'
import { ContractHeader } from './contract-header'
import { DocEditor, IDLE_STATE, type DocEditorHandle, type DocState } from './doc-editor'
import { DocToolbar } from './doc-toolbar'
import { OutlinePane } from './outline-pane'
import { ESignPanel } from './esign-panel'
import { RenameContractDialog } from './rename-dialog'   // (the calm UI build 2026-10-27, 4-18) the title renames from the header's ⋮, as the quote's
import { useWritingHelp } from '@/components/writing/writing-help'
import { useSignCodeDemo } from '@/components/contracts/use-sign-code-demo'   // (S42 B-03)
import { useRememberContractPdf } from './contract-route-ghost'   // (S42 B-17)
import { docParts, proposeWriting, type WritingAction } from '@/lib/writing/propose'
import { AutomationDialog, AutomationRows, MarkSignedDialog, RecipientDialog, SaveTemplateDialog, SendContractDialog } from './dialogs'
import quoteStyles from '@/components/quotes/editor/quote-editor.module.css'
import styles from './contract-editor.module.css'

const AUTOSAVE_MS = 600
/** (Contracts on the move, P-02) The Edit list's sections, as the address names them (`?edit=<key>`; `?edit=1` is the list). */
const EDIT_KEYS: readonly ContractEditKey[] = ['details', 'document', 'fields', 'gates', 'automation', 'files']
const isEditKey = (k: string | null): k is ContractEditKey => !!k && (EDIT_KEYS as readonly string[]).includes(k)

/**
 * The contract editor (REG-534, no mock; the reference screens on 2.0's pieces): the quote editor's header (crumb · [title ▾]
 * · chips · Saved · [status ▾] · Send · Preview · automation · copy link · kebab · ✕), a meta row (title · recipient · date),
 * the formatting bar with Insert a field ▾ and eSignatures, then the canvas — Outline · paper · eSignatures drawer. Every change
 * autosaves 600 ms after the last keystroke; close and Preview flush first. Send = 1.0's WhatsApp signing link.
 */
export function ContractEditor({ data, from }: { data: ContractEditorData; from?: string }) {
  const { contract, lead, siblings, studio, me, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const editor = useRef<DocEditorHandle>(null)
  const uploaded = contract.source === 'uploaded'

  /* ── document state ── */
  const [title, setTitle] = useState(contract.title)
  const [body, setBody] = useState(contract.body ?? '')
  const [recipientName, setRecipientName] = useState(contract.recipientName ?? lead.name)
  const [recipientPhone, setRecipientPhone] = useState(contract.recipientPhone ?? lead.phone.replace(/\D/g, '').slice(-8))
  const [contractDate, setContractDate] = useState<number>((contract.contractDate ?? contract.createdAt).getTime())
  const [status, setStatus] = useState(contract.status)
  const [signedAt, setSignedAt] = useState<Date | null>(contract.signedAt)
  const [auto, setAuto] = useState({ reminders: contract.reminders, thankYou: contract.thankYou })
  const [updatedAt, setUpdatedAt] = useState((contract.updatedAt ?? contract.createdAt).getTime())
  const [clock, setClock] = useState(now)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const [docState, setDocState] = useState<DocState>(IDLE_STATE)
  const [gates, setGates] = useState({ requiresScroll: contract.requiresScroll, requiresAccept: contract.requiresAccept, acceptLabel: contract.acceptLabel })   // (REG-633, parity Q-15)
  /* (pending modules S03) the link's own key and window (Stop gives a new key; each send opens the window again), and the PDF an upload keeps */
  const [token, setToken] = useState(tokenOf(contract))
  const [expiresAt, setExpiresAt] = useState<number | null>(contract.signExpiresAt ? contract.signExpiresAt.getTime() : null)
  const [pdf, setPdf] = useState(data.pdf)
  const pdfInput = useRef<HTMLInputElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  /* ── autosave (the quote editor's General Info rhythm) ── */
  const dirty = useRef<Parameters<typeof saveContractDoc>[1]>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const patch = dirty.current
    if (!Object.keys(patch).length) return
    dirty.current = {}
    try { setUpdatedAt(await orThrow(saveContractDoc(contract.id, patch))) }
    catch (e) { snackbar({ message: e instanceof Error && e.message === 'too-large' ? 'The document is too large to save — use a smaller picture' : e instanceof Error && e.message === 'signed' ? 'A signed contract stays as it was signed' : 'Couldn’t save the contract — please try again' }) }
  }, [contract.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback((patch: Parameters<typeof saveContractDoc>[1]) => {
    dirty.current = { ...dirty.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS)
  }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  useEffect(() => {
    const onHide = () => { void flushRef.current() }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  /* ── (REG-632, parity Q-08 · Q-10) the quote it names and who issues it ── */
  const [quoteId, setQuoteId] = useState<string | null>(contract.fromQuoteId)
  const [entity, setEntity] = useState<string | null>(contract.issuingEntity)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [entityOpen, setEntityOpen] = useState(false)
  const namedQuote = quoteId && quoteId === data.quote?.id ? data.quote : data.quotes.find((q) => q.id === quoteId) ?? null
  const quoteGone = quoteId && quoteId === contract.fromQuoteId ? data.quoteGone : null
  const entities = issuerChoices(studio, contract.issuingEntity)   // (REG-647) retired entities stay only where named
  const issuer = contractIssuer(studio, entity)

  /* ── live token samples (Smart Text's right column follows the meta row) ── */
  const values: TokenValues = useMemo(() => ({
    ...data.values, 'client.name': recipientName || lead.name, 'client.phone': `+65 ${phoneTyped(recipientPhone || lead.phone)}`, 'date.contract': new Date(contractDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }),
    'quote.number': namedQuote?.number ?? '', 'quote.total': namedQuote ? money2(namedQuote.amountMinor) : '', 'quote.validUntil': namedQuote?.validUntil ? longDate(namedQuote.validUntil) : '', 'lead.projectRef': namedQuote?.projectRef ?? '',
    'quote.deposit': namedQuote?.depositMinor ? money2(namedQuote.depositMinor) : '',   // (S44R, C7) the Deposit field follows the quote picked
    'studio.name': issuer.name, 'studio.address': issuer.address, 'studio.uen': issuer.uen, 'studio.gst': issuer.gstReg,
  }), [data.values, recipientName, recipientPhone, contractDate, lead.name, lead.phone, namedQuote, issuer])
  const outline = useMemo(() => outlineOf(body), [body])
  const codeDemo = useSignCodeDemo()   // (S42 B-03) Send's words say no text goes while the stand-in answers
  useRememberContractPdf(contract.id, uploaded)   // (S42 B-17) the loader's shape next time
  /* (pending modules S29 — card api:ai-writing-help-quotes, "… and on a contract's text") Write with AI on the paper: Improve · Shorten · Add
     what's missing · Back to the template's wording · Plain English, on your selection, the clause the caret is in, or the whole contract —
     each a proposal first (components/writing/writing-help.tsx); the chips and signature fields are never touched. Its words on record are the
     contract's template's (`writingTemplate`). A signed contract and an uploaded PDF have no words to change. */
  const writing = useWritingHelp({
    label: 'Contract', subject: title.trim() || undefined, kind: 'contract', trigger: 'text', compact: true, disabled: status === 'Signed' || uploaded, testId: 'contract-writing',
    sources: () => ({ template: data.writingTemplate, names: [recipientName || lead.name] }),
    read: () => { const at = editor.current?.partAt(); return at && at.blocks.length ? { html: at.blocks.join(''), parts: docParts(at.blocks, at) } : { html: body } },
    /* (contracts on the move, P-01) on a phone the paper is mounted only on the Document screen: a proposal taken from Maison AI's sheet on the
       Contract screen lands on the record itself, as the paper would have saved it */
    apply: (h, part) => { if (part && part.key !== 'whole' && editor.current) editor.current.replaceBlocks(part.from, part.to, h); else if (editor.current) editor.current.replaceAll(h); else { setBody(h); queue({ body: h }) } },
    restore: (h) => { if (editor.current) editor.current.replaceAll(h); else { setBody(h); queue({ body: h }) } },
  })
  /* …and in Maison AI's sheet, when it would do something to the whole contract (worked out by rule as the menu does) */
  const writeRows = useMemo(() => {
    if (status === 'Signed' || uploaded || isBlankDoc(body)) return [] as { label: string; action: WritingAction }[]
    const src = { template: data.writingTemplate }
    const out: { label: string; action: WritingAction }[] = []
    const fix = proposeWriting({ action: 'improve', html: body, kind: 'contract', sources: src, part: 'whole' })
    if (!fix.none) out.push({ label: `Improve the contract — ${fix.short.replace(/ —.*$/, '')}`, action: 'improve' })
    const add = proposeWriting({ action: 'expand', html: body, kind: 'contract', sources: src, part: 'whole' })
    if (!add.none) out.push({ label: `Add the clauses “${data.writingTemplate.title}” has`, action: 'expand' })
    const plain = proposeWriting({ action: 'plain', html: body, kind: 'contract', sources: src, part: 'whole' })
    if (!plain.none) out.push({ label: 'Put the contract in plain English', action: 'plain' })
    return out
  }, [body, status, uploaded, data.writingTemplate])

  /* ── panes and overlays ── */
  const [outlinePref, setOutlinePref] = useFlagPref('om.contracts.outline', true)
  const narrow = useMediaQuery(TABLET_DOWN)   // (REG-634, E-114) ≤1024 the Outline is a drawer
  const [outlineDrawer, setOutlineDrawer] = useState(false)
  /* ── (Contracts on the move, P-01 · P-02 · P-03 · Q-01 — his "please check and built accordingly" 2026-10-22) On a phone and a touch tablet
     (≤1024) the address opens the CONTRACT SCREEN (read first, components/contracts/screen/*); Edit is the section list (`?edit=1`), a row its
     section's own screen (`?edit=<key>`), so Back works (REG-465). The address moves by the browser's own history (no server round trip); a
     landscape tablet holds the list as a 300 pane and the open section beside it; the Document screen takes the whole width. A Signed
     contract reads only — the copy is kept (REG-631), so no Edit, and `?edit=` is ignored. The desk (≥1025) is untouched. ── */
  const searchParams = useSearchParams()
  const editParam = searchParams.get('edit')
  const split = useMediaQuery(TABLET_LANDSCAPE)
  const readOnlyMove = status === 'Signed'
  const openKey: ContractEditKey | null = narrow && !readOnlyMove && isEditKey(editParam) ? editParam : null
  const editing = narrow && !readOnlyMove && editParam !== null
  const shownKey: ContractEditKey | null = openKey ?? (editing && split ? 'details' : null)   // the landscape pane rests on Details until a row is picked
  const mode: 'desk' | 'read' | 'list' | 'section' = !narrow ? 'desk' : openKey ? 'section' : editing ? 'list' : 'read'
  const [detailsFocus, setDetailsFocus] = useState<DetailsFocus>(null)
  const [direct, setDirect] = useState(false)   // a section opened straight from the Contract screen (the date row, ⋮ › Edit recipient): ← returns there
  const [outlinePane, setOutlinePane] = useState(false)   // the landscape tablet's Outline pane on the Document screen (P-02: a pane, never a drawer over the paper)
  const setEdit = useCallback((v: string | null, how: 'push' | 'replace') => {
    const u = new URL(window.location.href)
    if (v === null) u.searchParams.delete('edit'); else u.searchParams.set('edit', v)
    const url = `${u.pathname}${u.search}`
    /* our own mark on the entry, so Back knows what it undoes (K1's rule) — and how many entries stand between it and the record, so Done
       on a section screen (the Document frame's) lands on the Contract screen in one move, never on the list it passed through */
    const depth = (Number(window.history.state?.omDepth) || 0) + (how === 'push' ? 1 : 0)
    const st = { omEdit: v === null ? null : v === '1' ? 'list' : 'section', omDepth: v === null ? 0 : depth }
    if (how === 'push') window.history.pushState(st, '', url); else window.history.replaceState(st, '', url)
  }, [])
  const openEdit = () => { void flushRef.current(); setDirect(false); setDetailsFocus(null); setEdit('1', 'push') }
  const openSection = useCallback((k: ContractEditKey, focus: DetailsFocus = null, fromScreen = false) => {
    setDetailsFocus(focus); setDirect(fromScreen)
    setEdit(k, split && window.history.state?.omEdit ? 'replace' : 'push')   // the pane swaps in place; a phone pushes, so ← is Back
  }, [setEdit, split])
  const backToList = useCallback(() => { setDetailsFocus(null); if (window.history.state?.omEdit === 'section') window.history.back(); else setEdit(direct ? null : '1', 'replace') }, [setEdit, direct])
  /* Done lands on the Contract screen in one move: back through the entries the edit pushed; a deep-linked list under them (no record entry
     beneath it) is then replaced by the record, so Back never reopens the editor */
  const finishing = useRef(false)
  const doneEditing = useCallback(() => { void flushRef.current(); setDetailsFocus(null); const d = Number(window.history.state?.omDepth) || 0; if (d > 0) { finishing.current = true; window.history.go(-d) } else setEdit(null, 'replace') }, [setEdit])
  useEffect(() => { if (!finishing.current) return; finishing.current = false; if (editParam !== null) setEdit(null, 'replace') }, [editParam, setEdit])
  useScrollLock(mode === 'list' || mode === 'section')   // the Contract screen behind keeps its place
  /* (P-01) the Contract screen's foot: the FAB and the snackbar rest above it (the house offset, REG-302) */
  useEffect(() => {
    if (mode !== 'read') return
    const root = document.documentElement.style
    root.setProperty('--bottom-dock', '78px')   // 72 (12 + 48 + 12) + 6, the offset's own rule
    return () => { root.removeProperty('--bottom-dock') }
  }, [mode])
  /* (P-03) the Document screen's bar says which clause the caret is in */
  const [caretClause, setCaretClause] = useState<number | null>(null)
  const onDocState = useCallback((s: DocState) => {
    setDocState(s)
    const at = editor.current?.partAt()
    if (!at || at.caret === null) { setCaretClause(null); return }
    let k = 0
    for (let i = 0; i <= at.caret && i < at.blocks.length; i++) if (/^<h[123][\s>]/i.test(at.blocks[i]!)) k++
    setCaretClause(k)
  }, [])
  /* Maison AI's outline rows on the move open the Document screen on that heading */
  const pendingHeading = useRef<number | null>(null)
  useEffect(() => {
    if (shownKey !== 'document' || pendingHeading.current === null) return
    const i = pendingHeading.current; pendingHeading.current = null
    const t = setTimeout(() => editor.current?.scrollToHeading(i), 80)
    return () => clearTimeout(t)
  }, [shownKey])
  const [remindOpen, setRemindOpen] = useState(false)
  const [esign, setEsign] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [autoDialog, setAutoDialog] = useState(false)   /* (sweep S2 #9) from the folded kebab */
  const [sendOpen, setSendOpen] = useState(false)
  const [signedOpen, setSignedOpen] = useState(false)
  const [recipientOpen, setRecipientOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const fabRef = useRef<HTMLSpanElement>(null)
  const link = signingLink(token)
  const { copy } = useCopy(contractLink({ id: contract.id, signToken: token, bundleId: contract.bundleId, status }), {   /* (REG-633, E-118) a bundled document copies the bundle's link */ done: 'Signing link copied' })
  const [unsignTo, setUnsignTo] = useState<'Draft' | 'Sent to Client' | null>(null)
  const [recordOpen, setRecordOpen] = useState(false)
  const [sentAt, setSentAt] = useState<number | null>(contract.sentAt ? contract.sentAt.getTime() : null)
  const viewer = { id: me?.id ?? null, role: me?.role }
  const signedLock = status === 'Signed'   // (REG-631, parity Q-04) a signed contract's title, recipient, date and text stay as signed
  const canDelete = canDeleteContract(viewer, contract)   // (REG-634, parity Q-21)
  /* (S44R — UAT row 358, call C7) Send's "Ask for the deposit": the named quote's first payment, to its entity's PayNow — saved as it is ticked */
  const [askDeposit, setAskDeposit] = useState(contract.askDeposit)
  const pickQuote = (id: string | null) => {
    setQuoteOpen(false)
    if (id === quoteId) return
    setQuoteId(id)
    const q = id ? data.quotes.find((x) => x.id === id) : null
    if (q) setEntity(q.issuingEntity && q.issuingEntity !== entities[0] ? q.issuingEntity : null)   // the quote's issuer comes with it (the server does the same)
    if (askDeposit && (!id || data.deposits[id]?.why)) setAskDeposit(false)   // (S44R, C7) the server lets the ask go with a quote that has none
    queue({ fromQuoteId: id })
  }

  const pickEntity = (name: string) => { setEntityOpen(false); const next = name === entities[0] ? null : name; if (next === entity) return; setEntity(next); queue({ issuingEntity: name }) }

  const backHref = from ?? `/leads/${lead.id}/contracts`
  const close = () => { void flushRef.current(); router.push(backHref) }
  const go = (href: string) => { void flushRef.current(); router.push(href) }
  const blank = !uploaded && isBlankDoc(body)
  const canSend = status !== 'Signed' && !blank
  const sendHint = status === 'Signed' ? 'Contract is signed' : 'Add some content first'
  /* (REG-634, parity Q-22) Send's checks — the quote's readiness pattern: a blocking one is named with the way to fix it, the rest ride in the dialog. */
  /* (UX audit C2) …and the quote it names: a Draft — or one waiting for approval — where Settings requires approval keeps it from going out */
  const issues = useMemo(() => contractReadiness({ source: contract.source, body, values, hasStudioSignature: !!data.studioSignature, signatureOff: data.signatureState === 'off', hasQuote: !!namedQuote, toRead: contract.toRead,
    quote: namedQuote ? { number: namedQuote.number, status: namedQuote.status } : null, approvalRequired: data.approvalRequired, approver: data.canApprove }), [data.canApprove, contract.source, contract.toRead, body, values, data.studioSignature, data.signatureState, namedQuote, data.approvalRequired])
  const blockIssue = issues.find((i) => i.blocking) ?? null
  const openQuote = () => { if (namedQuote) go(withFrom(`/quotes/${namedQuote.id}`, `/contracts/${contract.id}`)) }
  const showFields = () => { if (narrow) openSection('fields', null, true); else setEsign(true) }   // (contracts on the move) the fix lives on its own screen there
  const sayBlocked = () => { if (blockIssue) snackbar({ message: `Before you send: ${blockIssue.label}`, ...(blockIssue.fix === 'esign' ? { actionLabel: 'Show me', onAction: showFields } : blockIssue.fix === 'open-quote' && namedQuote ? { actionLabel: 'Open the quote', onAction: openQuote } : {}) }) }
  /* (UX audit C1) A signed contract's next step while its lead isn't Won: the Move stage window at Won with this contract picked (REG-469's path). */
  const wonHref = data.leadStage && data.leadStage !== 'Won' ? moveStageHref(lead.id, 'won', { contract: contract.id }) : null
  const moveToWon = () => { if (wonHref) go(wonHref) }
  /* (UX audit C7) Each Smart Text chip names what it prints here — the house tooltip over the chip */
  const chipTip = useCallback((key: string) => {
    const label = TOKEN_LABEL[key as TokenKey]
    if (!label) return null
    const v = values[key as TokenKey]?.trim()
    return v ? `Prints as: ${v}` : `Empty — prints “[${label}]” until it is filled in`
  }, [values])
  const sendError = (e: unknown) => { const m = e instanceof Error ? e.message : ''; return m === 'no-client-field' ? 'Insert a Client signature field before sending' : m === 'phone' ? `${MSG.phone} for the client first — Edit recipient` : m === 'empty' ? 'Add some content before sending' : 'Couldn’t send the contract — please try again' }

  /* (pending modules S03 — 1.0's cancel) Stop the signing link: back to Draft with a new key, the client's address dead; one sentence and Undo,
     which puts the same link back. The status pill's Sent → Draft is the same move. */
  const stopLink = () => {
    void flushRef.current().then(() => stopSigningLink(contract.id)).then((r) => {
      if ('error' in r) { snackbar({ message: `Couldn’t stop the link — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return }
      const mine = r.docs.find((d) => d.id === contract.id)
      setStatus('Draft'); if (mine) setToken(mine.rotated); setExpiresAt(null); router.refresh()
      snackbar({ message: r.docs.length > 1 ? `The signing link is stopped — its ${r.docs.length} documents are Drafts again` : `The signing link is stopped — ${recipientName || lead.name}’s link no longer opens`, actionLabel: 'Undo',
        onAction: () => { void reopenSigningLink(r).then((u) => { if ('error' in u) { snackbar({ message: `Couldn’t put the link back — ${u.error.charAt(0).toLowerCase()}${u.error.slice(1)}` }); return } setStatus('Sent to Client'); if (mine) { setToken(mine.token ?? mine.rotated); setExpiresAt(mine.expiresAt) } router.refresh(); snackbar({ message: 'The signing link is back' }) }, () => snackbar({ message: 'Couldn’t put the link back — please try again' })) } })
    }, () => snackbar({ message: 'Couldn’t stop the link — please try again' }))
  }
  /* (pending modules S03) an uploaded contract's PDF: attached when none was kept, replaced while it is a Draft */
  const pickPdf = async (f: File) => {
    setPdfBusy(true)
    try {
      const r = await readPickedPdf(f)
      if (isPdfRefusal(r)) { snackbar({ message: r.error }); return }
      const a = await attachContractPdf(contract.id, { file: r })
      if ('error' in a) { snackbar({ message: `Couldn’t keep the PDF — ${a.error.charAt(0).toLowerCase()}${a.error.slice(1)}` }); return }
      setPdf({ fileId: a.fileId, name: a.name, thumb: !!r.thumb }); snackbar({ message: `${a.name} is kept with the contract — in Files › Contract & VOs` }); router.refresh()
    } catch { snackbar({ message: 'Couldn’t keep the PDF — please try again' }) } finally { setPdfBusy(false) }
  }
  const applyStatus = (s: 'Draft' | 'Sent to Client') => {
    if (s === 'Draft' && status === 'Sent to Client') { stopLink(); return }
    const was = { status, signedAt }
    setStatus(s); setSignedAt(null)
    void orThrow(setContractStatusDoc(contract.id, s)).then(() => { snackbar({ message: `Contract marked ${contractStatusLabel(s)}` }); if (s === 'Sent to Client' && !sentAt) setSentAt(Date.now()); if (s === 'Sent to Client') setExpiresAt(Date.now() + data.linkDays * 86_400_000); router.refresh() },
      (e: unknown) => { setStatus(was.status); setSignedAt(was.signedAt); snackbar({ message: e instanceof Error && e.message.length < 120 && !/fetch|network/i.test(e.message) ? e.message : 'Couldn’t change the status — please try again' }) })
  }
  const changeStatus = (s: ContractStatus) => {
    setStatusOpen(false)
    if (s === status) return
    if (s === 'Signed') { setSignedOpen(true); return }
    /* (REG-631, parity Q-04) Leaving Signed asks first — and only a studio-marked signature, only for an Owner or an Admin. */
    if (status === 'Signed') { if (!unsignBlock({ status, signedBy: contract.signedBy }, viewer)) setUnsignTo(s); return }
    applyStatus(s)
  }
  /* (REG-631, parity Q-07) Copying a Draft's link shares it: the contract is Sent to Client from then on. (UX audit C8) Called once the link is
     on the clipboard: the status moves only after a copy that worked, and a refusal leaves it a Draft and says why. */
  const shareDraft = (): Promise<boolean> => {
    if (status !== 'Draft') return Promise.resolve(true)
    return flushRef.current().then(() => shareContractLink(contract.id)).then((r) => {
      if ('error' in r) { snackbar({ message: `Couldn’t mark it Sent — ${r.error}` }); return false }
      setStatus(r.status); setSentAt(r.sentAt); setExpiresAt(Date.now() + data.linkDays * 86_400_000); router.refresh(); snackbar({ message: 'Signing link copied — the contract is waiting for signature now' }); return true
    }, (e: unknown) => { snackbar({ message: sendError(e) }); return false })
  }
  const copyLink = () => {
    if (status === 'Draft' && blank) { snackbar({ message: 'Add some content before sharing the link' }); return }
    if (status === 'Draft' && blockIssue) { sayBlocked(); return }   // (REG-634, parity Q-22) sharing is sending
    /* (pending modules S03) a copy is a send: a link past its window opens again for the studio's days */
    if (status === 'Sent to Client' && expiresAt && expiresAt <= clock) { void copyText   // (contracts on the move) the page's clock, never Date.now() in render (react-hooks/purity)
     (contractLink({ id: contract.id, signToken: token, bundleId: contract.bundleId, status })).then(() => renewSigningLink(contract.id, 'copy')).then((r) => { if ('error' in r) { snackbar({ message: `Couldn’t open the link again — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } setExpiresAt(r.expiresAt); snackbar({ message: `Signing link copied — it opens for ${data.linkDays} days from now` }); router.refresh() }, () => snackbar({ message: 'Couldn’t copy the link — please try again' })); return }
    if (status !== 'Draft') { void copy(); return }
    /* (UX audit C8, supersedes sweep S2 #2's order) the checks above first, then the copy, then the share — never Sent over a failed copy */
    const write = copyText(contractLink({ id: contract.id, signToken: token, bundleId: contract.bundleId, status }))
    void write.then(() => { void shareDraft() }, () => snackbar({ message: 'Couldn’t copy the link — the contract stays a Draft' }))
  }
  /* A refused save puts the switch back (sweep S2) — the panel said on while the record said off. */
  const changeAuto = (p: { reminders?: boolean; thankYou?: boolean }) => { const prev = auto; setAuto((a) => ({ ...a, ...p })); void orThrow(setContractAutomation(contract.id, p)).catch(() => { setAuto(prev); snackbar({ message: 'Couldn’t save the automation — please try again' }) }) }
  const onMenu = (a: 'duplicate' | 'template' | 'pdf' | 'print' | 'archive' | 'delete' | 'preview' | 'auto' | 'copy') => {
    if (a === 'preview') { go(withFrom(`/contracts/${contract.id}/preview`, from)); return }
    /* (pending modules S03) an uploaded contract's PDF is the file itself — downloaded as it is; a written one prints from Preview */
    if (a === 'pdf' && pdf) { window.location.assign(`/files/raw/${pdf.fileId}?download=1`); return }
    if (a === 'pdf' || a === 'print') { go(withFrom(`/contracts/${contract.id}/preview?print=1`, from)); return }
    if (a === 'copy') { copyLink(); return }
    if (a === 'auto') { setAutoDialog(true); return }   // (4-18) the header's bell left; Reminders… opens the same two switches
    if (a === 'duplicate') { void flushRef.current().then(() => orThrow(duplicateContract(contract.id))).then((id) => { snackbar({ message: 'Contract duplicated' }); router.push(withFrom(`/contracts/${id}`, from)) }, () => snackbar({ message: 'Couldn’t duplicate the contract — please try again' })); return }
    if (a === 'template') { if (uploaded) { comingSoon(); return } setTemplateOpen(true); return }
    if (a === 'archive') { void archiveContract(contract.id).then(() => { snackbar({ message: 'Contract archived', actionLabel: 'Undo', onAction: () => { void archiveContract(contract.id, true) } }); router.push(backHref) }, () => snackbar({ message: 'Couldn’t archive the contract — please try again' })); return }
    if (a === 'delete') setDeleteOpen(true)
  }

  const statusPill = (
    <span className={quoteStyles.anchor}>
      <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={statusOpen}
              iconEnd={<span className={quoteStyles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              onPress={() => setStatusOpen((o) => !o)}>{contractStatusLabel(status)}</Button>
      {/* (REG-728) The quote editor's status list: 240, "current" as the row's meta, a locked row's rule in the row. */}
      <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} sheetTitle="Status">
        {CONTRACT_STATUSES.map((s) => {
          const block = s !== status && status === 'Signed' ? unsignBlock({ status, signedBy: contract.signedBy }, viewer) : null
          return (
            <DropdownItem key={s} role="menuitemradio" checked={s === status} selected={false} onSelect={() => changeStatus(s)} disabled={!!block} title={block ?? undefined}
                          meta={s === status ? 'current' : undefined}>
              {contractStatusLabel(s)}
            </DropdownItem>
          )
        })}
      </Dropdown>
    </span>
  )

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The contract's Maison AI, by rule from the page:
     whether it can go (Send's own checks, `contractReadiness`, each with the way to fix it), the WhatsApp to the client (the Send dialog, which
     drafts it — the house form, nothing goes until it is pressed there), and what it says (its outline, each heading a press away); signed,
     who signed it and when (the signing record). Nothing is metered. *(invented copy: the answers' titles and lines)* */
  const clientFirst = firstName(recipientName || lead.name)
  const fixRow = (i: (typeof issues)[number], k: number) => ({ id: `issue-${k}`, label: i.label, meta: i.blocking ? 'Holds the send' : 'Worth a look before it goes',
    ...(i.fix === 'esign' ? { run: showFields } : i.fix === 'open-quote' && namedQuote ? { run: openQuote } : {}) })
  const maison: MaisonSuggestion[] = [
    status === 'Signed'
      ? { label: 'Who signed it, and when?', answer: { title: `Signed by ${contract.signedBy ?? recipientName ?? lead.name}`, text: signedAt ? `On ${displayDate(signedAt)}${contract.signatureKind ? ` — ${contract.signatureKind === 'draw' ? 'drawn' : contract.signatureKind === 'type' ? 'typed' : 'marked by the studio'}` : ''}. The signing record is on the page: when it was opened, accepted and signed, and the document’s fingerprint.` : 'The signing record is on the page.',
          rows: data.signedFile ? [{ id: 'copy', label: 'Open the signed copy', meta: 'Kept in the lead’s Files', run: () => go(withFrom(`/leads/${lead.id}/files/${data.signedFile!.fileId}`, `/contracts/${contract.id}`)) }] : [] } }
      : { label: 'Is it ready to send?', answer: () => Promise.resolve(issues.length
          ? { title: blockIssue ? 'Not ready to send yet' : `${issues.length === 1 ? '1 thing' : `${issues.length} things`} to check first`, text: blockIssue ? 'Send stays shut until the first one is fixed — the rest are worth a look.' : 'It can go — these are worth a look before it does.', rows: issues.map(fixRow) }
          : { title: 'Ready to send', text: `Send opens the WhatsApp signing link for ${clientFirst} — you read the message before it goes.`, rows: canSend ? [{ id: 'send', label: 'Send for signing', meta: `To ${recipientName || lead.name}`, run: () => setSendOpen(true) }] : [] }) },
    ...(status !== 'Signed' && canSend ? [blockIssue
      ? { label: `Draft the WhatsApp to ${clientFirst}`, answer: () => Promise.resolve({ title: 'Not ready to send yet', text: `The signing link’s WhatsApp is drafted in Send — it opens once this is fixed:`, rows: [fixRow(blockIssue, 0)] }) }
      : { label: `Draft the WhatsApp to ${clientFirst}`, run: () => setSendOpen(true) }] : []),
    ...(uploaded ? [] : [{ label: 'What’s in this contract?', answer: () => Promise.resolve(outline.length
      ? { title: `${outline.length === 1 ? '1 heading' : `${outline.length} headings`}`, text: 'Its outline — open one to go to it on the paper.', rows: outline.map((h, i) => ({ id: `h-${i}`, label: h.text, run: () => { if (editor.current) editor.current.scrollToHeading(i); else if (narrow && !readOnlyMove) { pendingHeading.current = i; openSection('document', null, true) } else (document.querySelector('[data-testid="contract-signed-copy"]')?.querySelectorAll('h1, h2, h3')[i] as HTMLElement | undefined)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) } })) }
      : { title: isBlankDoc(body) ? 'The document is empty' : 'No headings yet', text: isBlankDoc(body) ? 'Start writing, or insert a field — or start again from a template.' : 'Add a heading from the formatting bar and it shows here.' }) } satisfies MaisonSuggestion]),
    ...writeRows.map((r) => ({ label: r.label, run: () => writing.openAction(r.action, { html: body }) })),   // (pending modules S29)
  ]

  /* ── (Contracts on the move, P-01 · P-02 · Q-07) the Contract screen's facts, the folds' words and the Edit list's rows ── */
  const quoteMenu = (withOpen: boolean) => (
    <Dropdown open={quoteOpen} onClose={() => setQuoteOpen(false)} align="right" width={MENU_WIDTH.detail} sheetTitle="Quote">
      {/* (contracts on the move, P-01) from the Contract screen's quote row the sheet also opens the quote itself — the chip's door on the Quote screen, the other way */}
      {withOpen && namedQuote ? <><DropdownItem onSelect={() => { setQuoteOpen(false); openQuote() }}>{`Open ${namedQuote.number}`}</DropdownItem><DropdownDivider /></> : null}
      {data.quotes.map((q) => (
        <DropdownItem key={q.id} role="menuitemradio" checked={q.id === quoteId} selected={q.id === quoteId} onSelect={() => pickQuote(q.id)} meta={`${money2(q.amountMinor)} · ${quoteStatusLabel(q.status)}`}>
          {`${q.number} · ${q.title}`}
        </DropdownItem>
      ))}
      {data.quotes.length ? <DropdownDivider /> : null}
      <DropdownItem role="menuitemradio" checked={!quoteId} selected={!quoteId} onSelect={() => pickQuote(null)}>No quote</DropdownItem>
    </Dropdown>
  )
  const expired = status === 'Sent to Client' && !!expiresAt && expiresAt <= clock
  const blockerWords = blockIssue ? (blockIssue.fix === 'esign' ? 'No client signature field yet — add one in Edit › Signature fields' : blockIssue.label) : null
  const next = contractNextStep({ status, clientFirst, toRead: contract.toRead, uploaded, blocker: status === 'Draft' ? blockerWords : null, sentAt, viewedAt: contract.viewedAt ? contract.viewedAt.getTime() : null, expiresAt,
    signedAt: signedAt ? signedAt.getTime() : null, signedBy: status === 'Signed' ? contract.signedBy : null, quoteNumber: namedQuote?.number ?? null, leadStage: data.leadStage, bundled: !!contract.bundleId && status === 'Sent to Client', linkDays: data.linkDays }, clock)
  const docHtml = status === 'Signed' && data.signed?.body ? data.signed.body : body
  const clauses = useMemo(() => clausesOf(docHtml).clauses, [docHtml])
  const placed = useMemo(() => signFieldsIn(docHtml), [docHtml])
  const fieldsLine = uploaded ? 'Signed on the page itself' : placed.length ? signsLine(placed)! : 'No client signature field yet'
  const gatesLine = [gates.requiresScroll && !uploaded ? 'Read to the end' : null, gates.requiresAccept ? 'Tick to accept' : null].filter(Boolean).join(' · ') || 'No rules before signing'
  const autoLine = [auto.reminders ? 'Follow-up task 3 days after sending' : null, auto.thankYou ? 'Thank-you task when signed' : null].filter(Boolean).join(' · ') || 'Off'
  const here = `/contracts/${contract.id}`
  const fileHref = (fileId: string) => withFrom(`/leads/${lead.id}/files/${fileId}`, here)
  const filesLine = data.signedFile ? `Signed copy · ${data.signedFile.name}` : pdf ? pdf.name : status === 'Signed' ? 'The signed page is the copy' : 'Nothing kept yet'
  const signWords = placed.filter((k) => k.endsWith('signature')).map((k) => (k.startsWith('studio') ? 'Studio' : 'Client'))
  const fieldCount = tokensIn(body).length
  const docLine = uploaded ? (pdf ? pdf.name : 'No PDF attached yet') : blank ? 'Empty — nothing written yet'
    : [`${outline.length} ${outline.length === 1 ? 'clause' : 'clauses'}`, fieldCount ? `${fieldCount} ${fieldCount === 1 ? 'field fills' : 'fields fill'} in` : null, signWords.length ? `${signWords.join(' and ')} sign${signWords.length === 1 ? 's' : ''}` : 'nowhere to sign yet'].filter(Boolean).join(' · ')
  const sectionRows: SectionRow<ContractEditKey>[] = [
    { key: 'details', label: 'Details', summary: [recipientName || lead.name, phoneTyped(recipientPhone || lead.phone), displayDate(new Date(contractDate)), namedQuote?.number ?? 'No quote', entities.length > 1 ? issuer.name : null].filter(Boolean).join(' · ') },
    { key: 'document', label: 'Document', summary: docLine },
    { key: 'fields', label: 'Signature fields', summary: fieldsLine },
    { key: 'gates', label: 'Before the client signs', summary: gatesLine },
    { key: 'automation', label: 'Reminders', summary: autoLine },   // (the calm UI build 2026-10-27, 4-18 · W-120) one name for the two reminders
    { key: 'files', label: 'Files', summary: filesLine },
  ]
  const timeline = contractTimeline({ createdAt: contract.createdAt.getTime(), createdByName: null, sentAt, recipient: recipientName || lead.name, viewedAt: contract.viewedAt ? contract.viewedAt.getTime() : null,
    acceptedAt: contract.acceptedAt ? contract.acceptedAt.getTime() : null, signedAt: signedAt ? signedAt.getTime() : null, signedBy: status === 'Signed' ? contract.signedBy : null, caseTrustAt: contract.caseTrustAt ? contract.caseTrustAt.getTime() : null, toRead: contract.toRead, fromTemplate: !!contract.templateId })
  const docSub = `${caretClause ? `clause ${caretClause} of ${outline.length}` : `${outline.length} ${outline.length === 1 ? 'clause' : 'clauses'}`} · ${savedLabel(updatedAt, clock).replace(/^Saved/, 'saved')}`
  /* (P-04 — C2's placement, C1's screen; integrated by C4) a field added from the Signature fields screen is placed where the person chose —
     which, then where (C2's PlacementDialog) — and shown landing: the Document screen opens on it, the field as its own block after that
     clause (`insertSignFieldAt` → `insertSignFieldAfter`, never inside a word) at mid-screen with the fresh pulse, and the snackbar says
     "Client signature added under Signatures" with Undo. ← returns to Signature fields (the next one to add), Done to the contract. */
  const pendingPlace = useRef<{ key: SignKey; row: SignPlaceRow } | null>(null)
  /* the paper settles after the screen opens (the letterhead's picture lands, the boxes' ✕ are placed): once it has, the new block is brought back
     to mid-screen if it drifted — the landing the person is shown */
  const recentre = () => window.setTimeout(() => { const n = document.querySelector<HTMLElement>('[data-document-frame] [data-fresh]'); if (!n) return; const r = n.getBoundingClientRect(); if (r.top < innerHeight * 0.2 || r.bottom > innerHeight * 0.8) n.scrollIntoView({ block: 'center' }) }, 650)
  const placeField = (key: SignKey, row: SignPlaceRow) => { pendingPlace.current = { key, row }; openSection('document', null, true) }
  useEffect(() => {
    if (shownKey !== 'document' || !pendingPlace.current) return
    const t = setTimeout(() => {
      const p = pendingPlace.current; pendingPlace.current = null
      if (!p) return
      const r = editor.current?.insertSignFieldAt(p.row.place, p.key)
      if (r) recentre()
      if (r) snackbar({ message: `${SIGN_LABEL[p.key]} added ${placeWords(p.row)}`, actionLabel: 'Undo', onAction: () => editor.current?.replaceAll(r.prev) })
      else {   // the paper did not mount (a read-only copy): the record still takes the field, said the same way
        const before = body; const { html } = insertSignFieldAfter(body, p.row.place, p.key)
        setBody(html); queue({ body: html })
        snackbar({ message: `${SIGN_LABEL[p.key]} added ${placeWords(p.row)}`, actionLabel: 'Undo', onAction: () => { setBody(before); queue({ body: before }) } })
      }
    }, 240)
    return () => clearTimeout(t)
  }, [shownKey])   // eslint-disable-line react-hooks/exhaustive-deps -- once, when the Document screen opens on a field being placed
  const onPrimary = (p: ContractPrimary) => {
    if (p === 'send') { if (blockIssue) { sayBlocked(); return } setSendOpen(true); return }
    if (p === 'remind' || p === 'resend') { setRemindOpen(true); return }
    if (p === 'won') { moveToWon(); return }
    if (data.signedFile) window.location.assign(`/files/raw/${data.signedFile.fileId}?download=1`); else onMenu('pdf')   // (pending modules S03) the kept signed copy itself
  }
  const onScreenMenu = (a: ContractMenuAction) => {
    if (a === 'record') { setRecordOpen(true); return }
    if (a === 'signedCopy') { if (data.signedFile) go(fileHref(data.signedFile.fileId)); return }
    if (a === 'markSigned') { setSignedOpen(true); return }
    if (a === 'stop') { stopLink(); return }
    if (a === 'recipient') { openSection('details', 'recipient', true); return }
    if (a === 'automation') { if (signedLock) setAutoDialog(true); else openSection('automation', null, true); return }
    onMenu(a)
  }
  const pdfInputEl = <input ref={pdfInput} type="file" accept={PDF_ACCEPT} hidden aria-hidden tabIndex={-1} data-testid="contract-pdf-input" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pickPdf(f) }} />
  const pdfCard = (
    <div data-testid="contract-uploaded" style={{ display: 'contents' }}>
      <ContractPdf name={pdf?.name ?? contract.fileName ?? title} src={pdf ? `/files/raw/${pdf.fileId}` : null} thumb={pdf?.thumb ? `/files/thumb/${pdf.fileId}` : null} picture={pdf?.picture}
                   help={pdf ? (pdf.picture ? 'The photo of the signed paper — kept in Files › Contract & VOs as the signed copy.' : status === 'Signed' ? 'The PDF the contract was signed on — kept in Files › Contract & VOs.' : 'The client reads this PDF on the signing link and signs under it. Kept in Files › Contract & VOs.')
                     : 'Only its name was kept — attach the PDF so the client reads it on the link and you can open it again.'}
                   actions={<>
                     <Button variant="secondary" appearance="outlined" iconStart={<Icon name="draw" size={20} />} onPress={() => openSection('gates')} isDisabled={status === 'Signed'}>Before the client signs</Button>
                     {!pdf ? <Button iconStart={<Icon name="upload_file" size={20} />} onPress={() => pdfInput.current?.click()} isDisabled={pdfBusy} data-testid="contract-attach-pdf">{pdfBusy ? 'Keeping…' : 'Attach the PDF'}</Button>
                       : status === 'Draft' ? <Button variant="secondary" appearance="text" onPress={() => pdfInput.current?.click()} isDisabled={pdfBusy} data-testid="contract-replace-pdf">{pdfBusy ? 'Keeping…' : 'Replace'}</Button> : null}
                   </>} />
    </div>
  )
  const recordDialog = (
    <Dialog open={recordOpen} onClose={() => setRecordOpen(false)} title="Signing record" size="modal" width={600}>
      <SigningRecord compact r={{ signedBy: contract.signedBy, signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, method: contract.verificationMethod, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, hash: data.signed?.hash ?? null }} />
    </Dialog>
  )

  return (
    <PageReveal skeleton={<ContractSkeleton pdf={uploaded} signed={contract.status === 'Signed'} />}>
      <div className={styles.page} data-testid="contract-editor" data-mode={mode} data-shell={mode === 'desk' ? undefined : split ? 'split' : 'phone'} style={split ? ({ '--list-pane': '300px', '--screen-left': '300px' } as CSSProperties) : undefined}>
        {mode === 'desk' ? (
          <>
        <ContractHeader crumbs={[{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Contracts', href: `/leads/${lead.id}/contracts` }]} title={title.trim() || 'Untitled contract'} siblings={siblings} currentId={contract.id}
                        onSwitch={(id) => go(withFrom(`/contracts/${id}`, from))}
                        /* (the calm UI build 2026-10-27, 4-11 · W-197 · T-04 · T-06) no tags beside the status pill: the signed day is the banner's, "From
                           template" left (the template's gallery card says what it is used by); an upload's kind and a bundle are words, not tags */
                        chips={uploaded || (contract.bundleId && status === 'Sent to Client') ? <span className={styles.headWords} data-testid="contract-head-words">{[uploaded ? (pdf?.picture ? 'Signed on paper' : 'Uploaded PDF') : null, contract.bundleId && status === 'Sent to Client' ? 'Sent together' : null].filter(Boolean).join(' · ')}</span> : null}
                        savedLabel={savedLabel(updatedAt, clock)} statusSlot={statusPill}
                        primary={status === 'Signed'
                          /* (UX audit C1) a signed contract's main press is its signed copy — Send was a dead button */
                          ? { label: 'Download signed copy', onPress: () => { if (data.signedFile) window.location.assign(`/files/raw/${data.signedFile.fileId}?download=1`); else onMenu('pdf') } }   // (pending modules S03) the kept signed copy itself
                          : { label: 'Send', onPress: () => { if (blockIssue) { sayBlocked(); return } setSendOpen(true) }, disabled: !canSend, hint: sendHint }}
                        /* (the calm UI build 2026-10-27, 4-18 · W-120 · W-156) Preview alone beside the ⋮: the bell (a notifications glyph that set two
                           reminders) is the ⋮'s Reminders…, the link icon that sent a Draft is the ⋮'s Copy signing link (the Send dialog's foot keeps its
                           Copy link) — each says what it does in words */
                        actions={<>
                          <Tooltip label="Preview" shortcut="preview"><Button variant="secondary" appearance="outlined" onPress={() => onMenu('preview')} data-kb="preview">Preview</Button></Tooltip>
                        </>}
                        foldedItems={<>
                          <DropdownItem onSelect={() => onMenu('preview')} shortcut="preview">Preview</DropdownItem>
                          <DropdownDivider />
                        </>}
                        menu={<>
                          {/* (4-18) the title renames here — the meta row's second copy of it left (the header, the paper's heading and the Outline keep it) */}
                          <DropdownItem onSelect={() => setRenameOpen(true)} disabled={signedLock} title={signedLock ? 'Signed — the title stays as signed' : undefined}>Rename…</DropdownItem>
                          {/* (UX audit C8) on a Draft the copy sends it — said in the row, before the press */}
                          <DropdownItem onSelect={() => onMenu('copy')} help={status === 'Draft' ? 'Copying it sends the contract' : undefined}>Copy signing link</DropdownItem>
                          <DropdownItem onSelect={() => setAutoDialog(true)}>Reminders…</DropdownItem>
                          <DropdownDivider />
                          {/* (UX audit C9) the way a paper or elsewhere signature is recorded — it hid in the status pill */}
                          <DropdownItem onSelect={() => setSignedOpen(true)} disabled={status === 'Signed'} title={status === 'Signed' ? 'It is signed' : undefined}>Mark as signed…</DropdownItem>
                          {/* (pending modules S03 — 1.0's cancel) only while it is out for signature */}
                          {status === 'Sent to Client' ? <DropdownItem onSelect={stopLink} help={contract.bundleId ? 'Every document on its link goes back to Draft' : 'Back to Draft — the client’s link stops opening'}>Stop the signing link</DropdownItem> : null}
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('duplicate')}>Duplicate and edit</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('template')} disabled={uploaded} title={uploaded ? 'An uploaded PDF has no document to save' : undefined}>Save as template</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('pdf')}>Download as PDF</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('print')}>Print</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('archive')}>Archive</DropdownItem>
                          <DropdownItem tone={canDelete ? 'danger' : undefined} onSelect={() => onMenu('delete')} disabled={!canDelete} title={canDelete ? undefined : CONTRACT_DELETE_RULE}>Delete</DropdownItem>
                        </>}
                        onClose={close} />

        <div className={styles.meta} data-testid="contract-meta">
          <div className={`${styles.metaEnd} ${styles.metaStart}`}>
            <Tooltip label={signedLock ? 'Signed — the recipient stays as signed' : 'Edit recipient'}>
              <button type="button" className={styles.recipient} onClick={() => { if (!signedLock) setRecipientOpen(true) }} aria-disabled={signedLock || undefined} data-testid="contract-recipient">
                <Icon name="person" size={20} weight={300} />
                <span className={styles.recipientName}>{recipientName || lead.name}</span>
                <span className={styles.recipientMeta}>· {phoneTyped(recipientPhone)}</span>
                {signedLock ? null : <span className={styles.recipientEdit}><Icon name="edit" size={16} weight={300} /></span>}
              </button>
            </Tooltip>
            {/* (REG-632, parity Q-08) The quote this contract reads — named, never swapped for another. */}
            <span className={quoteStyles.anchor}>
              {/* (REG-729) The house compact select (m, a form row); signed, it stays focusable with its rule in the tooltip and no chevron. */}
              <Tooltip label={signedLock ? 'Signed — the quote stays as signed' : 'The quote this contract reads'} disabled={quoteOpen}>
                <SelectTrigger className={styles.metaSelect} open={quoteOpen} onClick={() => { if (!signedLock) setQuoteOpen((o) => !o) }} aria-disabled={signedLock || undefined} data-testid="contract-quote"
                               label={`Quote: ${namedQuote ? `${namedQuote.number} · ${money2(namedQuote.amountMinor)} · ${quoteStatusLabel(namedQuote.status)}` : 'No quote'}${quoteGone ? `. The quote was ${quoteGone}` : ''}`}
                               value={(
                                 <span className={styles.metaSelectValue}>
                                   <Icon name="request_quote" size={20} weight={300} />
                                   <span className={styles.recipientName}>{namedQuote ? namedQuote.number : 'No quote'}</span>
                                   {namedQuote ? <span className={styles.recipientMeta}>· {money2(namedQuote.amountMinor)}</span> : null}
                                   {/* (UX audit C2) the quote's status, where the contract names it — a Draft reads as one */}
                                   {namedQuote ? <span className={styles.quoteStatus} data-testid="contract-quote-status"><MetaChip color={namedQuote.status === 'Signed' ? 'green' : namedQuote.status === 'Draft' || namedQuote.status === 'Sent for Approval' ? 'yellow' : 'default'}>{quoteStatusLabel(namedQuote.status)}</MetaChip></span> : null}
                                   {quoteGone ? <span className={styles.quoteWarn}><Icon name="warning" size={16} /></span> : null}
                                 </span>
                               )} />
              </Tooltip>
              {/* (REG-728) Rows with a description: 320; the picked quote wears the Selected fill (its label is not plain text). */}
              {quoteMenu(false)}
            </span>
            {/* (REG-632, parity Q-10) Issued by — offered when Company › Profile names two or more entities. */}
            {entities.length > 1 ? (
              <span className={quoteStyles.anchor}>
                {/* (REG-729) The house compact select, as Quote beside it. */}
                <Tooltip label={signedLock ? 'Signed — the issuer stays as signed' : 'Issued by'} disabled={entityOpen}>
                  <SelectTrigger className={styles.metaSelect} open={entityOpen} onClick={() => { if (!signedLock) setEntityOpen((o) => !o) }} aria-disabled={signedLock || undefined} data-testid="contract-issuer"
                                 label={`Issued by: ${issuer.name}`}
                                 value={<span className={styles.metaSelectValue}><Icon name="domain" size={20} weight={300} /><span className={styles.recipientName}>{issuer.name}</span></span>} />
                </Tooltip>
                {/* (REG-728) The rows carry a meta, not a description: 240; the issuer wears the Selected fill. */}
                <Dropdown open={entityOpen} onClose={() => setEntityOpen(false)} align="right" width={MENU_WIDTH.wide} sheetTitle="Issued by">
                  {entities.map((name, i) => (
                    <DropdownItem key={name} role="menuitemradio" checked={(entity ?? entities[0]) === name} selected={(entity ?? entities[0]) === name} onSelect={() => pickEntity(name)} meta={i === 0 ? 'the studio' : undefined}>
                      {name}
                    </DropdownItem>
                  ))}
                </Dropdown>
              </span>
            ) : null}
            <span className={styles.dateBox}>
              <DateField label="Contract date" size="s" value={inputDate(new Date(contractDate))} today={new Date(now)} disabled={signedLock}
                         onChange={(v) => { const d = parseInputDate(v); if (d) { setContractDate(d.getTime()); queue({ contractDate: d.getTime() }) } }} />
            </span>
          </div>
        </div>

        {/* (REG-632, parity Q-08) The quote it names was archived or deleted: said, never replaced by another. */}
        {quoteGone && namedQuote && !signedLock ? (
          <div className={bannerStyles.banner} role="status" data-tone="changes" data-testid="contract-quote-gone">
            <span className={bannerStyles.bannerIcon}><Icon name="warning" size={20} weight={300} /></span>
            <span className={bannerStyles.bannerText}>{namedQuote.number} was {quoteGone}. This contract still quotes it — pick the quote it should read.</span>
            <span className={bannerStyles.bannerActions}><Button variant="secondary" appearance="outlined" onPress={() => setQuoteOpen(true)}>Pick a quote</Button></span>
          </div>
        ) : null}
        <ContractBanner status={status} recipient={recipientName || lead.name} sentAt={sentAt} signedAt={signedAt ? signedAt.getTime() : null} signedBy={status === 'Signed' ? contract.signedBy : null} now={clock}
                        viewedAt={contract.viewedAt ? contract.viewedAt.getTime() : null} onRecord={status === 'Signed' && data.signed ? () => setRecordOpen(true) : undefined}
                        leadStage={data.leadStage} onMoveWon={status === 'Signed' && wonHref ? moveToWon : undefined}
                        expiresAt={expiresAt} onResend={() => { if (blockIssue) { sayBlocked(); return } setSendOpen(true) }} toRead={contract.toRead}
                        onSignedCopy={status === 'Signed' && data.signedFile ? () => go(withFrom(`/leads/${lead.id}/files/${data.signedFile!.fileId}`, `/contracts/${contract.id}`)) : undefined} />
        {/* (REG-633, parity Q-19) the signing record, as the client's page and the print carry it */}
        {recordDialog}

        {!uploaded ? (
          <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign}
                      onOutline={() => (narrow ? setOutlineDrawer((o) => !o) : setOutlinePref(!outlinePref))} outlineOpen={narrow ? outlineDrawer : outlinePref} disabled={status === 'Signed'} locked={status === 'Signed'} writing={status === 'Signed' ? undefined : writing.trigger /* (S42 B-19) no Write with AI on a signed copy — shown only when it applies */} />
        ) : null}

        <div className={styles.body}>
          {!uploaded && outlinePref && !narrow ? <OutlinePane items={outline} onClose={() => setOutlinePref(false)}
                                                      onPick={(i) => { if (editor.current) editor.current.scrollToHeading(i); else (document.querySelector('[data-testid="contract-signed-copy"]')?.querySelectorAll('h1, h2, h3')[i] as HTMLElement | undefined)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} /> : null}
          <div className={styles.stage}>
            {uploaded ? (
              /* (pending modules S03) the PDF itself, kept in the lead's Files › Contract & VOs — the client reads this very file on the link */
              <div data-testid="contract-uploaded" style={{ display: 'contents' }}>
                <input ref={pdfInput} type="file" accept={PDF_ACCEPT} hidden aria-hidden tabIndex={-1} data-testid="contract-pdf-input" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pickPdf(f) }} />
                <ContractPdf name={pdf?.name ?? contract.fileName ?? title} src={pdf ? `/files/raw/${pdf.fileId}` : null} thumb={pdf?.thumb ? `/files/thumb/${pdf.fileId}` : null} picture={pdf?.picture}
                             help={pdf ? (pdf.picture ? 'The photo of the signed paper — kept in Files › Contract & VOs as the signed copy.' : status === 'Signed' ? 'The PDF the contract was signed on — kept in Files › Contract & VOs.' : 'The client reads this PDF on the signing link and signs under it. Kept in Files › Contract & VOs.')
                               : 'Only its name was kept — attach the PDF so the client reads it on the link and you can open it again.'}
                             actions={<>
                               {/* (sweep S2 #17) an uploaded PDF has no formatting bar, so its eSignatures (Before the client signs) open from here */}
                               <Button variant="secondary" appearance="outlined" iconStart={<Icon name="draw" size={20} />} onPress={() => setEsign(true)} isDisabled={status === 'Signed'}>Before the client signs</Button>
                               {!pdf ? <Button iconStart={<Icon name="upload_file" size={20} />} onPress={() => pdfInput.current?.click()} isDisabled={pdfBusy} data-testid="contract-attach-pdf">{pdfBusy ? 'Keeping…' : 'Attach the PDF'}</Button>
                                 : status === 'Draft' ? <Button variant="secondary" appearance="text" onPress={() => pdfInput.current?.click()} isDisabled={pdfBusy} data-testid="contract-replace-pdf">{pdfBusy ? 'Keeping…' : 'Replace'}</Button> : null}
                             </>} />
              </div>
            ) : status === 'Signed' && data.signed?.body ? (
              /* (REG-631, parity Q-05) Signed: the copy kept at signing, as the client and every print see it. */
              <div className={styles.signedCopy} data-testid="contract-signed-copy">
                <ContractPaper html={data.signed.body} values={values} brand={data.brand} studio={studio} studioSignature={data.signed.studioSignature} letterhead={data.letterhead}
                               client={signedAt ? { name: contract.signedBy ?? recipientName ?? lead.name, at: signedAt, nric: contract.signedNric, drawing: contract.signatureKind === 'draw' ? contract.signatureData : null } : null} />
              </div>
            ) : (
              <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
                <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={setDocState} label="Contract document"
                           placeholder="Start writing, or insert a field…" readOnly={status === 'Signed'} chipTip={chipTip} />
              </div>
            )}
          </div>
        </div>
          </>
        ) : (
          <>
            {/* (Contracts on the move, P-01) the Contract screen — read first; the list and the section screens layer over it while editing */}
            <ContractScreen inert={editing}
                            title={title.trim() || 'Untitled contract'} recipient={{ name: recipientName || lead.name, phone: recipientPhone || lead.phone, first: clientFirst }}
                            status={status} statusSlot={statusPill}
                            metaWords={[uploaded ? (pdf?.picture ? 'Signed on paper · a photo' : 'Uploaded PDF') : null, contract.bundleId && status === 'Sent to Client' ? 'Sent together' : null].filter((w): w is string => !!w)}
                            signedLine={status === 'Signed' ? `Signed${signedAt ? ` ${displayDate(signedAt)}` : ''} · ${contract.signedBy ? `by ${contract.signedBy} online` : 'marked by the studio'}` : null}
                            contractDate={contractDate}
                            quote={namedQuote ? { number: namedQuote.number, amountText: money2(namedQuote.amountMinor), status: namedQuote.status, gone: quoteGone } : null}
                            quoteSheet={quoteMenu(true)} onQuoteRow={() => { if (signedLock) openQuote(); else setQuoteOpen((o) => !o) }}
                            onDate={() => { if (!signedLock) openSection('details', 'date', true) }}
                            onEditRecipient={() => openSection('details', 'recipient', true)}
                            next={next} onPrimary={onPrimary}
                            onEdit={openEdit} onBack={close} backLabel={backLabel(from, { leadName: lead.name, fallback: `Back to ${lead.name}` })}
                            onMenu={onScreenMenu} menu={{ canDelete, deleteRule: CONTRACT_DELETE_RULE, uploaded, hasRecord: status === 'Signed' && !!data.signed, hasSignedCopy: status === 'Signed' && !!data.signedFile }}
                            document={<ContractDocument html={docHtml} values={values} brand={data.brand} studio={studio} studioSignature={status === 'Signed' && data.signed ? data.signed.studioSignature : data.studioSignature} letterhead={data.letterhead}
                                                        client={signedAt && status === 'Signed' ? { name: contract.signedBy ?? recipientName ?? lead.name, at: signedAt, nric: contract.signedNric, drawing: contract.signatureKind === 'draw' ? contract.signatureData : null } : null}
                                                        uploaded={uploaded} pdf={pdf ? { name: pdf.name, src: `/files/raw/${pdf.fileId}`, thumb: pdf.thumb ? `/files/thumb/${pdf.fileId}` : null, picture: pdf.picture } : uploaded ? { name: contract.fileName ?? title, src: null, thumb: null } : null}
                                                        blank={blank} onAsPrinted={() => go(withFrom(`/contracts/${contract.id}/preview?paper=1`, from))} />}
                            folds={{ fields: { rows: SIGN_FIELDS.map((f) => ({ label: f.label, placed: clauses.find((c) => c.signs.includes(f.key))?.title ?? null })), line: fieldsLine, uploaded },
                                     gates: { scroll: gates.requiresScroll, accept: gates.requiresAccept, words: gates.acceptLabel, uploaded }, automation: auto,
                                     files: { signed: data.signedFile ? { name: data.signedFile.name, href: fileHref(data.signedFile.fileId) } : null, pdf: pdf ? { name: pdf.name, href: fileHref(pdf.fileId) } : null }, activity: timeline }}
                            onEditSection={(k) => openSection(k, null, true)} signed={signedLock} />
            {/* (P-02) Edit is the section list, every time; a landscape tablet keeps it as the 300 pane */}
            {editing ? <SectionList<ContractEditKey> rows={sectionRows} number={title.trim() || 'Untitled contract'} savedLabel={savedLabel(updatedAt, clock)} current={shownKey} onOpen={(k) => openSection(k)} onDone={doneEditing} pane={split} inert={mode === 'section' && !split}
                                                     title="Edit contract" subtitle={`${title.trim() || 'Untitled contract'} · ${savedLabel(updatedAt, clock).replace(/^Saved/, 'saved')}`} /> : null}
            {uploaded ? pdfInputEl : null}
            {shownKey === 'details' ? (
              <SectionScreen title="Details" subtitle={savedLabel(updatedAt, clock)} onBack={backToList} backLabel={direct ? 'Back to the contract' : 'Back to the sections'} testId="details-screen">
                <DetailsForm v={{ title, recipientName: recipientName || lead.name, recipientPhone: recipientPhone || lead.phone.replace(/\D/g, '').slice(-8), contractDate, quoteId, entity }}
                             quotes={data.quotes} quoteGone={quoteGone} entities={entities} locked={signedLock} now={now} focus={detailsFocus}
                             onTitle={(t) => { setTitle(t); queue({ title: t }) }}
                             onRecipient={(n, p, valid) => { setRecipientName(n); setRecipientPhone(p); queue({ recipientName: n, ...(valid ? { recipientPhone: p } : {}) }) }}
                             onDate={(at) => { setContractDate(at); queue({ contractDate: at }) }}
                             onQuote={pickQuote} onEntity={pickEntity} />
              </SectionScreen>
            ) : null}
            {shownKey === 'document' ? (uploaded ? (
              <SectionScreen title="Document" subtitle={pdf ? pdf.name : 'No PDF attached yet'} onBack={backToList} backLabel={direct ? 'Back to the contract' : 'Back to the sections'} testId="document-screen"
                             trailing={<Button appearance="text" onPress={doneEditing} data-testid="document-done">Done</Button>}>
                {pdfCard}
              </SectionScreen>
            ) : (
              /* (P-03) the paper full-screen in C1's frame; today's toolbar and editor are its content — C2 makes their insides the one tool row */
              <DocumentFrame subtitle={docSub} onBack={backToList} onDone={doneEditing} backLabel={direct ? 'Back to the contract' : 'Back to the sections'}
                             outlineOpen={split ? outlinePane : outlineDrawer} onOutline={() => (split ? setOutlinePane((o) => !o) : setOutlineDrawer((o) => !o))}
                             pane={split && outlinePane ? <OutlinePane inDrawer items={outline} onClose={() => setOutlinePane(false)} onPick={(i) => editor.current?.scrollToHeading(i)} /> : undefined}>
                <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign} writing={writing.trigger} />
                <div className={styles.body}>
                  <div className={styles.stage}>
                    <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
                      <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={onDocState} label="Contract document" placeholder="Start writing, or insert a field…" chipTip={chipTip} />
                    </div>
                  </div>
                </div>
              </DocumentFrame>
            )) : null}
            {shownKey === 'fields' ? (
              <SectionScreen title="Signature fields" subtitle={fieldsLine} onBack={backToList} backLabel={direct ? 'Back to the contract' : 'Back to the sections'} testId="fields-screen">
                {uploaded ? <p className={screenStyles.note}>A PDF is read and signed on the page itself: the client ticks your words, then signs under it. There are no fields to place.</p> : (<>
                  <div className={docStyles.panelCard}><SignatureFieldsPanel html={body} hasStudioSignature={!!me?.signatureKind} locked={signedLock} onPlace={placeField} /></div>
                  <p className={screenStyles.note}>{signedLock ? 'Signed — the fields stay where they were signed.' : 'Add asks which field, then where it goes — after one of the clauses, as its own block. The client’s field is where they sign online once you send the link.'}</p>
                </>)}
              </SectionScreen>
            ) : null}
            {shownKey === 'gates' ? (
              <SectionScreen title="Before the client signs" subtitle={gatesLine} onBack={backToList} backLabel={direct ? 'Back to the contract' : 'Back to the sections'} testId="gates-screen">
                <div className={docStyles.panelCard}><BeforeSigningPanel bare gates={gates} onGates={(p) => { setGates((g) => ({ ...g, ...p })); queue(p) }} uploaded={uploaded} locked={signedLock} /></div>
                <p className={screenStyles.note}>{signedLock ? 'Signed — the rules stay as they were when the client signed.' : 'Both rules hold on the signing page before the signature box opens.'}</p>
              </SectionScreen>
            ) : null}
            {shownKey === 'automation' ? (
              <SectionScreen title="Reminders" subtitle={autoLine} onBack={backToList} backLabel={direct ? 'Back to the contract' : 'Back to the sections'} testId="automation-screen">
                <div className={screenStyles.rowList} data-testid="automation-rows"><AutomationRows reminders={auto.reminders} thankYou={auto.thankYou} onChange={changeAuto} /></div>
                <p className={screenStyles.note}>Each is a task on the lead: a follow-up three days after sending (closed once it’s signed), and one on the signing day to thank the client.</p>
              </SectionScreen>
            ) : null}
            {shownKey === 'files' ? (
              <SectionScreen title="Files" subtitle={filesLine} onBack={backToList} backLabel={direct ? 'Back to the contract' : 'Back to the sections'} testId="files-screen">
                {data.signedFile || pdf ? (
                  <div className={screenStyles.rowList}>
                    {data.signedFile ? <a className={screenStyles.row} href={fileHref(data.signedFile.fileId)} data-testid="files-signed-copy"><span className={screenStyles.rowText}><span className={screenStyles.rowLabel}>{data.signedFile.name}</span><span className={screenStyles.rowHelp}>The signed copy · in Files › Contract &amp; VOs</span></span><span className={screenStyles.rowActs}><Icon name="chevron_right" size={24} /></span></a> : null}
                    {pdf ? <a className={screenStyles.row} href={fileHref(pdf.fileId)} data-testid="files-pdf"><span className={screenStyles.rowText}><span className={screenStyles.rowLabel}>{pdf.name}</span><span className={screenStyles.rowHelp}>The PDF the client reads · in Files › Contract &amp; VOs</span></span><span className={screenStyles.rowActs}><Icon name="chevron_right" size={24} /></span></a> : null}
                  </div>
                ) : null}
                {uploaded && !pdf ? pdfCard : null}
                <p className={screenStyles.note}>{uploaded ? 'The PDF is the document the client signs; the signed copy is kept beside it once it comes back.' : 'The signed copy is kept here, in the lead’s Files › Contract & VOs, once the contract comes back signed — online, or attached on Mark as signed.'}</p>
              </SectionScreen>
            ) : null}
            {recordDialog}
          </>
        )}

        <Drawer open={!uploaded && narrow && outlineDrawer} onClose={() => setOutlineDrawer(false)} title="Outline" label="Outline" width="narrow">
          <OutlinePane inDrawer items={outline} onClose={() => setOutlineDrawer(false)}
                       onPick={(i) => { setOutlineDrawer(false); if (editor.current) editor.current.scrollToHeading(i); else (document.querySelector('[data-testid="contract-signed-copy"]')?.querySelectorAll('h1, h2, h3')[i] as HTMLElement | undefined)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} />
        </Drawer>
        <ESignPanel open={esign} onClose={() => setEsign(false)} hasStudioSignature={!!me?.signatureKind} onInsert={(html) => editor.current?.insertHtml(html)}
                    gates={gates} uploaded={uploaded} locked={signedLock} onGates={(p) => { setGates((g) => ({ ...g, ...p })); queue(p) }} />
        <SendContractDialog open={sendOpen} onClose={() => setSendOpen(false)} link={link} defaults={{ name: recipientName || lead.name, phone: recipientPhone || lead.phone }} onCopy={status === 'Draft' ? shareDraft : undefined}
                            subtitle={contract.toRead ? 'Your client reads it in their browser and keeps a copy — there is nothing to sign.' : `Your client reviews and signs in their browser. ${signCodeLine(codeDemo)} The link opens for ${data.linkDays} days from when you send it.`}   /* (pending modules S03) the window, said before the press · (S44R, C9) a letter to read says so */
                            {...(contract.toRead ? { title: 'Send the letter' } : {})}
                            subtitleShort={contract.toRead ? 'Your client reads it in their browser and keeps a copy.' : SIGN_SEND_LINE}   /* (contracts on the move, B-17) the one line a phone's head holds; the rest under "How signing works" */
                            extra={status !== 'Signed' && !contract.toRead ? <>
                              {/* (S44R — UAT row 358, call C7) the deposit, said whole before it goes — or why it can't be asked for */}
                              <DepositAsk contractId={contract.id} option={quoteId ? data.deposits[quoteId] ?? null : null} on={askDeposit} onChange={setAskDeposit} recipient={recipientName || lead.name} beforeSave={() => flushRef.current()} helpClassName={styles.sendHelp} />
                              {data.standardDocs > 0 ? <span className={styles.markSigned} data-testid="send-standard-docs"><span className={styles.footNote}>{data.standardDocs === 1 ? 'Your standard document goes with it' : `Your ${data.standardDocs} standard documents go with it`} through Send together.</span><Button appearance="text" onPress={() => { setSendOpen(false); go(`/leads/${lead.id}/contracts?bundle=${encodeURIComponent(contract.id)}`) }}>Send together</Button></span> : null}
                            </> : undefined}
                            onMarkSigned={() => { setSendOpen(false); setSignedOpen(true) }}   /* (UX audit C9) signed in person: the other way it comes back */
                            notes={issues.filter((i) => !i.blocking).map((i) => i.label)}
                            draft={(name) => (contract.toRead ? letterMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: title.trim() || 'letter', link, toRead: true }) : signingMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: title.trim() || 'agreement', link }))}
                            onSend={async ({ name, phone, message }) => {
                              /* The chat opens on the press itself (a window opened after the round-trip is a blocked popup); the record follows. */
                              window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
                              await flushRef.current()
                              try {
                                const r = await sendContract(contract.id, { name, phone })
                                if ('error' in r) { snackbar({ message: `Couldn’t send the contract — ${r.error}` }); return }   // (UX audit C2) the named quote's rule
                                setStatus(r.status); setRecipientName(name); setRecipientPhone(phone); setUpdatedAt(r.updatedAt); setSentAt(r.sentAt); setExpiresAt(r.expiresAt); setSendOpen(false)
                                snackbar({ message: contract.toRead ? `Sent to ${name} to read and keep` : `Sent to ${name} for signature` })
                              } catch (e) { snackbar({ message: sendError(e) }) }
                            }} />
        {/* (Contracts on the move, Q-07) Remind — the lists' Send a reminder (UX audit C5): the same link, a nudge on WhatsApp; the link's window opens again from now (1.0's resend) */}
        <SendContractDialog open={remindOpen} onClose={() => setRemindOpen(false)} title={expired ? 'Send the link again' : 'Send a reminder'} link={contractLink({ id: contract.id, signToken: token, bundleId: contract.bundleId, status })}
                            subtitle={`${title.trim() || 'The agreement'} is still waiting for a signature. Send on WhatsApp opens your chat with the client, the same link in the message — it opens for ${data.linkDays} days from now.`}
                            subtitleShort={expired ? `A new link on WhatsApp — it opens for ${data.linkDays} days.` : 'A nudge on WhatsApp with the same link.'}
                            defaults={{ name: recipientName || lead.name, phone: recipientPhone || lead.phone }}
                            draft={(name) => reminderMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: title.trim() || 'agreement', link: contractLink({ id: contract.id, signToken: token, bundleId: contract.bundleId, status }) })}
                            onSend={({ name, phone, message }) => {
                              window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')   // on the press, before the round-trip
                              const wasExpired = expired
                              setRemindOpen(false)
                              void flushRef.current().then(() => renewSigningLink(contract.id, 'whatsapp')).then((r) => {
                                if ('error' in r) { snackbar({ message: `Couldn’t renew the link — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return }
                                setExpiresAt(r.expiresAt); snackbar({ message: wasExpired ? `Link sent again to ${name}` : `Reminder sent to ${name}` }); router.refresh()
                              }, () => snackbar({ message: 'Couldn’t renew the link — please try again' }))
                            }} />
        <AutomationDialog open={autoDialog} onClose={() => setAutoDialog(false)} reminders={auto.reminders} thankYou={auto.thankYou} onChange={changeAuto} />
        <MarkSignedDialog open={signedOpen} onClose={() => setSignedOpen(false)} today={new Date(now)}
                          onSave={async (o) => {
                            try {
                              await flushRef.current(); const r = await markContractSigned(contract.id, o)
                              if (r && 'error' in r) { snackbar({ message: `Couldn’t mark the contract signed — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return }   // (pending modules S03) the copy refused: the dialog stays
                              setStatus('Signed'); setSignedAt(new Date(o.signedOn)); setSignedOpen(false)
                              /* (S44R — UAT row 358, call C7) a signature that started the project says so, with the way there; else Move to Won (UX audit C1) */
                              if (r && 'started' in r) snackbar({ message: `${title.trim() || 'Contract'} marked Signed — ${r.started.words}`, actionLabel: 'Open project', onAction: () => go(withFrom(`/projects/${r.started.projectId}`, `/contracts/${contract.id}`)) })
                              else snackbar({ message: `${title.trim() || 'Contract'} marked Signed`, ...(wonHref ? { actionLabel: 'Move to Won', onAction: moveToWon } : {}) })   // (UX audit C1) the next step
                              router.refresh()
                            }
                            catch { snackbar({ message: 'Couldn’t mark the contract signed — please try again' }) }
                          }} />
        <RecipientDialog open={recipientOpen} onClose={() => setRecipientOpen(false)} name={recipientName} phone={recipientPhone}
                         onSave={({ name, phone }) => { setRecipientName(name); setRecipientPhone(phone); queue({ recipientName: name, recipientPhone: phone }); setRecipientOpen(false) }} />
        <RenameContractDialog open={renameOpen} title={title} onClose={() => setRenameOpen(false)} onSave={(t) => { setTitle(t); queue({ title: t }); void flushRef.current() }} />
        <SaveTemplateDialog open={templateOpen} onClose={() => setTemplateOpen(false)} defaultName={title.trim() || 'Contract template'} busy={templateBusy}
                            onSave={async (name) => {
                              setTemplateBusy(true)
                              try { await flushRef.current(); const id = await orThrow(saveContractAsTemplate(contract.id, name)); setTemplateOpen(false); snackbar({ message: `${name} saved to your contract templates`, actionLabel: 'Open', onAction: () => router.push(`/templates/contracts/${id}?from=${encodeURIComponent(`/contracts/${contract.id}`)}`) }) }
                              catch { snackbar({ message: 'Couldn’t save the template — please try again' }) } finally { setTemplateBusy(false) }
                            }} />
        {/* (REG-631, parity Q-04) Moving a studio-marked signature back: said plainly, then every signing stamp goes. */}
        <UnsignDialog to={unsignTo} signedAt={signedAt} onCancel={() => setUnsignTo(null)} onConfirm={() => { const to = unsignTo; setUnsignTo(null); if (to) applyStatus(to) }} />
        <ConfirmDialog open={deleteOpen} title="Delete contract" message="Are you sure you want to delete this contract? You can restore it from Deleted contracts." confirmLabel="Delete" tone="danger"
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void orThrow(deleteContracts([contract.id])).then((r) => { snackbar({ message: contractsDeletedLine(r) }); if (r.deleted) router.push(backHref) }, () => snackbar({ message: 'Couldn’t delete the contract — please try again' })) }} />
        {writing.dialog}
        <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (sweep S2 #30) the FAB's own press toggles it · (pending modules S10) the shell's one sheet */}
        {mode === 'desk' || mode === 'read' ? <span ref={fabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} raised={mode === 'read'} /></span> : null}   {/* (P-01 · P-03) above the Contract screen's foot; never over a section screen or the paper */}
      </div>
    </PageReveal>
  )
}
