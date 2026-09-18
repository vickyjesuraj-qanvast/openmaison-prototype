'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { MetaChip } from '@/components/om/meta-chip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { EditorSkeleton } from '@/components/quotes/editor/editor-skeleton'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useFlagPref } from '@/lib/prefs'
import { savedLabel } from '@/lib/contracts/model'
import { outlineOf } from '@/lib/contracts/tokens'
import type { ContractTemplateEditorData } from '@/lib/contracts/queries'
import { deleteContractTemplate, duplicateContractTemplate, saveContractTemplate } from '@/app/company/contract-templates-actions'
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
  const { template, usedBy, now, values } = data
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
  const [esign, setEsign] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const dirty = useRef<{ title?: string; body?: string }>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const patch = dirty.current
    if (!Object.keys(patch).length) return
    dirty.current = {}
    try { setUpdatedAt(await saveContractTemplate(template.id, patch)) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback((patch: { title?: string; body?: string }) => {
    dirty.current = { ...dirty.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS)
  }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const outline = useMemo(() => outlineOf(body), [body])
  const backHref = from ?? '/company/templates/contracts'
  const close = () => { void flushRef.current(); router.push(backHref) }

  return (
    <PageReveal skeleton={<EditorSkeleton />}>
      <div className={styles.page} data-testid="contract-template-editor">
        <ContractHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Contracts', href: '/company/templates/contracts' }]} title={title.trim() || 'Untitled template'}
                        chips={<><MetaChip>Template</MetaChip><MetaChip>{usedBy === 0 ? 'Not used yet' : `Used by ${usedBy} ${usedBy === 1 ? 'contract' : 'contracts'}`}</MetaChip></>}
                        savedLabel={savedLabel(updatedAt, clock)}
                        primary={{ label: 'Done', onPress: close }}
                        menu={<>
                          <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateContractTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/contracts/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                          <DropdownDivider />
                          <DropdownItem tone="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                        </>}
                        onClose={close} />
        <div className={styles.meta} data-testid="contract-meta">
          <input className={styles.titleInput} value={title} placeholder="Template name" aria-label="Template name" maxLength={120}
                 onChange={(e) => { setTitle(e.target.value); queue({ title: e.target.value }) }} onBlur={() => { void flushRef.current() }} />
          <div className={styles.metaEnd}>
            <Button variant="secondary" appearance="text" onPress={() => snackbar({ message: 'Smart Text chips fill in from the lead, the quote and your studio when a contract starts from this template' })}>How chips fill in</Button>
          </div>
        </div>
        <DocToolbar editor={editor} state={docState} values={values} onESign={() => setEsign((o) => !o)} eSignOpen={esign} onOutline={() => setOutlinePref(!outlinePref)} outlineOpen={outlinePref} />
        <div className={styles.body}>
          {outlinePref ? <OutlinePane items={outline} onPick={(i) => editor.current?.scrollToHeading(i)} onClose={() => setOutlinePref(false)} /> : null}
          <div className={styles.stage}>
            <div className={styles.paper} onClick={(e) => { if (e.target === e.currentTarget) editor.current?.focus() }}>
              <DocEditor ref={editor} value={body} onChange={(h) => { setBody(h); queue({ body: h }) }} onState={setDocState} label="Template document" placeholder="Start writing the template, or insert a record with Smart Text…" />
            </div>
          </div>
        </div>
        <ESignPanel open={esign} onClose={() => setEsign(false)} hasStudioSignature onInsert={(html) => editor.current?.insertHtml(html)} />
        <ConfirmDialog open={deleteOpen} title={`Delete ${title.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={usedBy ? `${usedBy} ${usedBy === 1 ? 'contract keeps its' : 'contracts keep their'} own copy of the document. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteContractTemplate(template.id).then(() => { snackbar({ message: 'Template deleted' }); router.push('/company/templates/contracts') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
        <MaisonFab onPress={() => setAiOpen((o) => !o)} />
      </div>
    </PageReveal>
  )
}
