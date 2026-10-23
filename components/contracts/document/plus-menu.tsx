'use client'

import { Fragment, type ReactNode, type RefObject } from 'react'
import { FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { TOKEN_GROUPS, TOKEN_LABEL, tokenChip, type TokenKey, type TokenValues } from '@/lib/contracts/tokens'
import type { DocEditorHandle, DocState } from '../editor/doc-editor'
import { MenuOrSheet } from './menu-or-sheet'
import { ALIGNS } from './model'
import doc from './document.module.css'

/**
 * The tool row's + ▾ (P-03 · C-16): everything the desk's bar holds beyond the six tools, in one sheet — Add a signature field › · Link · Image ·
 * Highlight · Numbered list · the three alignments, then **Insert a field in one level**: every record under its group's eyebrow with what it
 * prints on this document at the row's end (the desk's two-level menu cost three taps a field). A field inserted from here is announced with
 * Undo, as every add is. Write with AI (the host's trigger) is the sheet's pinned row.
 */
export function PlusMenu({ open, onClose, anchor, editor, state, values, onSignature, onLink, onImage, writing }: {
  open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>
  editor: RefObject<DocEditorHandle | null>; state: DocState; values: TokenValues
  onSignature: () => void; onLink: () => void; onImage: () => void; writing?: ReactNode
}) {
  const snackbar = useSnackbar()
  const run = (f: () => void) => { onClose(); f() }
  const insertToken = (key: TokenKey) => {
    const api = editor.current; if (!api) return
    const prev = api.getHtml()
    api.insertHtml(tokenChip(key))
    snackbar({ message: `${TOKEN_LABEL[key]} inserted`, actionLabel: 'Undo', onAction: () => api.replaceAll(prev) })
  }
  return (
    <MenuOrSheet open={open} onClose={onClose} anchor={anchor} title="Insert" width={MENU_WIDTH.detail} align="right" footer={writing ? <FootStart>{writing}</FootStart> : undefined}>
      <DropdownItem submenu onSelect={() => run(onSignature)}>
        <span className={doc.rowText}>Add a signature field</span><span className={doc.rowTrail}><Icon name="chevron_right" size={20} /></span>
      </DropdownItem>
      <DropdownItem onSelect={() => run(onLink)}>Link</DropdownItem>
      <DropdownItem onSelect={() => run(onImage)}>Image</DropdownItem>
      <DropdownItem role="menuitemcheckbox" checked={state.highlight} onSelect={() => run(() => editor.current?.toggleHighlight())}>Highlight</DropdownItem>
      <DropdownItem role="menuitemcheckbox" checked={state.ol} onSelect={() => run(() => editor.current?.exec('insertOrderedList'))}>Numbered list</DropdownItem>
      <DropdownDivider />
      {ALIGNS.map((x) => (
        <DropdownItem key={x.a} role="menuitemradio" checked={x.a === state.align} selected={x.a === state.align} onSelect={() => run(() => editor.current?.align(x.a))}>
          <span className={doc.rowIcon}><Icon name={x.icon} size={20} /></span>{x.label}
        </DropdownItem>
      ))}
      <DropdownDivider />
      <DropdownLabel>Insert a field</DropdownLabel>
      {TOKEN_GROUPS.map((g) => (
        <Fragment key={g.key}>
          <DropdownLabel>{g.label}</DropdownLabel>
          {/* (REG-632, parity Q-12) each record with what it prints on this document; an empty one says so — it prints its label in brackets */}
          {g.tokens.map((t) => (
            <DropdownItem key={t.key} onSelect={() => run(() => insertToken(t.key))}>
              <span className={doc.rowText}>{t.label}</span>
              {values[t.key]?.trim() ? <span className={doc.rowSample}>{values[t.key]}</span> : <span className={doc.rowSample} data-empty>Empty</span>}
            </DropdownItem>
          ))}
        </Fragment>
      ))}
    </MenuOrSheet>
  )
}
