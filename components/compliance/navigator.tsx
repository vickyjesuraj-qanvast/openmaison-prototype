'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { NOTE_MAX, type RegistrationNote } from '@/lib/compliance/notes'   // (parity map, TD-110)
import { restoreRegistrationNote, setRegistrationNote } from '@/lib/compliance/notes-actions'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { CompanyShell } from '@/components/company/company-shell'
import { ItemRow } from '@/components/projects/compliance/item-row'
import { useMaisonAi } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import { COMPLIANCE_PHASES, KIND_LABEL, groupByCategory, itemsFor, type ComplianceKind, type CompliancePhase } from '@/lib/compliance/model'
import { STUDIO_ACTIONS, fillStudio, type StudioAction } from '@/lib/compliance/studio-actions'
import type { NavigatorData } from '@/lib/compliance/queries'
import { NavigatorGhost } from './navigator-ghost'
import compliance from '@/components/projects/compliance/compliance.module.css'
import styles from './navigator.module.css'

export type NavigatorTab = 'studio' | 'rules'
const KINDS: ComplianceKind[] = ['hdb', 'condo', 'landed']

/** (the calm UI build 2026-10-27, 6-02) A step's about, split at its first sentence: the card says the first, the steps open the rest. */
export function aboutParts(about: string): { first: string; rest: string } {
  const at = about.search(/[.!?](\s|$)/)
  if (at < 0) return { first: about, rest: '' }
  return { first: about.slice(0, at + 1), rest: about.slice(at + 1).trim() }
}

/**
 * (gaps build I, I-Q12 — 1.0's Compliance Navigator, F-273, its ticks kept in the browser) Tools › Compliance Navigator, on Company's frame:
 * **Your studio** — the studio's own five steps (the HDB contractors' directory, CaseTrust, bizSAFE, BCA licensed contractors, ACRA
 * BizFile+), each with what you need and the steps with the studio's name and UEN from Company › Profile, the official link, and To do / Done
 * with who and when; **Rules by home** — Singapore's checklist by HDB flat, condo and landed home, phase and words, read-only (each project
 * ticks its own on its Compliance tab). (one-home N-07) To do / Done is read from the studio's one record of registrations, recorded on
 * Company › Profile (Owners and Admins, with Undo) — the card's Record as done opens it there.
 * (parity map, TD-110 — 1.0's Internal notes on each action) Each step keeps a **Notes** line: where the application stands, in the studio's
 * words ("Applied on 12 Jan — waiting for HDB to respond."). Owners and Admins add and change it on the card, with Undo; everyone reads it.
 * (the calm UI build 2026-10-27, 6-02 · 6-13 — T-02 one verb on a card, T-05, T-06) Your studio: "2 of 5 done" under the tabs (the intro's
 * other words were the system talking about itself — the steps still carry the studio's name and UEN); each card = its sentence-case title
 * and line (the whole head opens the steps, its chevron at the end — no "Show the steps"), the status and who · when, the about's first
 * sentence (the rest opens with the steps), the note when there is one, and ONE verb, the official portal; Record as done · Add a note sit in
 * the card's ⋮ (Owners and Admins). The agency tag went: the title names the agency. Rules by home: the picked chip names the home (no
 * "Rules for an HDB flat" head), the count says how many you must follow, and a one-column list has no "Rule" head.
 */
export function Navigator({ data, tab, from, kind }: { data: NavigatorData; tab: NavigatorTab; from?: string; /** `?kind=` — the Rules' first kind of home */ kind?: ComplianceKind }) {
  const tabs = [{ label: 'Your studio', href: '/compliance' }, { label: 'Rules by home', href: '/compliance?tab=rules' }]
  const router = useRouter()
  useMaisonAi([
    { label: 'Which of the studio’s steps are still to do?', answer: () => Promise.resolve({
      title: `${STUDIO_ACTIONS.filter((a) => !data.states[a.id]?.done).length} still to do`,
      text: 'The studio’s own registrations, from this page.',
      rows: STUDIO_ACTIONS.filter((a) => !data.states[a.id]?.done).map((a) => ({ id: a.id, label: a.title, meta: a.organisation, href: `/compliance#${a.id}` })) }) },
    { label: 'Show the rules for an HDB flat', run: () => router.push('/compliance?tab=rules&kind=hdb') },
    { label: 'Which projects have compliance to do?', run: () => router.push('/projects') },
  ])
  return (
    <CompanyShell title="Compliance Navigator" tabs={tabs} activeHref={tab === 'rules' ? '/compliance?tab=rules' : '/compliance'} from={from} crumb="Tools" skeleton={<NavigatorGhost tab={tab} />}>
      {tab === 'rules' ? <RulesByHome first={kind ?? 'hdb'} /> : <YourStudio data={data} />}
    </CompanyShell>
  )
}

function YourStudio({ data }: { data: NavigatorData }) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  /* (one-home N-07) The studio's registrations are recorded once, on Company › Profile — this page reads that record and opens it there,
     on the registrations card, with the way back here (a hash stays last). */
  const profile = `${withFrom('/company/profile', '/compliance')}#registrations`
  const states = data.states
  const done = STUDIO_ACTIONS.filter((a) => states[a.id]?.done).length
  return (
    <div className={styles.page} data-testid="navigator-studio">
      {/* (the calm UI build, 6-02 · W-404) the one fact the page answers, and where it is recorded (the door every member keeps) */}
      <p className={styles.intro} data-testid="navigator-progress">
        <span className={styles.progress}>{`${done} of ${STUDIO_ACTIONS.length} done`}</span>
        <span aria-hidden>{' · '}</span>
        <span>{'Recorded in '}<button type="button" className={styles.link} onClick={() => router.push(profile)}>Company › Profile</button></span>
      </p>
      <div className={styles.actions}>
        {STUDIO_ACTIONS.map((a) => <StudioCard key={a.id} a={a} data={data} profile={profile} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />)}
      </div>
    </div>
  )
}

/** One of the studio's steps (6-02): the head opens its steps; one verb, the official portal; the ⋮ holds Record as done · Add a note. */
function StudioCard({ a, data, profile, open: isOpen, onToggle }: { a: StudioAction; data: NavigatorData; profile: string; open: boolean; onToggle: () => void }) {
  const router = useRouter()
  const s = data.states[a.id]
  const note = data.notes[a.id] ?? null
  const [menu, setMenu] = useState(false)
  const [noting, setNoting] = useState(false)
  const menuRef = useRef<HTMLButtonElement | null>(null)
  const { first, rest } = aboutParts(a.about)
  const stepsId = `${a.id}-steps`
  return (
    <section id={a.id} className={styles.card} aria-label={a.title} data-testid="navigator-action" data-done={s?.done ? '' : undefined}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardHeading}>
          <button type="button" className={styles.headToggle} aria-expanded={isOpen} aria-controls={stepsId} onClick={onToggle} data-testid="navigator-steps-toggle">
            <span className={styles.cardText}>
              <span className={styles.cardTitle}>{a.title}</span>
              <span className={styles.cardSub}>{a.subtitle}</span>
            </span>
            <Icon name="expand_more" size={24} weight={300} className={styles.chev} />
          </button>
        </h3>
        {data.mayChange ? (
          <>
            <Tooltip label="More actions" disabled={menu}>
              <IconButton icon="more_vert" label={`More actions for ${a.title}`} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={menu} onClick={(e) => { menuRef.current = e.currentTarget; setMenu((m) => !m) }} data-testid="navigator-menu" />
            </Tooltip>
            <PortalMenu open={menu} anchor={menuRef} onClose={() => setMenu(false)} role="menu" align="right" width={MENU_WIDTH.wide} sheetTitle={a.title}>
              {/* (one-home N-07 · the calm UI build, W-337) the door to the one record of it, on Company › Profile */}
              <DropdownItem onSelect={() => { setMenu(false); router.push(profile) }} help="In Company › Profile"><span data-testid="navigator-record">{s?.done ? 'Open the record' : 'Record as done'}</span></DropdownItem>
              {!note ? <DropdownItem onSelect={() => { setMenu(false); setNoting(true) }}><span data-testid="navigator-note-add">Add a note</span></DropdownItem> : null}
            </PortalMenu>
          </>
        ) : null}
      </div>
      <span className={styles.state} data-testid="navigator-state">
        {s?.done ? <MetaChip color="green" icon="check_circle">Done</MetaChip> : <MetaChip color="yellow">To do</MetaChip>}
        {s ? <span>{`${s.byName ? `${s.byName} · ` : ''}${displayDate(new Date(s.at))}`}</span> : null}
      </span>
      <p className={styles.about}>{first}</p>
      {isOpen ? (
        <div id={stepsId} className={styles.open}>
          {rest ? <p className={styles.about}>{rest}</p> : null}
          <div className={styles.steps} data-testid="navigator-steps">
            <div className={styles.stepsCol}><span className={styles.stepsLabel}>What you’ll need</span><ul className={styles.list}>{a.need.map((x, i) => <li key={i}>{fillStudio(x, data.legalName, data.uen)}</li>)}</ul></div>
            <div className={styles.stepsCol}><span className={styles.stepsLabel}>Step by step</span><ol className={styles.list} data-ordered="">{a.steps.map((x, i) => <li key={i}>{fillStudio(x, data.legalName, data.uen)}</li>)}</ol></div>
          </div>
        </div>
      ) : null}
      {/* `key` — opened from the ⋮ it starts empty; its own Edit starts from the note (a fresh block each time it opens) */}
      <RegistrationNoteBlock key={noting ? 'edit' : 'read'} actionId={a.id} title={a.short} note={note} mayChange={data.mayChange} editing={noting} onEditing={setNoting} />
      <div className={styles.buttons}>
        <Button variant="secondary" appearance="outlined" iconStart={<Icon name="open_in_new" size={20} />} onPress={() => window.open(a.primary.url, '_blank', 'noopener')}>{a.primary.label}</Button>
      </div>
    </section>
  )
}

/** (parity map, TD-110) A registration's note: read, or — for Owners and Admins — added and changed in place; a save answers with Undo, an emptied
    note is removed (and says so). (invented copy) (the calm UI build, 6-02) Add a note is the card's ⋮ row now; the note's own Edit stays
    beside it — `editing` is the card's, so either door opens the same field. */
function RegistrationNoteBlock({ actionId, title, note, mayChange, editing, onEditing }: { actionId: string; title: string; note: (RegistrationNote & { byName: string | null }) | null; mayChange: boolean; editing: boolean; onEditing: (on: boolean) => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [text, setText] = useState(() => note?.text ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (busy) return
    if (text.trim().length > NOTE_MAX) { setError(`Keep the note to ${NOTE_MAX} characters`); return }
    setBusy(true)
    try {
      const r = await setRegistrationNote(actionId, { text })
      if ('error' in r) { setError(r.error); return }
      onEditing(false); router.refresh()
      if ((r.before?.text ?? '') === (r.note?.text ?? '')) return
      snackbar({ message: r.note ? (r.before ? `${title} note saved` : `${title} note added`) : `${title} note removed`, actionLabel: 'Undo',
        onAction: () => { void restoreRegistrationNote(actionId, r.before).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the note back', refusalOf(u.error)) }); else router.refresh() }, () => snackbar({ message: couldnt('put the note back') })) } })
    } catch { setError('Couldn’t save the note — please try again') } finally { setBusy(false) }
  }
  if (editing && mayChange) {
    return (
      <div className={styles.note} data-testid="navigator-note-edit">
        <TextField label="Notes" value={text} onChange={(v) => { setText(v); setError(null) }} multiline={3} autoFocus maxLength={NOTE_MAX + 20}
                   helper={error ? undefined : 'Where it stands — e.g. Applied on 12 Jan, waiting for HDB to respond'} error={error ?? undefined} />
        <div className={styles.noteButtons}>
          <Button variant="secondary" appearance="text" onPress={() => onEditing(false)} isDisabled={busy}>Cancel</Button>
          <Button variant="secondary" appearance="outlined" onPress={() => { void save() }} isDisabled={busy} data-testid="navigator-note-save">{busy ? 'Saving…' : 'Save note'}</Button>
        </div>
      </div>
    )
  }
  if (!note) return null
  return (
    <div className={styles.note} data-testid="navigator-note">
      <span className={styles.stepsLabel}>Notes</span>
      <p className={styles.noteText}>{note.text}</p>
      <span className={styles.noteMeta}>
        {`${note.byName ? `${note.byName} · ` : ''}${displayDate(new Date(note.at))}`}
        {mayChange ? <button type="button" className={styles.link} onClick={() => onEditing(true)} data-testid="navigator-note-change">Edit</button> : null}
      </span>
    </div>
  )
}

/** (the calm UI build, 6-13 · W-086) "38 rules — 34 you must follow. Each project ticks its own." — the count starts as it always did. */
export const rulesCountLine = (n: number, mandatory: number) =>
  `${n} ${n === 1 ? 'rule' : 'rules'}${n ? ` — ${mandatory === n ? (n === 1 ? 'you must follow it' : 'you must follow all of them') : `${mandatory} you must follow`}` : ''}. Each project ticks its own.`

function RulesByHome({ first }: { first: ComplianceKind }) {
  const [kind, setKind] = useState<ComplianceKind>(first)
  const [phase, setPhase] = useState<CompliancePhase | 'all'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const items = useMemo(() => {
    const all = itemsFor(kind).filter((i) => phase === 'all' || i.phase === phase)
    return filterByQuery(all, query, (i) => ({ fields: [i.title, i.about, i.authority, i.reference, ...i.steps] }))
  }, [kind, phase, query])
  const groups = groupByCategory(items)
  return (
    <div className={styles.page} data-testid="navigator-rules">
      {/* (the calm UI build, 6-13) no "Rules for an HDB flat" head — the picked chip below says it; the search keeps the bar */}
      <div className={styles.filters}>
        <div className={styles.kindRow}>
          <ChipRail label="Kind of home"><Chips label="Kind of home" testId="navigator-kind" value={kind} onChange={(v) => { setKind(v as ComplianceKind); setOpen(null) }} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} /></ChipRail>
          <div className={styles.barActions}><ToolbarSearch query={query} onQuery={setQuery} placeholder="Search the rules…" label="Search the rules" /></div>
        </div>
        <ChipRail label="Phase"><Chips label="Phase" testId="navigator-phase" value={phase} onChange={(v) => { setPhase(v as CompliancePhase | 'all'); setOpen(null) }} options={[{ value: 'all', label: 'Every phase' }, ...COMPLIANCE_PHASES.map((p) => ({ value: p.key, label: p.label }))]} /></ChipRail>
        <p className={styles.count} data-testid="navigator-count">{rulesCountLine(items.length, items.filter((i) => i.level === 'mandatory').length)}</p>
      </div>
      {items.length === 0 ? <TabSearchEmpty noun="rules" searching={!!query.trim()} onClearAll={() => { setQuery(''); setPhase('all') }} /> : (
        <div className={compliance.groups}>
          {groups.map((g) => (
            <section key={g.key} className={compliance.group} aria-label={g.label}>
              <h3 className={compliance.groupHead}>{g.label}<span className={compliance.groupHelp}>{g.help}</span></h3>
              {/* (simplify round 2) a card table (REG-727), as the project's Compliance view — (the calm UI build, 6-13 · W-345) its one column needs no
                  "Rule" head */}
              <div className={compliance.table} role="table" aria-label={g.label} data-card-table="">
                {g.items.map((item) => <ItemRow key={item.id} item={item} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
