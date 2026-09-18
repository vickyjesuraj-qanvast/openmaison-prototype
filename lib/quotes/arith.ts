/**
 * "=" in a number cell (REG-477, the Excel benchmark's phase 3): "=12*3.5", "=(2+3)*45", "=1200/4", "=20%*300". Plain
 * arithmetic — + − × ÷ and brackets over numbers, a trailing % a hundredth — read by a small recursive-descent parser, never
 * `eval`. `null` when the text does not parse or divides by zero.
 */
export function evalArithmetic(src: string): number | null {
  const s = src.replace(/^=/, '').replace(/[×x]/gi, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/,/g, '').replace(/\s+/g, '')
  if (!s) return null
  let i = 0
  const peek = () => s[i]
  const num = (): number | null => {
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?%?/i.exec(s.slice(i))
    if (!m) return null
    i += m[0].length
    const pct = m[0].endsWith('%')
    const v = Number(pct ? m[0].slice(0, -1) : m[0])
    return pct ? v / 100 : v
  }
  const factor = (): number | null => {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') return null; i++; return v }
    if (peek() === '-') { i++; const v = factor(); return v === null ? null : -v }
    if (peek() === '+') { i++; return factor() }
    return num()
  }
  const term = (): number | null => {
    let v = factor()
    while (v !== null && (peek() === '*' || peek() === '/')) {
      const op = s[i++]
      const r = factor()
      if (r === null || (op === '/' && r === 0)) return null
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  const expr = (): number | null => {
    let v = term()
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = s[i++]
      const r = term()
      if (r === null) return null
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  const v = expr()
  return v !== null && i === s.length && Number.isFinite(v) ? v : null
}

/** What a number box lets through as it is typed: digits (and the extra given) — or, once it starts with "=", a sum's characters. */
export function filterNumeric(v: string, extra = ''): string {
  if (v.startsWith('=')) return '=' + v.slice(1).replace(/[^0-9.,+\-−–*/()%x×÷ ]/gi, '')
  return v.replace(new RegExp(`[^0-9.${extra}]`, 'g'), '')
}
/** The box's text as a number: a sum evaluated, a figure with its commas dropped. */
export function readNumber(v: string): number {
  if (v.startsWith('=')) { const n = evalArithmetic(v); return n === null ? NaN : n }
  return Number(v.replace(/,/g, ''))
}
