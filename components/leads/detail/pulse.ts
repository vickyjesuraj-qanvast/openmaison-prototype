/**
 * (Dane's UAT 8.17) The house attention pulse — the quote Items' `data-fresh` and Company › Members' new row: a 14% primary wash that holds,
 * then fades over 1.4 s — on a table row the Overview frame does not draw (the Contracts tab's row a signed notice points at). The row and
 * every cell that paints its own fill (the frozen block) take the wash through the Web Animations API, so the tab's own markup and
 * stylesheet stay as they are; nothing is left behind once it ends.
 */
export function pulseRow(row: HTMLElement): void {
  const primary = getComputedStyle(row).getPropertyValue('--om-color-primary-default').trim()
  if (!primary || typeof row.animate !== 'function') return
  const short = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const filled = [row, ...Array.from(row.children).filter((c): c is HTMLElement => c instanceof HTMLElement && getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)')]
  for (const el of filled) {
    const base = getComputedStyle(el).backgroundColor
    const wash = `color-mix(in srgb, ${primary} 14%, ${base})`
    el.animate([{ backgroundColor: wash }, { backgroundColor: wash, offset: 0.55 }, { backgroundColor: base }], { duration: short ? 600 : 1400, easing: 'ease-out' })
  }
}
