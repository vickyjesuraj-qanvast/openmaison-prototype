'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { MetaChip } from '@/components/om/meta-chip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { ContractSkeleton } from './contract-skeleton'
import { useRememberContractPdf } from './contract-route-ghost'   // (S42 B-17)
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useFlagPref } from '@/lib/prefs'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Drawer } from '@/components/om/drawer'
import { savedLabel } from '@/lib/contracts/model'
import { isBlankDoc, outlineOf, signFieldsIn, tokensIn, TOKEN_LABEL } from '@/lib/contracts/tokens'
import { Icon } from '@/components/om/icon'
import bannerStyles from '@/components/quotes/editor/template-bar.module.css'
import type { ContractTemplateEditorData } from '@/lib/contracts/queries'
import { deleteContractTemplate, duplicateContractTemplate, replacePdfTemplate, saveContractTemplate } from '@/app/company/contract-templates-actions'
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

/**
 * The contract template editor (REG-534): the contract editor with no recipient, date, status or Send — the document and
 * its inserted fields, saved to the library. Header: "Company / Templates / Contracts" over the title · "Used by n" ·
 * Saved · Done (back) · kebab (Duplicate · Delete) · ✕.
 */
export function ContractTemplateEditor({ data, from }: { data: ContractTemplateEditorData; from?: string }) {
  const { template, usedBy, now, values, changeBlock } = data
  const router = useRouter()
  const snackbar = useSnackbar()
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

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The template's Maison AI, by rule from the page:
     whether a contract started from it can go out (a place for the client to sign — Send's own rule), the fields it fills in and where each
     comes from, and its outline. *(invented copy: the answers' titles and lines)* */
  const used = useMemo(() => (pdf ? [] : tokensIn(body)), [body, pdf])
  const fromWhere = (k: string) => (k.startsWith('client.') || k.startsWith('lead.') ? 'From the lead' : k.startsWith('quote.') ? 'From the quote it names' : k.startsWith('studio.') ? 'From Company › Profile' : k.startsWith('date.') ? 'The contract’s date' : k.startsWith('project.') ? 'From the project, at its handover' : 'Filled in when it starts')   // (S44R, C9)
  const maison: MaisonSuggestion[] = pdf ? [
    { label: 'What does the client do with it?', answer: { title: 'Read, tick, sign once', text: `Ticked in Send together, it joins the lead as a document of its own and goes out with the agreement. ${gates.requiresAccept ? `The client ticks “${gates.acceptLabel || 'I have read and accept'}” before signing` : 'The client reads it'}${gates.requiresScroll ? ', after scrolling to its end' : ''}; one signature covers the set.`,
      rows: [{ id: 'gates', label: 'Change what comes before signing', meta: 'Before the client signs', run: () => setEsign(true) }] } },
  ] : [
    { label: 'Can contracts start from it?', answer: () => Promise.resolve(isBlankDoc(body)
      ? { title: 'Not yet — it is empty', text: 'Write the agreement, or insert a field — a contract started from an empty template can’t be sent.' }
      : noClientSign
        ? { title: 'Not yet — nowhere to sign', text: 'A contract started from it can’t be sent until it has a Client signature.', rows: [{ id: 'esign', label: 'Insert a Client signature', meta: 'eSignatures', run: () => setEsign(true) }] }
        : { title: 'Ready to start contracts', text: `It has a place for the client to sign${used.length ? ` and fills in ${used.length === 1 ? '1 field' : `${used.length} fields`} from the lead, the quote and the studio` : ''}. ${usedBy ? `${usedBy === 1 ? '1 contract has' : `${usedBy} contracts have`} started from it.` : 'No contract has started from it yet.'}` }) },
    { label: 'Which fields does it fill in?', answer: () => Promise.resolve(used.length
      ? { title: `${used.length === 1 ? '1 field' : `${used.length} fields`} fill in`, text: 'Each prints the lead’s, the quote’s or the studio’s own words when a contract starts from it.', rows: used.map((k) => ({ id: k, label: TOKEN_LABEL[k] ?? k, meta: fromWhere(k) })) }
      : { title: 'No fields yet', text: 'Insert a field from the formatting bar and it fills in from the lead, the quote or the studio.' }) },
    { label: 'What’s in it?', answer: () => Promise.resolve(outline.length
      ? { title: `${outline.length === 1 ? '1 heading' : `${outline.length} headings`}`, text: 'Its outline — open one to go to it.', rows: outline.map((h, i) => ({ id: `h-${i}`, label: h.text, run: () => editor.current?.scrollToHeading(i) })) }
      : { title: 'No headings yet', text: 'Add a heading from the formatting bar and it shows here.' }) },
  ]

  return (
    <PageReveal skeleton={<ContractSkeleton kind="template" pdf={template.kind === 'pdf'} />}>
      <div className={styles.page} data-testid="contract-template-editor">
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
        <span ref={fabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}
