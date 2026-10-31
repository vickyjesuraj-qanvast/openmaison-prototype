'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { savedLabel } from '@/lib/contracts/model'
import { isRefusal, templateChangeBlock } from '@/lib/company/template-rules'
import { TEMPLATE_DESCRIPTION_MAX, draftsFromTemplate, followsOf, type TemplateItem } from '@/lib/projects/schedule-phases'
import { MILESTONE_COLORS, colorOf, listWords, plural } from '@/lib/projects/schedule-model'
import type { ScheduleTemplateEditorData } from '@/lib/company/schedule-templates'
import { deleteScheduleTemplate, duplicateScheduleTemplate, saveScheduleTemplate } from '@/app/company/schedule-templates-actions'
import { LibraryHeader } from '../library-header'
import { ScheduleTemplateGhost } from './schedule-template-ghost'
import page from '@/components/contracts/editor/contract-editor.module.css'
import lib from '../editors/library-editor.module.css'
import styles from './schedules.module.css'

const AUTOSAVE_MS = 600
const intTyped = (v: string, negative: boolean) => (negative ? v.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '') : v.replace(/\D/g, '')).slice(0, 4)

/**
 * (Projects round 2, Q-12) The schedule template editor — the payment splits' editor (REG-538: the library header, the title on the meta row,
 * one centred card, autosave, Duplicate · Delete in ⋮): each milestone's name, how many days it runs, and when it starts after the one before
 * (a negative number overlaps them), and whether the client is asked to confirm it once done. Under the rows, the schedule as it lays out from
 * works start — the Start card draws the same.
 */
export function ScheduleTemplateEditor({ data, from }: { data: ScheduleTemplateEditorData; from?: string }) {
  const { template, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const readOnly = templateChangeBlock(data.viewer, template.createdBy)
  const [name, setName] = useState(template.name)
  const [items, setItems] = useState<TemplateItem[]>(template.items.map(({ id: _id, ...i }) => i))
  const [typing, setTyping] = useState<{ i: number; key: 'days' | 'gap'; text: string } | null>(null)
  const [updatedAt, setUpdatedAt] = useState(template.updatedAt.getTime())
  const [clock, setClock] = useState(now)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  /* (parity map, SC-016) the row whose words, colour and links are open */
  const [details, setDetails] = useState<number | null>(null)

  const dirty = useRef(false)
  const latest = useRef({ name, items }); useEffect(() => { latest.current = { name, items } })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    try { const r = await saveScheduleTemplate(template.id, latest.current); if (typeof r === 'number') setUpdatedAt(r); else snackbar({ message: couldnt('save the template', refusalOf(r.error)) }) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback(() => { dirty.current = true; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS) }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const patch = (i: number, p: Partial<TemplateItem>) => { if (readOnly) return; setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x))); queue() }
  /* (Every removal offers Undo) the row comes back where it was — (parity map, SC-016) the links of the rows after it follow their new places,
     and the Undo puts every row back as it was */
  const remove = (i: number) => {
    if (readOnly) return
    const gone = items[i]!
    const was = items
    setItems((xs) => relink(xs.filter((_, k) => k !== i), (k) => (k === i ? null : k > i ? k - 1 : k))); queue()
    snackbar({ message: `“${gone.title}” removed`, actionLabel: 'Undo', onAction: () => { setItems(was); queue() } })
  }
  /* (B-60) one step up or down, answered as the Schedule's Move up / down are (REG-1070): where it went, with Undo */
  const step = (i: number, dir: -1 | 1) => {
    const to = i + dir
    if (readOnly || to < 0 || to >= items.length) return
    const was = items
    const moved = [...items]; const [it] = moved.splice(i, 1); moved.splice(to, 0, it!)
    const next = relink(moved, (k) => (k === i ? to : k === to ? i : k))   // (SC-016) the links follow the two rows that swapped places
    setItems(next); queue()
    snackbar({ key: 'tpl-move', message: `“${it!.title}” moved ${dir < 0 ? 'up' : 'down'} — now ${nth(to + 1)} of ${next.length}`, actionLabel: 'Undo', onAction: () => { setItems(was); queue() } })
  }
  const add = () => { if (readOnly) return; setItems((xs) => [...xs, { title: 'New milestone', days: 5, gap: xs.length ? 1 : 0, askConfirm: false }]); queue() }
  const backHref = from ?? '/company/templates/schedules'
  const close = () => { void flushRef.current(); router.push(backHref) }

  const drafts = draftsFromTemplate(items, 0)
  const span = Math.max(1, ...drafts.map((d) => d.end + 1))
  const weeks = Math.max(1, Math.round(span / 7))

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The schedule's Maison AI, by rule from the page:
     how long it runs (each milestone's days from works start, drawn as its share), which milestones overlap, and which ask the client to
     confirm. Days are calendar days ("n days", never weeks — Lead ↔ Project parity). *(invented copy: the answers' titles and lines)* */
  const aiFabRef = useRef<HTMLSpanElement>(null)
  const dayWord = (n: number) => `day ${n + 1}`
  const overlapsOf = drafts.flatMap((d, i) => drafts.slice(i + 1).filter((e) => e.start <= d.end && d.start <= e.end).map((e) => ({ a: d, b: e })))
  const confirms = items.filter((x) => x.askConfirm)
  const maison: MaisonSuggestion[] = [
    { label: 'How long does it run?', answer: () => Promise.resolve(items.length
      ? { title: `${plural(span, 'day')} from works start to handover`, text: 'Each milestone from the day the works start — its bar is its share of the whole.',
          rows: drafts.map((d, i) => ({ id: `m-${i}`, label: d.title, meta: `${dayWord(d.start)} to ${dayWord(d.end)} · ${plural(d.end - d.start + 1, 'day')}`, share: Math.max(0.02, (d.end - d.start + 1) / span) })) }
      : { title: 'No milestones yet', text: 'Add a milestone — the schedule lays out from the works start.' }) },
    { label: 'Which milestones overlap?', answer: () => Promise.resolve(overlapsOf.length
      ? { title: `${overlapsOf.length === 1 ? '1 overlap' : `${overlapsOf.length} overlaps`}`, text: 'Run at the same time — a negative “starts after” overlaps a milestone with the one before it.', rows: overlapsOf.slice(0, 8).map((o, i) => ({ id: `o-${i}`, label: `${o.a.title} and ${o.b.title}`, meta: `Both on ${dayWord(Math.max(o.a.start, o.b.start))}${Math.min(o.a.end, o.b.end) > Math.max(o.a.start, o.b.start) ? ` to ${dayWord(Math.min(o.a.end, o.b.end))}` : ''}` })) }
      : { title: 'Nothing overlaps', text: 'Each milestone starts once the one before it ends.' }) },
    { label: 'Which ones ask the client to confirm?', answer: () => Promise.resolve(confirms.length
      ? { title: `${plural(confirms.length, 'milestone')} ask${confirms.length === 1 ? 's' : ''} the client`, text: 'Once done, the client is asked to confirm it on their portal.', rows: confirms.map((x, i) => ({ id: `c-${i}`, label: x.title })) }
      : { title: 'None asks the client', text: 'Switch on Client confirms on a milestone and, once it is done, the client is asked on their portal.' }) },
  ]

  return (
    <PageReveal skeleton={<ScheduleTemplateGhost />}>
      <div className={page.page} data-testid="schedule-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Project schedules', href: '/company/templates/schedules' }]} title={name.trim() || 'Untitled schedule'}   /* (the calm UI build 2026-10-27, the UI audit's 4-06 · 4-11) the tab's name; no tags — the usage is the gallery card's */
                       /* (the close-out round 2026-10-31, C-123 · 4-17) the name once, renamed in the header (read-only for a member who may not change
                          it) — the second row is gone: its count and length were the card's own rows and its "Handover about n weeks after works start" */
                       titleEdit={{ value: name, label: 'Schedule name', placeholder: 'Schedule name', maxLength: 80, disabled: !!readOnly, onChange: (v) => { if (readOnly) return; setName(v); queue() }, onDone: () => { void flushRef.current() } }}
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateScheduleTemplate(template.id)).then((r) => { if (typeof r !== 'string') { snackbar({ message: couldnt('duplicate the template', refusalOf(r.error)) }); return } snackbar({ message: 'Template duplicated' }); router.push(`/templates/schedules/${r}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" disabled={!!readOnly} help={readOnly ?? undefined} onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                       </>} onClose={close} />
        <div className={lib.body}>
          {/* (B-11) a member who may not change it reads it — the house read-only look and its note; the server refuses the save too */}
          {readOnly ? <ReadOnlyNote text={`${readOnly.replace(/renames or deletes it$/, 'changes it')}.`} /> : null}
          <ReadOnlyScope readOnly={!!readOnly}>
          <div className={lib.card}>
            <div className={lib.cardHead}><span className={lib.cardTitle}>Milestones</span><span className={lib.cardHelp}>Gap = days between one milestone and the next. Use a minus number to overlap.</span></div>
            <div className={lib.cardBody}>
              <div className={styles.items} role="table" aria-label="Milestones">
                <span className={styles.head} /><span className={styles.head}>Milestone</span><span className={styles.head}>Days</span><span className={styles.head}>Gap (days)</span><span className={styles.head}>Client confirms</span><span className={styles.head} />
                {items.map((it, i) => (
                  <div key={i} className={styles.row} role="row" data-testid="schedule-item">
                    {/* (parity map, SC-016) the number wears the bar's colour when the item has one */}
                    <span className={styles.no} data-colored={colorOf(it.color) ? '' : undefined} style={colorOf(it.color) ? { ['--item-color' as string]: colorOf(it.color)!.hex } : undefined}>{i + 1}</span>
                    {/* (the close-out round 2026-10-31, C-123 · 4-17) a cell under its column's head draws no label of its own (`hideLabel`); a phone's
                        stacked row has no head over Days and Gap, so those keep theirs there (`'wide'`) */}
                    <TextField label="Milestone" hideLabel size="s" value={it.title} maxLength={80} onChange={(v) => patch(i, { title: v })} />
                    <TextField label="Days" hideLabel="wide" size="s" inputMode="numeric" value={typing?.i === i && typing.key === 'days' ? typing.text : String(it.days)}
                               onChange={(v) => { const t = intTyped(v, false); setTyping({ i, key: 'days', text: t }); const n = Number(t); if (t && n >= 1) patch(i, { days: Math.min(365, n) }) }} onBlur={() => setTyping(null)} />
                    {i === 0 ? <span className={styles.firstGap}>Works start</span> : (
                      /* (B-60) one row height for every row: the overlap is said in its laid-out line below, not under the field */
                      <TextField label="Gap (days)" hideLabel="wide" size="s" inputMode="numeric" value={typing?.i === i && typing.key === 'gap' ? typing.text : String(it.gap)}
                                 onChange={(v) => { const t = intTyped(v, true); setTyping({ i, key: 'gap', text: t }); const n = Number(t); if (t && t !== '-' && Number.isFinite(n)) patch(i, { gap: Math.max(-60, Math.min(60, n)) }) }} onBlur={() => setTyping(null)} />
                    )}
                    <span className={styles.confirm}><Switch size="sm" isSelected={it.askConfirm} isDisabled={!!readOnly} onChange={(v: boolean) => patch(i, { askConfirm: v })} aria-label={`Ask the client to confirm ${it.title}`} /></span>
                    {readOnly ? <span /> : <ItemMenu title={it.title} first={i === 0} last={i === items.length - 1} onUp={() => step(i, -1)} onDown={() => step(i, 1)} onRemove={() => remove(i)} onDetails={() => setDetails(i)} />}
                  </div>
                ))}
              </div>
              {readOnly ? null : <Button variant="secondary" appearance="outlined" className={lib.addRow} iconStart={<Icon name="add" size={20} />} onPress={add}>Add a milestone</Button>}
              {drafts.length ? (
                <div className={styles.preview} aria-label="How it lays out">
                  <div className={styles.previewHead}><span>How it lays out</span><span>Works start → handover</span></div>
                  {drafts.map((d, i) => (
                    <div key={i} className={styles.previewRow}>
                      {/* (parity map, SC-016) an item that waits on others than the one before says which, in its laid-out line */}
                      <span className={styles.previewName}>{d.title}{i && d.gap < 0 ? <span className={styles.previewNote}> · overlaps by {plural(-d.gap, 'day')}</span> : null}{waitsWords(items, i) ? <span className={styles.previewNote}> · {waitsWords(items, i)}</span> : null}</span>
                      <span className={styles.previewTrack}><span className={styles.previewBar} style={{ left: `${(d.start / span) * 100}%`, width: `${Math.max(1, ((d.end - d.start + 1) / span) * 100)}%`, ...(colorOf(d.color) ? { background: colorOf(d.color)!.hex } : {}) }} /></span>
                    </div>
                  ))}
                  <span className={styles.previewTotal}>Handover about {weeks} {weeks === 1 ? 'week' : 'weeks'} after works start.</span>
                </div>
              ) : null}
            </div>
          </div>
          </ReadOnlyScope>
        </div>
        <ConfirmDialog open={deleteOpen} title={`Delete ${name.trim() || 'this schedule'}?`} confirmLabel="Delete" tone="danger"
                       message="Schedules that started from it keep their milestones. You can restore it from Deleted templates."
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteScheduleTemplate(template.id).then((r) => { if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return } snackbar({ message: 'Template deleted' }); router.push('/company/templates/schedules') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <ItemDetailsDialog open={details !== null} index={details ?? 0} items={items} readOnly={!!readOnly} onClose={() => setDetails(null)}
                           onSave={(p) => { if (details !== null) patch(details, p); setDetails(null) }} />
        <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={aiFabRef} />   {/* (pending modules S10) the shell's one sheet; the FAB's own press toggles it (REG-153) */}
        <span ref={aiFabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}

/** "1st" · "2nd" · "3rd" · "11th" — a place in the list (REG-1070). */
const nth = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`

/** (parity map, SC-016) Every row's links re-pointed after a move or a removal: `to(k)` is position k's new place (null = gone); an item left
    with nothing it waits on follows the one before again (the default). */
function relink(items: TemplateItem[], to: (k: number) => number | null): TemplateItem[] {
  return items.map((it) => {
    if (!it.follows?.length) return it
    const f = it.follows.map(to).filter((k): k is number => k !== null)
    const { follows: _f, ...rest } = it
    return f.length ? { ...rest, follows: f } : rest
  })
}
/** (SC-016) "waits on 1 and 3" — said only when an item waits on more, or other, than the one before it. */
function waitsWords(items: TemplateItem[], i: number): string | null {
  const f = followsOf(items[i] ?? {}, i)
  if (!items[i]?.follows?.length || (f.length === 1 && f[0] === i - 1)) return null
  return `waits on ${listWords(f.map((k) => `${k + 1}`))}`
}

/**
 * (parity map, SC-016 — 1.0's milestone templates kept each milestone's description, colour and links, E-275 · B-259) A template row's details —
 * the house Dialog over the three things a row's grid has no room for: its words (the milestone made from it carries them), its bar's colour
 * (the milestone panel's eight), and what it waits on (the earlier rows, by place; the nearest one ticked is the one its gap counts from).
 * Nothing ticked = the one before, as every row starts. Saved into the editor's autosave like every other edit.
 */
function ItemDetailsDialog({ open, index, items, readOnly, onClose, onSave }: { open: boolean; index: number; items: TemplateItem[]; readOnly: boolean; onClose: () => void; onSave: (p: Partial<TemplateItem>) => void }) {
  const it = items[index]
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [waits, setWaits] = useState<string[]>([])
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open && it) { setDesc(it.description ?? ''); setColor(it.color ?? null); setWaits(followsOf(it, index).map(String)) } }
  if (!it) return null
  const earlier = items.slice(0, index)
  const picked = waits.map(Number).filter((k) => k < index).sort((a, b) => b - a)   // the nearest first: its gap counts from it
  const main = picked[0]
  const others = picked.slice(1).sort((a, b) => a - b)
  const help = !earlier.length ? 'The first milestone starts on works start.'
    : main === undefined ? `Nothing ticked — it follows ${earlier[index - 1]!.title}, the one before.`
    : `It starts its gap after ${main + 1} · ${earlier[main]!.title} ends${others.length ? `, once ${listWords(others.map((k) => `${k + 1} · ${earlier[k]!.title}`))} ${others.length === 1 ? 'is' : 'are'} done too` : ''}.`
  const save = () => {
    const follows = main === undefined ? null : [main, ...others]
    onSave({ description: desc.trim() ? desc.trim().slice(0, TEMPLATE_DESCRIPTION_MAX) : null, color, follows: follows && !(follows.length === 1 && follows[0] === index - 1) ? follows : null })
  }
  return (
    <Dialog open={open} onClose={onClose} title="Milestone details" subtitle={`${index + 1} · ${it.title}`} width={600} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>{readOnly ? null : <Button onPress={save} data-testid="template-item-details-save">Save</Button>}</>}>
      <div className={styles.details} data-testid="template-item-details">
        <TextField label="Description (optional)" value={desc} onChange={setDesc} multiline={3} maxLength={TEMPLATE_DESCRIPTION_MAX} disabled={readOnly}
                   helper="A milestone made from this template keeps it — its panel shows it to the team" />
        <div className={styles.detailsGroup}>
          <span className={styles.detailsLabel}>Bar colour</span>
          <Chips label="Bar colour" disabled={readOnly} value={color ?? 'status'} onChange={(v) => setColor(v === 'status' ? null : v)} testId="template-item-color"
                 options={[{ value: 'status', label: 'By status' }, ...MILESTONE_COLORS.map((c) => ({ value: c.key, label: c.label, swatch: c.hex }))]} />
        </div>
        {earlier.length ? (
          <div className={styles.detailsGroup}>
            <span className={styles.detailsLabel}>Waits on</span>
            <Chips multiple label="Waits on" disabled={readOnly} value={waits} onChange={setWaits} testId="template-item-waits"
                   options={earlier.map((x, k) => ({ value: String(k), label: `${k + 1} · ${x.title}` }))} />
            <span className={styles.detailsHelp}>{help}</span>
          </div>
        ) : <span className={styles.detailsHelp}>{help}</span>}
      </div>
    </Dialog>
  )
}

/** (B-60) A template row's ⋮ — Move up · Move down · Remove, the Schedule row menu's order (the house PortalMenu). (parity map, SC-016) Details…
    first: its words, its colour, what it waits on. */
function ItemMenu({ title, first, last, onUp, onDown, onRemove, onDetails }: { title: string; first: boolean; last: boolean; onUp: () => void; onDown: () => void; onRemove: () => void; onDetails: () => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const pick = (f: () => void) => () => { setOpen(false); f() }
  return (
    <span ref={anchor}>
      <Tooltip label="More for this milestone" disabled={open}>
        <IconButton icon="more_vert" label={`More for ${title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="template-item-kebab" />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
        <DropdownItem onSelect={pick(onDetails)} help="Its description, colour and what it waits on">Details</DropdownItem>
        <DropdownDivider />
        <DropdownItem disabled={first} help={first ? 'It is first' : undefined} onSelect={pick(onUp)}>Move up</DropdownItem>
        <DropdownItem disabled={last} help={last ? 'It is last' : undefined} onSelect={pick(onDown)}>Move down</DropdownItem>
        <DropdownDivider />
        <DropdownItem tone="danger" onSelect={pick(onRemove)}>Remove</DropdownItem>
      </PortalMenu>
    </span>
  )
}
