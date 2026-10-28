'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip, hideTooltipFor, showTooltipFor } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Row, type RowButton } from '@/components/projects/overview/row'
import { askAbout } from '@/components/maison-ai/dock/maison-dock'
import { moneyCard } from '@/lib/format'
import type { InboxRow, InboxVerb } from '@/lib/dashboard/inbox'
import styles from './inbox.module.css'

/** The WhatsApp glyph the house draws beside a number (the identity block's, 858:24788) — a channel's icon on its verb (his note). */
const WhatsAppGlyph = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/figma-assets/whatsapp-grey.svg" width={16} height={16} alt="" className={styles.channel} />
)
const iconOf = (v: InboxVerb) => (v.icon === 'whatsapp' ? <WhatsAppGlyph /> : v.icon ? <Icon name={v.icon} size={18} /> : undefined)
/** A row's money as a record card writes it (moneyCard — the house's rows and cards, T-11). (the calm UI build 2026-10-27 — the audit's 1-05) A
    variation order that takes money off reads "S$ 545 less" (was "−S$ 545", which read as a debt). */
export const rowMoney = (minor: number) => (minor < 0 ? `${moneyCard(-minor)} less` : moneyCard(minor))
const isReview = (v: InboxVerb | undefined) => !!v && (v.do.kind === 'review' || v.label === 'Review')

type MenuItem = { label: string; run: () => void; help?: string; disabled?: boolean; testId?: string; shortcut?: string }
/** A row's ⋮ — the house PortalMenu anchored to a bare icon button, a sheet on a phone with the row's title. (the calm pass 2026-10-26)
    It holds the row's second verb now, so the row keeps ONE; at a desk it shows on the row's hover or focus (always on touch, and while open). */
function RowMore({ title, items }: { title: string; items: MenuItem[] }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <span ref={anchor} className={styles.more} data-open={open ? '' : undefined}>
      <Tooltip label="More" disabled={open}>
        <IconButton icon="more_vert" label={`More for ${title}`} variant="bare" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="need-more" />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
        {items.map((a) => (
          <span key={a.label} className={styles.menuRow} data-testid={a.testId ? `menu-${a.testId}` : undefined}>
            <DropdownItem onSelect={() => { setOpen(false); a.run() }} help={a.help} disabled={a.disabled} shortcut={a.shortcut}>{a.label}</DropdownItem>
          </span>
        ))}
      </PortalMenu>
    </span>
  )
}

/** One line of words that ends in "…" when the row is too narrow — its full words in the house tooltip, only then (his correction 3: a long
    name truncates with its full words in the tooltip). On touch the title takes two lines instead (inbox.module.css). */
function Clip({ text, className, children }: { text: string; className?: string; children?: ReactNode }) {
  return (
    <span className={className}
          onPointerEnter={(e) => { const el = e.currentTarget; if (e.pointerType !== 'touch' && el.scrollWidth > el.clientWidth + 1) showTooltipFor(el, el.textContent?.trim() || text) }}
          onPointerLeave={(e) => hideTooltipFor(e.currentTarget)}>
      {children ?? text}
    </span>
  )
}

/** Late and ours (S-05: red is earned) — the one row that wears its own colour; every other glyph is the option's one quiet tint. */
const toneOf = (r: InboxRow) => (r.tone === 'late' ? 'late' : r.ok ? 'ok' : r.group)

/**
 * (the Dashboard redesigned, 2026-10-26 — P-04 · lane D2; the calm pass 2026-10-26 — lane C2) One Needs you row on the house Row
 * (components/projects/overview/row.tsx), as the Claude Design option draws it: a small glyph in the one quiet tint, ONE title line, ONE short
 * caption (where · who · when — lib/dashboard/inbox-queries.ts), the amount right-aligned, then ONE verb — the house Row's own text button,
 * as the project's Needs you and Finance › To do draw a row's verb (his "not happy with these buttons", 2026-10-27: the outlined boxes were the
 * Dashboard's alone; never filled, his note), a channel's glyph only on a channel's verb — and the row's ⋮: its second verb (Review — R), the record's own
 * steps (Send back …), Open, Not today, Ask about this. The words open the record; ↵ on the keyboard's row presses the row's own verb, R its
 * Review (`data-kb-open` · `data-kb="list.review"` — on the verb, or on a key-only control when Review sits in the ⋮). `data-inbox-row` is the
 * mark a Since chip finds it by.
 */
export function InboxRowView({ r, busy, fresh, current, onPress, onNotToday }: {
  r: InboxRow
  busy: boolean
  /** its Review pane is open beside the list */
  current?: boolean
  /** a Since chip brought you here: the row's pulse (the house `attention()`) */
  fresh?: boolean
  onPress: (r: InboxRow, v: InboxVerb) => void
  onNotToday: (r: InboxRow) => void
}) {
  const [main, other] = r.verbs
  const button = (v: InboxVerb): RowButton => ({
    label: v.label, icon: iconOf(v), busy, testId: v.testId ?? 'need-action', onPress: () => onPress(r, v), kbOpen: true,
    ...(isReview(v) ? { kb: 'list.review' } : {}),   // a kind with no pane: its Review is its door
  })
  const items: MenuItem[] = [
    ...(other ? [{ label: other.label, run: () => onPress(r, other), testId: other.testId ?? 'need-secondary', ...(isReview(other) ? { shortcut: 'list.review' } : {}) }] : []),
    ...r.menu.map((v) => ({ label: v.label, run: () => onPress(r, v), testId: v.testId })),
    { label: 'Open', run: () => onPress(r, { label: 'Open', do: { kind: 'href', href: r.open } }), testId: 'need-open' },
    r.snoozeKey ? { label: 'Not today', run: () => onNotToday(r), testId: 'need-not-today' }   // (one ⋮ grammar, REG-1381…: no "…", a help line only for a refusal)
      : { label: 'Not today', help: r.stays ?? 'It can’t wait for tomorrow', disabled: true, run: () => {}, testId: 'need-not-today' },
    { label: 'Ask Maison AI about this', run: () => askAbout('needs'), testId: 'need-ask' },   // (the calm UI build 2026-10-27 — the audit's 1-19: one name for the one assistant)
  ]
  /* one row per label — a door named "Open" among the record's own steps is the ⋮'s Open */
  const menu = items.filter((m, i) => items.findIndex((x) => x.label === m.label) === i)
  /* R reviews the cursor's row (the house key layer finds `data-kb="list.review"` in it): with Review in the ⋮, a key-only control carries it */
  const reviewKey = isReview(other) && !isReview(main) ? (
    <button type="button" tabIndex={-1} aria-hidden className={styles.keyOnly} data-kb="list.review" onClick={() => onPress(r, other!)}>Review</button>
  ) : null
  const money = r.amountMinor ? rowMoney(r.amountMinor) : null
  const words = r.caption ?? ''
  /* the money stands in its column beside the words; in a narrow card (a phone, a tablet held sideways — the list's container query) it
     leads the caption instead, so the words keep their width (the first pass's phone rule, now by the card's width) */
  return (
    <Row two icon={r.icon} className={styles.row}
         glyph={<span className={styles.glyph} data-tone={toneOf(r)} aria-hidden><Icon name={r.icon} size={18} weight={300} /></span>}
         name={<Clip text={r.title} className={styles.title} />}
         caption={words || money ? (
           <Clip text={words} className={styles.caption}>
             {money ? <span className={styles.capAmount}>{words ? `${money} · ` : money}</span> : null}{words}
           </Clip>
         ) : undefined}
         meta={money ? <span className={styles.amount}>{money}</span> : undefined}
         href={r.open} actions={main ? [button(main)] : []}
         after={<span className={styles.end}>{reviewKey}<RowMore title={r.title} items={menu} /></span>}
         attrs={{ 'data-inbox-row': r.key, 'data-kb-row': '', 'data-kb-id': r.key, 'data-fresh': fresh ? '' : undefined, 'data-current': current ? '' : undefined, 'data-ok': r.ok ? '' : undefined, 'data-tone-row': toneOf(r), 'data-folded': r.folded ? String(r.folded) : undefined, 'data-folded-keys': r.foldedKeys?.join(' ') || undefined }}
         testId={`need-${r.kind.replace(/[^a-z0-9-]/gi, '-')}`} />
  )
}
