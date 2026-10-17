import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (gaps build H, H-Q11) `/chat` — the rail's Messages (the mock's Chat, inert until then; one-home N-08 renamed it) inside the shell. */
export default async function ChatLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
