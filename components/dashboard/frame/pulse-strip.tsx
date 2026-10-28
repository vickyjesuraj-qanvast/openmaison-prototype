'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { StatTile } from '@/components/om/stat-tile'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { leaveThen } from '@/components/company/leave-guard'
import { AiMark } from '@/components/writing/writing-help'
import { askAbout } from '@/components/maison-ai/dock/maison-dock'
import type { PulseData, PulseFigure } from '@/lib/dashboard/pulse'
import styles from '../dashboard.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his marks P-03 · Q-04 · lane D1; **the calm pass 2026-10-26** — his "data looks fine … visually it
 * looks too busy" and the Claude Design option he took, brief-calm.md § 1 Pulse · § 2.2) **Pulse**: the role's figures as white cards in a
 * row (the house number tile, `look="card"`): a small capitals label, the value, ONE caption line and at most ONE quiet visual — a thin line
 * of its weeks (Won, First response, Leads, Coming in) or Owed to you's age bar, its over-60 part amber (a client's lateness is theirs, never
 * red). The comparison and the grade moved off the face into the figure's name and its breakdown. A press opens the figure's report
 * (`?from=/dashboard`); a mouse resting on a figure, a long press on touch, or ↓ on a focused one shows it taken apart — by source, by age, by
 * project — with its doors and the dock's Ask about it. A figure whose report the role doesn't open presses to that breakdown instead.
 * Widths: the cards in one row at a desk and a tablet held sideways; two across upright and on a phone.
 */
export function PulseStrip({ data }: { data: PulseData | null }) {
  if (!data?.figures.length) return null
  return (
    <div className={styles.pulse} data-card="pulse" data-testid="pulse" role="region" aria-label="Pulse — how the studio is doing">
      <div className={styles.pulseTiles} data-testid="stands-tiles" style={{ '--pulse-n': data.figures.length } as CSSProperties}>
        {data.figures.map((f) => <Figure key={f.key} f={f} />)}
      </div>
    </div>
  )
}

const HOVER_MS = 450, HOLD_MS = 480

function Figure({ f }: { f: PulseFigure }) {
  const router = useRouter()
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<null | 'hover' | 'key' | 'hold'>(null)
  const timer = useRef<number | null>(null)
  const held = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const clear = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clear, [])
  const breaks = f.breakdown ?? []
  const can = breaks.length > 0
  const go = (href: string) => leaveThen(() => router.push(href))

  /* a mouse resting on the figure opens its breakdown; leaving both the figure and the breakdown closes it */
  const enter = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || !can) return; clear(); timer.current = window.setTimeout(() => setOpen((o) => o ?? 'hover'), HOVER_MS) }
  const leave = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; clear(); timer.current = window.setTimeout(() => setOpen((o) => (o === 'hover' ? null : o)), 180) }
  /* a long press on touch opens it (the house sheet on a phone); the tap that follows is the press's own, never a navigation */
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || !can) return
    held.current = false; start.current = { x: e.clientX, y: e.clientY }; clear()
    timer.current = window.setTimeout(() => { held.current = true; setOpen('hold') }, HOLD_MS)
  }
  const move = (e: PointerEvent) => { const s = start.current; if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) { clear(); start.current = null } }
  const up = () => { clear(); start.current = null }
  const key = (e: KeyboardEvent) => { if (can && (e.key === 'ArrowDown' || e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) { e.preventDefault(); setOpen('key') } }

  const press = f.href ? { href: f.href, label: f.aria } : can ? { onPress: () => setOpen('key'), label: f.aria } : undefined
  /* the caption's parts — a client's lateness amber, ours and late red (S-05), the rest the secondary ink */
  const caption = f.caption.length ? f.caption.map((p, i) => (p.tone ? <span key={i} className={p.tone === 'late' ? styles.late : styles.theirs}>{p.t}</span> : <span key={i}>{p.t}</span>)) : undefined
  /* the comparison, off the card's face: the breakdown's title says it ("By source · this week — ▲ 3 vs last week") */
  const title = [f.breakdownTitle ?? f.label, f.grade && f.key === 'response' ? f.grade.label : null, f.delta?.title ?? f.delta?.text].filter(Boolean).join(' · ')
  return (
    <div ref={box} className={styles.figure} data-testid={`figure-${f.key}`}
         onPointerEnter={enter} onPointerLeave={leave} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
         onContextMenu={(e) => { if (can && (start.current || held.current)) e.preventDefault() }}
         onClickCapture={(e) => { if (held.current) { e.preventDefault(); e.stopPropagation(); held.current = false } }} onKeyDown={key}>
      <StatTile look="card" label={f.label} value={f.value} testId={`tile-${f.key}`} press={press} help={caption}
                spark={f.trend ? { values: f.trend, label: `${f.label}: ${f.trendWords ?? 'each week'}`, ahead: f.ahead, target: f.target } : undefined}
                aging={f.aging} />
      {can ? (
        <PortalMenu open={open !== null} anchor={box} onClose={() => setOpen(null)} width={MENU_WIDTH.detail} role="menu" sheetTitle={f.label} autoFocus={open === 'key'}>
          <div onPointerEnter={() => { clear() }} onPointerLeave={(e) => leave(e)} data-testid={`breakdown-${f.key}`}>
            <DropdownLabel>{title}</DropdownLabel>
            {breaks.map((b) => (
              <DropdownItem key={b.label} meta={b.value} onSelect={() => { setOpen(null); const to = b.href || f.href; if (to) go(to) }}>{b.label}</DropdownItem>
            ))}
            <DropdownDivider />
            {f.href ? <DropdownItem onSelect={() => { setOpen(null); go(f.href) }}>{f.openLabel ?? 'Open the report'}</DropdownItem> : null}
            <DropdownItem onSelect={() => { setOpen(null); askAbout('pulse') }}><span className={styles.menuCheck}><AiMark />Ask Maison AI about this</span></DropdownItem>
          </div>
        </PortalMenu>
      ) : null}
    </div>
  )
}
