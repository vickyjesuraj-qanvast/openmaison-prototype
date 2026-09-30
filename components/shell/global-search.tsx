'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Avatar } from '@/components/om/avatar'
import { MetaChip } from '@/components/om/meta-chip'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { globalSearch } from '@/app/search/actions'
import { withFrom } from '@/lib/nav'
import { Keys } from '@/components/om/keys'
import { useFlagPref } from '@/lib/prefs'
import { hasHandler, markUsed, openShortcuts, runHandler, SINGLE_KEYS } from '@/lib/keys/store'
import { CREATE, JUMP_TO, PAGES, SCOPES, createHits, marks, pageHits, scopeOf, type SearchHit, type SearchResult, type SearchScope } from '@/lib/global-search/model'
import { isVisible, layerOpen, marked, press } from '@/components/shell/shortcuts/dom'
import styles from './global-search.module.css'
import { leaveThen } from '@/components/company/leave-guard'   // (UX audit S2) unsaved Company / Settings edits ask before the move

/**
 * (REG-709, owner 2026-09-28: "an amazing global search … a popover window like what we have for company tab with a search bar and the results
 * shows within the popover window") The studio-wide search. The rail's Search tile, the phone bar's search glyph and ⌘K (Ctrl K) open it —
 * beside the rail in the Company panel's chrome, a bottom sheet on a phone. Before anything is typed it offers what was searched and opened
 * lately and the pages to go to; as you type it reads every record you may see (`globalSearch`, Who sees leads applies) and shows them in
 * groups with the words marked, the best group first; a scope narrows it to one kind. ↑ ↓ move, ↵ opens (⌘↵ in a new tab), Esc clears then
 * closes. A record opens with `?from=` the page you were on, so its Back returns there (REG-465). "/" still finds on the page you are on.
 */
export const OPEN_SEARCH = 'om:search:open'
export const openGlobalSearch = () => window.dispatchEvent(new CustomEvent(OPEN_SEARCH))

const RECENT_KEY = 'om.search.recent'   // what was searched, newest first
const OPENED_KEY = 'om.search.opened'   // what was opened from here, newest first
const read = <T,>(key: string): T[] => { try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(v) ? v as T[] : [] } catch { return [] } }
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private window: the list simply starts empty next time */ } }

/** A row the keyboard can land on. */
type Item =
  | { type: 'hit'; hit: SearchHit }
  | { type: 'recent'; text: string }
  | { type: 'more'; scope: SearchScope; label: string; total: number }

/* ── (UX audit V9 · S3) what a row opens on arrival: a Create row presses the page's own Create; a card's link brings the card into view ── */
const CREATE_KEY = 'om.search.create'   // sessionStorage: the page a Create row went to, until it has pressed its Create
const readCreate = (): { path: string; at: number; pick: string | null } | null => { try { const v = JSON.parse(sessionStorage.getItem(CREATE_KEY) ?? 'null') as { path?: unknown; at?: unknown; pick?: unknown } | null; return v && typeof v.path === 'string' && typeof v.at === 'number' ? { path: v.path, at: v.at, pick: typeof v.pick === 'string' ? v.pick : null } : null } catch { return null } }
const writeCreate = (path: string | null, pick?: string | null) => { try { if (path) sessionStorage.setItem(CREATE_KEY, JSON.stringify({ path, at: Date.now(), pick: pick ?? null })); else sessionStorage.removeItem(CREATE_KEY) } catch { /* a private window: the page opens, its Create waits for a press */ } }
/** The page's content has come out from behind its ghost (PageReveal holds it `inert` until then). */
const settled = () => !document.querySelector('[inert][data-ready="false"]')
/** Waits for `find` to answer (the page streaming in, its ghost leaving) and runs `then` once — or gives up after ~6 s. */
function when<T>(find: () => T | null, then: (v: T) => void): () => void {
  let tries = 0, t: ReturnType<typeof setTimeout> | null = null
  const tick = () => { const v = settled() ? find() : null; if (v) { then(v); return } if (++tries < 60) t = setTimeout(tick, 100) }
  t = setTimeout(tick, 60)
  return () => { if (t) clearTimeout(t) }
}
/** Presses the page's Create — the C key's own answer (a registered handler, else the `data-kb="create"` control), with the page's checks — and,
    when that opens a menu, the menu's `pick` row ("Create New Task"). */
function pressCreate(pick: string | null, done?: () => void): () => void {
  let stop = () => {}
  const first = when(() => (layerOpen() ? null : hasHandler('create') ? 'handler' : marked('create')), (v) => {
    done?.()
    if (v === 'handler') runHandler('create'); else press(v)
    if (pick) stop = when(() => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => isVisible(el) && el.textContent?.trim().startsWith(pick)) ?? null, (row) => row.click())
  })
  return () => { first(); stop() }
}
/** Brings a Settings or Company card into view and marks it for a moment (its id, else its data-testid). */
function landOn(anchor: string, mark: string): () => void {
  const find = () => { const el = document.getElementById(anchor) ?? document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(anchor)}"]`); return isVisible(el) ? el : null }
  return when(find, (el) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    if (!mark) return
    el.classList.add(mark)
    setTimeout(() => el.classList.remove(mark), 1800)
  })
}
/** The card links land only where the cards are — Settings and Company. */
const LANDS = /^\/(settings|company)(\/|$)/

const Marked = ({ text, q }: { text: string; q: string }) => <>{marks(text, q).map((p, i) => (p.hit ? <mark key={i} className={styles.mark}>{p.text}</mark> : <span key={i}>{p.text}</span>))}</>

export function GlobalSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const sheet = useSheetLayout()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('all')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const [opened, setOpened] = useState<SearchHit[]>([])
  const [singleKeys] = useFlagPref(SINGLE_KEYS, true)   // (REG-716) the footer names the key that opens the ? panel today
  const panel = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const list = useRef<HTMLDivElement | null>(null)
  const seq = useRef(0)
  const here = `${pathname}${params.size ? `?${params.toString()}` : ''}`

  /* each opening starts fresh — the field empty, All — with what was searched and opened lately one press away */
  const show = useCallback(() => { setRecent(read<string>(RECENT_KEY)); setOpened(read<SearchHit>(OPENED_KEY)); setQuery(''); setScope('all'); setResult(null); setActive(0); setOpen(true) }, [])
  const close = useCallback(() => setOpen(false), [])

  /* Opened by the rail's tile and the phone bar (the event), and by ⌘K / Ctrl K from anywhere a dialog isn't holding the keyboard. */
  useEffect(() => {
    const onOpen = () => { if (open) close(); else show() }   // the tile toggles, as the Company item does
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k' || e.altKey || e.shiftKey) return
      if (!open && document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      markUsed('search')   // (REG-711) the ? panel ticks it
      if (open) close(); else show()
    }
    window.addEventListener(OPEN_SEARCH, onOpen)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener(OPEN_SEARCH, onOpen); window.removeEventListener('keydown', onKey) }
  }, [open, show, close])

  /* A new page closes it (a result was opened, or the member moved on). */
  const [shownFor, setShownFor] = useState(pathname)
  if (shownFor !== pathname) { setShownFor(pathname); if (open) setOpen(false) }

  /* (UX audit V9 · S3) On arrival: a Create row's page presses its Create; a card's link (`#<card>`) brings the card into view. */
  const search = params.toString()
  useEffect(() => {
    const stops: (() => void)[] = []
    const c = readCreate()
    if (c && Date.now() - c.at < 15_000 && c.path === pathname) stops.push(pressCreate(c.pick, () => writeCreate(null)))   // spent once it is pressed
    else if (c && Date.now() - c.at >= 15_000) writeCreate(null)
    const hash = decodeURIComponent(window.location.hash.slice(1))
    if (hash && LANDS.test(pathname)) stops.push(landOn(hash, styles.landed ?? ''))
    return () => stops.forEach((f) => f())
  }, [pathname, search])

  /* The search itself: 120ms after the last key, the newest answer wins. */
  useEffect(() => {
    if (!open || !query.trim()) return
    const id = ++seq.current
    const t = setTimeout(() => {
      setLoading(true)
      globalSearch({ query, scope }).then((r) => { if (seq.current === id) { setResult(r); setLoading(false); setActive(0) } }, () => { if (seq.current === id) setLoading(false) })
    }, 120)
    return () => clearTimeout(t)
  }, [open, query, scope])

  /* Beside the rail, level with the Search tile; closed by a press outside it, Esc (below) or a change of width. */
  const place = useCallback((el: HTMLDivElement | null) => {
    panel.current = el
    if (!el) return
    const tile = document.querySelector<HTMLElement>('[data-search-tile]')
    const rail = tile?.closest('nav')
    const left = rail ? rail.getBoundingClientRect().right + 8 : Math.max(16, (window.innerWidth - el.offsetWidth) / 2)
    const top = tile ? Math.max(8, tile.getBoundingClientRect().top) : 72
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.maxHeight = `${window.innerHeight - top - 16}px`
  }, [])
  useEffect(() => {
    if (!open || sheet) return
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (panel.current?.contains(t) || (t instanceof Element && t.closest('[data-search-tile]'))) return; close() }
    let lastW = window.innerWidth
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; close() } }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown); window.removeEventListener('resize', onResize) }
  }, [open, sheet, close])
  useEffect(() => { if (open) requestAnimationFrame(() => input.current?.focus()) }, [open])

  /* What the list shows: typed → the groups (and "Show all" under All) then the pages; empty → recent searches, recently opened, Go to. */
  const q = query.trim()
  const shown = q && result ? result : null   // while a newer answer loads, the last one stays (dimmed)
  const pages = useMemo(() => (q && scope === 'all' ? pageHits(q).slice(0, 4) : []), [q, scope])
  const creates = useMemo(() => (q && scope === 'all' ? createHits(q) : []), [q, scope])
  const sections: { key: string; label: string; count?: number; items: Item[] }[] = useMemo(() => {
    if (!q) {
      const out: { key: string; label: string; items: Item[] }[] = []
      if (recent.length) out.push({ key: 'recent', label: 'Recent searches', items: recent.map((text) => ({ type: 'recent' as const, text })) })
      if (opened.length) out.push({ key: 'opened', label: 'Recently opened', items: opened.map((hit) => ({ type: 'hit' as const, hit })) })
      out.push({ key: 'go', label: 'Go to', items: JUMP_TO.map((id) => PAGES.find((p) => p.id === id)!).filter(Boolean).map((p) => ({ type: 'hit' as const, hit: { kind: 'page' as const, id: p.id, title: p.title, sub: p.sub, href: p.href, icon: p.icon, rank: 0 } })) })
      out.push({ key: 'create', label: 'Create', items: createHits('').map((hit) => ({ type: 'hit' as const, hit })) })   // (UX audit V9)
      return out
    }
    const groups = (shown?.groups ?? []).map((g) => ({
      key: g.kind, label: g.label, count: g.total,
      items: [...g.hits.map((hit) => ({ type: 'hit' as const, hit })), ...(scope === 'all' && g.total > g.hits.length ? [{ type: 'more' as const, scope: scopeOf(g.kind), label: g.label, total: g.total }] : [])],
    }))
    /* (UX audit V9) Go to and Create close the list — whichever holds the better answer first (a name before a line under it) */
    const tail = [
      ...(pages.length ? [{ key: 'page', label: 'Go to', count: pages.length, items: pages.map((hit) => ({ type: 'hit' as const, hit })), best: pages[0]!.rank }] : []),
      ...(creates.length ? [{ key: 'create', label: 'Create', count: creates.length, items: creates.map((hit) => ({ type: 'hit' as const, hit })), best: creates[0]!.rank }] : []),
    ].sort((a, b) => b.best - a.best)
    return [...groups, ...tail.map((g) => ({ key: g.key, label: g.label, count: g.count, items: g.items }))]
  }, [q, recent, opened, shown, scope, pages, creates])
  const items = sections.flatMap((s) => s.items)
  const at = Math.min(active, Math.max(0, items.length - 1))
  /* each section's first row's place in the keyboard's walk */
  const starts = sections.reduce<number[]>((acc, _s, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + sections[i - 1]!.items.length], [])

  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-index="${at}"]`)?.scrollIntoView({ block: 'nearest' }) }, [at])

  const remember = (text: string) => { const next = [text, ...read<string>(RECENT_KEY).filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, 6); write(RECENT_KEY, next); setRecent(next) }
  const forget = (text: string) => { const next = read<string>(RECENT_KEY).filter((r) => r !== text); write(RECENT_KEY, next); setRecent(next) }
  const choose = (item: Item | undefined, newTab = false) => {
    if (!item) return
    if (item.type === 'recent') { setQuery(item.text); setActive(0); input.current?.focus(); return }
    if (item.type === 'more') { setScope(item.scope); setActive(0); input.current?.focus(); return }
    const { hit } = item
    /* (REG-715, Q-03) Go to › Keyboard shortcuts opens the ? panel over the page you are on */
    if (hit.kind === 'page' && hit.href === '#shortcuts') { setOpen(false); openShortcuts(); return }
    if (q) remember(q)
    if (hit.kind !== 'page' && hit.kind !== 'create') write(OPENED_KEY, [{ ...hit, rank: 0 }, ...read<SearchHit>(OPENED_KEY).filter((h) => !(h.kind === hit.kind && h.id === hit.id))].slice(0, 5))
    const href = hit.kind === 'page' || hit.kind === 'create' ? hit.href : withFrom(hit.href, here)
    if (newTab) { window.open(href, '_blank', 'noopener'); return }
    setOpen(false)
    /* (UX audit V9) a Create row without a landing of its own presses the page's Create once it is there — at once when it is this page */
    const path = href.split(/[?#]/)[0]!
    if (hit.kind === 'create' && !href.includes('?')) {
      const pick = CREATE.find((c) => c.id === hit.id)?.pick ?? null
      if (path === pathname) { pressCreate(pick); return }
      writeCreate(path, pick)
    }
    /* (UX audit S3) a card on this very page: only the hash moves, so the arrival runs here */
    const hash = href.includes('#') ? href.slice(href.indexOf('#') + 1) : ''
    if (hash && path === pathname && LANDS.test(pathname)) { window.history.replaceState(null, '', href); landOn(hash, styles.landed ?? ''); return }
    leaveThen(() => router.push(href))   // (UX audit S2) an unsaved Company / Settings form asks first
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(at + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(at - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[at], e.metaKey || e.ctrlKey) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (query) { setQuery(''); setActive(0) } else close() }
  }

  if (typeof document === 'undefined') return null
  const typing = q.length > 0
  const empty = typing && shown && !loading && sections.length === 0
  const row = (item: Item, key: string, i: number): ReactNode => {
    const on = i === at
    const common = { id: `gs-opt-${i}`, 'data-index': i, role: 'option', 'aria-selected': on, 'data-active': on || undefined, className: styles.row, onMouseMove: () => { if (at !== i) setActive(i) }, onMouseDown: (e: React.MouseEvent) => e.preventDefault() }
    if (item.type === 'recent') {
      return (
        <div key={key} {...common} onClick={() => choose(item)}>
          <span className={styles.glyph}><Icon name="history" size={20} weight={300} /></span>
          <span className={styles.text}><span className={styles.title}>{item.text}</span></span>
          {/* (REG-729) the house 24 bare icon button (r4, its 44 touch overlay) */}
          <IconButton icon="close" label={`Remove “${item.text}” from recent searches`} size={24} variant="bare" iconSize={18} className={styles.forget} onClick={(e) => { e.stopPropagation(); forget(item.text) }} />
        </div>
      )
    }
    if (item.type === 'more') {
      return (
        <div key={key} {...common} className={`${styles.row} ${styles.more}`} onClick={() => choose(item)}>
          <span className={styles.glyph} aria-hidden />
          <span className={styles.text}><span className={styles.moreText}>Show all {item.total} in {item.label}</span></span>
          <Icon name="arrow_forward" size={18} />
        </div>
      )
    }
    const h = item.hit
    return (
      <div key={key} {...common} onClick={(e) => choose(item, e.metaKey || e.ctrlKey)} data-kind={h.kind}>
        <span className={styles.glyph}>{h.person?.color ? <Avatar name={h.person.name} color={h.person.color} size={36} tooltip={false} /> : <Icon name={h.icon} size={20} weight={300} />}</span>
        <span className={styles.text}>
          <span className={styles.title}><Marked text={h.title} q={q} /></span>
          {h.sub ? <span className={styles.sub}><Marked text={h.sub} q={q} /></span> : null}
        </span>
        {h.chip ? <MetaChip>{h.chip}</MetaChip> : null}
        <span className={styles.enter} aria-hidden>↵</span>
      </div>
    )
  }

  const body = (
    <>
      <div className={styles.field}>
        <Icon name="search" size={20} weight={300} />
        <input ref={input} className={styles.input} value={query} placeholder="Search leads, quotes, contracts, tasks, files…" aria-label="Search the studio"
               role="combobox" aria-expanded aria-controls="gs-list" aria-autocomplete="list" aria-activedescendant={items.length ? `gs-opt-${at}` : undefined}
               onChange={(e) => { setQuery(e.target.value); setActive(0) }} onKeyDown={onKeyDown} spellCheck={false} autoComplete="off" />
        {loading ? <span className={styles.spinner} aria-hidden /> : null}
        {query ? <IconButton icon="close" label="Clear the search" size={24} variant="bare" iconSize={18} onClick={() => { setQuery(''); setActive(0); input.current?.focus() }} /> : null}   {/* (REG-729) the house 24 bare icon button */}
        {sheet ? null : <Keys spec="esc" />}   {/* (REG-728) the house key chip */}
      </div>
      <ChipRail className={styles.scopes} label="Search in">
        <Chips label="Search in" options={SCOPES.map((s) => ({ value: s.key, label: s.label }))} value={scope} onChange={(v) => { setScope(v as SearchScope); setActive(0); input.current?.focus() }} />
      </ChipRail>
      <div ref={list} id="gs-list" className={styles.list} role="listbox" aria-label="Results" data-loading={loading || undefined} aria-busy={loading || undefined}>
        {typing && !shown ? (
          <div className={styles.pending}>{[0, 1, 2, 3].map((i) => <span key={i} className={styles.pendingRow}><span className={styles.pendingGlyph} /><span className={styles.pendingText}><span style={{ width: `${[46, 58, 38, 52][i]}%` }} /><span style={{ width: `${[30, 40, 26, 34][i]}%` }} /></span></span>)}</div>
        ) : empty ? (
          <div className={styles.empty} role="status">
            <Icon name="search" size={32} weight={300} />
            <span className={styles.emptyTitle}>Nothing matches “{q}”{scope === 'all' ? '' : ` in ${SCOPES.find((s) => s.key === scope)?.label}`}</span>
            <span className={styles.emptyHelp}>Try a name, a phone number, a quote number like OM-10004, or a room.</span>
            {scope === 'all' ? null : <Button appearance="text" className={styles.emptyAction} onPress={() => { setScope('all'); input.current?.focus() }}>Search everything</Button>}   {/* (REG-729) the DS text button (36) */}
          </div>
        ) : sections.map((s, si) => (
          <div key={s.key} className={styles.group} role="group" aria-label={s.label}>
            <div className={styles.groupHead} data-menu-label="" role="presentation"><span>{s.label}</span>{typeof s.count === 'number' && typing ? <span className={styles.count}>{s.count}</span> : null}</div>   {/* (REG-728) the house group title */}
            {s.items.map((it, j) => row(it, `${s.key}-${j}`, (starts[si] ?? 0) + j))}
          </div>
        ))}
      </div>
      {sheet ? null : (
        <div className={styles.foot} aria-hidden>
          <span><Keys spec="up" /><Keys spec="down" /> to move</span><span><Keys spec="enter" /> to open</span><span><Keys spec="mod+enter" /> in a new tab</span>
          <span className={styles.footEnd}><Keys spec={singleKeys ? '?' : 'mod+/'} /> all shortcuts</span>
        </div>
      )}
    </>
  )

  if (sheet) {
    return (
      <Sheet open={open} onClose={close} title="Search" label="Search" bodyClassName={styles.sheetBody}>
        <div className={styles.sheetInner}>{body}</div>
      </Sheet>
    )
  }
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={styles.panel} role="dialog" aria-label="Search" data-om-menu
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130, transformOrigin: 'top left' }}>
          {body}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
