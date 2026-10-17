'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button, TextArea } from '@/components/ds'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { SelectTrigger } from '@/components/om/select-trigger'
import { useSnackbar } from '@/components/om/snackbar'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { Tooltip } from '@/components/om/tooltip'
import { WritingHelp } from '@/components/writing/writing-help'
import { replyToQanvastReview } from '@/app/qanvast-ops/account-actions'
import { displayDate } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import { htmlToText, textToHtml } from '@/lib/writing/html'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import type { FeedbackPage, RankingPage, ReviewsData, ReviewsPage } from '@/lib/qanvast-account/queries'
import { ENOUGH_ANSWERS, FEEDBACK_DAYS, REPLY_MAX, STARS, shownReviews, type Feedback, type FeedbackMetric, type Review, type ReviewShow, type ReviewSort } from '@/lib/qanvast-account/model'
import { QANVAST_REVIEWS_HREF } from '@/components/qanvast/qanvast-tabs'
import { AccountFrame } from './account-frame'
import { ReviewsGhost } from './account-ghost'
import { RequestReviewsDialog } from './request-reviews-dialog'
import { REVIEW_VIEWS, W, type ReviewViewKey } from './words'
import styles from './account.module.css'

/**
 * (pending modules S41b-5 — 1.0's `deployment/qanvast` Qanvast Ops › Reviews & Rankings: reviews/page.tsx (Reviews · Rankings) and
 * reviews/feedback/page.tsx; the S41b sweep's M-04; her "build all of them" 2026-10-11) **Qanvast Ops › Reviews**, Owners and Admins (S42E, call E·2 — 1.0 had the Owner only).
 *   · **Reviews** — every review with its stars, words (Read more past 200 letters), photos (a viewer, ← →), who wrote it, when the project was
 *     finished and its designer; the studio's reply under it, or **Reply** (1.0's "Respond…", up to 5,000 letters, Write with AI) and **Edit**;
 *     Show: All · Waiting for a reply · Replied (1.0's Responded / Unresponded sorts), a star filter and a sort (1.0's four), twelve at a time.
 *     At the side, the Overview: how many, the average, the stars' spread, every review on Qanvast and Ask homeowners for a review.
 *   · **Ranking** — 1.0's Rankings tab: the rank among Qanvast's firms (and the listing's link), the four factors over twelve months and this
 *     year (by the project's completion), SuperTrust's note, the tips (Ask homeowners · publish more work on Your public profile), the week's
 *     page views against the week before, and what homeowners told Qanvast in 30 days (shown from two answers) — See the feedback.
 *   · **Feedback** — 1.0's Feedback Insights: 30 · 60 · 90 days, how many answered of how many leads, Contact rate · Meeting rate · Meeting
 *     experience each with Singapore's average, a bar of its parts and, for the last two, the reasons (a homeowner may give several).
 * **Request reviews** (the header's one filled button) asks finished projects' clients or leads on WhatsApp (./request-reviews-dialog.tsx).
 * *(invented copy: the show chips, the empty states, the reply's snackbars, the tips' second line, the not-enough line)*
 */
export function QanvastReviews({ data, view, request }: { data: ReviewsData; view: ReviewViewKey; request: boolean }) {
  const router = useRouter()
  const path = usePathname()
  const state = data.gate ? { gate: true as const } : { gate: false as const, error: 'error' in data ? data.error : undefined, expired: 'error' in data ? data.expired : undefined, standIn: data.standIn }
  const ok = !data.gate && !('error' in data) ? data : null
  const list = ok?.view === 'reviews' ? ok : null
  /* Request reviews opens here on the Reviews view; elsewhere (and from Company › Profile's door) the address asks it to (?request=1) */
  const [asking, setAsking] = useState(request && !!list)
  const [asked, setAsked] = useState(request && !!list)   // the address's ask, once it lands (the page stays mounted between views)
  if ((request && !!list) !== asked) { setAsked(request && !!list); if (request && list) setAsking(true) }
  const closeAsk = () => { setAsking(false); if (request) router.replace(path) }
  const actions = ok ? (
    <Button iconStart={<Icon name="send" size={20} />} onPress={() => (list ? setAsking(true) : router.push(`${QANVAST_REVIEWS_HREF}?request=1`))} data-testid="reviews-request">{W.request}</Button>
  ) : undefined
  /* (S42E, E-16) the view chips name the views only — what waits for a reply is counted once, on the Reviews view's *Waiting for a reply · n*
     (a count beside "Reviews" read as the number of reviews, next to the Overview's total) */
  const views = REVIEW_VIEWS
  useMaisonAi(useMemo(() => suggestions(ok), [ok]))
  return (
    <AccountFrame tab="reviews" views={views} view={view} state={state} actions={actions} ghost={<ReviewsGhost view={view} />} testId="qanvast-reviews">
      {ok?.view === 'reviews' ? <ReviewsList d={ok} onAsk={() => setAsking(true)} /> : ok?.view === 'ranking' ? <Ranking d={ok} /> : ok?.view === 'feedback' ? <FeedbackView d={ok} /> : null}
      {list ? <RequestReviewsDialog open={asking} onClose={closeAsk} studio={list.studio} link={list.links.writeReview} finished={list.finished} leads={list.leads} /> : null}
    </AccountFrame>
  )
}

/* ── shared bits ── */

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${rating} out of 5 stars`} data-testid="review-stars">
      {[1, 2, 3, 4, 5].map((i) => <span key={i} data-on={i <= Math.floor(rating) || undefined} style={{ display: 'inline-flex' }}><Icon name="star" size={size} fill={i <= Math.floor(rating)} /></span>)}
    </span>
  )
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const when = (iso: string | null) => (iso && !Number.isNaN(new Date(iso).getTime()) ? displayDate(new Date(iso)) : null)
function SectionHead({ id, title, help }: { id: string; title: string; help?: string }) {
  return <div className={styles.sectionHead}><div className={styles.sectionTitles}><h2 id={id} className={styles.sectionTitle}>{title}</h2>{help ? <p className={styles.sectionHelp}>{help}</p> : null}</div></div>
}
function Ext({ href, children, testId }: { href: string; children: string; testId?: string }) {
  return <a className={`${styles.link} ${styles.ext}`} href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}>{children}<Icon name="open_in_new" size={16} /></a>
}

/* ── Reviews ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: 'recent', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'highest', label: 'Highest rating' }, { value: 'lowest', label: 'Lowest rating' },
]
const PAGE = 12

function ReviewsList({ d, onAsk }: { d: ReviewsPage; onAsk: () => void }) {
  const [show, setShow] = useState<ReviewShow>('all')
  const [stars, setStars] = useState<number | null>(null)
  const [sort, setSort] = useState<ReviewSort>('recent')
  const [count, setCount] = useState(PAGE)
  const [menu, setMenu] = useState<'stars' | 'sort' | null>(null)
  const starsRef = useRef<HTMLButtonElement>(null), sortRef = useRef<HTMLButtonElement>(null)
  const all = d.list.reviews
  const shown = useMemo(() => shownReviews(all, { stars, show, sort }), [all, stars, show, sort])
  const waiting = all.filter((r) => !r.response).length
  const reset = () => { setShow('all'); setStars(null); setCount(PAGE) }
  const overview = (
    <aside className={styles.side} aria-label="Overview">
      <section className={styles.overview} data-testid="reviews-overview">
        <div className={styles.overviewHead}><h2 className={styles.overviewTitle}>{W.overview}</h2></div>
        <div className={styles.overviewBody}>
          <div className={styles.figures}>
            <div className={styles.figure}><span className={styles.figureValue} data-testid="reviews-total">{d.list.total}</span><span className={styles.figureLabel}>{d.list.total === 1 ? 'Review' : 'Reviews'}</span></div>
            <div className={styles.figure}><span className={styles.figureValue} data-testid="reviews-average">{d.list.average.toFixed(1)}<span data-on="" style={{ display: 'inline-flex' }}><Icon name="star" size={24} fill /></span></span><span className={styles.figureLabel}>Average rating</span></div>
          </div>
          <ul className={styles.spread} aria-label="Reviews by stars" data-testid="reviews-spread">
            {STARS.map((s) => {
              const n = d.list.stars[s]
              const of = Object.values(d.list.stars).reduce((a, b) => a + b, 0)
              return (
                <li key={s} className={styles.spreadRow} aria-label={`${s} stars: ${n}`}>
                  <span aria-hidden>{s}</span><span className={styles.spreadStar} aria-hidden><Icon name="star" size={14} fill /></span>
                  <span className={styles.spreadTrack} aria-hidden><span className={styles.spreadFill} style={{ width: `${of ? (n / of) * 100 : 0}%` }} /></span>
                  <span aria-hidden data-testid={`reviews-stars-${s}`}>{n}</span>
                </li>
              )
            })}
          </ul>
          <div className={styles.sideLinks}>
            <Ext href={d.links.allReviews} testId="reviews-all-link">{W.seeAll}</Ext>
            <button type="button" className={styles.textButton} onClick={onAsk} data-testid="reviews-ask-link">{W.askHomeowners}</button>
          </div>
        </div>
      </section>
    </aside>
  )
  if (!all.length) {
    return (
      <div className={styles.columns}>
        <EmptyState icon="star" tone="plain" testId="reviews-empty" kb={false} title="No reviews on Qanvast yet"
                    help="When a homeowner reviews the studio on Qanvast, it shows here — and you can reply to it from here."
                    primary={{ label: W.request, onPress: onAsk, icon: 'send' }} />
        {overview}
      </div>
    )
  }
  return (
    <div className={styles.columns}>
      <div className={styles.list}>
        <div className={styles.filters}>
          <ChipRail label="Show" className={styles.filterRail}>
            <Chips label="Show" testId="reviews-show" value={show} onChange={(v) => { setShow(v as ReviewShow); setCount(PAGE) }}
                   options={[{ value: 'all', label: 'All' }, { value: 'waiting', label: waiting ? `Waiting for a reply · ${waiting}` : 'Waiting for a reply' }, { value: 'answered', label: 'Replied' }]} />
          </ChipRail>
          <div className={styles.filterTools}>
            <span className={styles.menuWrap}>
              <SelectTrigger ref={starsRef} label="Rating" value={stars === null ? 'All ratings' : plural(stars, 'star')} open={menu === 'stars'} onClick={() => setMenu((m) => (m === 'stars' ? null : 'stars'))} data-testid="reviews-stars-filter" />
              <PortalMenu open={menu === 'stars'} anchor={starsRef} onClose={() => setMenu(null)} role="menu" width={MENU_WIDTH.standard} align="right" sheetTitle="Rating">
                <DropdownItem role="menuitemradio" checked={stars === null} onSelect={() => { setMenu(null); setStars(null); setCount(PAGE) }}>All ratings</DropdownItem>
                {STARS.map((s) => <DropdownItem key={s} role="menuitemradio" checked={stars === s} meta={String(d.list.stars[s])} onSelect={() => { setMenu(null); setStars(s); setCount(PAGE) }}>{plural(s, 'star')}</DropdownItem>)}
              </PortalMenu>
            </span>
            <span className={styles.menuWrap}>
              <SelectTrigger ref={sortRef} label="Sort" value={SORTS.find((s) => s.value === sort)!.label} open={menu === 'sort'} onClick={() => setMenu((m) => (m === 'sort' ? null : 'sort'))} data-testid="reviews-sort" />
              <PortalMenu open={menu === 'sort'} anchor={sortRef} onClose={() => setMenu(null)} role="menu" width={MENU_WIDTH.standard} align="right" sheetTitle="Sort">
                {SORTS.map((s) => <DropdownItem key={s.value} role="menuitemradio" checked={sort === s.value} onSelect={() => { setMenu(null); setSort(s.value) }}>{s.label}</DropdownItem>)}
              </PortalMenu>
            </span>
          </div>
        </div>
        {shown.length ? (
          <div className={styles.list} data-testid="reviews-list" data-kb-list="review">
            {shown.slice(0, count).map((r) => <ReviewCard key={r.id} r={r} />)}
            {shown.length > count ? <Button variant="secondary" appearance="outlined" onPress={() => setCount((c) => c + PAGE)} data-testid="reviews-more">{`Show ${Math.min(PAGE, shown.length - count)} more`}</Button> : null}
          </div>
        ) : (
          <p className={styles.note} data-testid="reviews-none-match">
            <span className={styles.noteText}>{show === 'waiting' && stars === null ? 'Every review has your reply.' : 'No review matches these filters.'}</span>
            <Button variant="primary" appearance="text" onPress={reset}>Show all reviews</Button>
          </p>
        )}
      </div>
      {overview}
    </div>
  )
}

function ReviewCard({ r }: { r: Review }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(r.response ?? '')
  const [busy, setBusy] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [photo, setPhoto] = useState<number | null>(null)
  const [more, setMore] = useState(false)
  const long = r.text.length > 200
  const editing = !!r.response
  const start = () => { setText(r.response ?? ''); setOpen(true) }
  const cancel = () => { if (text.trim() !== (r.response ?? '').trim()) setDiscard(true); else setOpen(false) }
  const post = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const res = await replyToQanvastReview({ reviewId: r.id, text })
      if ('error' in res) { snackbar({ message: couldnt(editing ? 'save your reply' : 'post your reply', refusalOf(res.error)) }); return }
      setOpen(false)
      router.refresh()
      snackbar({ key: 'qanvast-review-reply', message: res.posted ? (editing ? `Reply changed on Qanvast — ${r.reviewer} and every homeowner reading it see the new one` : `Reply posted on Qanvast — ${r.reviewer} and every homeowner reading it see it`) : 'Reply kept here — on this prototype it isn’t posted to Qanvast' })
    } catch { snackbar({ message: couldnt(editing ? 'save your reply' : 'post your reply') }) } finally { setBusy(false) }
  }
  const keys = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void post() } }
  const meta = [`By ${r.reviewer}`, when(r.at), r.completed ? `Project finished ${r.completed}` : null, r.designer ? `Designer ${r.designer}` : null].filter(Boolean).join(' · ')
  return (
    <article className={styles.card} id={`review-${r.id}`} data-testid="review-card" data-review={r.id} data-at={r.at} data-kb-row data-kb-id={r.id} data-waiting={!r.response || undefined}>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div className={styles.cardTitles}>
            <Stars rating={r.rating} />
            <h3 className={styles.reviewTitle}>{r.title}</h3>
          </div>
          {!r.response && !open ? <span className={styles.press}><Button variant="secondary" appearance="outlined" onPress={start} data-testid="review-reply">Reply</Button></span> : null}
        </div>
        {r.text ? (
          <p className={styles.text} data-testid="review-text">
            {long && !more ? `${r.text.slice(0, 200).trimEnd()}… ` : `${r.text} `}
            {long ? <button type="button" className={styles.more} onClick={() => setMore((m) => !m)} aria-expanded={more}>{more ? 'Show less' : 'Read more'}</button> : null}
          </p>
        ) : null}
        {r.photos.length ? (
          <div className={styles.photos} data-testid="review-photos">
            {r.photos.map((p, i) => (
              <Tooltip key={p.thumb} label={p.caption ? `${p.caption} — open the photo` : `Open photo ${i + 1} of ${r.photos.length}`}>
                <button type="button" className={styles.photo} onClick={() => setPhoto(i)} aria-label={`Open photo ${i + 1} of ${r.photos.length}${p.caption ? ` — ${p.caption}` : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Qanvast's picture (or the studio's own), sized by Qanvast */}
                  <img src={p.thumb} alt="" loading="lazy" />
                </button>
              </Tooltip>
            ))}
          </div>
        ) : null}
        <p className={styles.meta} data-testid="review-meta">{meta}</p>
        {open ? (
          <div className={styles.compose} data-testid="review-compose" onKeyDown={keys}>
            <TextArea label="Your reply" value={text} onChange={(v: string) => setText(v.slice(0, REPLY_MAX))} maxLength={REPLY_MAX} showCharacterCount autoFocus
                      description={`Everyone who reads ${r.reviewer}’s review on Qanvast sees it.`} data-testid="review-reply-text" />
            <div className={styles.composeFoot}>
              <WritingHelp label="Your reply" subject={r.title} kind="message" menuAlign="left" testId="review-writing" sources={{ names: [r.reviewer] }}
                           read={() => ({ html: textToHtml(text) })} apply={(h) => setText(htmlToText(h).slice(0, REPLY_MAX))} />
              <span className={styles.composeActions}>
                <Button variant="secondary" appearance="outlined" onPress={cancel} isDisabled={busy}>Cancel</Button>
                <Button onPress={() => { void post() }} isDisabled={busy || !text.trim()} data-testid="review-post">{busy ? 'Saving…' : editing ? 'Save reply' : 'Post reply'}</Button>
              </span>
            </div>
          </div>
        ) : r.response ? (
          <div className={styles.reply} data-testid="review-response">
            <div className={styles.replyHead}>
              <span className={styles.replyLabel}>{`Your reply${when(r.respondedAt) ? ` · ${when(r.respondedAt)}` : ''}`}</span>
              <Button variant="primary" appearance="text" size="sm" onPress={start} data-testid="review-edit">Edit</Button>
            </div>
            <p className={styles.text}>{r.response}</p>
          </div>
        ) : null}
      </div>
      <ConfirmDialog open={discard} title="Discard your reply?" message="What you wrote isn’t posted yet — it goes if you discard it." confirmLabel="Discard" cancelLabel="Keep writing"
                     onConfirm={() => { setDiscard(false); setOpen(false); setText(r.response ?? '') }} onCancel={() => setDiscard(false)} />
      {photo !== null ? <PhotoViewer review={r} at={photo} onAt={setPhoto} onClose={() => setPhoto(null)} /> : null}
    </article>
  )
}

function PhotoViewer({ review, at, onAt, onClose }: { review: Review; at: number; onAt: (i: number) => void; onClose: () => void }) {
  const n = review.photos.length
  const p = review.photos[at]!
  const go = (by: number) => onAt((at + by + n) % n)
  return (
    <Dialog open onClose={onClose} title={review.title} subtitle={n > 1 ? `Photo ${at + 1} of ${n}` : undefined} width={800} size="modal">
      <div className={styles.viewer} data-testid="review-photo-viewer"
           onKeyDown={(e) => { if (n > 1 && e.key === 'ArrowRight') { e.preventDefault(); go(1) } else if (n > 1 && e.key === 'ArrowLeft') { e.preventDefault(); go(-1) } }}>
        <div className={styles.viewerStage}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Qanvast's picture at its larger size */}
          <img src={p.full} alt={p.caption ?? `Photo ${at + 1} of ${review.title}`} />
        </div>
        {p.caption ? <p className={styles.viewerCaption}>{p.caption}</p> : null}
        {n > 1 ? (
          <div className={styles.viewerNav}>
            <Tooltip label="Previous photo"><IconButton icon="chevron_left" label="Previous photo" onClick={() => go(-1)} data-testid="viewer-prev" /></Tooltip>
            <span className={styles.count}>{`${at + 1} / ${n}`}</span>
            <Tooltip label="Next photo"><IconButton icon="chevron_right" label="Next photo" onClick={() => go(1)} data-testid="viewer-next" /></Tooltip>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/* ── Ranking ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function Change({ value }: { value: number }) {
  if (!value) return <span className={styles.change}>The same as last week</span>
  return (
    <span className={styles.change} data-dir={value > 0 ? 'up' : 'down'}>
      <Icon name={value > 0 ? 'arrow_upward' : 'arrow_downward'} size={14} /><span>{`${value > 0 ? 'Up' : 'Down'} ${Math.abs(value)}% on last week`}</span>
    </span>
  )
}

function Ranking({ d }: { d: RankingPage }) {
  const router = useRouter()
  const r = d.ranking
  const enough = r.feedback.responses >= ENOUGH_ANSWERS
  const yr = d.year
  return (
    <>
      <section className={styles.rankCard} data-testid="ranking-rank">
        <span className={styles.rankRow}><span className={styles.rank} data-testid="ranking-number">{`#${r.rank.toLocaleString('en-SG')}`}</span><span className={styles.muted}>Your rank</span></span>
        <span className={styles.muted}>{W.rankHelp(r.firms.toLocaleString('en-SG'))}</span>
        <Ext href={d.links.listing} testId="ranking-listing">{W.rankLink}</Ext>
      </section>

      <section className={styles.section} aria-labelledby="ranking-factors">
        <SectionHead id="ranking-factors" title={W.factors} help={W.factorsHelp} />
        <StatTiles testId="ranking-factors">
          <StatTile label="Reviews" value={r.reviews.count} help={`Written by homeowners · in ${yr}: ${r.reviews.year}*^`} testId="factor-reviews" />
          <StatTile label="Rating" value={<span className={styles.ratingValue}>{r.rating.average.toFixed(1)}<span data-on=""><Icon name="star" size={20} fill /></span></span>} help={`The average of those reviews · in ${yr}: ${r.rating.year.toFixed(1)}*^`} testId="factor-rating" />
          <StatTile label="Projects" value={r.projects.count} help={`Published on Qanvast · in ${yr}: ${r.projects.year}*`} testId="factor-projects" />
          <StatTile label="Board pins" value={r.pins.count.toLocaleString('en-SG')} help={`Project photos homeowners saved · in ${yr}: ${r.pins.year.toLocaleString('en-SG')}*`} testId="factor-pins" />
        </StatTiles>
        <p className={styles.foot}>
          {`* SuperTrust ${yr + 1} will be based on these numbers. `}
          {d.links.supertrust ? <a className={styles.footLink} href={d.links.supertrust} target="_blank" rel="noopener noreferrer">Find out more</a> : null}
        </p>
        <p className={styles.foot}>{`^ This year’s reviews are counted by when the project was finished in ${yr}, not when the review was written.`}</p>
        <div className={styles.tips}>
          <button type="button" className={styles.textButton} onClick={() => router.push(`${QANVAST_REVIEWS_HREF}?request=1`)} data-testid="ranking-ask">{W.askHomeowners}</button>
          <span className={styles.foot}>{'Publishing more of your work helps your rank — '}<Link className={styles.footLink} href={withFrom('/profile#public', `${QANVAST_REVIEWS_HREF}/ranking`)} data-testid="ranking-work">add it on Your public profile</Link></span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ranking-views">
        <SectionHead id="ranking-views" title={W.views} help={W.viewsHelp} />
        <StatTiles testId="ranking-views">
          <StatTile label="Profile views" value={r.views.profile.count.toLocaleString('en-SG')} help={<Change value={r.views.profile.change} />} testId="views-profile" />
          <StatTile label="Project views" value={r.views.projects.count.toLocaleString('en-SG')} help={<Change value={r.views.projects.change} />} testId="views-projects" />
          <StatTile label="Review views" value={r.views.reviews.count.toLocaleString('en-SG')} help={<Change value={r.views.reviews.change} />} testId="views-reviews" />
        </StatTiles>
      </section>

      <section className={styles.section} aria-labelledby="ranking-told">
        <SectionHead id="ranking-told" title={W.told} help={W.toldHelp} />
        <StatTiles testId="ranking-told">
          <StatTile label="Contact rate" value={enough ? `${r.feedback.contactRate}%` : '–'} help="Contacted within a week" testId="told-contact" />
          <StatTile label="Meeting rate" value={enough ? `${r.feedback.meetingRate}%` : '–'} help="Met the designer" testId="told-meeting" />
          <StatTile label="Meeting experience" value={enough && r.feedback.experience !== null ? `${r.feedback.experience.toFixed(1)} / 10` : '–'} help="How the meeting went" testId="told-experience" />
        </StatTiles>
        <p className={styles.note} data-testid="ranking-told-note">
          <span className={styles.noteText}>{enough ? `${plural(r.feedback.responses, 'homeowner')} answered Qanvast in the last 30 days.` : `${r.feedback.responses ? `Only ${plural(r.feedback.responses, 'homeowner')} answered` : 'No homeowner answered'} Qanvast in the last 30 days — it takes ${ENOUGH_ANSWERS} answers to show anything.`}</span>
          <Link className={styles.link} href={`${QANVAST_REVIEWS_HREF}/feedback`} data-testid="ranking-feedback-link">See the feedback</Link>
        </p>
      </section>
    </>
  )
}

/* ── Feedback ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function Parts({ parts, enough }: { parts: FeedbackMetric[]; enough: boolean }) {
  const total = parts.reduce((s, p) => s + p.count, 0)
  return (
    <span className={styles.parts} role="img" aria-label={enough && total ? parts.map((p) => `${p.label}: ${p.count}`).join(', ') : 'Not enough answers'} data-testid="feedback-parts">
      {enough && total ? parts.filter((p) => p.count > 0).map((p) => <span key={p.key} className={styles.part} data-tone={p.tone} style={{ flexGrow: p.count }} />) : null}
    </span>
  )
}
function Legend({ items, enough, dots = true }: { items: FeedbackMetric[]; enough: boolean; dots?: boolean }) {
  return (
    <ul className={styles.legend}>
      {items.map((p) => (
        <li key={p.key} className={styles.legendRow} data-testid={`feedback-row-${p.key}`}>
          <span className={styles.legendName}>{dots && p.tone ? <span className={styles.dot} data-tone={p.tone} aria-hidden /> : null}<span>{p.label}</span></span>
          <span className={styles.legendCount}>{enough ? `${p.count} (${p.pct}%)` : '– (–%)'}</span>
        </li>
      ))}
    </ul>
  )
}
function FbCard({ id, title, average, value, unit, parts, reasons, reasonsTitle, enough }: { id: string; title: string; average: string | null; value: string | null; unit?: string; parts: FeedbackMetric[]; reasons?: FeedbackMetric[]; reasonsTitle?: string; enough: boolean }) {
  const shownReasons = reasons?.filter((x) => x.count > 0) ?? []
  return (
    <section className={styles.fbCard} aria-labelledby={`fb-${id}`} data-testid={`feedback-${id}`}>
      <div className={styles.fbHead}>
        <h3 id={`fb-${id}`} className={styles.fbTitle}>{title}</h3>
        {average ? <span className={styles.sectionHelp}>{`Average in Singapore: ${average}`}</span> : null}
      </div>
      <span className={styles.fbValue} data-none={!enough || value === null || undefined} data-testid={`feedback-${id}-value`}>{enough && value !== null ? value : '–'}{enough && value !== null && unit ? <span className={styles.fbUnit}>{unit}</span> : null}</span>
      <Parts parts={parts} enough={enough} />
      <Legend items={parts} enough={enough} />
      {reasons && (!enough || shownReasons.length) ? (
        <div className={styles.reasons}>
          <h4 className={styles.reasonsTitle}>{reasonsTitle}</h4>
          <p className={styles.sectionHelp}>A homeowner can give more than one reason, so these can add up to more than 100%.</p>
          <Legend items={enough ? shownReasons : reasons} enough={enough} dots={false} />
        </div>
      ) : null}
    </section>
  )
}

function FeedbackView({ d }: { d: FeedbackPage }) {
  const router = useRouter()
  const f: Feedback = d.feedback
  const [days, setDays] = useState<string>(String(f.days))
  const [was, setWas] = useState(f.days)
  if (was !== f.days) { setWas(f.days); setDays(String(f.days)) }
  const period = `the last ${f.days} days`
  return (
    <>
      <div className={styles.filters}>
        <ChipRail label="Over the last" className={styles.filterRail}>
          <Chips label="Over the last" testId="feedback-days" value={days} options={FEEDBACK_DAYS.map((n) => ({ value: String(n), label: `${n} days` }))}
                 onChange={(v) => { if (v === days) return; setDays(v); router.push(v === '30' ? `${QANVAST_REVIEWS_HREF}/feedback` : `${QANVAST_REVIEWS_HREF}/feedback?days=${v}`) }} />
        </ChipRail>
      </div>
      <p className={styles.note} data-testid="feedback-summary">
        <span className={styles.noteText}>{f.enough
          ? `In ${period}, ${f.responses} of the ${plural(f.leads, 'homeowner')} Qanvast sent you answered its check-in. This is what they said.`
          : !f.leads ? `Qanvast sent you no leads in ${period}, so no homeowner had anything to tell it yet.`
          : `${f.responses ? `Only ${f.responses}` : 'None'} of the ${plural(f.leads, 'homeowner')} Qanvast sent you in ${period} answered its check-in — it takes ${ENOUGH_ANSWERS} answers to show anything.`}</span>
      </p>
      <div className={styles.cards}>
        <FbCard id="contact" title="Contact rate" average={f.contact.average !== null ? `${f.contact.average}%` : null} value={`${f.contact.value}%`} parts={f.contact.parts} enough={f.enough} />
        <FbCard id="meeting" title="Meeting rate" average={f.meeting.average !== null ? `${f.meeting.average}%` : null} value={`${f.meeting.value}%`} parts={f.meeting.parts}
                reasons={f.meeting.reasons} reasonsTitle="Why they haven’t met yet" enough={f.enough} />
        <FbCard id="experience" title="Meeting experience" average={f.experience.average !== null ? `${f.experience.average.toFixed(1)} / 10` : null} value={f.experience.value !== null ? f.experience.value.toFixed(1) : null} unit="/ 10"
                parts={f.experience.parts} reasons={f.experience.reasons} reasonsTitle="Why they rated it so" enough={f.enough} />
      </div>
    </>
  )
}

/* ── Maison AI: answered from what the page holds ─────────────────────────────────────────────────────────────────────────────── */

function suggestions(d: ReviewsPage | RankingPage | FeedbackPage | null): MaisonSuggestion[] {
  if (!d) return []
  if (d.view === 'reviews') {
    const waiting = d.list.reviews.filter((r) => !r.response)
    const jump = (id: string) => () => document.getElementById(`review-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return [
      { label: 'Which reviews are waiting for a reply?', answer: waiting.length
        ? { title: plural(waiting.length, 'review'), rows: waiting.map((r) => ({ id: r.id, label: r.reviewer, meta: `${r.rating} ★ · ${r.title}`, run: jump(r.id) })) }
        : { title: 'Every review has your reply', text: 'When a new review comes in on Qanvast, it waits here for yours.' } },
      { label: 'How are we rated on Qanvast?', answer: { title: `${d.list.average.toFixed(1)} ★ from ${plural(d.list.total, 'review')}`, rows: STARS.map((s) => ({ id: String(s), label: plural(s, 'star'), meta: String(d.list.stars[s]), share: d.list.total ? d.list.stars[s] / d.list.total : 0 })) } },
    ]
  }
  if (d.view === 'ranking') {
    return [{ label: 'How do we rank on Qanvast?', answer: { title: `#${d.ranking.rank} of ${d.ranking.firms.toLocaleString('en-SG')} firms`, text: `${plural(d.ranking.reviews.count, 'review')} averaging ${d.ranking.rating.average.toFixed(1)} ★ over the last 12 months, ${plural(d.ranking.projects.count, 'project')} published and ${d.ranking.pins.count.toLocaleString('en-SG')} board pins.`, link: { label: W.askHomeowners, href: `${QANVAST_REVIEWS_HREF}?request=1` } } }]
  }
  const f = d.feedback
  return [{ label: 'What did homeowners tell Qanvast?', answer: f.enough
    ? { title: `${f.responses} of ${f.leads} answered`, text: `${f.contact.value}% were contacted within a week and ${f.meeting.value}% have met a designer${f.experience.value !== null ? `; they rated the meeting ${f.experience.value.toFixed(1)} / 10` : ''}.` }
    : { title: 'Too few answers yet', text: `${f.responses ? `Only ${plural(f.responses, 'homeowner')}` : 'No homeowner'} answered in the last ${f.days} days — try a longer period.` } }]
}
