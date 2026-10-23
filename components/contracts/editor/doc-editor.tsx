'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useShortcutsHere } from '@/lib/keys/store'
import { DOC_KEYS } from '@/lib/keys/registry'
import { useMediaQuery } from '@/lib/breakpoint'
import { insertSignFieldAfter, isBlankDoc, SIGN_LABEL, TOKEN_LABEL, type SignKey, type SignPlace, type TokenKey } from '@/lib/contracts/tokens'
import { hideTooltipFor, showTooltipFor } from '@/components/om/tooltip'
import { IconButton } from '@/components/om/icon-button'
import { useSnackbar } from '@/components/om/snackbar'
import { ChipSheet } from '../document/chip-sheet'
import { liveDocChanged, registerLiveDoc } from '../document/live-doc'
import { TOUCH, tokenSource } from '../document/model'
import doc from '../document/document.module.css'
import styles from './contract-editor.module.css'

/**
 * The contract document (REG-534): a contenteditable paper that persists as HTML — the quote editor's in-house rich text
 * (components/quotes/editor/text/rich-editor.tsx) grown for a document: headings, highlight, images, Smart Text chips and
 * eSignature fields (both `contenteditable="false"` atoms the caret jumps over and Backspace removes whole). Uncontrolled
 * while focused; external changes land through the effect; paste is plain text; the toolbar mirrors the selection
 * through `DocState` (block · marks · alignment · list).
 * (contracts on the move 2026-10-22, P-03 · P-04 · B-19 · C-15 · C-17) On touch the paper answers a finger: a tap on a Smart Text chip
 * opens its sheet (what it prints here · where it fills in from · Remove), a placed signature box carries its own ✕, both removes answer
 * with Undo, and `insertSignFieldAt` lands a field as its own block after a clause and scrolls it to mid-screen with the fresh pulse —
 * the desk's caret rules stand. The paper registers itself for the pieces that place a field (live-doc.ts).
 */
export type BlockKind = 'p' | 'h1' | 'h2' | 'h3'
export type Align = 'left' | 'center' | 'right'
export type DocState = { block: BlockKind; bold: boolean; italic: boolean; underline: boolean; strike: boolean; highlight: boolean; align: Align; ul: boolean; ol: boolean }
export const IDLE_STATE: DocState = { block: 'p', bold: false, italic: false, underline: false, strike: false, highlight: false, align: 'left', ul: false, ol: false }
export const HIGHLIGHT = '#EEE5FF'   /* primary-variant — the only highlight, the DS tint */
const INERT = 'data-om-inert'   /* a chip on its way in: made contenteditable="false" once it is in place (emit) */
const FRESH_MS = 1500   /* the fresh pulse's life (the Items grid's, REG-570…576) */
/** The paper's HTML as the record sees it: the fresh pulse's mark is the screen's alone and never reaches the host or the record. */
const clean = (html: string) => html.replace(/ data-fresh=""/g, '')

export type DocEditorHandle = {
  exec: (cmd: string, value?: string) => void
  formatBlock: (kind: BlockKind) => void
  align: (a: Align) => void
  toggleHighlight: () => void
  /** Inserts HTML at the caret (a chip, a field, an image) — the paper's last caret when a menu, a dialog or the eSignatures drawer
      holds focus — or at the end when the paper has never had one. */
  insertHtml: (html: string) => void
  /** (contracts on the move, P-04) The field as its own block after a clause (`insertSignFieldAfter`), scrolled to mid-screen with the
      fresh pulse; returns the paper as it was, for Undo — null while the paper is read-only. */
  insertSignFieldAt: (place: SignPlace, key: SignKey) => { prev: string } | null
  /** A link on the selection, or the URL itself when nothing is selected. */
  link: (href: string) => void
  focus: () => void
  getHtml: () => string
  /** The Outline pane: scroll the n-th heading into view. */
  scrollToHeading: (index: number) => void
  /** (pending modules S29) The paper's top-level blocks (each paragraph, heading, list) and where the member last was in it — the blocks a
      selection touches, or the block holding the caret — for the writing help's "the clause you're in". */
  partAt: () => { blocks: string[]; selection: [number, number] | null; caret: number | null }
  /** (pending modules S29) The blocks from…to replaced by new HTML (a proposal taken for one clause), saved like any edit. */
  replaceBlocks: (from: number, to: number, html: string) => void
  /** (pending modules S29) The whole paper replaced (a proposal for the whole contract, or its Undo), saved like any edit. */
  replaceAll: (html: string) => void
}

/** The paper's top-level pieces: every element, and text left loose at the top level (whitespace between blocks isn't one). */
const topNodes = (el: HTMLElement): ChildNode[] => Array.from(el.childNodes).filter((n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== ''))

export const DocEditor = forwardRef<DocEditorHandle, {
  value: string
  onChange: (html: string) => void
  onState: (s: DocState) => void
  placeholder: string
  label: string
  readOnly?: boolean
  /** (UX audit C7) What a Smart Text chip prints on this document — the house tooltip over the chip ("Prints as: Harpreet Kaur"), and on
      touch the chip sheet's first line. */
  chipTip?: (token: string) => string | null
}>(function DocEditor({ value, onChange, onState, placeholder, label, readOnly, chipTip }, ref) {
  const body = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  useShortcutsHere(readOnly ? [] : DOC_KEYS)   // (REG-714) the ? panel lists the paper's keys while it is open
  const [, setTick] = useState(0)
  const snackbar = useSnackbar()
  const touch = useMediaQuery(TOUCH)
  const touchRef = useRef(touch); useEffect(() => { touchRef.current = touch })

  useEffect(() => {
    const el = body.current
    if (!el) return
    if (document.activeElement !== el && clean(el.innerHTML) !== value) el.innerHTML = value   // compared without the pulse's mark, or a fresh block would be redrawn and lose it
    el.toggleAttribute('data-empty', isBlankDoc(el.innerHTML))
    liveDocChanged(clean(el.innerHTML))
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
  const emit = useCallback(() => {
    const el = body.current; if (!el) return
    /* (Dane UAT 8.03) Chips and signature fields are always inert — a chip goes in editable (see `insertHtml`), and Redo brings back a
       fresh copy of what was inserted; both are made `contenteditable="false"` here, before the paper is saved. */
    el.querySelectorAll<HTMLElement>(`[${INERT}], .om-token:not([contenteditable="false"]), .om-sign:not([contenteditable="false"])`).forEach((n) => {
      if (n.hasAttribute(INERT)) { n.removeAttribute(INERT); n.removeAttribute('style') }   // the computed style Chrome copies onto an inserted inline — the chip's class draws it
      n.setAttribute('contenteditable', 'false')
    })
    el.toggleAttribute('data-empty', isBlankDoc(el.innerHTML))
    const html = clean(el.innerHTML)   // the pulse's mark never reaches the record
    liveDocChanged(html)
    onChangeRef.current(html)
  }, [])

  /* (Dane UAT 8.03) The paper's last selection: a menu, a dialog or a drawer that takes focus (Insert a field ▾ moves it to its first
     row, REG-286) left the paper unfocused and every insert went to the end of the document. Kept on every selection change inside the
     paper and put back before a command runs — the quote editor's rich text keeps its range the same way (`savedRange`). */
  const lastRange = useRef<Range | null>(null)
  const readState = useCallback(() => {
    const el = body.current
    const sel = el ? window.getSelection() : null
    if (el && sel && sel.rangeCount && el.contains(sel.anchorNode) && el.contains(sel.focusNode)) lastRange.current = sel.getRangeAt(0).cloneRange()
    if (!el || !el.contains(document.activeElement)) { onStateRef.current(IDLE_STATE); return }
    const q = (c: string) => { try { return document.queryCommandState(c) } catch { return false } }
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
  /** Focus back in the paper at its last caret (still in the document), else at the end. */
  const refocus = () => {
    const el = body.current; if (!el || el.contains(document.activeElement)) return
    const r = lastRange.current
    if (!r || !el.contains(r.startContainer) || !el.contains(r.endContainer)) { focusEnd(); return }
    el.focus({ preventScroll: true })
    const sel = window.getSelection(); if (!sel) return
    sel.removeAllRanges(); sel.addRange(r)
  }
  const run = (cmd: string, value?: string) => {
    const el = body.current; if (!el || readOnly) return
    refocus()
    document.execCommand(cmd, false, value)
    emit(); readState(); setTick((t) => t + 1)
  }
  /** (P-04) The new block's moment — scrolled to mid-screen, the fresh pulse — the Items grid's `attention()` for a paper. */
  const attention = (node: HTMLElement) => {
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    node.setAttribute('data-fresh', '')
    window.setTimeout(() => node.removeAttribute('data-fresh'), FRESH_MS)
  }
  /** (B-19 · C-17) An inert atom taken out on touch — a chip from its sheet, a box by its ✕ — with Undo, which puts the paper back as it was. */
  const removeAtom = (node: HTMLElement, what: string) => {
    const el = body.current; if (!el || readOnly) return
    const prev = clean(el.innerHTML)
    const holder = node.parentElement
    node.remove()
    /* a box placed as its own block leaves its paragraph behind, empty — that goes with it (never the paper itself, never a block with words) */
    if (holder && holder !== el && /^(P|DIV)$/.test(holder.tagName) && !holder.textContent?.trim() && !holder.querySelector('img, .om-token, .om-sign, br')) holder.remove()
    emit(); setTick((t) => t + 1)
    snackbar({ message: `${what} removed`, actionLabel: 'Undo', onAction: () => { const b = body.current; if (!b) return; b.innerHTML = prev; emit(); setTick((t) => t + 1) } })
  }

  const api = useMemo<DocEditorHandle>(() => ({
    exec: run,
    formatBlock: (kind) => run('formatBlock', kind === 'p' ? 'p' : kind),
    align: (a) => run(a === 'center' ? 'justifyCenter' : a === 'right' ? 'justifyRight' : 'justifyLeft'),
    toggleHighlight: () => {
      let on = false
      try { const v = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor'); on = /238,\s*229,\s*255|eee5ff/i.test(String(v)) } catch { on = false }
      run('hiliteColor', on ? 'transparent' : HIGHLIGHT)
    },
    /* (Dane UAT 8.03) Chrome lifts a non-editable inline inserted at a paragraph's end out of the paragraph, onto a line of its own after
       it: a chip goes in editable — marked — and turns inert in place (`emit`), so it sits where the caret was, end of a clause included.
       (Its trailing space also keeps Chrome from unwrapping a lone span as a style span.) A signature field keeps that line of its own
       at a paragraph's end — a box under the words it follows — and sits in the text anywhere else.
       (C-16) On touch the sheet that picked the field blurred the paper, so the caret it lands at is the saved range; the line it landed on
       is brought into view when it is off the screen. */
    insertHtml: (html) => {
      run('insertHTML', /class="om-token"/.test(html) ? html.replace(/ contenteditable="false"/g, ` ${INERT}=""`) : html)
      if (!touchRef.current) return
      const n = window.getSelection()?.anchorNode
      const at = n instanceof Element ? n : n?.parentElement
      if (at && body.current?.contains(at)) { const r = at.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) at.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
    },
    insertSignFieldAt: (place, key) => {
      const el = body.current; if (!el || readOnly) return null
      const prev = clean(el.innerHTML)
      const next = insertSignFieldAfter(prev, place, key)
      el.innerHTML = next.html
      emit(); setTick((t) => t + 1)
      const node = topNodes(el)[next.index]
      if (node instanceof HTMLElement) attention(node)
      return { prev }
    },
    link: (href) => {
      const el = body.current; if (!el) return
      refocus()   // (Dane UAT 8.03) the selection the Link dialog was opened on
      const sel = window.getSelection()
      const full = /^https?:\/\//i.test(href) ? href : `https://${href}`
      if (!sel || sel.isCollapsed) run('insertHTML', `<a href="${full.replace(/"/g, '%22')}">${full}</a>`)
      else run('createLink', full)
    },
    focus: () => body.current?.focus(),
    getHtml: () => clean(body.current?.innerHTML ?? ''),
    partAt: () => {
      const el = body.current
      if (!el) return { blocks: [], selection: null, caret: null }
      const nodes = topNodes(el)
      const blocks = nodes.map((n) => (n.nodeType === 1 ? (n as Element).outerHTML : (n.textContent ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')))
      const r = lastRange.current
      if (!r || !el.contains(r.startContainer) || !el.contains(r.endContainer)) return { blocks, selection: null, caret: null }
      const topOf = (node: Node, offset: number) => {
        let n: Node | null = node === el ? el.childNodes[Math.min(offset, el.childNodes.length - 1)] ?? null : node
        while (n && n.parentNode !== el) n = n.parentNode
        return n ? nodes.indexOf(n as ChildNode) : -1
      }
      const a = topOf(r.startContainer, r.startOffset), b = topOf(r.endContainer, r.endOffset)
      if (a < 0) return { blocks, selection: null, caret: null }
      return { blocks, selection: r.collapsed || b < 0 ? null : [Math.min(a, b), Math.max(a, b)], caret: a }
    },
    replaceBlocks: (from, to, html) => {
      const el = body.current; if (!el || readOnly) return
      const nodes = topNodes(el)
      const first = nodes[from]
      if (!first) { el.insertAdjacentHTML('beforeend', html); emit(); return }
      const tpl = document.createElement('template')
      tpl.innerHTML = html
      el.insertBefore(tpl.content, first)
      for (let i = from; i <= to && i < nodes.length; i++) nodes[i]!.remove()
      emit()
    },
    replaceAll: (html) => { const el = body.current; if (!el || readOnly) return; el.innerHTML = html; emit(); setTick((t) => t + 1) },
    scrollToHeading: (index) => {
      const el = body.current; if (!el) return
      const h = el.querySelectorAll('h1, h2, h3')[index] as HTMLElement | undefined
      h?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    },
  }), [emit, readState, readOnly])   // eslint-disable-line react-hooks/exhaustive-deps -- `run`, `refocus`, `focusEnd` and `attention` close over refs only
  useImperativeHandle(ref, () => api, [api])
  /* (P-04) the one paper on the page, for the pieces that place a field without a prop from the host (the eSignatures panel) */
  useEffect(() => { registerLiveDoc(api, clean(body.current?.innerHTML ?? '')); return () => registerLiveDoc(null) }, [api])

  /* ── Touch (B-19 · C-15 · C-17): a chip's tap opens its sheet; each placed box wears its own ✕ on its top-right corner. The ✕ are drawn
     from the paper's HTML (one per field, in order) and set on their boxes by a layout read — never inside the contenteditable, so the
     record never carries a button. ── */
  const [chip, setChip] = useState<{ key: TokenKey; el: HTMLElement } | null>(null)
  const [chipOpen, setChipOpen] = useState(false)
  const signKeys = useMemo(() => (touch && !readOnly ? [...value.matchAll(/data-sign="([a-z-]+)"/g)].map((m) => m[1] as SignKey).filter((k) => !!SIGN_LABEL[k]) : []), [touch, readOnly, value])
  const xs = useRef<(HTMLSpanElement | null)[]>([])
  const placeXs = useCallback(() => {
    const el = body.current, w = wrap.current
    if (!el || !w) return
    const wr = w.getBoundingClientRect()
    const boxes = el.querySelectorAll<HTMLElement>('.om-sign[data-sign]')
    xs.current.forEach((x, i) => {
      if (!x) return
      const box = boxes[i]
      if (!box) { x.style.display = 'none'; return }
      const r = box.getBoundingClientRect()
      x.style.display = ''
      x.style.top = `${Math.round(r.top - wr.top + 4)}px`
      x.style.left = `${Math.round(r.right - wr.left - 28)}px`
    })
  }, [])
  useLayoutEffect(() => {
    if (!signKeys.length) return
    placeXs()
    const el = body.current; if (!el) return
    const ro = new ResizeObserver(placeXs)
    ro.observe(el)
    return () => ro.disconnect()
  }, [signKeys, placeXs, value])
  const onTap = (e: React.MouseEvent) => {
    if (!touchRef.current) return
    const c = chipOf(e.target)
    const key = c?.dataset.token as TokenKey | undefined
    if (c && key && TOKEN_LABEL[key]) { e.preventDefault(); setChip({ key, el: c }); setChipOpen(true) }
  }
  const tip = chip ? (chipTip?.(chip.key) ?? null) : null
  const prints = tip?.startsWith('Prints as: ') ? tip.slice('Prints as: '.length) : null
  const note = tip && !prints ? tip : null

  return (
    <div ref={wrap} className={doc.docWrap} data-touch={touch || undefined}>
      <div ref={body} className={styles.doc} contentEditable={!readOnly} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label}
           aria-readonly={readOnly || undefined} data-placeholder={placeholder} data-testid="contract-doc"
           onInput={emit} onBlur={readState} onKeyUp={readState} onMouseUp={readState} onPointerOver={onChipOver} onPointerOut={onChipOut} onClick={onTap}
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
      {signKeys.map((k, i) => (
        <span key={`${k}-${i}`} ref={(n) => { xs.current[i] = n }} className={doc.boxX}>
          <IconButton icon="close" label={`Remove ${SIGN_LABEL[k]}`} size={24} variant="bare" iconSize={20} iconFamily="outlined" data-testid="sign-field-remove"
                      onClick={() => { const box = body.current?.querySelectorAll<HTMLElement>('.om-sign[data-sign]')[i]; if (box) removeAtom(box, SIGN_LABEL[k]) }} />
        </span>
      ))}
      <ChipSheet open={chipOpen} onClose={() => setChipOpen(false)} label={chip ? TOKEN_LABEL[chip.key] : ''} prints={prints} note={note} source={chip ? tokenSource(chip.key) : ''} locked={!!readOnly}
                 onRemove={() => { setChipOpen(false); if (chip && chip.el.isConnected) removeAtom(chip.el, TOKEN_LABEL[chip.key]) }} />
    </div>
  )
})
