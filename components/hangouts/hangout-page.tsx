'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tabs } from '@/components/om/tabs'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Card } from '@/components/leads/detail/card'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { applyToHangout, setHangoutPageOpen, withdrawFromHangout } from '@/app/qanvast-ops/hangouts/actions'
import { HANGOUTS_HREF, defaultView, hangoutHref, isView, standingOf, type HangoutView as View } from '@/lib/hangouts/model'
import { moneyCard, displayDate } from '@/lib/format'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import type { HangoutView } from '@/lib/hangouts/queries'
import { PlanView } from './plan-view'
import { MeetingsView } from './meetings-view'
import { ResultsView } from './results-view'
import { HangoutGhost } from './hangout-ghost'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './hangouts.module.css'

const LABEL: Record<View, string> = { plan: 'Plan', meetings: 'Chats', results: 'How it went' }

/**
 * (pending modules S27 — public:hangouts; her "build all of them" 2026-10-11) A Hangout's page — 1.0's studio page's Plan · Dashboard · Your
 * meetings for one event (src/app/(main)/qanvast-ops/hangouts/page.tsx), in 2.0's shape: the L2 header (Qanvast Ops / Hangouts, Back where you
 * came from), the event's facts, and three views as the house tabs — **Plan** (who sits at the tables on each shift, their shares, who the
 * studio would like to meet, sent to Qanvast), **Chats** (the day: each homeowner's chat at the tables — Start, End with its outcome, walk-ins)
 * and **How it went** (1.0's Dashboard: the number tiles and each designer's chats). It opens on the view its day asks for: the plan before,
 * the chats on the day, how it went after. Not taking part: where the studio stands and its one press. The studio's own booking page for the
 * event (public, in the studio's name) is the header's "Your booking page ▾". *(invented copy: the views' names, every line)*
 */
export function HangoutPage({ data, from }: { data: HangoutView; from?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const p = data.participation
  const taking = p?.status === 'confirmed'
  const asked = params.get('view')
  const view: View = taking ? (isView(asked) ? asked : defaultView(data.event.phase, true)) : 'plan'
  const standing = standingOf(data.event.phase, p?.status ?? 'none')
  const back = from || HANGOUTS_HREF
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLSpanElement>(null)
  const [busy, setBusy] = useState(false)
  const pageUrl = () => (p?.pagePath ? `${window.location.origin}${p.pagePath}` : '')

  const copyPage = async () => {
    setMenuOpen(false)
    try { await navigator.clipboard.writeText(pageUrl()); snackbar({ message: 'Booking link copied — everyone who books arrives as a lead' }) }
    catch { snackbar({ message: couldnt('copy the link') }) }
  }
  const sharePage = () => {
    setMenuOpen(false)
    const text = `Meet us at ${data.event.name} — ${data.event.daysLine}, ${data.event.venue}. Book a chat with our designers here: ${pageUrl()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  const togglePage = async (open: boolean) => {
    setMenuOpen(false)
    try {
      const r = await setHangoutPageOpen(data.event.id, open)
      if ('error' in r) { snackbar({ message: couldnt(open ? 'take bookings again' : 'stop the bookings', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar(open ? { message: 'Your page takes bookings again' } : { message: 'Your page stopped taking bookings — the chats booked stay', actionLabel: 'Undo', onAction: () => { void setHangoutPageOpen(data.event.id, true).then(() => router.refresh()) } })
    } catch { snackbar({ message: couldnt(open ? 'take bookings again' : 'stop the bookings') }) }
  }
  const apply = async () => {
    setBusy(true)
    try {
      const r = await applyToHangout(data.event.id)
      if ('error' in r) { snackbar({ message: couldnt('apply', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ message: `Applied for ${data.event.name} — Qanvast confirms your place`, actionLabel: 'Undo', onAction: () => { void withdrawFromHangout(data.event.id).then(() => router.refresh()) } })
    } catch { snackbar({ message: couldnt('apply') }) } finally { setBusy(false) }
  }
  const withdraw = async () => {
    setBusy(true)
    try {
      const r = await withdrawFromHangout(data.event.id)
      if ('error' in r) { snackbar({ message: couldnt('take the application back', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ message: `Application for ${data.event.name} taken back`, actionLabel: 'Undo', onAction: () => { void applyToHangout(data.event.id).then(() => router.refresh()) } })
    } catch { snackbar({ message: couldnt('take the application back') }) } finally { setBusy(false) }
  }

  /* (S10's rule; 1.0's "Ask ID Buddy about your Hangout performance") Maison AI answers from this Hangout's records — each row opens what it names */
  const waiting = data.meetings.filter((r) => r.status === 'scheduled')
  const suggestions: MaisonSuggestion[] = taking ? [
    { label: 'Which designer converted most here?', answer: data.results.held
      ? { title: 'Chats by designer', rows: [...data.results.byDesigner].sort((a, b) => b.converted - a.converted || b.meetings - a.meetings).map((d) => ({ id: d.memberId, label: d.name, meta: `${d.converted} converted of ${d.meetings} ${d.meetings === 1 ? 'chat' : 'chats'}${d.followUp ? ` · ${d.followUp} to follow up` : ''}` })) }
      : { title: 'No chats held yet', text: 'Each chat’s outcome counts here once it ends.' } },
    { label: 'Who is still waiting for a chat?', answer: waiting.length
      ? { title: `${waiting.length} waiting`, rows: waiting.map((r) => ({ id: r.id, label: r.leadName, meta: [r.memberName ? `With ${r.memberName}` : 'Nobody has it yet', r.shiftLine, r.tableNumber ? `Table ${r.tableNumber}` : null].filter(Boolean).join(' · '), href: hangoutHref(data.event.id, 'meetings') })) }
      : { title: 'Nobody is waiting', text: 'Every chat booked here is on or over.' } },
    { label: 'Is our plan with Qanvast?', answer: p?.planSentAt
      ? { title: 'Sent to Qanvast', text: `On ${displayDate(new Date(p.planSentAt))}${p.planSentBy ? ` by ${p.planSentBy}` : ''}${p.planSavedAt && p.planSavedAt > p.planSentAt ? ' — it has changed since; send it again from the Plan.' : '.'}` }
      : { title: 'Not sent yet', text: 'Send it from the Plan once someone is on a shift — Qanvast matches homeowners to your studio on it.', link: { label: 'Open the Plan', href: hangoutHref(data.event.id, 'plan') } } },
  ] : []
  useMaisonAi(suggestions)

  const tabs = (['plan', 'meetings', 'results'] as View[]).map((v) => ({ label: LABEL[v], href: `${hangoutHref(data.event.id, v)}${from ? `&from=${encodeURIComponent(from)}` : ''}`,
    ...(v === 'meetings' && data.results.waiting + data.results.inProgress ? { count: data.results.waiting + data.results.inProgress } : {}) }))
  const active = tabs.find((t) => t.href.includes(`view=${view}`))?.href ?? tabs[0]!.href
  const ended = data.event.phase === 'ended'

  return (
    <PageReveal skeleton={<HangoutGhost />}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="hangout-page" data-view={view} data-phase={data.event.phase}>
        <PageHeaderL2 backHref={back} crumbs={[{ label: 'Qanvast Ops', href: '/qanvast-ops' }, { label: 'Hangouts', href: HANGOUTS_HREF }]} title={data.event.name} scrollShadow={!taking}
          chips={<><MetaChip color={standing.tone}>{standing.word}</MetaChip>{data.event.sample ? <MetaChip>Sample</MetaChip> : null}</>}
          actions={taking && p?.pagePath && !ended ? (
            <span ref={menuRef} className={styles.menuWrap}>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="link" size={20} />} iconEnd={<span className={styles.chev} data-open={menuOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                      aria-haspopup="menu" aria-expanded={menuOpen} onPress={() => setMenuOpen((o) => !o)} data-testid="hangout-page-menu">Your booking page</Button>
              <PortalMenu open={menuOpen} anchor={menuRef} onClose={() => setMenuOpen(false)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle="Your booking page">
                <DropdownItem help="Homeowners book a chat with your designers — each arrives as a lead" onSelect={() => { void copyPage() }}>Copy the link</DropdownItem>
                <DropdownItem help="Opens WhatsApp with the link in a message" onSelect={sharePage}>Send on WhatsApp</DropdownItem>
                <DropdownItem help="As homeowners see it, in a new tab" onSelect={() => { setMenuOpen(false); window.open(p.pagePath!, '_blank', 'noopener') }}>Open the page</DropdownItem>
                {data.viewer.runs && !ended ? <><DropdownDivider />{p.pageOpen
                  ? <DropdownItem help="The chats already booked stay" onSelect={() => { void togglePage(false) }}>Stop taking bookings</DropdownItem>
                  : <DropdownItem onSelect={() => { void togglePage(true) }}>Take bookings again</DropdownItem>}</> : null}
              </PortalMenu>
            </span>
          ) : null} />
        {taking ? <div className={styles.tabs}><Tabs items={tabs} activeHref={active} aria-label="Hangout views" /></div> : null}
        <div className={styles.content}>
          <div className={styles.stack}>
            {!taking ? (
              <Card title="Your place" testId="hangout-place">
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <p className={styles.line} data-testid="hangout-place-line">{
                      p?.status === 'applied' ? `Applied${p.appliedBy ? ` by ${p.appliedBy}` : ''}${p.appliedAt ? ` on ${displayDate(new Date(p.appliedAt))}` : ''} — Qanvast confirms your place and gives you your tables. You plan who goes once it does.`
                      : p?.status === 'declined' ? 'Qanvast didn’t confirm a place for you at this Hangout.'
                      : ended || data.event.phase === 'today' ? 'You didn’t take part in this Hangout.'
                      : data.event.placesLeft > 0 ? `${data.event.placesLeft} ${data.event.placesLeft === 1 ? 'place' : 'places'} left for studios. A place is ${data.event.tablesPerStudio} ${data.event.tablesPerStudio === 1 ? 'table' : 'tables'} at ${moneyCard(data.event.pricePerTableMinor)} each.`
                      : 'Every place at this Hangout is taken.'}</p>
                    <span className={styles.press}>
                      {p?.status === 'applied' && data.viewer.runs ? <Button variant="secondary" appearance="outlined" onPress={() => { void withdraw() }} isDisabled={busy}>Take back</Button> : null}
                      {(!p || p.status === 'withdrawn') && data.event.phase === 'ahead' && data.event.placesLeft > 0 && data.viewer.runs ? <Button onPress={() => { void apply() }} isDisabled={busy} data-testid="hangout-apply">{busy ? 'Applying…' : 'Apply'}</Button> : null}
                    </span>
                  </div>
                </div>
              </Card>
            ) : null}
            {view === 'plan' || !taking ? <PlanView data={data} /> : view === 'meetings' ? <MeetingsView data={data} /> : <ResultsView data={data} />}
          </div>
        </div>
      </div>
    </PageReveal>
  )
}
