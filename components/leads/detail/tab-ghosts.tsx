import { Bone } from '@/components/shell/skeleton'
import { GhostTable, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { GhostFolderGroup } from '@/components/company/templates/library-gallery.skeleton'
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

/**
 * (REG-708) The lead's tabs, each its own ghost body under the lead's frame (DetailSkeleton): the tab's toolbar on the tab's own classes (its
 * title in the tab's words, its tools folding as the real ones fold — the search into its glyph at ≤1024, New ▾ on a phone), then the tab's
 * body — the Tasks, Quotes and Contracts tables at their own tracks and row heights (cards on a phone), the Files folders and tiles, the Notes
 * list and pane, the question cards beside the summary, the Activity feed. `[tab]/loading.tsx` and the lead's PageReveal draw the same one.
 */

/** A tab toolbar: the tab's own bar, its title in the tab's words, its tools. */
function Bar({ bar, title, words, children }: { bar: string | undefined; title: string | undefined; words: string; children: React.ReactNode }) {
  return <div className={bar}><Words as="h2" className={title}>{words}</Words><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{children}</span></div>
}

const TASK_W = [180, 140, 210, 160, 190, 120]

/** The lead's Tasks tab — or (`studio`) the rail's Tasks page body: the scope chip in the title's place, no Add Task (it is the header's), and
    the Lead column after the title (REG-466). */
export function TasksTabGhost({ studio = false, rows = 5 }: { studio?: boolean; rows?: number }) {
  return (
    <>
      {studio ? (
        <div className={tasksBar.bar}><span style={{ flex: 1, display: 'flex' }}><Slot kind="btn" w={151} /></span><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Slot kind="search" /><Slot kind="icon" /><Slot kind="icon" desk /></span></div>
      ) : <Bar bar={tasksBar.bar} title={tasksBar.title} words="All Tasks"><Slot kind="btnFold" w={119} /><Slot kind="search" /><Slot kind="icon" /><Slot kind="icon" desk /><Slot kind="icon" /></Bar>}
      <GhostTable head={56} row={48} rows={rows} foot={53} phone={{ card: studio ? 117 : 97, framed: true, lines: studio ? 3 : 2 }} cols={[
        { basis: 56, head: null, cell: { slot: 'check' } },
        { basis: 450, grow: 1, head: 32, cell: (r) => ({ node: <><Bone w={18} h={18} r="50%" /><Line w={cycle(TASK_W, r)} lh={20} h={12} /></> }) },
        ...(studio ? [{ basis: 200, head: 36, cell: (r: number) => cycle([88, 72, 96, 80, 104], r) }] : []),
        { basis: 160, head: 56, cell: { slot: 'avatar' } },
        { basis: 160, head: 52, cell: { node: <><Slot kind="avatar" /><Line w={40} lh={20} h={12} /></> } },
        { basis: 137, head: 60, cell: 64 },
        { basis: 118, head: 48, cell: { slot: 'chip', w: 44 } },
        { basis: 191, head: 36, cell: 72 },
      ]} />
    </>
  )
}

/** The lead's Quotes tab — or (`studio`) Tools › Quotes: the Client column after the title and Approval at the end (REG-422 · REG-624). */
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
        ...[58, 45, 75, 52, 76].map((head) => ({ basis: 120, head, cell: 64 as number })),
        ...(studio ? [{ basis: 157, head: 64, cell: 72 as number }] : []),
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

export function FilesTabGhost() {
  return (
    <>
      <div className={filesBar.bar}>
        <Words as="h2" className={filesBar.title}>All Files</Words>
        <span className={filesBar.actions}><Slot kind="iconTouch" /><Slot kind="btnFold" w={114} /><Slot kind="search" /><Slot kind="iconTouch" /><Slot kind="btn" w={71} desk /><Slot kind="iconTouch" /></span>
      </div>
      <div className={filesGrid.groups}>
        <GhostFolderGroup count={2} check />
        <div className={filesGrid.group}>
          <div className={filesGrid.groupHead}><Bone w={18} h={18} style={{ margin: 3 }} /><Line w={96} lh={20} h={14} /></div>
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

export function NotesTabGhost() {
  return (
    <>
      <div className={notesBar.bar}>
        <Words as="h2" className={notesBar.title}>All Notes &amp; Logs</Words>
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

export function QuestionnaireTabGhost() {
  return (
    <>
      <div className={quest.bar}><Words as="h2" className={quest.title}>All Questions</Words><Slot kind="btn" w={101} /></div>
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

export function ActivityTabGhost() {
  return (
    <>
      <div className={activity.bar}><Words as="h2" className={activity.title}>All Activities</Words><span className={activity.searchWrap}><span className={activity.search}><Bone w="100%" h={36} /></span></span></div>
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

/** The body for a tab slug; null for the Overview (DetailSkeleton draws its info column and cards). */
export function tabGhost(tab: string | undefined) {
  switch (tab) {
    case 'tasks': return <TasksTabGhost />
    case 'quotes': return <QuotesTabGhost />
    case 'contracts': return <ContractsTabGhost />
    case 'files': return <FilesTabGhost />
    case 'notes': return <NotesTabGhost />
    case 'questionnaire': return <QuestionnaireTabGhost />
    case 'activity': return <ActivityTabGhost />
    default: return null
  }
}
