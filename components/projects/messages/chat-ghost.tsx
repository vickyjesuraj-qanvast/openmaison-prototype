'use client'

import { useSearchParams } from 'next/navigation'
import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostHead, GhostHead2, Line, Para, Slot, Words } from '@/components/shell/ghost-kit'
import { INBOX_FILTERS } from '@/lib/projects/messages-model'
import { readFrom } from '@/lib/nav'
import pageStyles from '@/app/leads/leads.module.css'
import empty from '@/components/om/empty-state.module.css'
import thread from '../threads/thread.module.css'
import styles from './messages.module.css'

/** (S42 audit C-25) The empty pane's words — the page and its ghost read the same ones. *(invented copy)* */
export const PICK_TITLE = 'Pick a conversation'
export const PICK_HELP = 'Its messages open here. A client reads theirs on their page; Team, Direct, Group and Studio ones stay in the studio.'

/** (REG-708, gaps build H) The rail's Messages ghost: the header, the search over the list of conversations and the pane beside it (one
    column ≤1024, the list alone). The route's `loading.tsx` and the page's PageReveal draw this same one.
    (S42 audit C-16 · C-15) It reads the address as the page does: with a conversation in it (`?c=` kept by the page, `?open=` a door's) the
    open conversation — alone on a phone and a tablet — else the "Pick a conversation" card; opened from somewhere (`?from=`) the L2 header with
    its Back, else the level-1 one (the phone keeps its bar and dock). */
export function ChatInboxGhost() {
  const params = useSearchParams()
  const from = readFrom(params.get('from'))
  const opened = !!(params.get('c') || params.get('open'))
  return (
    <GhostSheet label="Loading conversations" l1={!from}>
      {from ? <GhostHead2 crumb={48} title={96} actions={[{ fold: 156 }]} /> : <GhostHead title={96} actions={[{ fold: 156 }]} />}   {/* (one-home N-08) the title reads "Messages" now (was "Chat") — the bone as wide as the word, as Projects' 92 · (pending modules S26) New message ▾ */}
      <div className={pageStyles.content} aria-hidden>
        <div className={styles.inbox} data-open={opened ? '' : undefined}>
          <div className={styles.pane} data-slot="list">
            <Slot kind="search" />
            <div className={styles.filters}><GhostChips labels={INBOX_FILTERS.map((f) => f.label)} /></div>   {/* (S26) All · Unread · Clients · Team */}
            <div className={styles.list}>
              {[220, 180, 240, 200, 160].map((w, i) => (
                <div key={i} className={styles.row}><Line w={w} lh={20} h={14} /><Line w={44} lh={16} h={10} /><Line w="80%" lh={20} h={12} /></div>
              ))}
            </div>
          </div>
          <div className={styles.pane} data-slot="open">
            {opened ? (<>
              <div className={styles.paneHead}><Line w={260} lh={36} h={16} /><Slot kind="btn" w={132} /></div>
              <section className={styles.card}>
                {/* (parity map, UC-069 · UC-070) the conversation's head: who reads it, the search glyph, ⋮ */}
                <div className={styles.convHead}><span className={styles.convStart}><Line w={240} lh={20} h={12} /></span><Slot kind="icon" /><Slot kind="icon" /><Slot kind="icon" /></div>   {/* (S26) search · Details · ⋮ */}
                <div className={styles.scroll}><div className={thread.lines}>{[360, 280, 320].map((w, i) => (
                  <div key={i} className={thread.line}><Bone w={36} h={36} r="var(--om-radius-1)" /><div className={thread.col}><Line w={120} /><Para lines={2} w={w} last={Math.round(w * 0.6)} lh={20} h={12} /></div></div>
                ))}</div></div>
                <div className={styles.foot}><Bone w="100%" h={64} r="var(--om-radius-1)" /></div>
              </section>
            </>) : (
              /* (S42 C-16) the page's own "Pick a conversation" card (the house EmptyState, plain) in its words */
              <div className={empty.empty} data-tone="plain">
                <span className={empty.glyph}><Bone w={40} h={40} r="50%" /></span>
                <Words as="h3" className={empty.title}>{PICK_TITLE}</Words>
                <Words as="p" className={empty.help}>{PICK_HELP}</Words>
              </div>
            )}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
