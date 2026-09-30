'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { DateField } from '@/components/om/date-field'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useCopy } from '@/components/om/use-copy'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { ContractSkeleton } from './contract-skeleton'
import { MSG } from '@/lib/forms'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { SelectTrigger } from '@/components/om/select-trigger'
import { useFlagPref } from '@/lib/prefs'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Drawer } from '@/components/om/drawer'
import { withFrom } from '@/lib/nav'
import { displayDate, inputDate, parseInputDate, phoneTyped } from '@/lib/format'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { contractLink, firstName, longDate, savedLabel, signingLink, signingMessage } from '@/lib/contracts/model'
import { contractIssuer, issuerChoices } from '@/lib/contracts/issuer'
import { money2 } from '@/lib/quotes/math'
import bannerStyles from '@/components/quotes/editor/template-bar.module.css'
import { isBlankDoc, outlineOf, TOKEN_LABEL, type TokenKey, type TokenValues } from '@/lib/contracts/tokens'
import { moveStageHref } from '@/lib/leads/move-link'
import type { ContractEditorData } from '@/lib/contracts/queries'
import { duplicateContract, markContractSigned, saveContractAsTemplate, saveContractDoc, sendContract, setContractAutomation, setContractStatusDoc, shareContractLink } from '@/app/contracts/actions'
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
import { AutomationDialog, AutomationPopover, MarkSignedDialog, RecipientDialog, SaveTemplateDialog, SendContractDialog } from './dialogs'
import quoteStyles from '@/components/quotes/editor/quote-editor.module.css'
import styles from './contract-editor.module.css'

const AUTOSAVE_MS = 600

/**
 * The contract editor (REG-534, no mock; the reference screens on 2.0's pieces): the quote editor's header (crumb · [title ▾]
 * · chips · Saved · [status ▾] · Send · Preview · automation · copy link · kebab · ✕), a meta row (title · recipient · date),
 * the formatting bar with Smart Text ▾ and eSignatures, then the canvas — Outline · paper · eSignatures drawer. Every change
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

  /* ── autosave (the quote editor's General Info rhythm) ── */
  const dirty = useRef<Parameters<typeof saveContractDoc>[1]>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const patch = dirty.current
    if (!Object.keys(patch).length) return
    dirty.current = {}
    try { setUpdatedAt(await saveContractDoc(contract.id, patch)) }
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
    'studio.name': issuer.name, 'studio.address': issuer.address, 'studio.uen': issuer.uen, 'studio.gst': issuer.gstReg,
  }), [data.values, recipientName, recipientPhone, contractDate, lead.name, lead.phone, namedQuote, issuer])
  const outline = useMemo(() => outlineOf(body), [body])

  /* ── panes and overlays ── */
  const [outlinePref, setOutlinePref] = useFlagPref('om.contracts.outline', true)
  const narrow = useMediaQuery(TABLET_DOWN)   // (REG-634, E-114) ≤1024 the Outline is a drawer
  const [outlineDrawer, setOutlineDrawer] = useState(false)
  const [esign, setEsign] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [autoDialog, setAutoDialog] = useState(false)   /* (sweep S2 #9) from the folded kebab */
  const [sendOpen, setSendOpen] = useState(false)
  const [signedOpen, setSignedOpen] = useState(false)
  const [recipientOpen, setRecipientOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const fabRef = useRef<HTMLSpanElement>(null)
  const link = signingLink(contract.id)
  const { copied, copy } = useCopy(contractLink({ id: contract.id, bundleId: contract.bundleId, status }), {   /* (REG-633, E-118) a bundled document copies the bundle's link */ done: 'Signing link copied' })
  const [unsignTo, setUnsignTo] = useState<'Draft' | 'Sent to Client' | null>(null)
  const [recordOpen, setRecordOpen] = useState(false)
  const [sentAt, setSentAt] = useState<number | null>(contract.sentAt ? contract.sentAt.getTime() : null)
  const viewer = { id: me?.id ?? null, role: me?.role }
  const signedLock = status === 'Signed'   // (REG-631, parity Q-04) a signed contract's title, recipient, date and text stay as signed
  const canDelete = canDeleteContract(viewer, contract)   // (REG-634, parity Q-21)
  const pickQuote = (id: string | null) => {
    setQuoteOpen(false)
    if (id === quoteId) return
    setQuoteId(id)
    const q = id ? data.quotes.find((x) => x.id === id) : null
    if (q) setEntity(q.issuingEntity && q.issuingEntity !== entities[0] ? q.issuingEntity : null)   // the quote's issuer comes with it (the server does the same)
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
  const issues = useMemo(() => contractReadiness({ source: contract.source, body, values, hasStudioSignature: !!data.studioSignature, hasQuote: !!namedQuote,
    quote: namedQuote ? { number: namedQuote.number, status: namedQuote.status } : null, approvalRequired: data.approvalRequired }), [contract.source, body, values, data.studioSignature, namedQuote, data.approvalRequired])
  const blockIssue = issues.find((i) => i.blocking) ?? null
  const openQuote = () => { if (namedQuote) go(withFrom(`/quotes/${namedQuote.id}`, `/contracts/${contract.id}`)) }
  const sayBlocked = () => { if (blockIssue) snackbar({ message: `Before you send: ${blockIssue.label}`, ...(blockIssue.fix === 'esign' ? { actionLabel: 'Show me', onAction: () => setEsign(true) } : blockIssue.fix === 'open-quote' && namedQuote ? { actionLabel: 'Open the quote', onAction: openQuote } : {}) }) }
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

  const applyStatus = (s: 'Draft' | 'Sent to Client') => {
    const was = { status, signedAt }
    setStatus(s); setSignedAt(null)
    void setContractStatusDoc(contract.id, s).then(() => { snackbar({ message: `Contract marked ${s}` }); if (s === 'Sent to Client' && !sentAt) setSentAt(Date.now()); router.refresh() },
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
      setStatus(r.status); setSentAt(r.sentAt); router.refresh(); snackbar({ message: 'Signing link copied — the contract is Sent to Client now' }); return true
    }, (e: unknown) => { snackbar({ message: sendError(e) }); return false })
  }
  const copyLink = () => {
    if (status === 'Draft' && blank) { snackbar({ message: 'Add some content before sharing the link' }); return }
    if (status === 'Draft' && blockIssue) { sayBlocked(); return }   // (REG-634, parity Q-22) sharing is sending
    if (status !== 'Draft') { void copy(); return }
    /* (UX audit C8, supersedes sweep S2 #2's order) the checks above first, then the copy, then the share — never Sent over a failed copy */
    const write = navigator.clipboard ? navigator.clipboard.writeText(contractLink({ id: contract.id, bundleId: contract.bundleId, status })) : Promise.reject(new Error('no clipboard'))
    void write.then(() => { void shareDraft() }, () => snackbar({ message: 'Couldn’t copy the link — the contract stays a Draft' }))
  }
  /* A refused save puts the switch back (sweep S2) — the panel said on while the record said off. */
  const changeAuto = (p: { reminders?: boolean; thankYou?: boolean }) => { const prev = auto; setAuto((a) => ({ ...a, ...p })); void setContractAutomation(contract.id, p).catch(() => { setAuto(prev); snackbar({ message: 'Couldn’t save the automation — please try again' }) }) }
  const onMenu = (a: 'duplicate' | 'template' | 'pdf' | 'print' | 'archive' | 'delete' | 'preview' | 'auto' | 'copy') => {
    if (a === 'preview') { go(withFrom(`/contracts/${contract.id}/preview`, from)); return }
    if (a === 'pdf' || a === 'print') { go(withFrom(`/contracts/${contract.id}/preview?print=1`, from)); return }
    if (a === 'copy') { copyLink(); return }
    if (a === 'auto') { setAutoOpen((o) => !o); return }
    if (a === 'duplicate') { void flushRef.current().then(() => duplicateContract(contract.id)).then((id) => { snackbar({ message: 'Contract duplicated' }); router.push(withFrom(`/contracts/${id}`, from)) }, () => snackbar({ message: 'Couldn’t duplicate the contract — please try again' })); return }
    if (a === 'template') { if (uploaded) { comingSoon(); return } setTemplateOpen(true); return }
    if (a === 'archive') { void archiveContract(contract.id).then(() => { snackbar({ message: 'Contract archived', actionLabel: 'Undo', onAction: () => { void archiveContract(contract.id, true) } }); router.push(backHref) }, () => snackbar({ message: 'Couldn’t archive the contract — please try again' })); return }
    if (a === 'delete') setDeleteOpen(true)
  }

  const statusPill = (
    <span className={quoteStyles.anchor}>
      <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={statusOpen}
              iconEnd={<span className={quoteStyles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              onPress={() => setStatusOpen((o) => !o)}>{status}</Button>
      {/* (REG-728) The quote editor's status list: 240, "current" as the row's meta, a locked row's rule in the row. */}
      <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} sheetTitle="Status">
        {CONTRACT_STATUSES.map((s) => {
          const block = s !== status && status === 'Signed' ? unsignBlock({ status, signedBy: contract.signedBy }, viewer) : null
          return (
            <DropdownItem key={s} role="menuitemradio" checked={s === status} selected={false} onSelect={() => changeStatus(s)} disabled={!!block} title={block ?? undefined}
                          meta={s === status ? 'current' : undefined}>
              {s}
            </DropdownItem>
          )
        })}
      </Dropdown>
    </span>
  )

  return (
    <PageReveal skeleton={<ContractSkeleton />}>
      <div className={styles.page} data-testid="contract-editor">
        <ContractHeader crumbs={[{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Contracts', href: `/leads/${lead.id}/contracts` }]} title={title.trim() || 'Untitled contract'} siblings={siblings} currentId={contract.id}
                        onSwitch={(id) => go(withFrom(`/contracts/${id}`, from))}
                        chips={<>{signedAt ? <MetaChip>Signed {displayDate(signedAt)}</MetaChip> : null}{uploaded ? <MetaChip>Uploaded PDF</MetaChip> : null}{contract.templateId ? <MetaChip>From template</MetaChip> : null}{contract.bundleId && status === 'Sent to Client' ? <MetaChip>Sent together</MetaChip> : null}</>}
                        savedLabel={savedLabel(updatedAt, clock)} statusSlot={statusPill}
                        primary={status === 'Signed'
                          /* (UX audit C1) a signed contract's main press is its signed copy — Send was a dead button */
                          ? { label: 'Download signed copy', onPress: () => onMenu('pdf') }
                          : { label: 'Send', onPress: () => { if (blockIssue) { sayBlocked(); return } setSendOpen(true) }, disabled: !canSend, hint: sendHint }}
                        actions={<>
                          <Tooltip label="Preview" shortcut="preview"><Button variant="secondary" appearance="outlined" onPress={() => onMenu('preview')} data-kb="preview">Preview</Button></Tooltip>
                          <span className={quoteStyles.anchor}>
                            <Tooltip label="Automation" disabled={autoOpen}><IconButton icon="notifications" label="Automation" selected={autoOpen || auto.reminders || auto.thankYou} aria-haspopup="menu" aria-expanded={autoOpen} onClick={() => onMenu('auto')} /></Tooltip>
                            <AutomationPopover open={autoOpen} onClose={() => setAutoOpen(false)} reminders={auto.reminders} thankYou={auto.thankYou} onChange={changeAuto} />
                          </span>
                          {/* (UX audit C8) on a Draft the copy sends it — the tooltip says so before the press */}
                          <Tooltip label={copied ? 'Copied' : status === 'Draft' ? 'Copy link — marks it Sent' : 'Copy signing link'}><IconButton icon="link" label={status === 'Draft' ? 'Copy link — marks it Sent' : 'Copy signing link'} onClick={() => onMenu('copy')} /></Tooltip>
                        </>}
                        foldedItems={<>
                          <DropdownItem onSelect={() => onMenu('preview')} shortcut="preview">Preview</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('copy')} help={status === 'Draft' ? 'Marks it Sent to Client' : undefined}>Copy signing link</DropdownItem>
                          <DropdownItem onSelect={() => setAutoDialog(true)}>Automation</DropdownItem>
                          <DropdownDivider />
                        </>}
                        menu={<>
                          {/* (UX audit C9) the way a paper or elsewhere signature is recorded — it hid in the status pill */}
                          <DropdownItem onSelect={() => setSignedOpen(true)} disabled={status === 'Signed'} title={status === 'Signed' ? 'It is signed' : undefined}>Mark as signed…</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('duplicate')}>Duplicate and Edit</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('template')} disabled={uploaded} title={uploaded ? 'An uploaded PDF has no document to save' : undefined}>Save as Template</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('pdf')}>Download as PDF</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('print')}>Print</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('archive')}>Archive</DropdownItem>
                          <DropdownItem tone={canDelete ? 'danger' : undefined} onSelect={() => onMenu('delete')} disabled={!canDelete} title={canDelete ? undefined : CONTRACT_DELETE_RULE}>Delete</DropdownItem>
                        </>}
                        onClose={close} />

        <div className={styles.meta} data-testid="contract-meta">
          <input className={styles.titleInput} value={title} placeholder="Contract title" aria-label="Contract title" maxLength={120} readOnly={signedLock} aria-readonly={signedLock || undefined}
                 onChange={(e) => { if (signedLock) return; setTitle(e.target.value); queue({ title: e.target.value }) }} onBlur={() => { void flushRef.current() }} />
          <div className={styles.metaEnd}>
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
                               label={`Quote: ${namedQuote ? `${namedQuote.number} · ${money2(namedQuote.amountMinor)} · ${namedQuote.status}` : 'No quote'}${quoteGone ? `. The quote was ${quoteGone}` : ''}`}
                               value={(
                                 <span className={styles.metaSelectValue}>
                                   <Icon name="request_quote" size={20} weight={300} />
                                   <span className={styles.recipientName}>{namedQuote ? namedQuote.number : 'No quote'}</span>
                                   {namedQuote ? <span className={styles.recipientMeta}>· {money2(namedQuote.amountMinor)}</span> : null}
                                   {/* (UX audit C2) the quote's status, where the contract names it — a Draft reads as one */}
                                   {namedQuote ? <span className={styles.quoteStatus} data-testid="contract-quote-status"><MetaChip color={namedQuote.status === 'Signed' ? 'green' : namedQuote.status === 'Draft' || namedQuote.status === 'Sent for Approval' ? 'yellow' : 'default'}>{namedQuote.status}</MetaChip></span> : null}
                                   {quoteGone ? <span className={styles.quoteWarn}><Icon name="warning" size={16} /></span> : null}
                                 </span>
                               )} />
              </Tooltip>
              {/* (REG-728) Rows with a description: 320; the picked quote wears the Selected fill (its label is not plain text). */}
              <Dropdown open={quoteOpen} onClose={() => setQuoteOpen(false)} align="right" width={MENU_WIDTH.detail} sheetTitle="Quote">
                {data.quotes.map((q) => (
                  <DropdownItem key={q.id} role="menuitemradio" checked={q.id === quoteId} selected={q.id === quoteId} onSelect={() => pickQuote(q.id)} meta={`${money2(q.amountMinor)} · ${q.status}`}>
                    {`${q.number} · ${q.title}`}
                  </DropdownItem>
                ))}
                {data.quotes.length ? <DropdownDivider /> : null}
                <DropdownItem role="menuitemradio" checked={!quoteId} selected={!quoteId} onSelect={() => pickQuote(null)}>No quote</DropdownItem>
              </Dropdown>
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
                        leadStage={data.leadStage} onMoveWon={status === 'Signed' && wonHref ? moveToWon : undefined} />
        {/* (REG-633, parity Q-19) the signing record, as the client's page and the print carry it */}
        <Dialog open={recordOpen} onClose={() => setRecordOpen(false)} title="Signing record" size="modal" width={600}>
          <SigningRecord compact r={{ signedBy: contract.signedBy, signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, hash: data.signed?.hash ?? null }} />
        </Dialog>

        {!uploaded ? (
          <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign}
                      onOutline={() => (narrow ? setOutlineDrawer((o) => !o) : setOutlinePref(!outlinePref))} outlineOpen={narrow ? outlineDrawer : outlinePref} disabled={status === 'Signed'} />
        ) : null}

        <div className={styles.body}>
          {!uploaded && outlinePref && !narrow ? <OutlinePane items={outline} onClose={() => setOutlinePref(false)}
                                                      onPick={(i) => { if (editor.current) editor.current.scrollToHeading(i); else (document.querySelector('[data-testid="contract-signed-copy"]')?.querySelectorAll('h1, h2, h3')[i] as HTMLElement | undefined)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} /> : null}
          <div className={styles.stage}>
            {uploaded ? (
              <div className={styles.uploaded} data-testid="contract-uploaded">
                <span className={styles.uploadedGlyph}><Icon name="picture_as_pdf" size={32} /></span>
                <span className={styles.uploadedName}>{contract.fileName ?? title}</span>
                <span className={styles.uploadedHelp}>An uploaded PDF — there is no document to edit here. Send shares the signing link, which names the file for the client to sign; mark it signed when a signed copy comes back.</span>
                {/* (sweep S2 #17) an uploaded PDF has no formatting bar, so its eSignatures (Before the client signs) open from here */}
                <Button variant="secondary" appearance="outlined" iconStart={<Icon name="draw" size={20} />} onPress={() => setEsign(true)} isDisabled={status === 'Signed'}>Before the client signs</Button>
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
                           placeholder="Start writing, or insert a record with Smart Text…" readOnly={status === 'Signed'} chipTip={chipTip} />
              </div>
            )}
          </div>
        </div>

        <Drawer open={!uploaded && narrow && outlineDrawer} onClose={() => setOutlineDrawer(false)} title="Outline" label="Outline" width={320}>
          <OutlinePane inDrawer items={outline} onClose={() => setOutlineDrawer(false)}
                       onPick={(i) => { setOutlineDrawer(false); if (editor.current) editor.current.scrollToHeading(i); else (document.querySelector('[data-testid="contract-signed-copy"]')?.querySelectorAll('h1, h2, h3')[i] as HTMLElement | undefined)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} />
        </Drawer>
        <ESignPanel open={esign} onClose={() => setEsign(false)} hasStudioSignature={!!me?.signatureKind} onInsert={(html) => editor.current?.insertHtml(html)}
                    gates={gates} uploaded={uploaded} locked={signedLock} onGates={(p) => { setGates((g) => ({ ...g, ...p })); queue(p) }} />
        <SendContractDialog open={sendOpen} onClose={() => setSendOpen(false)} link={link} defaults={{ name: recipientName || lead.name, phone: recipientPhone || lead.phone }} onCopy={status === 'Draft' ? shareDraft : undefined}
                            onMarkSigned={() => { setSendOpen(false); setSignedOpen(true) }}   /* (UX audit C9) signed in person: the other way it comes back */
                            notes={issues.filter((i) => !i.blocking).map((i) => i.label)}
                            draft={(name) => signingMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: title.trim() || 'agreement', link })}
                            onSend={async ({ name, phone, message }) => {
                              /* The chat opens on the press itself (a window opened after the round-trip is a blocked popup); the record follows. */
                              window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
                              await flushRef.current()
                              try {
                                const r = await sendContract(contract.id, { name, phone })
                                if ('error' in r) { snackbar({ message: `Couldn’t send the contract — ${r.error}` }); return }   // (UX audit C2) the named quote's rule
                                setStatus(r.status); setRecipientName(name); setRecipientPhone(phone); setUpdatedAt(r.updatedAt); setSentAt(r.sentAt); setSendOpen(false)
                                snackbar({ message: `Sent to ${name} for signature` })
                              } catch (e) { snackbar({ message: sendError(e) }) }
                            }} />
        <AutomationDialog open={autoDialog} onClose={() => setAutoDialog(false)} reminders={auto.reminders} thankYou={auto.thankYou} onChange={changeAuto} />
        <MarkSignedDialog open={signedOpen} onClose={() => setSignedOpen(false)} today={new Date(now)}
                          onSave={async (o) => {
                            try {
                              await flushRef.current(); await markContractSigned(contract.id, o); setStatus('Signed'); setSignedAt(new Date(o.signedOn)); setSignedOpen(false)
                              snackbar({ message: `${title.trim() || 'Contract'} marked Signed`, ...(wonHref ? { actionLabel: 'Move to Won', onAction: moveToWon } : {}) })   // (UX audit C1) the next step
                              router.refresh()
                            }
                            catch { snackbar({ message: 'Couldn’t mark the contract signed — please try again' }) }
                          }} />
        <RecipientDialog open={recipientOpen} onClose={() => setRecipientOpen(false)} name={recipientName} phone={recipientPhone}
                         onSave={({ name, phone }) => { setRecipientName(name); setRecipientPhone(phone); queue({ recipientName: name, recipientPhone: phone }); setRecipientOpen(false) }} />
        <SaveTemplateDialog open={templateOpen} onClose={() => setTemplateOpen(false)} defaultName={title.trim() || 'Contract template'} busy={templateBusy}
                            onSave={async (name) => {
                              setTemplateBusy(true)
                              try { await flushRef.current(); const id = await saveContractAsTemplate(contract.id, name); setTemplateOpen(false); snackbar({ message: `${name} saved to your contract templates`, actionLabel: 'Open', onAction: () => router.push(`/templates/contracts/${id}?from=${encodeURIComponent(`/contracts/${contract.id}`)}`) }) }
                              catch { snackbar({ message: 'Couldn’t save the template — please try again' }) } finally { setTemplateBusy(false) }
                            }} />
        {/* (REG-631, parity Q-04) Moving a studio-marked signature back: said plainly, then every signing stamp goes. */}
        <UnsignDialog to={unsignTo} signedAt={signedAt} onCancel={() => setUnsignTo(null)} onConfirm={() => { const to = unsignTo; setUnsignTo(null); if (to) applyStatus(to) }} />
        <ConfirmDialog open={deleteOpen} title="Delete Contract" message="Are you sure you want to delete this contract? You can restore it from Deleted Contracts." confirmLabel="Delete" tone="danger"
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteContracts([contract.id]).then((r) => { snackbar({ message: contractsDeletedLine(r) }); if (r.deleted) router.push(backHref) }, () => snackbar({ message: 'Couldn’t delete the contract — please try again' })) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (sweep S2 #30) the FAB's own press toggles it */}
        <span ref={fabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}
