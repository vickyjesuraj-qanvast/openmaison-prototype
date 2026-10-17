import type { Metadata } from 'next'
import { fetchChatInbox } from '@/lib/projects/messages'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { ChatInbox } from '@/components/projects/messages/chat-inbox'
import { readConversation } from '@/app/projects/messages-actions'
import { conversationKey, parseConversationKey } from '@/lib/projects/messages-model'
import type { ConversationData } from '@/lib/projects/messages'

/** (gaps build H, H-Q11) The rail's Messages — every project conversation the member sees. (one-home N-08) One word for them, "Messages"; the
    `/chat` address stays. (pending modules S26) …and the studio's own conversations; Accounting keeps the books and opens none — the house
    gate answers before a record is read (the pages' rule, `refusesWorkspace`). */
export const metadata: Metadata = { title: 'Messages' }
export const dynamic = 'force-dynamic'

/** (S42 audit C-15) The conversation the address names (`?c=` the page keeps, `?open=` a door's) — read with the list, so a reload or a Back
    lands on it at once, as the ghost drew it; one the member may not open, or gone, opens nothing (the page says so). */
async function openFirst(want: string): Promise<ConversationData | null> {
  const k = parseConversationKey(want)
  const r = await readConversation(k ? conversationKey(k.kind, k.id) : want).catch(() => null)
  return r && 'key' in r ? r : null
}

export default async function ChatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await refusesPath('/chat')) return <AccessGate section="Messages" />   // (S44O — C6) the role's own list: Accounting's books, Marketing's leads
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null
  const want = one(sp.open) ?? one(sp.c)
  const [{ rows, now, start }, first] = await Promise.all([fetchChatInbox(), want ? openFirst(want) : Promise.resolve(null)])
  return <ChatInbox rows={rows} now={now} start={start} initialOpen={first} initialKey={first ? want : null} />
}
