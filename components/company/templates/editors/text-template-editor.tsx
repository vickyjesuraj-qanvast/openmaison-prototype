'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { SelectTrigger } from '@/components/om/select-trigger'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { LibraryEditorGhost } from './library-editor-ghost'
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { htmlToPlain } from '@/lib/quotes/items-model'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { RichEditor, type RichEditorHandle } from '@/components/quotes/editor/text/rich-editor'
import { savedLabel } from '@/lib/contracts/model'
import { TEXT_LABEL, TOKENS, isBlankHtml, tokenText, type TextKind } from '@/lib/quotes/text'
import type { TextTemplateEditorData } from '@/lib/company/text-templates'
import { deleteTextTemplate, duplicateTextTemplate, updateTextTemplate } from '@/app/quotes/text-actions'
import { LibraryHeader } from '../library-header'
import { isRefusal, orThrow } from '@/lib/company/template-rules'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import modal from '@/components/quotes/editor/text/templates-modal.module.css'
import page from '@/components/contracts/editor/contract-editor.module.css'
import { TitleInput } from '@/components/contracts/editor/title-input'   // (Dane UAT 3.18) the editors' one title, with its pencil
import { WritingHelp } from '@/components/writing/writing-help'
import { textTemplateSources } from '@/lib/writing/sources'
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
    try { const row = await orThrow(updateTextTemplate(template.id, { title: latest.current.title, body: latest.current.body })); setUpdatedAt((row.updatedAt ?? row.createdAt).getTime()) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback(() => { dirty.current = true; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS) }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const backHref = from ?? '/company/templates/terms'
  const close = () => { void flushRef.current(); router.push(backHref) }

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The text's Maison AI, by rule from the page: the
     fields it fills in from the quote, anything that reads unfinished (blanks, "TBC", brackets that fill nothing), and where it is a quote
     template's default. *(invented copy: the answers' titles and lines)* */
  const aiFabRef = useRef<HTMLSpanElement>(null)
  const plain = htmlToPlain(body)
  const fills = TOKENS.filter((t) => body.includes(tokenText(t.key)))
  const known = new Set<string>(TOKENS.map((t) => tokenText(t.key)))
  const gaps = [...new Set([...(plain.match(/_{3,}|\.{4,}|\bX{3,}\b|\b(?:TBC|TBA|TBD)\b|\[[^\]\n]{0,40}\]|<[^>\n]{1,30}>/gi) ?? [])].filter((g) => !known.has(g)))]
  const maison: MaisonSuggestion[] = [
    { label: 'Which fields fill in here?', answer: () => Promise.resolve(fills.length
      ? { title: `${fills.length === 1 ? '1 field fills' : `${fills.length} fields fill`} in`, text: 'On a quote each prints that quote’s own words.', rows: fills.map((t) => ({ id: t.key, label: tokenText(t.key), meta: t.key === 'client' ? 'The quote’s client' : t.key === 'member' ? 'Whoever prepared the quote' : 'The quote’s issuing entity — Company › Profile' }))   /* (S44Q, row 311) the studio's two print the entity the quote is raised under */ }
      : { title: 'No fields yet', text: 'Insert a field from the editor’s Insert a field menu — the client’s name, the studio’s, the phone, who prepared the quote.' }) },
    { label: 'Is anything left unfinished?', answer: () => Promise.resolve(isBlankHtml(body)
      ? { title: 'It is empty', text: `Write the ${label.toLowerCase()} this template carries.` }
      : gaps.length
        ? { title: `${gaps.length === 1 ? '1 place reads' : `${gaps.length} places read`} unfinished`, text: 'These would print as they are on every quote that carries this text.', rows: gaps.slice(0, 8).map((g, i) => ({ id: `gap-${i}`, label: `“${g}”`, meta: /^\[/.test(g) ? 'Fills nothing — not one of the fields' : 'Left to fill in' })) }
        : { title: 'Nothing reads unfinished', text: 'No blanks, “TBC”s or brackets that fill nothing.' }) },
    { label: 'Where is it a default?', answer: { title: template.usedBy ? `On ${template.usedBy === 1 ? '1 quote template' : `${template.usedBy} quote templates`}` : 'Not a default yet', text: template.usedBy ? 'New quotes from them start with this text — set on each template’s Quote settings tab.' : 'Pick it on a quote template’s Quote settings tab and new quotes from it start with this text.',   // (the calm UI build 2026-10-27, W-274) the tab is "Quote settings"
      rows: [{ id: 'gallery', label: 'Open quote templates', href: '/company/templates/quotes' }] } },
  ]

  return (
    <PageReveal skeleton={<LibraryEditorGhost kind="terms" />}>
      <div className={page.page} data-testid="text-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'T&Cs & Notes', href: '/company/templates/terms' }]} title={title.trim() || 'Untitled template'}
                       chips={<MetaChip kind="fact">{label}</MetaChip>}   /* (the calm UI build 2026-10-27, the UI audit's 4-11) the kind stays; the usage is the gallery card's */
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => orThrow(duplicateTextTemplate(template.id))).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/terms/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                       </>} onClose={close} />
        <div className={page.meta} data-testid="library-meta">
          <TitleInput value={title} placeholder="Template name" aria-label="Template name" maxLength={120} onChange={(e) => { setTitle(e.target.value); queue() }} onBlur={() => { void flushRef.current() }} />
          <div className={page.metaEnd}><MetaChip kind="fact">{label}</MetaChip></div>   {/* (REG-729) the house tag, as the sibling editors' chips */}
        </div>
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Text</span><span className={styles.cardHelp}>Fields fill in from the quote when a studio adds this to one.</span></div>
            <div className={`${styles.cardBody} ${styles.textEditor}`}>
              <RichEditor ref={editor} value={body} onChange={(html) => { setBody(html); queue() }} placeholder={`Write the ${label.toLowerCase()} this template carries.`} label={`${label} template`} minHeight={520}
                          right={<>
                            {/* (pending modules S29) Write with AI on the template's words: Improve · Shorten · Add what's missing (from the studio's other
                                templates of this kind and the starter library) · Plain English — a proposal first; its [fields] are never touched */}
                            <WritingHelp label={label} subject={title.trim() || undefined} kind={kind} testId="template-writing"
                                         sources={() => textTemplateSources(kind, title, data.siblings)} read={() => ({ html: body })} apply={(h) => editor.current?.replace(h)} />
                            <span className={modal.tokenAnchor}>
                              {/* (REG-729) the house compact select (m), as the quote editor's Templates modal has it (its .tokenBtn copy is gone) */}
                              {/* (Dane UAT 3.19) One name for every merge-field menu: "Insert a field", as the quote template editor and Settings ›
                                  Notifications say it. The [Bracket] fields it inserts, and how they resolve, are unchanged. */}
                              <SelectTrigger ref={tokenRef} label="Insert a field" value={<span>Insert a field</span>} open={tokenOpen} onMouseDown={(e) => e.preventDefault()} onClick={() => setTokenOpen((o) => !o)} />
                              <PortalMenu open={tokenOpen} anchor={tokenRef} onClose={() => setTokenOpen(false)} role="menu" width={MENU_WIDTH.wide} align="right" sheetTitle="Insert a field">   {/* (REG-728) every insert-field menu is 240 */}
                                {TOKENS.map((t) => <DropdownItem key={t.key} onSelect={() => { setTokenOpen(false); editor.current?.insertText(tokenText(t.key)) }}>{t.label}</DropdownItem>)}
                              </PortalMenu>
                            </span>
                          </>} />
            </div>
          </div>
        </div>
        <ConfirmDialog open={deleteOpen} title={`Delete ${title.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={template.usedBy ? `${template.usedBy} quote ${template.usedBy === 1 ? 'template names' : 'templates name'} it in their Defaults; new quotes from them start without it until you pick another. You can restore it from Deleted templates.` : 'Quotes that already carry the text keep it. You can restore it from Deleted templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteTextTemplate(template.id).then((r) => { if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return } snackbar({ message: 'Template deleted' }); router.push('/company/templates/terms') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={aiFabRef} />   {/* (pending modules S10) the shell's one sheet; the FAB's own press toggles it (REG-153) */}
        <span ref={aiFabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}
