'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { NOTE_MAX, type RegistrationNote } from '@/lib/compliance/notes'   // (parity map, TD-110)
import { restoreRegistrationNote, setRegistrationNote } from '@/lib/compliance/notes-actions'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { CompanyShell } from '@/components/company/company-shell'
import { ItemHead, ItemRow } from '@/components/projects/compliance/item-row'
import { useMaisonAi } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import { COMPLIANCE_PHASES, KIND_LABEL, groupByCategory, itemsFor, type ComplianceKind, type CompliancePhase } from '@/lib/compliance/model'
import { STUDIO_ACTIONS, fillStudio } from '@/lib/compliance/studio-actions'
import type { NavigatorData } from '@/lib/compliance/queries'
import { NavigatorGhost } from './navigator-ghost'
import compliance from '@/components/projects/compliance/compliance.module.css'
import styles from './navigator.module.css'

export type NavigatorTab = 'studio' | 'rules'
const KINDS: ComplianceKind[] = ['hdb', 'condo', 'landed']

/**
 * (gaps build I, I-Q12 — 1.0's Compliance Navigator, F-273, its ticks kept in the browser) Tools › Compliance Navigator, on Company's frame:
 * **Your studio** — the studio's own five steps (the HDB contractors' directory, CaseTrust, bizSAFE, BCA licensed contractors, ACRA
 * BizFile+), each with what you need and the steps with the studio's name and UEN from Company › Profile, the official link, and To do / Done
 * with who and when; **Rules by home** — Singapore's checklist by HDB flat, condo and landed home, phase and words, read-only (each project
 * ticks its own on its Compliance tab). (one-home N-07) To do / Done is read from the studio's one record of registrations, recorded on
 * Company › Profile (Owners and Admins, with Undo) — the card's Record in Company › Profile opens it there.
 * (parity map, TD-110 — 1.0's Internal notes on each action) Each step keeps a **Notes** line: where the application stands, in the studio's
 * words ("Applied on 12 Jan — waiting for HDB to respond."). Owners and Admins add and change it on the card, with Undo; everyone reads it.
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
      <p className={styles.intro}>
        {`The studio’s own registrations and accreditations — ${done} of ${STUDIO_ACTIONS.length} done. The steps carry ${data.legalName || 'your company’s name'}${data.uen ? ` and UEN ${data.uen}` : ''} from `}
        <button type="button" className={styles.link} onClick={() => router.push(profile)}>Company › Profile</button>
        {data.mayChange ? ', where each one is recorded as done.' : '. Owners and Admins record them there.'}
      </p>
      <div className={styles.actions}>
        {STUDIO_ACTIONS.map((a) => {
          const s = states[a.id]
          const isOpen = open === a.id
          return (
            <section key={a.id} id={a.id} className={styles.card} aria-label={a.title} data-testid="navigator-action" data-done={s?.done ? '' : undefined}>
              <div className={styles.cardHead}>
                <span className={styles.cardText}>
                  <h3 className={styles.cardTitle}>{a.title}</h3>
                  <span className={styles.cardSub}>{a.subtitle}</span>
                </span>
                <MetaChip>{a.short}</MetaChip>
              </div>
              <span className={styles.state} data-testid="navigator-state">
                {s?.done ? <MetaChip color="green" icon="check_circle">Done</MetaChip> : <MetaChip color="yellow">To do</MetaChip>}
                {s ? <span>{`${s.byName ? `${s.byName} · ` : ''}${displayDate(new Date(s.at))}`}</span> : null}
              </span>
              <p className={styles.about}>{a.about}</p>
              <RegistrationNoteBlock actionId={a.id} title={a.short} note={data.notes[a.id] ?? null} mayChange={data.mayChange} />
              <button type="button" className={styles.toggle} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : a.id)} data-testid="navigator-steps-toggle">
                {isOpen ? 'Hide the steps' : 'Show the steps'}<Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16} />
              </button>
              {isOpen ? (
                <div className={styles.steps} data-testid="navigator-steps">
                  <div className={styles.stepsCol}><span className={styles.stepsLabel}>What you’ll need</span><ul className={styles.list}>{a.need.map((x, i) => <li key={i}>{fillStudio(x, data.legalName, data.uen)}</li>)}</ul></div>
                  <div className={styles.stepsCol}><span className={styles.stepsLabel}>Step by step</span><ol className={styles.list} data-ordered="">{a.steps.map((x, i) => <li key={i}>{fillStudio(x, data.legalName, data.uen)}</li>)}</ol></div>
                </div>
              ) : null}
              <div className={styles.buttons}>
                <Button variant="secondary" appearance="outlined" iconStart={<Icon name="open_in_new" size={20} />} onPress={() => window.open(a.primary.url, '_blank', 'noopener')}>{a.primary.label}</Button>
                {/* (one-home N-07) Mark done / Back to to do were a second place to record it: the door to the one place instead */}
                {data.mayChange ? <Button variant="primary" appearance="text" iconStart={<Icon name="edit" size={20} />} onPress={() => router.push(profile)} data-testid="navigator-record">Record in Company › Profile</Button> : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** (parity map, TD-110) A registration's note: read, or — for Owners and Admins — added and changed in place; a save answers with Undo, an emptied
    note is removed (and says so). (invented copy) */
function RegistrationNoteBlock({ actionId, title, note, mayChange }: { actionId: string; title: string; note: (RegistrationNote & { byName: string | null }) | null; mayChange: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = () => { setText(note?.text ?? ''); setError(null); setEditing(true) }
  const save = async () => {
    if (busy) return
    if (text.trim().length > NOTE_MAX) { setError(`Keep the note to ${NOTE_MAX} characters`); return }
    setBusy(true)
    try {
      const r = await setRegistrationNote(actionId, { text })
      if ('error' in r) { setError(r.error); return }
      setEditing(false); router.refresh()
      if ((r.before?.text ?? '') === (r.note?.text ?? '')) return
      snackbar({ message: r.note ? (r.before ? `${title} note saved` : `${title} note added`) : `${title} note removed`, actionLabel: 'Undo',
        onAction: () => { void restoreRegistrationNote(actionId, r.before).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the note back', refusalOf(u.error)) }); else router.refresh() }, () => snackbar({ message: couldnt('put the note back') })) } })
    } catch { setError('Couldn’t save the note — please try again') } finally { setBusy(false) }
  }
  if (editing) {
    return (
      <div className={styles.note} data-testid="navigator-note-edit">
        <TextField label="Notes" value={text} onChange={(v) => { setText(v); setError(null) }} multiline={3} autoFocus maxLength={NOTE_MAX + 20}
                   helper={error ? undefined : 'Where it stands — e.g. Applied on 12 Jan, waiting for HDB to respond'} error={error ?? undefined} />
        <div className={styles.noteButtons}>
          <Button variant="secondary" appearance="text" onPress={() => setEditing(false)} isDisabled={busy}>Cancel</Button>
          <Button variant="secondary" appearance="outlined" onPress={() => { void save() }} isDisabled={busy} data-testid="navigator-note-save">{busy ? 'Saving…' : 'Save note'}</Button>
        </div>
      </div>
    )
  }
  if (!note) return mayChange ? <button type="button" className={styles.toggle} onClick={open} data-testid="navigator-note-add"><Icon name="add" size={16} />Add a note</button> : null
  return (
    <div className={styles.note} data-testid="navigator-note">
      <span className={styles.stepsLabel}>Notes</span>
      <p className={styles.noteText}>{note.text}</p>
      <span className={styles.noteMeta}>
        {`${note.byName ? `${note.byName} · ` : ''}${displayDate(new Date(note.at))}`}
        {mayChange ? <button type="button" className={styles.link} onClick={open} data-testid="navigator-note-change">Edit</button> : null}
      </span>
    </div>
  )
}

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
      <div className={styles.bar}>
        <h2 className={styles.title}>{`Rules for ${KIND_LABEL[kind] === 'Condo' ? 'a condo' : KIND_LABEL[kind] === 'HDB flat' ? 'an HDB flat' : 'a landed home'}`}</h2>
        <div className={styles.barActions}><ToolbarSearch query={query} onQuery={setQuery} placeholder="Search the rules…" label="Search the rules" /></div>
      </div>
      <div className={styles.filters}>
        <ChipRail label="Kind of home"><Chips label="Kind of home" testId="navigator-kind" value={kind} onChange={(v) => { setKind(v as ComplianceKind); setOpen(null) }} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} /></ChipRail>
        <ChipRail label="Phase"><Chips label="Phase" testId="navigator-phase" value={phase} onChange={(v) => { setPhase(v as CompliancePhase | 'all'); setOpen(null) }} options={[{ value: 'all', label: 'Every phase' }, ...COMPLIANCE_PHASES.map((p) => ({ value: p.key, label: p.label }))]} /></ChipRail>
        <p className={styles.count} data-testid="navigator-count">{`${items.length} ${items.length === 1 ? 'rule' : 'rules'} · ${items.filter((i) => i.level === 'mandatory').length} mandatory · each project ticks its own on its Compliance tab`}</p>
      </div>
      {items.length === 0 ? <TabSearchEmpty noun="rules" searching={!!query.trim()} onClearAll={() => { setQuery(''); setPhase('all') }} /> : (
        <div className={compliance.groups}>
          {groups.map((g) => (
            <section key={g.key} className={compliance.group} aria-label={g.label}>
              <h3 className={compliance.groupHead}>{g.label}<span className={compliance.groupHelp}>{g.help}</span></h3>
              {/* (simplify round 2) a card table with its head (REG-727), as the project's Compliance view — the rule list reads as one */}
              <div className={compliance.table} role="table" aria-label={g.label} data-card-table="">
                <ItemHead label="Rule" actions={false} />
                {g.items.map((item) => <ItemRow key={item.id} item={item} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
