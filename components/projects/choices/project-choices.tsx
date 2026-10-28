'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { useRememberShape } from '@/lib/ghost-shape'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { ChoiceBoard } from '@/components/portal/choices/choice-board'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { draftVariationFromPick } from '@/app/projects/payment-actions'   // (Projects round 6)
import { withFrom } from '@/lib/nav'
import {
  chooseForClient, deleteChoice, moveChoiceOption, removeChoiceOption, reshareChoice, restoreChoice, restoreChoiceAnswer, restoreChoiceOption, restoreChoiceOptionOrder, shareChoice,
  undoChoosePick, unshareChoice, type ChoiceAnswerUndo,
} from '@/app/projects/choices-actions'
import { SaveOptionDialog } from './save-option-dialog'
import { filterByQuery } from '@/lib/search'
import { dayOf } from '@/lib/projects/schedule-model'
import { GROUP_KEY, GROUP_OPTIONS, choiceSearchFields, groupChoices, type ChoiceGroupBy, type ChoiceSource, type ChoiceView, type ChoicesData, type OptionView, type PickUndo } from '@/lib/projects/choices-model'
import { ChoiceCard, type ChoiceAction, type OptionAction } from './choice-card'
import { ChoiceDialog } from './choice-dialog'
import { ChooseDialog } from './choose-dialog'
import { OptionDialog } from './option-dialog'
import styles from './choices.module.css'

/** Brings a choice into view and pulses it once — a new one, or the one a bell row or Activity opened (the Updates tab's way). */
function pulse(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-choice-id="${CSS.escape(id)}"]`)
  if (!el) return false
  el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  el.removeAttribute('data-fresh'); void el.offsetWidth; el.setAttribute('data-fresh', '')
  window.setTimeout(() => el.removeAttribute('data-fresh'), 1500)
  return true
}
const readGroup = (): ChoiceGroupBy | null => { try { const v = window.localStorage.getItem(GROUP_KEY); return v === 'milestone' || v === 'room' ? v : null } catch { return null } }
const subscribeStorage = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb) }

/**
 * (Projects round 8) A project's **Choices** tab — what the studio puts to the client to choose: paint colours, a countertop, the tiles. The
 * house tab toolbar ("All Choices" · search · Add a choice, C); By room · By milestone (the house `Chips`, remembered per browser, only when
 * the project has a schedule); one group per room or milestone (the Updates tab's day heads), each choice a card (choice-card.tsx) — what
 * waits on the client first, then drafts, then chosen ones. An empty project shows the first-run card with its button (REG-735), the
 * toolbar bare. Address: `?open=<id>` lands on a choice (the bell, Activity).
 */
export function ProjectChoices({ data, views }: { data: ChoicesData; /** (simplify S-03) the Design group's view switch, in the title's place */ views?: ReactNode }) {
  const { project, choices, client, viewer, now, milestones } = data
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { run } = useRun()
  const snack = useSnackbar()
  const phone = useSheetLayout()
  const today = useMemo(() => dayOf(new Date(now)), [now])
  const todayDate = useMemo(() => { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }, [now])
  const [query, setQuery] = useState('')
  /* the remembered grouping (per browser) — null on the server and while hydrating, so the two never disagree (lib/leads/view-pref.ts's way) */
  const stored = useSyncExternalStore(subscribeStorage, readGroup, () => null)
  const [pickedGroup, setPickedGroup] = useState<ChoiceGroupBy | null>(null)
  const group: ChoiceGroupBy = pickedGroup ?? stored ?? 'room'
  const pickGroup = (g: ChoiceGroupBy) => { setPickedGroup(g); try { window.localStorage.setItem(GROUP_KEY, g) } catch { /* private window */ } }
  /* (the calm UI build 2026-10-27, 3-08 · T-10) how the list is grouped is the list's one scope pill — "Group: By room ▾" */
  const [groupOpen, setGroupOpen] = useState(false)
  const groupRef = useRef<HTMLSpanElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<'new' | ChoiceView | null>(null)
  const [option, setOption] = useState<{ choice: ChoiceView; source: ChoiceSource | null; editing: OptionView | null } | null>(null)
  const [choosing, setChoosing] = useState<ChoiceView | null>(null)
  const [previewing, setPreviewing] = useState<ChoiceView | null>(null)
  const [inviting, setInviting] = useState(false)   // (fix-C, C-18) the Client access panel, the invite one press away
  const [saving, setSaving] = useState<{ option: OptionView; choice: ChoiceView; to: 'materials' | 'price_book' } | null>(null)   // (gaps build D, item 11)
  const done = project.stage === 'completed'
  const reaches = client.invited && client.section

  const openParam = params.get('open')
  useEffect(() => {
    if (!openParam) return
    /* (simplify S-01 · bug fix) not cleared by this effect's own re-run: dropping `open` from the address below re-runs it, and the choice must
       still light up (the Needs you row "{client} said no to …" lands here) */
    window.setTimeout(() => pulse(openParam), GHOST_MIN_MS + 150)
    const next = new URLSearchParams(params.toString()); next.delete('open')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [openParam, params, pathname, router])
  const [fresh, setFresh] = useState<string | null>(null)
  useEffect(() => {
    if (!fresh) return
    const t = window.setTimeout(() => { if (pulse(fresh)) setFresh(null) }, 80)
    return () => window.clearTimeout(t)
  }, [fresh, choices])

  const found = filterByQuery(choices, query, (c) => ({ fields: choiceSearchFields(c) }))
  const by: ChoiceGroupBy = milestones.length ? group : 'room'
  const groups = useMemo(() => groupChoices(found, by), [found, by])
  const first = choices.length === 0
  useRememberShape(`lead.${project.id}.choices`, first)   // (REG-817) the tab's ghost opens on the shape it last had

  const act = async (what: string, fn: () => Promise<unknown>, said: Parameters<typeof run>[2], id: string) => {
    setBusy(id)
    try {
      const ok = await run(what, fn, said)
      if (!ok) router.refresh()   // (fix-C, C-14) a refusal puts the card back to its real state
      return ok
    } finally { setBusy(null) }
  }
  const onAction = (a: ChoiceAction, c: ChoiceView) => {
    if (a === 'edit') setEditing(c)
    else if (a === 'variation') {   // (Projects round 6) the pick's variation order: drafted once with the pick as its line, then opened
      if (c.variation) { router.push(withFrom(`/quotes/${c.variation.id}`, pathname)); return }
      setBusy(c.id)
      void draftVariationFromPick(c.id).then((r) => {
        setBusy(null)
        if ('error' in r) { snack({ message: couldnt('draft the variation order', refusalOf(r.error)) }); return }
        /* (fix-C, C-13) the confirmation travels with the move — the editor says it once it opens (a snackbar here dies with the tab) */
        router.push(withFrom(`/quotes/${r.id}?drafted=1`, pathname))
      }, () => { setBusy(null); snack({ message: couldnt('draft the variation order') }) })
    }
    else if (a === 'preview') setPreviewing(c)
    else if (a === 'receipt') router.push(withFrom(`/projects/${project.id}/selection-receipts/${c.id}`, pathname))   // (gaps build D, item 7)
    else if (a === 'invite') setInviting(true)
    else if (a === 'choose') setChoosing(c)
    else if (a === 'share') {
      let eventId = ''
      /* (gaps build D, item 2) a choice the client said no to is shared again — its Undo puts their no back */
      let answer: ChoiceAnswerUndo | null = null
      /* (simplify S-21) the milestone it names now waits on the client for it — the sentence says so, and Undo takes the wait back too */
      let waited: string | null = null
      const again = c.status === 'declined'
      void act('share the choice', async () => { const r = await shareChoice(c.id); if (!('error' in r)) { eventId = r.eventId; answer = r.answer ?? null; waited = r.waitStarted ?? null } return r }, undefined, c.id)
        .then((ok) => {
          if (!ok) return
          snack({ message: `${again ? 'Shared again' : 'Shared'} — ${reaches ? `${client.firstName} can choose on the portal` : client.invited ? 'the portal’s Choices are switched off' : `${client.firstName} sees it once invited to the portal`}${waited ? ` · ${waited} waits on ${client.firstName} for it` : ''}`,
                  actionLabel: 'Undo', onAction: () => { const was = answer; void run('undo the share', () => (was ? restoreChoiceAnswer(c.id, { eventId, answer: was }) : unshareChoice(c.id, { eventId })), was ? `Back to ${client.firstName}’s answer` : 'Back to draft') } })   // (fix-C, C-28) the client named, never "them"
        })
    } else if (a === 'unshare') {
      /* (fix-C, C-10) Undo puts the share back as it was — who shared it and when */
      let undo: { eventId: string | null; sharedBy: string | null; sharedAt: number | null; declined?: boolean } = { eventId: null, sharedBy: null, sharedAt: null }
      void act('take the choice back', async () => { const r = await unshareChoice(c.id); if (!('error' in r)) undo = r; return r },
        { message: `Taken back — ${client.firstName} no longer sees “${c.title}”`, actionLabel: 'Undo', onAction: () => { void run('share it again', () => reshareChoice(c.id, undo), 'Shared again') } }, c.id)
    } else if (a === 'delete') {
      let eventId = ''
      void act('delete the choice', async () => { const r = await deleteChoice(c.id); if (!('error' in r)) eventId = r.eventId; return r },
        { message: 'Choice deleted', actionLabel: 'Undo', onAction: () => { void run('restore the choice', () => restoreChoice(c.id, { eventId }), 'Choice restored').then((ok) => { if (ok) setFresh(c.id) }) } }, c.id)
    }
  }
  const onOption = (a: OptionAction, o: OptionView, c: ChoiceView) => {
    if (a === 'edit') setOption({ choice: c, source: null, editing: o })
    else if (a === 'earlier' || a === 'later') {
      /* (fix-C, C-12) a move answers with where it went and an Undo, as every other change on the tab does (the Schedule's Move up / down, REG-1070) */
      let before: string[] = []
      const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`
      const i = c.options.findIndex((x) => x.id === o.id), place = Math.max(1, Math.min(c.options.length, i + 1 + (a === 'earlier' ? -1 : 1)))
      void act('move the option', async () => { const r = await moveChoiceOption(o.id, { by: a === 'earlier' ? -1 : 1 }); if (!('error' in r)) before = r.before; return r },
        { message: `${o.name} moved — now ${ordinal(place)} of ${c.options.length}`, actionLabel: 'Undo', onAction: () => { void run('put the options back', () => restoreChoiceOptionOrder(c.id, { order: before }), 'Order restored') } }, c.id)
    }
    else if (a === 'save_materials' || a === 'save_book') setSaving({ option: o, choice: c, to: a === 'save_materials' ? 'materials' : 'price_book' })   // (gaps build D, item 11)
    else if (a === 'remove') {
      let eventId = ''
      void act('remove the option', async () => { const r = await removeChoiceOption(o.id); if (!('error' in r)) eventId = r.eventId; return r },
        { message: `${o.name} removed`, actionLabel: 'Undo', onAction: () => { void run('put the option back', () => restoreChoiceOption(o.id, { eventId }), `${o.name} is back`) } }, c.id)
    }
  }

  const add = viewer.mayChange ? (phone ? (
    /* (the calm UI build 2026-10-27, 3-12 · W-473) one create grammar on every tab: "New choice" */
    <Tooltip label="New choice" shortcut="create"><IconButton icon="add" label="New choice" variant="primary" onClick={() => setEditing('new')} data-kb="create" data-kb-label="New choice" data-testid="choices-add" /></Tooltip>
  ) : (
    <Button variant="primary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setEditing('new')} data-kb="create" data-kb-label="New choice" data-testid="choices-add">New choice</Button>
  )) : null

  const asBoard = (c: ChoiceView) => ({
    id: c.id, title: c.title, room: c.room, note: c.note, milestone: c.milestone?.title ?? null, neededBy: c.neededBy, sharedAt: c.sharedAt,
    status: c.status === 'chosen' ? 'chosen' as const : c.status === 'declined' ? 'declined' as const : 'shared' as const,
    answer: c.answer ? { ...c.answer, mine: false } : null,   // (gaps build D, item 2) the client's no, as they read it
    options: c.options.map((o) => ({ id: o.id, name: o.name, description: o.description, src: o.src, hex: o.hex, priceMinor: o.priceMinor })),
    chosen: c.chosen ? { ...c.chosen, member: c.chosen.member?.split(/\s+/)[0] ?? null, note: c.chosen.by === 'client' ? c.chosen.note : null } : null,
    gstPct: data.gstPct,
  })

  return (
    <div className={styles.tab} data-testid="project-choices">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>All Choices</h2>}
        {first ? null : (
          <div className={styles.actions}>
            <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search choices, rooms, options…" label="Search choices" />
            {add}
          </div>
        )}
      </div>
      {first ? (
        <EmptyState icon="palette" title="No choices yet" testId="choices-empty"
                    help={done ? `No choices were put to ${client.firstName} on this project.`   /* (fix-C, C-16) a completed project reads only */
                      : `Put a choice to ${client.firstName} — the paint colours, a countertop, the tiles. Add the options from Materials, the Price book, a render or a photo, then share it: ${reaches ? `${client.firstName} picks one on the portal.` : client.invited ? 'the portal’s Choices are switched off, so choose it with them.' : `${client.firstName} picks one once invited to the portal.`}`}
                    primary={viewer.mayChange ? { label: 'New choice', icon: 'add', onPress: () => setEditing('new') } : null}
                    secondary={viewer.mayChange && !client.invited ? { label: `Invite ${client.firstName}`, icon: 'person_add', onPress: () => setInviting(true), testId: 'choices-invite' } : null} />
      ) : (
        <>
          {milestones.length ? (
            <div>
              <span ref={groupRef} data-testid="choices-group">
                <ScopePill label={`Group: ${GROUP_OPTIONS.find((o) => o.value === by)?.label ?? 'By room'}`} open={groupOpen} onClick={() => setGroupOpen((o) => !o)} />
              </span>
              <PortalMenu open={groupOpen} anchor={groupRef} onClose={() => setGroupOpen(false)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="Group">
                {GROUP_OPTIONS.map((o) => <DropdownItem key={o.value} role="menuitemradio" checked={by === o.value} onSelect={() => { setGroupOpen(false); pickGroup(o.value) }}>{o.label}</DropdownItem>)}
              </PortalMenu>
            </div>
          ) : null}
          {found.length === 0 ? (
            <TabSearchEmpty noun="choices" searching={!!query.trim()} onClearAll={() => setQuery('')} />
          ) : (
            <div className={styles.groups} role="feed" aria-label="Choices" data-kb-list="choices">
              {groups.map((g) => (
                <section key={g.key} className={styles.group} aria-label={g.label} data-testid="choices-group-section">
                  <h3 className={styles.groupHead}>{g.label}<span className={styles.groupCount}>{`· ${g.list.length}`}</span></h3>
                  <div className={styles.cards}>
                    {g.list.map((c) => (
                      <ChoiceCard key={c.id} c={c} groupedBy={by} clientFirst={client.firstName} invited={client.invited} section={client.section} stage={project.stage} today={today} now={now} gstPct={data.gstPct}
                                  mayChange={viewer.mayChange} busy={busy === c.id} onAction={onAction} onOption={onOption}
                                  onAdd={(source, ch) => setOption({ choice: ch, source, editing: null })} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <ChoiceDialog open={editing !== null} projectId={project.id} editing={editing && editing !== 'new' ? editing : null} milestones={milestones} clientFirst={client.firstName} today={todayDate} stage={project.stage}
                    onClose={() => setEditing(null)}
                    onSaved={(id, isNew) => { setEditing(null); snack({ message: isNew ? 'Choice added — now add its options' : 'Choice saved' }); setFresh(id) }} />
      <OptionDialog open={option !== null} projectId={project.id} choice={option?.choice ?? null} source={option?.source ?? null} editing={option?.editing ?? null} gstPct={data.gstPct}
                    onClose={() => setOption(null)}
                    onSaved={(name, isNew) => { const id = option?.choice.id; setOption(null); snack({ message: isNew ? `${name} added` : 'Option saved' }); if (id) setFresh(id) }} />
      <ChooseDialog open={!!choosing} choice={choosing} clientFirst={client.firstName} gstPct={data.gstPct} busy={!!choosing && busy === choosing.id} onClose={() => setChoosing(null)}
                    onSave={(optionId, note) => {
                      const c = choosing; if (!c) return
                      const name = c.options.find((o) => o.id === optionId)?.name ?? 'the option'
                      /* (Projects round 6) a pick that moves the price offers its variation order at once (the card keeps the press too) */
                      const priced = !!c.options.find((o) => o.id === optionId)?.priceMinor && !c.variation
                      /* (fix-C, C-02 · C-04) the snackbar says what followed the pick — its variation order, the milestone that no longer waits — and
                         a change of pick offers Undo for all of it */
                      let r: { undo: PickUndo; vo: { number: string; deleted: boolean } | null; waitEnded: string | null } | null = null
                      setBusy(c.id)
                      void chooseForClient(c.id, { optionId, note }).then((res) => {
                        setBusy(null)
                        if ('error' in res) { snack({ message: couldnt(c.status === 'chosen' ? 'change the pick' : 'save the pick', refusalOf(res.error)) }); router.refresh(); return }
                        r = res
                        const said = [c.status === 'chosen' ? `The pick is now ${name}` : `Chosen with ${client.firstName} — ${name}`,
                          r.vo ? (r.vo.deleted ? `${r.vo.number} deleted: nothing changes on the price` : `${r.vo.number} follows it`) : null,
                          r.waitEnded ? `${r.waitEnded} no longer waits on ${client.firstName}` : null].filter(Boolean).join(' · ')
                        const undo = r.undo
                        snack(priced && viewer.mayChange && c.status !== 'chosen' && !r.waitEnded ? { message: said, actionLabel: 'Draft a variation order', onAction: () => onAction('variation', { ...c, variation: null }) }
                          : { message: said, actionLabel: 'Undo', onAction: () => { void run('undo the pick', () => undoChoosePick(c.id, { undo }), c.status === 'chosen' ? 'The pick is back as it was' : 'Pick undone') } })
                        setChoosing(null); setFresh(c.id)
                      }, () => { setBusy(null); snack({ message: couldnt(c.status === 'chosen' ? 'change the pick' : 'save the pick') }) })
                    }} />
      <ClientAccessPanel open={inviting} leadId={project.leadId} project onClose={() => setInviting(false)} />
      <SaveOptionDialog open={!!saving} option={saving?.option ?? null} to={saving?.to ?? 'materials'} choiceTitle={saving?.choice.title ?? ''} trades={data.trades ?? []} units={data.units} costs={data.viewer.costs !== false} onClose={() => setSaving(null)}
                        onSaved={(r) => {
                          const id = saving?.choice.id; setSaving(null); if (id) setFresh(id)
                          const href = r.to === 'materials' ? withFrom(`/company/materials?open=${encodeURIComponent(r.id)}`, pathname) : withFrom(`/company/price-book?open=${encodeURIComponent(r.id)}`, pathname)
                          snack({ message: r.to === 'materials' ? `${r.name} is in Company › Materials` : r.proposed ? `${r.name} is proposed to the Price book — an Owner or an Admin approves it` : `${r.name} is in the Price book`, actionLabel: 'Open', onAction: () => router.push(href) })
                        }} />
      <Dialog open={!!previewing} onClose={() => setPreviewing(null)} title="As the client sees it" size="form" width={600}
              subtitle={previewing && previewing.status === 'draft' ? `${client.firstName} doesn’t see this one yet — it’s a draft.` : `${client.firstName} sees it on the portal’s Choices.`}
              footer={<Button variant="secondary" appearance="outlined" onPress={() => setPreviewing(null)}>Close</Button>}>
        {previewing ? (
          <div className={styles.preview} data-testid="choice-preview">
            <div className={styles.previewCard}><ChoiceBoard choice={asBoard(previewing)} mode="studio" /></div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
