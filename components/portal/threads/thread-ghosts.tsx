import { Bone } from '@/components/shell/skeleton'
import { Line, Para, Words } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import { Frame } from '../portal-ghosts'
import p from '../portal.module.css'
import thread from '@/components/projects/threads/thread.module.css'
import m from '@/components/projects/messages/messages.module.css'
import t from '@/components/projects/tickets/tickets.module.css'
import a from '../about/about.module.css'

/*
 * (gaps build H, REG-708) The portal's Messages, Issues and About ghosts — each drawn by its loading.tsx and handed to its PageReveal, on the
 * page's own classes. A loader can't know the studio's colour, so the marks are bones.
 */
export function PortalMessagesGhost() {
  return (
    <Frame label="Loading your messages">
      <div className={p.hello}><Words as="h2" className={p.h1}>Messages</Words><Line w={340} lh={24} h={14} /></div>
      <section className={m.card}>
        <div className={m.scroll}><div className={thread.lines}>
          {[380, 260, 320].map((w, i) => (
            <div key={i} className={thread.line}><Bone w={36} h={36} r="var(--om-radius-1)" /><div className={thread.col}><Line w={120} /><Para lines={2} w={w} last={Math.round(w * 0.6)} lh={20} h={12} /></div></div>
          ))}
        </div></div>
        <div className={m.foot}><div className={thread.composer}><Bone w="100%" h={64} r="var(--om-radius-1)" /><div className={thread.row}><Bone w={36} h={36} r="var(--om-radius-1)" /><span className={thread.send}><Bone w={72} h={36} r="var(--om-radius-1)" /></span></div></div></div>
      </section>
      <Line w={280} />
    </Frame>
  )
}
export function PortalIssuesGhost() {
  return (
    <Frame label="Loading your issues">
      <div className={p.homeHead}><div className={p.hello}><Words as="h2" className={p.h1}>Issues</Words><Line w={360} lh={24} h={14} /></div><Bone w={156} h={36} r="var(--om-radius-1)" /></div>
      <div className={chipRow.chips}>{[84, 176].map((w, i) => <Bone key={i} w={w} h={32} r="var(--om-radius-full)" />)}</div>
      <div className={t.list}>
        {[240, 200].map((w, i) => (
          <div key={i} className={t.card}>
            <span className={t.head}><Line w={84} /><Line w={w} lh={20} h={14} /><Bone w={64} h={20} r="var(--om-radius-1)" /></span>
            <Line w="54%" className={t.sub} /><Line w="70%" className={t.last} />
          </div>
        ))}
      </div>
      <Line w={280} />
    </Frame>
  )
}
export function PortalAboutGhost() {
  return (
    <Frame label="Loading about the studio">
      <div className={p.hello}><Line w={260} lh={40} h={24} /><Line w={320} lh={24} h={14} /></div>
      <Bone w="100%" r="var(--om-radius-2)" style={{ height: "auto", aspectRatio: "3 / 1", display: "block" }} />
      <div className={p.cols}>
        <div className={p.colMain}>
          <section className={`${p.card} ${p.cardPad}`}><Line w={160} /><Para lines={4} w="96%" last="60%" lh={24} h={12} /></section>
          <section className={p.section}><Line w={120} lh={24} h={16} /><div className={a.team}>{[0, 1, 2, 3].map((i) => <div key={i} className={a.member}><Bone w={72} h={72} r="var(--om-radius-2)" /><span className={a.memberText}><Line w={120} /><Line w={90} lh={16} h={10} /><Line w="90%" /></span></div>)}</div></section>
        </div>
        <div className={p.colSide}>
          <section className={`${p.card} ${p.cardPad}`}><Line w={160} lh={24} h={16} />{[0, 1, 2, 3].map((i) => <Line key={i} w={[140, 120, 200, 180][i]!} lh={44} />)}</section>
        </div>
      </div>
    </Frame>
  )
}
