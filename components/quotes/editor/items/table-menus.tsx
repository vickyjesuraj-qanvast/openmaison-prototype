'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import type { QuoteItem } from '@/lib/db/schema'
import { ITEM_KINDS, ITEM_KIND_ICON, ITEM_KIND_LABEL, UNITS, VISIBILITIES, VISIBILITY_LABEL, type ItemKind, type RowMenuAction, type Visibility } from '@/lib/quotes/items-model'
import styles from './items-section.module.css'

type Anchor = RefObject<HTMLElement | null>

/**
 * A menu that drills down in place (the thumbnail menu's Use Icon, the row menu's Add / Move / Choose New Group) unmounts
 * the row that had focus, which used to strand keyboard focus on <body> (REG-417). Focus moves onto the new level's first
 * row whenever the level changes — the first open is left to the menu's own policy (components/om/surface.ts).
 */
export function useLevelFocus(level: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    ref.current?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')?.focus({ preventScroll: true })
  }, [level])
  return ref
}

/** Unit picker (1271:40890 "Add Unit Type"): the studio's unit types; "Clear unit" removes. */
export function UnitMenu({ open, anchor, value, onClose, onPick }: { open: boolean; anchor: Anchor; value: string | null; onClose: () => void; onPick: (u: string | null) => void }) {
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={200} sheetTitle="Unit">
      {UNITS.map((u) => <DropdownItem key={u} role="menuitemradio" checked={u === value} onSelect={() => { onClose(); onPick(u) }}>{u}</DropdownItem>)}
      {value ? <><DropdownDivider /><DropdownItem onSelect={() => { onClose(); onPick(null) }}>Clear unit</DropdownItem></> : null}
    </PortalMenu>
  )
}

/** A label picker (Room · Category · Section): the labels in use on this quote plus the ones the studio added; "Clear" removes. */
export function LabelMenu({ open, anchor, options, value, onClose, onPick, addLabel, onAdd, title }: {
  open: boolean; anchor: Anchor; options: string[]; value: string | null; onClose: () => void; onPick: (v: string | null) => void; addLabel: string; onAdd: () => void; title: string
}) {
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={220} sheetTitle={title}>
      {options.map((o) => <DropdownItem key={o} role="menuitemradio" checked={o === value} onSelect={() => { onClose(); onPick(o) }}>{o}</DropdownItem>)}
      {options.length ? <DropdownDivider /> : null}
      <DropdownItem onSelect={() => { onClose(); onAdd() }}><span className={styles.menuIcon}><Icon name="add" size={20} /></span>{addLabel}</DropdownItem>
      {value ? <DropdownItem onSelect={() => { onClose(); onPick(null) }}>Clear</DropdownItem> : null}
    </PortalMenu>
  )
}

/** Client visibility (1271:40931): "Customize visibility for your client" over three radio rows. */
export function VisibilityMenu({ open, anchor, value, onClose, onPick }: { open: boolean; anchor: Anchor; value: Visibility; onClose: () => void; onPick: (v: Visibility) => void }) {
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={280} sheetTitle="Client visibility">
      <div className={styles.menuHead}>Customize visibility for your client</div>
      {VISIBILITIES.map((v) => (
        <DropdownItem key={v} role="menuitemradio" checked={v === value} onSelect={() => { onClose(); onPick(v) }}>
          <span className={styles.menuIcon} data-on={v === value || undefined}><Icon name={v === value ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{VISIBILITY_LABEL[v]}
        </DropdownItem>
      ))}
    </PortalMenu>
  )
}

/**
 * Thumbnail menu (1271:41015): Upload Image › · Use Icon › · Upload Logo. The submenus open in place — the menu drills
 * down and a "‹ Back" row returns (the anchored menu has no side panels).
 */
export function ThumbMenu({ open, anchor, icon, onClose, onUpload, onIcon, onLogo }: {
  open: boolean; anchor: Anchor; icon: ItemKind | null; onClose: () => void; onUpload: () => void; onIcon: (k: ItemKind) => void; onLogo: () => void
}) {
  const [sub, setSub] = useState<'icons' | null>(null)
  const level = useLevelFocus(sub)
  const close = () => { setSub(null); onClose() }
  return (
    <PortalMenu open={open} anchor={anchor} onClose={close} role="menu" width={sub ? 204 : 200} sheetTitle="Image">
      <div ref={level}>
        {sub === 'icons' ? (
          <>
            <DropdownItem onSelect={() => setSub(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>Use Icon</DropdownItem>
            <div className={styles.iconGrid} role="group" aria-label="Icons">
              {ITEM_KINDS.map((k) => (
                <button key={k} type="button" role="menuitemradio" aria-checked={k === icon} className={styles.iconTile} data-on={k === icon || undefined} aria-label={ITEM_KIND_LABEL[k]} title={ITEM_KIND_LABEL[k]}
                        onClick={() => { close(); onIcon(k) }}>
                  <Icon name={ITEM_KIND_ICON[k]} size={24} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DropdownItem onSelect={() => { close(); onUpload() }}>Upload Image<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            <DropdownItem submenu onSelect={() => setSub('icons')}>Use Icon<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            <DropdownItem onSelect={() => { close(); onLogo() }}>Upload Logo</DropdownItem>
          </>
        )}
      </div>
    </PortalMenu>
  )
}

/**
 * The hovered row's kebab (reference screenshot, owner 2026-09-11; Create Document(s) dropped — REG-410):
 * Save to Your Library · Duplicate · Copy Name · Group n Item(s) · ─ · Show Full Content · ─ · Add Item › · Move Item › ·
 * Choose New Group › · ─ · Remove. Submenus drill down in place with a "‹" row back.
 */
export function RowMenu({ open, anchor, item, groups, selectedCount, onClose, onAction, onChooseGroup }: {
  open: boolean; anchor: Anchor; item: QuoteItem; groups: QuoteItem[]; selectedCount: number
  onClose: () => void; onAction: (a: RowMenuAction) => void; onChooseGroup: (groupId: string | null) => void
}) {
  const [sub, setSub] = useState<'add' | 'move' | 'group' | null>(null)
  const level = useLevelFocus(sub)
  const close = () => { setSub(null); onClose() }
  const act = (a: RowMenuAction) => { close(); onAction(a) }
  const isItem = item.kind === 'item'
  const n = Math.max(1, selectedCount)
  const back = (label: string) => <DropdownItem onSelect={() => setSub(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>{label}</DropdownItem>
  return (
    <PortalMenu open={open} anchor={anchor} onClose={close} role="menu" width={240} align="right" sheetTitle={item.name}>
      <div ref={level}>
        {sub === 'add' ? (
          <>
            {back('Add Item')}
            <DropdownItem onSelect={() => act('addAbove')}>Above</DropdownItem>
            <DropdownItem onSelect={() => act('addBelow')}>Below</DropdownItem>
          </>
        ) : sub === 'move' ? (
          <>
            {back('Move Item')}
            <DropdownItem onSelect={() => act('moveUp')}><span className={styles.menuIcon}><Icon name="arrow_upward" size={20} /></span>Up</DropdownItem>
            <DropdownItem onSelect={() => act('moveDown')}><span className={styles.menuIcon}><Icon name="arrow_downward" size={20} /></span>Down</DropdownItem>
          </>
        ) : sub === 'group' ? (
          <>
            {back('Choose New Group')}
            {groups.filter((g) => g.id !== item.id).map((g) => (
              <DropdownItem key={g.id} role="menuitemradio" checked={g.id === item.parentId} onSelect={() => { close(); onChooseGroup(g.id) }}>
                <span className={styles.menuIcon}><Icon name="folder" size={20} /></span>{g.name}
              </DropdownItem>
            ))}
            {item.parentId ? <><DropdownDivider /><DropdownItem onSelect={() => { close(); onChooseGroup(null) }}>No group</DropdownItem></> : null}
            {groups.filter((g) => g.id !== item.id).length === 0 && !item.parentId ? <div className={styles.popEmpty}>No groups yet</div> : null}
          </>
        ) : (
          <>
            {isItem ? <DropdownItem onSelect={() => act('library')}>Save to Your Library</DropdownItem> : null}
            <DropdownItem onSelect={() => act('duplicate')}>Duplicate</DropdownItem>
            <DropdownItem onSelect={() => act('copyName')}>Copy Name</DropdownItem>
            {isItem ? <DropdownItem onSelect={() => act('group')}>Group {n} Item{n === 1 ? '' : 's'}</DropdownItem> : null}
            <DropdownDivider />
            <DropdownItem onSelect={() => act('showFull')}>Show Full Content</DropdownItem>
            <DropdownDivider />
            <DropdownItem submenu onSelect={() => setSub('add')}>Add Item<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            <DropdownItem submenu onSelect={() => setSub('move')}>Move Item<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            {isItem ? <DropdownItem submenu onSelect={() => setSub('group')}>Choose New Group<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem> : null}
            <DropdownDivider />
            <DropdownItem tone="danger" onSelect={() => act('remove')}>Remove</DropdownItem>
          </>
        )}
      </div>
    </PortalMenu>
  )
}
