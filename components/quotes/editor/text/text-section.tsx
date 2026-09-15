'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import type { QuoteTextTemplate } from '@/lib/db/schema'
import { aiNotes, aiTerms, resolveTokens, TEXT_LABEL, TEXT_PLACEHOLDER, type TextContext, type TextKind, type TokenValues } from '@/lib/quotes/text'
import { saveQuoteText, setQuoteTextVisible } from '@/app/quotes/text-actions'
import { SectionCard } from '../section-card'
import { RichEditor, type RichEditorHandle } from './rich-editor'
import { TemplatesModal } from './templates-modal'
import styles from './text-section.module.css'

const AUTOSAVE_MS = 600

export type TextSeed = { quoteId: string; kind: TextKind; html: string; visible: boolean; templates: QuoteTextTemplate[] }

/** The Maison AI mark in the button's leading-icon slot (1263:36257). */
function AiMark() {
  return (
    <span className={styles.aiMark}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma-assets/maison-ai-mark.svg" alt="" />
    </span>
  )
}

/**
 * Terms and Conditions · Additional Notes (1263:36229 · 1263:36303 · templates 1238:33084…; REG-420). One card for both:
 * the section-top carries "My Templates" and "Show in client view"; the body is the in-house editor whose toolbar ends in
 * "Write with AI". The text autosaves 600 ms after the last change (the header's "Saved …" follows); a template's "Add"
 * APPENDS its body with the tokens resolved to the quote's records (owner 2026-09-11); Write with AI composes the section
 * from the quote's own items, schedule, sum and validity, with Undo.
 */
export function TextCard({ seed, open, onToggle, onHandlePointerDown, onSaved, tokens, context }: {
  seed: TextSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onSaved: (updatedAt: number) => void
  tokens: TokenValues
  context: TextContext
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
  const [writing, setWriting] = useState(false)
  const [menu, setMenu] = useState(false)
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
    try { const r = await saveQuoteText(quoteId, kind, v); onSaved(r.updatedAt) } catch { fail(`save the ${label.toLowerCase()}`) }
  }
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  useEffect(() => () => { void flushRef.current() }, [])
  const change = (next: string) => {
    setHtml(next)
    pending.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS)
  }

  const toggleVisible = (v: boolean) => {
    setVisible(v)
    void run('save the setting', async () => { const r = await setQuoteTextVisible(quoteId, kind, v); onSaved(r.updatedAt) })
  }
  const addTemplate = (t: QuoteTextTemplate) => {
    editor.current?.append(resolveTokens(t.body, tokens))
    snackbar({ message: `“${t.title}” added` })
  }
  const write = () => {
    if (writing) return
    const before = html
    setWriting(true)
    setTimeout(() => {
      editor.current?.replace(kind === 'terms' ? aiTerms(context) : aiNotes(context))
      setWriting(false)
      snackbar({ message: `Maison AI wrote your ${label.toLowerCase()}`, actionLabel: 'Undo', onAction: () => editor.current?.replace(before) })
    }, 900)   // a beat of "writing" before the text lands — invented pacing (REG-420)
  }

  const actions = phone ? (
    <span ref={moreRef} className={styles.anchor}>
      <Tooltip label="More options" disabled={menu}>
        <IconButton icon="more_vert" label={`More options for ${label}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
      </Tooltip>
      <PortalMenu open={menu} anchor={moreRef} onClose={() => setMenu(false)} role="menu" width={240} align="right" sheetTitle={label}>
        <DropdownItem onSelect={() => { setMenu(false); setModal(true) }}>My Templates</DropdownItem>
        <DropdownItem role="menuitemcheckbox" checked={visible} onSelect={() => { setMenu(false); toggleVisible(!visible) }}>
          <span className={styles.menuIcon} data-on={visible || undefined}><Icon name={visible ? 'check_box' : 'check_box_outline_blank'} size={20} /></span>Show in client view
        </DropdownItem>
      </PortalMenu>
    </span>
  ) : (
    <div className={styles.actions}>
      <button type="button" className={styles.link} onClick={() => setModal(true)}>My Templates</button>
      <label className={styles.switchRow}>Show in client view <Switch size="sm" isSelected={visible} onChange={toggleVisible} aria-label="Show in client view" /></label>
    </div>
  )

  return (
    <SectionCard id={`section-${kind}`} title={label} open={open} onToggle={onToggle} actions={actions} onHandlePointerDown={onHandlePointerDown}>
      <RichEditor ref={editor} value={html} onChange={change} placeholder={TEXT_PLACEHOLDER[kind]} label={label}
                  right={<Button variant="primary" appearance="outlined" iconStart={<AiMark />} isDisabled={writing} onPress={write}>{writing ? 'Writing…' : 'Write with AI'}</Button>} />
      <TemplatesModal open={modal} kind={kind} templates={templates} onClose={() => setModal(false)} onAdd={addTemplate} onTemplates={setTemplates} />
    </SectionCard>
  )
}
