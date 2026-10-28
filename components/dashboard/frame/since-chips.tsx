'use client'

import { Fragment, useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { leaveThen } from '@/components/company/leave-guard'
import { chipCount, chipSentence, sinceLinkOf, type SinceChip, type SinceData } from '@/lib/dashboard/since'
import styles from '../dashboard.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his mark P-02 · lane D1; **the calm pass 2026-10-26** — his "too busy … simplify", the Claude Design
 * option he took and his correction 4) **Since you were last here** is the greeting line's ONE link, in place of a row of chips: what clients and
 * the team did since the member's last sitting (lib/dashboard/since-queries.ts). One piece of news is its own sentence and opens exactly that —
 * the record, or its Needs you row when it waits on the page (the row scrolls into view and pulses — the house `attention()` moment); a piece
 * that stands for several ("3 new leads · all from Hangout") opens the list of them; more than one piece reads "4 new since Friday" and opens
 * the list of all of it, each opening its own (the house menu, the house sheet on a phone). A piece opened leaves the line for this browser until
 * something newer happens (its key names its newest record); nothing new, no link.
 */
export function SinceLink({ data }: { data: SinceData | null }) {
  const router = useRouter()
  const pressed = usePressed()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const chips = (data?.chips ?? []).filter((c) => !pressed.has(c.key))
  const link = sinceLinkOf(chips, data?.sinceWords ?? null)
  const go = useCallback((chip: SinceChip, href: string) => { press(chip.key); leaveThen(() => router.push(href)) }, [router])
  if (!link) return null
  const one = link.kind === 'one' ? link.chip : null
  const many = link.kind === 'many' ? link.chips : []
  const list = !one || !!one.items?.length
  const onPress = () => {
    if (list) { setOpen(true); return }
    if (one!.rowKey && pulseRow(one!.rowKey)) { press(one!.key); return }
    go(one!, one!.href)
  }
  const title = one ? link.words : `New ${data?.sinceWords ?? 'this week'}`
  return (
    <>
      <span aria-hidden>{'\u00a0· '}</span>
      <span ref={anchor} className={styles.sinceBox} data-testid="since" data-since-kind={one ? one.kind : 'many'}>
        <Link variant="primary" className={styles.sinceLink} onPress={onPress} data-testid="since-link"
              aria-label={one ? `${link.words} — ${list ? 'see which' : 'open it'}` : `${link.words} — see what`} aria-haspopup={list ? 'menu' : undefined} aria-expanded={list ? open : undefined}>
          {link.words}
        </Link>
        {list ? (
          <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} width={MENU_WIDTH.detail} role="menu" sheetTitle={title}>
            {one ? <ChipList chip={one} go={go} close={() => setOpen(false)} /> : (
              <>
                {/* the list's title, unless its first piece opens with its own (two titles in a row read as one too many) */}
                {many[0]?.items?.length ? null : <DropdownLabel>{title}</DropdownLabel>}
                {many.map((c, i) => (
                  <Fragment key={c.key}>
                    {/* a group of several stands apart: a rule before it, and before the first single piece after one */}
                    {i > 0 && (c.items?.length || many[i - 1]!.items?.length) ? <DropdownDivider /> : null}
                    {c.items?.length ? <ChipList chip={c} go={go} close={() => setOpen(false)} /> : (
                      <span data-testid={`since-${c.kind}`} data-since-key={c.key} data-count={chipCount(c)} className={styles.menuRow}>
                        <DropdownItem onSelect={() => {
                          setOpen(false)
                          if (c.rowKey && pulseRow(c.rowKey)) { press(c.key); return }
                          go(c, c.href)
                        }}>
                          <span className={styles.menuCheck}><Icon name={c.icon} size={20} />{chipSentence(c.words)}</span>
                        </DropdownItem>
                      </span>
                    )}
                  </Fragment>
                ))}
              </>
            )}
          </PortalMenu>
        ) : null}
      </span>
    </>
  )
}

/** One piece that stands for several records: its sentence as the list's label, each record a row opening exactly that, then its home. */
function ChipList({ chip, go, close }: { chip: SinceChip; go: (chip: SinceChip, href: string) => void; close: () => void }) {
  return (
    <span data-testid={`since-${chip.kind}`} data-since-key={chip.key} data-count={chipCount(chip)} className={styles.menuRow}>
      <DropdownLabel>{chipSentence(chip.words)}</DropdownLabel>
      {(chip.items ?? []).map((it) => (
        <span key={it.key} data-testid="since-item" className={styles.menuRow}>
          <DropdownItem help={it.sub} onSelect={() => { close(); go(chip, it.href) }}>{it.label}</DropdownItem>
        </span>
      ))}
      {chip.all ? (
        <span data-testid="since-all" className={styles.menuRow}><DropdownItem onSelect={() => { close(); go(chip, chip.all!.href) }}>{chip.all.label}</DropdownItem></span>
      ) : null}
    </span>
  )
}

/** (brief § 4, shared marks) The Needs you row a piece of news stands for, when it is on the page — its key, or a key that carries the record's
    id (`project:<id>:money:confirm:<paymentId>`): brought into view and pulsed once (the house fresh pulse, dashboard.module.css). False when
    the row isn't drawn (folded under "Show all", filtered out, cleared) — the news then opens its record. */
function pulseRow(key: string): boolean {
  const q = (sel: string) => document.querySelector<HTMLElement>(sel)
  const esc = key.replace(/["\\]/g, '\\$&')
  const row = q(`[data-inbox-row="${esc}"]`) ?? q(`[data-inbox-row*="${esc}"]`)
  if (!row) return false
  row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  row.removeAttribute('data-fresh')
  void row.offsetWidth   // a second press replays the pulse
  row.setAttribute('data-fresh', '')
  window.setTimeout(() => row.removeAttribute('data-fresh'), 1500)
  return true
}

/* ── which news this browser has opened (per browser, never the studio's: `om.dash.since`, pruned after 30 days) ── */
const STORE = 'om.dash.since'
const KEEP_MS = 30 * 86_400_000
const listeners = new Set<() => void>()
let cache: Set<string> | null = null
const EMPTY = new Set<string>()
function read(): Set<string> {
  if (cache) return cache
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Record<string, number>
    cache = new Set(Object.keys(raw))
  } catch { cache = new Set() }
  return cache
}
function press(key: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Record<string, number>
    const now = Date.now()
    const kept = Object.fromEntries(Object.entries(raw).filter(([, at]) => typeof at === 'number' && now - at < KEEP_MS))
    kept[key] = now
    localStorage.setItem(STORE, JSON.stringify(kept))
    cache = new Set(Object.keys(kept))
  } catch { cache = new Set([...(cache ?? []), key]) }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => { if (e.key === STORE || e.key === null) { cache = null; l() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage) }
}
function usePressed(): Set<string> {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
