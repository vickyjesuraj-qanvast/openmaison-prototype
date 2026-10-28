'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
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
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import {
  approveProjectUpdate, deleteProjectUpdate, discardUpdateChanges, republishProjectUpdate, restoreProjectUpdate, restoreUpdateChanges, resubmitProjectUpdate, saveProjectUpdate,
  sendBackProjectUpdate, undoWithdrawProjectUpdate, withdrawProjectUpdate,
} from '@/app/projects/updates-actions'
import { draftWeekUpdate } from '@/app/projects/maison-actions'   // (simplify round 2 · Q-09) the weekly update's draft, no credits
import { displayDateWeekday, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import { UPDATE_SHOW, clientReach, feedAt, publishesAtOnce, updateSearchFields, type ProjectUpdatesData, type UpdatePendingRecord, type UpdateShow, type UpdateStatus, type UpdateView } from '@/lib/projects/updates-model'
import { ClientUpdateCard } from './client-card'
import { UpdateCard, type UpdateAction } from './update-card'
import { UpdateComposer } from './update-composer'
import { UpdateSendBackDialog } from './update-send-back'
import styles from './updates.module.css'

/** Brings a post into view and pulses it once — a new update, or the one a bell row or the Overview opened (the report's motion, REG-570's
    `attention()`); the DOM's own attribute, so nothing re-renders for it. */
function pulse(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-update-id="${CSS.escape(id)}"]`)
  if (!el) return false
  el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  el.removeAttribute('data-fresh'); void el.offsetWidth; el.setAttribute('data-fresh', '')
  window.setTimeout(() => el.removeAttribute('data-fresh'), 1500)
  return true
}

/** (fix-C, C-01) What the composer edits for a post: a change held for review opens where it was left — the change, never the published words.
    The card's Edit and (simplify round 2) the `?draft=` landing open it alike. */
function editOf(u: UpdateView): UpdateView {
  const held = u.status === 'published' ? u.pending : null
  return held ? { ...u, title: held.title, html: held.html, milestoneId: held.milestoneId, milestoneName: held.milestoneName, media: held.media } : u
}

/**
 * (REG-951, Projects round 3) A project's Updates tab — the studio's channel to its client. The house tab toolbar ("All Updates" · search ·
 * Post an update, C); the state chips (the house `Chips`, REG-614: All and only the states the feed holds); the feed, newest first, in one
 * group per day (the Files grid's day heads); each post a card with its review band (update-card.tsx). The composer is a form dialog
 * (a sheet on a phone). An empty project shows the first-run card with its button (REG-735), the toolbar bare. Address: `?open=<id>` lands on
 * a post (the bell, the Overview card), `?compose=1` opens the composer (the header's Post an update, the Overview).
 * (simplify S-03 · S-23 · Q-04) In a project the title is the Client group's view switch (`views`); `?compose=1&camera=1` — the phone site bar's
 * Photos — opens the composer with `camera=1` still in the address for the composer to read (it opens the picker first, K-C's), and the address
 * lets it go when the composer closes.
 * (simplify round 2 — Q-09 · P2 §6.11, the owner's "fix all the pending things" 2026-10-09) `?draft=<updateId>` opens that saved draft IN the
 * composer, exactly as its card's Edit does; `?draft=week` — every door of Needs you's *Tell {client} about this week · Draft it* (the row, the
 * header, the brief, Maison AI) — first drafts the week from the records (Maison AI's weekly draft, no credits), saves it as a draft (never
 * sent) and opens it the same way. Nothing reaches the client without Post.
 */
export function ProjectUpdates({ data, views }: { data: ProjectUpdatesData; /** (simplify S-03) the Client group's view switch, in the title's place */ views?: ReactNode }) {
  const { project, updates, viewer, reviewOn, now, client } = data
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { run } = useRun()
  const snack = useSnackbar()
  const phone = useSheetLayout()
  const atOnce = publishesAtOnce(reviewOn, viewer.role, { id: viewer.id, reviewers: data.reviewers })   // (gaps build D, item 10) a named reviewer posts at once
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<UpdateShow>('all')
  const [busy, setBusy] = useState<string | null>(null)

  /* the composer: a new update (`'new'`) or the one being edited */
  const [composing, setComposing] = useState<'new' | UpdateView | null>(null)
  /* arriving with `?compose=1` (the header's Post an update, the Overview card): the composer opens as the page reveals, never under the
     ghost (the listing's `?new=1` way); pressed again while here, it opens at once */
  /* (gaps build D, item 10 — the contract with the Schedule's prompts) `?new=1&milestone=<id>` opens the composer with that milestone picked */
  const [landCompose] = useState(() => (params.get('compose') === '1' || params.get('new') === '1') && viewer.mayPost)
  const [landMilestone, setLandMilestone] = useState<string | null>(() => params.get('milestone'))
  useEffect(() => {
    if (!landCompose) return
    const t = window.setTimeout(() => setComposing('new'), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landCompose])
  const composeParam = params.get('compose') ?? (params.get('new') === '1' ? '1' : null)
  const milestoneParam = params.get('milestone')
  const [seenMilestone, setSeenMilestone] = useState(milestoneParam)
  if (milestoneParam !== seenMilestone) { setSeenMilestone(milestoneParam); if (milestoneParam) setLandMilestone(milestoneParam) }
  const [seenCompose, setSeenCompose] = useState(composeParam)
  if (composeParam !== seenCompose) { setSeenCompose(composeParam); if (composeParam === '1' && viewer.mayPost) setComposing('new') }
  const openParam = params.get('open')

  /* (simplify round 2 · Q-09) `?draft=` — read once on arrival (a lazy initialiser) and acted on as the page reveals, never under its ghost;
     pressed again while here (the header's Tell {client} about this week), at once. The effect that drops it from the address below keeps no
     timer, so it never clears this one. */
  const draftParam = params.get('draft')
  const [landing, setLanding] = useState<{ v: string; delay: number } | null>(() => (draftParam && viewer.mayPost ? { v: draftParam, delay: GHOST_MIN_MS } : null))
  const [seenDraft, setSeenDraft] = useState(draftParam)
  if (draftParam !== seenDraft) { setSeenDraft(draftParam); if (draftParam && viewer.mayPost) setLanding({ v: draftParam, delay: 0 }) }
  /* the week's draft, saved: it opens once the refreshed feed holds it */
  const [openDraft, setOpenDraft] = useState<string | null>(null)
  if (openDraft) { const u = updates.find((x) => x.id === openDraft); if (u) { setOpenDraft(null); setComposing(editOf(u)) } }
  const feed = useRef(updates)
  useEffect(() => { feed.current = updates }, [updates])
  useEffect(() => {
    if (!landing) return
    let live = true
    const t = window.setTimeout(() => {
      if (landing.v !== 'week') {
        /* a saved draft opens in the composer as its card's Edit opens it; a post that moved on lands on its card; one gone says so */
        const u = feed.current.find((x) => x.id === landing.v)
        if (!u) snack({ message: 'This update is not there any more' })
        else if (u.status === 'draft') setComposing(editOf(u))
        else pulse(u.id)
        return
      }
      void (async () => {
        try {
          const r = await draftWeekUpdate(project.id)
          if ('error' in r) { snack({ message: couldnt('draft the update', refusalOf(r.error)) }); return }
          const x = await saveProjectUpdate(project.id, { title: r.title, html: r.html, milestoneId: r.milestoneId, fileIds: [], intent: 'draft' })
          if ('error' in x) { snack({ message: couldnt('save the draft', refusalOf(x.error)) }); return }
          snack({ key: 'maison-update', message: 'Draft update saved — it isn’t sent' })   // Maison AI's own sentence for its weekly draft
          if (live) { setOpenDraft(x.id); router.refresh() }
        } catch (e) { snack({ message: couldnt('draft the update', refusalOf(e)) }) }
      })()
    }, landing.delay)
    return () => { live = false; window.clearTimeout(t) }
  }, [landing, project.id, router, snack])

  /* the address keeps neither once read; `?open=` lands on its post as the feed arrives */
  useEffect(() => {
    if (!composeParam && !openParam && !draftParam) return
    /* (fix-C, C-15) a bell row whose update went says so, never a silent feed */
    if (openParam) window.setTimeout(() => { if (!pulse(openParam)) snack({ message: 'This update is not there any more' }) }, GHOST_MIN_MS + 150)
    const next = new URLSearchParams(params.toString()); next.delete('compose'); next.delete('open'); next.delete('new'); next.delete('milestone'); next.delete('draft')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [composeParam, openParam, draftParam, params, pathname, router, snack])
  /* a post just saved: brought into view and pulsed once it is in the feed the save returned */
  const [fresh, setFresh] = useState<string | null>(null)
  useEffect(() => {
    if (!fresh) return
    const t = window.setTimeout(() => { if (pulse(fresh)) setFresh(null) }, 80)
    return () => window.clearTimeout(t)
  }, [fresh, updates])

  /* (simplify S-23 · Q-04) the site bar's Photos landed with `camera=1`: the composer read it as it opened; once it closes the address lets it go */
  const dropCamera = () => {
    if (params.get('camera') === null) return
    const next = new URLSearchParams(params.toString()); next.delete('camera')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  const [sendBack, setSendBack] = useState<UpdateView | null>(null)
  const [previewing, setPreviewing] = useState<UpdateView | null>(null)

  /* the feed: a chip, then the search; grouped by day, newest first */
  const counts = useMemo(() => { const c: Partial<Record<UpdateStatus, number>> = {}; for (const u of updates) c[u.status] = (c[u.status] ?? 0) + 1; return c }, [updates])
  const chips = UPDATE_SHOW.filter((o) => o.value === 'all' || (counts[o.value] ?? 0) > 0)
  const shown = show === 'all' || (counts[show] ?? 0) > 0 ? show : 'all'
  const kept = shown === 'all' ? updates : updates.filter((u) => u.status === shown)
  const found = filterByQuery(kept, query, (u) => ({ fields: updateSearchFields(u) }))
  const days = useMemo(() => {
    const map = new Map<number, UpdateView[]>()
    for (const u of [...found].sort((a, b) => feedAt(b) - feedAt(a))) { const d = startOfDay(new Date(feedAt(u))); const l = map.get(d); if (l) l.push(u); else map.set(d, [u]) }
    return [...map.entries()].map(([day, list]) => ({ day, label: displayDateWeekday(new Date(day)), list }))
  }, [found])
  const first = updates.length === 0
  useRememberShape(`lead.${project.id}.updates`, first)   // (REG-817) the tab's ghost opens on the shape it last had (project-ghost.tsx reads it)

  /* (fix-C, C-08) the words follow access: what the client sees, or not yet */
  const reach = clientReach(client)
  const [inviting, setInviting] = useState(false)
  const sees = (lead: string, it = 'it') => (reach.reaches ? `${lead} — ${client.firstName} can see ${it}` : lead)
  const act = async (what: string, fn: () => Promise<unknown>, done: Parameters<typeof run>[2], id: string) => {
    setBusy(id)
    try {
      const ok = await run(what, fn, done)
      if (!ok) router.refresh()   // (fix-C, C-14) a refusal puts the post back to its real state (someone else answered it meanwhile)
      return ok
    } finally { setBusy(null) }
  }
  const onAction = (a: UpdateAction, u: UpdateView) => {
    const held = u.status === 'published' ? u.pending : null
    if (a === 'edit') setComposing(editOf(u))
    else if (a === 'preview') setPreviewing(u)
    else if (a === 'approve') void act('approve the update', () => approveProjectUpdate(u.id), held ? sees(`Change approved`, 'the new words') : sees(`Approved`, `“${u.title}”`), u.id)
    else if (a === 'sendBack') setSendBack(u)
    else if (a === 'resubmit') void act(held ? 'send the change again' : 'resubmit the update', () => resubmitProjectUpdate(u.id), atOnce ? (held ? 'Change posted' : 'Update posted') : 'Sent for review again', u.id)
    else if (a === 'republish') void act('publish the update again', () => republishProjectUpdate(u.id), atOnce ? sees('Published again') : 'Sent for review', u.id)
    else if (a === 'post') void act('post the update', () => saveProjectUpdate(project.id, { id: u.id, title: u.title, html: u.html, milestoneId: u.milestoneId, fileIds: u.media.map((m) => m.fileId), intent: 'post' }), atOnce ? sees('Update posted') : 'Sent for review', u.id)
    else if (a === 'discard') {
      let was: UpdatePendingRecord | null = null
      void act('discard the change', async () => { const r = await discardUpdateChanges(u.id); if (!('error' in r)) was = r.pending; return r },
        { message: `Change discarded — ${client.firstName} keeps the published update`, actionLabel: 'Undo', onAction: () => { const p = was; if (p) void run('bring the change back', () => restoreUpdateChanges(u.id, { pending: p }), 'Change back') } }, u.id)
    }
    else if (a === 'withdraw') {
      /* a removal from the client's view — no question first, an Undo after (the house rule) */
      let eventId = ''
      void act('withdraw the update', async () => { const r = await withdrawProjectUpdate(u.id); if (!('error' in r)) eventId = r.eventId; return r },
        { message: `Withdrawn — ${client.firstName} no longer sees “${u.title}”`, actionLabel: 'Undo', onAction: () => { void run('undo the withdraw', () => undoWithdrawProjectUpdate(u.id, { eventId }), 'Published again') } }, u.id)
    } else if (a === 'delete') {
      let eventId = ''
      void act('delete the update', async () => { const r = await deleteProjectUpdate(u.id); if (!('error' in r)) eventId = r.eventId; return r },
        { message: `Update deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the update', () => restoreProjectUpdate(u.id, { eventId }), 'Update restored').then((ok) => { if (ok) setFresh(u.id) }) } }, u.id)
    }
  }
  const saved = (id: string, status: UpdateStatus, wasNew: boolean, held: boolean) => {
    setComposing(null)
    snack({ message: held ? `Change sent for review — ${client.firstName} keeps the published update`   // (fix-C, C-01)
      : status === 'published' ? (wasNew ? sees('Update posted') : 'Update saved') : status === 'in_review' ? 'Sent for review — an Owner or an Admin approves it' : status === 'draft' ? 'Draft saved' : 'Update saved' })
    setFresh(id)
  }

  const post = viewer.mayPost ? (phone ? (
    /* (the calm UI build 2026-10-27, 3-12 · W-590) one create grammar on every tab: "New update" */
    <Tooltip label="New update" shortcut="create"><IconButton icon="add" label="New update" variant="primary" onClick={() => setComposing('new')} data-kb="create" data-kb-label="New update" data-testid="updates-post" /></Tooltip>
  ) : (
    <Button variant="primary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setComposing('new')} data-kb="create" data-kb-label="New update" data-testid="updates-post">New update</Button>
  )) : null

  return (
    <div className={styles.tab} data-testid="project-updates">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>All Updates</h2>}
        {first ? null : (
          <div className={styles.actions}>
            <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search titles, words, people…" label="Search updates" />
            {post}
          </div>
        )}
      </div>
      {first ? (
        <EmptyState icon="photo_camera" title="No updates yet" testId="updates-empty"
                    help={`Tell ${client.firstName} what happened on site — a line, a few words and the photos. ${!reach.reaches ? reach.line : atOnce ? `${client.firstName} sees each update once it’s posted.` : `An Owner or an Admin checks each one before ${client.firstName} sees it.`}`}
                    primary={viewer.mayPost ? { label: 'New update', icon: 'add', onPress: () => setComposing('new') } : null}
                    secondary={!client.invited && viewer.mayPost ? { label: `Invite ${client.firstName}`, icon: 'person_add', onPress: () => setInviting(true), testId: 'updates-invite' } : null} />
      ) : (
        <>
          {/* (REG-614) the house chips, on the house rail so a phone scrolls them in one row (the studio search's scopes) */}
          {chips.length > 2 ? <div><ChipRail label="Show"><Chips label="Show" options={chips} value={shown} onChange={(v) => setShow(v as UpdateShow)} testId="update-chips" /></ChipRail></div> : null}
          {found.length === 0 ? (
            <TabSearchEmpty noun="updates" searching={!!query.trim()} onClearAll={() => { setQuery(''); setShow('all') }} />
          ) : (
            <div className={styles.feed} role="feed" aria-label="Updates" data-kb-list="updates">
              {days.map((g) => (
                <section key={g.day} className={styles.day} aria-label={g.label}>
                  <h3 className={styles.dayHead}>{g.label}</h3>
                  <div className={styles.posts}>
                    {g.list.map((u) => (
                      <UpdateCard key={u.id} u={u} projectId={project.id} clientFirst={client.firstName} mayPost={viewer.mayPost} mayReview={viewer.mayReview}
                                  atOnce={atOnce} now={now} busy={busy === u.id} from={`${pathname}`} onAction={onAction} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <UpdateComposer open={composing !== null} projectId={project.id} clientFirst={client.firstName} reachLine={reach.line} editing={composing && composing !== 'new' ? composing : null}
                      milestones={data.milestones} reviewOn={reviewOn} role={viewer.role} me={{ id: viewer.id, name: viewer.name }} reviewers={data.reviewers} now={now}
                      milestoneId={composing === 'new' ? landMilestone : null} onClose={() => { setComposing(null); setLandMilestone(null); dropCamera() }}
                      onSaved={(id, status, held) => { dropCamera(); saved(id, status, composing === 'new', held) }} />
      <ClientAccessPanel open={inviting} leadId={project.leadId} project onClose={() => setInviting(false)} />   {/* (fix-C, C-08) the invite one press away */}
      {/* (simplify round 2) the one Send back — the Overview's Needs your OK row opens the same piece */}
      <UpdateSendBackDialog target={sendBack ? { id: sendBack.id, by: (sendBack.status === 'published' ? sendBack.pending?.by?.name : null) ?? sendBack.submittedBy?.name ?? sendBack.author?.name ?? null } : null}
                            clientFirst={client.firstName} busy={!!sendBack && busy === sendBack.id} onClose={() => setSendBack(null)}
                            onSend={(id, note, sentence) => { void act('send the update back', () => sendBackProjectUpdate(id, { note }), sentence, id).then((ok) => { if (ok) setSendBack(null) }) }} />
      <Dialog open={!!previewing} onClose={() => setPreviewing(null)} title="As the client sees it" size="form" width={600}
              subtitle={previewing && previewing.status !== 'published' ? `${client.firstName} doesn’t see this one yet — it’s ${previewing.status === 'in_review' ? 'in review' : previewing.status === 'sent_back' ? 'sent back' : previewing.status}.` : !reach.reaches ? reach.line ?? undefined : previewing?.pending ? `${client.firstName} sees this version until the change is approved.` : `${client.firstName} sees it on the client portal.`}
              footer={<Button variant="secondary" appearance="outlined" onPress={() => setPreviewing(null)}>Close</Button>}>
        {previewing ? (
          <div className={styles.preview} data-testid="update-preview">
            <ClientUpdateCard title={previewing.title} html={previewing.html} author={previewing.author?.name ?? null} at={previewing.publishedAt ?? feedAt(previewing)} media={previewing.media} milestone={previewing.milestoneName} />
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
