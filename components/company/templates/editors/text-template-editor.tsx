'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { SelectTrigger } from '@/components/om/select-trigger'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { LibraryEditorGhost } from './library-editor-ghost'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { RichEditor, type RichEditorHandle } from '@/components/quotes/editor/text/rich-editor'
import { savedLabel } from '@/lib/contracts/model'
import { TEXT_LABEL, TOKENS, tokenText, type TextKind } from '@/lib/quotes/text'
import type { TextTemplateEditorData } from '@/lib/company/text-templates'
import { deleteTextTemplate, duplicateTextTemplate, updateTextTemplate } from '@/app/quotes/text-actions'
import { LibraryHeader } from '../library-header'
import { isRefusal } from '@/lib/company/template-rules'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import modal from '@/components/quotes/editor/text/templates-modal.module.css'
import page from '@/components/contracts/editor/contract-editor.module.css'
import { TitleInput } from '@/components/contracts/editor/title-input'   // (Dane UAT 3.18) the editors' one title, with its pencil
import styles from './library-editor.module.css'

const AUTOSAVE_MS = 600

/**
 * The Terms / Notes template editor (REG-538): the quote editor's My Templates form (1238:33173) as a page — the title, the
 * framed rich editor whose toolbar ends in Insert a field ▾ (Dane UAT 3.19, once Insert Token ▾), autosaved. Header: "Company / Templates / T&Cs & Notes" over the
 * title · kind chip · "Default on n quote templates" · Saved · Done · kebab (Duplicate · Delete) · ✕.
 */
export function TextTemplateEditor({ data, from }: { data: TextTemplateEditorData; from?: string }) {
  const { template, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const editor = useRef<RichEditorHandle>(null)
  const kind = template.kind as TextKind
  const label = TEXT_LABEL[kind] ?? template.kind
  const [title, setTitle] = useState(template.title)
  const [body, setBody] = useState(template.body)
  const [updatedAt, setUpdatedAt] = useState((template.updatedAt ?? template.createdAt).getTime())
  const [clock, setClock] = useState(now)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const [tokenOpen, setTokenOpen] = useState(false)
  const tokenRef = useRef<HTMLButtonElement>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const dirty = useRef(false)
  const latest = useRef({ title, body }); useEffect(() => { latest.current = { title, body } })   // the flush reads the latest state without re-creating the timer
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    try { const row = await updateTextTemplate(template.id, { title: latest.current.title, body: latest.current.body }); setUpdatedAt((row.updatedAt ?? row.createdAt).getTime()) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback(() => { dirty.current = true; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS) }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const backHref = from ?? '/company/templates/terms'
  const close = () => { void flushRef.current(); router.push(backHref) }

  return (
    <PageReveal skeleton={<LibraryEditorGhost kind="terms" />}>
      <div className={page.page} data-testid="text-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'T&Cs & Notes', href: '/company/templates/terms' }]} title={title.trim() || 'Untitled template'}
                       chips={<><MetaChip>{label}</MetaChip><MetaChip>{template.usedBy === 0 ? 'Not a default yet' : `Default on ${template.usedBy} quote ${template.usedBy === 1 ? 'template' : 'templates'}`}</MetaChip></>}
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateTextTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/terms/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                       </>} onClose={close} />
        <div className={page.meta} data-testid="library-meta">
          <TitleInput value={title} placeholder="Template name" aria-label="Template name" maxLength={120} onChange={(e) => { setTitle(e.target.value); queue() }} onBlur={() => { void flushRef.current() }} />
          <div className={page.metaEnd}><MetaChip>{label}</MetaChip></div>   {/* (REG-729) the house tag, as the sibling editors' chips */}
        </div>
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Text</span><span className={styles.cardHelp}>Fields fill in from the quote when a studio adds this to one.</span></div>
            <div className={`${styles.cardBody} ${styles.textEditor}`}>
              <RichEditor ref={editor} value={body} onChange={(html) => { setBody(html); queue() }} placeholder={`Write the ${label.toLowerCase()} this template carries.`} label={`${label} template`} minHeight={520}
                          right={
                            <span className={modal.tokenAnchor}>
                              {/* (REG-729) the house compact select (m), as the quote editor's Templates modal has it (its .tokenBtn copy is gone) */}
                              {/* (Dane UAT 3.19) One name for every merge-field menu: "Insert a field", as the quote template editor and Settings ›
                                  Notifications say it. The [Bracket] fields it inserts, and how they resolve, are unchanged. */}
                              <SelectTrigger ref={tokenRef} label="Insert a field" value={<span>Insert a field</span>} open={tokenOpen} onMouseDown={(e) => e.preventDefault()} onClick={() => setTokenOpen((o) => !o)} />
                              <PortalMenu open={tokenOpen} anchor={tokenRef} onClose={() => setTokenOpen(false)} role="menu" width={MENU_WIDTH.wide} align="right" sheetTitle="Insert a field">   {/* (REG-728) every insert-field menu is 240 */}
                                {TOKENS.map((t) => <DropdownItem key={t.key} onSelect={() => { setTokenOpen(false); editor.current?.insertText(tokenText(t.key)) }}>{t.label}</DropdownItem>)}
                              </PortalMenu>
                            </span>
                          } />
            </div>
          </div>
        </div>
        <ConfirmDialog open={deleteOpen} title={`Delete ${title.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={template.usedBy ? `${template.usedBy} quote ${template.usedBy === 1 ? 'template names' : 'templates name'} it in their Defaults; new quotes from them start without it until you pick another. You can restore it from Deleted Templates.` : 'Quotes that already carry the text keep it. You can restore it from Deleted Templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteTextTemplate(template.id).then((r) => { if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return } snackbar({ message: 'Template deleted' }); router.push('/company/templates/terms') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
        <MaisonFab onPress={() => setAiOpen((o) => !o)} />
      </div>
    </PageReveal>
  )
}
