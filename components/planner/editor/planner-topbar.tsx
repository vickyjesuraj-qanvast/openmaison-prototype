'use client'

import type { ReactNode } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import bar from '@/components/visualizer/editor/topbar.module.css'
import styles from './planner-topbar.module.css'

export type View = 'top' | '3d' | 'walk'
export const VIEWS: { key: View; label: string; keys: string }[] = [{ key: 'top', label: 'Top', keys: '1' }, { key: '3d', label: '3D', keys: '2' }, { key: 'walk', label: 'Walk', keys: '3' }]

/** The view switch — the bar's on a desktop, floating on the stage ≤767. */
export function ViewSwitch({ view, onView, className }: { view: View; onView: (v: View) => void; className?: string }) {
  return (
    <span className={className} data-testid="planner-views">
      <SegmentedButton aria-label="View" selectedKeys={[view]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'top' || v === '3d' || v === 'walk') onView(v) }}>
        {VIEWS.map((v) => <SegmentedButtonItem key={v.key} id={v.key}>{v.label}</SegmentedButtonItem>)}
      </SegmentedButton>
    </span>
  )
}

/**
 * (parity map, TD-081 · TD-092 · TD-098) The one View ▾ beside the view switch — Isometric, the Ruler, Furniture and Dimensions on / off,
 * and Present — so the bar never grows a toggle per option (1.0's Walls · Dims · Ruler · 2D · Furniture row). `on` marks it while any of
 * them is away from its usual state.
 */
export function ViewMenuButton({ onOpen, open, on, compact = false }: { onOpen: (el: HTMLElement) => void; open: boolean; on: boolean; compact?: boolean }) {
  return compact ? (
    <Tooltip label="View options" disabled={open}><IconButton icon="visibility" label="View options" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={open} onClick={(e) => onOpen(e.currentTarget)} data-testid="planner-view-menu" data-on={on || undefined} /></Tooltip>
  ) : (
    <Button variant="secondary" appearance="text" onPress={(e) => onOpen(e.target as HTMLElement)} iconEnd={<Icon name="arrow_drop_down" size={20} />} aria-haspopup="menu" aria-expanded={open} data-testid="planner-view-menu" data-on={on || undefined}>View</Button>
  )
}

/**
 * (gaps build J, J-Q2 · J-Q14) The planner editor's bar — the AI Visualizer's 56 bar (its own stylesheet, REG-673): back · the layout's
 * name and whose it is (the project's number and name, or Personal — 1.0's F-266 never showed the project) · the view switch · the save
 * stamp · Undo / Redo · Share with client · the layout's ⋮.
 * (the calm UI build 2026-10-27, 6-16 · 6-08 · W-369 — T-03, T-06) Share is outlined at every width (the editor's filled button is no state:
 * "Shared with client" on a filled button read as a step not done) and, once shared, a quiet "Shared 17 Oct" beside it; whose it is (the
 * project's number and the client, a lead, the studio's own) is the title's tooltip and the Back's words, not a chip that cut the title —
 * a template keeps its chip, a state it is in (it never shares).
 */
export function PlannerTopbar({ backLabel, onBack, title, chip, whose = null, sharedOn = null, view, onView, compact, tight = false, saving, savedLabel, savedTone, canUndo, canRedo, onUndo, onRedo, onShare, shareBlock, shared, onMenu, menuOpen, viewButton }: {
  backLabel: string; onBack: () => void
  title: string; chip: string | null
  /** (the calm UI build, 6-16) whose it is — "P-2026-002 · Benjamin Han", said in the title's tooltip */ whose?: string | null
  /** (the calm UI build, W-369) the day the client's copy was last shared — "Shared 17 Oct" beside Share */ sharedOn?: string | null
  view: View; onView: (v: View) => void
  compact: boolean
  /** (pending modules S28, found) ≤1024 with the switch still in the bar: Share's short word, so the switch and View keep clear of Undo */ tight?: boolean
  saving: boolean; savedLabel: string | null; savedTone: 'ok' | 'warn'
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void
  onShare: () => void; shareBlock: string | null; shared: boolean
  onMenu: (el: HTMLElement) => void; menuOpen: boolean
  /** (parity map, TD-081) the View ▾ after the switch */ viewButton?: ReactNode
}) {
  const saved = saving ? <><Icon name="progress_activity" size={16} weight={300} className={bar.spin} /> Saving…</>
    : savedLabel ? <><Icon name={savedTone === 'warn' ? 'error' : 'check_circle'} size={16} weight={300} className={savedTone === 'warn' ? bar.warnIcon : bar.savedIcon} /> {savedLabel}</> : null
  return (
    <header className={bar.bar} data-compact={compact || undefined} data-testid="planner-topbar">
      <Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} size={36} variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-testid="planner-back" /></Tooltip>
      <div className={bar.titles}>
        <Tooltip label={whose ? `${title} · ${whose}` : title}><h1 className={bar.title}>{title}</h1></Tooltip>
        {chip ? <span className={bar.whose}><MetaChip>{chip}</MetaChip></span> : null}
      </div>
      <div className={styles.middle}>{!compact ? <><ViewSwitch view={view} onView={onView} />{viewButton}</> : null}</div>
      <div className={bar.end}>
        <span className={bar.saved} data-tone={savedTone} aria-live="polite" data-testid="planner-saved">{saved}</span>
        {!compact ? (
          <>
            <Tooltip label="Undo" keys="mod+z"><IconButton icon="undo" label="Undo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!canUndo} onClick={onUndo} data-testid="planner-undo" /></Tooltip>
            <Tooltip label="Redo" keys="mod+shift+z"><IconButton icon="redo" label="Redo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!canRedo} onClick={onRedo} data-testid="planner-redo" /></Tooltip>
            <span className={bar.rule} />
          </>
        ) : null}
        {shared && sharedOn && !compact && !tight ? <span className={styles.sharedOn} data-testid="planner-shared-on">{`Shared ${sharedOn}`}</span> : null}
        <Tooltip label={shareBlock ?? (shared ? `The client’s link${sharedOn ? `, shared ${sharedOn}` : ''} — share your changes, copy it, or stop sharing` : 'Send the client a link to walk through this layout')}>
          <span>
            <Button variant="secondary" appearance="outlined" onPress={onShare} isDisabled={!!shareBlock} iconStart={<Icon name={shared ? 'link' : 'send'} size={20} weight={300} />} className={bar.share} aria-label={shared ? 'Shared with client' : 'Share with client'} data-testid="planner-share">
              {compact || tight || shared ? 'Share' : 'Share with client'}
            </Button>
          </span>
        </Tooltip>
        <Tooltip label="More options" disabled={menuOpen}><IconButton icon="more_vert" label="Layout options" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenu(e.currentTarget)} data-testid="planner-menu" /></Tooltip>
      </div>
    </header>
  )
}
