'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { markChanges } from '@/lib/writing/diff'
import { isBlank } from '@/lib/writing/html'
import { actionLabel, doneWords, offeredActions, proposeWriting, type DocPart, type Proposal, type WritingAction, type WritingKind, type WritingSources } from '@/lib/writing/propose'
import styles from './writing-help.module.css'

/** The Maison AI mark in a button's leading-icon slot (1263:36257 — the quote's Write with AI). */
export function AiMark() {
  return (
    <span className={styles.aiMark}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma-assets/maison-ai-mark.svg" alt="" />
    </span>
  )
}

/** Maison AI's sheet opening the help on one action (the editor bumps `n`; the host calls `openAction` when it changes). */
export type WritingCommand = { action: WritingAction; n: number }
/** The words now: the text, and — for a contract — its parts (a selection, the clause at the caret, the whole document; the first the default). */
export type WritingRead = { html: string; parts?: DocPart[] }

type Open = { action: WritingAction; snap: WritingRead; part: number }

/**
 * (pending modules S29 — card api:ai-writing-help-quotes) **Write with AI** where the words are written: a quote's Terms and Notes (the mock's
 * own button, 1263:36257), a line's description and a section note, a contract's document and its templates, a T&Cs & Notes template, the
 * WhatsApp messages the send dialogs draft, a quote template's introduction. A press opens the actions this place offers — Improve the writing ·
 * Shorten · Add what's missing · Rewrite from the records · Plain English — each row saying what it would do here, or why it can't (worked
 * out at once, by rule: lib/writing/propose.ts). A row opens the **proposal**: the change marked word by word (Changes · Before · After),
 * what changed in plain words, and two buttons — Not now · Use these words. The words go in only on that press, with Undo after. When the
 * text is empty and one action can fill it, the press opens that proposal straight away (Write from this quote).
 * Nothing is metered and nothing calls a model; `proposeWriting` is the one seam where a model would plug in.
 */
export type WritingHelpProps = {
  /** What the words are: "Terms and Conditions", "Description", "Message to the client". */
  label: string
  /** The record they belong to — the proposal's subtitle: "OM-10001", the line's name. */
  subject?: string
  kind: WritingKind
  /** Words on record the rules may draw on, for the part the help acts on. */
  sources: WritingSources | ((part: DocPart | null) => WritingSources)
  read: () => WritingRead
  /** Put the words in (a part of a contract, else the whole text). */
  apply: (html: string, part: DocPart | null) => void
  /** Undo: the whole text as it was before. Defaults to `apply(before, null)`. */
  restore?: (html: string) => void
  /** outlined = the quote's Terms / Notes button (the mock's); text = a toolbar's or a dialog foot's text button; icon = a field's 36 icon. */
  trigger?: 'outlined' | 'text' | 'icon'
  disabled?: boolean
  /** Over another dialog (a send dialog, the Description dialog): the lighter scrim. */
  nested?: boolean
  /** Which way the menu runs from its trigger: right-aligned under a toolbar's end (the default), left-aligned from a foot's start. */
  menuAlign?: 'left' | 'right'
  /** A crowded toolbar (the contract's): at ≤1024 the text button folds to the mark alone, named and with its tooltip. */
  compact?: boolean
  testId?: string
}
/** The help as one piece: the trigger (with its menu) and the proposal, side by side. */
export function WritingHelp(props: WritingHelpProps) {
  const h = useWritingHelp(props)
  return <>{h.trigger}{h.dialog}</>
}
/**
 * The help split for a host whose trigger can unmount (the quote's Terms / Notes fold away with their section): `trigger` goes where the
 * words are written, `dialog` where the host always is, and `openAction` opens one action's proposal — Maison AI's sheet calls it.
 */
export function useWritingHelp({ label, subject, kind, sources, read, apply, restore, trigger = 'text', disabled = false, nested = false, menuAlign = 'right', compact = false, testId = 'writing-help' }: WritingHelpProps): {
  trigger: ReactNode; dialog: ReactNode; openAction: (action: WritingAction, snap?: WritingRead) => void
} {
  const snackbar = useSnackbar()
  const anchor = useRef<HTMLSpanElement>(null)
  const [menu, setMenu] = useState<{ snap: WritingRead; rows: { action: WritingAction; p: Proposal }[] } | null>(null)
  const [open, setOpen] = useState<Open | null>(null)
  const sourcesFor = (part: DocPart | null) => (typeof sources === 'function' ? sources(part) : sources)
  const partOf = (snap: WritingRead, i: number): DocPart | null => snap.parts?.[i] ?? null
  const htmlOf = (snap: WritingRead, i: number) => partOf(snap, i)?.html ?? snap.html
  const proposalsFor = (snap: WritingRead, i: number) => {
    const part = partOf(snap, i)
    const src = sourcesFor(part)
    const html = htmlOf(snap, i)
    return offeredActions(kind, src).map((action) => ({ action, p: proposeWriting({ action, html, kind, sources: src, part: part?.key }) }))
  }

  const press = () => {
    if (disabled) return
    if (menu) { setMenu(null); return }
    const snap = read()
    const rows = proposalsFor(snap, 0)
    /* an empty text with one way to fill it (Write from this quote, My Items' words): straight to its proposal */
    const live = rows.filter((r) => !r.p.none)
    if (isBlank(htmlOf(snap, 0)) && live.length === 1) { setOpen({ action: live[0]!.action, snap, part: 0 }); return }
    setMenu({ snap, rows })
  }
  /* Maison AI's sheet asks for one action: its proposal opens on the words as they are now */
  const openAction = (action: WritingAction, snap?: WritingRead) => { if (!disabled) { setMenu(null); setOpen({ action, snap: snap ?? read(), part: 0 }) } }

  const blankNow = menu ? isBlank(htmlOf(menu.snap, 0)) : false
  const narrow = useMediaQuery(TABLET_DOWN)
  const triggerEl = trigger === 'icon' || (compact && narrow) ? (
    <Tooltip label="Write with AI" disabled={!!menu}>
      <IconButton icon="auto_awesome" glyph={<AiMark />} label={`Write with AI — ${label}`} size={36} variant="bare" disabled={disabled} aria-haspopup="menu" aria-expanded={!!menu} onClick={press} data-testid={testId} />
    </Tooltip>
  ) : (
    <Button variant={trigger === 'outlined' ? 'primary' : 'secondary'} appearance={trigger === 'outlined' ? 'outlined' : 'text'} iconStart={<AiMark />} isDisabled={disabled}
            aria-haspopup="menu" aria-expanded={!!menu} preventFocusOnPress={trigger === 'text'} onPress={press} data-testid={testId}>Write with AI</Button>
  )
  return {
    openAction,
    trigger: (
    <span ref={anchor} className={styles.anchor}>
      {triggerEl}
      <PortalMenu open={!!menu} anchor={anchor} onClose={() => setMenu(null)} role="menu" width={MENU_WIDTH.detail} align={menuAlign} sheetTitle="Write with AI">
        {menu?.snap.parts && menu.snap.parts.length > 1 ? <DropdownLabel>For {partWords(menu.snap.parts[0]!)}</DropdownLabel> : null}
        {menu?.rows.map(({ action, p }) => (
          <DropdownItem key={action} disabled={!!p.none} title={p.none ?? undefined} help={p.none ? undefined : p.short} onSelect={() => { const snap = menu.snap; setMenu(null); setOpen({ action, snap, part: 0 }) }}>
            {actionLabel(action, kind, blankNow)}
          </DropdownItem>
        ))}
      </PortalMenu>
    </span>
    ),
    dialog: (
      <ProposalDialog open={open} kind={kind} label={label} subject={subject} nested={nested}
                      propose={(o) => { const part = partOf(o.snap, o.part); const src = sourcesFor(part); return proposeWriting({ action: o.action, html: htmlOf(o.snap, o.part), kind, sources: src, part: part?.key }) }}
                      onPart={(part) => setOpen((o) => (o ? { ...o, part } : o))}
                      onClose={() => setOpen(null)}
                      onUse={(p, o) => {
                        const part = partOf(o.snap, o.part)
                        const blank = isBlank(p.before)
                        apply(p.after, part)
                        setOpen(null)
                        const before = o.snap.html
                        /* (calm-build regression fix F — S42 B-20) the whole of a titled block (Terms, Notes) is named by its title, "Added to Additional notes" */
                        const titled = !(part && part.key !== 'whole') && (kind === 'terms' || kind === 'notes')
                        snackbar({ message: doneWords(p.action, part && part.key !== 'whole' ? capital(partWords(part)) : label, blank, titled), actionLabel: 'Undo',
                                   onAction: () => { if (restore) restore(before); else apply(before, null) } })
                      }} />
    ),
  }
}

type View = 'changes' | 'before' | 'after'
/** A part in words: "“5. Variations”", "your selection", "the whole contract", "the opening". */
const partWords = (part: DocPart) => (part.key === 'selection' ? 'your selection' : part.key === 'whole' || part.label === 'The opening' ? part.label.charAt(0).toLowerCase() + part.label.slice(1) : part.label)
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** The proposal: what changed, the words marked, Not now · Use these words. */
function ProposalDialog({ open: live, kind, label, subject, nested, propose, onPart, onClose, onUse }: {
  open: Open | null; kind: WritingKind; label: string; subject?: string; nested: boolean
  propose: (o: Open) => Proposal
  onPart: (i: number) => void
  onClose: () => void
  onUse: (p: Proposal, o: Open) => void
}) {
  /* the last proposal stays drawn while the dialog leaves (its exit motion); a new one starts on Changes */
  const [last, setLast] = useState<Open | null>(live)
  const [view, setView] = useState<View>('changes')
  if (live && live !== last) { if (!last || live.action !== last.action || live.snap !== last.snap) setView('changes'); setLast(live) }
  const open = live ?? last
  const p = useMemo(() => (open ? propose(open) : null), [open])   // eslint-disable-line react-hooks/exhaustive-deps -- `propose` closes over the host's sources; the open snapshot decides
  const marked = useMemo(() => (!p || p.none ? null : markChanges(sanitizeContractHtml(p.before), sanitizeContractHtml(p.after))), [p])
  if (!open || !p) return null
  const shown: View = marked === null && view === 'changes' ? 'after' : view
  const parts = open.snap.parts ?? []
  const blank = isBlank(p.before)
  const html = p.none ? sanitizeContractHtml(p.before) : shown === 'changes' ? marked! : sanitizeContractHtml(shown === 'before' ? p.before : p.after)
  const views = [
    ...(marked !== null && !blank ? [{ value: 'changes', label: 'Changes' }] : []),
    ...(blank ? [] : [{ value: 'before', label: 'Before' }]),
    { value: 'after', label: 'After' },
  ]
  return (
    <Dialog open={!!live} onClose={onClose} title={actionLabel(open.action, kind, blank)} subtitle={subject ? `${label} · ${subject}` : label} size="modal" width={800} portal nested={nested}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Not now</Button>
              <Button isDisabled={!!p.none} onPress={() => onUse(p, open)} data-testid="writing-use">Use these words</Button>
            </>}>
      <div className={styles.body} data-testid="writing-proposal" data-action={open.action}>
        {parts.length > 1 ? (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Acts on</span>
            <Chips label="Acts on" value={String(open.part)} onChange={(v) => onPart(Number(v))} options={parts.map((x, i) => ({ value: String(i), label: x.label }))} testId="writing-parts" />
          </div>
        ) : null}
        {p.none ? (
          <p className={styles.none} role="status" data-testid="writing-none">{p.none}.</p>
        ) : (
          <ul className={styles.lines} data-testid="writing-lines">{p.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        )}
        {!p.none && views.length > 1 ? (
          <div className={styles.row}>
            <Chips label="Show" value={shown} onChange={(v) => setView(v as View)} options={views} testId="writing-view" />
          </div>
        ) : null}
        <div className={styles.paper} role="region" aria-label={p.none ? 'The words as they are' : shown === 'changes' ? 'The words with the changes marked' : shown === 'before' ? 'The words before' : 'The words proposed'}
             data-testid="writing-paper" data-view={p.none ? 'before' : shown} dangerouslySetInnerHTML={{ __html: html }} />
        <p className={styles.foot}>Worked out from your records — nothing changes until you press Use these words.</p>
      </div>
    </Dialog>
  )
}
