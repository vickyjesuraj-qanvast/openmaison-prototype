'use client'

import Link from 'next/link'
import { useMemo, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { MetaChip } from '@/components/om/meta-chip'
import { EmptyState } from '@/components/om/empty-state'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { Tabs } from '@/components/om/tabs'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Card } from '@/components/leads/detail/card'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { QANVAST_TAB_ITEMS, QANVAST_HANGOUTS_HREF, onQanvastTabsClick } from '@/components/qanvast/qanvast-tabs'
import { applyToHangout, withdrawFromHangout } from '@/app/qanvast-ops/hangouts/actions'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { filterByQuery } from '@/lib/search'
import { defaultView, hangoutHref } from '@/lib/hangouts/model'
import type { HangoutListItem, HangoutsData } from '@/lib/hangouts/queries'
import { HangoutsGhost } from './hangouts-ghost'
import { costLine, eventLine, eventPress, inScope, scopeLabels, type Scope } from './event-words'
import pageStyles from '@/app/leads/leads.module.css'
import leadsStyles from '@/components/qanvast/qanvast-leads.module.css'
import styles from './hangouts.module.css'

/**
 * (pending modules S27 — public:hangouts; his "build all of them" 2026-10-11; S16's note: Qanvast Ops › Hangouts made live) Qanvast's
 * Hangouts as the studio sees them — 1.0's studio page's Events tab (src/app/(main)/qanvast-ops/hangouts/page.tsx OwnerEventsTab): each
 * event a card with its days, hours, venue and what a place costs; where the studio stands (open to apply · applied · taking part · today ·
 * ended); one press — Apply (Owners and Admins, while places are left), the event's page once the studio takes part. Its scopes are 1.0's
 * chips (All · Upcoming · Applied · Confirmed) in plain words. The events come from Qanvast's feed (lib/hangouts/feed.ts); the demo's are
 * samples and the page says so. *(invented copy: the scope words, the cards' lines, the empty state, the sample line)*
 */
export function HangoutsHome({ data }: { data: HangoutsData }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const [scope, setScope] = useState<Scope>('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const shown = useMemo(() => filterByQuery(data.events.filter((e) => inScope(e, scope)), query, (e) => ({ fields: [e.name, e.venue, e.daysLine] })), [data.events, scope, query])

  const apply = async (e: HangoutListItem) => {
    setBusy(e.id)
    try {
      const r = await applyToHangout(e.id)
      if ('error' in r) { snackbar({ message: couldnt('apply', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ message: `Applied for ${e.name} — Qanvast confirms your place`, actionLabel: 'Undo', onAction: () => { void withdrawFromHangout(e.id).then((u) => { if ('error' in u) snackbar({ message: couldnt('take the application back', refusalOf(u.error)) }); else router.refresh() }) } })
    } catch { snackbar({ message: couldnt('apply') }) } finally { setBusy(null) }
  }
  const withdraw = async (e: HangoutListItem) => {
    setBusy(e.id)
    try {
      const r = await withdrawFromHangout(e.id)
      if ('error' in r) { snackbar({ message: couldnt('take the application back', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ message: `Application for ${e.name} taken back`, actionLabel: 'Undo', onAction: () => { void applyToHangout(e.id).then((u) => { if ('error' in u) snackbar({ message: couldnt('apply again', refusalOf(u.error)) }); else router.refresh() }) } })
    } catch { snackbar({ message: couldnt('take the application back') }) } finally { setBusy(null) }
  }

  /* (S10's rule) Maison AI answers from the records here — each row opens what it names */
  const taking = data.events.filter((e) => e.participation === 'confirmed')
  const suggestions: MaisonSuggestion[] = [
    { label: 'Which Hangouts are we taking part in?', answer: taking.length
      ? { title: 'Hangouts you’re taking part in', rows: taking.map((e) => ({ id: e.id, label: e.name, meta: `${e.daysLine} · ${e.standing.word}`, href: hangoutHref(e.id, defaultView(e.phase, true)) })) }
      : { title: 'Not taking part in any yet', text: 'Apply for one on this page — Qanvast confirms your place.' } },
    { label: 'Which Hangouts can we still apply for?', answer: (() => { const open = data.events.filter((e) => e.phase === 'ahead' && (e.participation === 'none' || e.participation === 'withdrawn')); return open.length
      ? { title: 'Open to apply', rows: open.map((e) => ({ id: e.id, label: e.name, meta: `${e.daysLine} · ${e.placesLeft} ${e.placesLeft === 1 ? 'place' : 'places'} left`, href: hangoutHref(e.id) })) }
      : { title: 'Nothing open to apply for', text: 'Every Hangout here is applied for, taking place or over.' } })() },
  ]
  useMaisonAi(suggestions)

  return (
    <PageReveal skeleton={<HangoutsGhost />}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="hangouts">
        <PageHeader title="Qanvast Ops" scrollShadow={false} />
        <div className={leadsStyles.tabsHost} onClickCapture={(ev: MouseEvent<HTMLDivElement>) => onQanvastTabsClick(ev, comingSoon)}>
          <Tabs items={QANVAST_TAB_ITEMS} activeHref={QANVAST_HANGOUTS_HREF} aria-label="Qanvast Ops sections" className={leadsStyles.stickyTabs} />
        </div>
        <div className={styles.content}>
          {data.events.length === 0 ? (
            <EmptyState icon="group" tone="plain" title="No Hangouts from Qanvast right now" testId="hangouts-empty"
                        help="When Qanvast plans a Hangout — homeowners meeting designers at tables in one venue — it shows here, and you can apply for a place." />
          ) : (
            <>
              <div className={styles.bar}>
                <div className={styles.views}>
                  <ChipRail label="Show" className={styles.rail}>
                  <Chips label="Show" testId="hangouts-scope" value={scope} onChange={(v) => setScope(v as Scope)}
                         options={scopeLabels(data.events)} /></ChipRail>
                </div>
                <div className={styles.tools}>
                  <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search Hangouts" label="Search Hangouts" />
                </div>
              </div>
              {shown.length === 0 ? (
                <TabSearchEmpty noun="Hangouts" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setScope('all') }} />
              ) : (
                <div className={styles.list} data-kb-list="hangout" data-testid="hangouts-list">
                  {shown.map((e) => <EventCard key={e.id} e={e} runs={data.runs} busy={busy === e.id} onApply={() => { void apply(e) }} onWithdraw={() => { void withdraw(e) }} onOpen={() => router.push(hangoutHref(e.id, defaultView(e.phase, true)))} />)}
                </div>
              )}
              {data.sample ? <p className={styles.source} data-testid="hangouts-sample">Sample Hangouts written for the demo — Qanvast’s own events come through its feed.</p> : null}
            </>
          )}
        </div>
      </div>
    </PageReveal>
  )
}

function EventCard({ e, runs, busy, onApply, onWithdraw, onOpen }: { e: HangoutListItem; runs: boolean; busy: boolean; onApply: () => void; onWithdraw: () => void; onOpen: () => void }) {
  const taking = e.participation === 'confirmed'
  const href = hangoutHref(e.id, taking ? defaultView(e.phase, true) : undefined)   // the view it opens on rides the address, so its loader draws it
  const line = eventLine(e)
  const press = eventPress(e, runs)
  return (
    <Card title={e.daysLine} metaRight={e.sample ? 'Sample' : undefined} testId="hangout-card">
      <div className={styles.cardBody} data-kb-row data-kb-id={e.id} data-phase={e.phase} data-participation={e.participation}>
        <div className={styles.cardTop}>
          <div className={styles.headText}>
            <div className={styles.nameRow}>
              <h2 className={styles.name}>{taking || e.participation === 'applied' ? <Link href={href} className={styles.nameLink} data-kb-open>{e.name}</Link> : e.name}</h2>
              <MetaChip color={e.standing.tone} >{e.standing.word}</MetaChip>
            </div>
            {e.customerProfile ? <p className={styles.about}>{e.customerProfile}</p> : null}
          </div>
          <span className={styles.press}>
            {press?.kind === 'apply' ? <Button onPress={onApply} isDisabled={busy} data-testid="hangout-apply">{busy ? 'Applying…' : press.label}</Button> : null}
            {press?.kind === 'who' ? <span className={styles.help}>{press.label}</span> : null}
            {press?.kind === 'withdraw' ? <Button variant="secondary" appearance="outlined" onPress={onWithdraw} isDisabled={busy} data-testid="hangout-withdraw">{press.label}</Button> : null}
            {press?.kind === 'open' ? <Button variant="primary" appearance={e.phase === 'today' ? 'filled' : 'outlined'} onPress={onOpen} data-testid="hangout-open">{press.label}</Button> : null}
          </span>
        </div>
        <dl className={styles.facts} data-three="">
          <div className={styles.fact}><dt className={styles.factLabel}>Hours</dt><dd className={styles.factValue}>{e.hoursLine}</dd></div>
          <div className={styles.fact}><dt className={styles.factLabel}>Venue</dt><dd className={styles.factValue}>
            <a className={styles.factLink} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue)}`} target="_blank" rel="noopener noreferrer">{e.venue}<span className={styles.factGlyph}><Icon name="open_in_new" size={16} /></span></a>
          </dd></div>
          <div className={styles.fact}><dt className={styles.factLabel}>Your cost</dt><dd className={styles.factValue}>{costLine(e)}</dd></div>
        </dl>
        {line ? <p className={styles.line} data-testid="hangout-line">{line}</p> : null}
      </div>
    </Card>
  )
}
