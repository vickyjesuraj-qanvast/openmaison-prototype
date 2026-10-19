import type { ReactNode } from 'react'
import { Bone, EmptyCardGhost } from '@/components/shell/skeleton'
import { GhostTable, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { GhostFolderGroup } from '@/components/company/templates/library-gallery.skeleton'
import { useFirstRunShape, useViewerShape } from '@/lib/ghost-shape'   // (pending modules S06) Accounting's Files ghost
import { usePathname } from 'next/navigation'   // (S42 audit C-19)
import { ACTIONS_TRAIL } from '@/components/om/table-columns'
import tasksBar from '@/components/leads/tasks/tasks-toolbar.module.css'
import filesBar from '@/components/leads/files/files-toolbar.module.css'
import filesGrid from '@/components/leads/files/files-grid.module.css'
import notesBar from '@/components/leads/notes/notes-toolbar.module.css'
import notes from '@/components/leads/notes/lead-notes.module.css'
import notesList from '@/components/leads/notes/notes-list.module.css'
import pane from '@/components/leads/notes/pane-toolbar.module.css'
import quest from '@/components/leads/questionnaire/lead-questionnaire.module.css'
import qCard from '@/components/leads/questionnaire/question-card.module.css'
import summary from '@/components/leads/questionnaire/summary-card.module.css'
import activity from '@/components/leads/activity/lead-activity.module.css'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'   // (parity P-15)
import emptyStyles from '@/components/om/empty-state.module.css'   // (pending modules S23)

/**
 * (REG-708) The lead's tabs, each its own ghost body under the lead's frame (DetailSkeleton): the tab's toolbar on the tab's own classes (its
 * title in the tab's words, its tools folding as the real ones fold — the search into its glyph at ≤1024, New ▾ on a phone), then the tab's
 * body — the Tasks, Quotes and Contracts tables at their own tracks and row heights (cards on a phone), the Files folders and tiles, the Notes
 * list and pane, the question cards beside the summary, the Activity feed. `[tab]/loading.tsx` and the lead's PageReveal draw the same one.
 * (simplify S-03) On a project the same bodies take `title` — the group's view switch's ghost (components/projects/project-views-ghost.tsx)
 * in the title's place, as the page draws it; the lead's own tabs pass none and draw exactly as before.
 */

/** A tab toolbar: the tab's own bar, its title in the tab's words (or `head` — a project's view switch), its tools. */
function Bar({ bar, title, words, head, children }: { bar: string | undefined; title: string | undefined; words: string; head?: ReactNode; children: React.ReactNode }) {
  return <div className={bar}>{head ?? <Words as="h2" className={title}>{words}</Words>}<span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{children}</span></div>
}

const TASK_W = [180, 140, 210, 160, 190, 120]
/** (T5 · T4) The /tasks to-do chips as the demo studio's All Tasks draws them: "Overdue · n" · "Due today · n" · "Unassigned · n" — after
    (REG-1359, the gaps build's C-16) the "Whose tasks" switch All · Leads · Projects, 211 at a desk, in the scope's sheet on a phone. */
const TODO_W = [137, 149, 167]

/** The lead's Tasks tab — or (`studio`) the rail's Tasks page body: the scope chip in the title's place, no Add Task (it is the header's), and
    the Lead column after the title (REG-466). (UX audit 2026-09-30, T5 · T4) the page's to-do chips after the scope chip — Overdue · Due today ·
    Unassigned, at their own widths (their count alone below 1025). */
export function TasksTabGhost({ studio = false, rows = 5, title, sources = true }: { studio?: boolean; rows?: number; title?: ReactNode
  /** (S43E W6-02) the rail page's Leads · Projects — only for a role that opens projects, as the page draws it */ sources?: boolean }) {
  return (
    <>
      {studio ? (
        <div className={tasksBar.bar}><span className={tasksBar.scopeWrap}><Slot kind="btn" w={148} />{sources ? <Slot kind="btn" w={211} desk /> : null}<span className={tasksBar.todos}>{TODO_W.map((w, i) => <Slot key={i} kind="btn" w={w} className={tasksBar.todoGhost} />)}</span></span><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Slot kind="search" /><Slot kind="icon" /><Slot kind="icon" desk /></span></div>
      ) : <Bar bar={tasksBar.bar} title={tasksBar.title} words="All Tasks" head={title}><Slot kind="btnFold" w={119} /><Slot kind="search" /><Slot kind="icon" /><Slot kind="icon" desk /><Slot kind="icon" /></Bar>}
      <GhostTable head={56} row={48} rows={rows} foot={53} phone={{ card: studio ? 117 : 97, framed: true, lines: studio ? 3 : 2 }} cols={[
        { basis: 56, head: null, cell: { slot: 'check' } },
        { basis: 450, grow: 1, head: 32, cell: (r) => ({ node: <><Bone w={18} h={18} r="50%" /><Line w={cycle(TASK_W, r)} lh={20} h={12} /></> }) },
        ...(studio ? [{ basis: 200, head: 36, cell: (r: number) => cycle([88, 72, 96, 80, 104], r) }] : []),
        { basis: 160, head: 56, cell: { slot: 'avatar' } },
        { basis: 160, head: 52, cell: { node: <><Slot kind="avatar" /><Line w={40} lh={20} h={12} /></> } },
        { basis: 240, head: 60, cell: 64 },   /* (Dane UAT 5.13) the Due column's day and time (tasks-table TASK_COLUMN_DEFS) */
        { basis: 118, head: 48, cell: { slot: 'chip', w: 44 } },
        { basis: 191, head: 36, cell: 72 },
      ]} />
    </>
  )
}

/** The lead's Quotes tab — or (`studio`) Tools › Quotes: the Client column after the title and Approval at the end (REG-422 · REG-624);
    (UX audit Q5) Sent to client and Valid until after Created. The to-do chips come and go with what waits — no ghost draws them (REG-666's). */
export function QuotesTabGhost({ studio = false, rows = 3 }: { studio?: boolean; rows?: number }) {
  return (
    <>
      <Bar bar={tasksBar.bar} title={tasksBar.title} words="All Quotes"><Slot kind="btnFold" w={122} /><Slot kind="search" /><Slot kind="icon" /><Slot kind="icon" desk /><Slot kind="icon" /></Bar>
      <GhostTable head={56} row={64} rows={rows} phone={{ card: 126, lines: 3 }} cols={[
        { basis: 40, head: null, cell: { slot: 'check' } },
        { basis: 317, grow: 1, head: 33, cell: (r) => [cycle([150, 128, 170], r), 96] },
        ...(studio ? [{ basis: 180, head: 44, cell: (r: number) => cycle([84, 96, 72, 88], r) }] : []),
        { basis: 128, head: 46, cell: 56 },
        { basis: 160, head: 56, cell: { node: <><Slot kind="avatar" /><Line w={56} lh={20} h={12} /></> } },
        ...[58, 45, 75].map((head, i) => ({ basis: i === 1 ? 160 : 120, head, cell: 64 as number })),   /* (Dane UAT 5.13) Due holds its day at 160 */
        { basis: 168, head: 110, cell: 64 },   /* (UX audit Q5) Sent to client */
        { basis: 160, head: 92, cell: 64 },   /* (UX audit Q5) Valid until — (Dane UAT 5.13) 160 with its day */
        { basis: 120, head: 76, cell: 64 },
        { basis: 157, head: 64, cell: 72 },   /* Approval Date — the lead's tab draws it too while the studio asks for approval (the default, REG-214) */
      ]} />
    </>
  )
}

/** The lead's Contracts tab — or (`studio`) Tools › Contracts: the Lead column after the title (`contractColumnDefs(withLead)`). */
export function ContractsTabGhost({ studio = false, rows = 3 }: { studio?: boolean; rows?: number }) {
  return (
    <>
      <Bar bar={tasksBar.bar} title={tasksBar.title} words="All Contracts"><Slot kind="btnFold" w={149} /><Slot kind="search" /><Slot kind="icon" /><Slot kind="icon" desk /><Slot kind="icon" /></Bar>
      <GhostTable head={48} row={68} rows={rows} phone={{ card: studio ? 134 : 106, lines: studio ? 4 : 3 }} cols={[
        { basis: 555, grow: 1, head: 33, cell: (r) => cycle([196, 168, 210], r) },
        ...(studio ? [{ basis: 180, head: 32, cell: (r: number) => cycle([84, 96, 72, 88], r) }] : []),
        { basis: 128, head: 46, cell: 56 },
        { basis: 120, head: 55, cell: 72 },
        { basis: 142, head: 82, cell: 96 },
        { basis: 140, head: 32, cell: 72 },
        { basis: 157, head: 56, cell: 72 },
      ]} />
    </>
  )
}

export function FilesTabGhost({ title }: { title?: ReactNode } = {}) {
  /* (pending modules S06) Accounting reads a project's files: no New Folder, New File or ⋮, nothing to select — the page as they see it */
  const reader = useViewerShape('role.accounting')
  return (
    <>
      <div className={filesBar.bar}>
        {title ?? <Words as="h2" className={filesBar.title}>All Files</Words>}
        <span className={filesBar.actions}>{reader ? <><Slot kind="search" /><Slot kind="iconTouch" /><Slot kind="btn" w={71} desk /></>
          : <><Slot kind="iconTouch" /><Slot kind="btnFold" w={114} /><Slot kind="search" /><Slot kind="iconTouch" /><Slot kind="btn" w={71} desk /><Slot kind="iconTouch" /></>}</span>
      </div>
      <div className={filesGrid.groups}>
        <GhostFolderGroup count={2} check={!reader} />
        <div className={filesGrid.group}>
          <div className={filesGrid.groupHead}>{reader ? null : <Bone w={18} h={18} style={{ margin: 3 }} />}<Line w={96} lh={20} h={14} /></div>
          <div className={filesGrid.row}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={filesGrid.tile}>
                <Bone w="100%" h={200} r={2} />
                <span className={filesGrid.caption}><Bone w={20} h={20} r={4} /><Line w={cycle(['58%', '44%', '64%', '50%'], i)} lh={20} h={12} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export function NotesTabGhost({ title }: { title?: ReactNode } = {}) {
  return (
    <>
      <div className={notesBar.bar}>
        {title ?? <Words as="h2" className={notesBar.title}>All Notes &amp; Logs</Words>}
        <span className={notesBar.right}><Slot kind="btnFold" w={86} /><Slot kind="search" /></span>
      </div>
      <div className={notes.card} data-composer="">
        <div className={notes.list}>
          <div className={notesList.column}>
            <div className={notesList.head}><span className={notesList.chips}>{[39, 74, 111].map((w, i) => <Slot key={i} kind="pill" w={w} style={{ height: 36 }} />)}</span></div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 12, height: 100, padding: 16, borderBottom: '1px solid var(--om-color-surface-variant)' }}>
                <Bone w={20} h={20} r={4} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}><Line w={cycle([96, 120, 84, 110, 90], i)} lh={20} h={12} /><Line w={cycle(['62%', '48%', '70%', '56%', '64%'], i)} lh={20} h={10} /><Line w={112} lh={16} h={10} /></span>
              </div>
            ))}
          </div>
        </div>
        <div className={notes.pane}>
          <div className={pane.header}><Line w={78} lh={20} h={12} /><Line w={26} lh={20} h={12} /></div>
          <div className={notes.body}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ display: 'flex', gap: 40 }}><Line w={96} lh={20} h={12} /><Line w={cycle([120, 150, 132], i)} lh={20} h={12} /></span>)}
            </div>
          </div>
        </div>
        <div className={notes.composer}><div style={{ height: 80, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}><Line w={120} lh={20} h={12} /><Line w="70%" lh={20} h={10} /></div><div style={{ height: 61, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Line w={96} lh={24} h={16} /><Slot kind="btn" w={64} /></div></div>
      </div>
    </>
  )
}

export function QuestionnaireTabGhost({ title }: { title?: ReactNode } = {}) {
  return (
    <>
      <div className={quest.bar}>{title ?? <Words as="h2" className={quest.title}>All Questions</Words>}<Slot kind="btn" w={101} /></div>
      <div className={quest.layout}>
        <div className={quest.questions}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={qCard.card}>
              <div className={qCard.head}><span className={qCard.q}><Line w={cycle(['52%', '38%', '46%', '60%', '42%', '34%'], i)} lh={20} h={12} /></span><Line w={52} lh={20} h={12} /></div>
            </div>
          ))}
        </div>
        <div className={quest.summary}>
          <div className={summary.card}>
            <div className={summary.head}><Words className={summary.title}>Questionnaire summary</Words></div>
            <div className={summary.body}><Line w="70%" lh={20} h={12} /><Line w="54%" lh={20} h={12} /></div>
          </div>
        </div>
      </div>
    </>
  )
}

export function ActivityTabGhost({ title }: { title?: ReactNode } = {}) {
  return (
    <>
      {/* the house tab toolbar's search — the 280 box, its glyph at ≤1024 — as the tab draws it (the classes it named were gone) */}
      <div className={activity.bar}>{title ?? <Words as="h2" className={activity.title}>All Activities</Words>}<span className={activity.actions}><Slot kind="search" /></span></div>
      {/* (UX audit 2026-09-30, T10) the chips above the timeline — All · Tasks · Files · Notes · Stage (house Chips, 32 tall, 12 apart) */}
      {/* (parity P-15) the chips ride the house ChipRail — one row that never wraps, as the tab draws them */}
      <div><div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[41, 60, 53, 60, 60].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div></div>   {/* the page's own nesting: a plain div holds the rail, so the rail's flex: 1 never stretches the row */}
      <div className={activity.list}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <div key={i} className={activity.row}>
            <span className={activity.rail}><span className={activity.dot} /></span>
            <span className={activity.when}><Line w={cycle([172, 164, 156, 170], i)} lh={20} h={12} /></span>
            <span className={activity.body}><Line w={cycle([346, 474, 605, 400, 290, 520], i)} lh={20} h={12} /></span>
          </div>
        ))}
      </div>
    </>
  )
}

/** (pending modules S23) The lead's Meetings tab — or (`studio`) Tools › Meeting Copilot: the house tab toolbar (New Meeting ▾ in the header on the
    studio page), the meetings table at its tracks (the meeting's two lines, the Lead column on the studio list), the phone's cards; with no
    meeting yet, the bare bar and the house first-run card in the tab's own words. */
export function MeetingsTabGhost({ studio = false, rows = 4, title, first = false }: { studio?: boolean; rows?: number; title?: ReactNode; first?: boolean }) {
  /* (S42 audit C-19) the to-do chips the tab opened with last time (lead-meetings.tsx remembers them under the address's key) — Briefs to save ·
     Notes to write up, before New Meeting ▾ */
  const seg = usePathname()?.split('/') ?? []
  const key = (seg[1] === 'leads' || seg[1] === 'projects') && seg[2] ? `lead.${seg[2]}.meetings` : 'meetings'
  const save = useFirstRunShape(`${key}.save`), write = useFirstRunShape(`${key}.write`)
  const todos = [save ? TODO_MEETING_W.save : 0, write ? TODO_MEETING_W.write : 0].filter(Boolean)
  const bar = <Bar bar={tasksBar.bar} title={tasksBar.title} words="All Meetings" head={title}>{first ? <Slot kind="icon" /> : <>{todos.map((w, i) => <Slot key={i} kind="btn" w={w} className={tasksBar.todoGhost} />)}{studio ? null : <Slot kind="btnFold" w={150} />}<Slot kind="search" /><Slot kind="icon" desk /><Slot kind="icon" /></>}</Bar>
  if (first) return (<>{bar}<MeetingsFirstGhost /></>)
  return (
    <>
      {bar}
      <GhostTable head={56} row={68} rows={rows} phone={{ card: studio ? 146 : 122, lines: studio ? 4 : 3 }} cols={[
        { basis: 300, grow: 1, head: 56, cell: (r) => (cycle([1, 0, 1, 1], r) ? [cycle([132, 96, 150, 120], r), cycle([108, 96, 128, 96], r)] : cycle([132, 96, 150, 120], r)) },
        ...(studio ? [{ basis: 180, head: 32, cell: (r: number) => cycle([84, 96, 72, 88], r) }] : []),
        { basis: 220, head: 36, cell: 156 },
        { basis: 180, head: 44, cell: 72 },
        { basis: 120, head: 48, cell: { slot: 'avatar' } },
        { basis: 168, head: 46, cell: (r) => (cycle([1, 0, 1, 0], r) ? [cycle([32, 60], r), 128] : cycle([60, 32, 64], r)) },
        { basis: 128, head: 76, cell: (r) => cycle([64, 16, 56, 16], r) },
        { basis: ACTIONS_TRAIL.pair, head: null, cell: null },   // (S42 audit C-19) the row's parked actions (meetings-table.tsx's trail) — the Meeting column keeps its own width
      ]} />
    </>
  )
}
/** (S42 audit C-19) The to-do chips' widths at a desk, as the page draws them (a count alone below 1025, `todoGhost`). */
const TODO_MEETING_W = { save: 172, write: 196 }
function MeetingsFirstGhost() {
  return (
    <div className={emptyStyles.empty} data-tone="first" aria-hidden>
      <span className={emptyStyles.glyph}><Bone w={40} h={40} r="50%" /></span>
      <Words as="h3" className={emptyStyles.title}>Meet with the co-pilot beside you</Words>
      <Words as="p" className={emptyStyles.help}>Plan the meeting, and in it the co-pilot keeps the checklist, the tips and the rough estimate — then makes the brief: what they want, the next steps and the message to send.</Words>
      <span className={emptyStyles.actions}><Bone w={158} h={36} r={4} /><Bone w={190} h={36} r={4} /><Bone w={178} h={36} r={4} /></span>
    </div>
  )
}

/** (UX audit build · REG-737) A list tab with nothing in it: its toolbar's title and ⋮ only (the create twin, search and Filters step back),
    then the tab's empty card — what the tab opens on while it holds nothing (lib/ghost-shape.tsx says which). */
const FIRST: Record<string, { words: string; buttons: number[]; /** the card's buttons stack on a phone */ stack?: boolean }> = {
  tasks: { words: 'All Tasks', buttons: [132, 170] },
  quotes: { words: 'All Quotes', buttons: [122, 132, 118], stack: true },   // (S46A — M4) From Scratch · From Template · Upload a quote
  contracts: { words: 'All Contracts', buttons: [210, 132], stack: true },
  files: { words: 'All Files', buttons: [150, 140] },
}
export const FIRST_RUN_TABS = Object.keys(FIRST)
export function FirstRunTabGhost({ tab, title }: { tab: string; title?: ReactNode }) {
  const f = FIRST[tab]
  if (!f) return null
  return (
    <>
      <Bar bar={tab === 'files' ? filesBar.bar : tasksBar.bar} title={tab === 'files' ? filesBar.title : tasksBar.title} words={f.words} head={title}><Slot kind="icon" /></Bar>
      <EmptyCardGhost art={[180, 160]} buttons={f.buttons} stack={f.stack} />
    </>
  )
}

/** The body for a tab slug; null for the Overview (DetailSkeleton draws its info column and cards). (UX audit build) `first` — the list
    tab's first run. (simplify S-03) `title` — a project's view switch's ghost in the title's place. */
export function tabGhost(tab: string | undefined, first = false, title?: ReactNode) {
  if (first && tab && FIRST[tab]) return <FirstRunTabGhost tab={tab} title={title} />
  switch (tab) {
    case 'tasks': return <TasksTabGhost title={title} />
    case 'quotes': return <QuotesTabGhost />
    case 'contracts': return <ContractsTabGhost />
    case 'files': return <FilesTabGhost title={title} />
    case 'notes': return <NotesTabGhost title={title} />
    case 'questionnaire': return <QuestionnaireTabGhost title={title} />
    case 'activity': return <ActivityTabGhost title={title} />
    case 'meetings': return <MeetingsTabGhost title={title} first={first} />   // (pending modules S23)
    default: return null
  }
}
