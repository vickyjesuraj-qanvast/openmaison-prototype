/**
 * The Items table's keyboard grid (REG-475, owner 2026-09-17: "our users are using excel sheet more and they expect the same").
 * Pure DOM helpers over the rows the table renders: a control is any `[data-edit]` in a line row, its column the nearest
 * `[data-col]`. Tab / Shift+Tab step across a row's controls and wrap to the next / previous row; Enter, Shift+Enter and the
 * vertical arrows walk one column, skipping rows that have no control in it (a group has no QTY); past the last row is the
 * Add Item field. A cell reached by key opens with its value selected, so typing replaces it as a spreadsheet does.
 */

const CONTROL = '[data-edit]'
const ROW = '[role="row"][data-item-id]'

/** Past the last row: the Add Item field. */
export type Target = HTMLElement | 'add' | null

const shown = (el: Element) => el instanceof HTMLElement && el.getClientRects().length > 0
export const rowOf = (el: Element) => el.closest<HTMLElement>(ROW)
const colOf = (el: Element) => el.closest<HTMLElement>('[data-col]')?.dataset.col ?? null
const rowsOf = (table: HTMLElement) => [...table.querySelectorAll<HTMLElement>(ROW)]
const controlsIn = (row: HTMLElement) => [...row.querySelectorAll<HTMLElement>(CONTROL)].filter(shown)
const controlFor = (row: HTMLElement, col: string) => row.querySelector<HTMLElement>(`[data-col="${col}"] ${CONTROL}, [data-col="${col}"]${CONTROL}`)

/** The next control across (dir 1) or back (−1): the row's neighbour, else the first / last of the next row that has one. */
export function nextAcross(table: HTMLElement, el: HTMLElement, dir: 1 | -1): Target {
  const row = rowOf(el)
  if (!row) return null
  const list = controlsIn(row)
  const n = list[list.indexOf(el) + dir]
  if (n) return n
  const rows = rowsOf(table)
  for (let k = rows.indexOf(row) + dir; k >= 0 && k < rows.length; k += dir) {
    const c = controlsIn(rows[k]!)
    const pick = dir > 0 ? c[0] : c[c.length - 1]
    if (pick) return pick
  }
  return dir > 0 ? 'add' : null
}

/** The same column's control in the next row down (dir 1) or up (−1) that has one. */
export function nextDown(table: HTMLElement, el: HTMLElement, dir: 1 | -1): Target {
  const row = rowOf(el), col = colOf(el)
  if (!row || !col) return null
  const rows = rowsOf(table)
  for (let k = rows.indexOf(row) + dir; k >= 0 && k < rows.length; k += dir) {
    const c = controlFor(rows[k]!, col)
    if (c) return c
  }
  return dir > 0 ? 'add' : null
}

/** A horizontal arrow leaves a box only from its edge (or with the whole value selected); inside the text it moves the caret. */
export function atEdge(input: HTMLInputElement, dir: 1 | -1): boolean {
  const s = input.selectionStart ?? 0, e = input.selectionEnd ?? 0, L = input.value.length
  if (s === 0 && e === L) return true
  return dir > 0 ? e === L : s === 0
}

/**
 * Focus a control reached by key and select its value. A description field only shows once its row is active, so when the
 * focus does not land, the row's name takes it first and the field follows a frame later. `reveal` then scrolls it out from
 * under the frozen cells (the sideways scroller's own scroll-into-view knows nothing of the sticky Total).
 */
export function focusCell(el: HTMLElement, scroller: HTMLElement | null) {
  const select = () => { if (el instanceof HTMLInputElement && document.activeElement === el) el.select(); reveal(el, scroller) }
  el.focus()
  if (document.activeElement !== el) {
    rowOf(el)?.querySelector<HTMLElement>('input[data-name]')?.focus()
    requestAnimationFrame(() => { el.focus(); select() })
    return
  }
  requestAnimationFrame(select)
}

function reveal(el: HTMLElement, scroller: HTMLElement | null) {
  const row = rowOf(el)
  if (!scroller || !row) return
  const r = el.getBoundingClientRect(), s = scroller.getBoundingClientRect()
  let left = s.left, right = s.right
  for (const c of row.querySelectorAll<HTMLElement>('[role="cell"]')) {
    if (c.contains(el)) continue
    const cs = getComputedStyle(c)
    if (cs.position !== 'sticky') continue
    const cr = c.getBoundingClientRect()
    if (cs.right !== 'auto') right = Math.min(right, cr.left)
    if (cs.left !== 'auto') left = Math.max(left, cr.right)
  }
  if (r.right > right) scroller.scrollLeft += r.right - right + 8
  else if (r.left < left) scroller.scrollLeft -= left - r.left + 8
}
