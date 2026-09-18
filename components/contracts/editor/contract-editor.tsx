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
import { EditorSkeleton } from '@/components/quotes/editor/editor-skeleton'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useFlagPref } from '@/lib/prefs'
import { withFrom } from '@/lib/nav'
import { displayDate, inputDate, parseInputDate, phoneTyped } from '@/lib/format'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { firstName, savedLabel, signingLink, signingMessage } from '@/lib/contracts/model'
import { isBlankDoc, outlineOf, type TokenValues } from '@/lib/contracts/tokens'
import type { ContractEditorData } from '@/lib/contracts/queries'
import { duplicateContract, markContractSigned, saveContractAsTemplate, saveContractDoc, sendContract, setContractAutomation, setContractStatusDoc } from '@/app/contracts/actions'
import { archiveContract, deleteContracts } from '@/app/leads/contracts-actions'
import { ContractHeader } from './contract-header'
import { DocEditor, IDLE_STATE, type DocEditorHandle, type DocState } from './doc-editor'
import { DocToolbar } from './doc-toolbar'
import { OutlinePane } from './outline-pane'
import { ESignPanel } from './esign-panel'
import { AutomationPopover, MarkSignedDialog, RecipientDialog, SaveTemplateDialog, SendContractDialog } from './dialogs'
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

  /* ── autosave (the quote editor's General Info rhythm) ── */
  const dirty = useRef<Parameters<typeof saveContractDoc>[1]>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const patch = dirty.current
    if (!Object.keys(patch).length) return
    dirty.current = {}
    try { setUpdatedAt(await saveContractDoc(contract.id, patch)) } catch { snackbar({ message: 'Couldn’t save the contract — please try again' }) }
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

  /* ── live token samples (Smart Text's right column follows the meta row) ── */
  const values: TokenValues = useMemo(() => ({ ...data.values, 'client.name': recipientName || lead.name, 'client.phone': `+65 ${phoneTyped(recipientPhone || lead.phone)}`, 'date.contract': new Date(contractDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }) }), [data.values, recipientName, recipientPhone, contractDate, lead.name, lead.phone])
  const outline = useMemo(() => outlineOf(body), [body])

  /* ── panes and overlays ── */
  const [outlinePref, setOutlinePref] = useFlagPref('om.contracts.outline', true)
  const [esign, setEsign] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [signedOpen, setSignedOpen] = useState(false)
  const [recipientOpen, setRecipientOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const link = signingLink(contract.id)
  const { copied, copy } = useCopy(link, { done: 'Signing link copied' })

  const backHref = from ?? `/leads/${lead.id}/contracts`
  const close = () => { void flushRef.current(); router.push(backHref) }
  const go = (href: string) => { void flushRef.current(); router.push(href) }
  const blank = !uploaded && isBlankDoc(body)
  const canSend = status !== 'Signed' && !blank
  const sendHint = status === 'Signed' ? 'Contract is signed' : 'Add some content first'

  const changeStatus = (s: ContractStatus) => {
    setStatusOpen(false)
    if (s === status) return
    if (s === 'Signed') { setSignedOpen(true); return }
    setStatus(s); setSignedAt(null)
    void setContractStatusDoc(contract.id, s).then(() => snackbar({ message: `Contract marked ${s}` }), () => snackbar({ message: 'Couldn’t change the status — please try again' }))
  }
  const onMenu = (a: 'duplicate' | 'template' | 'pdf' | 'print' | 'archive' | 'delete' | 'preview' | 'auto' | 'copy') => {
    if (a === 'preview') { go(withFrom(`/contracts/${contract.id}/preview`, from)); return }
    if (a === 'pdf' || a === 'print') { go(withFrom(`/contracts/${contract.id}/preview?print=1`, from)); return }
    if (a === 'copy') { void copy(); return }
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
      <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} align="left" sheetTitle="Status">
        {CONTRACT_STATUSES.map((s) => (
          <DropdownItem key={s} role="menuitemradio" checked={s === status} onSelect={() => changeStatus(s)}>
            <span className={quoteStyles.menuText}>{s}</span>
            {s === status ? <span className={quoteStyles.menuCurrent}>current</span> : null}
          </DropdownItem>
        ))}
      </Dropdown>
    </span>
  )

  return (
    <PageReveal skeleton={<EditorSkeleton />}>
      <div className={styles.page} data-testid="contract-editor">
        <ContractHeader crumbs={[{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Contracts', href: `/leads/${lead.id}/contracts` }]} title={title.trim() || 'Untitled contract'} siblings={siblings} currentId={contract.id}
                        onSwitch={(id) => go(withFrom(`/contracts/${id}`, from))}
                        chips={<>{signedAt ? <MetaChip>Signed {displayDate(signedAt)}</MetaChip> : null}{uploaded ? <MetaChip>Uploaded PDF</MetaChip> : null}{contract.templateId ? <MetaChip>From template</MetaChip> : null}</>}
                        savedLabel={savedLabel(updatedAt, clock)} statusSlot={statusPill}
                        primary={{ label: 'Send', onPress: () => setSendOpen(true), disabled: !canSend, hint: sendHint }}
                        actions={<>
                          <Button variant="secondary" appearance="outlined" onPress={() => onMenu('preview')}>Preview</Button>
                          <span className={quoteStyles.anchor}>
                            <Tooltip label="Automation" disabled={autoOpen}><IconButton icon="notifications" label="Automation" selected={autoOpen || auto.reminders || auto.thankYou} aria-haspopup="menu" aria-expanded={autoOpen} onClick={() => onMenu('auto')} /></Tooltip>
                            <AutomationPopover open={autoOpen} onClose={() => setAutoOpen(false)} reminders={auto.reminders} thankYou={auto.thankYou}
                                               onChange={(p) => { setAuto((a) => ({ ...a, ...p })); void setContractAutomation(contract.id, p).catch(() => snackbar({ message: 'Couldn’t save the automation — please try again' })) }} />
                          </span>
                          <Tooltip label={copied ? 'Copied' : 'Copy signing link'}><IconButton icon="link" label="Copy signing link" onClick={() => onMenu('copy')} /></Tooltip>
                        </>}
                        foldedItems={<>
                          <DropdownItem onSelect={() => onMenu('preview')}>Preview</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('copy')}>Copy signing link</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('auto')}>Automation</DropdownItem>
                          <DropdownDivider />
                        </>}
                        menu={<>
                          <DropdownItem onSelect={() => onMenu('duplicate')}>Duplicate and Edit</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('template')} disabled={uploaded} title={uploaded ? 'An uploaded PDF has no document to save' : undefined}>Save as Template</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('pdf')}>Download as PDF</DropdownItem>
                          <DropdownItem onSelect={() => onMenu('print')}>Print</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onSelect={() => onMenu('archive')}>Archive</DropdownItem>
                          <DropdownItem tone="danger" onSelect={() => onMenu('delete')}>Delete</DropdownItem>
                        </>}
                        onClose={close} />

        <div className={styles.meta} data-testid="contract-meta">
          <input className={styles.titleInput} value={title} placeholder="Contract title" aria-label="Contract title" maxLength={120}
                 onChange={(e) => { setTitle(e.target.value); queue({ title: e.target.value }) }} onBlur={() => { void flushRef.current() }} />
          <div className={styles.metaEnd}>
            <Tooltip label="Edit recipient">
              <button type="button" className={styles.recipient} onClick={() => setRecipientOpen(true)} data-testid="contract-recipient">
                <Icon name="person" size={20} weight={300} />
                <span className={styles.recipientName}>{recipientName || lead.name}</span>
                <span className={styles.recipientMeta}>· {phoneTyped(recipientPhone)}</span>
                <span className={styles.recipientEdit}><Icon name="edit" size={16} weight={300} /></span>
              </button>
            </Tooltip>
            <span className={styles.dateBox}>
              <DateField label="Contract date" size="s" value={inputDate(new Date(contractDate))} today={new Date(now)}
                         onChange={(v) => { const d = parseInputDate(v); if (d) { setContractDate(d.getTime()); queue({ contractDate: d.getTime() }) } }} />
            </span>
          </div>
        </div>

        {!uploaded ? (
          <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign}
                      onOutline={() => setOutlinePref(!outlinePref)} outlineOpen={outlinePref} disabled={status === 'Signed'} />
        ) : null}

        <div className={styles.body}>
          {!uploaded && outlinePref ? <OutlinePane items={outline} onPick={(i) => editor.current?.scrollToHeading(i)} onClose={() => setOutlinePref(false)} /> : null}
          <div className={styles.stage}>
            {uploaded ? (
              <div className={styles.uploaded} data-testid="contract-uploaded">
                <span className={styles.uploadedGlyph}><Icon name="picture_as_pdf" size={32} /></span>
                <span className={styles.uploadedName}>{contract.fileName ?? title}</span>
                <span className={styles.uploadedHelp}>An uploaded PDF — there is no document to edit here. Send shares it through the signing link; mark it signed when the copy comes back.</span>
              </div>
            ) : (
              <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
                <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={setDocState} label="Contract document"
                           placeholder="Start writing, or insert a record with Smart Text…" readOnly={status === 'Signed'} />
              </div>
            )}
          </div>
        </div>

        <ESignPanel open={esign} onClose={() => setEsign(false)} hasStudioSignature={!!me?.signatureKind} onInsert={(html) => editor.current?.insertHtml(html)} />
        <SendContractDialog open={sendOpen} onClose={() => setSendOpen(false)} link={link} defaults={{ name: recipientName || lead.name, phone: recipientPhone || lead.phone }}
                            draft={(name) => signingMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: title.trim() || 'agreement', link })}
                            onSend={async ({ name, phone, message }) => {
                              /* The chat opens on the press itself (a window opened after the round-trip is a blocked popup); the record follows. */
                              window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
                              await flushRef.current()
                              try {
                                const r = await sendContract(contract.id, { name, phone })
                                setStatus(r.status); setRecipientName(name); setRecipientPhone(phone); setUpdatedAt(r.updatedAt); setSendOpen(false)
                                snackbar({ message: `Sent to ${name} for signature` })
                              } catch { snackbar({ message: blank ? 'Add some content before sending' : 'Couldn’t send the contract — please try again' }) }
                            }} />
        <MarkSignedDialog open={signedOpen} onClose={() => setSignedOpen(false)} today={new Date(now)}
                          onSave={async (o) => {
                            try { await markContractSigned(contract.id, o); setStatus('Signed'); setSignedAt(new Date(o.signedOn)); setSignedOpen(false); snackbar({ message: 'Contract marked Signed' }) }
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
        <ConfirmDialog open={deleteOpen} title="Delete Contract" message="Are you sure you want to delete this contract from this project? You can restore it from Deleted Contracts." confirmLabel="Delete" tone="danger"
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteContracts([contract.id]).then(() => { snackbar({ message: 'Contract deleted' }); router.push(backHref) }, () => snackbar({ message: 'Couldn’t delete the contract — please try again' })) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
        <MaisonFab onPress={() => setAiOpen((o) => !o)} />
      </div>
    </PageReveal>
  )
}
