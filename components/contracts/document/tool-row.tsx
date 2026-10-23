'use client'

import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { FORMAT_KEYS } from '@/lib/keys/registry'
import { useMediaQuery } from '@/lib/breakpoint'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { placeWords, SIGN_LABEL, type TokenValues } from '@/lib/contracts/tokens'
import type { DocEditorHandle, DocState } from '../editor/doc-editor'
import editorStyles from '../editor/contract-editor.module.css'
import { LinkDialog, useImagePick } from './insert-helpers'
import { useLiveDocHtml } from './live-doc'
import { MenuOrSheet } from './menu-or-sheet'
import { BLOCKS, PHONE_MODEL } from './model'
import { PlacementDialog } from './placement-dialog'
import { PlusMenu } from './plus-menu'
import doc from './document.module.css'

const STYLE_CLASS: Partial<Record<string, string>> = { h1: editorStyles.styleH1, h2: editorStyles.styleH2, h3: editorStyles.styleH3 }

/**
 * The Document screen's one tool row (P-03, B-03 · C-08 · C-16 · B-20): at ≤1024 the formatting bar is **Undo · Text ▾ · B · I · U · List ·
 * + ▾** — seven 44 boxes at a 44 pitch, nothing scrolling sideways, nothing hidden; the rest of the desk's bar (Highlight, Alignment, the
 * numbered list, Link, Image, Insert a field, Add a signature field) is one tap further under + ▾ (PlusMenu). The Outline is not here: the
 * Document screen's bar carries ≡ (C1's `DocumentFrame`), and today's page keeps it in Maison AI's sheet. No Maison button covers the paper
 * — the frame hides it (REG-2587's rule). Write with AI rides the + sheet's pinned row on a phone and the row's end on a tablet held sideways.
 */
export function ToolRow({ editor, state, values, disabled, writing }: {
  editor: RefObject<DocEditorHandle | null>; state: DocState; values: TokenValues; disabled?: boolean; writing?: ReactNode
}) {
  const snackbar = useSnackbar()
  const phone = useMediaQuery(PHONE_MODEL)
  const html = useLiveDocHtml() ?? ''
  const [menu, setMenu] = useState<'style' | 'plus' | null>(null)
  const [placing, setPlacing] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const styleAnchor = useRef<HTMLSpanElement>(null)
  const plusAnchor = useRef<HTMLSpanElement>(null)
  const image = useImagePick(editor)
  const keep = (e: React.MouseEvent) => e.preventDefault()   // the selection survives the press
  const tool = (icon: string, label: string, onClick: () => void, active = false, weight: 300 | 400 = 300) => (
    <Tooltip key={label} label={label} keys={FORMAT_KEYS[label]}>
      <button type="button" className={doc.tool} aria-label={label} aria-pressed={active} data-active={active || undefined} disabled={disabled}
              onMouseDown={keep} onClick={onClick}><Icon name={icon} size={24} weight={weight} /></button>
    </Tooltip>
  )
  const cur = BLOCKS.find((b) => b.kind === state.block) ?? BLOCKS[0]!
  return (
    <div className={doc.row} role="toolbar" aria-label="Formatting" data-testid="doc-tool-row">
      {tool('undo', 'Undo', () => editor.current?.exec('undo'))}
      <span className={doc.anchor} ref={styleAnchor}>
        <button type="button" className={doc.styleBtn} aria-label={`Text style: ${cur.label}`} aria-haspopup="menu" aria-expanded={menu === 'style'} data-open={menu === 'style' || undefined} disabled={disabled}
                onMouseDown={keep} onClick={() => setMenu((m) => (m === 'style' ? null : 'style'))} data-testid="doc-style">
          <span className={doc.styleLabel}>{cur.kind === 'p' ? 'Text' : cur.label}</span><span className={doc.chev} data-open={menu === 'style' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
        </button>
        {/* (REG-728) each row drawn in its own style; the current one says so with the Selected fill */}
        <MenuOrSheet open={menu === 'style'} onClose={() => setMenu(null)} anchor={styleAnchor} title="Text style" width={MENU_WIDTH.standard}>
          {BLOCKS.map((b) => (
            <DropdownItem key={b.kind} role="menuitemradio" checked={b.kind === state.block} selected={b.kind === state.block} onSelect={() => { setMenu(null); editor.current?.formatBlock(b.kind) }}>
              <span className={`${editorStyles.menuText} ${STYLE_CLASS[b.kind] ?? ''}`}>{b.label}</span>
            </DropdownItem>
          ))}
        </MenuOrSheet>
      </span>
      {tool('format_bold', 'Bold', () => editor.current?.exec('bold'), state.bold, 400)}
      {tool('format_italic', 'Italic', () => editor.current?.exec('italic'), state.italic)}
      {tool('format_underlined', 'Underline', () => editor.current?.exec('underline'), state.underline)}
      {tool('format_list_bulleted', 'Bulleted list', () => editor.current?.exec('insertUnorderedList'), state.ul)}
      {!phone && writing ? <span className={doc.rowEnd}>{writing}</span> : null}
      <span className={`${doc.anchor} ${doc.plusAnchor}`} ref={plusAnchor}>
        <button type="button" className={doc.plusBtn} aria-label="Insert" aria-haspopup="menu" aria-expanded={menu === 'plus'} data-open={menu === 'plus' || undefined} disabled={disabled}
                onMouseDown={keep} onClick={() => setMenu((m) => (m === 'plus' ? null : 'plus'))} data-testid="doc-insert">
          <Icon name="add" size={24} weight={400} /><span className={doc.chev} data-open={menu === 'plus' || undefined}><Icon name="keyboard_arrow_down" size={16} /></span>
        </button>
        <PlusMenu open={menu === 'plus'} onClose={() => setMenu(null)} anchor={plusAnchor} editor={editor} state={state} values={values}
                  onSignature={() => setPlacing(true)} onLink={() => setLinkOpen(true)} onImage={image.open} writing={phone ? writing : undefined} />
      </span>
      {image.input}
      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} onAdd={(u) => editor.current?.link(u)} />
      {/* (P-04) the field as its own block after the clause picked; the box scrolls to mid-screen with the fresh pulse, the snackbar says where, with Undo */}
      <PlacementDialog open={placing} onClose={() => setPlacing(false)} html={html} hasStudioSignature locked={disabled}
                       onAdd={(key, row) => {
                         setPlacing(false)
                         const api = editor.current; const r = api?.insertSignFieldAt(row.place, key)
                         if (!api || !r) return
                         snackbar({ message: `${SIGN_LABEL[key]} added ${placeWords(row)}`, actionLabel: 'Undo', onAction: () => api.replaceAll(r.prev) })
                       }} />
    </div>
  )
}
