'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './pane-toolbar.module.css'

/** The commands the format buttons fire — `document.execCommand` names, acting on the rich body's selection. */
export type FormatCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'

export type PaneToolbarProps = {
  /** attach_file_add → the files library (the Tasks Attach files modal). */
  onAttach: () => void
  /** AI chip menu › "Refine" — answers coming soon in the parent. */
  onRefine: () => void
  /** Bold / italic / underline / lists (REG-252) — the parent runs the command on the focused editor. */
  onFormat: (cmd: FormatCommand) => void
  /** True while no body is editable (a contact log before Edit): the format buttons show disabled (REG-254). */
  formattingDisabled?: boolean
  /** The bar's right end — Edit, or Cancel · Save (REG-254). */
  end?: ReactNode
}

/** Toolbar icon buttons in the mock's order (931:44905): name · weight (Regular = 400, Light = 300) · tooltip. */
type ToolIcon = { name: string; weight: 300 | 400; label: string; cmd: FormatCommand }
const FORMAT_A: ToolIcon[] = [
  { name: 'format_bold', weight: 400, label: 'Bold', cmd: 'bold' },
  { name: 'format_italic', weight: 300, label: 'Italic', cmd: 'italic' },
  { name: 'format_underlined', weight: 300, label: 'Underline', cmd: 'underline' },
]
const FORMAT_B: ToolIcon[] = [
  { name: 'format_list_bulleted', weight: 300, label: 'Bulleted list', cmd: 'insertUnorderedList' },
  { name: 'format_list_numbered', weight: 300, label: 'Numbered list', cmd: 'insertOrderedList' },
]

/**
 * Lead Details › Notes — pane toolbar (931:44905, 884×68, H g16 p16/24, bottom rule; spec design-source/context/lead-notes/
 * 01-layout-list-editor.txt): format_bold 24/Regular · format_italic 24/Light · format_underlined 24/Light · rule 1×36 ·
 * format_list_bulleted · format_list_numbered · rule · attach_file_add · rule · AI chip 47×28 (p4 g2: 17×17 gradient
 * rounded square + keyboard_arrow_down 20 #666666; menu 931:45010 140×46 "Refine").
 * Every icon is a bare 24px icon button (components/om/drawer.tsx DrawerAction / .iconBtn) under a Tooltip (REG-75);
 * the text-format buttons and Refine answer "Coming soon in OpenMaison 2.0"; the chip menu toggles on its own trigger
 * (REG-153) and its chevron points up while open (contracts-toolbar.module.css .chev). Tooltip labels are the icons'
 * Material names in plain words (no tooltip copy is mocked).
 */
export function PaneToolbar({ onAttach, onRefine, onFormat, formattingDisabled, end }: PaneToolbarProps) {
  const [aiOpen, setAiOpen] = useState(false)

  /* The buttons mirror the selection (REG-260, user 2026-09-01: "the B should be active for the fonts that i
     made it bold"): queryCommandState — execCommand's reader twin — on every selection change, and again right
     after a command. State only commits when a bit actually flipped, so caret movement doesn't re-render. */
  const [active, setActive] = useState<Partial<Record<FormatCommand, boolean>>>({})
  const readActive = useCallback(() => {
    const next: Partial<Record<FormatCommand, boolean>> = {}
    for (const t of [...FORMAT_A, ...FORMAT_B]) {
      try { next[t.cmd] = document.queryCommandState(t.cmd) } catch { next[t.cmd] = false }
    }
    setActive((prev) => ([...FORMAT_A, ...FORMAT_B].every((t) => !!prev[t.cmd] === !!next[t.cmd]) ? prev : next))
  }, [])
  useEffect(() => {
    // Subscription only (no setState in the effect body): mount state is all-false, which is true of a fresh
    // caret; render ignores `active` entirely while formatting is disabled, so no clearing is needed either.
    if (formattingDisabled) return
    document.addEventListener('selectionchange', readActive)
    return () => document.removeEventListener('selectionchange', readActive)
  }, [formattingDisabled, readActive])

  const tool = (t: Omit<ToolIcon, 'cmd'>, onClick: () => void, disabled = false, pressed?: boolean) => (
    <Tooltip key={t.name} label={t.label} disabled={disabled}>
      {/* mousedown is swallowed so the editor keeps focus AND selection — the command lands on it (REG-252). */}
      <button type="button" className={styles.iconBtn} aria-label={t.label} disabled={disabled} aria-pressed={pressed}
              onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
        <Icon name={t.name} size={24} weight={t.weight} />
      </button>
    </Tooltip>
  )
  const formatTool = (t: ToolIcon) =>
    tool(t, () => { onFormat(t.cmd); readActive() }, formattingDisabled, !formattingDisabled && !!active[t.cmd])

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Note tools">
      {FORMAT_A.map(formatTool)}
      <span className={styles.rule} role="separator" />
      {FORMAT_B.map(formatTool)}
      <span className={styles.rule} role="separator" />
      {tool({ name: 'attach_file_add', weight: 300, label: 'Attach file' }, onAttach)}
      <span className={styles.rule} role="separator" />
      <span className={styles.menuWrap}>
        <Tooltip label="Maison AI" disabled={aiOpen}>
          <button
            type="button" className={styles.aiChip}
            aria-label="Maison AI" aria-haspopup="menu" aria-expanded={aiOpen}
            onClick={() => setAiOpen((o) => !o)}
          >
            {/* The Maison AI mark — the FAB's own sparkle, as the AI sheet (REG-249/255), not the gradient disc. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/brief-sparkle.svg" width={17} height={17} alt="" className={styles.aiMark} />
            <span className={styles.chev} data-open={aiOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
        </Tooltip>
        {/* The bar sits at the pane's foot (REG-254), so the menu opens upward — downward it fell out of view (REG-255). */}
        <Dropdown open={aiOpen} onClose={() => setAiOpen(false)} align="left" width={140} side="up">
          <DropdownItem onSelect={() => { setAiOpen(false); onRefine() }}>Refine</DropdownItem>
        </Dropdown>
      </span>
      {end ? <span className={styles.end}>{end}</span> : null}
    </div>
  )
}
