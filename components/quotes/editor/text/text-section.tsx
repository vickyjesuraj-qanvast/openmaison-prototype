'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import type { QuoteTextTemplate } from '@/lib/db/schema'
import { isBlankHtml, resolveTokens, textPreview, TEXT_LABEL, TEXT_PLACEHOLDER, type TextContext, type TextKind, type TokenValues } from '@/lib/quotes/text'
import { useWritingHelp, type WritingCommand } from '@/components/writing/writing-help'
import { quoteTextSources } from '@/lib/writing/sources'
import { saveQuoteText, setQuoteTextVisible } from '@/app/quotes/text-actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) an action's refusal into the caller's own failure line
import { SectionCard } from '../section-card'
import { RichEditor, type RichEditorHandle } from './rich-editor'
import { TemplatesModal } from './templates-modal'
import styles from './text-section.module.css'
import type { FolderNode } from '@/lib/folders'

const AUTOSAVE_MS = 600

export type TextSeed = { quoteId: string; kind: TextKind; html: string; visible: boolean; templates: QuoteTextTemplate[]; /** (REG-664) T&Cs & Notes' folders — My Templates browses them */ folders?: FolderNode[] }

/** (quotes on the move 2026-10-22, B-12) The phone row's one line: what the text holds and whether the client sees it. Numbered blocks
 *  ("1. Agreement") are clauses; otherwise paragraphs. (invented copy) */
export function textSummary(html: string, visible: boolean): string {
  const seen = visible ? 'shown to the client' : 'not shown to the client'
  if (isBlankHtml(html)) return `Nothing yet · ${seen}`
  const blocks = html.split(/<\/(?:p|div|li|h\d)>/i).map((b) => textPreview(b, 80)).filter(Boolean)
  const clauses = blocks.filter((b) => /^\d+[.)]\s/.test(b)).length
  const n = clauses || blocks.length
  const what = clauses ? `${n} clause${n === 1 ? '' : 's'}` : `${n} paragraph${n === 1 ? '' : 's'}`
  return `${what} · ${seen}`
}

/**
 * Terms and Conditions · Additional Notes (1263:36229 · 1263:36303 · templates 1238:33084…; REG-420). One card for both:
 * the section-top carries "My Templates" and "Show in client view"; the body is the in-house editor whose toolbar ends in
 * "Write with AI". The text autosaves 600 ms after the last change (the header's "Saved …" follows); a template's "Add"
 * APPENDS its body with the tokens resolved to the quote's records (owner 2026-09-11); Write with AI composes the section
 * from the quote's own items, schedule, sum and validity, with Undo.
 * (pending modules S29 — card api:ai-writing-help-quotes) Write with AI is the writing help: Improve the writing · Shorten · Add what's
 * missing · Rewrite from this quote · Plain English, each a proposal the studio reads first (components/writing/writing-help.tsx) — an
 * empty section opens "Write from this quote" straight away (REG-420's composed text, now shown before it goes in; its 900 ms beat is gone).
 * (quotes on the move 2026-10-22, B-12) On a phone the body is ONE ROW — "12 clauses · shown to the client" over the first three lines —
 * and a press opens the editor as a full-screen sheet: the tools at a 44 pitch, Write with AI at the foot's start, Done. The open
 * 1,904px editor mid-page (2,079px of section; 8,646px of page with Notes open) is gone.
 */
export function TextCard({ seed, open, onToggle, onHandlePointerDown, onSaved, tokens, context, onVisible, onHtml, command }: {
  seed: TextSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onSaved: (updatedAt: number) => void
  tokens: TokenValues
  context: TextContext
  /** (REG-538) The switch is the one source of truth for the client view and Preview: the host redraws the pane. */
  onVisible?: (visible: boolean) => void
  /** (pending modules S29) The words as they change — the editor's Maison AI reads them for its writing suggestions. */
  onHtml?: (html: string) => void
  /** (pending modules S29) Maison AI's sheet opening one of the writing help's proposals. */
  command?: WritingCommand | null
}) {
  const snackbar = useSnackbar()
  const { run, fail } = useRun()
  const { quoteId, kind } = seed
  const label = TEXT_LABEL[kind]
  const phone = useMediaQuery(MOBILE)
  const [html, setHtml] = useState(seed.html)
  const [visible, setVisible] = useState(seed.visible)
  const [templates, setTemplates] = useState<QuoteTextTemplate[]>(seed.templates)
  const [modal, setModal] = useState(false)
  const [menu, setMenu] = useState(false)
  const [sheet, setSheet] = useState(false)   // (B-12) the phone's full-screen editor
  const moreRef = useRef<HTMLSpanElement>(null)
  const editor = useRef<RichEditorHandle>(null)

  /* autosave */
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = async () => {
    const v = pending.current
    pending.current = null
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (v === null) return
    try { const r = await orThrow(saveQuoteText(quoteId, kind, { html: v })); onSaved(r.updatedAt) } catch { fail(`save the ${label.toLowerCase()}`) }
  }
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  useEffect(() => () => { void flushRef.current() }, [])
  const change = (next: string) => {
    setHtml(next)
    onHtml?.(next)
    pending.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS)
  }
  const closeSheet = () => { setSheet(false); void flushRef.current() }   // Done and ✕ alike: what was typed is saved at once

  const toggleVisible = (v: boolean) => {
    setVisible(v); onVisible?.(v)
    void run('save the setting', async () => { const r = await orThrow(setQuoteTextVisible(quoteId, kind, v)); onSaved(r.updatedAt) })
  }
  const addTemplate = (t: QuoteTextTemplate) => {
    const body = resolveTokens(t.body, tokens)
    if (editor.current) editor.current.append(body)
    else change(html + body)   /* the section is collapsed (its editor unmounted) — or the phone's sheet is closed: write the html and autosave, as append would */
    snackbar({ message: `“${t.title}” added` })
  }
  /* (pending modules S29) the writing help, by rule from this quote and the studio's templates (lib/writing/sources.ts) */
  const putIn = (h: string) => { if (editor.current) editor.current.replace(h); else change(h) }
  const help = useWritingHelp({
    label, subject: context.number, kind, trigger: 'outlined',
    sources: () => quoteTextSources(kind, context, templates, tokens),
    read: () => ({ html }), apply: (h) => putIn(h),
  })
  const [seenCmd, setSeenCmd] = useState(command?.n ?? 0)
  if (command && command.n !== seenCmd) { setSeenCmd(command.n); help.openAction(command.action, { html }) }

  const actions = phone ? (
    <span ref={moreRef} className={styles.anchor}>
      <Tooltip label="More options" disabled={menu}>
        <IconButton icon="more_vert" label={`More options for ${label}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
      </Tooltip>
      {/* (REG-728) the standard 200 (a phone draws it as a sheet) */}
      <PortalMenu open={menu} anchor={moreRef} onClose={() => setMenu(false)} role="menu" width={MENU_WIDTH.standard} align="right" sheetTitle={label}>
        <DropdownItem onSelect={() => { setMenu(false); setModal(true) }}>Templates</DropdownItem>
        <DropdownItem role="menuitemcheckbox" checked={visible} onSelect={() => { setMenu(false); toggleVisible(!visible) }}>
          <span className={styles.menuIcon} data-on={visible || undefined}><Icon name={visible ? 'check_box' : 'check_box_outline_blank'} size={20} /></span>Show in client view
        </DropdownItem>
      </PortalMenu>
    </span>
  ) : (
    <div className={styles.actions}>
      <button type="button" className={styles.link} onClick={() => setModal(true)}>Templates</button>   {/* (the calm UI build 2026-10-27, W-270) the studio's library, not "My" */}
      <label className={styles.switchRow}>Show in client view <Switch size="sm" isSelected={visible} onChange={toggleVisible} aria-label="Show in client view" /></label>
    </div>
  )

  const blank = isBlankHtml(html)
  return (
    <>
      <SectionCard id={`section-${kind}`} title={label} open={open} onToggle={onToggle} actions={actions} onHandlePointerDown={onHandlePointerDown}>
        {phone ? (
          <button type="button" className={styles.row} onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet} data-testid="text-row">
            <span className={styles.rowText}>
              <span className={styles.rowMeta}>{textSummary(html, visible)}</span>
              {blank ? null : <span className={styles.rowPreview}>{textPreview(html, 400)}</span>}
            </span>
            <Icon name="chevron_right" size={24} weight={300} className={styles.rowChev} />
          </button>
        ) : (
          <RichEditor ref={editor} value={html} onChange={change} placeholder={TEXT_PLACEHOLDER[kind]} label={label} right={help.trigger} />
        )}
      </SectionCard>
      {/* (REG-664, bug fix) Outside the card's body: My Templates sits in the section's top bar, so a collapsed section opens it too —
          inside the body it was unmounted while collapsed and the press did nothing. */}
      <TemplatesModal open={modal} kind={kind} templates={templates} folders={seed.folders} onClose={() => setModal(false)} onAdd={addTemplate} onTemplates={setTemplates} />
      {help.dialog}   {/* (pending modules S29) outside the card's body, so Maison AI's sheet opens it on a folded section too */}
      {/* (B-12) The phone's editor: the whole screen, the toolbar at a 44 pitch (rich-editor.module.css), the text scrolling under it,
          Write with AI at the foot's start, Done the one filled button. Autosave runs as on the desktop; Done saves what is pending at once. */}
      {phone ? (
        <Dialog open={sheet} onClose={closeSheet} title={label} size="modal" phoneFull portal flush closeOnScrim={false}
                footer={<><FootStart>{help.trigger}</FootStart><Button onPress={closeSheet} data-testid="text-sheet-done">Done</Button></>}>
          <div className={styles.sheetBody}>
            <RichEditor ref={editor} fill value={html} onChange={change} placeholder={TEXT_PLACEHOLDER[kind]} label={label} />
          </div>
        </Dialog>
      ) : null}
    </>
  )
}
