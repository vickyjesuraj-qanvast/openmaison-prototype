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
const JUSTIFY: Record<string, Cmd> = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight' }

export type RichEditorHandle = {
  /** Appends HTML after what is there (a template's "Add" — owner 2026-09-11: append). */
  append: (html: string) => void
  /** Replaces the whole body (Write with AI). */
  replace: (html: string) => void
  /** Inserts text at the caret (Insert Token ▾), or at the end when the body is not focused. */
  insertText: (text: string) => void
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
}>(function RichEditor({ value, onChange, placeholder, label, right, framed, fill, minHeight = 361 }, ref) {
  const body = useRef<HTMLDivElement>(null)
  useShortcutsHere(DOC_KEYS)   // (REG-714) the ? panel lists the text editor's keys while it is open
  const [active, setActive] = useState<Partial<Record<Cmd, boolean>>>({})
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const savedRange = useRef<Range | null>(null)

  useEffect(() => {
    const el = body.current
    if (!el) return
    if (document.activeElement !== el && el.innerHTML !== value) el.innerHTML = value
    el.toggleAttribute('data-empty', isBlankHtml(el.innerHTML))
  }, [value])

  const onChangeRef = useRef(onChange); useEffect(() => { onChangeRef.current = onChange })
  const emit = useCallback(() => { const el = body.current; if (!el) return; el.toggleAttribute('data-empty', isBlankHtml(el.innerHTML)); onChangeRef.current(el.innerHTML) }, [])
  const readActive = useCallback(() => {
    const el = body.current
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
    append: (html) => { const el = body.current; if (!el) return; el.innerHTML = isBlankHtml(el.innerHTML) ? html : `${el.innerHTML}${html}`; emit() },
    replace: (html) => { const el = body.current; if (!el) return; el.innerHTML = html; emit() },
    insertText: (text) => {
      const el = body.current
      if (!el) return
      if (el.contains(document.activeElement)) { document.execCommand('insertText', false, text) }
      else { el.focus(); const sel = window.getSelection(); sel?.selectAllChildren(el); sel?.collapseToEnd(); document.execCommand('insertText', false, text) }
      emit()
    },
    focus: () => body.current?.focus(),
  }), [emit])

  return (
    <div className={styles.editor} data-framed={framed || undefined} data-fill={fill || undefined}>
      <div className={styles.toolbar} role="toolbar" aria-label={`${label} formatting`}>
        <div className={styles.tools}>
          {GROUPS.map((g, gi) => (
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
          <span className={styles.group}>
            <span className={styles.rule} aria-hidden />
            <Tooltip label="Link">
              <button type="button" className={styles.tool} aria-label="Link" onMouseDown={(e) => e.preventDefault()} onClick={openLink}><Icon name="link" size={24} weight={300} /></button>
            </Tooltip>
          </span>
        </div>
        {right ? <div className={styles.right}>{right}</div> : null}
      </div>
      <div ref={body} className={styles.body} style={{ minHeight: fill ? 0 : minHeight }} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label}
           data-placeholder={placeholder}
           onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'y') { e.preventDefault(); document.execCommand('redo') } }}   /* (REG-714) ⌘Y redoes, as in the other editors */
           onInput={emit} onBlur={readActive}
           onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }} />
      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} title="Add link" size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setLinkOpen(false)}>Cancel</Button><Button onPress={addLink} isDisabled={!url.trim()}>Add</Button></>}>
        <TextField label="Link URL" required value={url} onChange={setUrl} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) { e.preventDefault(); addLink() } }} />
      </Dialog>
    </div>
  )
})
