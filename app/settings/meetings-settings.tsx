'use client'

import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { Button, Switch } from '@/components/ds'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { ReadOnlyScope } from '@/components/om/read-only'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { LeaveGuard } from '@/components/company/leave-guard'
import { HelpLink } from '@/components/company/help-link'
import { MSG } from '@/lib/forms'
import { MEETINGS_WORDS, MEETING_CARDS, checklistWordsLine, meetingsModuleHelp, weightsTotalLine } from '@/lib/settings/copy'
import { AIMS, DEFAULT_WEIGHTS, DIMENSIONS, FEATURES, aimLabel, weightsTotal, type AimKey, type DimKey, type FeatureKey, type Features, type Weights } from '@/lib/meetings/model'
import { CATEGORIES, categoryLabel, checklistFor, type ChecklistCategory } from '@/lib/meetings/checklists'
import { OBJECTION_KINDS, SG_DEFAULTS, kindLabel, type ObjectionAnswer } from '@/lib/meetings/objections'
import {
  addChecklistItem, addCompetitor, moveChecklistItem, removeChecklistItem, removeCompetitor, removeObjectionAnswer, resetObjectionAnswer, restoreChecklistItem,
  restoreCompetitor, restoreObjectionAnswer, saveCopilotFeature, saveDealWeights, saveObjectionAnswer, setObjectionAnswerOn, updateChecklistItem, updateCompetitor,
  type CompetitorRow, type MeetingsSettingsData, type OwnChecklistItem,
} from './meetings-actions'
import { ModuleHead, ModuleRelated } from './module-head'
import styles from './settings.module.css'
import own from './meetings-settings.module.css'
import band from './studio-settings.module.css'   // Who may do what's group band: the card table's head band across the row

/**
 * (pending modules S23 — Meetings and the Meeting Co-Pilot; his "build all of them" 2026-10-11, card studio:meetings-copilot ·
 * api:copilot-objections-competitors) Settings › **Meetings** — the co-pilot's playbook, 1.0's Accounts › AI & Copilot group as one Settings
 * module, on the house Settings card and the card table (REG-727):
 *   1 · During a meeting — 1.0's nine session switches (one browser's storage there, four off), the studio's here and all on by default;
 *   2 · Deal score — 1.0's Copilot Tuning: six weights, whole percentages 0–50 that make 100, Share evenly · Reset to defaults · Save
 *       (1.0 saved percentages and read them as fractions; 2.0 reads percentages, `scoreOf`);
 *   3 · Meeting checklists — the platform's items per kind of meeting (read-only) and the studio's own under them (1.0 kept them and no meeting
 *       read them; here a meeting ticks them by their words, or by their name's when they have none);
 *   4 · Objection answers — 1.0's ten kinds and its 26 Singapore defaults, the studio's from the first day (no "Load defaults"); an edit of a
 *       default is a row over it and can be put back; the studio's own answers can be removed; any can be switched off;
 *   5 · Competitors — names (unique in any case) and notes; a meeting spots them, the Lost dialog offers them.
 * Owners and Admins change it; everyone else reads it whole in the house read-only look. A switch answers at once and is put back when
 * refused; a dialog closes only once its save lands; every remove says what it did with Undo. *(invented copy: every line below not read
 * from lib/meetings/* — the card words are in lib/settings/copy.ts)*
 */
const LOCKED = 'Only Owners and Admins change the meeting settings'   // (invented copy) the server's rule, word for word
const quoted = (s: string) => `“${s}”`

export function MeetingsSettings({ data, studio, canManage }: { data: MeetingsSettingsData; studio: string; canManage: boolean; /** (the calm UI build, 5-17) the module's doors take the way back from the address now (ModuleRelated) */ from?: string }) {
  const readOnly = !canManage
  /* the parts' switches are the first card's; the cards that a part shows say so while it is off */
  const [features, setFeatures] = useState<Features>(data.copilot.features)
  /* (REG-645, Q-08) one read-only look: every value shown, the controls disabled (each card's own `canManage`) — the kind-of-meeting and the
     kind-of-objection chips stay live, so whoever may only read can still read every list */
  return (
    <section className={styles.panel} aria-labelledby="settings-meetings-title" data-testid="settings-meetings">
      <ModuleHead id="settings-meetings-title" title="Meetings" help={meetingsModuleHelp(studio)} readOnly={readOnly} />
      <FeaturesCard features={features} setFeatures={setFeatures} canManage={canManage} />
      <DealScoreCard initial={data.copilot.weights} canManage={canManage} off={features.deal_scoring ? null : offLine('deal_scoring', 'the score')} />
      <ChecklistsCard initial={data.items} canManage={canManage} off={features.checklist ? null : offLine('checklist', 'these checklists')} />
      <AnswersCard initial={data.answers} canManage={canManage} off={features.coaching ? null : offLine('coaching', 'these answers')} />
      <CompetitorsCard initial={data.competitors} canManage={canManage} />
      <ModuleRelated section="meetings" />   {/* (the calm UI build, 5-17) */}
    </section>
  )
}

/** "Deal score is off — meetings don’t show the score. Switch it on under During a meeting." (invented copy) — the card's own line while the
    part it feeds is off, with the way to the switch (the card above, on this page). */
function offLine(key: FeatureKey, what: string) {
  const label = FEATURES.find((f) => f.key === key)?.label ?? key
  return <span className={styles.settingHelp} data-testid={`meetings-off-${key}`}>{`${label} is off — meetings don’t show ${what}. Switch it on under `}<HelpLink href="#meetings-features">{MEETING_CARDS.features.title}</HelpLink>.</span>
}

function CardHead({ title, help, off }: { title: string; help: string; off?: ReactNode }) {
  return <div className={styles.settingHead}><span className={styles.settingTitle}>{title}</span><span className={styles.settingHelp}>{help}</span>{off}</div>
}

/* ── 1 · During a meeting ── */
function FeaturesCard({ features, setFeatures, canManage }: { features: Features; setFeatures: Dispatch<SetStateAction<Features>>; canManage: boolean }) {
  const snackbar = useSnackbar()
  const flip = async (key: FeatureKey, on: boolean, undoable = true) => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const label = FEATURES.find((f) => f.key === key)?.label ?? key
    const back = () => setFeatures((x) => ({ ...x, [key]: !on }))
    const fail = (e: unknown) => { back(); snackbar({ message: couldnt(`switch ${label} ${on ? 'on' : 'off'}`, refusalOf(e)) }) }
    setFeatures((x) => ({ ...x, [key]: on }))   // at once — put back when refused
    try {
      const r = await saveCopilotFeature(key, on)
      if ('error' in r) { fail(r.error); return }
      setFeatures((x) => ({ ...x, [key]: r.copilot.features[key] }))
      snackbar({ key: 'meetings-feature', message: on ? `${label} is on in meetings` : `${label} is off in meetings`, ...(undoable ? { actionLabel: 'Undo', onAction: () => { void flip(key, !on, false) } } : {}) })   // (invented copy)
    } catch (e) { fail(e) }
  }
  return (
    <div className={styles.setting} data-testid="meetings-features" id="meetings-features">
      <CardHead {...MEETING_CARDS.features} />
      <div className={`${styles.eventTable} ${own.features}`} role="table" aria-label={MEETING_CARDS.features.title} data-card-table="">
        <div className={`${styles.eventHead} ${own.row}`} role="row"><span role="columnheader">Part</span><span role="columnheader" className={styles.eventCol}>On</span></div>
        {FEATURES.map((f) => (
          <div key={f.key} className={`${styles.eventRow} ${own.row}`} role="row" data-testid={`meetings-feature-${f.key}`}>
            <span role="cell" className={styles.eventName}><span><span>{f.label}</span><span className={styles.eventHelp}>{f.help}</span></span></span>
            <span role="cell" className={`${styles.eventCol} ${own.switchCell}`}>
              <label className={own.flag}><Switch size="sm" isSelected={features[f.key]} isDisabled={!canManage} aria-label={f.label} onChange={(v: boolean) => { void flip(f.key, v) }} /></label>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 2 · Deal score ── */
type WeightDraft = Record<DimKey, string>
const draftOf = (w: Weights): WeightDraft => Object.fromEntries(DIMENSIONS.map((d) => [d.key, String(w[d.key])])) as WeightDraft
const weightsOf = (d: WeightDraft): Weights => Object.fromEntries(DIMENSIONS.map((x) => [x.key, Number(d[x.key] || 0)])) as Weights
const sameWeights = (a: Weights, b: Weights) => DIMENSIONS.every((d) => a[d.key] === b[d.key])
/** 1.0's Distribute evenly: 100 shared by six — 17 · 17 · 17 · 17 · 16 · 16, the first parts taking the remainder. */
const EVEN: Weights = Object.fromEntries(DIMENSIONS.map((d, i) => [d.key, Math.floor(100 / DIMENSIONS.length) + (i < 100 % DIMENSIONS.length ? 1 : 0)])) as Weights

function DealScoreCard({ initial, canManage, off }: { initial: Weights; canManage: boolean; off: ReactNode }) {
  const snackbar = useSnackbar()
  const [saved, setSaved] = useState<Weights>(initial)
  const [draft, setDraft] = useState<WeightDraft>(() => draftOf(initial))
  const [busy, setBusy] = useState(false)
  const values = weightsOf(draft)
  const total = weightsTotal(values)
  const tooMuch = DIMENSIONS.some((d) => values[d.key] > 50)
  const dirty = !sameWeights(values, saved)
  const ready = total === 100 && !tooMuch
  const save = async (): Promise<boolean> => {
    if (!canManage) { snackbar({ message: LOCKED }); return false }
    if (!ready) { snackbar({ message: couldnt('save the deal score', tooMuch ? 'Each part takes up to 50%' : `The six add up to ${total}% — they need to make 100%`) }); return false }   // (invented copy)
    if (busy) return false
    setBusy(true)
    try {
      const r = await saveDealWeights(values)
      if ('error' in r) { snackbar({ message: couldnt('save the deal score', refusalOf(r.error)) }); return false }
      setSaved(r.copilot.weights); setDraft(draftOf(r.copilot.weights))
      snackbar({ message: 'Deal score saved' })   // (invented copy)
      return true
    } catch (e) { snackbar({ message: couldnt('save the deal score', refusalOf(e)) }); return false } finally { setBusy(false) }
  }
  return (
    <div className={styles.setting} data-testid="meetings-score" id="meetings-score">
      {/* (UX audit S2) weights typed and not saved ask before any move inside the app — Save · Discard · Keep editing */}
      <LeaveGuard dirty={canManage && dirty} what="the deal score" onSave={save} onDiscard={() => setDraft(draftOf(saved))} />
      <CardHead {...MEETING_CARDS.score} off={off} />
      <ReadOnlyScope readOnly={!canManage}>
      <div className={own.weights} role="group" aria-label="How much each part counts">
        {DIMENSIONS.map((d) => (
          <TextField key={d.key} label={`${d.label} (%)`} value={draft[d.key]} numeric="digits" maxLength={2} trailingIcon={null}
                     onChange={(v) => setDraft((x) => ({ ...x, [d.key]: v }))} helper={d.high}
                     error={values[d.key] > 50 ? 'Up to 50%' : undefined}   /* (invented copy) */
                     inputProps={{ 'data-testid': `meetings-weight-${d.key}` } as never} />
        ))}
      </div>
      </ReadOnlyScope>
      <div className={own.scoreFoot}>
        <span className={own.total} data-off={total !== 100 || undefined} role="status" aria-live="polite" data-testid="meetings-weight-total">{weightsTotalLine(total)}</span>
        {canManage ? (
          <span className={own.scoreActions}>
            <Button appearance="text" onPress={() => setDraft(draftOf(EVEN))} isDisabled={sameWeights(values, EVEN) || busy} data-testid="meetings-weight-even">{MEETINGS_WORDS.even}</Button>
            <Button appearance="text" onPress={() => setDraft(draftOf(DEFAULT_WEIGHTS))} isDisabled={sameWeights(values, DEFAULT_WEIGHTS) || busy} data-testid="meetings-weight-reset">{MEETINGS_WORDS.reset}</Button>
            <Button variant="secondary" appearance="outlined" onPress={() => setDraft(draftOf(saved))} isDisabled={!dirty || busy}>Discard</Button>
            <Button onPress={() => { void save() }} isDisabled={!dirty || !ready || busy} data-testid="meetings-weight-save">{busy ? 'Saving…' : 'Save'}</Button>
          </span>
        ) : null}
      </div>
    </div>
  )
}

/* ── 3 · Meeting checklists ── */
const RANK: Record<ChecklistCategory, number> = { critical: 0, important: 1, nice_to_have: 2 }
const appliesTo = (i: OwnChecklistItem, aim: string) => i.aims.length === 0 || i.aims.includes(aim)
const sameAims = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
/** The studio's items for a kind of meeting, in the order the meeting lists them: by importance, then their own order. */
const ownFor = (items: OwnChecklistItem[], aim: string) => items.filter((i) => appliesTo(i, aim)).sort((a, b) => RANK[a.category] - RANK[b.category] || a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
const wordsLine = checklistWordsLine
/** "the first consultation checklist" · "the checklist for other meetings" */
const checklistName = (aim: string) => (aim === 'other' ? 'the checklist for other meetings' : `the ${aimLabel(aim).toLowerCase()} checklist`)

function ChecklistsCard({ initial, canManage, off }: { initial: OwnChecklistItem[]; canManage: boolean; off: ReactNode }) {
  const snackbar = useSnackbar()
  const [aim, setAim] = useState<AimKey>('first_consultation')
  const [items, setItems] = useState<OwnChecklistItem[]>(initial)
  const [editing, setEditing] = useState<{ item: OwnChecklistItem | null } | null>(null)
  const platform = checklistFor(aim)
  const mine = ownFor(items, aim)
  const remove = async (i: OwnChecklistItem) => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const prev = items
    setItems((xs) => xs.filter((x) => x.id !== i.id))   // at once — put back when refused
    try {
      const r = await removeChecklistItem(i.id)
      if ('error' in r) { setItems(prev); snackbar({ message: couldnt(`remove ${quoted(i.label)}`, refusalOf(r.error)) }); return }
      setItems(r.items)
      snackbar({ message: `${quoted(i.label)} removed from ${checklistName(aim)}`, actionLabel: 'Undo', onAction: () => { void (async () => {   // (invented copy)
        const b = await restoreChecklistItem(i.id).catch((e: unknown) => ({ error: refusalOf(e) ?? '' }))
        if ('error' in b) { snackbar({ message: couldnt(`put back ${quoted(i.label)}`, refusalOf(b.error)) }); return }
        setItems(b.items); snackbar({ message: `${quoted(i.label)} is back` })   // (invented copy)
      })() } })
    } catch (e) { setItems(prev); snackbar({ message: couldnt(`remove ${quoted(i.label)}`, refusalOf(e)) }) }
  }
  const move = async (i: OwnChecklistItem, dir: 'up' | 'down') => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    try {
      const r = await moveChecklistItem(i.id, dir)
      if ('error' in r) { snackbar({ message: couldnt('move the item', refusalOf(r.error)) }); return }
      setItems(r.items); snackbar({ key: 'meetings-order', message: 'Order saved' })
    } catch (e) { snackbar({ message: couldnt('move the item', refusalOf(e)) }) }
  }
  const saveItem = async (input: { label: string; category: ChecklistCategory; words: string }): Promise<boolean> => {
    if (!canManage) { snackbar({ message: LOCKED }); return false }
    const cur = editing?.item ?? null
    try {
      const r = cur ? await updateChecklistItem(cur.id, input) : await addChecklistItem({ ...input, aim })
      if ('error' in r) { snackbar({ message: couldnt(cur ? 'save the item' : 'add the item', refusalOf(r.error)) }); return false }
      setItems(r.items)
      snackbar({ message: cur ? 'Checklist item saved' : `${quoted(input.label.trim())} added to ${checklistName(aim)}` })   // (invented copy)
      return true
    } catch (e) { snackbar({ message: couldnt(cur ? 'save the item' : 'add the item', refusalOf(e)) }); return false }
  }
  return (
    <div className={styles.setting} data-testid="meetings-checklists" id="meetings-checklists">
      <CardHead {...MEETING_CARDS.checklists} off={off} />
      <ChipRail label="Kind of meeting">
        <Chips label="Kind of meeting" options={AIMS.map((a) => ({ value: a.key, label: a.label }))} value={aim} onChange={(v) => setAim(v as AimKey)} testId="meetings-aim-chips" />
      </ChipRail>
      <div className={own.listBlock}>
        <span className={styles.reasonLabel} id="meetings-platform-items">{MEETINGS_WORDS.platformItems}</span>
        <div className={`${styles.eventTable} ${own.items}`} role="table" aria-labelledby="meetings-platform-items" data-card-table="" data-testid="meetings-platform-items">
          <div className={`${styles.eventHead} ${own.row}`} role="row"><span role="columnheader">Item</span><span role="columnheader">How important</span><span role="columnheader" aria-label="Actions" /></div>
          {platform.map((i) => (
            <div key={i.id} className={`${styles.eventRow} ${own.row}`} role="row" data-testid="meetings-platform-item">
              <span role="cell" className={styles.eventName}><span><span>{i.label}</span><span className={styles.eventHelp}>{wordsLine(i.words)}</span></span></span>
              <span role="cell" className={styles.eventWho} data-label="How important">{categoryLabel(i.category)}</span>
              <span role="cell" className={own.actions} />
            </div>
          ))}
        </div>
      </div>
      <div className={own.listBlock}>
        <span className={styles.reasonLabel} id="meetings-own-items">{MEETINGS_WORDS.ownItems}</span>
        {mine.length ? (
          <div className={`${styles.eventTable} ${own.items}`} role="table" aria-labelledby="meetings-own-items" data-card-table="" data-testid="meetings-own-items">
            <div className={`${styles.eventHead} ${own.row}`} role="row"><span role="columnheader">Item</span><span role="columnheader">How important</span><span role="columnheader" aria-label="Actions" /></div>
            {mine.map((i, n) => {
              /* a step up or down stays among the items of its own importance — the meeting lists Must ask first whatever the order */
              const peer = (j: OwnChecklistItem | undefined) => !!j && j.category === i.category && sameAims(j.aims, i.aims)
              return (
                <div key={i.id} className={`${styles.eventRow} ${own.row}`} role="row" data-testid="meetings-own-item">
                  <span role="cell" className={styles.eventName}><span><span>{i.label}</span><span className={styles.eventHelp}>{wordsLine(i.words)}{i.aims.length === 0 ? ' · Every kind of meeting' : ''}</span></span></span>
                  <span role="cell" className={styles.eventWho} data-label="How important">{categoryLabel(i.category)}</span>
                  <span role="cell" className={own.actions}>
                    {canManage ? (
                      <>
                        <Tooltip label="Move up"><IconButton icon="arrow_upward" label={`Move ${quoted(i.label)} up`} size={24} variant="bare" iconSize={18} disabled={!peer(mine[n - 1])} onClick={() => { void move(i, 'up') }} /></Tooltip>
                        <Tooltip label="Move down"><IconButton icon="arrow_downward" label={`Move ${quoted(i.label)} down`} size={24} variant="bare" iconSize={18} disabled={!peer(mine[n + 1])} onClick={() => { void move(i, 'down') }} /></Tooltip>
                        <Tooltip label="Edit"><IconButton icon="edit" label={`Edit ${quoted(i.label)}`} size={24} variant="bare" iconSize={18} onClick={() => setEditing({ item: i })} data-testid="meetings-own-item-edit" /></Tooltip>
                        <Tooltip label="Remove"><IconButton icon="delete" label={`Remove ${quoted(i.label)}`} size={24} variant="bare" iconSize={18} onClick={() => { void remove(i) }} data-testid="meetings-own-item-remove" /></Tooltip>
                      </>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <span className={styles.settingHelp} data-testid="meetings-own-items-empty">No items of your own for this kind of meeting yet.</span>   /* (invented copy) */
        )}
        {canManage ? <div><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setEditing({ item: null })} data-testid="meetings-own-item-add">Add an item</Button></div> : null}
      </div>
      <ChecklistItemDialog open={!!editing} item={editing?.item ?? null} aim={aim} onClose={() => setEditing(null)} onSave={saveItem} />
    </div>
  )
}

/** Add / Edit a checklist item — the house form dialog at 600; closes only once its save lands. */
function ChecklistItemDialog({ open, item, aim, onClose, onSave }: {
  open: boolean; item: OwnChecklistItem | null; aim: string; onClose: () => void
  onSave: (input: { label: string; category: ChecklistCategory; words: string }) => Promise<boolean>
}) {
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<ChecklistCategory>('important')
  const [words, setWords] = useState('')
  const [pressed, setPressed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // render-phase adjust: each opening starts from the item (or a blank one)
    setWasOpen(open)
    if (open) { setLabel(item?.label ?? ''); setCategory(item?.category ?? 'important'); setWords(item?.words.join(', ') ?? ''); setPressed(false); setBusy(false) }
  }
  const empty = !label.trim()
  const submit = async () => {
    setPressed(true)
    if (empty || busy) return
    setBusy(true)
    const ok = await onSave({ label: label.trim(), category, words }).catch(() => false)
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={item ? 'Edit checklist item' : 'Add a checklist item'} subtitle={item?.aims.length === 0 ? 'Every kind of meeting' : aimLabel(aim)} size="modal" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="meetings-item-save">{busy ? 'Saving…' : item ? 'Save' : 'Add'}</Button></>}>
      <div className={styles.entryForm} data-testid="meetings-item-dialog">
        <TextField label="What to cover" required value={label} onChange={setLabel} maxLength={80} trailingIcon={null} autoFocus={!item} error={pressed && empty ? MSG.required : undefined}
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }} />
        <TextField label="How important" mode="select" options={CATEGORIES.map((c) => c.label)} value={categoryLabel(category)} onChange={(v) => setCategory(CATEGORIES.find((c) => c.label === v)?.key ?? 'important')} />
        <TextField label="Words that tick it (optional)" value={words} onChange={setWords} maxLength={400} trailingIcon={null}
                   helper="Separate them with commas. Blank, the item ticks on the words of its name." />   {/* (invented copy) */}
      </div>
    </Dialog>
  )
}

/* ── 4 · Objection answers ── */
const platformOf = (key: string) => { const m = /^sg:(\d+)$/.exec(key); return m ? SG_DEFAULTS[Number(m[1]) - 1] ?? null : null }
/** A platform answer whose words the studio changed (switching one off alone changes nothing it says). */
const isEdited = (a: ObjectionAnswer) => { if (!a.platform) return false; const d = platformOf(a.key); return !!d && (a.title !== d.title || (a.context ?? '') !== (d.context ?? '') || a.answer !== d.answer) }
const markerOf = (a: ObjectionAnswer) => (!a.platform ? 'Your studio' : isEdited(a) ? 'Platform · edited' : 'Platform')   // (invented copy)
type AnswerDraft = { key: string | null; kind: string; title: string; context: string; answer: string; platform: boolean }

function AnswersCard({ initial, canManage, off }: { initial: ObjectionAnswer[]; canManage: boolean; off: ReactNode }) {
  const snackbar = useSnackbar()
  const readOnly = !canManage
  const [answers, setAnswers] = useState<ObjectionAnswer[]>(initial)
  const [kind, setKind] = useState<string>('all')
  const [menu, setMenu] = useState<string | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const [editing, setEditing] = useState<AnswerDraft | null>(null)
  const kinds = OBJECTION_KINDS.filter((k) => kind === 'all' || k.key === kind)
  const fail = (what: string, e: unknown) => snackbar({ message: couldnt(what, refusalOf(e)) })

  const setOn = async (a: ObjectionAnswer, on: boolean, undoable = true) => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const back = () => setAnswers((xs) => xs.map((x) => (x.key === a.key ? { ...x, active: !on } : x)))
    setAnswers((xs) => xs.map((x) => (x.key === a.key ? { ...x, active: on } : x)))   // at once — put back when refused
    try {
      const r = await setObjectionAnswerOn(a.key, on)
      if ('error' in r) { back(); fail(`switch ${quoted(a.title)} ${on ? 'on' : 'off'}`, r.error); return }
      setAnswers(r.answers)
      snackbar({ key: 'meetings-answer', message: on ? `${quoted(a.title)} is on — meetings show it` : `${quoted(a.title)} is off — meetings won’t show it`,   // (invented copy)
                 ...(undoable ? { actionLabel: 'Undo', onAction: () => { void setOn(a, !on, false) } } : {}) })
    } catch (e) { back(); fail(`switch ${quoted(a.title)} ${on ? 'on' : 'off'}`, e) }
  }
  const reset = async (a: ObjectionAnswer) => {
    setMenu(null)
    if (!canManage) { snackbar({ message: LOCKED }); return }
    try {
      const r = await resetObjectionAnswer(a.key)
      if ('error' in r) { fail('put the platform’s answer back', r.error); return }
      setAnswers(r.answers)
      const was = r.was
      snackbar({ message: `${quoted(platformOf(a.key)?.title ?? a.title)} says the platform’s answer again`, actionLabel: 'Undo', onAction: () => { void (async () => {   // (invented copy)
        const b = await saveObjectionAnswer({ key: a.key, kind: a.kind, title: was.title, context: was.context, answer: was.answer }).catch((e: unknown) => ({ error: refusalOf(e) ?? '' }))
        if ('error' in b) { fail('put your answer back', b.error); return }
        setAnswers(b.answers); snackbar({ message: 'Your answer is back' })   // (invented copy)
      })() } })
    } catch (e) { fail('put the platform’s answer back', e) }
  }
  const remove = async (a: ObjectionAnswer) => {
    setMenu(null)
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const prev = answers
    setAnswers((xs) => xs.filter((x) => x.key !== a.key))   // at once — put back when refused
    try {
      const r = await removeObjectionAnswer(a.key)
      if ('error' in r) { setAnswers(prev); fail(`remove ${quoted(a.title)}`, r.error); return }
      setAnswers(r.answers)
      snackbar({ message: `${quoted(a.title)} removed`, actionLabel: 'Undo', onAction: () => { void (async () => {   // (invented copy)
        const b = await restoreObjectionAnswer(a.key).catch((e: unknown) => ({ error: refusalOf(e) ?? '' }))
        if ('error' in b) { fail(`put back ${quoted(a.title)}`, b.error); return }
        setAnswers(b.answers); snackbar({ message: `${quoted(a.title)} is back` })   // (invented copy)
      })() } })
    } catch (e) { setAnswers(prev); fail(`remove ${quoted(a.title)}`, e) }
  }
  const save = async (d: AnswerDraft): Promise<boolean> => {
    if (!canManage) { snackbar({ message: LOCKED }); return false }
    const what = d.key ? 'save the answer' : 'add the answer'
    try {
      const r = await saveObjectionAnswer({ key: d.key, kind: d.kind, title: d.title, context: d.context.trim() || null, answer: d.answer })
      if ('error' in r) { fail(what, r.error); return false }
      setAnswers(r.answers)
      snackbar({ message: d.key ? 'Answer saved' : `Answer added under ${kindLabel(d.kind)}` })   // (invented copy)
      return true
    } catch (e) { fail(what, e); return false }
  }
  const open = (a: ObjectionAnswer) => { setMenu(null); setEditing({ key: a.key, kind: a.kind, title: a.title, context: a.context ?? '', answer: a.answer, platform: a.platform }) }

  return (
    <div className={styles.setting} data-testid="meetings-answers" id="meetings-answers">
      <CardHead {...MEETING_CARDS.answers} off={off} />
      <ChipRail label="Kind of objection">
        <Chips label="Kind of objection" options={[{ value: 'all', label: 'All' }, ...OBJECTION_KINDS.map((k) => ({ value: k.key, label: k.label }))]} value={kind} onChange={setKind} testId="meetings-kind-chips" />
      </ChipRail>
      <div className={`${styles.eventTable} ${own.answers}`} role="table" aria-label={MEETING_CARDS.answers.title} data-card-table="" data-testid="meetings-answer-table">
        <div className={`${styles.eventHead} ${own.row}`} role="row"><span role="columnheader">What the client says</span><span role="columnheader" className={styles.eventCol}>On</span><span role="columnheader" aria-label="Actions" /></div>
        {kinds.map((k) => {
          const rows = answers.filter((a) => a.kind === k.key)
          return (
            <div key={k.key} role="rowgroup" aria-label={k.label} data-testid={`meetings-answers-${k.key}`}>
              <div className={band.group} role="row"><span role="cell" aria-colspan={3}>{k.label}</span></div>
              {rows.map((a) => (
                <div key={a.key} className={`${styles.eventRow} ${own.row}`} role="row" data-testid="meetings-answer" data-key={a.key} data-off={!a.active || undefined}>
                  <span role="cell" className={own.answer}>
                    <span className={own.answerHead}><span className={own.answerTitle}>{a.title}</span><MetaChip>{markerOf(a)}</MetaChip></span>
                    {readOnly && a.context ? <span className={own.answerContext}>{a.context}</span> : null}
                    <span className={own.answerText} data-full={readOnly || undefined}>{a.answer}</span>
                  </span>
                  <span role="cell" className={`${styles.eventCol} ${own.switchCell}`} data-label="On">
                    <label className={own.flag}><Switch size="sm" isSelected={a.active} isDisabled={!canManage} aria-label={`Use ${quoted(a.title)} in meetings`} onChange={(v: boolean) => { void setOn(a, v) }} /></label>
                  </span>
                  <span role="cell" className={own.kebab}>
                    {canManage ? (
                      <>
                        <Tooltip label="More options" disabled={menu === a.key}>
                          <IconButton icon="more_vert" label={`More for ${quoted(a.title)}`} variant="bare" aria-haspopup="menu" aria-expanded={menu === a.key} data-testid="meetings-answer-menu"
                                      onClick={(e) => { anchor.current = e.currentTarget; setMenu((m) => (m === a.key ? null : a.key)) }} />
                        </Tooltip>
                        <PortalMenu open={menu === a.key} anchor={anchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle={a.title}>
                          <DropdownItem onSelect={() => open(a)}>Edit</DropdownItem>
                          {isEdited(a) ? <DropdownItem onSelect={() => { void reset(a) }} help="Back to the words the platform gives every studio">Reset to the platform’s answer</DropdownItem> : null}   {/* (invented copy) */}
                          <DropdownDivider />
                          {a.platform
                            ? <DropdownItem disabled title="A platform answer can’t be removed — switch it off instead" onSelect={() => setMenu(null)}>Remove</DropdownItem>   /* (invented copy) the server's rule */
                            : <DropdownItem tone="danger" onSelect={() => { void remove(a) }}>Remove</DropdownItem>}
                        </PortalMenu>
                      </>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {canManage ? <div><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} data-testid="meetings-answer-add"
                                onPress={() => setEditing({ key: null, kind: kind === 'all' ? 'price' : kind, title: '', context: '', answer: '', platform: false })}>Add an answer</Button></div> : null}
      <AnswerDialog draft={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  )
}

/** Add / Edit an objection answer — the house form dialog at 600: its kind (a platform answer keeps its own), what the client says, when it
    comes up (optional — 1.0 asked for it by mistake), and the answer. Closes only once its save lands. */
function AnswerDialog({ draft, onClose, onSave }: { draft: AnswerDraft | null; onClose: () => void; onSave: (d: AnswerDraft) => Promise<boolean> }) {
  const [d, setD] = useState<AnswerDraft | null>(draft)
  const [seen, setSeen] = useState<AnswerDraft | null>(draft)
  const [pressed, setPressed] = useState(false)
  const [busy, setBusy] = useState(false)
  if (seen !== draft) { setSeen(draft); setD(draft); setPressed(false); setBusy(false) }   // render-phase adjust: each opening starts from its answer
  const errTitle = d && !d.title.trim() ? MSG.required : undefined
  const errAnswer = d && !d.answer.trim() ? MSG.required : undefined
  const submit = async () => {
    setPressed(true)
    if (!d || errTitle || errAnswer || busy) return
    setBusy(true)
    const ok = await onSave(d).catch(() => false)
    setBusy(false)
    if (ok) onClose()
  }
  const set = (patch: Partial<AnswerDraft>) => setD((x) => (x ? { ...x, ...patch } : x))
  return (
    <Dialog open={!!draft} onClose={onClose} title={draft?.key ? 'Edit answer' : 'Add an answer'} subtitle={draft?.key ? (draft.platform ? 'Platform answer' : 'Your studio’s answer') : undefined} size="modal" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="meetings-answer-save">{busy ? 'Saving…' : draft?.key ? 'Save' : 'Add'}</Button></>}>
      {d ? (
        <div className={styles.entryForm} data-testid="meetings-answer-dialog">
          <TextField label="Kind" mode="select" options={OBJECTION_KINDS.map((k) => k.label)} value={kindLabel(d.kind)} disabled={d.platform}
                     onChange={(v) => set({ kind: OBJECTION_KINDS.find((k) => k.label === v)?.key ?? d.kind })} helper={d.platform ? 'A platform answer keeps its kind' : undefined} />   {/* (invented copy) */}
          <TextField label="What the client says" required value={d.title} onChange={(v) => set({ title: v })} maxLength={160} trailingIcon={null} autoFocus={!draft?.key} error={pressed ? errTitle : undefined} />
          <TextField label="When it comes up (optional)" value={d.context} onChange={(v) => set({ context: v })} maxLength={400} multiline={2} trailingIcon={null} />
          <TextField label="Your answer" required value={d.answer} onChange={(v) => set({ answer: v })} maxLength={2000} multiline={6} trailingIcon={null} error={pressed ? errAnswer : undefined} />
        </div>
      ) : null}
    </Dialog>
  )
}

/* ── 5 · Competitors ── */
const takenLine = (name: string) => `You have ${quoted(name)} already`   // (the brief's words) the server's refusal, said as typed

function CompetitorsCard({ initial, canManage }: { initial: CompetitorRow[]; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<CompetitorRow[]>(initial)
  const [adding, setAdding] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [editing, setEditing] = useState<CompetitorRow | null>(null)
  /* (S44Z — S44P's M14, every Settings list alike) a name already on the list names the entry it matches, in the list's spelling */
  const taken = (name: string, except?: string) => { const t = name.trim().replace(/\s+/g, ' '); const hit = t ? rows.find((r) => r.id !== except && r.name.toLowerCase() === t.toLowerCase()) : undefined; return hit ? takenLine(hit.name) : undefined }
  const fail = (what: string, e: unknown) => snackbar({ message: couldnt(what, refusalOf(e)) })
  const add = async () => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const name = adding.trim().replace(/\s+/g, ' ')
    if (!name || taken(name) || addBusy) return
    setAddBusy(true)
    try {
      const r = await addCompetitor({ name })
      if ('error' in r) { fail(`add ${name}`, r.error); return }
      setRows(r.competitors); setAdding('')
      snackbar({ message: `${name} added to your competitors` })   // (invented copy)
    } catch (e) { fail(`add ${name}`, e) } finally { setAddBusy(false) }
  }
  const remove = async (c: CompetitorRow) => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const prev = rows
    setRows((xs) => xs.filter((x) => x.id !== c.id))   // at once — put back when refused
    try {
      const r = await removeCompetitor(c.id)
      if ('error' in r) { setRows(prev); fail(`remove ${c.name}`, r.error); return }
      setRows(r.competitors)
      snackbar({ message: `${c.name} removed from your competitors`, actionLabel: 'Undo', onAction: () => { void (async () => {   // (invented copy)
        const b = await restoreCompetitor(c.id).catch((e: unknown) => ({ error: refusalOf(e) ?? '' }))
        if ('error' in b) { fail(`put back ${c.name}`, b.error); return }
        setRows(b.competitors); snackbar({ message: `${c.name} is back` })   // (invented copy)
      })() } })
    } catch (e) { setRows(prev); fail(`remove ${c.name}`, e) }
  }
  const save = async (c: CompetitorRow, next: { name: string; notes: string }): Promise<boolean> => {
    if (!canManage) { snackbar({ message: LOCKED }); return false }
    try {
      const r = await updateCompetitor(c.id, { name: next.name, notes: next.notes.trim() || null })
      if ('error' in r) { fail(`save ${c.name}`, r.error); return false }
      setRows(r.competitors)
      const name = next.name.trim().replace(/\s+/g, ' ')
      snackbar({ message: name !== c.name ? `${c.name} is now ${name}` : 'Competitor saved' })   // (invented copy)
      return true
    } catch (e) { fail(`save ${c.name}`, e); return false }
  }
  const addError = taken(adding)
  return (
    <div className={styles.setting} data-testid="meetings-competitors" id="meetings-competitors">
      <CardHead {...MEETING_CARDS.competitors} />
      {rows.length ? (
        <div className={`${styles.eventTable} ${own.rivals}`} role="table" aria-label={MEETING_CARDS.competitors.title} data-card-table="">
          <div className={`${styles.eventHead} ${own.row}`} role="row"><span role="columnheader">Studio</span><span role="columnheader" aria-label="Actions" /></div>
          {rows.map((c) => (
            <div key={c.id} className={`${styles.eventRow} ${own.row}`} role="row" data-testid="meetings-competitor">
              <span role="cell" className={styles.eventName}><span><span>{c.name}</span>{c.notes ? <span className={`${styles.eventHelp} ${own.notes}`}>{c.notes}</span> : null}</span></span>
              <span role="cell" className={own.actions}>
                {canManage ? (
                  <>
                    <Tooltip label="Edit"><IconButton icon="edit" label={`Edit ${c.name}`} size={24} variant="bare" iconSize={18} onClick={() => setEditing(c)} data-testid="meetings-competitor-edit" /></Tooltip>
                    <Tooltip label="Remove"><IconButton icon="delete" label={`Remove ${c.name}`} size={24} variant="bare" iconSize={18} onClick={() => { void remove(c) }} data-testid="meetings-competitor-remove" /></Tooltip>
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : <span className={styles.settingHelp} data-testid="meetings-competitors-empty">No competitors yet.</span>}   {/* (invented copy) */}
      {canManage ? (
        <div className={styles.addTrade}>
          <TextField label="Add a competitor" value={adding} onChange={setAdding} maxLength={80} trailingIcon={null} error={addError}
                     inputProps={{ 'data-testid': 'meetings-competitor-name' } as never}
                     onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add() } }} />
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => { void add() }} isDisabled={!adding.trim() || !!addError || addBusy} data-testid="meetings-competitor-add">Add</Button>
        </div>
      ) : null}
      <CompetitorDialog row={editing} taken={(n) => (editing ? taken(n, editing.id) : undefined)} onClose={() => setEditing(null)} onSave={(next) => (editing ? save(editing, next) : Promise.resolve(false))} />
    </div>
  )
}

/** Rename a competitor or write the team's notes on it — the house form dialog at 400; closes only once its save lands. */
function CompetitorDialog({ row, taken, onClose, onSave }: { row: CompetitorRow | null; taken: (name: string) => string | undefined; onClose: () => void; onSave: (next: { name: string; notes: string }) => Promise<boolean> }) {
  const [name, setName] = useState(row?.name ?? '')
  const [notes, setNotes] = useState(row?.notes ?? '')
  const [seen, setSeen] = useState<CompetitorRow | null>(row)
  const [pressed, setPressed] = useState(false)
  const [busy, setBusy] = useState(false)
  if (seen !== row) { setSeen(row); setName(row?.name ?? ''); setNotes(row?.notes ?? ''); setPressed(false); setBusy(false) }   // render-phase adjust
  const err = !name.trim() ? MSG.required : taken(name)
  const submit = async () => {
    setPressed(true)
    if (err || busy) return
    setBusy(true)
    const ok = await onSave({ name, notes }).catch(() => false)
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={!!row} onClose={onClose} title="Competitor" subtitle={row?.name} size="modal" width={400} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="meetings-competitor-save">{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={styles.entryForm} data-testid="meetings-competitor-dialog">
        <TextField label="Name" required value={name} onChange={setName} maxLength={80} trailingIcon={null} error={pressed || taken(name) ? err : undefined}
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }} />
        <TextField label="Notes (optional)" value={notes} onChange={setNotes} maxLength={300} multiline={3} trailingIcon={null} helper="Only your team sees these" />   {/* (invented copy) */}
      </div>
    </Dialog>
  )
}
