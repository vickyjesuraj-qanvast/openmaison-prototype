'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { MetaChip } from '@/components/om/meta-chip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { ContractSkeleton } from './contract-skeleton'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useFlagPref } from '@/lib/prefs'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Drawer } from '@/components/om/drawer'
import { savedLabel } from '@/lib/contracts/model'
import { isBlankDoc, outlineOf, signFieldsIn } from '@/lib/contracts/tokens'
import { Icon } from '@/components/om/icon'
import bannerStyles from '@/components/quotes/editor/template-bar.module.css'
import type { ContractTemplateEditorData } from '@/lib/contracts/queries'
import { deleteContractTemplate, duplicateContractTemplate, saveContractTemplate } from '@/app/company/contract-templates-actions'
import { isRefusal } from '@/lib/company/template-rules'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ContractHeader } from './contract-header'
import { DocEditor, IDLE_STATE, type DocEditorHandle, type DocState } from './doc-editor'
import { DocToolbar } from './doc-toolbar'
import { OutlinePane } from './outline-pane'
import { ESignPanel } from './esign-panel'
import styles from './contract-editor.module.css'

const AUTOSAVE_MS = 600

/**
 * The contract template editor (REG-534): the contract editor with no recipient, date, status or Send — the document and
 * its Smart Text chips, saved to the library. Header: "Company / Templates / Contracts" over the title · "Used by n" ·
 * Saved · Done (back) · kebab (Duplicate · Delete) · ✕.
 */
export function ContractTemplateEditor({ data, from }: { data: ContractTemplateEditorData; from?: string }) {
  const { template, usedBy, now, values, changeBlock } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
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
  const noClientSign = useMemo(() => !isBlankDoc(body) && !signFieldsIn(body).includes('client-signature'), [body])
  const backHref = from ?? '/company/templates/contracts'
  const close = () => { void flushRef.current(); router.push(backHref) }

  return (
    <PageReveal skeleton={<ContractSkeleton kind="template" />}>
      <div className={styles.page} data-testid="contract-template-editor">
        <ContractHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Contracts', href: '/company/templates/contracts' }]} title={title.trim() || 'Untitled template'}
                        chips={<><MetaChip>Template</MetaChip><MetaChip>{usedBy === 0 ? 'Not used yet' : `Used by ${usedBy} ${usedBy === 1 ? 'contract' : 'contracts'}`}</MetaChip></>}
                        savedLabel={savedLabel(updatedAt, clock)}
                        primary={{ label: 'Done', onPress: close }}
                        menu={<>
                          <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateContractTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/contracts/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                          <DropdownDivider />
                          {/* (sweep S2 #16) Delete is Rename's rule: its author, an Owner or an Admin — (round 3) the whole rule under the row, not a fragment with a native tooltip.
                              (REG-728) The house row prints a disabled row's rule under its label. */}
                          <DropdownItem tone="danger" disabled={!!changeBlock} title={changeBlock ?? undefined} onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                        </>}
                        onClose={close} />
        <div className={styles.meta} data-testid="contract-meta">
          <input className={styles.titleInput} value={title} placeholder="Template name" aria-label="Template name" maxLength={120} readOnly={!!changeBlock} title={changeBlock ?? undefined}
                 onChange={(e) => { if (changeBlock) return; setTitle(e.target.value); queue({ title: e.target.value }) }} onBlur={() => { void flushRef.current() }} />
          <div className={styles.metaEnd}>
            <Button variant="secondary" appearance="text" onPress={() => snackbar({ message: 'Smart Text chips fill in from the lead, the quote and your studio when a contract starts from this template' })}>How chips fill in</Button>
          </div>
        </div>
        {noClientSign ? (
          <div className={bannerStyles.banner} role="status" data-tone="changes" data-testid="template-no-client-sign">
            <span className={bannerStyles.bannerIcon}><Icon name="warning" size={20} weight={300} /></span>
            <span className={bannerStyles.bannerText}>There’s nowhere for the client to sign — a contract started from this template can’t be sent until it has a Client signature.</span>
            <span className={bannerStyles.bannerActions}><Button variant="secondary" appearance="outlined" onPress={() => setEsign(true)}>Insert a Client signature</Button></span>
          </div>
        ) : null}
        <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign} onOutline={() => (narrow ? setOutlineDrawer((o) => !o) : setOutlinePref(!outlinePref))} outlineOpen={narrow ? outlineDrawer : outlinePref} />
        <div className={styles.body}>
          {outlinePref && !narrow ? <OutlinePane items={outline} onPick={(i) => editor.current?.scrollToHeading(i)} onClose={() => setOutlinePref(false)} /> : null}
          <div className={styles.stage}>
            <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
              <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={setDocState} label="Template document" placeholder="Start writing the template, or insert a record with Smart Text…" />
            </div>
          </div>
        </div>
        <Drawer open={narrow && outlineDrawer} onClose={() => setOutlineDrawer(false)} title="Outline" label="Outline" width={320}>
          <OutlinePane inDrawer items={outline} onClose={() => setOutlineDrawer(false)} onPick={(i) => { setOutlineDrawer(false); editor.current?.scrollToHeading(i) }} />
        </Drawer>
        <ESignPanel open={esign} onClose={() => setEsign(false)} hasStudioSignature onInsert={(html) => editor.current?.insertHtml(html)}
                    gates={gates} onGates={(p) => { setGates((g) => ({ ...g, ...p })); queue(p) }} />
        <ConfirmDialog open={deleteOpen} title={`Delete ${title.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={usedBy ? `${usedBy} ${usedBy === 1 ? 'contract keeps its' : 'contracts keep their'} own copy of the document. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void flushRef.current().then(() => deleteContractTemplate(template.id)).then((r) => {
                         if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return }
                         /* (REG-634, E-132) the gallery's Undo, and back where the editor was opened from */
                         /* the gallery says it, with Undo — a snackbar here would go with the editor's layout — and its Back keeps `from` */
                         router.push(`/company/templates/contracts?deleted=${encodeURIComponent(template.id)}${from ? `&from=${encodeURIComponent(from)}` : ''}`)
                       }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} anchorRef={fabRef} />   {/* (sweep S2 #30) the FAB's own press toggles it */}
        <span ref={fabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}
