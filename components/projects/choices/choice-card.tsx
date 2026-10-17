'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ago } from '@/lib/templates/ago'
import { answerOf } from '@/lib/projects/decline'
import {
  CHOICE_SOURCES, SOURCE_WORD, STUDIO_NOTE_DEFAULT, contractLine, deleteBlock, isChoiceOverdue, neededLine, optionsBlock, pickBlock, priceText, shareBlock, unshareBlock,
  type ChoiceSource, type ChoiceView, type OptionView,
} from '@/lib/projects/choices-model'
import styles from './choices.module.css'

export type ChoiceAction = 'edit' | 'preview' | 'share' | 'unshare' | 'choose' | 'delete'
  | 'variation'   // (Projects round 6) draft — or open — the variation order of a pick's price difference
  | 'invite'   // (fix-C, C-18) the Client access panel, for a client not on the portal yet
  | 'receipt'   // (gaps build D, item 7) the pick's selection receipt
export type OptionAction = 'edit' | 'earlier' | 'later' | 'remove'
  | 'save_materials' | 'save_book'   // (gaps build D, item 11) a new option kept in Company › Materials or the Price book

/** An option's square: its picture, else its colour, else the glyph of where it came from. */
export function OptionSquare({ o, className }: { o: Pick<OptionView, 'src' | 'hex' | 'source'>; className?: string }) {
  if (o.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <span className={className}><img src={o.src} alt="" /></span>
  }
  if (o.hex) return <span className={className} data-hex="" style={{ '--swatch': o.hex } as CSSProperties} />
  return <span className={className}><Icon name={CHOICE_SOURCES.find((s) => s.key === o.source)?.icon ?? 'image'} size={24} weight={300} /></span>
}

/**
 * (Projects round 8) One choice on the tab — the detail card's white box. Along its top, the state band (the quote's approval / sent banner,
 * REG-624): a **Draft** says only the studio sees it, with Share with {client}; a **Shared** one says it waits for the client, with Choose with
 * {client} (a pick made off the portal); a **Chosen** one names who chose what and when, with their note, and Change the pick until the work it
 * belongs to starts (a refusal says why in the band). Then the title, its room · milestone · needed-by chips, ⋮ (Edit · See it as the client ·
 * Choose / Change the pick · Take back · Delete — a refused one says why in its row, REG-656), the line for the client, and the options as the
 * house square, each with its own ⋮ (Edit · Move earlier · Move later · Remove), the pick ringed and ticked. A pick's price shows as
 * "+S$1,308.00 on the contract (S$1,200.00 + GST)" — what the variation order round 6 drafts from it carries (REG-1068; one format, fix-C C-21).
 */
export function ChoiceCard({ c, clientFirst, invited, section = true, stage, today, now, gstPct, mayChange, busy, onAction, onOption, onAdd }: {
  c: ChoiceView
  clientFirst: string
  /** The client can open their portal — a shared choice reaches them there. */
  invited: boolean
  /** (fix-C, C-18) The portal's Choices are switched on. */
  section?: boolean
  stage: string
  /** Day number (lib/projects/schedule-model.ts `dayOf`). */
  today: number
  now: number
  /** (REG-1068) The GST a pick's variation order adds — the contract line says the figure the order will carry. */
  gstPct: number
  mayChange: boolean
  busy: boolean
  onAction: (a: ChoiceAction, c: ChoiceView) => void
  onOption: (a: OptionAction, o: OptionView, c: ChoiceView) => void
  onAdd: (source: ChoiceSource, c: ChoiceView) => void
}) {
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const [adding, setAdding] = useState(false)
  const addRef = useRef<HTMLButtonElement>(null)
  const pick = (a: ChoiceAction) => { setMenu(false); onAction(a, c) }
  const chosen = c.chosen ? c.options.find((o) => o.id === c.chosen!.optionId) ?? null : null
  const shareWhy = shareBlock(c)
  const unshareWhy = unshareBlock(c)
  const pickWhy = pickBlock(c, stage, today)
  const deleteWhy = deleteBlock(c)
  const addWhy = optionsBlock(c, true)
  const done = stage === 'completed'   // (fix-C, C-16) a completed project's open choice is never chosen now — no wait, no red
  const reaches = invited && section
  const overdue = isChoiceOverdue(c, today) && reaches && !done   // (fix-C, C-18) never late on a client who can't see it
  /** "2d ago" · "3h ago" — and a date with its "on": "on 24 Sep ’26". */
  const when = (at: number) => { const a = ago(at, now); return /ago$|now$/.test(a) ? a : `on ${a}` }

  const band = c.status === 'draft' ? (
    <div className={styles.band} role="status" data-tone="changes" data-testid="choice-band">
      <span className={styles.bandIcon}><Icon name="draft" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Draft</b> — {c.options.length ? (reaches ? `only the studio sees it. Share it and ${clientFirst} chooses on their portal.` : !invited ? `only the studio sees it. Share it, and ${clientFirst} chooses once invited to the portal.` : `only the studio sees it. The portal’s Choices are switched off — choose with ${clientFirst} once it’s shared.`) : `add the options, then share it with ${clientFirst}.`}</span>
      {mayChange ? (
        <span className={styles.bandActions}>
          <Button onPress={() => onAction('share', c)} isDisabled={busy || !!shareWhy} data-testid="choice-share">{`Share with ${clientFirst}`}</Button>
        </span>
      ) : null}
    </div>
  ) : c.status === 'declined' ? (
    /* (gaps build D, item 2 — M-07) the client said no on their portal: their answer and reason, and the studio's next move — add other options
       and share it again (or choose with them) */
    <div className={styles.band} role="status" data-tone="await" data-testid="choice-band" data-declined="">
      <span className={styles.bandIcon}><Icon name="chat" size={20} weight={300} /></span>
      <span className={styles.bandText} data-testid="choice-answer">
        <b>{`${c.answer?.person ?? clientFirst} ${c.answer ? answerOf(c.answer.kind).studio : 'said no'}`}</b>{c.answer ? ` ${when(c.answer.at)}` : ''}
        {c.answer?.note ? <> — <i>{`“${c.answer.note}”`}</i></> : null}
        {done ? '' : ` ${c.answer?.kind === 'reject' ? 'Change the options, or take it back.' : 'Add other options, then share it again.'}`}
      </span>
      {mayChange ? (
        <span className={styles.bandActions}>
          <Button onPress={() => onAction('share', c)} isDisabled={busy || !!shareWhy} data-testid="choice-share-again">Share again</Button>
          <Button variant="secondary" appearance="outlined" onPress={() => onAction('choose', c)} isDisabled={busy || !!pickWhy} data-testid="choice-choose">{`Choose with ${clientFirst}`}</Button>
        </span>
      ) : null}
    </div>
  ) : c.status === 'shared' && done ? (
    /* (fix-C, C-16) the project ended with this one open: it says so, read-only, never "waiting" */
    <div className={styles.band} role="status" data-tone="changes" data-testid="choice-band">
      <span className={styles.bandIcon}><Icon name="lock" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Never chosen</b> — the project is complete.</span>
    </div>
  ) : c.status === 'shared' ? (
    <div className={styles.band} role="status" data-tone="await" data-testid="choice-band">
      <span className={styles.bandIcon}><Icon name="hourglass_top" size={20} weight={300} /></span>
      <span className={styles.bandText}>
        <b>{reaches ? `Waiting for ${clientFirst}` : 'Shared'}</b>{c.sharedAt ? ` — shared ${when(c.sharedAt)}${c.sharedBy ? ` by ${c.sharedBy}` : ''}` : ''}.
        {/* (fix-C, C-18 · C-28) words true to access, the client named again — never "them" */}
        {invited ? (section ? '' : ` The portal’s Choices are switched off — ${clientFirst} doesn’t see it there.`) : ` ${clientFirst} sees it once invited to the portal.`}
      </span>
      {mayChange ? (
        <span className={styles.bandActions}>
          {!invited ? <Button appearance="text" onPress={() => onAction('invite', c)} isDisabled={busy} data-testid="choice-invite">{`Invite ${clientFirst}`}</Button> : null}
          <Button variant="secondary" appearance="outlined" onPress={() => onAction('choose', c)} isDisabled={busy || !!pickWhy} data-testid="choice-choose">{`Choose with ${clientFirst}`}</Button>
        </span>
      ) : null}
    </div>
  ) : (
    /* (fix-C, C-26) a settled choice reads on the page's own surface (the band's settled tone), never the waiting purple */
    <div className={styles.band} role="status" data-tone="changes" data-testid="choice-band" data-chosen="">
      <span className={styles.bandIcon}><Icon name="check_circle" size={20} weight={300} /></span>
      <span className={styles.bandText} data-testid="choice-pick">
        {c.chosen?.by === 'client'
          ? <><b>{`${clientFirst} chose ${chosen?.name ?? 'an option'}`}</b>{c.chosen ? ` ${when(c.chosen.at)}` : ''}</>
          : <><b>{`Chosen with ${clientFirst}`}</b>{c.chosen?.member ? ` by ${c.chosen.member}` : ''}{c.chosen ? ` ${when(c.chosen.at)}` : ''}{chosen ? ` — ${chosen.name}` : ''}</>}
        {c.chosen?.note && !(c.chosen.by === 'studio' && c.chosen.note === STUDIO_NOTE_DEFAULT) ? <> — <i data-testid="choice-note">{c.chosen.note}</i></> : null}
      </span>
      {mayChange ? (
        <span className={styles.bandActions}>
          {pickWhy ? <span className={styles.bandWait} data-testid="choice-locked">{pickWhy}</span>
            : <Button appearance="text" onPress={() => onAction('choose', c)} isDisabled={busy} data-testid="choice-change">Change the pick</Button>}
        </span>
      ) : null}
    </div>
  )

  return (
    <article className={styles.choice} data-choice-id={c.id} data-status={c.status} data-kb-row="" data-kb-id={c.id} data-testid="choice-card" aria-label={c.title}>
      {band}
      <div className={styles.body}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <h3 className={styles.choiceTitle}>{c.title}</h3>
            <span className={styles.meta}>
              {c.room ? <MetaChip icon="chair">{c.room}</MetaChip> : null}
              {c.milestone ? <MetaChip icon="flag">{c.milestone.title}</MetaChip> : null}
              {c.neededBy && c.status !== 'chosen' && !(done && c.status === 'shared') ? <MetaChip icon="event" color={overdue ? 'red' : 'default'}>{neededLine(c.neededBy, today)}</MetaChip> : null}
              {c.status === 'chosen' ? <span data-testid="choice-state"><MetaChip color="green">Chosen</MetaChip></span> : null}   {/* (REG-1060) the row's own chip, as the portal draws "Chosen" */}
              {c.status === 'declined' && c.answer ? <span data-testid="choice-state"><MetaChip color="red">{answerOf(c.answer.kind).chip}</MetaChip></span> : null}   {/* (gaps build D, item 2) */}
            </span>
          </div>
          <span ref={anchor}>
            <Tooltip label="More options" disabled={menu}>
              <IconButton icon="more_vert" label={`More options for ${c.title}`} variant="bare" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} data-testid="choice-kebab" />
            </Tooltip>
          </span>
          <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={c.title}>
            {mayChange ? <DropdownItem onSelect={() => pick('edit')}>Edit</DropdownItem> : null}
            <DropdownItem onSelect={() => pick('preview')} disabled={!c.options.length} title={c.options.length ? undefined : 'Add an option first'}>See it as the client</DropdownItem>
            {mayChange && c.status === 'draft' ? <DropdownItem onSelect={() => pick('share')} disabled={!!shareWhy} title={shareWhy ?? undefined} help={shareWhy ? undefined : `${clientFirst} sees it on their portal`}>{`Share with ${clientFirst}`}</DropdownItem> : null}
            {mayChange && c.status === 'declined' ? <DropdownItem onSelect={() => pick('share')} disabled={!!shareWhy} help={shareWhy ?? `${clientFirst} chooses again, from the options as they are now`}>Share again</DropdownItem> : null}
            {c.receipt ? <DropdownItem onSelect={() => pick('receipt')} help="The pick, printable — also in Files › Choices">Selection receipt</DropdownItem> : null}
            {/* (parity map, TD-044 — 1.0's receipt for every answered selection) the client's no has its receipt too */}
            {!c.receipt && c.status === 'declined' && c.answer ? <DropdownItem onSelect={() => pick('receipt')} help={`${clientFirst}’s answer, printable`}>Selection receipt</DropdownItem> : null}
            {mayChange ? <DropdownItem onSelect={() => pick('choose')} disabled={!!pickWhy} title={pickWhy ?? undefined} help={pickWhy ? undefined : c.status === 'chosen' ? 'Until the work starts' : 'A pick made with them off the portal'}>{c.status === 'chosen' ? 'Change the pick' : `Choose with ${clientFirst}`}</DropdownItem> : null}
            {mayChange && (c.status === 'shared' || c.status === 'declined') ? <DropdownItem onSelect={() => pick('unshare')} disabled={!!unshareWhy} title={unshareWhy ?? undefined} help={`${clientFirst} no longer sees it — it goes back to Draft`}>Take back</DropdownItem> : null}
            {mayChange ? <DropdownItem tone="danger" onSelect={() => pick('delete')} disabled={!!deleteWhy} title={deleteWhy ?? undefined}>Delete</DropdownItem> : null}
          </PortalMenu>
        </div>
        {c.note ? <p className={styles.note}>{c.note}</p> : null}
        {/* (gaps build D, item 11 — 1.0 F-162) the team's own note — on this card only, never the client's */}
        {c.studioNote ? <p className={styles.teamNote} data-testid="choice-team-note"><Icon name="lock" size={16} weight={300} /><span><b>For the team</b> — {c.studioNote}</span></p> : null}
        <div className={styles.options} data-testid="choice-options">
          {c.options.map((o, i) => <OptionTile key={o.id} o={o} c={c} first={i === 0} last={i === c.options.length - 1} chosen={c.chosen?.optionId === o.id} mayChange={mayChange} gstPct={gstPct} onOption={onOption} />)}
          {mayChange && !addWhy ? (
            <>
              <button ref={addRef} type="button" className={styles.addTile} onClick={() => setAdding((o) => !o)} aria-haspopup="menu" aria-expanded={adding} disabled={busy} data-testid="choice-add-option">
                <Icon name="add" size={24} />
                <span>Add an option</span>
              </button>
              <PortalMenu open={adding} anchor={addRef} onClose={() => setAdding(false)} width={MENU_WIDTH.wide} role="menu" sheetTitle="Add an option">
                {CHOICE_SOURCES.map((s) => (
                  <DropdownItem key={s.key} onSelect={() => { setAdding(false); onAdd(s.key, c) }}>
                    <span data-testid={`choice-source-${s.key}`}>{s.label}</span>
                  </DropdownItem>
                ))}
              </PortalMenu>
            </>
          ) : null}
          {!c.options.length && !mayChange ? <p className={styles.empty}>No options yet.</p> : null}
        </div>
        {c.status === 'chosen' && chosen ? (
          <p className={styles.pickLine} data-testid="choice-contract">
            <Icon name="request_quote" size={20} weight={300} />
            <span className={styles.pickLineText}>{contractLine(chosen.priceMinor, gstPct) ?? 'No change to the price'}</span>
            {/* (Projects round 6, Q-18) the pick's price difference becomes a variation order — drafted once, then opened */}
            {/* (fix-C, C-02) an order that exists is always one press away — it follows the pick, so it never points at another option */}
            {c.variation
              ? <span className={styles.pickLineAction}><Button appearance="text" onPress={() => onAction('variation', c)} isDisabled={busy} data-testid="choice-open-vo">{`Open ${c.variation.number}`}</Button></span>
              : chosen.priceMinor && mayChange ? <span className={styles.pickLineAction}><Button appearance="text" onPress={() => onAction('variation', c)} isDisabled={busy} data-testid="choice-draft-vo">Draft a variation order</Button></span> : null}
          </p>
        ) : null}
        {/* (gaps build D, item 7) the pick's selection receipt — printable, filed in Files › Choices */}
        {c.status === 'chosen' && c.receipt ? (
          <p className={styles.pickLine} data-testid="choice-receipt">
            <Icon name="receipt_long" size={20} weight={300} />
            <span className={styles.pickLineText}>Selection receipt · in Files › Choices</span>
            <span className={styles.pickLineAction}><Button appearance="text" onPress={() => onAction('receipt', c)} data-testid="choice-open-receipt">Open</Button></span>
          </p>
        ) : null}
      </div>
    </article>
  )
}

function OptionTile({ o, c, first, last, chosen, mayChange, gstPct, onOption }: {
  o: OptionView; c: ChoiceView; first: boolean; last: boolean; chosen: boolean; mayChange: boolean; gstPct: number
  onOption: (a: OptionAction, o: OptionView, c: ChoiceView) => void
}) {
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const moveWhy = optionsBlock(c)
  const removeWhy = moveWhy ?? (c.status === 'shared' && c.options.length <= 1 ? 'A shared choice keeps one option at least' : null)
  const act = (a: OptionAction) => { setMenu(false); onOption(a, o, c) }
  return (
    <div className={styles.option} data-chosen={chosen || undefined} data-testid="choice-option" data-option-id={o.id}>
      <OptionSquare o={o} className={styles.optionThumb} />
      {chosen ? <span className={styles.pickMark} aria-label="The pick"><Icon name="check" size={16} /></span> : null}
      {mayChange ? (
        <span className={styles.optionMenu} ref={anchor}>
          <IconButton icon="more_vert" label={`More options for ${o.name}`} size={24} iconSize={18} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((x) => !x)} data-testid="option-kebab" />
          <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={o.name}>
            <DropdownItem onSelect={() => act('edit')}>Edit</DropdownItem>
            <DropdownItem onSelect={() => act('earlier')} disabled={!!moveWhy || first} title={moveWhy ?? undefined}>Move earlier</DropdownItem>
            <DropdownItem onSelect={() => act('later')} disabled={!!moveWhy || last} title={moveWhy ?? undefined}>Move later</DropdownItem>
            {/* (gaps build D, item 11) a new option — an upload, a render — kept for the next project */}
            {o.source === 'upload' || o.source === 'render' ? <DropdownItem onSelect={() => act('save_materials')} help="For the next choice and the AI Visualizer">Save to Materials…</DropdownItem> : null}
            {o.source === 'upload' || o.source === 'render' ? <DropdownItem onSelect={() => act('save_book')} help="For the next quote">Save to the Price book…</DropdownItem> : null}
            <DropdownItem tone="danger" onSelect={() => act('remove')} disabled={!!removeWhy} title={removeWhy ?? undefined}>Remove</DropdownItem>
          </PortalMenu>
        </span>
      ) : null}
      <Tooltip label={o.name} whenCut><span className={styles.optionName}>{o.name}</span></Tooltip>   {/* (REG-1063) a cut name on the house Tooltip, never a native title (REG-820) */}
      <span className={styles.optionPrice} data-none={o.priceMinor == null || undefined}>{priceText(o.priceMinor, gstPct)}</span>   {/* (fix-C, C-21) "+S$240 + GST" */}
      <span className={styles.optionSource}>{o.vendor ? `${SOURCE_WORD[o.source]} · ${o.vendor}` : SOURCE_WORD[o.source]}</span>   {/* (gaps build D, item 11) its vendor */}
    </div>
  )
}
