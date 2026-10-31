'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Chip } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Drawer } from '@/components/om/drawer'
import { Sheet } from '@/components/om/sheet'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, DropdownLabel } from '@/components/leads/dropdown'
import { AnswerBody } from '@/components/shell/maison-answer'
import { usePlanRunner } from '@/components/shell/maison-plans'
import { useResetPrototype } from '@/components/maison-ai/reset-prototype'
import { leaveThen } from '@/components/company/leave-guard'
import { MOBILE, PHONE_SIDEWAYS, useMediaQuery } from '@/lib/breakpoint'
import { isAskKey, keyboardHeldElsewhere, useDockPresence, useMaisonAsk, type MaisonReceipt, type MaisonRow } from '@/lib/maison-ai'
import { answerQuestion } from '@/lib/maison-ai/answer'
import { fetchAskHistory } from '@/lib/maison-ai/history'
import { markUsed } from '@/lib/keys/store'
import { withFrom } from '@/lib/nav'
import { DASHBOARD } from '@/lib/dashboard/model'
import { FIELD_PLACEHOLDER, FIELD_PLACEHOLDER_SHORT, FOLLOW_UP_PLACEHOLDER, isShortAnswer, type DockContext, type DockData } from '@/lib/dashboard/dock'
import { DockComposer } from './dock-composer'
import { DockEntryView, failedAnswer, type DockEntry } from './dock-entry'
import { requestAbout, setDockPresent, setDockShrunk, useAboutRequest, useDockShrunk } from './dock-store'
import styles from './maison-dock.module.css'

/** A conversation keeps its last three questions (brief § D4 "a thread of the last three"); Recent keeps the rest. */
const KEEP = 3
/** Past this the reading line shows — rule answers come back sooner, so it never flickers (D §4 ·5). */
const SLOW_MS = 500
/** A finger's jitter is not a scroll (the floating button's own dead zone, components/shell/maison-fab.tsx). */
const DEADZONE = 6
const UPRIGHT_TABLET = '(min-width: 768px) and (max-width: 1023px)'
/** (the close-out round 2026-10-31) Runs once the press under way has landed — after its pointerup and the click that follows it. */
function afterPress(run: () => void) {
  let done = false
  const go = () => { if (done) return; done = true; window.removeEventListener('pointerup', go, true); window.removeEventListener('pointercancel', go, true); window.setTimeout(run, 0) }
  window.addEventListener('pointerup', go, true)
  window.addEventListener('pointercancel', go, true)
}

/** (the Dashboard redesigned 2026-10-26 — the contract, brief § 4) A card's Ask: puts that card in the docked field's context — its questions
    replace the three suggestions, and the next question is read in its words — and, given a question, asks it about that card straight away
    (a Needs you row's "Ask about this", Your day's "Prepare me"). Cards call it from their heads (lanes D1–D3). */
export function askAbout(card: string, question?: string): void { requestAbout(card, question ?? null) }

/** The card head's Ask (the review page's "✦ Ask" at each card head's right): the design system's quiet text button with Maison AI's spark —
    one piece, so every card's Ask reads and behaves the same. `label` names the card for a screen reader ("Ask Maison AI about Pipeline"). */
export function DockAsk({ card, label }: { card: string; label: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  const spark = <img src="/figma-assets/brief-sparkle.svg" width={14} height={14} alt="" />
  return (
    <Tooltip label={`Ask Maison AI about ${label}`}>
      <Button variant="secondary" appearance="text" onPress={() => askAbout(card)} aria-label={`Ask Maison AI about ${label}`} data-testid={`dock-ask-${card}`} iconStart={spark}>Ask</Button>
    </Tooltip>
  )
}

type Layout = 'desk' | 'tablet' | 'phone' | 'sideways'

/** As you type: the page's questions (the card's first, then the three, every other one the page offers, your Recent) that hold every word you
    typed at a word's start — four at most, never the words themselves. */
export function typedMatches(text: string, pool: string[]): string[] {
  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '')
  const words = text.split(/\s+/).map(clean).filter((w) => w.length >= 2)
  if (!words.length) return []
  const said = text.trim().toLowerCase()
  return [...new Set(pool)].filter((q) => {
    const qw = q.split(/\s+/).map(clean).filter(Boolean)
    return q.toLowerCase() !== said && words.every((w) => qw.some((x) => x.startsWith(w)))
  }).slice(0, 4)
}

/**
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-10 · P-12 · Q-01 · Q-02 · Q-03 · Q-09 · Q-12 and his note on the buttons, lane D4)
 * **Maison AI, docked** — "the card that we have for Maison AI can be more sticky, like how your Claude chat input is". The field sits at the
 * foot of the page's content, the cards scrolling under a soft fade, with three suggestions written by rule from today's records above it
 * (lib/dashboard/dock-queries.ts); every card's Ask puts that card in its context (`askAbout`). By width (brief § 3 · C §5.4):
 *   · **desk ≥1024** (a tablet held sideways included): the field docked at 640, centred on the content; a short answer grows above the field,
 *     at its width, as a thread of the last three — Stop while it reads, Retry when it couldn't, Esc or a press elsewhere folds it, the field's
 *     focus brings it back; a long answer and every proposal open in the house Drawer beside the cards (Q-01), the thread keeping a line for
 *     them; a change run there comes back as a receipt with its Undo;
 *   · **a tablet held upright (768–1023)**: the field docked at the foot at 16px; a press opens the house Sheet, which holds the conversation;
 *   · **a phone**: a field-shaped button just above the bottom dock that shrinks into a ✦ at the dock's end while the page scrolls down and comes
 *     back on the way up; a tap opens the Sheet — the answers, the suggestions and the field at its foot, which the keyboard lifts
 *     (`visualViewport`); a phone held sideways keeps the ✦ alone.
 * ⌘J / Ctrl J focuses it (Q-09); a question asked from the page (`askMaisonAi`) is answered here (Q-02 — the floating button steps aside on
 * the Dashboard, components/shell/maison-ai.tsx). No voice (Q-12). Answers come from the records by rule (lib/maison-ai/answer.ts) — no
 * model, no credits — and every proposal runs the house action behind its one button.
 *
 * (the calm pass 2026-10-26, lane C4 — his "data looks fine … but visually it looks too busy", the Claude Design option and his yes to its
 * layout with six corrections, brief-calm § 1 · § 2.1 · § 2.4) **At rest the dock is one white pill** — the spark, the words, ⌘J and the send
 * (neutral until there is text) — on the page's own grey, nothing else. The field **in use** (its focus, a card's Ask putting its context in,
 * the +'s menu open, the answers out) brings the rest back: the three suggestions above the pill (or the card's questions), the card's chip
 * in it, the + beside the send (⌘J gives it the place — you are already here). They fold away when the field lets go with nothing asked:
 * a press elsewhere, Esc, Tab out — and a card's context that asked nothing goes with them. A tablet held upright keeps the pill alone (its
 * sheet holds the suggestions, as built); the phone's accessory is unchanged.
 */
export function MaisonDock({ data }: { data: DockData }) {
  useDockPresence()
  const router = useRouter()
  const phone = useMediaQuery(MOBILE)
  const sideways = useMediaQuery(PHONE_SIDEWAYS)
  const upright = useMediaQuery(UPRIGHT_TABLET)
  const mouse = useMediaQuery('(hover: hover)')
  const layout: Layout = phone ? 'phone' : sideways ? 'sideways' : upright ? 'tablet' : 'desk'
  const desk = layout === 'desk'
  const layoutRef = useRef(layout)
  useEffect(() => { layoutRef.current = layout })

  /* ── the conversation ── */
  /* the exchanges and the counter that names them — one state, so a question asked from the page (render-phase) names its own */
  const [conv, setConv] = useState<{ seq: number; entries: DockEntry[] }>({ seq: 0, entries: [] })
  const entries = conv.entries
  const setEntries = useCallback((f: (list: DockEntry[]) => DockEntry[]) => setConv((c) => ({ ...c, entries: f(c.entries) })), [])
  const [text, setText] = useState('')
  const [about, setAbout] = useState<DockContext | null>(null)
  const [folded, setFolded] = useState(false)
  const [paneId, setPaneId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const deskInput = useRef<HTMLTextAreaElement | null>(null)
  const sheetInput = useRef<HTMLTextAreaElement | null>(null)
  const root = useRef<HTMLDivElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  const addQuestion = useCallback((q: string, o: { about?: DockContext | null; record?: boolean; projectId?: string | null; milestoneId?: string | null } = {}) => {
    const words = q.replace(/\s+/g, ' ').trim()
    if (!words) return
    /* one question out at a time: a new one stops the one still reading; the last three are kept */
    setConv((c) => {
      const id = c.seq + 1
      const next: DockEntry = { id, q: words, about: o.about ?? null, record: o.record !== false, projectId: o.projectId ?? null, milestoneId: o.milestoneId ?? null, state: 'reading', slow: false, answer: null, proposal: null, inPane: false, dismissed: false, receipt: null }
      return { seq: id, entries: [...c.entries.map((x) => (x.state === 'reading' ? { ...x, state: 'stopped' as const } : x)).slice(-(KEEP - 1)), next] }
    })
    setFolded(false)
  }, [])

  /* the questions out are read by the effect below — a request is data; the effect performs it, and only its answer sets state */
  const inflight = useRef(new Set<number>())
  const receiptFor = useRef<number | null>(null)
  const onReceipt = useCallback((r: MaisonReceipt) => {
    const id = receiptFor.current
    if (id === null) return
    setEntries((list) => list.map((x) => (x.id === id ? { ...x, receipt: { ...r, after: null, undoing: false } } : x)))
  }, [setEntries])
  const planned = usePlanRunner({ onReceipt })
  useEffect(() => {
    for (const e of entries) {
      if (e.state !== 'reading' || inflight.current.has(e.id)) continue
      inflight.current.add(e.id)
      const slow = window.setTimeout(() => setEntries((list) => list.map((x) => (x.id === e.id && x.state === 'reading' ? { ...x, slow: true } : x))), SLOW_MS)
      answerQuestion({ question: e.q, path: DASHBOARD, record: e.record, about: e.about?.key ?? null, projectId: e.projectId, milestoneId: e.milestoneId })
        .then((answer) => {
          const wide = layoutRef.current === 'desk'
          const proposal = answer.plan ? planned(answer.plan) : null
          const long = wide && !failedAnswer(answer) && (!!proposal || !isShortAnswer(answer))
          setEntries((list) => list.map((x) => (x.id === e.id && x.state === 'reading' ? { ...x, state: 'done', answer, proposal, inPane: long } : x)))
          if (long) setPaneId(e.id)   // the newest long answer takes the pane; the one it held keeps its line in the thread
        }, () => setEntries((list) => list.map((x) => (x.id === e.id && x.state === 'reading' ? { ...x, state: 'failed' } : x))))
        .finally(() => { window.clearTimeout(slow); inflight.current.delete(e.id) })
    }
  }, [entries, planned, setEntries])

  const reading = entries.some((e) => e.state === 'reading')
  const submit = () => { if (!text.trim()) return; addQuestion(text, { about, record: true }); setText('') }
  const askChip = (q: string) => { addQuestion(q, { about, record: false }); if (!desk) setSheetOpen(true) }
  const stop = () => setEntries((list) => list.map((x) => (x.state === 'reading' ? { ...x, state: 'stopped' } : x)))
  const retry = (e: DockEntry) => setEntries((list) => list.map((x) => (x.id === e.id ? { ...x, state: 'reading', slow: false, answer: null, proposal: null, inPane: false, receipt: null, dismissed: false } : x)))
  const open = useCallback((href: string) => {
    setPaneId(null); setSheetOpen(false)
    const to = href.startsWith('/') && !href.includes('from=') ? withFrom(href, DASHBOARD) : href
    leaveThen(() => router.push(to))
  }, [router])
  const onRow = (r: MaisonRow) => {
    if (r.ask) { addQuestion(r.ask, { about, record: false }); return }
    if (r.run) { setPaneId(null); setSheetOpen(false); r.run(); return }
    if (r.href) open(r.href)
  }
  const confirm = async (e: DockEntry) => {
    if (!e.proposal) return
    receiptFor.current = e.id
    const ok = await e.proposal.run().catch(() => false)
    receiptFor.current = null
    if (ok) { setPaneId((p) => (p === e.id ? null : p)); setFolded(false) }
  }
  const undo = (e: DockEntry) => {
    const r = e.receipt
    if (!r?.undo) return
    setEntries((list) => list.map((x) => (x.id === e.id && x.receipt ? { ...x, receipt: { ...x.receipt, undoing: true } } : x)))
    void r.undo.run().then((err) => setEntries((list) => list.map((x) => (x.id === e.id && x.receipt ? { ...x, receipt: { ...x.receipt, undoing: false, after: err ? `Couldn’t take it back — ${err}` : r.undo!.done, undo: err ? x.receipt.undo : undefined } } : x))))
  }
  const notNow = (e: DockEntry) => { setEntries((list) => list.map((x) => (x.id === e.id ? { ...x, dismissed: true } : x))); setPaneId((p) => (p === e.id ? null : p)) }
  const clear = () => { setEntries(() => []); setPaneId(null); setFolded(false); (desk ? deskInput : sheetInput).current?.focus() }

  /* ── a card's Ask, a question asked from the page, ⌘J ── */
  const [focusAsk, setFocusAsk] = useState(0)
  const aboutReq = useAboutRequest()
  const [seenAbout, setSeenAbout] = useState(aboutReq?.n ?? 0)
  if (aboutReq && aboutReq.n !== seenAbout) {
    setSeenAbout(aboutReq.n)
    const ctx = data.contexts.find((c) => c.key === aboutReq.card) ?? null
    setAbout(ctx)
    if (aboutReq.question) addQuestion(aboutReq.question, { about: ctx, record: false })
    if (!desk) setSheetOpen(true)
    else if (!aboutReq.question) setFocusAsk((n) => n + 1)
  }
  const fromPage = useMaisonAsk()
  const [seenPage, setSeenPage] = useState(fromPage?.n ?? 0)
  if (fromPage && fromPage.n !== seenPage) {
    setSeenPage(fromPage.n)
    addQuestion(fromPage.text, { record: true, projectId: fromPage.projectId ?? null, milestoneId: fromPage.milestoneId ?? null })
    if (!desk) setSheetOpen(true)
  }
  useEffect(() => {
    if (!focusAsk) return
    const el = deskInput.current
    el?.focus(); if (el) el.selectionStart = el.selectionEnd = el.value.length
  }, [focusAsk])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isAskKey(e) || e.defaultPrevented || keyboardHeldElsewhere()) return
      e.preventDefault()
      markUsed('maison')
      if (layoutRef.current === 'desk') { setFolded(false); deskInput.current?.focus() }
      else { setSheetOpen(true); requestAnimationFrame(() => requestAnimationFrame(() => sheetInput.current?.focus())) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── the desk's thread: folds on Esc and on a press elsewhere, and keeps its end in view ── */
  const inThread = entries.length > 0 && desk && !folded
  useEffect(() => {
    if (!inThread) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t || root.current?.contains(t)) return
      if (t.closest('[role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [data-snackbar]')) return
      /* (the close-out round 2026-10-31, bug fix) folded once the press has landed — folding lets the band go to rest (the suggestions leave),
         the page's end loses their height and, scrolled to the end, the page moved under the pointer: the click missed what was pressed */
      afterPress(() => setFolded(true))
    }
    /* (the Dashboard's closing pass, 2026-10-26) Esc folds the thread wherever the keyboard is — a question asked from a card (Your day's
       Prepare me) leaves focus on that card's button, and the thread's own key handlers never heard it; an open dialog, menu or sheet takes
       its Esc first */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return
      setFolded(true)
    }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onKey) }
  }, [inThread])
  const last = entries[entries.length - 1]
  const lastKey = `${last?.id ?? 0}:${last?.state ?? ''}:${last?.receipt ? 'r' : ''}:${last?.slow ? 's' : ''}`
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastKey, inThread])
  /* a long answer opens beside the page — the conversation goes on in the pane, so the thread steps back */
  const [paneWas, setPaneWas] = useState(paneId)
  if (paneId !== paneWas) { setPaneWas(paneId); if (paneId !== null) setFolded(true) }
  /* ── (the calm pass, C4) the field in use: its focus — or a press still landing inside the band (a chip, the +) —, the +'s menu, the answers ── */
  const [focused, setFocused] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const pressing = useRef(false)
  const engaged = desk && (focused || plusOpen || inThread)
  const holdsFocus = () => !!root.current?.contains(document.activeElement)
  useEffect(() => {
    /* a press inside the band settles after its click (Safari never focuses a pressed button): only then is "the focus left" read —
       (the close-out round 2026-10-31, bug fix) and a press anywhere else too: the field let go mid-press brought the band to rest and the
       page's end lost the suggestions' height, so a page scrolled to its end moved under the pointer and the click missed (a Your day row's ⋮) */
    const down = () => { pressing.current = true }
    const up = () => {
      if (!pressing.current) return
      window.setTimeout(() => { pressing.current = false; if (!root.current?.contains(document.activeElement)) setFocused(false) }, 0)
    }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true) }
  }, [])
  /* the field let go with nothing asked: a card's context goes with the suggestions (asked about, it stays for the answers' return) */
  const [engagedWas, setEngagedWas] = useState(engaged)
  if (engaged !== engagedWas) {
    setEngagedWas(engaged)
    if (!engaged && about && !entries.some((e) => e.about?.key === about.key)) setAbout(null)
  }
  const onPlus = (open: boolean) => {
    setPlusOpen(open)
    /* the menu gave the focus back (or not): the band reads where it went once the menu has gone */
    if (!open) requestAnimationFrame(() => setFocused(holdsFocus()))
  }

  const escape = () => {
    if (desk && inThread) { setFolded(true); return true }
    if (!desk && sheetOpen) { setSheetOpen(false); return true }
    /* (the calm pass, C4) nothing out: Esc lets go of the field — the pill comes to rest */
    if (desk && focused && holdsFocus()) { (document.activeElement as HTMLElement | null)?.blur(); setFocused(false); return true }
    return false
  }

  /* ── the page's snackbar rests above the docked band (the house offset, REG-302); the phone's above the accessory while it is out ── */
  const band = useRef<HTMLDivElement | null>(null)
  const shrunk = useDockShrunk()
  useEffect(() => {
    const root = document.documentElement
    if (phone) {
      if (shrunk) root.style.removeProperty('--bottom-dock'); else root.style.setProperty('--bottom-dock', '58px')   // the accessory's 48 and its 10
      return () => root.style.removeProperty('--bottom-dock')
    }
    if (sideways) return
    const el = band.current
    if (!el) return
    /* the snackbar rests at 24 + this from the foot: the band's height (its 16 below and 8 above make up the 24) puts it 8 over the band's top */
    const write = () => root.style.setProperty('--bottom-dock', `${Math.max(0, Math.round(el.getBoundingClientRect().height))}px`)
    write()
    const ro = new ResizeObserver(write)
    ro.observe(el)
    return () => { ro.disconnect(); root.style.removeProperty('--bottom-dock') }
  }, [phone, sideways, shrunk])

  /* ── the phone's accessory: it shrinks into the ✦ at the bottom dock's end while the page scrolls down; a phone held sideways keeps it shrunk ── */
  useEffect(() => {
    setDockPresent(true)
    return () => { setDockPresent(false); setDockShrunk(false); document.body.removeAttribute('data-om-dock-spark') }
  }, [])
  useEffect(() => {
    if (sideways) { setDockShrunk(true); return }
    if (!phone) { setDockShrunk(false); return }
    let lastY = window.scrollY
    let frame = 0
    const apply = () => {
      frame = 0
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (y <= 24 || y >= max - 2) { lastY = y; setDockShrunk(false); return }
      const d = y - lastY
      if (Math.abs(d) < DEADZONE) return
      lastY = y
      setDockShrunk(d > 0)
    }
    const later = () => { if (!frame) frame = requestAnimationFrame(apply) }
    apply()
    window.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    return () => { window.removeEventListener('scroll', later); window.removeEventListener('resize', later); if (frame) cancelAnimationFrame(frame) }
  }, [phone, sideways])
  useEffect(() => { document.body.toggleAttribute('data-om-dock-spark', phone && shrunk) }, [phone, shrunk])

  /* ── the sheet follows the on-screen keyboard (iOS and Chrome shrink only the visual viewport) ── */
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!sheetOpen || !vv) return
    const follow = () => setLift(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    const first = requestAnimationFrame(follow)
    vv.addEventListener('resize', follow)
    vv.addEventListener('scroll', follow)
    return () => { cancelAnimationFrame(first); vv.removeEventListener('resize', follow); vv.removeEventListener('scroll', follow); setLift(0) }
  }, [sheetOpen])
  const openSheet = (focus: boolean) => {
    setSheetOpen(true)
    if (focus) requestAnimationFrame(() => requestAnimationFrame(() => sheetInput.current?.focus()))
  }
  const [sheetWas, setSheetWas] = useState(sheetOpen)
  if (sheetOpen !== sheetWas) { setSheetWas(sheetOpen); if (!sheetOpen && desk) setFolded(false) }
  /* a phone held upright turning into the desk (or back) takes the conversation with it: the sheet closes on the desk, the pane on a tablet */
  const [layoutWas, setLayoutWas] = useState(layout)
  if (layout !== layoutWas) { setLayoutWas(layout); if (desk) setSheetOpen(false); else setPaneId(null) }

  /* ── Recent (the member's own questions, lib/maison-ai/history.ts) for the suggestions as you type ── */
  const [recent, setRecent] = useState<string[] | null>(null)
  const loadRecent = () => { if (recent === null) { setRecent([]); void fetchAskHistory().then((h) => setRecent(h.map((x) => x.question)), () => {}) } }

  /* ── the suggestions above the field: the three (or the card's questions), or — as you type — the page's questions that hold your words ── */
  const typed = typedMatches(text, [...(about?.asks ?? []), ...data.chips.map((c) => c.ask), ...data.asks, ...(recent ?? [])])
  const chipList: { key: string; label: string; icon: string; ask: string }[] = typed.length
    ? typed.map((q, i) => ({ key: `t${i}`, label: q, icon: 'history', ask: q }))
    : about ? about.asks.map((q, i) => ({ key: `a${i}`, label: q, icon: about.icon, ask: q })) : data.chips
  const chipsRow = (place: 'dock' | 'sheet') => chipList.length ? (
    <div className={styles.chips} data-place={place} role="group" aria-label={typed.length ? 'Questions with your words' : about ? `Questions about ${about.label}` : 'Suggestions'} data-testid={`dock-chips-${place}`}>
      {chipList.map((c) => (
        <Chip key={c.key} variant="action" iconStart={<Icon name={c.icon} size={18} />} onPress={() => { setText(''); askChip(c.ask) }} className={styles.chip} data-testid="dock-chip">{c.label}</Chip>
      ))}
    </div>
  ) : null

  /* ── + : the tools that read a file for you (Maison AI's own `attach` answer), and the prototype's reset (the sheet's foot, everywhere else) ── */
  const reset = useResetPrototype()
  const plus = (place: 'dock' | 'sheet') => <PlusMenu place={place} tools={!!data.tools} onOpen={open} onReset={reset.ask} onOpenChange={place === 'dock' ? onPlus : undefined} />
  /* a folded thread can take the focused control with it (a removed element fires no blur): read where the focus is once it has gone */
  useEffect(() => {
    if (inThread) return
    const f = requestAnimationFrame(() => setFocused(!!root.current?.contains(document.activeElement)))
    return () => cancelAnimationFrame(f)
  }, [inThread])

  const thread = (inline: boolean) => entries.map((e) => (
    <DockEntryView key={e.id} e={e} inline={inline} onRetry={retry} onReopen={(x) => setPaneId(x.id)} onRow={onRow} onAsk={(q) => addQuestion(q, { about, record: false })}
                   onOpen={open} onNotNow={notNow} onConfirm={confirm} onUndo={undo} />
  ))
  const pane = paneId !== null ? entries.find((e) => e.id === paneId) ?? null : null
  const paneProposal = pane?.proposal && !pane.receipt && !pane.dismissed ? pane.proposal : null
  const [paneBusy, setPaneBusy] = useState(false)

  /* (the calm pass, C4) the pill at rest carries the spark, the words, ⌘J and the send; the card's chip and the + join it while it is in use */
  const composer = (place: 'dock' | 'sheet') => {
    const live = place === 'sheet' || engaged
    const chip = live ? about : null
    return (
      <DockComposer value={text} onChange={(v) => { setText(v); loadRecent() }} onSubmit={submit} onStop={stop} reading={reading} about={chip}
                    onClearAbout={() => { setAbout(null); if (place === 'dock') deskInput.current?.focus() /* the pill stays in use: the caret goes back to the words */ }}
                    placeholder={place === 'sheet' && entries.length ? FOLLOW_UP_PLACEHOLDER : chip ? `Ask about ${chip.label}…` : layout === 'desk' ? FIELD_PLACEHOLDER : FIELD_PLACEHOLDER_SHORT}
                    inputRef={place === 'dock' ? deskInput : sheetInput} menu={live ? plus(place) : null} keyHint={mouse && (place === 'sheet' || !engaged)} onEscape={escape}
                    onFocus={() => { loadRecent(); if (desk && entries.length) setFolded(false) }} place={place} testId={place === 'dock' ? 'dock-field' : 'dock-sheet-field'} />
    )
  }

  return (
    <>
      {/* the band at the content's foot — sticky, so the page's end keeps its height and the cards scroll under its fade */}
      <div ref={root} className={styles.dock} data-layout={layout} data-maison-dock="" data-testid="maison-dock" data-open={inThread || undefined} data-pane={desk && pane ? '' : undefined}
           data-engaged={engaged || undefined}
           onFocus={() => setFocused(true)}
           onBlur={(e) => { if (pressing.current || root.current?.contains(e.relatedTarget as Node | null)) return; setFocused(false) }}
           onKeyDown={(e) => { if (e.key === 'Escape' && escape()) { e.preventDefault(); e.stopPropagation() } }}>
        {desk && inThread ? (
          /* the answers above the field, at its width, over a wash the width of the page's column (a press on the wash folds them) */
          <div className={styles.threadWrap} data-testid="dock-thread" onClick={(e) => { if (e.target === e.currentTarget) setFolded(true) }}>
            <div className={styles.threadInner}>
              <div className={styles.threadHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.threadSpark} src="/figma-assets/brief-sparkle.svg" width={16} height={16} alt="" />
                <span className={styles.threadName}>Maison AI</span>
                <span className={styles.threadMeta}>Answers from your records</span>
                <span className={styles.barSpace} />
                <Button variant="secondary" appearance="text" onPress={clear} data-testid="dock-clear">Clear</Button>
                <Tooltip label="Hide the answers" keys="esc"><IconButton icon="keyboard_arrow_down" label="Hide the answers" variant="bare" onClick={() => setFolded(true)} data-testid="dock-fold" /></Tooltip>
              </div>
              <div ref={threadRef} className={styles.thread} role="log" aria-live="polite" aria-label="Maison AI’s answers">{thread(false)}</div>
            </div>
          </div>
        ) : null}
        <div ref={band} className={styles.inner}>
          {desk || layout === 'tablet' ? (
            <>
              {/* (the calm pass, C4) the suggestions only while the field is in use — at rest the pill is alone (a tablet held upright: its
                  sheet holds them). The three step back while the answers are out (the answers carry their own next questions) — a card's
                  questions and the questions that hold your words stay */}
              {!engaged || (inThread && !typed.length && !about) ? null : chipsRow('dock')}
              {desk ? composer('dock') : (
                /* a tablet held upright: the field-shaped door to the sheet, which owns the keyboard (C §5.2) */
                <button type="button" className={styles.doorField} onClick={() => openSheet(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} data-testid="dock-door">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.spark} src="/figma-assets/brief-sparkle.svg" width={18} height={18} alt="" />
                  <span className={styles.doorWords}>{entries.length ? 'Ask a follow-up, or see the answers…' : FIELD_PLACEHOLDER}</span>
                  <span className={styles.doorSend} aria-hidden><Icon name="arrow_upward" size={20} /></span>
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
      {/* a phone: the field-shaped button above the bottom dock, shrinking into the ✦ at its end; a phone held sideways: the ✦ alone */}
      {phone || sideways ? (
        <button type="button" className={styles.accessory} data-shrunk={shrunk || undefined} data-sideways={sideways || undefined} onClick={() => openSheet(true)}
                aria-label="Ask Maison AI" aria-haspopup="dialog" aria-expanded={sheetOpen} data-testid="dock-accessory">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.accSpark} src="/figma-assets/brief-sparkle.svg" width={20} height={20} alt="" />
          <span className={styles.accWords} aria-hidden>{entries.length ? 'Ask a follow-up…' : FIELD_PLACEHOLDER_SHORT}</span>
          <span className={styles.accSend} aria-hidden><Icon name="arrow_upward" size={18} /></span>
        </button>
      ) : null}

      {/* the pane beside the cards (desk): a long answer, or a proposal with its one filled button */}
      <Drawer open={desk && !!pane} title={pane ? (paneProposal ? paneProposal.title : pane.answer?.title ?? pane.q) : 'Maison AI'} label="Maison AI" onClose={() => setPaneId(null)}
              footer={paneProposal && pane ? (
                <div className={styles.paneFoot}>
                  <Button variant="secondary" appearance="text" onPress={() => notNow(pane)} isDisabled={paneBusy}>Not now</Button>
                  <Button onPress={() => { if (paneBusy) return; setPaneBusy(true); void confirm(pane).finally(() => setPaneBusy(false)) }} isDisabled={paneBusy} data-testid="dock-pane-confirm">{paneBusy ? 'Working…' : paneProposal.confirm}</Button>
                </div>
              ) : undefined}>
        {pane ? (
          <div className={styles.paneBody} data-testid="dock-pane">
            {pane.q.toLowerCase() !== (paneProposal?.title ?? pane.answer?.title ?? '').toLowerCase() ? <p className={styles.paneAsked}>{pane.about ? `About ${pane.about.label} · ` : ''}“{pane.q}”</p> : null}
            {paneProposal ? (
              <>
                <p className={styles.cardText}>{paneProposal.text}</p>
                {paneProposal.lines?.length ? <ul className={styles.lines}>{paneProposal.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
              </>
            ) : pane.answer ? <AnswerBody answer={pane.answer} onRow={onRow} onAsk={(q) => addQuestion(q, { about, record: false })} onLink={open} /> : null}
          </div>
        ) : null}
      </Drawer>

      {/* a tablet held upright, a phone: the house Sheet holds the conversation, the suggestions and the field at its foot */}
      <Sheet open={!desk && sheetOpen} onClose={() => setSheetOpen(false)} title="Maison AI" label="Maison AI" lift={lift} bodyClassName={styles.sheetBody}
             footer={<div className={styles.sheetFoot}>{chipsRow('sheet')}{composer('sheet')}</div>}>
        <div className={styles.sheetThread} role="log" aria-live="polite" aria-label="Maison AI’s answers" data-testid="dock-sheet-thread">
          {entries.length ? (
            <>
              {thread(true)}
              <div className={styles.sheetClear}><Button variant="secondary" appearance="text" onPress={clear} data-testid="dock-clear">Clear the answers</Button></div>
            </>
          ) : <p className={styles.welcome}>Ask about leads, tasks, quotes, schedules and money — Maison AI answers from the studio’s records, and shows you any change before it happens.</p>}
        </div>
      </Sheet>
      {reset.dialog}
    </>
  )
}

/** The + beside the field: the tools that read a file for you — Maison AI doesn't take files in the box yet (its `attach` answer's words and
    doors) — and, under a rule, the prototype's reset (it lived in the floating button's sheet, which steps aside here). */
function PlusMenu({ place, tools, onOpen, onReset, onOpenChange }: { place: 'dock' | 'sheet'; tools: boolean; onOpen: (href: string) => void; onReset: () => void
  /** (the calm pass, C4) the dock keeps the field in use while the menu is open — its focus is in the menu's portal then */
  onOpenChange?: (open: boolean) => void }) {
  const [open, setOpenState] = useState(false)
  const setOpen = (o: boolean | ((was: boolean) => boolean)) => {
    const next = typeof o === 'function' ? o(open) : o
    setOpenState(next)
    if (next !== open) onOpenChange?.(next)
  }
  const anchor = useRef<HTMLSpanElement | null>(null)
  const go = (href: string) => { setOpen(false); onOpen(href) }
  return (
    <span ref={anchor} className={styles.plus}>
      <Tooltip label={tools ? 'Read a file · reset the prototype' : 'Reset the prototype'} disabled={open}>
        <IconButton icon="add" label={tools ? 'Read a file, or reset the prototype' : 'Reset the prototype'} variant="bare" aria-haspopup="menu" aria-expanded={open}
                    onClick={() => setOpen((o) => !o)} data-testid={place === 'dock' ? 'dock-plus' : 'dock-sheet-plus'} />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} role="menu" width={320} sheetTitle="Maison AI">
        {tools ? (
          <>
            <DropdownLabel>These read a file for you</DropdownLabel>
            <DropdownItem onSelect={() => go('/quote-x-ray')} help="Quote X-Ray reads their spreadsheet or PDF beside yours">Compare a competitor’s quote</DropdownItem>
            <DropdownItem onSelect={() => go('/quotes?upload=1')} help="Create Quote › Upload a quote">Turn a quote you have into a 2.0 quote</DropdownItem>
            <DropdownItem onSelect={() => go('/visualizer?new=1')} help="The AI Visualizer finds its surfaces and repaints them">Render a room from a photo</DropdownItem>
            <DropdownItem onSelect={() => go('/planner?new=1')} help="The 3D Space Planner, from a flat template or your plan">Turn a floor plan into a 3D layout</DropdownItem>
            <DropdownDivider />
          </>
        ) : null}
        <DropdownItem onSelect={() => { setOpen(false); onReset() }} help="Prototype only — leads, tasks and settings go back to the base state">Reset prototype to base</DropdownItem>
      </PortalMenu>
    </span>
  )
}

/** The docked field's ghost — the band and the pill at rest (the calm pass, C4: the suggestions come only with the field in use, so the
    ghost draws none) — on the dock's own classes, for the page's loader and its reveal (lane C1 places it, components/dashboard/dashboard-ghost.tsx). */
export function MaisonDockGhost() {
  return (
    <div className={styles.dock} data-ghost="" aria-hidden>
      <div className={styles.inner}>
        <div className={styles.pill} data-place="dock"><span className={styles.ghostSpark} /><span className={styles.ghostLine} /><span className={styles.ghostSend} /></div>
      </div>
    </div>
  )
}
