'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostField, GhostHead2, GhostTextButton, Line, Slot, Words } from '@/components/shell/ghost-kit'
import card from '@/components/leads/detail/card.module.css'
import overview from '@/components/projects/project-overview.module.css'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { displayDate, displayDue, groupDigits, moneyCard, titleCaseName } from '@/lib/format'
import { AIMS, DISCLOSURE, LISTENING_STAND_IN, TIER_LINES, consentLabel, firstOf, heldMinutes, tierOf, type Profile } from '@/lib/meetings/model'
import { meetingStepLabel, meetingStepWords } from '@/lib/meetings/next-step'   // (S42G)
import { CATEGORIES, checklistFor } from '@/lib/meetings/checklists'
import { kindLabel } from '@/lib/meetings/objections'
import { whenWords } from '@/lib/meetings/words'
import type { MeetingRoomData } from '@/lib/meetings/queries'
import styles from './room.module.css'

type Status = 'planned' | 'live' | 'held' | 'cancelled'
const key = (id: string, k: 'live' | 'held' | 'due' | 'invited') => `om.shape.meeting.${id || '_'}.${k}`

/** The meeting's moment as the next load's ghost draws it (REG-708; lib/ghost-shape's habit). (S42 audit C-04 · C-19) `due` — a planned
    meeting whose time has come (Send the invitation steps back); `invited` — its invitation went (the Invitation card stays then). A door that
    knows the moment before the page opens (a list's row, Start a meeting now) says it too, so a first visit's ghost lands in it. */
export function rememberMeetingShape(id: string, status: Status, o: { due?: boolean; invited?: boolean } = {}) {
  setFlagPref(key(id, 'live'), status === 'live'); setFlagPref(key(id, 'held'), status === 'held')
  setFlagPref(key(id, 'due'), status === 'planned' && !!o.due); setFlagPref(key(id, 'invited'), !!o.invited)
}
/** The meeting's page, once drawn: its moment remembered, so the next load's ghost draws the same one. */
export function useRememberMeetingShape(id: string, status: Status, o: { due?: boolean; invited?: boolean } = {}) {
  const { due = false, invited = false } = o
  useEffect(() => { rememberMeetingShape(id, status, { due, invited }) }, [id, status, due, invited])
}
/** (S42 C-04) A planned meeting whose time has come — "Now" until its planned end, then "Its time has passed": the invitation is behind it. */
export const dueNow = (m: { status: string; startsAt: number }, now: number) => m.status === 'planned' && m.startsAt <= now

/* ── the pieces, each on the page's own classes ── */

/** A card's head in its words — the title, its meta, the head's link ("Edit") where the page has one. */
function GCard({ title, meta, link, children }: { title: string; meta?: string | null; link?: string | null; children: ReactNode }) {
  return (
    <section className={card.card}>
      <div className={`${card.head} ${styles.ghostHead}`}>
        <div className={card.headText}><Words className={card.title}>{title}</Words>{meta ? <Words className={card.meta}>{meta}</Words> : null}</div>
        {link ? <Words className={card.link}>{link}</Words> : null}
      </div>
      {children}
    </section>
  )
}
/** A LEAD STAGES row: the glyph, the name (and its caption under it when `two`), the meta at the end — the page's words when the ghost has them. */
function GRow({ name, caption, meta, two, wrap }: { name?: string | null; caption?: string | null; meta?: string | null; two?: boolean; wrap?: boolean }) {
  const words = (s: string | null | undefined, cls: string | undefined, w: number, lh = 20, h = 12) => (s ? <Words className={cls}>{s}</Words> : <Line w={w} lh={lh} h={h} />)
  return (
    <div className={overview.row} data-static="" data-two={two || undefined} data-wrap={wrap || undefined}>
      <Bone w={20} h={20} r="50%" />
      {two ? (
        <span className={overview.label}>
          <span className={overview.two}>{words(name, overview.name, 168)}{caption !== undefined ? words(caption, overview.till, 212, 16, 10) : null}</span>
          {meta ? <Words className={overview.meta}>{meta}</Words> : null}
        </span>
      ) : (
        <span className={overview.label}>
          <span className={overview.nameGroup}>{words(name, overview.name, 112)}</span>
          {meta !== undefined ? words(meta, overview.meta, 72) : null}
        </span>
      )}
    </div>
  )
}
const GLabel = ({ children }: { children: string }) => <Words className={styles.groupLabel}>{children}</Words>
/** A DS checkbox and its label — the 20 box, 8 apart, the label in the page's type. */
/** (S42G) the banner's outlined button as the page sets it — "Move to Met" is 124 wide, each further character about 8 */
const stepButtonWidth = (label: string) => 124 + (label.length - 'Move to Met'.length) * 8
const GCheck = ({ label }: { label: string }) => <span className={styles.ghostCheck}><Bone w={20} h={20} r={4} /><Words>{label}</Words></span>

function heardOf(p: Profile): { name: string; meta: string }[] {
  return [
    ...(p.propertyType ? [{ name: 'Home', meta: p.areaSqft ? `${p.propertyType} · ${groupDigits(String(p.areaSqft))} sq ft` : p.propertyType }] : p.areaSqft ? [{ name: 'Size', meta: `${groupDigits(String(p.areaSqft))} sq ft` }] : []),
    ...(p.rooms.length ? [{ name: 'Rooms', meta: p.rooms.join(', ') }] : []),
    ...(p.budgetMinor ? [{ name: 'Budget', meta: p.budgetMinor.min === p.budgetMinor.max ? moneyCard(p.budgetMinor.min) : `${moneyCard(p.budgetMinor.min)} – ${moneyCard(p.budgetMinor.max)}` }] : []),
    ...(p.styles.length ? [{ name: 'Style', meta: p.styles.join(', ') }] : []),
    ...(p.timeline ? [{ name: 'Timeline', meta: p.timeline }] : []),
    ...(p.keyCollection ? [{ name: 'Key collection', meta: p.keyCollection }] : []),
    ...(p.decisionMakers ? [{ name: 'Who decides', meta: p.decisionMakers }] : []),
    ...(p.household.length ? [{ name: 'At home', meta: p.household.join(', ') }] : []),
    ...(p.concerns.length ? [{ name: 'Concerns', meta: p.concerns.join(', ') }] : []),
    ...(p.competitors.length ? [{ name: 'Also talking to', meta: p.competitors.join(', ') }] : []),
  ]
}

/**
 * (pending modules S23 · REG-708) The meeting page's ghost — the L2 header, then the two stacks of the moment it opens on, each card on the
 * page's own classes and in its own words: the Before view's Get ready card and checklist are the page's copy, so they wrap where the page's
 * do; what only the record knows is a bar. The loader reads the meeting from the address and draws the moment this browser saw last (a first
 * visit: Before); the page's reveal is handed the record itself (`data`), so its ghost carries the page's very words and rows.
 */
export function MeetingRoomGhost({ status, data }: { status?: Status; data?: MeetingRoomData }) {
  const id = usePathname()?.split('/')[2] ?? ''
  const [wasLive] = useFlagPref(key(id, 'live'), false)
  /* (S42 audit C-19) a meeting this browser never opened draws the brief — most meetings opened are held ones (a door that knows says so first) */
  const [wasHeld] = useFlagPref(key(id, 'held'), true)
  const [wasDue] = useFlagPref(key(id, 'due'), false)
  const [wasInvited] = useFlagPref(key(id, 'invited'), false)
  const s: Status = status ?? (wasLive ? 'live' : wasHeld ? 'held' : 'planned')
  const m = data?.meeting
  const may = data ? data.mayChange : true
  const first = data ? firstOf(titleCaseName(data.lead.name)) : null
  const brief = m?.brief ?? null
  /* (S42 C-04) its time has come: no Send the invitation, and no Invitation card unless one went */
  const due = s === 'planned' && (m && data ? dueNow(m, data.now) : wasDue)
  const invited = m ? !!m.invitedAt : wasInvited
  const actions = !may ? [] : s === 'planned' ? (due ? [180, 'icon' as const] : [180, 156, 'icon' as const]) : s === 'live' ? [148, 'icon' as const] : brief && !m?.briefSavedAt ? [140, 132, 'icon' as const] : [132, 'icon' as const]
  const free = data?.credits.free ?? false
  const price = free ? (data && data.credits.freeLeft > 0 ? `Your free meeting: the co-pilot is free for ${data.credits.freeLeft * 10} more minutes.` : 'Your free meeting with the co-pilot is used — the co-pilot comes with Pro.') : 'The co-pilot uses 25 AI credits for each 10 minutes, and asks before each next 10.'
  const checklist = checklistFor(m?.aim ?? 'first_consultation', data?.playbook.own ?? [])
  const checkGroups = CATEGORIES.map((c) => ({ label: c.label, items: checklist.filter((r) => r.category === c.key).map((r) => r.label) })).filter((g) => g.items.length)
  const showChecklist = data ? data.copilot.features.checklist : true
  const prep = data?.prep

  const before = (
    <>
      <div className={`${styles.column} ${styles.act}`}>
        <GCard title="Before the meeting">
          <div className={styles.cardBody}>
            <div className={styles.group}>{prep ? (prep.know.length ? prep.know.map((k) => <GRow key={k.label} name={k.label} meta={k.value} wrap />) : <Words as="p" className={styles.line}>Nothing on record yet about the home or the budget.</Words>) : [0, 1, 2, 3].map((i) => <GRow key={i} meta={null} wrap />)}</div>
            {(prep ? prep.unknown : ['Property type & size', 'Who decides']).length ? <div className={styles.group}><GLabel>Still to find out</GLabel><p className={styles.chipsRow}>{(prep ? prep.unknown : ['Property type & size', 'Who decides']).map((u) => <Words key={u} className={styles.unknown}>{u}</Words>)}</p></div> : null}
            {prep?.last ? <div className={styles.group}><GLabel>{`Last meeting · ${displayDate(new Date(prep.last.at))}${prep.last.count > 1 ? ` · ${prep.last.count} so far` : ''}`}</GLabel><Words as="p" className={styles.prose}>{prep.last.summary}</Words></div> : null}
            {prep && (prep.concerns.length || prep.competitors.length) ? <div className={styles.group}><GLabel>To address</GLabel>{prep.concerns.map((c) => <GRow key={c} name={`${c} concern`} />)}{prep.competitors.map((c) => <GRow key={c} name={`Also talking to ${c}`} />)}</div> : null}
            <div className={styles.group}><GLabel>Focus on</GLabel><ol className={styles.steps}>{(prep ? prep.focus : ['', '', '']).map((x, i) => <li key={i}>{x ? <Words>{x}</Words> : <Line w={[260, 220, 240][i % 3]!} />}</li>)}</ol></div>
            {prep?.temperature ? <div className={styles.group}><GLabel>How warm, at the last meeting</GLabel><GRow name={`${prep.temperature.score} · ${prep.temperature.tier}`} caption={prep.temperature.line} two /></div> : null}
          </div>
        </GCard>
        {showChecklist ? (
          <GCard title="Meeting checklist" meta={`· 0/${checklist.length}`}>
            <div className={styles.cardBody}>
              {checkGroups.map((g) => <div key={g.label} className={styles.checkGroup}><GLabel>{g.label}</GLabel>{g.items.map((l) => <div key={l} className={styles.checkRow}><GCheck label={l} /></div>)}</div>)}
            </div>
          </GCard>
        ) : null}
      </div>
      <div className={`${styles.column} ${styles.glance}`}>
        {s === 'cancelled' ? (
          <GCard title="This meeting was cancelled"><div className={styles.cardBody}><Words as="p" className={styles.line}>Plan another from the lead’s Meetings.</Words></div></GCard>
        ) : (
          <GCard title="Get ready">
            <div className={styles.form}>
              <GhostChips labels={AIMS.map((a) => a.label)} />
              <GhostField />
              <GhostField />
              {first ? <GLabel>{`Tell ${first} before you start`}</GLabel> : <span className={styles.groupLabel}><Line w={200} /></span>}
              <Words as="p" className={styles.disclosure}>{`“${DISCLOSURE}”`}</Words>
              {first ? <GCheck label={consentLabel(first)} /> : <span className={styles.ghostCheck}><Bone w={20} h={20} r={4} /><Line w={240} lh={24} /></span>}
              <p className={styles.price}><Bone w={16} h={16} r={4} /><Words>{price}</Words></p>
              <p className={styles.standIn}><Bone w={16} h={16} r={4} /><Words>{LISTENING_STAND_IN}</Words></p>
            </div>
          </GCard>
        )}
        {due && !invited ? null : <GCard title="Invitation">
          <div className={styles.cardBody}>
            <GRow name={m ? whenWords(m.startsAt) : null} caption={m ? (m.place ?? m.whereKind) : null} two />
            <GRow name={m ? (m.invitedAt ? `Sent ${displayDate(new Date(m.invitedAt))}${m.invitedVia === 'email' ? ' by email' : m.invitedVia === 'whatsapp' ? ' on WhatsApp' : ''}` : 'Not sent yet') : null} caption={m && first ? (m.clientAnswer === 'yes' ? `${first} is coming` : m.clientAnswer === 'no' ? 'The time doesn’t suit them' : m.clientViewedAt ? `${first} opened it` : undefined) : undefined} two />
          </div>
        </GCard>}
      </div>
    </>
  )

  const live = (
    <>
      <div className={`${styles.column} ${styles.act}`}>
        <GCard title="What’s being said">
          <div className={styles.cardBody}>
            <p className={styles.standIn}><Bone w={16} h={16} r={4} /><Words>{LISTENING_STAND_IN}</Words></p>
            <div className={styles.notesBar}><GhostTextButton label="Client:" /><GhostTextButton label="Me:" /></div>
            <span className={`${styles.notes} ${styles.ghostNotes}`} />
            <div className={styles.tools}>{[148, 164, 148, 132, 212].map((w, i) => <Slot key={i} kind="btn" w={w} />)}</div>
          </div>
        </GCard>
      </div>
      <div className={`${styles.column} ${styles.glance}`}>
        <GCard title="Tips as you talk"><div className={styles.cardBody}><Words as="p" className={styles.line}>Listening for a price, another studio, a deadline or a doubt — a tip shows here when one comes up.</Words></div></GCard>
        {showChecklist ? <GCard title="Meeting checklist" meta={`· 0/${checklist.length}`}><div className={styles.cardBody}>{checkGroups.map((g) => <div key={g.label} className={styles.checkGroup}><GLabel>{g.label}</GLabel>{g.items.map((l) => <div key={l} className={styles.checkRow}><GCheck label={l} /></div>)}</div>)}</div></GCard> : null}
      </div>
    </>
  )

  const heard = brief ? heardOf(brief.profile) : null
  const held = (
    <>
      <div className={`${styles.column} ${styles.act}`}>
        <GCard title="Summary" link={may ? 'Edit' : null}>
          <div className={styles.cardBody}>
            {brief ? <Words as="p" className={styles.prose}>{brief.summary}</Words> : <><Line w="96%" /><Line w="92%" /><Line w="88%" /><Line w="60%" /></>}
            {brief ? (brief.madeFrom !== 'live' ? <Words as="p" className={styles.note}>{`Made from ${brief.madeFrom === 'recording' ? 'the recording’s transcript' : 'the notes'}, by rule.`}</Words> : null) : <Line w={180} lh={16} h={10} />}
          </div>
        </GCard>
        <GCard title="Next steps" link={may ? 'Edit' : null}>
          <div className={styles.cardBody}><ol className={styles.steps}>{(brief ? brief.actions : ['', '', '', '']).map((a, i) => <li key={i}>{a ? <Words>{a}</Words> : <Line w={[320, 260, 300, 240][i % 4]!} />}</li>)}</ol></div>
        </GCard>
        <GCard title="Message to send" link={may ? 'Edit' : null}>
          <div className={styles.cardBody}>
            {brief ? <Words as="p" className={styles.prose}>{brief.followUp}</Words> : <><Line w="94%" /><Line w="90%" /><Line w="50%" /></>}
            {may ? <span className={styles.cardAct}><Slot kind="btn" w={170} /><GhostTextButton label="Copy" /></span> : null}
          </div>
        </GCard>
        <GCard title="What we heard">
          <div className={styles.cardBody}>
            <div className={styles.group}>
              {heard ? (heard.length ? heard.map((r) => <GRow key={r.name} name={r.name} meta={r.meta} wrap />) : <Words as="p" className={styles.line}>Nothing about the home or the budget was heard yet.</Words>) : [0, 1, 2, 3, 4].map((i) => <GRow key={i} meta={null} wrap />)}
              {brief && brief.tags.length ? <p className={styles.tags}>{brief.tags.map((t) => <Words key={t} className={styles.tag}>{t}</Words>)}</p> : null}
            </div>
          </div>
        </GCard>
        <GCard title="Concerns they raised" meta={brief && brief.objections.length ? `· ${brief.objections.length}` : null}>
          <div className={styles.cardBody}>
            {brief && !brief.objections.length ? <Words as="p" className={styles.line}>No doubts came up.</Words> : (
              <div className={styles.group}>
                {(brief ? brief.objections : [null, null]).map((o, i) => (
                  <div key={i} className={styles.concern}>
                    <div className={styles.tipHead}><Bone w={20} h={20} r="50%" />{o ? <Words className={styles.tipTitle}>{`${kindLabel(o.kind)}${o.competitor ? ` · ${o.competitor}` : ''}`}</Words> : <Line w={96} />}</div>
                    {o ? <Words as="p" className={styles.said}>{`They said: “${o.said}”`}</Words> : <Line w="80%" lh={16} h={10} />}
                    {o ? (o.answer ? <div className={styles.answer}><Words className={styles.answerHead}>{`${data?.studioName || 'Your studio'}’s answer${o.answerTitle ? ` · “${o.answerTitle}”` : ''}`}</Words><Words>{o.answer}</Words></div> : <Words as="p" className={styles.note}>No answer saved for this kind yet — Settings › Meetings › Objection answers.</Words>) : <span className={styles.answer}><Line w="70%" lh={16} h={10} /><Line w="94%" lh={16} h={10} /><Line w="88%" lh={16} h={10} /></span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </GCard>
        {m && (m.state.boards.length || data?.designs.length || data?.readings.length || data?.files.length) ? (
          <GCard title="From this meeting">
            <div className={styles.cardBody}>
              {m.state.boards.length ? <div className={styles.boards}>{m.state.boards.map((b) => <Bone key={b} w="100%" h={120} r={8} />)}</div> : null}
              {data?.designs.map((d) => <GRow key={d.id} name={d.name} meta={`${d.renders} ${d.renders === 1 ? 'render' : 'renders'}`} />)}
              {data?.readings.map((x) => <GRow key={x.id} name={x.title} />)}
              {data?.files.map((x) => <GRow key={x.id} name={x.name} caption={x.id === m.recordingFileId ? 'The recording' : undefined} two={x.id === m.recordingFileId} />)}
            </div>
          </GCard>
        ) : null}
        <GCard title="The notes" link={may ? 'Edit' : null}>
          <div className={styles.cardBody}>{m ? (m.notes.trim() ? <Words as="div" className={styles.notesFull}>{m.notes}</Words> : <Words as="p" className={styles.line}>No notes were taken.</Words>) : <span className={styles.notesFull}><Line w="90%" lh={16} h={10} /><Line w="84%" lh={16} h={10} /><Line w="70%" lh={16} h={10} /></span>}</div>
        </GCard>
      </div>
      <div className={`${styles.column} ${styles.glance}`}>
        <GCard title="On the lead">
          <div className={styles.cardBody}>
            {m?.briefSavedAt ? <GRow name={`Saved to the lead ${displayDate(new Date(m.briefSavedAt))}`} caption="The details and the follow-up are on it" two /> : <GRow name="Not saved to the lead yet" caption="Save it — the details heard and a follow-up task" two />}
            {m?.sharedAt && !m.shareStoppedAt ? <GRow name={`Shared with ${first} ${displayDate(new Date(m.sharedAt))}`} caption={m.clientViewedAt ? `${first} opened it` : 'Not opened yet'} two /> : null}
          </div>
        </GCard>
        {brief ? (brief.score !== null && brief.dims && data?.copilot.features.deal_scoring ? (
          <GCard title="Deal score">
            <div className={styles.cardBody}>
              <div className={styles.scoreLine}><Words className={styles.score}>{String(brief.score)}</Words><Words className={styles.tier}>{tierOf(brief.score)}</Words><Words className={styles.line}>{TIER_LINES[tierOf(brief.score)]}</Words></div>
              <GRow name="Why this score" />
            </div>
          </GCard>
        ) : null) : <GCard title="Deal score"><div className={styles.cardBody}><div className={styles.scoreLine}><Line w={48} lh={32} h={24} /><Line w={160} /></div><GRow name="Why this score" /></div></GCard>}
        <GCard title="Rough estimate" meta={brief && brief.estimate.lines.length ? `· ${moneyCard(brief.estimate.lowMinor)} – ${moneyCard(brief.estimate.highMinor)}` : null}>
          <div className={styles.cardBody}>
            {brief ? (brief.estimate.lines.length ? <div className={styles.group}>{brief.estimate.lines.map((l) => <GRow key={l.key} name={l.name} caption={l.category} meta={`${moneyCard(l.lowMinor)} – ${moneyCard(l.highMinor)}`} two />)}</div> : <Words as="p" className={styles.line}>The works appear here as they’re named — a kitchen, two bathrooms, wardrobes, painting…</Words>)
              : <div className={styles.group}>{[0, 1, 2].map((i) => <GRow key={i} caption={null} two />)}</div>}
            {brief && brief.estimate.lines.length ? <Words as="p" className={styles.note}>A rough guide from typical Singapore prices — never a quote.</Words> : null}
            {brief && data?.copilot.features.recommended_addons && brief.upsells.length ? <div className={styles.group}><GLabel>Add-ons to suggest</GLabel>{brief.upsells.map((a) => <GRow key={a.key} name={a.description} meta={`+${moneyCard(a.valueMinor)}`} />)}</div> : null}
            {may && brief && (brief.estimate.lines.length || brief.profile.rooms.length || m?.quoteId) ? <span className={styles.cardAct}><Slot kind="btn" w={150} /></span> : null}
          </div>
        </GCard>
        <GCard title="The meeting">
          <div className={styles.cardBody}>
            <GRow name={m ? displayDue(new Date(m.startsAt)) : null} caption={m ? m.whereKind : null} two />
            <GRow name={m && data ? (m.memberIds.map((id) => data.team.find((t) => t.id === id)?.name).filter(Boolean).join(', ') || 'The studio') : null} />
            <GRow name={brief && m ? (brief.madeFrom === 'live' ? `With the co-pilot${m.blocks ? ` · ${heldMinutes(m)} min` : ''}` : brief.madeFrom === 'recording' ? 'From a recording' : 'Written up from notes') : null} caption={brief && m && brief.madeFrom === 'live' && m.blocks ? (m.blocks - m.freeBlocks ? `${(m.blocks - m.freeBlocks) * 25} AI credits` : 'Your free meeting') : brief ? undefined : null} two />
            <GRow name={brief ? `Checklist ${brief.checklist.done} of ${brief.checklist.total}` : null} caption={brief ? (brief.checklist.missed.length ? `Not covered: ${brief.checklist.missed.join(', ')}` : 'Every must-ask covered') : null} two />
            {m && Object.keys(m.state.seen).length ? <GRow name={`${Object.keys(m.state.seen).length} tips came up`} caption={`${m.state.acted.length} acted on`} two /> : null}
          </div>
        </GCard>
      </div>
    </>
  )

  return (
    <div className={styles.page} aria-hidden data-testid="meeting-room-ghost">
      <GhostHead2 crumb={112} title={220} chips={[132, 168, 96]} actions={actions} />
      <div className={styles.content}>
        {s === 'planned' && m?.clientAnswer && first ? <p className={styles.banner}><Bone w={18} h={18} r="50%" /><Words>{m.clientAnswer === 'yes' ? `${first} says they’ll be there.` : `${first} says the time doesn’t suit${m.clientAnswerNote ? `: “${m.clientAnswerNote}”` : '.'} — Change the plan from the meeting’s row, or call them.`}</Words></p> : null}
        {s === 'held' && data?.lead.next && first && !data.project && !data.linkedToLog ? ((w) => (   /* (S42G) the page's own offer, in its words */
          <div className={styles.bannerRow}><span className={styles.bannerText}><Words className={styles.ghostBold}>{w.title}</Words><Words>{w.line}</Words></span><span className={styles.bannerActs}><Slot kind="btn" w={stepButtonWidth(meetingStepLabel(data.lead.next!))} /></span></div>
        ))(meetingStepWords(first, data.lead.next)) : null}
        <div className={styles.phoneViews} />
        <div className={styles.grid}>{s === 'live' ? live : s === 'held' ? held : before}</div>
      </div>
    </div>
  )
}
