'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { withFrom } from '@/lib/nav'
import type { ProjectChatData } from '@/lib/projects/messages'
import { Conversation } from './conversation'
import styles from './messages.module.css'

/**
 * (gaps build H — H-Q11) A project's Messages tab: the house tab toolbar ("Messages with Benjamin Han" · All conversations), who the team writes
 * to, and the conversation (components/projects/messages/conversation.tsx). The rail's Chat opens every conversation the member sees.
 * (parity map 2026-10-10, UC-064) Two conversations: **Client** (with the client and their household — the lead's messages before Won read
 * first) and **Team** (the team's own; the client never sees it) — the house Chips at the conversation's head, the Team chip counting what a
 * teammate wrote since this member last read it. `?channel=team` opens the team's (the bell's link, Copy link, ⌘K); a press keeps the address.
 * No groups beyond these two: the client's household is the client's group (Company › Client portal invites them).
 * (the calm UI build 2026-10-27, 3-13 · W-138 · W-496 · T-01) The view is the client's conversation: the Client · Team chips went — "Client"
 * was the tab, the chip and a tag on every line. The team's conversation is one quiet press away, the head's **Team chat** link (its unread
 * count beside it), and from it **Back to {first}'s conversation** with the Team tag; the info column's Team chat and /chat open it too.
 * The client's lines carry no "Client" tag here (the conversation is theirs alone); /chat keeps it, where conversations mix.
 */
export function ProjectMessages({ data, views }: { data: ProjectChatData; /** (simplify S-03) the Client group's view switch, in the title's place */ views?: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const onRead = useCallback(() => router.refresh(), [router])   // the tab's count and the rail's badge follow what was read
  const wanted = params.get('channel') === 'team' ? 'team' : 'client'
  const [channel, setChannel] = useState<'client' | 'team'>(wanted)
  const [was, setWas] = useState(wanted)
  if (was !== wanted) { setWas(wanted); setChannel(wanted) }   // render-phase adjust: the address moved (the bell, Back)
  const pick = (v: string) => {
    const c = v === 'team' ? 'team' : 'client'
    if (c === channel) return
    setChannel(c)
    const next = new URLSearchParams(params.toString())
    if (c === 'team') next.set('channel', 'team'); else next.delete('channel')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }
  const teamUnread = data.team.readAt === null ? data.team.lines.filter((l) => l.authorId !== data.me.id && !l.removed).length
    : data.team.lines.filter((l) => l.authorId !== data.me.id && !l.removed && l.at > (data.team.readAt ?? 0)).length
  const shown = channel === 'team' ? data.team : data
  const first = data.project.client.trim().split(/\s+/)[0] ?? data.project.client
  const chips = (
    <span className={styles.channel} data-testid="conversation-channel" data-channel={channel}>
      {channel === 'team' ? (
        <>
          <MetaChip>Team</MetaChip>
          <button type="button" className={styles.channelLink} onClick={() => pick('client')} data-testid="conversation-channel-client">{`Back to ${first}’s conversation`}</button>
        </>
      ) : (
        <button type="button" className={styles.channelLink} onClick={() => pick('team')} data-testid="conversation-channel-team">
          <Icon name="group" size={18} weight={300} />{teamUnread ? `Team chat · ${teamUnread}` : 'Team chat'}
        </button>
      )}
    </span>
  )
  return (
    <div className={styles.tab} data-testid="project-messages">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>{`Messages with ${data.project.client}`}</h2>}
        <div className={styles.actions}>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={() => router.push(withFrom(`/chat?open=${encodeURIComponent(shown.key)}`, `/projects/${data.project.id}/messages${channel === 'team' ? '?channel=team' : ''}`))}>All conversations</Button>
        </div>
      </div>
      <Conversation key={shown.key} data={shown} onRead={onRead} headStart={chips} clientChip={false} />
    </div>
  )
}
