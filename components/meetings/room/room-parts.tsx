'use client'

import { useState } from 'react'
import { ProTag } from '@/components/credits/pro-tag'
import { Button, Checkbox } from '@/components/ds'
import { Card } from '@/components/leads/detail/card'
import { Dialog } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Row } from '@/components/projects/overview/row'
import { groupDigits, moneyCard } from '@/lib/format'
import { CATEGORIES } from '@/lib/meetings/checklists'
import { DIMENSIONS, TIER_LINES, tierOf, type Dims, type Estimate, type Profile, type Upsell } from '@/lib/meetings/model'
import type { ChecklistRow, Tip } from '@/lib/meetings/engine'
import { kindLabel } from '@/lib/meetings/objections'
import type { PortfolioMatch } from '@/lib/meetings/portfolio'
import { STYLE_NAMES, styleByName, styleForLead } from '@/lib/visualizer/styles'
import { chipCss, styleBoard } from '@/lib/visualizer/materials'
import styles from './room.module.css'

/*
 * (pending modules S23) The co-pilot's cards — the lead Overview's card (components/leads/detail/card.tsx) and the LEAD STAGES row
 * (components/projects/overview/row.tsx), the house chips, checkboxes and dialogs. 1.0 drew its whisper cards, smart checklist, deal score
 * and "Quote Shadow"; these are the same jobs in 2.0's pieces. *(invented copy: every heading and line)*
 */

/** Tips as you talk — the newest three, the rest under "Earlier"; each says what was said, the studio's answer, its one button, and closes. */
export function TipsCard({ tips, onDismiss, onAct, paused, studio, lockedActions }: { tips: Tip[]; onDismiss: (t: Tip) => void; onAct: (t: Tip) => void; paused: boolean; studio: string; /** (pending modules S21) action kinds the studio's plan locks — they wear the Pro tag */ lockedActions?: string[] }) {
  const [more, setMore] = useState(false)
  const shown = more ? tips : tips.slice(0, 3)
  return (
    <Card title="Tips as you talk" meta={tips.length ? `· ${tips.length}` : undefined} testId="meeting-tips">
      <div className={styles.cardBody}>
        {paused ? <p className={styles.line}>The co-pilot is paused — tips come back when it’s on again.</p>
          : !tips.length ? <p className={styles.line} data-testid="tips-empty">Listening for a price, another studio, a deadline or a doubt — a tip shows here when one comes up.</p>
          : shown.map((t) => (
            <div key={t.key} className={styles.tip} data-kind={t.kind} data-testid="meeting-tip">
              <div className={styles.tipHead}>
                <Icon name={t.kind === 'objection' ? 'flag' : t.kind === 'rival' ? 'store' : t.kind === 'idea' ? 'palette' : 'lightbulb'} size={20} weight={300} className={styles.tipIcon} />
                <span className={styles.tipTitle}>{t.title}</span>
                <Tooltip label="Close the tip"><IconButton icon="close" label={`Close the tip: ${t.title}`} onClick={() => onDismiss(t)} /></Tooltip>
              </div>
              <p className={styles.tipBody}>{t.body}</p>
              <p className={styles.said}>They said: “{t.said}”</p>
              {t.answer ? (
                <div className={styles.answer} data-testid="tip-answer">
                  <span className={styles.answerHead}>{studio}’s answer · “{t.answer.title}”</span>
                  <span>{t.answer.text}</span>
                </div>
              ) : null}
              {t.action ? <span className={styles.tipAct}><Button appearance="text" onPress={() => onAct(t)}>{t.action.label}{lockedActions?.includes(t.action.kind) ? <> <ProTag /></> : null}</Button></span> : null}
            </div>
          ))}
        {tips.length > 3 && !paused ? <Row icon={more ? 'keyboard_arrow_up' : 'expand_more'} name={more ? 'Show fewer' : `Earlier tips (${tips.length - 3})`} onPress={() => setMore((m) => !m)} toggle /> : null}
      </div>
    </Card>
  )
}

/** The meeting checklist — Must ask · Important · Good to cover, a word heard ticks it (the spark says so), a hand tick or untick wins. */
export function ChecklistCard({ rows, closing, onToggle, readOnly = false }: { rows: ChecklistRow[]; closing: boolean; onToggle: (id: string, on: boolean) => void; readOnly?: boolean }) {
  const done = rows.filter((r) => r.ticked).length
  const missed = rows.filter((r) => r.category === 'critical' && !r.ticked)
  return (
    <Card title="Meeting checklist" meta={`· ${done}/${rows.length}`} testId="meeting-checklist">
      <div className={styles.cardBody}>
        {closing && missed.length ? <p className={styles.banner} data-tone="warn" data-testid="checklist-closing"><Icon name="info" size={18} />Wrapping up — {missed.length === 1 ? 'one must-ask isn’t covered yet' : `${missed.length} must-asks aren’t covered yet`}</p> : null}
        {CATEGORIES.map((c) => {
          const list = rows.filter((r) => r.category === c.key)
          if (!list.length) return null
          return (
            <div key={c.key} className={styles.checkGroup}>
              <span className={styles.groupLabel}>{c.label}</span>
              {list.map((r) => (
                <div key={r.id} className={styles.checkRow} data-ticked={r.ticked || undefined} data-testid="checklist-row">
                  <Checkbox isSelected={r.ticked} isDisabled={readOnly} onChange={(on: boolean) => onToggle(r.id, on)}>{r.label}</Checkbox>
                  {r.auto ? <Tooltip label={r.evidence ? `Heard: “${r.evidence}”` : 'Ticked from what was said'}><span className={styles.spark} data-testid="checklist-auto" aria-label="Ticked from what was said"><Icon name="auto_awesome" size={16} /></span></Tooltip> : null}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** The deal score: the number, its tier and line, and the six dimensions as bars, weakest first. */
export function ScoreCard({ score, dims, hidden = false }: { score: number; dims: Dims; hidden?: boolean }) {
  const [open, setOpen] = useState(false)
  if (hidden) return null
  const tier = tierOf(score)
  return (
    <Card title="Deal score" testId="meeting-score">
      <div className={styles.cardBody}>
        <div className={styles.scoreLine}><span className={styles.score} data-testid="score-number">{score}</span><span className={styles.tier} data-tier={tier}>{tier}</span><span className={styles.line}>{TIER_LINES[tier]}</span></div>
        {open ? DIMENSIONS.map((d) => (
          <div key={d.key} className={styles.dim}>
            <span className={styles.dimLabel}>{d.label}</span>
            <span className={styles.track} aria-hidden><span className={styles.fill} style={{ width: `${Math.round(dims[d.key] * 100)}%` }} data-level={dims[d.key] >= 0.7 ? 'high' : dims[d.key] >= 0.4 ? 'mid' : 'low'} /></span>
            <span className={styles.dimLine}>{dims[d.key] >= 0.6 ? d.high : d.low}</span>
          </div>
        )) : null}
        <Row icon={open ? 'keyboard_arrow_up' : 'expand_more'} name={open ? 'Hide the six parts' : 'Why this score'} onPress={() => setOpen((o) => !o)} toggle testId="score-why" />
      </div>
    </Card>
  )
}

/** The rough estimate — the works heard at typical Singapore rates, as a range — and the add-ons often added to them. */
export function EstimateCard({ estimate, addOns, onDraft, draftLabel, showAddOns = true }: { estimate: Estimate; addOns: Upsell[]; onDraft?: () => void; draftLabel?: string; showAddOns?: boolean }) {
  return (
    <Card title="Rough estimate" meta={estimate.lines.length ? `· ${moneyCard(estimate.lowMinor)} – ${moneyCard(estimate.highMinor)}` : undefined} testId="meeting-estimate">
      <div className={styles.cardBody}>
        {estimate.lines.length ? (
          <div className={styles.group}>
            {estimate.lines.map((l) => <Row key={l.key} icon="request_quote" name={l.name} caption={l.category} meta={`${moneyCard(l.lowMinor)} – ${moneyCard(l.highMinor)}`} two testId="estimate-line" />)}
          </div>
        ) : <p className={styles.line} data-testid="estimate-empty">The works appear here as they’re named — a kitchen, two bathrooms, wardrobes, painting…</p>}
        {estimate.lines.length ? <p className={styles.note}>A rough guide from typical Singapore prices — never a quote.</p> : null}
        {showAddOns && addOns.length ? (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Add-ons to suggest</span>
            {addOns.map((a) => <Row key={a.key} icon="add_circle" name={a.description} meta={`+${moneyCard(a.valueMinor)}`} testId="estimate-addon" />)}
          </div>
        ) : null}
        {onDraft ? <span className={styles.cardAct}><Button variant="secondary" appearance="outlined" onPress={onDraft} data-testid="estimate-draft">{draftLabel ?? 'Make a draft quote'}</Button></span> : null}
      </div>
    </Card>
  )
}

/** What the meeting heard about the client — the brief's profile. */
export function HeardRows({ p, tags }: { p: Profile; tags: string[] }) {
  const rows: { icon: string; name: string; meta: string }[] = [
    ...(p.propertyType ? [{ icon: 'home', name: 'Home', meta: p.areaSqft ? `${p.propertyType} · ${groupDigits(String(p.areaSqft))} sq ft` : p.propertyType }] : p.areaSqft ? [{ icon: 'home', name: 'Size', meta: `${groupDigits(String(p.areaSqft))} sq ft` }] : []),
    ...(p.rooms.length ? [{ icon: 'kitchen', name: 'Rooms', meta: p.rooms.join(', ') }] : []),
    ...(p.budgetMinor ? [{ icon: 'money_bag', name: 'Budget', meta: p.budgetMinor.min === p.budgetMinor.max ? moneyCard(p.budgetMinor.min) : `${moneyCard(p.budgetMinor.min)} – ${moneyCard(p.budgetMinor.max)}` }] : []),
    ...(p.styles.length ? [{ icon: 'palette', name: 'Style', meta: p.styles.join(', ') }] : []),
    ...(p.timeline ? [{ icon: 'schedule', name: 'Timeline', meta: p.timeline }] : []),
    ...(p.keyCollection ? [{ icon: 'key', name: 'Key collection', meta: p.keyCollection }] : []),
    ...(p.decisionMakers ? [{ icon: 'group', name: 'Who decides', meta: p.decisionMakers }] : []),
    ...(p.household.length ? [{ icon: 'people_alt', name: 'At home', meta: p.household.join(', ') }] : []),
    ...(p.concerns.length ? [{ icon: 'flag', name: 'Concerns', meta: p.concerns.join(', ') }] : []),
    ...(p.competitors.length ? [{ icon: 'store', name: 'Also talking to', meta: p.competitors.join(', ') }] : []),
  ]
  return (
    <div className={styles.group} data-testid="heard-rows">
      {rows.length ? rows.map((r) => <Row key={r.name} icon={r.icon} name={r.name} meta={r.meta} wrap />) : <p className={styles.line}>Nothing about the home or the budget was heard yet.</p>}
      {tags.length ? <p className={styles.tags} data-testid="heard-tags">{tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}</p> : null}
    </div>
  )
}

/** A style as a board of materials — the AI Visualizer's own board (lib/visualizer/materials.ts `styleBoard`) and the style's palette. */
export function StyleBoard({ name, big = false }: { name: string; big?: boolean }) {
  const style = styleByName(name) ?? styleForLead(name)
  if (!style) return null
  const board = styleBoard(style.name)
  return (
    <div className={styles.board} data-big={big || undefined} data-testid="style-board">
      <div className={styles.swatches}>
        {/* a material's own swatch and the style's palette — data, carried as a custom property (the house rule keeps design values out of style) */}
        {board.map((m) => <span key={m.id} className={styles.swatch} style={{ '--swatch': chipCss(m) } as React.CSSProperties} title={m.name} />)}
        {style.colorPalette.map((c) => <span key={c} className={styles.chip} style={{ '--swatch': c } as React.CSSProperties} aria-hidden />)}
      </div>
      <span className={styles.boardName}>{style.name}</span>
      <span className={styles.boardLine}>{style.description}</span>
    </div>
  )
}

/** Mood boards — the styles heard first, any of the twenty-five; one shows full-screen for the client, and is kept with the meeting. */
export function MoodBoardDialog({ open, onClose, heard, kept, onKeep, client, style }: { open: boolean; onClose: () => void; heard: string[]; kept: string[]; onKeep: (name: string) => void; client: string; style?: string | null }) {
  const first = [...new Set([...(style ? [style] : []), ...heard.map((h) => styleByName(h)?.name ?? styleForLead(h)?.name).filter((x): x is string => !!x)])]
  const [pick, setPick] = useState<string>(first[0] ?? STYLE_NAMES[0]!)
  const [shown, setShown] = useState(open)
  const [present, setPresent] = useState(false)
  if (open !== shown) { setShown(open); if (open) { setPick(first[0] ?? STYLE_NAMES[0]!); setPresent(false) } }
  const options = [...first, ...STYLE_NAMES.filter((n) => !first.includes(n))]
  return (
    <>
      <Dialog open={open && !present} onClose={onClose} title="Mood board" subtitle={first.length ? `${client} talked about ${first.join(', ')}` : 'Pick a style to show'} size="modal" width={800}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setPresent(true)} data-testid="board-present">Show {client}</Button><Button onPress={() => { onKeep(pick); onClose() }} isDisabled={kept.includes(pick)} data-testid="board-keep">{kept.includes(pick) ? 'Kept with the meeting' : 'Keep with the meeting'}</Button></>}>
        <div className={styles.boardPick}>
          <Chips label="Style" value={pick} onChange={setPick} options={options} testId="board-styles" />
          <StyleBoard name={pick} big />
        </div>
      </Dialog>
      <Dialog open={open && present} onClose={() => setPresent(false)} title={pick} fluid>
        <div className={styles.present}><StyleBoard name={pick} big /></div>
      </Dialog>
    </>
  )
}

/** Your past projects closest to the client's style, home and budget (1.0's portfolio search) — each shown full-screen, or opened. */
export function PortfolioDialog({ open, onClose, matches, all, client }: { open: boolean; onClose: () => void; matches: PortfolioMatch[]; all: number; client: string }) {
  const [show, setShow] = useState<PortfolioMatch | null>(null)
  return (
    <>
      <Dialog open={open && !show} onClose={onClose} title="Your past projects" subtitle={matches.length ? `Closest to what ${client} described` : undefined} size="modal" width={800}>
        <div className={styles.group} data-testid="portfolio-list">
          {matches.length ? matches.map((m) => (
            <Row key={m.id} icon="photo" name={`${m.number} · ${m.name}`} caption={m.reasons.join(' · ') || undefined} meta={`${m.score}% match`} two
                 actions={[...(m.picture ? [{ label: `Show ${client}`, onPress: () => setShow(m) }] : []), { label: 'Open', onPress: () => { window.open(m.href, '_blank', 'noopener') } }]} testId="portfolio-row" />
          )) : <p className={styles.line}>{all ? 'None of your projects is close yet — the matches come as the style and the home are named.' : 'Your projects show here once the studio has some.'}</p>}
        </div>
      </Dialog>
      <Dialog open={!!show} onClose={() => setShow(null)} title={show ? `${show.number} · ${show.name}` : ''} fluid>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {show?.picture ? <img src={show.picture} alt={show.name} className={styles.presentImg} /> : null}
      </Dialog>
    </>
  )
}

/** The objections the client raised, each with the answer the studio saved for it. */
export function ObjectionRows({ objections, studio }: { objections: { kind: string; said: string; answer: string | null; answerTitle: string | null; competitor: string | null }[]; studio: string }) {
  if (!objections.length) return <p className={styles.line}>No doubts came up.</p>
  return (
    <div className={styles.group} data-testid="brief-objections">
      {objections.map((o, i) => (
        <div key={i} className={styles.concern} data-kind="objection">
          <div className={styles.tipHead}><Icon name="flag" size={20} weight={300} className={styles.tipIcon} /><span className={styles.tipTitle}>{kindLabel(o.kind)}{o.competitor ? ` · ${o.competitor}` : ''}</span></div>
          <p className={styles.said}>They said: “{o.said}”</p>
          {o.answer ? <div className={styles.answer}><span className={styles.answerHead}>{studio}’s answer{o.answerTitle ? ` · “${o.answerTitle}”` : ''}</span><span>{o.answer}</span></div> : <p className={styles.note}>No answer saved for this kind yet — Settings › Meetings › Objection answers.</p>}
        </div>
      ))}
    </div>
  )
}
