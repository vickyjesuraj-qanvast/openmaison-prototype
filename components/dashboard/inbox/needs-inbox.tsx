'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { CardFrame } from '@/components/dashboard/cards/card-frame'
import { Chips } from '@/components/om/chips'
import { Drawer } from '@/components/om/drawer'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { useSheetLayout } from '@/components/om/sheet'
import { Row } from '@/components/projects/overview/row'
import { useAfterCall } from '@/components/dashboard/after-call'
import { duration, ease } from '@/lib/motion'
import { CARD_LABEL } from '@/lib/dashboard/frame'
import {
  EMPTY_INBOX, INBOX_SHOWN, INBOX_SHOWN_PHONE, INBOX_TABS_FROM, chipsOf, findInboxRow, inChip, nextWords,
  type InboxBack, type InboxChip, type InboxData, type InboxNext, type InboxRow, type InboxVerb,
} from '@/lib/dashboard/inbox'
import { InboxRowView } from './inbox-row'
import { ReviewPane } from './review-pane'
import { InboxBackDialogs } from './inbox-back'
import { useInboxActions } from './use-inbox-actions'
import overview from '@/components/projects/project-overview.module.css'
import styles from './inbox.module.css'

/* ── a Since chip's door into the list (D1's chips): reveal the row and pulse it, the house attention() ──────────────────────────── */
const REVEAL = 'om:inbox-reveal'
let liveKeys: ReadonlySet<string> = new Set()
/** the list's keys in order and how many the card shows — a row past them opens the whole list's drawer (the calm UI build 2026-10-27) */
let liveKeysOrder: readonly string[] = []
let liveLimit = INBOX_SHOWN
/** (the Dashboard redesigned, 2026-10-26 — brief § 4 "Shared marks") A Since chip about something that also waits here: scrolls to that row
    and pulses it instead of leaving the page. False when the row isn't on the list (cleared, set aside) — the chip then opens its own door. */
export function revealInboxRow(key: string): boolean {
  if (typeof window === 'undefined' || !liveKeys.has(key)) return false
  window.dispatchEvent(new CustomEvent(REVEAL, { detail: { key } }))
  return true
}

/**
 * (the Dashboard redesigned, 2026-10-26 — his marks P-04 · P-05 · Q-05 · Q-11 · lane D2) **Needs you, one ranked inbox.** The card the page
 * is for: every module's waiting work in one list (lib/dashboard/inbox-queries.ts), Your OK first; each row's verb acting in place with Undo,
 * Review opening the record in the pane beside the list, ⋮ › Not today setting it aside until tomorrow; *You're all caught up* when nothing
 * is left.
 *
 * (the calm pass, 2026-10-26 — his "too busy … simplify" and the Claude Design option, lane C2) As the option draws it: the head's count, then
 * text tabs at the head's right (All · Approve n · Clients n · Late n — the selected one a tinted pill, the house Chips drawn as tabs); five
 * rows of one title, one short caption, the amount and ONE verb (the house Row's text button, 2026-10-27) (the rest in the row's ⋮, shown on a row's hover or focus at a desk,
 * always on touch); "Show all n" as a text link; no cleared ring (the head's count says what waits — his correction 4); "n set aside for
 * today · Show" beside it when there is any. The Review pane, the keys (J / K walk the rows, ↵ presses the row's verb, R its Review) and
 * every action are as they were.
 */
export function NeedsInbox({ data = EMPTY_INBOX, next = null }: { data: InboxData; next?: InboxNext }) {
  const phone = useSheetLayout()
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const afterCall = useAfterCall()   // the Dashboard's one Log the call (Your day's too)
  const a = useInboxActions(afterCall.remember)
  const [chip, setChip] = useState<InboxChip>('all')
  /* (the calm UI build 2026-10-27 — the audit's 1-01, T-14 long pages fold) "See all n" opens the whole list in the house Drawer instead of
     growing the card (the page grew to 4,300px); `more` is that drawer, open */
  const [more, setMore] = useState(false)
  /* the Review pane opened from the drawer's list: closing it brings the list back */
  const [paneFromAll, setPaneFromAll] = useState(false)
  const [showSet, setShowSet] = useState(false)
  const [pane, setPane] = useState<{ key: string; at: number } | null>(null)
  const [back, setBack] = useState<InboxBack | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)

  const live = useMemo(() => data.rows.filter((r) => !a.gone.has(r.key)), [data.rows, a.gone])
  const set = data.set ?? []   // what rests until tomorrow, as the server says (a row set aside a moment ago is `gone` from the list, never from here)
  const groups = useMemo(() => chipsOf(live), [live])
  /* a tab that empties lets go (its last row cleared) — render-phase adjust */
  const chipLive = chip === 'all' || groups.some((g) => g.key === chip)
  if (!chipLive) setChip('all')
  const listed = live.filter((r) => inChip(r, chipLive ? chip : 'all'))
  const limit = phone ? INBOX_SHOWN_PHONE : INBOX_SHOWN
  const shown = listed.slice(0, limit)
  const hidden = listed.length - shown.length
  /* (the calm UI build 2026-10-27 — the audit's 1-01) the tabs show only on a list long enough to need them — eight rows or more */
  const showTabs = live.length >= INBOX_TABS_FROM && groups.length > 1 && groups.some((g) => g.key !== 'all' && g.count < live.length)

  /* (the calm UI build 2026-10-27 — the audit's 1-03 · 1-20, one home for approvals) the bell's approval rows open here, on the row about their
     record (`?review=<id>`): its Review pane opens; a row with no pane is brought into view and pulsed. Read once per address, then the
     address lets it go (a reload doesn't open it again). */
  const reviewAsk = search.get('review')
  const reviewBack = search.get('back') === '1'   // the bell's Send back · Decline: the record's own note dialog
  const [reviewed, setReviewed] = useState<string | null>(null)
  const [reviewPulse, setReviewPulse] = useState<string | null>(null)   // a row with no pane, brought into view once
  if (reviewAsk && reviewAsk !== reviewed) {
    setReviewed(reviewAsk)
    const hit = findInboxRow(live, reviewAsk)
    const backOf = hit?.review?.back
    if (hit && reviewBack && backOf && backOf.kind !== 'href') setBack(backOf)
    else if (hit?.review) { setChip('all'); setPane({ key: hit.key, at: Math.max(0, live.filter((r) => r.review).findIndex((r) => r.key === hit.key)) }) }
    else if (hit) { setFresh(hit.key); setReviewPulse(hit.key) }
    else if (groups.some((g) => g.key === 'ok')) setChip('ok')   // answered elsewhere already: the Approvals still waiting
  }
  useEffect(() => {
    if (!reviewAsk) return
    const params = new URLSearchParams(search.toString())
    params.delete('review'); params.delete('back')
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false })
  }, [reviewAsk, search, pathname, router])
  useEffect(() => {
    if (!reviewPulse) return
    const key = reviewPulse
    const el = document.querySelector<HTMLElement>(`[data-inbox-row="${CSS.escape(key)}"]`)
    el?.scrollIntoView({ block: 'center' })
    const t = window.setTimeout(() => { setFresh((f) => (f === key ? null : f)); setReviewPulse(null) }, 1500)
    return () => window.clearTimeout(t)
  }, [reviewPulse])

  useEffect(() => { liveKeys = new Set(live.map((r) => r.key)); liveKeysOrder = live.map((r) => r.key); liveLimit = limit }, [live, limit])
  useEffect(() => {
    const onReveal = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key
      if (!key) return
      setChip('all')
      /* a row past the card's first rows is in the whole list — the drawer opens on it */
      const at = liveKeysOrder.indexOf(key)
      if (at >= liveLimit) setMore(true)
      let tries = 0
      const tick = () => {
        const el = document.querySelector<HTMLElement>(`[data-inbox-row="${CSS.escape(key)}"]`)
        if (!el) { if (++tries < 30) requestAnimationFrame(tick); return }
        el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        setFresh(key)
        window.setTimeout(() => setFresh((f) => (f === key ? null : f)), 1500)
      }
      requestAnimationFrame(() => requestAnimationFrame(tick))
    }
    window.addEventListener(REVEAL, onReveal)
    return () => window.removeEventListener(REVEAL, onReveal)
  }, [])

  /* the pane follows the list: an answer that lands takes its row away, and the pane moves on to the next row that has one (or closes) */
  const reviewable = listed.filter((r) => r.review)
  const paneAt = pane ? reviewable.findIndex((r) => r.key === pane.key) : -1
  const paneRow = paneAt >= 0 ? reviewable[paneAt]! : null
  if (pane && paneAt < 0) {
    const nextRow = reviewable[Math.min(pane.at, reviewable.length - 1)] ?? null
    setPane(nextRow ? { key: nextRow.key, at: Math.min(pane.at, reviewable.length - 1) } : null)
  }
  const openPane = (r: InboxRow) => {
    if (!r.review) return
    const i = reviewable.findIndex((x) => x.key === r.key)
    if (more) { setMore(false); setPaneFromAll(true) }   // one panel at a time: the whole list steps aside for the record, and comes back with its close
    setPane({ key: r.key, at: Math.max(0, i) })
  }
  const closePane = () => { setPane(null); if (paneFromAll) { setPaneFromAll(false); setMore(true) } }
  const step = (d: 1 | -1) => { if (paneAt < 0) return; const i = paneAt + d; const r = reviewable[i]; if (r) setPane({ key: r.key, at: i }) }

  const onPress = (r: InboxRow, v: InboxVerb) => {
    /* the ⋮'s Send back / Decline opens the tab's own dialog at once; a door goes there */
    if (v.testId === 'need-send-back' && r.review?.back) {
      const b = r.review.back
      if (b.kind === 'href') a.press(r, { kind: 'href', href: b.href }, openPane)
      else setBack(b)
      return
    }
    a.press(r, v.do, openPane)
  }

  /* the head's right: the tabs — the house Chips drawn as text tabs, in the house chip rail (a phone's narrow head scrolls them) */
  const tabs = showTabs ? (
    <ChipRail label="Show" className={styles.tabsRail}>
      <Chips label="Show" className={styles.tabs} testId="needs-chips" value={chipLive ? chip : 'all'}
             options={groups.map((g) => ({ value: g.key, label: g.key === 'all' ? g.label : `${g.label} ${g.count}` }))}
             onChange={(v) => setChip(v as InboxChip)} />
    </ChipRail>
  ) : undefined
  /* the rows as the card and the drawer draw them — the same row, its verb, its ⋮ and its marks */
  const rowsOf = (list: InboxRow[]) => (
    <AnimatePresence initial={false} mode="popLayout">
      {list.map((r) => (
        <motion.div key={r.key} className={styles.item} layout="position" transition={{ duration: duration.step, ease: ease.standard }}
                    exit={{ opacity: 0, transition: { duration: duration.step, ease: ease.standard } }}>
          <InboxRowView r={r} busy={a.busy === r.key} fresh={fresh === r.key} current={paneRow?.key === r.key} onPress={onPress} onNotToday={a.notToday} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
  return (
    <div data-card="needs" className={styles.host} data-cleared={data.cleared}>
      {/* the grid's one card head (lane C3's CardFrame): the title, its count, the tabs at its right — on a phone the tabs take the body's
          first line instead, the card's whole width (the first pass's phone: the head is too narrow for four) */}
      {/* (the calm UI build 2026-10-27 — the audit's T-01 · 1-02) "Needs your attention" (was "Needs you") — the one word for what waits on you */}
      <CardFrame card="needs" title={CARD_LABEL.needs} meta={live.length ? String(live.length) : undefined} legend={phone ? undefined : tabs} testId="needs">
        <div className={`${overview.body} ${styles.body}`}>
          {phone && tabs ? <div className={styles.tabsLine}>{tabs}</div> : null}
          {!live.length ? (
            <div className={styles.caught} data-testid="needs-empty">
              <span className={styles.glyph} data-tone="done" aria-hidden data-testid="needs-caught-mark"><Icon name="check" size={18} weight={300} /></span>
              <div className={styles.caughtWords}>
                <p className={styles.caughtTitle}>You’re all caught up</p>
                {next && nextWords(next) ? (next.href ? <Link href={next.href} className={styles.caughtNext} data-testid="needs-next">{nextWords(next)}</Link> : <p className={styles.caughtNext} data-testid="needs-next">{nextWords(next)}</p>) : null}
              </div>
            </div>
          ) : (
            <div className={`${overview.group} ${styles.list}`} data-kb-list="item" data-testid="needs-list">{rowsOf(shown)}</div>
          )}
          {hidden > 0 || set.length ? (
            <div className={styles.foot}>
              {hidden > 0 ? (
                /* (the calm UI build 2026-10-27 — the audit's 1-01, T-14) "See all n" opens the whole list in the house Drawer (was "Show all n",
                   which unrolled every row inside the card) */
                <button type="button" className={styles.link} aria-haspopup="dialog" aria-expanded={more} onClick={() => setMore(true)} data-testid="needs-more">
                  {`See all ${listed.length}`}
                </button>
              ) : null}
              {set.length ? (
                <button type="button" className={styles.setToggle} aria-expanded={showSet} onClick={() => setShowSet((o) => !o)} data-testid="needs-set-toggle">
                  <span className={styles.setWords}>{`${set.length} set aside for today`}</span>
                  <span className={styles.setDot} aria-hidden> · </span>
                  <span className={styles.setLink}>{showSet ? 'Hide' : 'Show'}</span>
                </button>
              ) : null}
            </div>
          ) : null}
          {set.length && showSet ? (
            <div className={`${overview.group} ${styles.list}`} data-testid="needs-set">
              {set.map((r) => (
                <Row key={r.key} two icon={r.icon} className={`${styles.row} ${styles.aside}`}
                     glyph={<span className={styles.glyph} aria-hidden><Icon name={r.icon} size={18} weight={300} /></span>}
                     name={<span className={styles.title}>{r.title}</span>} caption={r.caption ? <span className={styles.caption}>{r.caption}</span> : undefined}
                     href={r.open} attrs={{ 'data-inbox-set': r.key }} after={<span className={styles.endSpace} aria-hidden />}
                     actions={[{ label: 'Bring back', busy: a.busy === r.key, onPress: () => a.bringBackNow(r), testId: 'need-bring-back' }]} testId="need-set-row" />
              ))}
            </div>
          ) : null}
        </div>
      </CardFrame>
      {/* the whole list — the card's tabs, then every row with its own verb and ⋮ (the house Drawer, a bottom sheet on a phone) */}
      <Drawer open={more && listed.length > 0} title={CARD_LABEL.needs} label={`${CARD_LABEL.needs} — every row`} width="wide" onClose={() => setMore(false)}>
        <div className={styles.allBody} data-testid="needs-all">
          {tabs ? <div className={styles.tabsLine}>{tabs}</div> : null}
          <div className={`${overview.group} ${styles.list}`} data-kb-list="item" data-testid="needs-all-list">{rowsOf(listed)}</div>
        </div>
      </Drawer>
      <ReviewPane row={paneRow} busy={!!paneRow && a.busy === paneRow.key} onClose={closePane} canStep={{ prev: paneAt > 0, next: paneAt >= 0 && paneAt < reviewable.length - 1 }} onStep={step}
                  onApprove={(r) => { const run = r.review?.approve?.run; if (run) void a.run(r, run, { pane: true }) }}
                  onBack={(r) => { const b = r.review?.back; if (!b) return; if (b.kind === 'href') a.press(r, { kind: 'href', href: b.href }, openPane); else setBack(b) }} />
      <InboxBackDialogs back={back} onClose={() => setBack(null)} onDone={() => setBack(null)} />
      {afterCall.sheet}
    </div>
  )
}
