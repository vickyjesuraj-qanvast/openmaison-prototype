'use client'

import { useId, useState, useRef } from 'react'
import { FORMAT_KEYS } from '@/lib/keys/registry'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { TOKEN_GROUPS, tokenChip, type TokenKey, type TokenValues } from '@/lib/contracts/tokens'
import tools from '@/components/quotes/editor/text/rich-editor.module.css'
import styles from './contract-editor.module.css'
import type { Align, BlockKind, DocEditorHandle, DocState } from './doc-editor'

const BLOCKS: { kind: BlockKind; label: string; cls?: string }[] = [
  { kind: 'p', label: 'Normal text' }, { kind: 'h1', label: 'Heading 1', cls: styles.styleH1 }, { kind: 'h2', label: 'Heading 2', cls: styles.styleH2 }, { kind: 'h3', label: 'Heading 3', cls: styles.styleH3 },
]
const ALIGNS: { a: Align; icon: string; label: string }[] = [{ a: 'left', icon: 'format_align_left', label: 'Align left' }, { a: 'center', icon: 'format_align_center', label: 'Align centre' }, { a: 'right', icon: 'format_align_right', label: 'Align right' }]
const MAX_IMAGE = 1_500_000

/**
 * The formatting bar (the reference: undo · redo | Normal Text ▾ | B I U highlight | align ▾ | lists | link · image ·
 * Insert a field ▾ · eSignatures) on the rich editor's 24px tools with 1×28 rules. Insert a field is the two-level menu — a
 * group row opens its tokens, each with the record's live value as its sample (the reference's grey right column).
 * (Dane UAT 3.19) "Insert a field" is the house name of every merge-field menu (the template inspector's, Notifications') — it read
 * "Smart Text" here. (Dane UAT 8.03) Its trigger keeps the caret where the studio clicked: a pointer press leaves focus in the paper, and
 * the paper puts its last selection back before it inserts (doc-editor.tsx `refocus`).
 */
export function DocToolbar({ editor, state, values, onESign, eSignOpen, onOutline, outlineOpen, disabled }: {
  editor: React.RefObject<DocEditorHandle | null>
  state: DocState
  values: TokenValues
  onESign: () => void
  eSignOpen: boolean
  onOutline?: () => void
  outlineOpen?: boolean
  disabled?: boolean
}) {
  const snackbar = useSnackbar()
  const [menu, setMenu] = useState<'style' | 'align' | 'smart' | null>(null)
  const styleAnchor = useRef<HTMLSpanElement>(null)
  const alignAnchor = useRef<HTMLSpanElement>(null)
  const [smartGroup, setSmartGroup] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const fileId = useId()   // the hidden file input is found by id: a ref read inside the `tool()` helper reads as a render-time ref access to the compiler
  const keep = (e: React.MouseEvent) => e.preventDefault()   // the selection survives the press
  const tool = (icon: string, label: string, onClick: () => void, active = false, weight: 300 | 400 = 300) => (
    <Tooltip key={label} label={label} keys={FORMAT_KEYS[label]}>
      <button type="button" className={tools.tool} aria-label={label} aria-pressed={active} data-active={active || undefined} disabled={disabled}
              onMouseDown={keep} onClick={onClick}><Icon name={icon} size={24} weight={weight} /></button>
    </Tooltip>
  )
  const closeSmart = () => { setMenu(null); setSmartGroup(null) }
  const insertToken = (key: TokenKey) => { closeSmart(); editor.current?.insertHtml(tokenChip(key)) }
  const pickImage = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { snackbar({ message: 'Pick an image file' }); return }
    if (file.size > MAX_IMAGE) { snackbar({ message: 'Images up to 1.5 MB' }); return }
    const r = new FileReader()
    r.onload = () => { if (typeof r.result === 'string') editor.current?.insertHtml(`<img src="${r.result}" alt="">`) }
    r.readAsDataURL(file)
  }
  const cur = BLOCKS.find((b) => b.kind === state.block) ?? BLOCKS[0]!
  const curAlign = ALIGNS.find((x) => x.a === state.align) ?? ALIGNS[0]!
  const smart = TOKEN_GROUPS.find((g) => g.key === smartGroup) ?? null

  return (
    <div className={styles.bar} role="toolbar" aria-label="Formatting">
      <div className={styles.barTools}>
        <span className={styles.barGroup}>
          {tool('undo', 'Undo', () => editor.current?.exec('undo'))}
          {tool('redo', 'Redo', () => editor.current?.exec('redo'))}
        </span>
        <span className={styles.barRule} aria-hidden />
        <span className={`${styles.barGroup} ${styles.anchor}`} ref={styleAnchor}>
          <button type="button" className={styles.styleBtn} aria-haspopup="menu" aria-expanded={menu === 'style'} data-open={menu === 'style' || undefined} disabled={disabled}
                  onMouseDown={keep} onClick={() => setMenu((m) => (m === 'style' ? null : 'style'))}>
            {cur.label}<span className={styles.chev} data-open={menu === 'style' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
          {/* (sweep S2 #1) through the body portal — inside the tools' sideways scroller the menu was clipped to nothing.
              (REG-728) The standard 200; each row is drawn in its own style, so the current one says so with the Selected fill. */}
          <PortalMenu open={menu === 'style'} anchor={styleAnchor} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="Text style">
            {BLOCKS.map((b) => (
              <DropdownItem key={b.kind} role="menuitemradio" checked={b.kind === state.block} selected={b.kind === state.block} onSelect={() => { setMenu(null); editor.current?.formatBlock(b.kind) }}>
                <span className={`${styles.menuText} ${b.cls ?? ''}`}>{b.label}</span>
              </DropdownItem>
            ))}
          </PortalMenu>
        </span>
        <span className={styles.barRule} aria-hidden />
        <span className={styles.barGroup}>
          {tool('format_bold', 'Bold', () => editor.current?.exec('bold'), state.bold, 400)}
          {tool('format_italic', 'Italic', () => editor.current?.exec('italic'), state.italic)}
          {tool('format_underlined', 'Underline', () => editor.current?.exec('underline'), state.underline)}
          {tool('format_paint', 'Highlight', () => editor.current?.toggleHighlight(), state.highlight)}
        </span>
        <span className={styles.barRule} aria-hidden />
        <span className={`${styles.barGroup} ${styles.anchor}`} ref={alignAnchor}>
          <Tooltip label="Alignment" disabled={menu === 'align'}>
            <button type="button" className={styles.styleBtn} aria-label={`Alignment: ${curAlign.label}`} aria-haspopup="menu" aria-expanded={menu === 'align'} data-open={menu === 'align' || undefined} disabled={disabled}
                    onMouseDown={keep} onClick={() => setMenu((m) => (m === 'align' ? null : 'align'))}>
              <Icon name={curAlign.icon} size={24} weight={300} /><span className={styles.chev} data-open={menu === 'align' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
            </button>
          </Tooltip>
          {/* (REG-728) Rows led by a glyph: the Selected fill marks the current alignment. */}
          <PortalMenu open={menu === 'align'} anchor={alignAnchor} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="Alignment">
            {ALIGNS.map((x) => (
              <DropdownItem key={x.a} role="menuitemradio" checked={x.a === state.align} selected={x.a === state.align} onSelect={() => { setMenu(null); editor.current?.align(x.a) }}>
                <span className={styles.menuIcon}><Icon name={x.icon} size={20} /></span>{x.label}
              </DropdownItem>
            ))}
          </PortalMenu>
        </span>
        <span className={styles.barGroup}>
          {tool('format_list_bulleted', 'Bulleted list', () => editor.current?.exec('insertUnorderedList'), state.ul)}
          {tool('format_list_numbered', 'Numbered list', () => editor.current?.exec('insertOrderedList'), state.ol)}
        </span>
        <span className={styles.barRule} aria-hidden />
        <span className={styles.barGroup}>
          {tool('link', 'Link', () => { setUrl(''); setLinkOpen(true) })}
          {tool('add_photo_alternate', 'Image', () => document.getElementById(fileId)?.click())}
          <input id={fileId} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0]); e.currentTarget.value = '' }} />
        </span>
      </div>
      <div className={styles.barEnd}>
        {onOutline ? (
          <Tooltip label={outlineOpen ? 'Hide outline' : 'Show outline'}>
            <button type="button" className={styles.styleBtn} aria-pressed={!!outlineOpen} data-open={outlineOpen || undefined} onClick={onOutline} aria-label="Outline"><Icon name="list" size={24} weight={300} /></button>
          </Tooltip>
        ) : null}
        <span className={styles.anchor}>
          <Button variant="secondary" appearance="text" isDisabled={disabled} aria-haspopup="menu" aria-expanded={menu === 'smart'} preventFocusOnPress
                  iconEnd={<span className={styles.chev} data-open={menu === 'smart' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                  onPress={() => setMenu((m) => (m === 'smart' ? null : 'smart'))}>Insert a field</Button>
          {/* (REG-728) A record's rows carry its sample: 320; the groups' rows a count and a chevron: 240. */}
          <Dropdown open={menu === 'smart'} onClose={closeSmart} align="right" width={smart ? MENU_WIDTH.detail : MENU_WIDTH.wide} sheetTitle="Insert a field">
            {smart ? (
              <>
                <DropdownItem onSelect={() => setSmartGroup(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>{smart.label}</DropdownItem>
                <DropdownDivider />
                {/* (REG-632, parity Q-12) Each record with what it prints on this document; an empty one says so — it prints its label in brackets. */}
                {smart.tokens.map((t) => (
                  <DropdownItem key={t.key} onSelect={() => insertToken(t.key)}>
                    <span className={styles.menuText}>{t.label}</span>
                    {values[t.key]?.trim() ? <span className={styles.menuSample}>{values[t.key]}</span> : <span className={styles.menuSample} data-empty title={`Prints “[${t.label}]” until it is filled in`}>Empty</span>}
                  </DropdownItem>
                ))}
              </>
            ) : (
              <>
                <div className={styles.menuHead}>Fields from</div>   {/* (Dane UAT 3.19) it read "Insert a record" — a second name under the button's */}
                {TOKEN_GROUPS.map((g) => {
                  const empty = g.tokens.filter((t) => !values[t.key]?.trim()).length
                  return (
                    <DropdownItem key={g.key} submenu onSelect={() => setSmartGroup(g.key)}>
                      <span className={styles.menuText}>{g.label}</span>
                      {empty ? <span className={styles.menuSample} data-empty>{empty} empty</span> : null}
                      <span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span>
                    </DropdownItem>
                  )
                })}
              </>
            )}
          </Dropdown>
        </span>
        <Button variant="secondary" appearance={eSignOpen ? 'filled' : 'text'} isDisabled={disabled} aria-pressed={eSignOpen} iconStart={<Icon name="draw" size={20} />} onPress={onESign}>eSignatures</Button>
      </div>
      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} title="Add link" size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setLinkOpen(false)}>Cancel</Button><Button onPress={() => { setLinkOpen(false); if (url.trim()) editor.current?.link(url.trim()) }} isDisabled={!url.trim()}>Add</Button></>}>
        <TextField label="Link URL" required value={url} onChange={setUrl} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) { e.preventDefault(); setLinkOpen(false); editor.current?.link(url.trim()) } }} />
      </Dialog>
    </div>
  )
}
