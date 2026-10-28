'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { useSnackbar } from '@/components/om/snackbar'
import { useMaisonAi } from '@/lib/maison-ai'
import { CARD_LABEL, HIDEABLE, type DashCardKey, type DashScope } from '@/lib/dashboard/frame'
import type { DashboardData } from '@/lib/dashboard/model'
import type { AgendaItem } from '@/lib/dashboard/cards'
import type { InboxData } from '@/lib/dashboard/inbox'
import { markDashboardVisit, setDashboardPrefs } from '@/app/dashboard/frame-actions'
import { Greeting } from './frame/greeting'
import { PulseStrip } from './frame/pulse-strip'
import { DashFrameContext, type DashFrame } from './frame/frame-context'
import { NeedsInbox } from './inbox/needs-inbox'
import { YourDayCard } from './cards/your-day-card'
import { PipelineCard } from './cards/pipeline-card'
import { ProjectsCard } from './cards/projects-card'
import { TeamCard } from './cards/team-card'
import { OnSiteCard } from './cards/on-site-card'
import { MaisonDock } from '@/components/maison-ai/dock/maison-dock'
import { CARD_COUNT_KEYS, DashboardGhost, NEEDS_COUNT_KEY, SINCE_COUNT_KEY, SINCE_SHAPE } from './dashboard-ghost'
import { shapeKey } from '@/lib/ghost-shape'
import { setCountPref, setFlagPref } from '@/lib/prefs'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './dashboard.module.css'

/** (brief § 4) Needs you's contract takes `next` — the first coming item of Your day, for its *all caught up* line; the inbox's lane (D2) adds
    it to the component, so the frame hands it on through the contract's own shape. */
const Inbox = NeedsInbox as unknown as ComponentType<{ data: InboxData; next: AgendaItem | null }>

/** A tab away this long, and coming back refreshes the page (his "the page refreshes when you come back to it, never under your cursor"). */
const STALE_MS = 5 * 60_000

/**
 * (pending modules S22; **the Dashboard redesigned, 2026-10-26** — his marks on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY, every
 * proposal Build and every question as recommended; his note "the CTAs are too much to the eyes because of primary color") **The front door**,
 * opened every morning. It answers three questions in an owner's order — **What needs me now?** (Needs you), **How is the studio doing?**
 * (Pulse), **What changed, what's coming?** (Since you were last here · Your day · Pipeline · Projects · Team · On site) — with Maison AI docked
 * at its foot like a chat input. Lane D1 owns this frame (brief § 3 · § 5 D1): the layout at every width, the greeting, Studio / Mine (Q-07),
 * hiding a card for yourself with Undo (Q-06), the visit's mark (P-02); each region is its lane's. A card the role's page doesn't hold, or the
 * member hid, is not drawn (and was never read, P-14).
 *
 * Widths (the drawn frames): ≥1025 two stacks weighted act : glance 1.75 : 1; a tablet held sideways the same at 1.5 : 1; upright, a phone held
 * sideways and a phone one column in reading order (greeting · Since · Pulse · Needs you · Your day · Projects · Pipeline · Team · On site —
 * a phone reads Needs you before Pulse). Each region sits in a slot of the frame's own, so the order is the frame's whatever a card's insides.
 *
 * (**the calm pass 2026-10-26** — his "data looks fine … visually it looks too busy", the Claude Design option he took and his six corrections,
 * brief-calm.md) The page is the grey page surface and every region a white card with no border and no shadow, 24 inside and 24 apart (the CSS
 * custom properties `--dash-card-pad` · `--dash-gap` every card reads); the greeting's one line carries Since as its link (no row of chips);
 * Pulse is four white cards; the two columns stand 2 : 1 at a desk — Needs you · Your day · On site on the left, Pipeline · Projects · Team load
 * on the right (the option's own). Phones and tablets keep the first pass's layouts, with the calmer cards.
 */
export function DashboardView({ data }: { data: DashboardData }) {
  useMaisonAi(data.dock.asks)
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const snackbar = useSnackbar()

  /* the member's page as it stands — the server's, then their own presses at once (put back if the record refuses) */
  const [hidden, setHidden] = useState<DashCardKey[]>(data.hidden)
  const [scope, setScope] = useState<DashScope>(data.scope)
  const [served, setServed] = useState({ hidden: data.hidden.join(), scope: data.scope })
  if (served.hidden !== data.hidden.join() || served.scope !== data.scope) {
    setServed({ hidden: data.hidden.join(), scope: data.scope })
    setHidden(data.hidden); setScope(data.scope)
  }
  const busy = scope !== data.scope
  const on = (k: DashCardKey) => data.cards.includes(k) || (data.hidden.includes(k) && !hidden.includes(k))
  const shown = (k: DashCardKey) => on(k) && !hidden.includes(k)

  /* (P-02) the visit's mark moves once the page has drawn — never before, so this load still counts from the last sitting */
  const away = useRef<number | null>(null)
  useEffect(() => { void markDashboardVisit().catch(() => {}) }, [])
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === 'hidden') { away.current = Date.now(); return }
      if (away.current !== null && Date.now() - away.current >= STALE_MS) { away.current = null; void markDashboardVisit().catch(() => {}); router.refresh() }
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [router])

  /* (Q-06) hide or show cards for yourself: at once, on the record, with Undo — a card shown again that this load never read asks for its data */
  const writeCards = useMemo(() => {
    const write = async (next: DashCardKey[], prev: DashCardKey[], message: string | null) => {
      setHidden(next)
      const r = await setDashboardPrefs({ hidden: next }).catch(() => ({ error: 'You’re offline right now' }))
      if ('error' in r) { setHidden(prev); snackbar({ message: `Couldn’t change your page — ${r.error}`, key: 'dash-cards' }); return }
      if (prev.some((k) => !next.includes(k) && data.hidden.includes(k))) router.refresh()
      if (message) snackbar({ message, key: 'dash-cards', actionLabel: 'Undo', onAction: () => { void write(prev, next, null) } })
    }
    return write
  }, [data.hidden, router, snackbar])
  const cardsTo = (next: DashCardKey[]) => {
    const added = next.filter((k) => !hidden.includes(k)), removed = hidden.filter((k) => !next.includes(k))
    const message = added.length === 1 && !removed.length ? `${CARD_LABEL[added[0]!]} hidden — only for you`
      : removed.length === 1 && !added.length ? `${CARD_LABEL[removed[0]!]} is back on your page`
      : !next.length ? 'Every card is back on your page' : 'Your page changed'
    void writeCards(next, hidden, message)
  }
  const frame: DashFrame = { hide: (k) => { if (!hidden.includes(k)) cardsTo([...hidden, k]) }, canHide: (k) => (HIDEABLE as readonly string[]).includes(k) }

  /* (Q-07) Studio / Mine: at once, remembered on the record, the address saying it (a reload, a Back keep it) */
  const toScope = async (next: DashScope) => {
    const prev = scope
    setScope(next)
    const r = await setDashboardPrefs({ scope: next }).catch(() => ({ error: 'You’re offline right now' }))
    if ('error' in r) { setScope(prev); snackbar({ message: `Couldn’t show ${next === 'mine' ? 'your own work' : 'the studio'} — ${r.error}`, key: 'dash-scope' }); return }
    const params = new URLSearchParams(search.toString())
    if (next === 'mine') params.set('scope', 'mine'); else params.delete('scope')
    const to = `${pathname}${params.size ? `?${params}` : ''}`
    if (to === `${pathname}${search.size ? `?${search}` : ''}`) router.refresh(); else router.replace(to, { scroll: false })
  }

  /* (REG-708) the loader and the reveal draw one ghost — the shell's seed and what this browser saw last; the page tells the NEXT loader what it
     held (the Needs you rows, the Since chips, each glance card's rows) as it leaves, never while its own reveal is on screen (the reveal would
     change under the eye) */
  const memory = useRef({ needs: 0, since: 0, day: 0, week: 0, projects: 0, team: 0, crew: 0, site: 0 })
  useEffect(() => {
    memory.current = {
      needs: data.needs.rows.length, since: data.since?.chips.length ?? 0,
      day: data.day ? data.day.items.filter((x) => x.day === data.day!.today).length : 0, week: data.day?.items.length ?? 0, projects: data.projects?.lines.length ?? 0,
      team: (data.team?.lines.length ?? 0) + (data.team?.nobody ? 1 : 0), crew: data.team?.contractors ? 1 : 0, site: data.site?.photos.length ?? 0,
    }
  })
  useEffect(() => {
    const save = () => {
      const m = memory.current
      setCountPref(NEEDS_COUNT_KEY, m.needs); setCountPref(SINCE_COUNT_KEY, m.since); setFlagPref(shapeKey(SINCE_SHAPE), m.since === 0)
      for (const k of ['day', 'week', 'projects', 'team', 'crew', 'site'] as const) setCountPref(CARD_COUNT_KEYS[k], m[k])
    }
    window.addEventListener('pagehide', save)
    return () => { window.removeEventListener('pagehide', save); save() }
  }, [])

  /* (brief § 4) Needs you's "all caught up" names what is next: Your day's first item still ahead — today or after, not done, not over (D3's
     own rule for its agenda: a meeting past its end and a task ticked today stay on the day, greyed or ticked, but are no longer next) */
  const next = data.day?.items.find((x) => x.day >= data.today && !x.done && !x.ended) ?? null
  const slot = (key: string, node: ReactNode) => <div className={styles.slot} data-slot={key}>{node}</div>

  return (
    <DashFrameContext.Provider value={frame}>
      <PageReveal skeleton={<DashboardGhost />}>
        <div className={`${pageStyles.body} ${styles.page}`} data-testid="dashboard" data-scope={scope} aria-busy={busy || undefined}>
          <div className={styles.content}>
            {slot('greeting', <Greeting data={{ ...data, scope }} hidden={hidden} onScope={(s) => { void toScope(s) }} onCards={cardsTo} busy={busy} />)}
            {shown('pulse') ? slot('pulse', <PulseStrip data={data.pulse} />) : null}
            <div className={styles.grid}>
              <div className={styles.act}>
                {slot('needs', <Inbox data={data.needs} next={next} />)}
                {shown('day') ? slot('day', <YourDayCard data={data.day} />) : null}
                {shown('site') ? slot('site', <OnSiteCard data={data.site} />) : null}
              </div>
              <div className={styles.glance}>
                {shown('pipeline') ? slot('pipeline', <PipelineCard data={data.pipeline} />) : null}
                {shown('projects') ? slot('projects', <ProjectsCard data={data.projects} />) : null}
                {shown('team') ? slot('team', <TeamCard data={data.team} />) : null}
              </div>
            </div>
          </div>
          <MaisonDock data={data.dock} />
        </div>
      </PageReveal>
    </DashFrameContext.Provider>
  )
}
