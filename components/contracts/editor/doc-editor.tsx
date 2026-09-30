'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useShortcutsHere } from '@/lib/keys/store'
import { DOC_KEYS } from '@/lib/keys/registry'
import { isBlankDoc } from '@/lib/contracts/tokens'
import { hideTooltipFor, showTooltipFor } from '@/components/om/tooltip'
import styles from './contract-editor.module.css'

/**
 * The contract document (REG-534): a contenteditable paper that persists as HTML — the quote editor's in-house rich text
 * (components/quotes/editor/text/rich-editor.tsx) grown for a document: headings, highlight, images, Smart Text chips and
 * eSignature fields (both `contenteditable="false"` atoms the caret jumps over and Backspace removes whole). Uncontrolled
 * while focused; external changes land through the effect; paste is plain text; the toolbar mirrors the selection
 * through `DocState` (block · marks · alignment · list).
 */
export type BlockKind = 'p' | 'h1' | 'h2' | 'h3'
export type Align = 'left' | 'center' | 'right'
export type DocState = { block: BlockKind; bold: boolean; italic: boolean; underline: boolean; strike: boolean; highlight: boolean; align: Align; ul: boolean; ol: boolean }
export const IDLE_STATE: DocState = { block: 'p', bold: false, italic: false, underline: false, strike: false, highlight: false, align: 'left', ul: false, ol: false }
export const HIGHLIGHT = '#EEE5FF'   /* primary-variant — the only highlight, the DS tint */

export type DocEditorHandle = {
  exec: (cmd: string, value?: string) => void
  formatBlock: (kind: BlockKind) => void
  align: (a: Align) => void
  toggleHighlight: () => void
  /** Inserts HTML at the caret (a chip, a field, an image), or at the end when the paper is not focused. */
  insertHtml: (html: string) => void
  /** A link on the selection, or the URL itself when nothing is selected. */
  link: (href: string) => void
  focus: () => void
  getHtml: () => string
  /** The Outline pane: scroll the n-th heading into view. */
  scrollToHeading: (index: number) => void
}

export const DocEditor = forwardRef<DocEditorHandle, {
  value: string
  onChange: (html: string) => void
  onState: (s: DocState) => void
  placeholder: string
  label: string
  readOnly?: boolean
  /** (UX audit C7) What a Smart Text chip prints on this document — the house tooltip over the chip ("Prints as: Harpreet Kaur"). */
  chipTip?: (token: string) => string | null
}>(function DocEditor({ value, onChange, onState, placeholder, label, readOnly, chipTip }, ref) {
  const body = useRef<HTMLDivElement>(null)
  useShortcutsHere(readOnly ? [] : DOC_KEYS)   // (REG-714) the ? panel lists the paper's keys while it is open
  const [, setTick] = useState(0)

  useEffect(() => {
    const el = body.current
    if (!el) return
    if (document.activeElement !== el && el.innerHTML !== value) el.innerHTML = value
    el.toggleAttribute('data-empty', isBlankDoc(el.innerHTML))
  }, [value])

  const onChangeRef = useRef(onChange); useEffect(() => { onChangeRef.current = onChange })
  const onStateRef = useRef(onState); useEffect(() => { onStateRef.current = onState })
  const chipTipRef = useRef(chipTip); useEffect(() => { chipTipRef.current = chipTip })
  /* (UX audit C7) a chip names what it prints — the house tooltip over it, on a pointer that hovers (a finger never leaves one behind) */
  const chipOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>('.om-token[data-token]') : null)
  const onChipOver = (e: React.PointerEvent) => {
    const chip = chipOf(e.target); const tip = chip && e.pointerType !== 'touch' ? chipTipRef.current?.(chip.dataset.token ?? '') : null
    if (chip && tip) showTooltipFor(chip, tip)
  }
  const onChipOut = (e: React.PointerEvent) => { const chip = chipOf(e.target); if (chip && !(e.relatedTarget instanceof Node && chip.contains(e.relatedTarget))) hideTooltipFor(chip) }
  const emit = useCallback(() => { const el = body.current; if (!el) return; el.toggleAttribute('data-empty', isBlankDoc(el.innerHTML)); onChangeRef.current(el.innerHTML) }, [])

  const readState = useCallback(() => {
    const el = body.current
    if (!el || !el.contains(document.activeElement)) { onStateRef.current(IDLE_STATE); return }
    const q = (c: string) => { try { return document.queryCommandState(c) } catch { return false } }
    const sel = window.getSelection()
    const node = sel?.anchorNode
    const elem = node instanceof Element ? node : node?.parentElement
    const blockEl = elem?.closest('h1, h2, h3, p, div, li') ?? null
    const tag = blockEl && blockEl !== el ? blockEl.tagName.toLowerCase() : 'p'
    const block: BlockKind = tag === 'h1' || tag === 'h2' || tag === 'h3' ? tag : 'p'
    const alignEl = elem?.closest('h1, h2, h3, p, div, li') as HTMLElement | null
    const ta = alignEl && alignEl !== el ? alignEl.style.textAlign : ''
    const align: Align = ta === 'center' ? 'center' : ta === 'right' ? 'right' : 'left'
    let highlight = false
    try { const v = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor'); highlight = /238,\s*229,\s*255|eee5ff/i.test(String(v)) } catch { highlight = false }
    onStateRef.current({ block, bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'), highlight, align, ul: q('insertUnorderedList'), ol: q('insertOrderedList') })
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', readState)
    return () => document.removeEventListener('selectionchange', readState)
  }, [readState])

  const focusEnd = () => {
    const el = body.current; if (!el) return
    el.focus()
    const sel = window.getSelection(); if (!sel) return
    sel.selectAllChildren(el); sel.collapseToEnd()
  }
  const run = (cmd: string, value?: string) => {
    const el = body.current; if (!el || readOnly) return
    if (!el.contains(document.activeElement)) focusEnd()
    document.execCommand(cmd, false, value)
    emit(); readState(); setTick((t) => t + 1)
  }

  useImperativeHandle(ref, () => ({
    exec: run,
    formatBlock: (kind) => run('formatBlock', kind === 'p' ? 'p' : kind),
    align: (a) => run(a === 'center' ? 'justifyCenter' : a === 'right' ? 'justifyRight' : 'justifyLeft'),
    toggleHighlight: () => {
      let on = false
      try { const v = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor'); on = /238,\s*229,\s*255|eee5ff/i.test(String(v)) } catch { on = false }
      run('hiliteColor', on ? 'transparent' : HIGHLIGHT)
    },
    insertHtml: (html) => run('insertHTML', html),
    link: (href) => {
      const el = body.current; if (!el) return
      if (!el.contains(document.activeElement)) focusEnd()
      const sel = window.getSelection()
      const full = /^https?:\/\//i.test(href) ? href : `https://${href}`
      if (!sel || sel.isCollapsed) run('insertHTML', `<a href="${full.replace(/"/g, '%22')}">${full}</a>`)
      else run('createLink', full)
    },
    focus: () => body.current?.focus(),
    getHtml: () => body.current?.innerHTML ?? '',
    scrollToHeading: (index) => {
      const el = body.current; if (!el) return
      const h = el.querySelectorAll('h1, h2, h3')[index] as HTMLElement | undefined
      h?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    },
  }), [emit, readState, readOnly])   // eslint-disable-line react-hooks/exhaustive-deps -- `run` and `focusEnd` close over refs only

  return (
    <div ref={body} className={styles.doc} contentEditable={!readOnly} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label}
         aria-readonly={readOnly || undefined} data-placeholder={placeholder} data-testid="contract-doc"
         onInput={emit} onBlur={readState} onKeyUp={readState} onMouseUp={readState} onPointerOver={onChipOver} onPointerOut={onChipOut}
         onKeyDown={(e) => {
           if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'y') { e.preventDefault(); document.execCommand('redo'); return }   // (REG-714) ⌘Y redoes, as in the other editors
           /* Cmd/Ctrl+B/I/U are the browser's. (sweep S2 #10) Tab indents a list item and Shift+Tab brings it back; anywhere else Tab moves
              on, as on every other field — it inserted spaces, and a keyboard could never leave the page. */
           if (e.key === 'Tab') {
             const at = window.getSelection()?.anchorNode
             const inList = !!(at && (at instanceof Element ? at : at.parentElement)?.closest('li'))
             if (inList) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent') }
           }
         }}
         onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }} />
  )
})
