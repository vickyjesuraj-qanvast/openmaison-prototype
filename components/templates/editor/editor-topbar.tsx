'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { SelectTrigger } from '@/components/om/select-trigger'
import type { TemplateStatus } from '@/lib/templates/model'
import styles from './editor-topbar.module.css'

export type TopbarMenuAction = 'duplicate' | 'match' | 'discard' | 'gallery' | 'start' | 'preview' | 'rename'
export type SourceOption = { key: string; label: string; sub?: string }

/**
 * The template editor's top bar (REG-486): back · the name (typed in place) · status chips · the autosave stamp, then
 * Preview with ▾ · zoom · undo / redo · History · ⋯ · Preview · Publish. 56 tall on the editor surface's white.
 * (REG-542) The icon buttons are 36 (they were 24), "Preview with:" names the source control, the name never shrinks away, the
 * chips clip instead of running under the actions, and ⋯ › Rename template puts the caret in the name for whoever
 * never guessed the title is typed in place.
 */
export function EditorTopbar({ name, onName, status, version, isDefault, hasChanges, savedLabel, saving, pages, source, sources, onSource, zoomLabel, onZoom, canUndo, canRedo, onUndo, onRedo, onHistory, preview, onPreview, onMenu, publishLabel, canPublish, onPublish, onBack, hasReference, compact, originLabel = null, backLabel = 'Back to Quote templates', canStart = false, readOnly = false }: {
  name: string; onName: (v: string) => void
  status: TemplateStatus; version: number; isDefault: boolean; hasChanges: boolean; savedLabel: string; saving: boolean; pages: number
  source: string; sources: SourceOption[]; onSource: (key: string) => void
  zoomLabel: string; onZoom: (d: 'in' | 'out' | 'fit' | '100') => void
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void
  onHistory: () => void; preview: boolean; onPreview: (on: boolean) => void
  /** A view-only editor (phone, awaiting lock): the bar shows the page count with no Exit preview. */
  readOnly?: boolean
  onMenu: (a: TopbarMenuAction) => void; publishLabel: string; canPublish: boolean; onPublish: () => void; onBack: () => void
  hasReference: boolean; compact?: boolean
  /** (REG-495) "Editing for OM-10008 · Vivien Lee" when opened from a quote; Back names where it returns. */
  originLabel?: string | null; backLabel?: string; canStart?: boolean
}) {
  const [menu, setMenu] = useState<'source' | 'more' | 'zoom' | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const commit = () => { if (draft !== null) { if (draft.trim()) onName(draft.trim()); setDraft(null) } }
  return (
    <header className={styles.bar} data-preview={preview || undefined}>
      <Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} size={36} variant="bare" iconSize={24} iconWeight={300} onClick={onBack} /></Tooltip>
      <div className={styles.titleBlock}>
        <input ref={nameRef} className={styles.name} value={draft ?? name} aria-label="Template name" onChange={(e) => setDraft(e.target.value)} onBlur={commit}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur() } if (e.key === 'Escape') { setDraft(null); (e.currentTarget as HTMLInputElement).blur() } }} readOnly={preview} />
        <span className={styles.chips}>
          <MetaChip>{status === 'draft' ? 'Draft' : status === 'archived' ? `Archived · v${version}` : `Published v${version}`}</MetaChip>
          {isDefault ? <MetaChip>Default</MetaChip> : null}
          {status !== 'draft' && hasChanges ? <MetaChip>Edited since v{version}</MetaChip> : null}   {/* (REG-577) the gallery's words */}
          {originLabel ? <span className={styles.originChip} data-testid="origin-chip"><MetaChip icon="request_quote">{originLabel}</MetaChip></span> : null}   {/* (REG-729) the house tag, r4 — it was a pill */}
        </span>
        <span className={styles.saved}>{saving ? <><Icon name="progress_activity" size={16} weight={300} className={styles.spin} /> Saving…</> : <><Icon name="check_circle" size={16} weight={300} className={styles.savedIcon} /> {savedLabel}</>}</span>
      </div>
      {preview ? (
        <div className={styles.actions}>
          <span className={styles.pages}>{pages} page{pages === 1 ? '' : 's'}</span>
          {readOnly ? null : <Button appearance="outlined" variant="secondary" onPress={() => onPreview(false)}>Exit preview</Button>}
        </div>
      ) : (
        <div className={styles.actions}>
          <span className={styles.anchor}>
            {/* (REG-729) The house compact select (m, a toolbar) — its chevron turns while the list is open. */}
            <Tooltip label="The quote drawn on the page while you design" disabled={menu === 'source'}>
              <SelectTrigger className={styles.sourceBtn} open={menu === 'source'} onClick={() => setMenu((m) => (m === 'source' ? null : 'source'))}
                             label={`Preview with ${sources.find((s) => s.key === source)?.label ?? 'Sample quote'}`}
                             value={<span className={styles.sourceValue}><Icon name="request_quote" size={18} weight={300} /><span className={styles.sourceCaption}>Preview with:</span><span className={styles.sourceLabel}>{sources.find((s) => s.key === source)?.label ?? 'Sample quote'}</span></span>} />
            </Tooltip>
            {/* (REG-728) 240: rows with a meta (a long lead's name wraps — the house row grows, REG-531 — rather than being cut); the
                source in use wears the Selected fill. */}
            <Dropdown open={menu === 'source'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} sheetTitle="Preview with">
              {sources.map((s, i) => (
                <div key={s.key}>
                  {i === 2 ? <><DropdownDivider /><div className={styles.sourceNote} role="presentation" data-testid="source-note">Previews only — a quote’s lines are edited in the quote.</div></> : null}   {/* (Dane UAT, Figma 1546:14/30) why a real quote opens here at all (REG-486 · REG-495) */}
                  <DropdownItem role="menuitemradio" checked={s.key === source} selected={s.key === source} onSelect={() => { setMenu(null); onSource(s.key) }} meta={s.sub}>{s.label}</DropdownItem>
                </div>
              ))}
            </Dropdown>
          </span>
          <span className={styles.zoom}>
            <Tooltip label="Zoom out"><IconButton icon="zoom_out" label="Zoom out" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => onZoom('out')} /></Tooltip>
            <span className={styles.anchor}>
              <button type="button" className={styles.zoomLabel} onClick={() => setMenu((m) => (m === 'zoom' ? null : 'zoom'))} aria-haspopup="menu" aria-expanded={menu === 'zoom'} aria-label={`Zoom ${zoomLabel}`}>{zoomLabel}</button>
              {/* (REG-728) the standard 200 */}
              <Dropdown open={menu === 'zoom'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.standard} sheetTitle="Zoom">
                <DropdownItem onSelect={() => { setMenu(null); onZoom('fit') }}>Fit to width</DropdownItem>
                <DropdownItem onSelect={() => { setMenu(null); onZoom('100') }}>Actual size</DropdownItem>
              </Dropdown>
            </span>
            <Tooltip label="Zoom in"><IconButton icon="zoom_in" label="Zoom in" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => onZoom('in')} /></Tooltip>
          </span>
          <span className={styles.rule} />
          <Tooltip label="Undo" keys="mod+z"><IconButton icon="undo" label="Undo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!canUndo} onClick={onUndo} /></Tooltip>
          <Tooltip label="Redo" keys="mod+shift+z"><IconButton icon="redo" label="Redo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!canRedo} onClick={onRedo} /></Tooltip>
          <Tooltip label="History"><IconButton icon="history" label="History" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onHistory} /></Tooltip>
          <span className={styles.anchor}>
            <Tooltip label="More options" disabled={menu === 'more'}><IconButton icon="more_vert" label="More options" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={menu === 'more'} onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))} /></Tooltip>
            {/* (REG-728) 240: a locked row's rule, a key hint */}
            <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} sheetTitle="Template">
              <DropdownItem onSelect={() => { setMenu(null); onMenu('rename'); setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select() }, 120) }}>Rename template</DropdownItem>   {/* after the menu hands focus back to its button */}
              <DropdownItem onSelect={() => { setMenu(null); onMenu('duplicate') }}>Duplicate template</DropdownItem>
              <DropdownItem onSelect={() => { setMenu(null); onMenu('match') }}>{hasReference ? 'Upload another existing quote' : 'Upload my existing quote to match'}</DropdownItem>
              <DropdownItem onSelect={() => { setMenu(null); onMenu('start') }} disabled={!canStart} title={canStart ? undefined : 'Publish it first'}>Start a quote with this template</DropdownItem>
              <DropdownItem onSelect={() => { setMenu(null); onMenu('gallery') }}>All quote templates</DropdownItem>
              <DropdownDivider />
              {compact ? <DropdownItem onSelect={() => { setMenu(null); onMenu('preview') }} shortcut="preview">Preview</DropdownItem> : null}
              <DropdownItem tone="danger" onSelect={() => { setMenu(null); onMenu('discard') }}>{status === 'draft' ? 'Delete this draft' : `Discard the edits since v${version}`}</DropdownItem>
            </Dropdown>
          </span>
          {!compact ? <span className={styles.rule} /> : null}
          {!compact ? <Tooltip label="Preview" shortcut="preview"><Button appearance="outlined" variant="secondary" onPress={() => onPreview(true)} data-kb="preview">Preview</Button></Tooltip> : null}
          <Button onPress={onPublish} isDisabled={!canPublish}>{publishLabel}</Button>
        </div>
      )}
    </header>
  )
}
