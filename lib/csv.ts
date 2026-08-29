/** Minimal RFC-4180 CSV parse/serialise (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
      continue
    }
    // Only a quote at the very start of a cell opens quoted mode; a stray quote
    // mid-cell (12" tile, said "hi) is literal, as Excel/Papa treat it.
    if (c === '"' && cell === '') { quoted = true; continue }
    if (c === ',') { row.push(cell); cell = ''; continue }
    if (c === '\r') continue
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    cell += c
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  // drop fully empty trailing rows
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

export function toCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return rows.map((r) => r.map((v) => esc(v ?? '')).join(',')).join('\r\n') + '\r\n'
}
