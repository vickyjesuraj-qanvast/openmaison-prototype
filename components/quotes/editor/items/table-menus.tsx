'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { SearchBar } from '@/components/ds'
import { CountStepper } from '@/components/om/count-stepper'
import field from '@/components/om/text-field.module.css'
import { BOOK_RULE, SECTION_RULE } from '@/lib/company/price-book-rules'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import type { QuoteItem } from '@/lib/db/schema'
import { HIGHLIGHTS, HIGHLIGHT_LABEL, isHighlight, isPrintAs, ITEM_KINDS, ITEM_KIND_ICON, ITEM_KIND_LABEL, PRINT_AS, PRINT_AS_HELP, PRINT_AS_LABEL, printAsWord, VISIBILITIES, VISIBILITY_LABEL, type Highlight, type ItemKind, type PrintAs, type RowMenuAction, type Visibility } from '@/lib/quotes/items-model'
import { ancestorIds, GROUP_DEPTH_RULE, groupLevel } from '@/lib/quotes/math'
import { useVariation } from './variation-context'   // (S44T — call C1) a variation order has no work priced after the contract
import styles from './items-section.module.css'

type Anchor = RefObject<HTMLElement | null>

/**
 * A menu that drills down in place (the thumbnail menu's Use Icon, the row menu's Add / Move / Move to section) unmounts
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

/** Unit picker (1271:40890 "Add Unit Type"): the studio's unit types; "Clear unit" removes.
    (S44I — M9, UAT rows 350 · 325; as recommended, his ask 2026-10-15) The studio's OWN units (Settings › Quotes & pricing › Units, seeded with
    the seven it always had) and the units this quote's lines already carry. The menu opens on every unit and narrows as you type (the vendor
    menu's search box); a unit nobody listed is *Use “…”* — this line takes it, as a pasted unit always could. ↓ from the box steps into the
    rows, Enter takes the first match. */
export function UnitMenu({ open, anchor, value, units, onClose, onPick }: { open: boolean; anchor: Anchor; value: string | null; units: readonly string[]; onClose: () => void; onPick: (u: string | null) => void }) {
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setQuery('') }   // every opening starts with an empty box (render-phase adjust)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const r = requestAnimationFrame(() => box.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(r)
  }, [open])
  const typed = query.trim()
  const list = [...new Map([...units, ...(value ? [value] : [])].map((u) => [u.toLowerCase(), u] as const)).values()]
  const matches = typed ? list.filter((u) => u.toLowerCase().includes(typed.toLowerCase())) : list
  const exact = typed ? list.find((u) => u.toLowerCase() === typed.toLowerCase()) : undefined
  const take = (u: string | null) => { onClose(); onPick(u) }
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); box.current?.parentElement?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')?.focus(); return }
    if (e.key === 'Home' || e.key === 'End') e.nativeEvent.stopImmediatePropagation()   // the caret's, not the menu's walk
  }
  const submit = () => { if (exact) take(exact); else if (matches[0]) take(matches[0]); else if (typed) take(typed.slice(0, 40)) }
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={MENU_WIDTH.wide} sheetTitle="Unit" autoFocus={false}>
      <div ref={box} className={field.menuSearch} data-testid="unit-search">
        <SearchBar size="md" appearance="filled" placeholder="Search or type a unit" aria-label="Search units" value={query} onChange={setQuery} onKeyDown={onSearchKey} onSubmit={submit} />
      </div>
      {matches.map((u) => <DropdownItem key={u} role="menuitemradio" checked={u === value} onSelect={() => take(u)}>{u}</DropdownItem>)}
      {typed && !exact ? <DropdownItem onSelect={() => take(typed.slice(0, 40))} help="For this line — your units are in Settings › Quotes & pricing"><span className={styles.menuIcon}><Icon name="add" size={20} /></span>{`Use “${typed.slice(0, 40)}”`}</DropdownItem> : null}
      {value ? <><DropdownDivider /><DropdownItem onSelect={() => take(null)}>Clear unit</DropdownItem></> : null}
    </PortalMenu>
  )
}

/** A label picker (Room · Category · Section): the labels in use on this quote plus the ones the studio added; "Clear" removes. */
export function LabelMenu({ open, anchor, options, value, onClose, onPick, addLabel, onAdd, title }: {
  open: boolean; anchor: Anchor; options: string[]; value: string | null; onClose: () => void; onPick: (v: string | null) => void; addLabel: string; onAdd: () => void; title: string
}) {
  /* (REG-728) the standard 200 */
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={MENU_WIDTH.standard} sheetTitle={title}>
      {options.map((o) => <DropdownItem key={o} role="menuitemradio" checked={o === value} onSelect={() => { onClose(); onPick(o) }}>{o}</DropdownItem>)}
      {options.length ? <DropdownDivider /> : null}
      <DropdownItem onSelect={() => { onClose(); onAdd() }}><span className={styles.menuIcon}><Icon name="add" size={20} /></span>{addLabel}</DropdownItem>
      {value ? <DropdownItem onSelect={() => { onClose(); onPick(null) }}>Clear</DropdownItem> : null}
    </PortalMenu>
  )
}

/** Client visibility (1271:40931): "Customize visibility for your client" over three radio rows. (REG-728) 240 on the scale, the
 *  instruction line in the menus' one style. */
export function VisibilityMenu({ open, anchor, value, onClose, onPick }: { open: boolean; anchor: Anchor; value: Visibility; onClose: () => void; onPick: (v: Visibility) => void }) {
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={MENU_WIDTH.wide} sheetTitle="Client visibility">
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
 * Thumbnail menu (1271:41015): Upload Image › · Use Icon ›. The submenus open in place — the menu drills down and a "‹ Back" row returns (the
 * anchored menu has no side panels). (pending modules S04 — card held:quotes, "Upload Logo … Coming soon · 1.0 had neither · revisit: drop or
 * define") The mock's third row, Upload Logo, is dropped: a line's picture is Upload Image's, and nothing in 1.0 or 2.0 gave a line a logo.
 */
export function ThumbMenu({ open, anchor, icon, onClose, onUpload, onIcon }: {
  open: boolean; anchor: Anchor; icon: ItemKind | null; onClose: () => void; onUpload: () => void; onIcon: (k: ItemKind) => void
}) {
  const [sub, setSub] = useState<'icons' | null>(null)
  const level = useLevelFocus(sub)
  const close = () => { setSub(null); onClose() }
  /* (REG-728) One width for both levels: the icon grid (3 × 52 + 2 × 8 + 24 = 196) fits the standard 200. */
  return (
    <PortalMenu open={open} anchor={anchor} onClose={close} role="menu" width={MENU_WIDTH.standard} sheetTitle="Image">
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
          </>
        )}
      </div>
    </PortalMenu>
  )
}

/**
 * The hovered row's kebab (reference screenshot, owner 2026-09-11; Create Document(s) dropped — REG-410):
 * Save to My Items (REG-653: or, on a line from an item, Update the item from this line · Save as a new item) · Duplicate · Copy Name · Section with n item(s) · ─ · Show Full Content · Mark as Optional · Print as › ·
 * Highlight › · Skip the number · ─ · Add Item › · Move Item › · Move to section › · ─ · Remove. A section's row trades the line-only
 * rows for Save section to My Sections · Label the sub-total… · Ungroup. Submenus drill down in place with a "‹" row back.
 * (Round 1 of the testers' asks: Print as REG-555 · Highlight REG-556 · Skip the number / Ungroup / sub-sections REG-558 ·
 * Save section REG-566 · "Section" for the mock's "Group" REG-567.)
 */
/** (REG-652, price book parity Q-03) Whether the viewer changes the price book — the row menu's saves read it. (REG-653, Q-09) And the
    My Items entry a line came from, while it is still in the book. */
export const BookRuleContext = createContext<{ runsBook: boolean; bookItem: (id: string | null) => { name: string } | null }>({ runsBook: true, bookItem: () => null })
/** (S44I, B8) The ticked rows — the row menu's *Section with n items* reads what it would make of them. */
export const SelectedContext = createContext<ReadonlySet<string>>(new Set())
export function RowMenu({ open, anchor, item, groups, all, selectedCount, brandColors, onClose, onAction, onChooseGroup, onPrintAs, onHighlight, onAddSeveral }: {
  open: boolean; anchor: Anchor; item: QuoteItem; groups: QuoteItem[]; all: QuoteItem[]; selectedCount: number
  /** The brand kit's colours by key — the Highlight swatches follow the kit (REG-556). */
  brandColors: Record<string, string>
  onClose: () => void; onAction: (a: RowMenuAction) => void; onChooseGroup: (groupId: string | null) => void
  onPrintAs: (v: PrintAs | null) => void; onHighlight: (v: Highlight | null) => void
  /** (S44I, B5) Add Item › Several…: n blank lines above or below (a section: at its top). */
  onAddSeveral: (n: number, where: 'above' | 'below') => void
}) {
  const bookRule = useContext(BookRuleContext)
  const variation = !!useVariation()
  const sectionsLocked = usePlanLock('package_creation').locked   // (pending modules S19) My Sections are Pro
  const [sub, setSub] = useState<'add' | 'several' | 'move' | 'group' | 'printAs' | 'highlight' | null>(null)
  const [several, setSeveral] = useState(5)
  const level = useLevelFocus(sub)
  const close = () => { setSub(null); setSeveral(5); onClose() }
  const act = (a: RowMenuAction) => { close(); onAction(a) }
  const isItem = item.kind === 'item'
  const source = isItem ? bookRule.bookItem(item.priceBookItemId) : null
  const n = Math.max(1, selectedCount)
  const hasSubs = !isItem && all.some((x) => x.parentId === item.id && x.kind === 'group')
  /* Where the row may move: a line into any section (a sub-section shown under its parent); a section without sub-sections into a top section.
     (S44T — call C1, S44I) a section priced after the contract stays at the top. */
  const marked = !isItem && !item.parentId && !!item.pricedAfter
  const targets = groups.filter((g) => g.id !== item.id && (isItem || (!g.parentId && !hasSubs && g.parentId !== item.id))).filter((g) => isItem || !ancestorIds(all, g.id).includes(item.id))
  const canMove = isItem || (!hasSubs && !marked)
  const nameOf = (id: string | null) => (id ? all.find((x) => x.id === id)?.name ?? '' : '')
  /* (S44I, B8) what *Section with n items* makes of the ticked lines (or this one): a section, a sub-section, or the rule that refuses */
  const ticked = useContext(SelectedContext)
  const groupList = ticked.has(item.id) && ticked.size > 1 ? [...ticked] : [item.id]
  const lvl = groupLevel(all, groupList)
  const top = !isItem && !item.parentId
  /* (S44I — M17) a section prints a word for all its lines — every word but On behalf, which is a line's (the amount prints and counts) */
  const printChoices = isItem ? PRINT_AS : PRINT_AS.filter((v) => v !== 'behalf')
  const back = (label: string) => <DropdownItem onSelect={() => setSub(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>{label}</DropdownItem>
  const printAs = isPrintAs(item.printAs) ? item.printAs : null
  const highlight = isHighlight(item.highlight) ? item.highlight : null
  /* (REG-728) The scale's two widths: 240 for the row menu (key hints, a locked save's rule under it), 320 for Print as — its rows carry a
     description. A section or a highlight picked wears the Selected fill: those rows lead with a glyph, so `checked` alone drew nothing. */
  return (
    <PortalMenu open={open} anchor={anchor} onClose={close} role="menu" width={sub === 'printAs' ? MENU_WIDTH.detail : MENU_WIDTH.wide} align="right" sheetTitle={item.name}>
      <div ref={level}>
        {sub === 'add' ? (
          <>
            {back('Add Item')}
            <DropdownItem onSelect={() => act('addAbove')}>Above</DropdownItem>
            {/* (S44I, B5) on a section, Below has always meant its first place — said so */}
            <DropdownItem onSelect={() => act('addBelow')}>{isItem ? 'Below' : 'At the top of the section'}</DropdownItem>
            <DropdownItem submenu onSelect={() => setSub('several')}>Several…<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            {top ? <DropdownItem onSelect={() => act('addSub')}>Add sub-section</DropdownItem> : null}   {/* (S44I, B3) the way to start a sub-section in a section */}
            <DropdownDivider />
            {/* (S44I, B6 · B7) the Price book modal and Paste lines, landing where this row asks */}
            <DropdownItem onSelect={() => act('addFromBookHere')}>From Price book…</DropdownItem>
            <DropdownItem onSelect={() => act('pasteHere')}>Paste lines…</DropdownItem>
          </>
        ) : sub === 'several' ? (
          <>
            {back('Several lines')}
            {/* (S44I, B5 — the team's sections prototype) 2 to 50 blank lines in one go, each ready to name */}
            <div className={styles.menuStepper} data-testid="several-stepper" data-menu-label="">   {/* data-menu-label: a sheet gives it its rows' gutter */}
              <span>Lines</span>
              <CountStepper value={several} min={2} max={50} onChange={setSeveral} less="Fewer lines" more="More lines" />
            </div>
            <DropdownItem onSelect={() => { const k = several; close(); onAddSeveral(k, 'above') }}>{`Add ${several} above`}</DropdownItem>
            <DropdownItem onSelect={() => { const k = several; close(); onAddSeveral(k, 'below') }}>{isItem ? `Add ${several} below` : `Add ${several} at the top`}</DropdownItem>
          </>
        ) : sub === 'move' ? (
          <>
            {back('Move Item')}
            <DropdownItem onSelect={() => act('moveUp')}><span className={styles.menuIcon}><Icon name="arrow_upward" size={20} /></span>Up</DropdownItem>
            <DropdownItem onSelect={() => act('moveDown')}><span className={styles.menuIcon}><Icon name="arrow_downward" size={20} /></span>Down</DropdownItem>
          </>
        ) : sub === 'group' ? (
          <>
            {back('Move to section')}
            {targets.map((g) => (
              <DropdownItem key={g.id} role="menuitemradio" checked={g.id === item.parentId} selected={g.id === item.parentId} help={g.parentId ? `in ${nameOf(g.parentId)}` : undefined} onSelect={() => { close(); onChooseGroup(g.id) }}>   {/* (S44I, B9) a sub-section names its section */}
                <span className={styles.menuIcon} data-sub={g.parentId ? '' : undefined}><Icon name="folder" size={20} weight={g.parentId ? 300 : 400} /></span>{g.name}
              </DropdownItem>
            ))}
            {item.parentId ? <><DropdownDivider /><DropdownItem onSelect={() => { close(); onChooseGroup(null) }}>No section</DropdownItem></> : null}
            {targets.length === 0 && !item.parentId ? <div className={styles.menuHead}>No sections yet</div> : null}   {/* (REG-728) the menus' one note line, on the rows' 12 */}
          </>
        ) : sub === 'printAs' ? (
          <>
            {back('Print as')}
            <div className={styles.menuHead}>{isItem ? 'What the client reads in place of the amount' : 'What the client reads in place of the section’s amount — its lines print none'}</div>
            <DropdownItem role="menuitemradio" checked={!printAs} onSelect={() => { close(); onPrintAs(null) }}>
              <span className={styles.menuIcon} data-on={!printAs || undefined}><Icon name={!printAs ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>
              <span className={styles.menuText}><span>The price</span><span className={styles.menuHelp}>The amount prints and counts</span></span>
            </DropdownItem>
            {printChoices.map((v) => (
              <DropdownItem key={v} role="menuitemradio" checked={printAs === v} onSelect={() => { close(); onPrintAs(v) }}>
                <span className={styles.menuIcon} data-on={printAs === v || undefined}><Icon name={printAs === v ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>
                <span className={styles.menuText}><span>{v === 'custom' && printAs === 'custom' && item.printAsText ? `Custom word — ${item.printAsText}` : PRINT_AS_LABEL[v]}</span><span className={styles.menuHelp}>{PRINT_AS_HELP[v]}</span></span>
              </DropdownItem>
            ))}
          </>
        ) : sub === 'highlight' ? (
          <>
            {back('Highlight')}
            <DropdownItem role="menuitemradio" checked={!highlight} selected={!highlight} onSelect={() => { close(); onHighlight(null) }}>
              <span className={styles.menuIcon}><span className={styles.swatch} data-none="" /></span>None
            </DropdownItem>
            {HIGHLIGHTS.map((k) => (
              <DropdownItem key={k} role="menuitemradio" checked={highlight === k} selected={highlight === k} onSelect={() => { close(); onHighlight(k) }}>
                <span className={styles.menuIcon}><span className={styles.swatch} style={{ background: brandColors[k] }} /></span>{HIGHLIGHT_LABEL[k]}
              </DropdownItem>
            ))}
          </>
        ) : (
          <>
            {/* (REG-653, price book parity Q-09 · Q-18) A line from My Items says so, and its save names what it does — update that item
                (an Owner's or an Admin's) or add a new one; a Designer proposes. One name for the book: My Items, My Sections. */}
            {source ? <div className={styles.menuHead} data-testid="line-source">From My Items · {source.name}</div> : null}
            {source ? <DropdownItem onSelect={() => act('libraryUpdate')} disabled={!bookRule.runsBook} title={bookRule.runsBook ? undefined : BOOK_RULE}>Update the item from this line</DropdownItem> : null}
            {isItem ? <DropdownItem onSelect={() => act('library')}>{source ? (bookRule.runsBook ? 'Save as a new item' : 'Propose as a new item') : bookRule.runsBook ? 'Save to My Items' : 'Propose to My Items'}</DropdownItem>
              : <DropdownItem onSelect={() => act('saveSection')} disabled={!bookRule.runsBook} title={bookRule.runsBook ? undefined : SECTION_RULE} meta={sectionsLocked && bookRule.runsBook ? <ProTag /> : undefined}>Save section to My Sections</DropdownItem>}
            <DropdownItem onSelect={() => act('duplicate')}>Duplicate</DropdownItem>
            <DropdownItem onSelect={() => act('copyName')}>Copy Name</DropdownItem>
            {/* (S44I, B8) says what it makes — a sub-section in the one section the lines share — and, refused, why (in the row) */}
            {isItem ? <DropdownItem onSelect={() => act('group')} disabled={typeof lvl === 'object'} title={typeof lvl === 'object' ? GROUP_DEPTH_RULE : undefined}>{lvl === 'sub-section' ? 'Sub-section' : 'Section'} with {n} item{n === 1 ? '' : 's'}</DropdownItem> : null}
            <DropdownDivider />
            {/* (S44I — call C2 · the triage's §12.6) the line's words — its name and description — or the section's note, in their dialog */}
            <DropdownItem onSelect={() => act('description')}>{isItem ? 'Words on this line…' : 'Section note…'}</DropdownItem>
            <DropdownItem onSelect={() => act('showFull')}>Show Full Content</DropdownItem>
            {isItem ? <DropdownItem onSelect={() => act('comment')}>Comment</DropdownItem> : null}   {/* (REG-627, parity Q-30) the line's thread */}
            {isItem ? <DropdownItem onSelect={() => act('optional')}>{item.optional ? 'Clear Optional Mark' : 'Mark as Optional'}</DropdownItem> : null}   {/* (REG-492) prints in its own section, out of the totals */}
            {/* (S44I — M17, UAT row 323) a section prints a word too, its lines no amounts */}
            <DropdownItem submenu onSelect={() => setSub('printAs')}>Print as{printAs ? `: ${printAsWord(item)}` : ''}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            <DropdownItem submenu onSelect={() => setSub('highlight')}>Highlight{highlight ? `: ${HIGHLIGHT_LABEL[highlight]}` : ''}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            {isItem ? <DropdownItem onSelect={() => act('noNumber')}>{item.noNumber ? 'Number this line' : 'Skip the number'}</DropdownItem> : null}
            {!isItem ? <DropdownItem onSelect={() => act('subtotalLabel')}>{item.printAsText ? `Sub-total label: ${item.printAsText}` : 'Label the sub-total…'}</DropdownItem> : null}
            {!isItem && item.printAsText ? <DropdownItem onSelect={() => act('subtotalClear')}>Remove the sub-total label</DropdownItem> : null}   {/* (sweep S1) the name dialog can't save an empty word */}
            {!isItem ? <DropdownItem onSelect={() => act('oneLine')}>{item.printOneLine ? 'Print every line' : 'Print as one line'}</DropdownItem> : null}
            {/* (S44T — call C1, Dyel's Estimation Direct) a top section's work priced once the contract is signed: out of the total, printed after the items */}
            {!isItem && !item.parentId && !variation ? <DropdownItem onSelect={() => act('pricedAfter')} help={item.pricedAfter ? undefined : 'Out of the total — printed after the items'}>{item.pricedAfter ? 'Price with the contract' : 'Price after the contract'}</DropdownItem> : null}   {/* (REG-585) the client sees the section's name and its total; the lines stay the studio's */}
            <DropdownDivider />
            <DropdownItem submenu onSelect={() => setSub('add')}>Add Item<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            <DropdownItem submenu onSelect={() => setSub('move')}>Move Item<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
            {canMove ? <DropdownItem submenu onSelect={() => setSub('group')}>Move to section<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem> : null}
            {!isItem ? <DropdownItem onSelect={() => act('ungroup')}>Ungroup — keep the lines</DropdownItem> : null}
            <DropdownDivider />
            <DropdownItem tone="danger" onSelect={() => act('remove')}>Remove</DropdownItem>
          </>
        )}
      </div>
    </PortalMenu>
  )
}
