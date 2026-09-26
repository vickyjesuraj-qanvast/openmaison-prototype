'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import styles from './describe-box.module.css'

type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }
type RecognitionCtor = new () => Recognition
const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
const noop = () => () => {}
/* How many lines the box rests on (describe-box.module.css): one ≤1024 wide or on a laptop's short screen, else two. */
const ONE_LINE = '(max-width: 1024px), (max-height: 860px)'
const watchLines = (fn: () => void) => { const q = window.matchMedia(ONE_LINE); q.addEventListener('change', fn); return () => q.removeEventListener('change', fn) }
/* (new:surfaces-furniture:Describe placeholder cut) the example fits the box it rests in, whole — never a line cut in half, never a
   phrase cut short: the longest that fits, measured in the box's own type at its own width (the rail's 372 · 336 · 300, the tray on any
   phone). Two lines take the full example; one line a shorter one; the tray's box (no caption above it) names itself. */
const FULL = 'e.g. walnut floor, sage green walls, warmer evening light'
const LINE = ['e.g. walnut floor, sage green walls', 'e.g. sage green walls']
const TRAY = ['Describe a change, e.g. sage walls', 'Describe a change…']
const EXAMPLES = [FULL, ...LINE, ...TRAY]
type Room = { w: number; widths: Record<string, number> }
function placeholderFor(room: Room | null, lines: 1 | 2, compact: boolean): string {
  const options = compact ? TRAY : lines === 2 ? [FULL, ...LINE] : LINE
  /* before the box is measured (the server's page, the first paint): the example for the widest box of its kind */
  if (!room) return options[0]!
  /* two lines break at a word, so the full example asks for a little more than twice its width */
  return options.find((o) => (room.widths[o] ?? Infinity) <= (lines === 2 && o === FULL ? room.w * 2 - 48 : room.w - 2)) ?? options[options.length - 1]!
}

/**
 * Describe a change (REG-679; the testers' sheet rows 40 and 207, the studios' sheet row 54): the note, always in view above Generate —
 * "walnut floor, sage walls, warmer light" — and spoken where the browser can listen (the mic dictates into the box; press it again to
 * stop). It rides along with whatever else is picked, or makes a version on its own. 1.0 hid the prompt behind a toggle (B-103).
 * (F062 · F145) Where room is short — a laptop's 768px screen, the phone's tray — it rests on one line and opens up while focused.
 */
export function DescribeBox({ value, onChange, disabled = false, compact = false }: {
  value: string; onChange: (v: string, coalesce: boolean) => void; disabled?: boolean
  /** (F145) The tray's box (≤1024 it is on by width alone): one line at rest, three while you type — the panel keeps the room. */
  compact?: boolean
}) {
  const snack = useSnackbar()
  const canListen = useSyncExternalStore(noop, () => !!recognitionCtor(), () => false)
  const oneLine = useSyncExternalStore(watchLines, () => window.matchMedia(ONE_LINE).matches, () => false)
  const [room, setRoom] = useState<Room | null>(null)
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const base = useRef('')
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value })
  useEffect(() => () => rec.current?.abort(), [])
  /* the box's own width and the examples' widths in its type — read by an observer (never in render), again once the web font lands */
  useEffect(() => {
    const el = input.current
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    if (!el || !ctx || typeof ResizeObserver === 'undefined') return
    let live = true
    const measure = () => {
      if (!live) return
      const cs = getComputedStyle(el)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const w = el.clientWidth, widths = Object.fromEntries(EXAMPLES.map((x) => [x, Math.ceil(ctx.measureText(x).width)]))
      setRoom((r) => (r && r.w === w && EXAMPLES.every((x) => r.widths[x] === widths[x]) ? r : { w, widths }))
    }
    const ro = new ResizeObserver(measure); ro.observe(el)
    void document.fonts?.ready.then(measure)
    return () => { live = false; ro.disconnect() }
  }, [])
  const toggle = () => {
    if (listening) { rec.current?.stop(); return }
    const Ctor = recognitionCtor(); if (!Ctor) return
    const r = new Ctor()
    r.lang = 'en-SG'; r.interimResults = true; r.continuous = false
    base.current = valueRef.current.trim()
    r.onresult = (e) => {
      let said = ''
      for (let k = 0; k < e.results.length; k++) said += e.results[k]![0].transcript
      onChange([base.current, said.trim()].filter(Boolean).join(base.current && !/[,.;]$/.test(base.current) ? ', ' : ' '), true)
    }
    r.onerror = (e) => { if (e.error !== 'aborted' && e.error !== 'no-speech') snack({ message: e.error === 'not-allowed' ? 'Allow the microphone to speak a change' : 'Couldn’t hear that — please try again' }) }
    r.onend = () => { setListening(false); rec.current = null }
    try { r.start(); rec.current = r; setListening(true) } catch { snack({ message: 'Couldn’t start listening — please try again' }) }
  }
  return (
    <div className={styles.box} data-listening={listening || undefined} data-compact={compact || undefined} data-filled={value.trim() ? '' : undefined} data-testid="viz-describe">
      <label className={styles.label} htmlFor="viz-describe-input">Describe a change</label>
      {/* the box is the field's (its padding sits outside the textarea): a press on that padding still lands in the words */}
      <div className={styles.field} onPointerDown={(e) => { if (e.target === e.currentTarget && !disabled) { e.preventDefault(); input.current?.focus() } }}>
        <textarea ref={input} id="viz-describe-input" className={styles.input} rows={2} value={value} disabled={disabled} maxLength={600}
                  placeholder={listening ? 'Listening…' : placeholderFor(room, oneLine || compact ? 1 : 2, compact)}
                  onChange={(e) => onChange(e.target.value, true)} data-testid="viz-describe-input" />
        {canListen ? (
          <Tooltip label={listening ? 'Stop listening' : 'Speak your change'}>
            <button type="button" className={styles.mic} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Speak your change'} onClick={toggle} disabled={disabled} data-testid="viz-describe-mic">
              <Icon name={listening ? 'stop' : 'mic'} size={20} weight={300} />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
