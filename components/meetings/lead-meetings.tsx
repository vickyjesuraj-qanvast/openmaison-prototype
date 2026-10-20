'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { EmptyState } from '@/components/om/empty-state'
import { useSnackbar } from '@/components/om/snackbar'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { useRun, couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { LibraryDeletedSheet } from '@/components/company/templates/library-deleted-sheet'
import { useRememberShape } from '@/lib/ghost-shape'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { withFrom } from '@/lib/nav'
import { displayDate, displayDue, parseInputDateTime, startOfDay, titleCaseName } from '@/lib/format'
import { meetingStepHref, meetingStepLabel } from '@/lib/meetings/next-step'   // (S42G) the stage the studio's rule allows
import { clientMeetingPath, firstOf, standingOf, meetingHref } from '@/lib/meetings/model'
import { inviteMessage, whenWords } from '@/lib/meetings/words'
import type { MeetingRow, TeamMember } from '@/lib/meetings/queries'
import {
  cancelMeeting, deleteMeeting, deleteMeetingsForever, emptyMeetingTrash, inviteClient, listDeletedMeetings, meetingLink, openMetLog, planMeeting, restoreMeeting,
  restoreMeetings, undoCancelMeeting, updateMeetingPlan, writeUpMeeting, type DeletedMeeting,
} from '@/app/meetings/actions'
import { MeetingsTable, meetingColumnDefs, type MeetingRowAction } from './meetings-table'
import { dueNow, rememberMeetingShape } from './room/meeting-room-ghost'   // (S42 audit C-19)
import { MeetingsToolbar, NewMeetingMenu, type MeetingTodo, type NewMeetingKind } from './meetings-toolbar'
import { PlanDialog, whenOf, type PlanValue } from './plan-dialog'
import { WriteUpDialog, type WriteUpValue } from './write-up-dialog'
import styles from './meetings.module.css'

export type MeetingsLead = { id: string; name: string; phone: string; email: string | null; stage: string; propertyType: string; propertyAddress: string | null; reachedMet: boolean }

/**
 * (pending modules S23 — his "build all of them" 2026-10-11; REG-552's hold lifted for this card) The meetings of a lead — its Meetings tab
 * (858:24784 drew the tab; REG-552 hid it, two lines restored), the project's Client › Meetings (the lead's own component given the project's
 * base, as Tasks and Files are) and, with `leadId` null, Tools › Meeting Copilot (`/meetings`): the tab unpinned from one lead, as Tasks in the
 * rail is (REG-466), with a Lead column and Start's lead picker. A meeting held on a lead IS its Met log: a Met log no meeting holds lists as
 * itself and opens as one. No mock draws the list — the Contracts tab's twin, the house table, dialogs and empty card. *(invented copy)*
 */
export function LeadMeetings({ leadId, lead, leads, rows, team, viewer, mayChange, now, base, views, header, studioName }: {
  studioName: string
  leadId: string | null
  lead?: MeetingsLead | null
  /** Tools › Meeting Copilot: the leads a new meeting can be for */
  leads?: { id: string; name: string; stage: string; project: string | null; phone: string; email: string | null; propertyType: string; propertyAddress: string | null }[]
  rows: MeetingRow[]
  team: TeamMember[]
  viewer: { id: string; role: string }
  mayChange: boolean
  now: number
  /** a project carries the tab on — its links stay on the project */
  base?: string
  /** a project's view switch, in the title's place */
  views?: ReactNode
  /** Tools › Meeting Copilot's page header, handed the toolbar's primary */
  header?: (c: { add: ReactNode }) => ReactNode
}) {
  /* (S42 audit C-19) the shapes the tab's ghost reads, under the address's own key (a project's Client › Meetings is `lead.<project id>`, as
     every project tab's ghost reads it): its first run, and the to-do chips it opened with */
  const shapeOf = base?.startsWith('/projects/') ? `lead.${base.split('/')[2]}.meetings` : leadId ? `lead.${leadId}.meetings` : 'meetings'
  useRememberShape(shapeOf, rows.length === 0)
  const router = useRouter()
  const pathname = usePathname()
  const snackbar = useSnackbar()
  const { run, fail, refresh } = useRun()
  const here = () => `${window.location.pathname}${window.location.search}`
  const studio = leadId === null
  const today = useMemo(() => new Date(startOfDay(new Date(now))), [now])

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [todo, setTodo] = useState<MeetingTodo | null>(null)
  const phone = useMediaQuery(MOBILE)
  const defs = useMemo(() => meetingColumnDefs(studio), [studio])
  const columns = useTableColumns(studio ? 'studio-meetings' : 'meetings', defs, phone)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const counts = useMemo(() => ({ save: rows.filter((r) => standingOf(r, now).waits === 'save').length, write: rows.filter((r) => standingOf(r, now).waits === 'write').length }), [rows, now])
  if (todo && counts[todo] === 0) setTodo(null)   // render-phase adjust: a chip with nothing left lets go
  useRememberShape(`${shapeOf}.save`, counts.save > 0)   // (S42 C-19) Briefs to save · Notes to write up — the ghost draws them as the tab opened
  useRememberShape(`${shapeOf}.write`, counts.write > 0)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => !todo || standingOf(r, now).waits === todo).filter((r) => !q || [r.title, r.leadName, r.whereKind, r.place ?? '', standingOf(r, now).word, r.startsAt ? displayDue(new Date(r.startsAt)) : ''].some((x) => x.toLowerCase().includes(q)))
  }, [rows, todo, query, now])
  const nothingMatches = rows.length > 0 && visible.length === 0

  /* ── the lead a new meeting is for: the tab's own, or (Tools) the one picked ── */
  const [forLead, setForLead] = useState<MeetingsLead | null>(lead ?? null)
  const [picking, setPicking] = useState<NewMeetingKind | null>(null)
  const [plan, setPlan] = useState<{ editing: MeetingRow | null; defaults: Partial<PlanValue> } | null>(null)
  const [writeUp, setWriteUp] = useState<{ meetingId: string | null; start: 'notes' | 'recording'; defaults: Partial<WriteUpValue> } | null>(null)
  const [invite, setInvite] = useState<{ row: MeetingRow; token: string } | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [deleted, setDeleted] = useState<DeletedMeeting[]>([])
  const [busy, setBusy] = useState(false)

  const fromList = (id: string): MeetingsLead | null => { const l = leads?.find((x) => x.id === id); return l ? { id: l.id, name: l.name, phone: l.phone, email: l.email, stage: l.stage, propertyType: l.propertyType, propertyAddress: l.propertyAddress, reachedMet: true } : null }
  const leadFor = (id: string): MeetingsLead | null => (lead && lead.id === id ? lead : forLead && forLead.id === id ? forLead : fromList(id))
  const meetingPage = (id: string) => withFrom(meetingHref(id), here())
  const leadMeetingsHref = (r: MeetingRow) => withFrom(`/leads/${r.leadId}/meetings`, pathname)
  const defaultsFor = (l: MeetingsLead | null): Partial<PlanValue> => ({ memberIds: [viewer.id], place: l?.propertyAddress ?? '' })

  const begin = (kind: NewMeetingKind, l: MeetingsLead) => {
    setForLead(l)
    if (kind === 'plan') setPlan({ editing: null, defaults: defaultsFor(l) })
    else if (kind === 'write' || kind === 'record') setWriteUp({ meetingId: null, start: kind === 'record' ? 'recording' : 'notes', defaults: { memberIds: [viewer.id], when: whenOf(now) } })
    else void startNow(l)
  }
  const onNew = (kind: NewMeetingKind) => {
    if (lead) { begin(kind, lead); return }
    setPicking(kind)
  }
  useCreateIntent<'1' | 'now' | 'write' | 'record'>({ event: CREATE_EVENTS.meetings, landing: leadId ? { href: base ? `${base}/meetings` : `/leads/${leadId}/meetings`, values: ['1', 'now', 'write', 'record'] } : undefined,
    onIntent: (v, detail) => { const k = (typeof detail === 'string' ? detail : v) ?? '1'; onNew(k === 'now' ? 'now' : k === 'write' ? 'write' : k === 'record' ? 'record' : 'plan') } })

  /* Start a meeting now: a meeting at this minute, no reminder — the co-pilot's page opens on its Before view (consent, the aim, the prep) */
  const startNow = async (l: MeetingsLead) => {
    if (busy) return
    setBusy(true)
    const r = await planMeeting({ leadId: l.id, aim: 'first_consultation', whereKind: 'In person', place: l.propertyAddress, startsAt: Date.now(), memberIds: [viewer.id], remind: false }).catch(() => null)
    if (!r || 'error' in r) { setBusy(false); fail('start the meeting', r ? refusalOf(r.error) : null); return }
    rememberMeetingShape(r.id, 'planned', { due: true })   // (S42 C-19) its page opens on the Before view at its time — the ghost draws that
    router.push(meetingPage(r.id))
  }

  const savePlan = async (v: PlanValue): Promise<boolean> => {
    const at = parseInputDateTime(v.when)
    if (!at) return false
    const editing = plan?.editing
    const l = editing ? null : forLead
    if (!editing && !l) return false
    setBusy(true)
    try {
      if (editing) {
        const r = await updateMeetingPlan(editing.id, { aim: v.aim, aimNote: v.aimNote, whereKind: v.whereKind, place: v.place, startsAt: at.getTime(), lengthMin: v.lengthMin, memberIds: v.memberIds })
        if ('error' in r) { fail('change the plan', refusalOf(r.error)); return false }
        snackbar({ message: `Meeting moved to ${displayDue(at)}` })
        refresh(); return true
      }
      const r = await planMeeting({ leadId: l!.id, aim: v.aim, aimNote: v.aimNote, whereKind: v.whereKind, place: v.place, startsAt: at.getTime(), lengthMin: v.lengthMin, memberIds: v.memberIds, remind: v.remind })
      if ('error' in r) { fail('plan the meeting', refusalOf(r.error)); return false }
      const row: MeetingRow = { id: r.id, fromLog: false, leadId: l!.id, leadName: l!.name, projectId: null, aim: v.aim, title: '', whereKind: v.whereKind, place: v.place || null, startsAt: at.getTime(), endsAt: null, status: 'planned', memberIds: v.memberIds, briefAt: null, briefSavedAt: null, score: null, source: null, notes: false, sharedAt: null, clientAnswer: null, createdBy: viewer.id, log: null }
      snackbar({ message: `Meeting planned for ${displayDue(at)}${r.taskId ? ' — a reminder task is on it' : ''}`, actionLabel: 'Send the invitation', onAction: () => { void openInvite(row) } })
      refresh(); return true
    } catch { fail(editing ? 'change the plan' : 'plan the meeting'); return false } finally { setBusy(false) }
  }

  const saveWriteUp = async (v: WriteUpValue): Promise<boolean> => {
    const at = parseInputDateTime(v.when)
    const l = forLead
    if (!at || !l || !writeUp) return false
    setBusy(true)
    try {
      const r = await writeUpMeeting({ leadId: l.id, meetingId: writeUp.meetingId, notes: v.notes, aim: v.aim, whereKind: v.whereKind, startsAt: at.getTime(), memberIds: v.memberIds, recording: v.recording ? { name: v.recording.name, data: v.recording.data } : null, consent: v.consent })
      if ('error' in r) { fail('make the brief', refusalOf(r.error)); return false }
      /* (S42G) before Met, the stage the studio's rule allows (Contacted for a New lead under one stage at a time) — never a move it refuses */
      const next = r.next
      const toStep = next ? { actionLabel: meetingStepLabel(next), onAction: () => router.push(meetingStepHref(l.id, r.id, next)) } : { actionLabel: 'Open', onAction: () => router.push(meetingPage(r.id)) }
      snackbar({ message: `Brief made from the ${v.recording ? 'recording’s transcript' : 'notes'}${r.filed === 'logged' ? ' — added to the Met step’s logs' : ''}`, ...toStep })
      refresh(); return true
    } catch { fail('make the brief'); return false } finally { setBusy(false) }
  }

  const openInvite = async (row: MeetingRow) => {
    const r = await meetingLink(row.id).catch(() => null)
    if (!r || 'error' in r) { fail('make the invitation', r ? refusalOf(r.error) : null); return }
    setInvite({ row, token: r.token })
  }
  const absolute = (path: string) => `${window.location.origin}${path}`

  const onRowAction = (r: MeetingRow, a: MeetingRowAction) => {
    const l = leadFor(r.leadId) ?? { id: r.leadId, name: r.leadName, phone: '', email: null, stage: '', propertyType: '', propertyAddress: null, reachedMet: true }
    if (a === 'open' || a === 'start') { void openRow(r); return }
    if (a === 'edit') { setForLead(l); setPlan({ editing: r, defaults: { aim: r.aim as PlanValue['aim'], when: whenOf(r.startsAt), lengthMin: r.endsAt ? Math.round((r.endsAt - r.startsAt) / 60_000) : undefined, whereKind: r.whereKind as PlanValue['whereKind'], place: r.place ?? '', memberIds: r.memberIds } }); return }
    if (a === 'invite') { void openInvite(r); return }
    if (a === 'write') {
      setForLead(l)
      if (r.fromLog && r.log) {
        void openMetLog(r.leadId, r.log.logId, r.log.index).then((x) => { if ('error' in x) { fail('open the log', refusalOf(x.error)); return } setWriteUp({ meetingId: x.id, start: 'notes', defaults: { when: whenOf(r.startsAt), whereKind: r.whereKind as WriteUpValue['whereKind'], memberIds: [viewer.id], aim: 'first_consultation' } }) }, () => fail('open the log'))
        return
      }
      setWriteUp({ meetingId: r.id, start: 'notes', defaults: { aim: r.aim as WriteUpValue['aim'], when: whenOf(r.startsAt), whereKind: r.whereKind as WriteUpValue['whereKind'], memberIds: r.memberIds.length ? r.memberIds : [viewer.id] } })
      return
    }
    if (a === 'cancel') {
      void cancelMeeting(r.id).then((x) => {
        if ('error' in x) { fail('cancel the meeting', refusalOf(x.error)); return }
        refresh()
        snackbar({ message: `${r.title} with ${firstOf(titleCaseName(r.leadName))} cancelled${x.undo.length ? ' — its reminder too' : ''}`, actionLabel: 'Undo', onAction: () => { void run('put the meeting back', () => undoCancelMeeting(r.id, x.undo), 'The meeting is back', { refresh: true }) } })
      }, () => fail('cancel the meeting'))
      return
    }
    if (a === 'delete') {
      void deleteMeeting(r.id).then((x) => {
        if ('error' in x) { fail('delete the meeting', refusalOf(x.error)); return }
        refresh()
        snackbar({ message: `${r.title} on ${displayDate(new Date(r.startsAt))} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the meeting', () => restoreMeeting(r.id, x.undo), 'Meeting restored', { refresh: true }) } })
      }, () => fail('delete the meeting'))
    }
  }
  const openRow = async (r: MeetingRow) => {
    if (r.fromLog && r.log) {
      if (!mayChange) { snackbar({ message: 'A Met log — open it from the Move stage window' }); return }
      const x = await openMetLog(r.leadId, r.log.logId, r.log.index).catch(() => null)
      if (!x || 'error' in x) { fail('open the meeting', x ? refusalOf(x.error) : null); return }
      rememberMeetingShape(x.id, 'held')   // (S42 C-19) a Met log opens as a held meeting's brief
      router.push(meetingPage(x.id)); return
    }
    rememberMeetingShape(r.id, r.status, { due: dueNow(r, now), invited: !!r.invited })   // (S42 C-19) the row knows the moment its page opens on
    router.push(meetingPage(r.id))
  }
  const canDelete = useCallback((r: MeetingRow) => (viewer.role === 'Owner' || viewer.role === 'Admin' || r.createdBy === viewer.id ? null : 'whoever planned it, Owner or Admin'), [viewer])

  const loadDeleted = async () => { setDeleted(await listDeletedMeetings(leadId).catch(() => [])) }
  const deletedItems = deleted.map((d) => ({ id: d.id, title: `${d.title} · ${d.leadName}`, createdAt: new Date(d.startsAt), updatedAt: new Date(d.deletedAt), author: team.find((t) => t.id === d.deletedBy)?.name ?? null, authorColor: team.find((t) => t.id === d.deletedBy)?.color ?? null, usedBy: 0, deletedAt: new Date(d.deletedAt), when: d.startsAt, createdBy: d.createdBy }))

  const add = mayChange ? <NewMeetingMenu filled onNew={onNew} /> : null
  const empty = rows.length === 0
  return (
    <>
    {header ? header({ add }) : null}
    <div className={styles.tab} data-testid="meetings-tab" data-studio={header ? '' : undefined}>
      <MeetingsToolbar title={views ?? 'All Meetings'} bare={empty} hideNew={!!header} query={query} onQuery={setQuery} onNew={onNew} onColumns={phone ? undefined : () => setColumnsOpen(true)}
        todos={{ save: counts.save, write: counts.write, on: todo, onToggle: (k) => setTodo((t) => (t === k ? null : k)) }} mayChange={mayChange}
        onMenu={(m) => { if (m === 'settings') router.push(withFrom('/settings?section=meetings', here())); else { setDeletedOpen(true); void loadDeleted() } }} />
      {empty ? (
        <EmptyState icon="event" testId="meetings-empty"
          title="Meet with the co-pilot beside you"
          help="Plan the meeting, and in it the co-pilot keeps the checklist, the tips and the rough estimate — then makes the brief: what they want, the next steps and the message to send."
          primary={mayChange ? { label: 'Plan a meeting', icon: 'event', onPress: () => onNew('plan') } : null}
          secondary={mayChange ? { label: 'Start a meeting now', icon: 'mic', onPress: () => onNew('now') } : null}
          link={mayChange ? { label: 'Write one up from notes', onPress: () => onNew('write') } : null} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="meetings" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setTodo(null) }} />
      ) : (
        <MeetingsTable rows={visible} team={team} columns={columns.columns} onReorder={columns.reorder} onOpen={(r) => { void openRow(r) }} onAction={onRowAction} now={now}
                       leadHref={studio ? leadMeetingsHref : undefined} mayChange={mayChange} canDelete={canDelete} />
      )}

      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columns.all} onSave={columns.save} onReset={columns.reset} />
      {leads ? (
        <PickLeadDialog open={!!picking} onClose={() => setPicking(null)} leads={leads.map((l) => ({ id: l.id, name: l.project ? `${l.name} · ${l.project}` : l.name }))} title="Which lead is this meeting with?" busy={busy} busyLabel="Starting…"
          onPick={(id) => { const k = picking; const l = id ? fromList(id) : null; setPicking(null); if (!k || !l) return; begin(k, l) }} />
      ) : null}
      <PlanDialog open={!!plan} onClose={() => setPlan(null)} onSave={savePlan} team={team} client={forLead?.name ?? plan?.editing?.leadName ?? ''} defaults={plan?.defaults ?? {}} today={today} busy={busy} editing={!!plan?.editing} meetingId={plan?.editing?.id ?? null} />
      <WriteUpDialog open={!!writeUp} onClose={() => setWriteUp(null)} onSave={saveWriteUp} team={team} client={forLead?.name ?? ''} defaults={writeUp?.defaults ?? {}} today={today} busy={busy} start={writeUp?.start ?? 'notes'} />
      {invite ? (
        <SendContractDialog open onClose={() => setInvite(null)} title="Send the invitation" subtitle={`${firstOf(titleCaseName(invite.row.leadName))} gets the day and the place, a calendar invite, and a way to say if the time doesn’t suit.`}
          link={absolute(clientMeetingPath(invite.token))} copyDone="Invitation link copied" phoneLabel="Client mobile" sendLabel="Send on WhatsApp"
          onCopy={() => inviteClient(invite.row.id, 'copy').then((x) => { if ('error' in x) { fail('record the invitation', refusalOf(x.error)); return false } snackbar({ message: 'Invitation link copied' }); refresh(); return true }, () => false)}
          defaults={{ name: titleCaseName(invite.row.leadName), phone: leadFor(invite.row.leadId)?.phone ?? '' }}
          draft={(name) => inviteMessage({ client: name, studio: studioName, aim: invite.row.aim, startsAt: invite.row.startsAt, whereKind: invite.row.whereKind, place: invite.row.place, link: absolute(clientMeetingPath(invite.token)) })}
          extra={leadFor(invite.row.leadId)?.email ? (
            <div className={styles.emailRow}><span className={styles.muted}>Or send it to {leadFor(invite.row.leadId)!.email} — the email carries the same link.</span>
              <Button appearance="text" onPress={() => { const row = invite.row; setInvite(null); void inviteClient(row.id, 'email').then((x) => { if ('error' in x) fail('email the invitation', refusalOf(x.error)); else snackbar({ message: x.emailed === 'off' ? 'Your studio has the meeting email switched off — Settings › Notifications' : x.emailed === 'no_address' ? 'The lead has no email' : x.emailed === 'failed' ? couldnt('email the invitation') : `Invitation emailed for ${whenWords(row.startsAt)}` }); refresh() }, () => fail('email the invitation')) }} data-testid="invite-email">Send by email</Button></div>
          ) : null}
          onSend={({ phone, message }) => {
            window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')   // on the press (REG-534)
            const row = invite.row
            setInvite(null)
            void run('record the invitation', () => inviteClient(row.id, 'whatsapp'), `Invitation sent to ${firstOf(titleCaseName(row.leadName))}`, { refresh: true })
          }} />
      ) : null}
      <LibraryDeletedSheet open={deletedOpen} rows={deletedItems} crumb={studio ? 'Meetings' : `${lead?.name ?? 'Lead'} / Meetings`} ariaLabel="Deleted Meetings" title="Deleted Meetings" noun={{ one: 'meeting', many: 'meetings' }} nameLabel="Meeting" byLabel="Deleted by" usageLabel="When"
        glyph={() => null} meta={{ label: 'Planned', value: (t) => displayDate(t.createdAt) }} usage={(t) => displayDue(t.createdAt)}
        purgeRule={(t) => (viewer.role === 'Owner' || viewer.role === 'Admin' || (t as { createdBy?: string | null }).createdBy === viewer.id ? null : 'whoever planned it, Owner or Admin')}
        onClose={() => setDeletedOpen(false)}
        onRestore={async (ids) => { const r = await restoreMeetings(ids); if ('error' in r) { fail('restore', refusalOf(r.error)); return } snackbar({ message: r.restored === 1 ? 'Meeting restored' : `${r.restored} meetings restored` }); await loadDeleted(); refresh() }}
        onDeleteForever={async (ids) => { const r = await deleteMeetingsForever(ids); if ('error' in r) { fail('delete for good', refusalOf(r.error)); return } snackbar({ message: r.removed === 1 ? 'Meeting deleted for good' : `${r.removed} meetings deleted for good` }); await loadDeleted(); refresh() }}
        onEmptyTrash={async () => { const r = await emptyMeetingTrash(leadId); if ('error' in r) { fail('empty the trash', refusalOf(r.error)); return } snackbar({ message: 'Trash emptied' }); await loadDeleted(); refresh() }} />
    </div>
    </>
  )
}
