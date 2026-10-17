'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import { useShortcutsHere } from '@/lib/keys/store'
import { DOC_KEYS } from '@/lib/keys/registry'
import { FORMAT_KEYS } from '@/lib/keys/registry'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { isBlankHtml } from '@/lib/quotes/text'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { sanitizeRichHtml } from '@/lib/rich-html'
import styles from './rich-editor.module.css'

/** The toolbar's commands (1263:36241, left to right) — `document.execCommand` names acting on the body's selection. */
type Cmd = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'justifyLeft' | 'justifyCenter' | 'justifyRight'
type Tool = { icon: string; label: string; cmd: Cmd }
/* The glyphs are the mock's (1263:36241): bold at Regular, the rest Light; strikethrough_s and the align_horizontal_* bars. */
type ToolDef = Tool & { weight?: 300 | 400 }
const GROUPS: ToolDef[][] = [
  [{ icon: 'format_bold', label: 'Bold', cmd: 'bold', weight: 400 }, { icon: 'format_italic', label: 'Italic', cmd: 'italic' }, { icon: 'format_underlined', label: 'Underline', cmd: 'underline' }, { icon: 'strikethrough_s', label: 'Strikethrough', cmd: 'strikeThrough' }],
  [{ icon: 'format_list_bulleted', label: 'Bulleted list', cmd: 'insertUnorderedList' }, { icon: 'format_list_numbered', label: 'Numbered list', cmd: 'insertOrderedList' }],
  [{ icon: 'align_horizontal_left', label: 'Align left', cmd: 'justifyLeft' }, { icon: 'align_horizontal_center', label: 'Align centre', cmd: 'justifyCenter' }, { icon: 'align_horizontal_right', label: 'Align right', cmd: 'justifyRight' }],
]
const ALL = GROUPS.flat()
/* (S44G — NB-08, her ask 2026-10-15, as recommended) a template's Text block: the marks 1.0's rich-text sections printed — bold · italic ·
   underline | bulleted · numbered — then the kit's colour and the link; no strikethrough, and no alignment: the block's own Text style aligns it */
const BLOCK_GROUPS: ToolDef[][] = [GROUPS[0]!.filter((t) => t.cmd !== 'strikeThrough'), GROUPS[1]!]
const JUSTIFY: Record<string, Cmd> = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight' }

export type RichEditorHandle = {
  /** Appends HTML after what is there (a template's "Add" — owner 2026-09-11: append). */
  append: (html: string) => void
  /** Replaces the whole body (Write with AI). */
  replace: (html: string) => void
  /** Inserts text at the caret (Insert Token ▾), or at the end when the body is not focused. */
  insertText: (text: string) => void
  /** (S44G — NB-08) Inserts a field where the caret last was in the body — the menu that picked it took the focus — or at the end. */
  insertField: (text: string) => void
  focus: () => void
}

/**
 * The in-house rich text editor (1263:36241 toolbar + 1263:36259 body; owner 2026-09-11: "in-house rich text"). The
 * toolbar is the mock's row — B · I · U · S | bulleted · numbered | left · centre · right | link — 24px bare icon buttons
 * 40 apart with 1×36 rules, plus a `right` slot (Write with AI · Insert Token ▾). The body is a contenteditable that
 * persists as HTML (the Notes tab's BodyArea, REG-252): uncontrolled while focused, external changes land through the
 * effect, paste is plain text, and the buttons mirror the selection through queryCommandState (REG-260).
 */
export const RichEditor = forwardRef<RichEditorHandle, {
  value: string
  onChange: (html: string) => void
  placeholder: string
  label: string
  right?: ReactNode
  /** The toolbar row sits inside its own box (the template modal's editor, 1263:36344) — no change to the tools. */
  framed?: boolean
  /** The body takes the editor's remaining height and scrolls inside it (the template form's fixed 663, REG-437). */
  fill?: boolean
  minHeight?: number
  /** (S44I — call C2) `inline`: B · I · U · S only, and Enter breaks the line — a line's name keeps its words on one block.
      (S44G — NB-08) `block`: a quote template's Text block — B · I · U | bulleted · numbered | the kit's colour | link. */
  tools?: 'all' | 'inline' | 'block'
  /** (S44G — NB-08) A narrow pane's editor (the template editor's 320 inspector): the inspector's 36 tool boxes in one row without the mock's
      68-tall bar, the `right` slot on its own line under them, the body's paragraphs as close together as the print sets them. */
  dense?: boolean
  /** (S44I — call C2, REVERSES REG-557's "no colour inside text") the brand kit's text colours: a run takes one as `<span data-kit="KEY">` —
      never a free hex, so the words follow the kit when the studio changes it. Absent, no colour tool. */
  colors?: { key: string; label: string; value: string }[]
  /** (S44I — S43D's NB-07 (a), 1.0's 91fbb81e9) a picture in the words — a section's note — at the caret, aligned by the paragraph's own
      alignment tools; downscaled and kept in the words (the allowlist keeps a picture's data). */
  pictures?: boolean
}>(function RichEditor({ value, onChange, placeholder, label, right, framed, fill, minHeight = 361, tools = 'all', colors, pictures = false, dense = false }, ref) {
  const body = useRef<HTMLDivElement>(null)
  /** (S44G — NB-08) Where the caret last was inside the body: a field picked from a menu goes there. */
  const lastRange = useRef<Range | null>(null)
  useShortcutsHere(DOC_KEYS)   // (REG-714) the ? panel lists the text editor's keys while it is open
  const [active, setActive] = useState<Partial<Record<Cmd, boolean>>>({})
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const savedRange = useRef<Range | null>(null)

  useEffect(() => {
    const el = body.current
    if (!el) return
    /* (S44Q, triage §12.1) the stored body goes into the page through the house allowlist — a picture's error handler in a row written before
       the allowlist ran the moment the editor drew it */
    const safe = sanitizeRichHtml(value)
    if (document.activeElement !== el && el.innerHTML !== safe) el.innerHTML = safe
    el.toggleAttribute('data-empty', isBlankHtml(el.innerHTML))
  }, [value])

  const onChangeRef = useRef(onChange); useEffect(() => { onChangeRef.current = onChange })
  const emit = useCallback(() => { const el = body.current; if (!el) return; el.toggleAttribute('data-empty', isBlankHtml(el.innerHTML)); onChangeRef.current(el.innerHTML) }, [])
  const readActive = useCallback(() => {
    const el = body.current
    const at = window.getSelection()
    if (el && at && at.rangeCount && el.contains(at.anchorNode)) lastRange.current = at.getRangeAt(0).cloneRange()
    if (!el || !el.contains(document.activeElement)) { setActive((a) => (Object.keys(a).length ? {} : a)); return }
    const next: Partial<Record<Cmd, boolean>> = {}
    for (const t of ALL) { try { next[t.cmd] = document.queryCommandState(t.cmd) } catch { next[t.cmd] = false } }
    /* An alignment is pressed only when the block SAYS so (1263:36241 draws none pressed at rest): queryCommandState answers
       "left" for every unaligned paragraph, which lit Align left on any focus. */
    const sel = window.getSelection()
    const node = sel?.anchorNode
    const block = (node instanceof Element ? node : node?.parentElement)?.closest('p, div, li, h1, h2, h3, h4, h5, h6, blockquote')
    const set = block && block !== el ? (block as HTMLElement).style.textAlign : ''
    for (const cmd of Object.values(JUSTIFY)) next[cmd] = false
    if (set && JUSTIFY[set]) next[JUSTIFY[set]!] = true
    setActive((prev) => (ALL.every((t) => !!prev[t.cmd] === !!next[t.cmd]) ? prev : next))
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', readActive)
    return () => document.removeEventListener('selectionchange', readActive)
  }, [readActive])

  const run = (cmd: Cmd) => { body.current?.focus(); document.execCommand(cmd); emit(); readActive() }
  /* (S44I — call C2) a kit colour on the words picked: the run is wrapped in one span carrying the kit's key (any colour inside it gives way),
     or — "The text's own colour" — unwrapped; the span's inline colour only paints it here, the print reads the key (lib/templates/kit-html.ts). */
  const [colorOpen, setColorOpen] = useState(false)
  const [colorHint, setColorHint] = useState(false)
  const colorRef = useRef<HTMLSpanElement>(null)
  const colorRange = useRef<Range | null>(null)
  const openColor = () => {
    const sel = window.getSelection()
    const r = sel && sel.rangeCount && body.current?.contains(sel.anchorNode) && !sel.isCollapsed ? sel.getRangeAt(0).cloneRange() : null
    colorRange.current = r
    if (!r) { setColorHint(true); window.setTimeout(() => setColorHint(false), 2400); return }
    setColorOpen(true)
  }
  const applyColor = (key: string | null) => {
    setColorOpen(false)
    const el = body.current, r = colorRange.current
    if (!el || !r) return
    el.focus()
    const frag = r.extractContents()
    frag.querySelectorAll('span[data-kit]').forEach((s) => { s.replaceWith(...Array.from(s.childNodes)) })
    const c = key ? colors?.find((x) => x.key === key) : null
    let placed: Node = frag
    if (c) { const span = document.createElement('span'); span.setAttribute('data-kit', c.key); span.style.color = c.value; span.appendChild(frag); placed = span }
    const first = placed.firstChild, last = placed.lastChild
    r.insertNode(placed)
    /* an underline or a strike drawn round the coloured run takes its colour (UAT row 298): the colour moves outside the decoration */
    if (placed instanceof HTMLElement) {
      const deco = placed.parentElement
      if (deco && deco !== el && /^(U|S|STRIKE)$/.test(deco.tagName) && deco.childNodes.length === 1) {
        const inner = deco.cloneNode(false)
        while (placed.firstChild) inner.appendChild(placed.firstChild)
        placed.appendChild(inner)
        deco.replaceWith(placed)
      }
    }
    const sel = window.getSelection()
    if (sel) { const nr = document.createRange(); if (placed instanceof HTMLElement) nr.selectNodeContents(placed); else if (first && last) { nr.setStartBefore(first); nr.setEndAfter(last) } sel.removeAllRanges(); sel.addRange(nr) }
    emit()
  }
  const shownGroups = tools === 'inline' ? [GROUPS[0]!] : tools === 'block' ? BLOCK_GROUPS : GROUPS
  /* (S44I — NB-07 (a)) a picture at the caret: read in the browser, downscaled to 800 px, refused past ~250 KB with the reason */
  const [pictureHint, setPictureHint] = useState<string | null>(null)
  const pictureRange = useRef<Range | null>(null)
  const pickPicture = () => {
    const sel = window.getSelection()
    pictureRange.current = sel && sel.rangeCount && body.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp,image/gif'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const { readFileAsDataUrl } = await import('@/lib/templates/files')
      const url = await readFileAsDataUrl(f, 800, { jpeg: f.type !== 'image/png' })
      if (url.length > 350_000) { setPictureHint('That picture is too large — pick a smaller one'); window.setTimeout(() => setPictureHint(null), 3200); return }
      const el = body.current
      if (!el) return
      el.focus()
      const s = window.getSelection()
      if (pictureRange.current && s) { s.removeAllRanges(); s.addRange(pictureRange.current) } else if (s) { s.selectAllChildren(el); s.collapseToEnd() }
      document.execCommand('insertHTML', false, `<p><img src="${url}" alt="" style="max-width: 100%"></p>`)
      emit()
    }
    input.click()
  }
  const openLink = () => {
    const sel = window.getSelection()
    savedRange.current = sel && sel.rangeCount && body.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null
    setUrl(''); setLinkOpen(true)
  }
  const addLink = () => {
    const href = url.trim()
    setLinkOpen(false)
    if (!href) return
    const el = body.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (savedRange.current && sel) { sel.removeAllRanges(); sel.addRange(savedRange.current) }
    const full = /^https?:\/\//i.test(href) ? href : `https://${href}`
    if (!sel || sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${full.replace(/"/g, '%22')}">${full}</a>`)
    else document.execCommand('createLink', false, full)
    emit()
  }

  useImperativeHandle(ref, () => ({
    append: (html) => { const el = body.current; if (!el) return; const safe = sanitizeRichHtml(html); el.innerHTML = isBlankHtml(el.innerHTML) ? safe : `${el.innerHTML}${safe}`; emit() },
    replace: (html) => { const el = body.current; if (!el) return; el.innerHTML = sanitizeRichHtml(html); emit() },
    insertText: (text) => {
      const el = body.current
      if (!el) return
      if (el.contains(document.activeElement)) { document.execCommand('insertText', false, text) }
      else { el.focus(); const sel = window.getSelection(); sel?.selectAllChildren(el); sel?.collapseToEnd(); document.execCommand('insertText', false, text) }
      emit()
    },
    insertField: (text) => {
      const el = body.current
      const sel = window.getSelection()
      if (!el || !sel) return
      const r = lastRange.current
      el.focus()
      if (r && el.contains(r.startContainer) && el.contains(r.endContainer)) {
        /* a field never sticks to the word beside the caret: a space before it after a word, and after it before one */
        const node = r.startContainer, at = r.startOffset, words = node.nodeType === Node.TEXT_NODE ? node.textContent ?? '' : ''
        const pre = r.collapsed && at > 0 && /\S/.test(words[at - 1] ?? ' ') ? ' ' : '', post = r.collapsed && /[\p{L}\p{N}]/u.test(words[at] ?? '') ? ' ' : ''
        sel.removeAllRanges(); sel.addRange(r); document.execCommand('insertText', false, `${pre}${text}${post}`)
      }
      else {   // never placed (or the words were replaced since): at the end, a space before it as the plain box's Insert a field did
        sel.selectAllChildren(el); sel.collapseToEnd()
        const words = isBlankHtml(el.innerHTML) ? '' : el.textContent ?? ''
        document.execCommand('insertText', false, words && !/\s$/.test(words) ? ` ${text}` : text)
      }
      emit()
    },
    focus: () => body.current?.focus(),
  }), [emit])

  return (
    <div className={styles.editor} data-framed={framed || undefined} data-fill={fill || undefined} data-dense={dense || undefined}>
      <div className={styles.toolbar} role="toolbar" aria-label={`${label} formatting`}>
        <div className={styles.tools}>
          {shownGroups.map((g, gi) => (
            <span key={gi} className={styles.group}>
              {gi > 0 ? <span className={styles.rule} aria-hidden /> : null}
              {g.map((t) => (
                <Tooltip key={t.cmd} label={t.label} keys={FORMAT_KEYS[t.label]}>
                  <button type="button" className={styles.tool} aria-label={t.label} aria-pressed={!!active[t.cmd]} data-active={active[t.cmd] || undefined}
                          onMouseDown={(e) => e.preventDefault()} onClick={() => run(t.cmd)}>
                    <Icon name={t.icon} size={24} weight={t.weight ?? 300} />
                  </button>
                </Tooltip>
              ))}
            </span>
          ))}
          {colors?.length ? (
            <span className={styles.group} ref={colorRef}>
              <span className={styles.rule} aria-hidden />
              <Tooltip label={colorHint ? 'Select the words to colour first' : 'Text colour — from your brand kit'} disabled={colorOpen}>
                <button type="button" className={styles.tool} aria-label="Text colour" aria-haspopup="menu" aria-expanded={colorOpen} data-testid="text-colour" onMouseDown={(e) => e.preventDefault()} onClick={openColor}><Icon name="palette" size={24} weight={300} /></button>
              </Tooltip>
              {colorHint ? <span className={styles.toolHint} role="status">Select the words to colour first</span> : null}
              <PortalMenu open={colorOpen} anchor={colorRef} onClose={() => setColorOpen(false)} role="menu" width={MENU_WIDTH.wide} sheetTitle="Text colour">
                {colors.map((c) => <DropdownItem key={c.key} onSelect={() => applyColor(c.key)}><span className={styles.swatch} style={{ ['--sw' as string]: c.value }} aria-hidden />{c.label}</DropdownItem>)}
                <DropdownItem onSelect={() => applyColor(null)}><span className={styles.swatch} data-none="" aria-hidden />The text’s own colour</DropdownItem>
              </PortalMenu>
            </span>
          ) : null}
          {pictures ? (
            <span className={styles.group}>
              <span className={styles.rule} aria-hidden />
              <Tooltip label="Picture — align it with the alignment tools"><button type="button" className={styles.tool} aria-label="Picture" data-testid="rich-picture" onMouseDown={(e) => e.preventDefault()} onClick={pickPicture}><Icon name="add_photo_alternate" size={24} weight={300} /></button></Tooltip>
              {pictureHint ? <span className={styles.toolHint} role="status">{pictureHint}</span> : null}
            </span>
          ) : null}
          {tools === 'inline' ? null : (
          <span className={styles.group}>
            <span className={styles.rule} aria-hidden />
            <Tooltip label="Link">
              <button type="button" className={styles.tool} aria-label="Link" onMouseDown={(e) => e.preventDefault()} onClick={openLink}><Icon name="link" size={24} weight={300} /></button>
            </Tooltip>
          </span>
          )}
        </div>
        {right ? <div className={styles.right}>{right}</div> : null}
      </div>
      <div ref={body} className={styles.body} style={{ minHeight: fill ? 0 : minHeight }} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label}
           data-placeholder={placeholder}
           onKeyDown={(e) => {
             if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'y') { e.preventDefault(); document.execCommand('redo') }   /* (REG-714) ⌘Y redoes, as in the other editors */
             else if (tools === 'inline' && e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); document.execCommand('insertLineBreak'); emit() }   /* (S44I — C2) a name breaks its line, never a new block */
           }}
           onInput={emit} onBlur={readActive}
           onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }} />
      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} title="Add link" size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setLinkOpen(false)}>Cancel</Button><Button onPress={addLink} isDisabled={!url.trim()}>Add</Button></>}>
        <TextField label="Link URL" required value={url} onChange={setUrl} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) { e.preventDefault(); addLink() } }} />
      </Dialog>
    </div>
  )
})
