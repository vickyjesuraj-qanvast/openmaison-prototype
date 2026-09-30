'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ORIGINAL, type VersionView } from '@/lib/visualizer/model'
import { beforeKeyOf } from './editor-model'
import styles from './versions-strip.module.css'

export type Badge = { favourite: boolean; pins: number; shared: boolean; notes: number }

/** (F077) Whether deleting this version takes something the client gave with it — its link, a favourite, notes or pins. The editor asks
    first (DeleteVersionDialog) when it does, and deletes straight away with Undo when it doesn't. */
export const carriesClientInput = (b: Badge | undefined) => !!b && (b.shared || b.favourite || b.notes > 0 || b.pins > 0)

type Mark = { key: string; node: ReactNode; words: string; notes?: number }
/** A tile's marks in the order they matter: the client's favourite, their notes, the pins, whether it went out. */
function marksOf(b: Badge | undefined): Mark[] {
  if (!b) return []
  const out: Mark[] = []
  if (b.favourite) out.push({ key: 'fav', words: 'the client’s favourite', node: <span className={styles.fav}><Icon name="star" size={14} fill /></span> })
  if (b.notes) out.push({ key: 'notes', notes: b.notes, words: `${b.notes} ${b.notes === 1 ? 'note' : 'notes'} from the client`, node: <><Icon name="comment" size={12} fill />{b.notes}</> })
  if (b.pins) out.push({ key: 'pins', words: `${b.pins} ${b.pins === 1 ? 'pin' : 'pins'}`, node: <span className={styles.badge}><Icon name="push_pin" size={12} fill />{b.pins}</span> })
  if (b.shared) out.push({ key: 'shared', words: 'shared with the client', node: <span className={styles.badge}><Icon name="send" size={12} fill /></span> })
  return out
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** How many marks a 96px tile (≤1024) shows before "+n": the first, and (UX audit V1) the client's notes too when they come second. */
const narrowShown = (marks: Mark[]) => (marks[1]?.key === 'notes' ? 2 : 1)

/**
 * The versions (REG-673 · 674; 1.0's gallery strip, C-40…C-44): the Original, then V1…Vn oldest first, a placeholder for each variant
 * in flight. A press puts a version on the canvas — edits continue from it (Q-08); the one Compare lays underneath wears *Before*. Each
 * carries what the client said (a favourite, notes), its pins and whether it went out; its ⋯ holds the rest.
 * (audit 2026-09-26) The row keeps the version on screen — and the renders in flight — in view (F002); the ⋯ sits top-right on its own
 * surface with a 36px target, *Before* top-left, the marks bottom-right, two at most then "+n" (F005 · F074 · F150); the list is named,
 * and each tile's name carries its descriptor and marks (F171); the head counts the deleted versions and opens them (F077).
 */
export function VersionsStrip({ original, versions, viewKey, compareKey, inFlight, badges, onPick, onMenu, menuFor, deleted = 0, onDeleted, originalSub = 'the photo', lineage, onNotes, notesFor = null }: {
  original: string | null
  versions: VersionView[]
  viewKey: string
  compareKey: string | null
  inFlight: number
  badges: Record<string, Badge>
  onPick: (key: string) => void
  onMenu: (key: string, el: HTMLElement) => void
  menuFor: string | null
  /** (F077) How many of the room's versions are deleted — the head offers them back when there are any. */
  deleted?: number
  onDeleted?: () => void
  /** (F071) What the Original tile is — 'the sketch' when the room's reading is a sketch, else 'the photo'. */
  originalSub?: string
  /** (surfaces-24) Every version of the room, deleted ones too — a version whose parent was deleted then says the nearest live one up the
      line ("made from V2"), as Present and Compare do. Without it, only a live parent is named. */
  lineage?: Pick<VersionView, 'key' | 'parentKey' | 'deleted'>[]
  /** (UX audit V1) The notes badge opens the client's notes on that version (From the client). */
  onNotes?: (key: string) => void
  /** The version whose notes are open — its badge reads as pressed. */
  notesFor?: string | null
}) {
  const titleId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const live = versions.filter((v) => !v.deleted)
  /* (verify round 1) a sketch has no surfaces to finish, and its button is Render from sketch */
  const sketch = originalSub === 'the sketch'

  /* (F002) the version on screen stays in view; while renders are in flight, their tiles at the end do. A DOM-only effect keyed on what
     moves them — a sideways scroll of the studio's own is never fought on a re-render. `scrollTo` on the row, not `scrollIntoView`, so the
     editor's frame never scrolls with it. */
  useEffect(() => {
    const row = rowRef.current; if (!row) return
    const behavior: ScrollBehavior = first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    first.current = false
    if (inFlight > 0) { row.scrollTo({ left: row.scrollWidth, behavior }); return }
    const tile = row.querySelector<HTMLElement>('[data-on]'); if (!tile) return
    const r = row.getBoundingClientRect(), t = tile.getBoundingClientRect(), pad = 16
    if (t.left < r.left) row.scrollTo({ left: row.scrollLeft + t.left - r.left - pad, behavior })
    else if (t.right > r.right) row.scrollTo({ left: row.scrollLeft + t.right - r.right + pad, behavior })
  }, [viewKey, inFlight, live.length])

  /* (surfaces-22) ← → walk the versions from anywhere; when the keys come from a tile, focus walks with the version on screen — one ring,
     never the focused tile left behind beside the one showing. */
  useEffect(() => {
    const row = rowRef.current, a = document.activeElement
    if (!row || !(a instanceof HTMLElement) || !row.contains(a) || !a.matches('[data-testid="viz-version"]')) return
    const on = row.querySelector<HTMLElement>('[data-on] [data-testid="viz-version"]')
    if (on && on !== a) on.focus({ preventScroll: true })
  }, [viewKey])

  /* (surfaces-23) A version that leaves the strip (deleted from its ⋯) takes its focused ⋯ with it, and the last restore closes Deleted
     versions with its opener already gone — either way focus would fall to the page. Once the menu or the dialog has handed focus back,
     a page left holding it gives it to the tile that came back, else the one that took the deleted one's place (the next, else the one
     before). Focus the studio put anywhere else stays there. */
  const liveKeys = live.map((v) => v.key).join(',')
  const keysWas = useRef<string[] | null>(null)
  useEffect(() => {
    const keys = liveKeys ? liveKeys.split(',') : []
    const prev = keysWas.current
    keysWas.current = keys
    if (!prev) return
    const gone = prev.filter((k) => !keys.includes(k)), came = keys.filter((k) => !prev.includes(k))
    if (!gone.length && !came.length) return
    if (prev.length && keys.length && !keys.some((k) => prev.includes(k))) return   // another room's versions
    const at = prev.indexOf(gone[0] ?? '')
    const target = came.length ? came[came.length - 1]! : at < 0 ? null
      : prev.slice(at + 1).find((k) => keys.includes(k)) ?? prev.slice(0, at).reverse().find((k) => keys.includes(k)) ?? ORIGINAL
    if (!target) return
    const rescue = () => {
      const a = document.activeElement
      if (a && a !== document.body && a.isConnected) return
      rowRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(target)}"] [data-testid="viz-version"]`)?.focus({ preventScroll: true })
    }
    const raf = requestAnimationFrame(rescue), t = setTimeout(rescue, 450)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [liveKeys])

  /* (tablet-3) the row fades at an edge with more tiles beyond it — a cut tile reads as more to scroll, not as a stray fragment. A DOM-only
     read on scroll and resize; the attributes are the CSS mask's switches. */
  useEffect(() => {
    const row = rowRef.current; if (!row) return
    const read = () => {
      const l = row.scrollLeft > 1, r = row.scrollLeft + row.clientWidth < row.scrollWidth - 1
      row.toggleAttribute('data-more-l', l); row.toggleAttribute('data-more-r', r)
    }
    read()
    row.addEventListener('scroll', read, { passive: true })
    const ro = new ResizeObserver(read); ro.observe(row)
    return () => { row.removeEventListener('scroll', read); ro.disconnect() }
  }, [liveKeys, inFlight])

  const tile = (key: string, url: string, label: string, sub: string | null, from: string | null = null) => {
    const marks = marksOf(badges[key])
    const on = key === viewKey, before = key === compareKey
    const name = `${on ? `${label}, on screen` : `Show ${label}`}${sub ? ` · ${sub}` : ''}${from ? ` · made from ${from}` : ''}${before ? ' · the before in the comparison' : ''}${marks.map((m) => ` · ${m.words}`).join('')}`
    const rest = (from: number) => marks.slice(from).map((m) => m.words)
    return (
      <div key={key} className={styles.tile} data-on={on || undefined} data-before={before || undefined} data-key={key} role="listitem">
        {/* (verify round 1) the thumbnail holds the ⋯, so it sits on the picture's corner whatever the caption under it */}
        <span className={styles.thumb}>
        <button type="button" className={styles.open} onClick={() => onPick(key)} aria-pressed={on} aria-label={name} data-testid="viz-version">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" loading="lazy" decoding="async" />
          {before ? <span className={styles.beforeTag} aria-hidden>Before</span> : null}
        </button>
        {marks.length ? (
          /* (UX audit V1) the marks sit on the tile's corner beside its button (not inside it) — the client's notes are a button of their
             own that opens them; the other marks show the version when pressed, as the tile does */
          <span className={styles.badges}>
            {marks.slice(0, 2).map((m, i) => (
              <Tooltip key={m.key} label={m.notes && onNotes ? `Read ${m.words}` : cap(m.words)}>
                {m.notes && onNotes ? (
                  <button type="button" className={`${styles.mark} ${styles.badge}`} data-rank={i} data-notes="" aria-pressed={notesFor === key} aria-label={`Read ${m.words} on ${label}`} onClick={() => onNotes(key)} data-testid="viz-notes-badge">{m.node}</button>
                ) : (
                  <span className={styles.mark} data-rank={i} aria-hidden onClick={() => onPick(key)}>{m.key === 'notes' ? <span className={styles.badge}>{m.node}</span> : m.node}</span>
                )}
              </Tooltip>
            ))}
            {/* two marks and "+n" at desktop widths; one and "+n" on the 96px tiles (≤1024) — the notes button stays at every width */}
            {marks.length > 2 ? <Tooltip label={cap(rest(2).join(' · '))}><span className={styles.more} data-at="wide" aria-hidden onClick={() => onPick(key)}>+{marks.length - 2}</span></Tooltip> : null}
            {marks.length > narrowShown(marks) ? <Tooltip label={cap(rest(narrowShown(marks)).join(' · '))}><span className={styles.more} data-at="narrow" aria-hidden onClick={() => onPick(key)}>+{marks.length - narrowShown(marks)}</span></Tooltip> : null}
          </span>
        ) : null}
        {key !== ORIGINAL ? (
          <span className={styles.kebab}>
            <Tooltip label="More options" disabled={menuFor === key}>
              <IconButton icon="more_vert" label={`More options for ${label}`} size={24} variant="bare" iconSize={20} aria-haspopup="menu" aria-expanded={menuFor === key} onClick={(e) => onMenu(key, e.currentTarget)} />
            </Tooltip>
          </span>
        ) : null}
        </span>
        {/* the caption is the tile's width — a long one ends in an ellipsis and says itself in full on hover (the name carries it too) */}
        <Tooltip label={`${sub ? `${label} · ${sub}` : label}${from ? ` — made from ${from}` : ''}`}>
          <span className={styles.label} aria-hidden><b>{label}</b>{sub ? ` · ${sub}` : ''}</span>
        </Tooltip>
      </div>
    )
  }
  return (
    <div className={styles.strip}>
      <span className={styles.head}>
        {/* (critic 17) the shortcut that already walks the strip, said where the strip is named */}
        <Tooltip label="← → step through the versions"><span className={styles.title} id={titleId}>Versions</span></Tooltip><span className={styles.count}>{live.length}</span>
        {deleted > 0 && onDeleted ? <button type="button" className={styles.deleted} onClick={onDeleted} data-testid="viz-deleted-versions">{deleted} deleted</button> : null}
      </span>
      <div ref={rowRef} className={styles.row} role="list" aria-labelledby={titleId}>
        {original ? tile(ORIGINAL, original, 'Original', originalSub) : null}
        {/* (critic 12) a version built on another says which, in its caption's tooltip and its name */}
        {/* (surfaces-24) a deleted parent hands the provenance to the nearest live version up the line — what Present and Compare say */}
        {live.map((v) => { const k = lineage ? beforeKeyOf(v, lineage) : v.parentKey; const p = k !== ORIGINAL ? live.find((x) => x.key === k) : null; return tile(v.key, v.imageUrl, `V${v.n}`, v.descriptor, p ? `V${p.n}` : null) })}
        {Array.from({ length: inFlight }, (_, i) => (
          <div key={`run-${i}`} className={styles.tile} data-running="" role="listitem" aria-label="Rendering">
            <span className={styles.open}><span className={styles.shimmer} /><Icon name="progress_activity" size={20} weight={300} className={styles.spin} /></span>
            <span className={styles.label}>Rendering…</span>
          </div>
        ))}
        {!live.length && !inFlight ? (
          <span className={styles.none}>Your renders land here<span className={styles.noneMore}>{sketch ? ' — pick a style, then Render from sketch.' : ' — pick a finish or a style, then Generate.'}</span></span>
        ) : null}
      </div>
    </div>
  )
}
