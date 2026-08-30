'use client'

import { useState } from 'react'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import styles from './pane-toolbar.module.css'

export type PaneToolbarProps = {
  /** attach_file_add → the files library (the Tasks Attach files modal). */
  onAttach: () => void
  /** AI chip menu › "Refine" — answers coming soon in the parent. */
  onRefine: () => void
}

/** Toolbar icon buttons in the mock's order (931:44905): name · weight (Regular = 400, Light = 300) · tooltip. */
type ToolIcon = { name: string; weight: 300 | 400; label: string }
const FORMAT_A: ToolIcon[] = [
  { name: 'format_bold', weight: 400, label: 'Bold' },
  { name: 'format_italic', weight: 300, label: 'Italic' },
  { name: 'format_underlined', weight: 300, label: 'Underline' },
]
const FORMAT_B: ToolIcon[] = [
  { name: 'format_list_bulleted', weight: 300, label: 'Bulleted list' },
  { name: 'format_list_numbered', weight: 300, label: 'Numbered list' },
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
export function PaneToolbar({ onAttach, onRefine }: PaneToolbarProps) {
  const comingSoon = useComingSoon()
  const [aiOpen, setAiOpen] = useState(false)

  const tool = (t: ToolIcon, onClick: () => void) => (
    <Tooltip key={t.name} label={t.label}>
      <button type="button" className={styles.iconBtn} aria-label={t.label} onClick={onClick}>
        <Icon name={t.name} size={24} weight={t.weight} />
      </button>
    </Tooltip>
  )

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Note tools">
      {FORMAT_A.map((t) => tool(t, comingSoon))}
      <span className={styles.rule} role="separator" />
      {FORMAT_B.map((t) => tool(t, comingSoon))}
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
            <span className={styles.aiSquare} aria-hidden />
            <span className={styles.chev} data-open={aiOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
        </Tooltip>
        <Dropdown open={aiOpen} onClose={() => setAiOpen(false)} align="left" width={140}>
          <DropdownItem onSelect={() => { setAiOpen(false); onRefine() }}>Refine</DropdownItem>
        </Dropdown>
      </span>
    </div>
  )
}
