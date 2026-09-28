'use client'

import { GO, KEYS, AREAS, keyDef, MARKED, type AreaId } from '@/lib/keys/registry'
import { isCharacterKey } from '@/lib/keys/spec'
import { flagOn, handlerLabel, hasHandler, hereIds, SINGLE_KEYS } from '@/lib/keys/store'
import { hasSearchTarget } from '@/components/shell/search-focus'

/**
 * (REG-711) What a key finds on the page in front of you. The keys press the page's own controls (`data-kb="<id>"`), walk its list
 * (`data-kb-list` / `data-kb-row`) and its tab row (`data-kb-tabs`), so a key does exactly what the press does — the same checks, the
 * same refusals — and the ? panel lists only what is there. Anything inside an open modal or menu is out of reach: that layer owns the
 * keyboard.
 */
export const MODAL = '[aria-modal="true"]'
export const MENU = '[data-om-menu], [role="menu"]'

export const isVisible = (el: Element | null | undefined): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0

/** A modal or a menu is open over the page — it owns the keys. */
export const layerOpen = (): boolean => Array.from(document.querySelectorAll(`${MODAL}, ${MENU}`)).some(isVisible)

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'])
/** Typing: letters belong to the field. A checkbox or a switch is not a field. */
export function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  if (t instanceof HTMLInputElement) return !NOT_TEXT.has(t.type)
  return t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement
}
/** A widget that answers its own keys: a grid, a slider, a list box, a menu, a canvas marked `data-kb-own`. */
export const ownsKeys = (t: EventTarget | null): boolean =>
  t instanceof Element && !!t.closest('[role="grid"], [role="slider"], [role="spinbutton"], [role="combobox"], [role="listbox"], [role="menu"], [role="tree"], [data-kb-own]')
/** Arrows are also a tab row's, a radio group's and a toolbar's own. */
export const ownsArrows = (t: EventTarget | null): boolean =>
  ownsKeys(t) || (t instanceof Element && !!t.closest('[role="tablist"], [role="radiogroup"], [role="toolbar"]'))

export const outOfReach = (el: Element) => !!el.closest(`${MODAL}, ${MENU}, [data-kb-panel]`)

/** The page's control for a marked key — inside the cursor's row first (its stage, its assignees), then the page. */
export function marked(id: string, within?: Element | null): HTMLElement | null {
  const sel = `[data-kb="${id}"]`
  const inRow = within ? Array.from(within.querySelectorAll<HTMLElement>(sel)).find(isVisible) : undefined
  if (inRow) return inRow
  return Array.from(document.querySelectorAll<HTMLElement>(sel)).find((el) => isVisible(el) && !outOfReach(el) && !el.closest('[data-kb-row]')) ?? null
}

const PRESSABLE = 'button, a[href], [role="button"], [role="link"], [role="tab"], label, input'
/** Presses a control the way a click would — a wrapper presses the control inside it. False when it is disabled. */
export function press(el: HTMLElement | null): boolean {
  if (!el) return false
  const t = el.matches(PRESSABLE) ? el : el.querySelector<HTMLElement>(PRESSABLE) ?? el
  if (t.getAttribute('aria-disabled') === 'true' || (t as HTMLButtonElement).disabled) return false
  t.click()
  return true
}

/** Ticks a row's box the way a click on the box does — on its input, so the row's own click (which opens it) does not also fire. */
export function toggle(el: HTMLElement | null): boolean {
  const input = el?.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]')
  if (input) { if (input.disabled) return false; input.click(); return true }
  return press(el)
}

/** A control's words, for the panel and the tips ("Create Lead", "Back to Leads"). */
export function wordsOf(el: HTMLElement | null): string {
  if (!el) return ''
  const t = el.matches(PRESSABLE) ? el : el.querySelector<HTMLElement>(PRESSABLE) ?? el
  const name = el.dataset.kbLabel || t.getAttribute('aria-label') || t.textContent || ''
  return name.replace(/\s+/g, ' ').trim().slice(0, 40)
}

/* ---- lists ---- */
export function currentList(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kb-list]')).find((el) => isVisible(el) && !outOfReach(el)) ?? null
}
export const rowsOf = (list: HTMLElement): HTMLElement[] => Array.from(list.querySelectorAll<HTMLElement>('[data-kb-row]')).filter(isVisible)
export const nounOf = (list: HTMLElement | null) => list?.dataset.kbList || 'row'

/* ---- tabs ---- */
export function tabRow(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kb-tabs]')).find((el) => isVisible(el) && !outOfReach(el)) ?? null
}
export const tabsOf = (row: HTMLElement): HTMLElement[] => Array.from(row.querySelectorAll<HTMLElement>('[role="tab"]')).filter(isVisible)

/* ---- the list you came from, for J / K on a lead (REG-713) ---- */
const TRAIL = 'om.kb.trail'
export type Trail = { from: string; hrefs: string[] }
/** Kept per tab when a lead is opened from a list — by the keyboard or the mouse. */
export function keepTrail(list: HTMLElement) {
  const hrefs = rowsOf(list).map((r) => r.dataset.kbHref).filter((h): h is string => !!h)
  if (!hrefs.length) return
  try { sessionStorage.setItem(TRAIL, JSON.stringify({ from: `${location.pathname}${location.search}`, hrefs })) } catch { /* private window */ }
}
export function readTrail(): Trail | null {
  try { const v = JSON.parse(sessionStorage.getItem(TRAIL) ?? 'null') as Trail | null; return v && Array.isArray(v.hrefs) ? v : null } catch { return null }
}
/** On a lead's page: the next or previous lead of the list you came from, on the same tab — or null at either end / from elsewhere. */
export function leadStep(d: 1 | -1): string | null {
  const m = location.pathname.match(/^\/leads\/([^/]+)(\/.*)?$/)
  if (!m || m[1] === 'imports' || m[1] === 'insights') return null
  const trail = readTrail()
  if (!trail) return null
  const i = trail.hrefs.findIndex((h) => h.split('?')[0] === `/leads/${m[1]}`)
  const next = i >= 0 ? trail.hrefs[i + d] : undefined
  if (!next) return null
  return `${next.split('?')[0]}${m[2] ?? ''}`
}
export const onLeadPage = () => /^\/leads\/(?!imports|insights)[^/]+/.test(location.pathname) && !!readTrail()

/** The page's name for the panel's "On this page · …". */
export function pageName(): string {
  const h = document.querySelector<HTMLElement>('[data-kb-page]') ?? Array.from(document.querySelectorAll<HTMLElement>('#om-main h1, h1')).find(isVisible)
  return (h?.dataset.kbPage || h?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32) || 'This page'
}

/* ---- what the ? panel lists ---- */
export type Row = { id: string; label: string; keys: string; off?: boolean }
export type Group = { key: string; title: string; rows: Row[] }

const off = (keys: string) => !flagOn(SINGLE_KEYS) && isCharacterKey(keys)
const row = (id: string, label?: string, keys?: string): Row | null => {
  const d = keyDef(id)
  if (!d) return null
  const k = keys ?? d.keys
  return { id, label: label ?? d.label, keys: k, off: off(k) }
}
const LEAD_LABEL: Record<string, string> = { 'move-stage': 'Move stage', assign: 'Assign', edit: 'Edit the lead' }

/** The keys the page in front of you answers — the panel's "On this page" and "Everywhere". */
export function liveGroups(editor: boolean): Group[] {
  const page: Row[] = []
  const list = currentList()
  if (list) {
    const noun = nounOf(list)
    for (const id of ['list.next', 'list.prev', 'list.open']) page.push(row(id, keyDef(id)!.label.replace('{noun}', noun))!)
    if (list.querySelector('[data-kb-select]')) page.push(row('list.select', `Select the ${noun}`)!)
    if (list.querySelector('[data-kb-select-all]')) page.push(row('list.all', `Select every ${noun} shown`)!)
  } else if (onLeadPage()) {
    page.push(row('lead.next')!, row('lead.prev')!)
  }
  const tabs = tabRow()
  if (tabs) { const n = tabsOf(tabs).length; if (n > 1) page.push(row('tabs', 'Switch tabs', `#1–${Math.min(n, 9)}`)!) }
  for (const id of MARKED) {
    const el = marked(id)
    if (!el && !hasHandler(id)) continue
    const name = handlerLabel(id) || (id === 'create' || id === 'back' || id === 'preview' || id === 'filters' ? wordsOf(el) : LEAD_LABEL[id])
    const r = row(id, name || undefined)
    if (r) page.push(r)
  }
  for (const id of hereIds()) { const r = row(id); if (r && !page.some((p) => p.id === id)) page.push(r) }

  const everywhere = ['search', 'shortcuts', ...(hasSearchTarget() ? ['find'] : []), ...GO.map((g) => g.id), 'undo', ...(editor ? ['save'] : [])]
    .map((id) => row(id)).filter((r): r is Row => !!r)
  const layer = ['layer.close', 'layer.move', 'layer.pick', 'layer.save'].map((id) => row(id)!).filter(Boolean)
  return [
    ...(page.length ? [{ key: 'page', title: `On this page · ${pageName()}`, rows: page }] : []),
    { key: 'everywhere', title: 'Everywhere', rows: everywhere },
    { key: 'layer', title: 'In dialogs and menus', rows: layer },
  ]
}

/** Every key in the app, by where it applies — the panel's "All pages". */
export function allGroups(): Group[] {
  return AREAS.map((a) => ({
    key: a.id, title: a.title,
    rows: KEYS.filter((k) => k.area === (a.id as AreaId)).map((k) => ({ id: k.id, label: k.label.replace('{noun}', 'row'), keys: k.keys, off: off(k.keys) })),
  })).filter((g) => g.rows.length)
}
