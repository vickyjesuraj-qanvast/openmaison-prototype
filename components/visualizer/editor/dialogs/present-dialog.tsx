'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ds'
import { CompareSlider } from '@/components/om/compare-slider'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { useMediaQuery } from '@/lib/breakpoint'
import { duration, ease } from '@/lib/motion'
import { ORIGINAL, type VersionView } from '@/lib/visualizer/model'
import { beforeKeyOf } from '../editor-model'
import { carriedFacts, changedFacts, factsSince, type Labels } from './version-facts'
import styles from './dialogs.module.css'
import { useEdgeFade } from './use-edge-fade'

/** Scrolls `el` into the visible part of `box` along one axis, moving only `box` — never the dialog or the page behind it. (surfaces-25)
    Down the side's block it lands on a whole row — the row's top at the block's padding edge, never a sliver of the row above. */
function keepInView(box: HTMLElement | null, el: HTMLElement | null, axis: 'x' | 'y') {
  if (!box || !el) return
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect(), pad = 8
  if (axis === 'x') {
    if (r.left < b.left) box.scrollLeft += r.left - b.left - pad
    else if (r.right > b.right) box.scrollLeft += r.right - b.right + pad
    return
  }
  const top = parseFloat(getComputedStyle(box).paddingTop) || 0
  if (r.top < b.top + top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - top
}

/** (surfaces-25 · tablet-13) The versions' block beside the picture is as tall as a whole number of rows of thumbnails (up to its CSS cap),
    so it opens — and scrolls to its end — on whole rows: never a sliver of a row with its captions floating under nothing. The row under
    a phone's picture (a flex row) keeps its own height. Measured from the side column, which the block's height never changes. */
function useWholeRows(ref: RefObject<HTMLElement | null>, on: boolean, count: number) {
  useEffect(() => {
    const el = ref.current, side = el?.parentElement
    if (!on || !el || !side) return
    const fit = () => {
      el.style.maxHeight = ''
      const cs = getComputedStyle(el)
      const first = el.querySelector<HTMLElement>('button')
      if (cs.display !== 'grid' || !first) return
      const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1
      const gap = parseFloat(cs.rowGap) || 0, pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderTopWidth) || 0)
      const rowH = first.getBoundingClientRect().height + gap
      const cap = el.getBoundingClientRect().height
      if (Math.ceil(count / cols) * rowH - gap + pad <= cap + 1) return   // everything fits: nothing to round
      const rows = Math.max(1, Math.floor((cap - pad + gap) / rowH))
      el.style.maxHeight = `${Math.round(rows * rowH - gap + pad)}px`
    }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(side)
    return () => { ro.disconnect(); el.style.maxHeight = '' }
  }, [ref, on, count])
}

/** (wave E · E3) A phone held sideways: the picture left and the facts right, in a Present that takes the screen. */
const SIDEWAYS = '(max-width: 1024px) and (orientation: landscape) and (max-height: 500px)'

/**
 * Present (REG-674, Q-12; 1.0's full-page View dialog, C-60…C-68, as the house xxl modal): one version as large as the screen allows,
 * the arrows (and ← →) walking the room's versions, Before / after against its parent or the Original, what changed beside it.
 * (audit 2026-09-26) The arrows sit on their own surface and stay put at the ends, so focus never falls out of the dialog (F074 · F086);
 * a swipe on the photo walks on a touch screen, and a landscape tablet keeps the side column so the photo takes the height (F147 ·
 * critic 20); the picture crossfades like the canvas (F176); the thumbnails wrap beside it with the one on screen marked and kept in view
 * (F078); the side names what the version was made from and, for one built on another, everything it carries (critic 12).
 */
export function PresentDialog({ open, onClose, room, original, versions, start, labels, lineage }: {
  open: boolean; onClose: () => void; room: string; original: string | null; versions: VersionView[]; start: string
  /** The room's reading — how a finish the version inherited finds its surface's name. */
  labels?: Labels
  /** (F082) Every version of the room, deleted ones too — so a version whose parent was deleted compares with the nearest live
      ancestor, exactly as the canvas' Compare does. Without it, a missing parent falls back to the Original. */
  lineage?: Pick<VersionView, 'key' | 'parentKey' | 'deleted'>[]
}) {
  const list = useMemo(() => [...(original ? [{ key: ORIGINAL, n: 0, label: 'Original', url: original, v: null as VersionView | null }] : []), ...versions.map((v) => ({ key: v.key, n: v.n, label: `V${v.n} · ${v.descriptor}`, url: v.imageUrl, v }))], [original, versions])
  const [key, setKey] = useState(start)
  const [compare, setCompare] = useState(false)
  const [was, setWas] = useState(open)
  if (open !== was) { setWas(open); if (open) { setKey(start); setCompare(false) } }
  const i = Math.max(0, list.findIndex((x) => x.key === key))
  const cur = list[i]
  /* (F082) Before = the canvas' answer (beforeKeyOf): the parent, else the nearest live version up the line, else the Original */
  const beforeKey = cur?.v ? beforeKeyOf(cur.v, lineage ?? versions) : null
  const parent = beforeKey ? list.find((x) => x.key === beforeKey) ?? list.find((x) => x.key === ORIGINAL) ?? null : null
  const short = (x: { key: string; n: number }) => (x.key === ORIGINAL ? 'Original' : `V${x.n}`)
  /* (F086) the mode stays as chosen while walking; the label says what is actually on screen */
  const showing = compare && !!parent
  /* (phone-9) the arrow at an end steps aside (stage.module.css: its slot stays); focus on it goes to the other arrow first, never the page */
  const step = (d: -1 | 1) => {
    const next = list[i + d]; if (!next) return
    const j = i + d
    if (j === 0 || j === list.length - 1) {
      const a = document.activeElement
      if (a instanceof HTMLElement && a.closest(`[data-side="${d < 0 ? 'prev' : 'next'}"]`)) a.closest('[data-testid="viz-present"]')?.querySelector<HTMLElement>(`[data-side="${d < 0 ? 'next' : 'prev'}"] button`)?.focus({ preventScroll: true })
    }
    setKey(next.key)
  }

  /* the keys walk as the arrows do (the latest `step`, so an arrow at its end hands its focus over first) */
  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && !(e.target as HTMLElement)?.closest?.('[role="slider"]')) { e.preventDefault(); stepRef.current(-1) }
      if (e.key === 'ArrowRight' && !(e.target as HTMLElement)?.closest?.('[role="slider"]')) { e.preventDefault(); stepRef.current(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  /* (F078 · F176) the thumbnail on screen stays in view — sideways in the row under the photo, down its own block beside it. (verify
     round 1) Only the thumbnails scroll for it: the facts above them open at their top, 'What changed' first, on every size. */
  const thumbsRef = useRef<HTMLDivElement>(null)
  useWholeRows(thumbsRef, open, list.length)
  useEffect(() => {
    if (!open) return
    const on = thumbsRef.current?.querySelector<HTMLElement>('[data-on]') ?? null
    keepInView(thumbsRef.current, on, 'x')
    keepInView(thumbsRef.current, on, 'y')
  }, [open, key])
  /* (verify round 1) each picture's own shape, so Before and after is the picture's size — its labels and divider on the photo, not on
     the grey around it */
  const factsRef = useRef<HTMLDivElement>(null)
  useEdgeFade(factsRef, open, key)
  useEdgeFade(thumbsRef, open, list.length)
  const phone = useSheetLayout(), sideways = useMediaQuery(SIDEWAYS)
  const [shapes, setShapes] = useState<Record<string, number>>({})
  const readShape = (url: string, el: HTMLImageElement) => { if (el.naturalWidth && el.naturalHeight) { const a = el.naturalWidth / el.naturalHeight; setShapes((m) => (m[url] === a ? m : { ...m, [url]: a })) } }
  const reduce = useReducedMotion()

  /* (F147) a swipe on the photo walks the versions on a touch screen; the slider keeps its own drag while comparing */
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || showing || (e.target as HTMLElement).closest('button')) { swipe.current = null; return }
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent) => {
    const s = swipe.current; swipe.current = null
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
  }

  if (!cur) return null
  /* (verify round 1) when the version it was made from is deleted, "What changed" is the whole difference from the one it now compares
     with — its own pass alone would leave out what the deleted version changed */
  const skipped = !!cur.v && !!parent && cur.v.parentKey !== parent.key
  /* (surfaces-26 · desktop-8) the pass's own changes named as "Everything in" names them — one surface, one name, in one panel */
  const changed = !cur.v ? [] : skipped ? factsSince(cur.v, parent?.v ?? null, labels) : changedFacts(cur.v, labels)
  const caveat = cur.v?.applied.caveat ?? null
  const carried = cur.v && parent && parent.key !== ORIGINAL ? carriedFacts(cur.v, labels) : []
  const aspect = shapes[cur.url] ?? null
  const nav = (d: -1 | 1) => {
    const end = d < 0 ? i === 0 : i === list.length - 1
    return (
      <span className={styles.nav} data-side={d < 0 ? 'prev' : 'next'} data-end={end || undefined}>
        <Tooltip label={d < 0 ? 'Previous (←)' : 'Next (→)'} disabled={end}>
          <IconButton icon={d < 0 ? 'chevron_left' : 'chevron_right'} label={d < 0 ? 'Previous version' : 'Next version'} aria-disabled={end || undefined} onClick={() => { if (!end) step(d) }} />
        </Tooltip>
      </span>
    )
  }
  return (
    /* (phone-9) a phone's head keeps to one line — the room and the version; the version's full name heads its facts */
    <Dialog open={open} onClose={onClose} title={phone || sideways ? `${room} · ${short(cur)}` : `${room} · ${cur.label}`} size="modal" fluid
            footer={<div className={styles.footRow}>
              <Button appearance="outlined" variant="secondary" isDisabled={!parent} onPress={() => setCompare((c) => !c)}>{showing ? 'Show it alone' : `Before and after${parent ? ` · ${short(parent)}` : ''}`}</Button>
              <Button onPress={onClose}>Done</Button>
            </div>}>
      <div className={styles.present} data-testid="viz-present">
        <div className={styles.presentStage} style={aspect ? { ['--shape' as string]: aspect } : undefined} data-shaped={aspect ? '' : undefined} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { swipe.current = null }}>
          {showing && parent ? <CompareSlider className={styles.presentCompare} before={parent.url} after={cur.url} beforeLabel={short(parent)} afterLabel={short(cur)} />
            : (
              <AnimatePresence initial={false}>
                <motion.img key={cur.url} src={cur.url} alt={cur.label} draggable={false} ref={(el) => { if (el?.complete) readShape(cur.url, el) }} onLoad={(e) => readShape(cur.url, e.currentTarget)}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.08 : duration.sheet, ease: ease.standard }} />
              </AnimatePresence>
            )}
          {list.length > 1 ? <>{nav(-1)}{nav(1)}</> : null}
        </div>
        <div className={styles.side}>
          <div className={styles.facts} ref={factsRef}>
            {(phone || sideways) && cur.v ? <span className={styles.presentName}>{cur.label}</span> : null}
            <div className={styles.section}>
              <span className={styles.head}><span>{cur.v ? 'What changed' : 'The photo'}</span>{parent ? <span>From {short(parent)}</span> : null}</span>
              {changed.length ? <div className={`${styles.lines} ${styles.factLines}`}>{changed.map((l, k) => <div key={k} className={styles.line}><span>{l.what}</span><span>{l.to}</span></div>)}</div>
                : <span className={styles.hint}>{cur.v ? 'A whole-room look.' : 'The room as it was photographed.'}</span>}
              {/* (F064) what the pass could not do, said beside what it was asked — the studio's own view, never the client's */}
              {caveat ? <span className={styles.hint} data-tone="warn" data-testid="viz-present-caveat"><Icon name="info" size={16} weight={300} /> {caveat}</span> : null}
            </div>
            {carried.length ? (
              <div className={styles.section}>
                <span className={styles.head}><span>Everything in {short(cur)}</span></span>
                <div className={`${styles.lines} ${styles.factLines}`}>{carried.map((l, k) => <div key={k} className={styles.line}><span>{l.what}</span><span>{l.to}</span></div>)}</div>
              </div>
            ) : null}
          </div>
          <div className={styles.thumbs} ref={thumbsRef} role="group" aria-label="Versions">
            {list.map((x) => (
              <button key={x.key} type="button" className={styles.thumb} data-on={x.key === key || undefined} aria-current={x.key === key ? 'true' : undefined} aria-label={x.label} onClick={() => setKey(x.key)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.url} alt="" loading="lazy" /><span aria-hidden>{short(x)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
