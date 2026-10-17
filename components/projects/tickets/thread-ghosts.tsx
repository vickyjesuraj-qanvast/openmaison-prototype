import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Para, Slot, Words } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import empty from '@/components/om/empty-state.module.css'
import thread from '../threads/thread.module.css'
import msg from '../messages/messages.module.css'
import styles from './tickets.module.css'

/**
 * (REG-708, gaps build H) The Messages and Tickets tabs' ghosts — each tab's own layout on its own classes, drawn by the route's loader and the
 * page's PageReveal through components/projects/project-ghost.tsx. Messages: the toolbar, the conversation's card with three lines and the
 * composer. Tickets: the toolbar, the scope chips, three ticket cards; `first` (REG-817) the first-run card.
 * (parity map 2026-10-10) Messages' card opens on its head — Client · Team, the search glyph, ⋮ (UC-064 · UC-069 · UC-070) — and the
 * composer's "+" stands where the photo button stood; Tickets' toolbar carries Filters before New ticket (UC-047).
 */
function GhostLine({ w }: { w: number }) {
  return (
    <div className={thread.line}>
      <Bone w={36} h={36} r="var(--om-radius-1)" />
      <div className={thread.col}><Line w={140} lh={20} h={12} /><Para lines={2} w={w} last={Math.round(w * 0.6)} lh={20} h={12} /></div>
    </div>
  )
}
export function MessagesGhost({ title }: { /** (simplify S-03) the group's view switch's ghost, in the title's place on a project */ title?: ReactNode } = {}) {
  return (
    <div className={msg.tab} aria-hidden>
      <div className={msg.bar}>{title ?? <Line w={260} lh={36} h={16} />}<span className={msg.actions}><Slot kind="btnFold" w={176} /></span></div>
      <section className={msg.card}>
        <div className={msg.convHead}><span className={msg.convStart}><span className={chipRow.chips}>{[64, 60].map((w, i) => <Bone key={i} w={w} h={32} r="var(--om-radius-full)" />)}</span></span><Slot kind="icon" /><Slot kind="icon" /><Slot kind="icon" /></div>   {/* (pending modules S26) search · Details · ⋮ */}
        <div className={msg.scroll}><div className={thread.lines}><GhostLine w={420} /><GhostLine w={300} /><GhostLine w={360} /></div></div>
        <div className={msg.foot}><div className={thread.composer}><Bone w="100%" h={64} r="var(--om-radius-1)" /><div className={thread.row}><Slot kind="icon" /><span className={thread.hint}><Line w={220} lh={16} h={10} /></span><span className={thread.send}><Bone w={72} h={36} r="var(--om-radius-1)" /></span></div></div></div>
      </section>
    </div>
  )
}
export function TicketsGhost({ first = false, title }: { first?: boolean; /** (simplify S-03) the group's view switch's ghost, in the title's place on a project */ title?: ReactNode }) {
  if (first) {
    return (
      <div className={styles.tab} aria-hidden>
        <div className={styles.bar}>{title ?? <Words as="h2" className={styles.title}>Tickets</Words>}</div>
        <section className={empty.empty} data-tone="first">
          <span className={empty.glyph} />
          <Words as="h3" className={empty.title}>No tickets yet</Words>
          <span className={empty.help}><Para lines={3} lh={20} h={12} w={300} last={240} /></span>
          <div className={empty.actions}><Bone w={140} h={36} r="var(--om-radius-1)" /></div>
        </section>
      </div>
    )
  }
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar}>{title ?? <Words as="h2" className={styles.title}>Tickets</Words>}<span className={styles.actions}><Slot kind="icon" /><Slot kind="btnFold" w={132} /></span></div>
      <div className={chipRow.chips}>{[84, 156, 64].map((w, i) => <Bone key={i} w={w} h={32} r="var(--om-radius-full)" />)}</div>
      <div className={styles.list}>
        {[260, 200, 240].map((w, i) => (
          <div key={i} className={styles.card}>
            <span className={styles.head}><Line w={84} /><Line w={w} lh={20} h={14} /><Bone w={64} h={20} r="var(--om-radius-1)" /></span>
            <Line w="54%" className={styles.sub} />
            <Line w="70%" className={styles.last} />
            <span className={styles.side}><Bone w={24} h={24} r="var(--om-radius-1)" /><Line w={88} lh={16} h={10} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}
